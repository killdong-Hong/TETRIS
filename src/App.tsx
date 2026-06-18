/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  ArrowUp, 
  ArrowDown, 
  ChevronsDown, 
  RotateCw, 
  Check, 
  ShieldAlert,
  Brain,
  VolumeX,
  Volume2
} from 'lucide-react';
import { GameMode, PlayerStats, Achievement, SettingState, AISkillLevel, TetrominoType } from './types';
import { audio } from './components/AudioEngine';
import { GameStorage } from './components/GameStorage';
import { NeonGridBackground } from './components/NeonGridBackground';
import { MainMenu } from './components/MainMenu';
import { GameHUD } from './components/GameHUD';
import { TetrisPlayfield } from './components/TetrisPlayfield';

// 테트리스 7가지 도형 구조 및 기본 배치 맵
const TETROMINOES: Record<TetrominoType, number[][]> = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
};

// 회전 상태 전환에 따른 Wall Kick (벽차기) 오프셋 리스트 (SRS 표준 규격 간이 구현)
// 회전 시도: idx [이전 상태][다음 상태]에 따른 변위 [dx, dy] 순서의 테스트 목록
const WALL_KICK_TESTS_DEFAULT = [
  // 0 -> 1 (시계방향)
  [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  // 1 -> 2 (시계방향)
  [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  // 2 -> 3 (시계방향)
  [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  // 3 -> 0 (시계방향)
  [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
];

const WALL_KICK_TESTS_I = [
  // 0 -> 1
  [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  // 1 -> 2
  [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  // 2 -> 3
  [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  // 3 -> 0
  [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
];

export default function App() {
  // 1. 핵심 하이레벨 상태 정의
  const [gameState, setGameState] = useState<'MENU' | 'PLAYING'>('MENU');
  
  // 로컬스토리지 보존 통계 정보 및 업적
  const [stats, setStats] = useState<PlayerStats>(GameStorage.loadStats());
  const [achievements, setAchievements] = useState<Achievement[]>(GameStorage.loadAchievements());
  
  // HUD 설정 상태 (볼륨, 색약)
  const [settings, setSettings] = useState<SettingState>({
    soundVolume: 0.5,
    bgmVolume: 0.35,
    isMuted: false,
    colorblindFriendly: false
  });

  // 2. 인게임 테트리스 내부 상태
  const [activeMode, setActiveMode] = useState<GameMode>(GameMode.CLASSIC);
  const [grid, setGrid] = useState<(TetrominoType | null)[][]>(
    Array.from({ length: 20 }, () => Array(10).fill(null))
  );

  // 현재 조종 중인 피스
  const [currentPiece, setCurrentPiece] = useState<{
    type: TetrominoType;
    matrix: number[][];
    x: number;
    y: number;
    rotationId: number;
    lastActionWasRotate: boolean; // T-Spin 판정에 필수 정보
  } | null>(null);

  // 오렌지색 피스 고스트용 낙하지 보조 위치 Y
  const [ghostY, setGhostY] = useState<number>(0);

  // 미리보기 대기열 (최소 5개 이상!)
  const [nextBuffer, setNextBuffer] = useState<TetrominoType[]>([]);
  // 홀드 관련 상태
  const [holdType, setHoldType] = useState<TetrominoType | null>(null);
  const [holdLocked, setHoldLocked] = useState<boolean>(false);

  // 점수, 제거 줄, 레벨업
  const [score, setScore] = useState<number>(0);
  const [level, setLevel] = useState<number>(1);
  const [linesRemoved, setLinesRemoved] = useState<number>(0);
  const [playTime, setPlayTime] = useState<number>(0); // 초 단위 시간
  const [timeAttackRemaining, setTimeAttackRemaining] = useState<number>(180); // 오직 타임어택 전용

  // 일시정지, 게임오버
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);

  // 피드백 메시지 기믹 (T-Spin, Tetris 등)
  const [actionMessage, setActionMessage] = useState<string>('');
  const [comboCount, setComboCount] = useState<number>(0);
  const [backToBack, setBackToBack] = useState<boolean>(false);

  // 누적 게임당 테트리스 개수 (업적 체크용)
  const [currentGameTetrisCount, setCurrentGameTetrisCount] = useState<number>(0);
  const [currentGameMaxCombo, setCurrentGameMaxCombo] = useState<number>(0);

  // 서바이벌 모드 주기 및 생성 경고 진행도 (0~100)
  const [survivalWarning, setSurvivalWarning] = useState<number>(0);

  // 비쥬얼 플래시 효과
  const [levelUpFlash, setLevelUpFlash] = useState<boolean>(false);
  const [clearIntensity, setClearIntensity] = useState<number>(0.0);
  const [linesBeingCleared, setLinesBeingCleared] = useState<number[]>([]);

  // 신규 해제 도전 과제 팝업 기믹
  const [latestUnlockedAchievement, setLatestUnlockedAchievement] = useState<Achievement | null>(null);

  // 3. 인게임 참조 변수 (루프에서 스테이트 미스매치 방지)
  const gridRef = useRef<(TetrominoType | null)[][]>(grid);
  const currentPieceRef = useRef(currentPiece);
  const nextBufferRef = useRef<TetrominoType[]>(nextBuffer);
  const levelRef = useRef<number>(level);
  const scoreRef = useRef<number>(score);
  const linesRemovedRef = useRef<number>(linesRemoved);
  const playTimeRef = useRef<number>(0);
  const isPausedRef = useRef<boolean>(isPaused);
  const isGameOverRef = useRef<boolean>(isGameOver);
  const comboCountRef = useRef<number>(comboCount);
  const backToBackRef = useRef<boolean>(backToBack);
  const gameModeRef = useRef<GameMode>(activeMode);
  const lastActionWasRotateRef = useRef<boolean>(false);

  // 동적 참조 바인딩
  useEffect(() => { gridRef.current = grid; }, [grid]);
  useEffect(() => { currentPieceRef.current = currentPiece; }, [currentPiece]);
  useEffect(() => { nextBufferRef.current = nextBuffer; }, [nextBuffer]);
  useEffect(() => { levelRef.current = level; }, [level]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { linesRemovedRef.current = linesRemoved; }, [linesRemoved]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { isGameOverRef.current = isGameOver; }, [isGameOver]);
  useEffect(() => { comboCountRef.current = comboCount; }, [comboCount]);
  useEffect(() => { backToBackRef.current = backToBack; }, [backToBack]);
  useEffect(() => { gameModeRef.current = activeMode; }, [activeMode]);
  if (currentPiece) {
    lastActionWasRotateRef.current = currentPiece.lastActionWasRotate;
  }

  // 4. 세팅 변화에 따른 전역 컨트롤 주입
  const handleUpdateSettings = (newSettings: SettingState) => {
    setSettings(newSettings);
    audio.setSoundVolume(newSettings.soundVolume);
    audio.setBgmVolume(newSettings.bgmVolume);
    audio.setMute(newSettings.isMuted);
  };

  // 5. 7-Bag 랜덤 큐 생성기 (정통 대기열 미리보기 5개 이상 충족 필수)
  const generate7Bag = (): TetrominoType[] => {
    const list: TetrominoType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
    // 피셔예이츠 셔플
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  };

  // 대기열 및 조종 블록 초기 영양 보충
  const refillNextBufferIfNeeded = (currentBuf: TetrominoType[]): TetrominoType[] => {
    let copy = [...currentBuf];
    while (copy.length < 10) {
      copy = [...copy, ...generate7Bag()];
    }
    return copy;
  };

  // 블록 착지 판정 검사 (충돌 여부 체크)
  const isValidPosition = (
    px: number,
    py: number,
    matrix: number[][],
    gridMatrix: (TetrominoType | null)[][]
  ): boolean => {
    const h = matrix.length;
    const w = matrix[0].length;

    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        if (matrix[r][c]) {
          const nextX = px + c;
          const nextY = py + r;

          // 벽 및 하단 바닥 관통 차단
          if (nextX < 0 || nextX >= 10 || nextY >= 20) {
            return false;
          }
          // 안착용 낙하 검사 (상단 바깥 영역은 예외)
          if (nextY >= 0) {
            if (gridMatrix[nextY][nextX] !== null) {
              return false;
            }
          }
        }
      }
    }
    return true;
  };

  // 고스트 위치 Y 실시간 갱신 계산
  const updateGhostY = useCallback((
    piece: typeof currentPiece,
    curGrid: typeof grid
  ) => {
    if (!piece) return;
    let tempY = piece.y;
    while (isValidPosition(piece.x, tempY + 1, piece.matrix, curGrid)) {
      tempY++;
    }
    setGhostY(tempY);
  }, []);

  // 피드백 액션 배너 시각화
  const triggerActionMessage = (msg: string) => {
    setActionMessage(msg);
    // 1.5초 후 초기화
    setTimeout(() => {
      setActionMessage((curr) => (curr === msg ? '' : curr));
    }, 1500);
  };

  // 6. T-Spin 정밀 감지 연출 검사 기막회 구현
  // T-Spin 조건:
  // 1) 마지막 액션이 회전이어야 함
  // 2) T블록의 중심축 기준 주변 4군데 모퉁이 중 3군데 이상이 벽이거나 이미 블록으로 차 있어야 함
  const checkTSpin = (
    px: number,
    py: number,
    matrix: number[][],
    curGrid: (TetrominoType | null)[][]
  ): boolean => {
    if (!lastActionWasRotateRef.current) return false;

    // 모퉁이 4방 기준점 (T 조각의 중심점을 1,1 로 규격 상정)
    // 회전 구조에 따라 항상 3x3 박스로 배치되어 있음
    const corners = [
      { x: px, y: py },          // 좌상
      { x: px + 2, y: py },      // 우상
      { x: px, y: py + 2 },      // 좌하
      { x: px + 2, y: py + 2 },  // 우하
    ];

    let occupiedCount = 0;
    corners.forEach((corner) => {
      // 보드를 이탈하면 차 있는 것으로 인정
      if (corner.x < 0 || corner.x >= 10 || corner.y >= 20) {
        occupiedCount++;
      } else if (corner.y >= 0 && curGrid[corner.y][corner.x] !== null) {
        occupiedCount++;
      }
    });

    return occupiedCount >= 3;
  };

  // 7. 실기 조종 가로 이동 수뇌부
  const moveActivePiece = (dx: number, dy: number) => {
    const piece = currentPieceRef.current;
    if (!piece || isPausedRef.current || isGameOverRef.current) return;

    if (isValidPosition(piece.x + dx, piece.y + dy, piece.matrix, gridRef.current)) {
      setCurrentPiece({
        ...piece,
        x: piece.x + dx,
        y: piece.y + dy,
        lastActionWasRotate: false
      });
      audio.playMove();
    }
  };

  // SRS 규격 회전 구현 (벽차기 검사 루프 적용)
  const rotateActivePiece = () => {
    const piece = currentPieceRef.current;
    if (!piece || isPausedRef.current || isGameOverRef.current) return;
    if (piece.type === 'O') return; // O 블록은 회전 무효화

    // 1. 시계방향 90도 행렬 스왑
    const n = piece.matrix.length;
    const rotated = Array.from({ length: n }, () => Array(n).fill(0));
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        rotated[c][n - 1 - r] = piece.matrix[r][c];
      }
    }

    const nextRotId = (piece.rotationId + 1) % 4;

    // 해당 블록 규격에 따라 Wall Kick 테스트 오프셋 리스트 로드
    const offsetTests = piece.type === 'I' 
      ? WALL_KICK_TESTS_I[piece.rotationId] 
      : WALL_KICK_TESTS_DEFAULT[piece.rotationId];

    // 오프셋을 역산 가산하며 통과하는지 검증
    for (let i = 0; i < offsetTests.length; i++) {
      const [dx, dy] = offsetTests[i];
      if (isValidPosition(piece.x + dx, piece.y + dy, rotated, gridRef.current)) {
        // 성공 시 갱신 후 브레이크
        setCurrentPiece({
          ...piece,
          matrix: rotated,
          x: piece.x + dx,
          y: piece.y + dy,
          rotationId: nextRotId,
          lastActionWasRotate: true // T-Spin용 스위치 켜기
        });
        audio.playRotate();
        return;
      }
    }
  };

  // 소프트 드롭 (조치식 낙하 가속)
  const softwareDropActivePiece = () => {
    const piece = currentPieceRef.current;
    if (!piece || isPausedRef.current || isGameOverRef.current) return;

    if (isValidPosition(piece.x, piece.y + 1, piece.matrix, gridRef.current)) {
      setCurrentPiece({
        ...piece,
        y: piece.y + 1,
        lastActionWasRotate: false
      });
      // 소프트드롭 점수 1점 보너스 가중치
      setScore((s) => s + 1);
    }
  };

  // 8. 하드 드롭 (즉시 전원 락 다운 및 지지선 이동)
  const hardDropActivePiece = () => {
    const piece = currentPieceRef.current;
    if (!piece || isPausedRef.current || isGameOverRef.current) return;

    // 고스트 Y 낙하지로 즉격 이주
    let landedY = piece.y;
    while (isValidPosition(piece.x, landedY + 1, piece.matrix, gridRef.current)) {
      landedY++;
    }

    // 하드 드롭 시 1칸당 2점 점수 추가
    const dropDist = landedY - piece.y;
    const dropScoreBonus = dropDist * 2;

    const lockedPiece = {
      ...piece,
      y: landedY,
      lastActionWasRotate: piece.lastActionWasRotate
    };

    handlePieceInstantiationAndLock(lockedPiece, dropScoreBonus);
  };

  // 피스 안착 고정 일련의 정격 흐름 처리
  const handlePieceInstantiationAndLock = (
    lockedPiece: NonNullable<typeof currentPiece>,
    extraScore = 0
  ) => {
    const curGrid = [...gridRef.current.map((row) => [...row])];
    const shape = lockedPiece.matrix;
    const h = shape.length;
    const w = shape[0].length;

    // A. 보드에 고정하기
    let checkGameOverTriggered = false;

    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        if (shape[r][c]) {
          const px = lockedPiece.x + c;
          const py = lockedPiece.y + r;

          if (py >= 0 && py < 20) {
            curGrid[py][px] = lockedPiece.type;
          } else if (py < 0) {
            // 상단 버퍼를 침범하면 게임오버 방출
            checkGameOverTriggered = true;
          }
        }
      }
    }

    audio.playLand();

    // T-Spin 체크
    let isTSpinTriggered = false;
    if (lockedPiece.type === 'T') {
      isTSpinTriggered = checkTSpin(lockedPiece.x, lockedPiece.y, lockedPiece.matrix, curGrid);
    }

    // B. 가득 찬 라인 수색 및 수집
    const clearedRows: number[] = [];
    for (let r = 0; r < 20; r++) {
      if (curGrid[r].every((cell) => cell !== null)) {
        clearedRows.push(r);
      }
    }

    // 라인 삭제 애니메이션 트리거
    if (clearedRows.length > 0) {
      setLinesBeingCleared(clearedRows);
      
      // 번쩍임 파티클 충격
      setClearIntensity(1.0);
      const intensityInterval = setInterval(() => {
        setClearIntensity((i) => {
          if (i <= 0.1) {
            clearInterval(intensityInterval);
            return 0.0;
          }
          return i - 0.15;
        });
      }, 50);

      // 0.25초 동안 라인이 플래시 하도록 대기 후 실시간 제거 연산 단행
      setTimeout(() => {
        const cleanedGrid = [...curGrid];
        
        // 해당 라인 완전 소거
        clearedRows.forEach((r) => {
          cleanedGrid.splice(r, 1);
          cleanedGrid.unshift(Array(10).fill(null));
        });

        setGrid(cleanedGrid);
        setLinesBeingCleared([]);

        // 연속 콤보 산정
        const prevCombo = comboCountRef.current;
        const nextCombo = prevCombo + 1;
        setComboCount(nextCombo);
        if (nextCombo > currentGameMaxCombo) {
          setCurrentGameMaxCombo(nextCombo);
        }

        // 라인 소거 사운드 발동
        if (clearedRows.length >= 4) {
          audio.playTetrisClear();
        } else if (isTSpinTriggered) {
          audio.playTSpin();
        } else {
          audio.playLineClear();
        }

        if (nextCombo > 1) {
          audio.playCombo(nextCombo);
        }

        // 점수 및 레벨 산식
        calculateTetrisScores(clearedRows.length, isTSpinTriggered, nextCombo, extraScore);
      }, 250);

    } else {
      // 라인 삭제가 없고, 노멀 착지 시에 격자 복구
      setGrid(curGrid);
      setComboCount(0); // 콤보 단절

      // 단순 착지 점수 반영
      if (extraScore > 0) {
        setScore((s) => s + extraScore);
      }

      // 새 피스 생성
      spawnNextPiece();
    }

    // 게임오버 조기 통지
    if (checkGameOverTriggered) {
      handleGameOverTrigger();
    }
  };

  // 9. 점수 및 레벨링 복잡계 분석 공식 (싱글, 더블, 트리플, 테트리스, 백투백, T-Spin, 콤보 가중치)
  const calculateTetrisScores = (
    clearedCount: number,
    isTSpin: boolean,
    combo: number,
    extraLandScore: number
  ) => {
    let baseScore = 0;
    let feedback = '';

    // 백투백 상태 확인용 (연속 테트리스 혹은 T-Spin)
    const isDifficult = clearedCount === 4 || (isTSpin && clearedCount > 0);
    const b2bMultiply = backToBackRef.current && isDifficult ? 1.5 : 1.0;

    // 정통 테트리스 스코어 테이블
    if (isTSpin) {
      if (clearedCount === 0) {
        baseScore = 400;
        feedback = 'T-Spin 홀로그램!';
      } else if (clearedCount === 1) {
        baseScore = 800;
        feedback = 'T-Spin 싱글 완성!';
      } else if (clearedCount === 2) {
        baseScore = 1200;
        feedback = 'T-Spin 더블 폭발!';
      } else if (clearedCount === 3) {
        baseScore = 1600;
        feedback = 'T-Spin 트리플 초광속!';
      }
    } else {
      switch (clearedCount) {
        case 1:
          baseScore = 100;
          feedback = '싱글 라인 클리어';
          break;
        case 2:
          baseScore = 300;
          feedback = '네온 더블 클리어!';
          break;
        case 3:
          baseScore = 500;
          feedback = '하이퍼 트리플!';
          break;
        case 4:
          baseScore = 800;
          feedback = '★ 테트리스 초월 삭제 ★';
          setCurrentGameTetrisCount((c) => c + 1);
          break;
        default:
          break;
      }
    }

    // 최종 합산 가산 (안착용 점수 + (기본점수 * 레벨 * 백투백배율) + (콤보 보너스) )
    const comboScoreBonus = combo > 1 ? (combo - 1) * 50 * levelRef.current : 0;
    const roundScore = Math.floor(extraLandScore + (baseScore * levelRef.current * b2bMultiply) + comboScoreBonus);

    // 백투백 업데이트
    if (clearedCount > 0) {
      if (isDifficult) {
        setBackToBack(true);
        if (backToBackRef.current) {
          feedback += ' [Back-to-Back]';
        }
      } else {
        setBackToBack(false);
      }
    }

    setScore((s) => s + roundScore);

    // 제거 라인 수 갱신 및 50레벨링 시스템
    const nextTotalRemovedLines = linesRemovedRef.current + clearedCount;
    setLinesRemoved(nextTotalRemovedLines);

    // 테트리스 시스템 : 고화력 레벨 업그레이드 연출 (10줄당 1레벨 상승, 최대 50레벨)
    const projectedLevel = Math.min(50, Math.floor(nextTotalRemovedLines / 10) + 1);
    
    if (projectedLevel > levelRef.current) {
      setLevel(projectedLevel);
      audio.playLevelUp();
      setLevelUpFlash(true);
      setTimeout(() => {
        setLevelUpFlash(false);
      }, 1000);
      
      // BGM 가속
      audio.startBGM(projectedLevel);
    }

    if (feedback) {
      triggerActionMessage(feedback);
    }

    // 소거가 끝난 후 다음 피스 인계
    spawnNextPiece();
  };

  // 10. 피스 신규 스폰 기믹
  const spawnNextPiece = () => {
    let buf = [...nextBufferRef.current];
    if (buf.length < 5) {
      buf = refillNextBufferIfNeeded(buf);
    }

    const nextType = buf.shift() as TetrominoType;
    const remainingBuf = refillNextBufferIfNeeded(buf);
    
    setNextBuffer(remainingBuf);

    // 소환할 피스 매트릭스
    const shape = TETROMINOES[nextType];
    
    // 이쁘게 가로 중앙 셋업
    const startX = Math.floor((10 - shape[0].length) / 2);
    const startY = nextType === 'I' ? -1 : 0; // I 블록의 경우 자연스럽게 보드를 삐져나오도록

    const newPiece = {
      type: nextType,
      matrix: shape,
      x: startX,
      y: startY,
      rotationId: 0,
      lastActionWasRotate: false
    };

    // 만약 소환될 자리가 시작하자마자 막혀있다면 게임 오공버!
    if (!isValidPosition(startX, startY, shape, gridRef.current)) {
      handleGameOverTrigger();
    } else {
      setCurrentPiece(newPiece);
      setHoldLocked(false); // 홀드 해제
      updateGhostY(newPiece, gridRef.current);
    }
  };

  // 11. HOLD (홀드 보관) 시스템 작동부
  const holdPieceTrigger = () => {
    const piece = currentPieceRef.current;
    if (!piece || holdLocked || isPausedRef.current || isGameOverRef.current) return;

    audio.playRotate(); // 회전음으로 보조 피드백 대행

    const currentHold = holdType;
    setHoldType(piece.type);
    
    // 만약 기존에 보관중인 블록이 없었으면 아예 다음 피스를 소환
    if (currentHold === null) {
      let buf = [...nextBufferRef.current];
      const nextType = buf.shift() as TetrominoType;
      setNextBuffer(refillNextBufferIfNeeded(buf));

      const shape = TETROMINOES[nextType];
      const newPiece = {
        type: nextType,
        matrix: shape,
        x: Math.floor((10 - shape[0].length) / 2),
        y: nextType === 'I' ? -1 : 0,
        rotationId: 0,
        lastActionWasRotate: false
      };

      setCurrentPiece(newPiece);
      updateGhostY(newPiece, gridRef.current);
    } else {
      // 기존 보관 블록이 있었디면 조종 블록을 맞바꿔 소환
      const shape = TETROMINOES[currentHold];
      const swappedPiece = {
        type: currentHold,
        matrix: shape,
        x: Math.floor((10 - shape[0].length) / 2),
        y: currentHold === 'I' ? -1 : 0,
        rotationId: 0,
        lastActionWasRotate: false
      };

      setCurrentPiece(swappedPiece);
      updateGhostY(swappedPiece, gridRef.current);
    }

    setHoldLocked(true); // 이번 차례 잠금
  };

  // 12. 주기적 테트리스 중력 (Gravity) 장치 제어 루프
  useEffect(() => {
    if (gameState !== 'PLAYING' || isPaused || isGameOver) return;

    // 레벨에 따라 빠르게 하강하도록 설계 (1레벨: 800ms ~ 50레벨: 30ms 수렴)
    const gravitySpeed = Math.max(30, 800 - (level - 1) * 16);

    const interval = setInterval(() => {
      movePieceDownOneStep();
    }, gravitySpeed);

    return () => clearInterval(interval);
  }, [gameState, isPaused, isGameOver, level]);

  // 주기적으로 한 칸씩 떨어뜨리는 물리 장치
  const movePieceDownOneStep = () => {
    const piece = currentPieceRef.current;
    if (!piece || isPausedRef.current || isGameOverRef.current) return;

    if (isValidPosition(piece.x, piece.y + 1, piece.matrix, gridRef.current)) {
      setCurrentPiece({
        ...piece,
        y: piece.y + 1,
        lastActionWasRotate: false
      });
    } else {
      // 바닥이나 블록에 부딪혀 안착했을 때 락다운 고정
      handlePieceInstantiationAndLock(piece);
    }
  };

  // 실시간 고스트 위치 동기화용 트리거
  useEffect(() => {
    if (currentPiece) {
      updateGhostY(currentPiece, grid);
    }
  }, [currentPiece, grid, updateGhostY]);

  // 13. 게임 모드 세부 추가 장치 (타임어택 타이머 / 서바이벌 쓰레기 장애물 배출 루프)
  
  // A. 플레이타임 초 단위 계량 및 타이머
  useEffect(() => {
    if (gameState !== 'PLAYING' || isPaused || isGameOver) return;

    const timerInterval = setInterval(() => {
      setPlayTime((t) => t + 1);
      
      // 타임어택 제한 시간 소진 체크
      if (gameModeRef.current === GameMode.TIME_ATTACK) {
        setTimeAttackRemaining((rem) => {
          if (rem <= 1) {
            clearInterval(timerInterval);
            handleGameOverTrigger();
            return 0;
          }
          return rem - 1;
        });
      }

    }, 1000);

    return () => clearInterval(timerInterval);
  }, [gameState, isPaused, isGameOver]);

  // B. 서바이벌 모드 오염된 장애물 잡동사니 위협 루프
  // 3.5초마다 경고진행도가 25%씩 차며, 100% 도과 시 바닥에 구멍 1개짜리 쓰레기 불투명 줄이 생성되어 게임판이 솟구침
  useEffect(() => {
    if (gameState !== 'PLAYING' || isPaused || isGameOver || activeMode !== GameMode.SURVIVAL) return;

    const survivalInterval = setInterval(() => {
      setSurvivalWarning((warn) => {
        const next = warn + 20; // 5스텝 만에 폭탄
        if (next >= 100) {
          // 보드 가득 한줄 솟구치기 적용
          injectSurvivalGarbageLine();
          return 0; // 초기화
        }
        return next;
      });
    }, 1500); // 총 7.5초 주기로 정밀 경보

    return () => clearInterval(survivalInterval);
  }, [gameState, isPaused, isGameOver, activeMode]);

  // 서바이벌 정밀 가이드 장애물 강제 주입
  const injectSurvivalGarbageLine = () => {
    const curGrid = [...gridRef.current.map((row) => [...row])];
    
    // 상단 최고 행에 블록이 채워져 있었다면 즉사 판정
    if (curGrid[0].some(cell => cell !== null)) {
      handleGameOverTrigger();
      return;
    }

    // 첫 줄 폐기 후 바닥 가입
    curGrid.shift();
    
    // 무작위 홀수 구멍 한 군데 뚫기
    const holeIdx = Math.floor(Math.random() * 10);
    const garbageRow = Array(10).fill(null).map((_, idx) => {
      if (idx === holeIdx) return null;
      // 잿빛으로 퇴색한 고무 장애물 대포 I 블록 배정
      return 'I';
    });

    curGrid.push(garbageRow);
    setGrid(curGrid);

    // 고스트 피스 재계산용 신작 소생
    if (currentPieceRef.current) {
      // 만약 조종 블록이 밀려나서 갇히는 불합리를 줄이기 위해 y좌표를 검사 후 맞춤 승강 시킴
      const tempP = { ...currentPieceRef.current };
      if (!isValidPosition(tempP.x, tempP.y, tempP.matrix, curGrid)) {
        tempP.y = tempP.y - 1;
      }
      setCurrentPiece(tempP);
    }
    
    triggerActionMessage('경고! 방사선 장애물 상승!');
    audio.playTSpin(); // 미래 지향 우웅-음
  };

  // 14. 키보드 인터페이스 지원 바인딩
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'PLAYING') return;

      const code = e.code;
      
      // 일시정지 및 ESC 메뉴 바인딩
      if (code === 'KeyP') {
        e.preventDefault();
        setIsPaused((p) => !p);
        return;
      }
      if (code === 'Escape') {
        e.preventDefault();
        setIsPaused(true);
        return;
      }

      if (isPaused || isGameOver) return;

      switch (code) {
        case 'ArrowLeft':
          e.preventDefault();
          moveActivePiece(-1, 0);
          break;
        case 'ArrowRight':
          e.preventDefault();
          moveActivePiece(1, 0);
          break;
        case 'ArrowUp':
          e.preventDefault();
          rotateActivePiece();
          break;
        case 'ArrowDown':
          e.preventDefault();
          softwareDropActivePiece();
          break;
        case 'Space':
          e.preventDefault();
          hardDropActivePiece();
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          e.preventDefault();
          holdPieceTrigger();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, isPaused, isGameOver]);

  // 15. 게임 시작 신호 접수
  const handleStartGame = (mode: GameMode) => {
    setActiveMode(mode);
    setGameState('PLAYING');
    setIsPaused(false);
    setIsGameOver(false);

    // 보드판 깨끗이 초기화
    setGrid(Array.from({ length: 20 }, () => Array(10).fill(null)));
    
    // 큐 및 홀드 소독
    setHoldType(null);
    setHoldLocked(false);
    
    // 각종 점량 카운터 조율
    setScore(0);
    setLevel(1);
    setLinesRemoved(0);
    setPlayTime(0);
    setTimeAttackRemaining(180); // 3분 셋업
    setComboCount(0);
    setBackToBack(false);
    setCurrentGameTetrisCount(0);
    setCurrentGameMaxCombo(0);
    setSurvivalWarning(0);
    setLevelUpFlash(false);

    // 즉시 랜덤으로 피어오르는 Bag 준비
    const initialBag = [...generate7Bag(), ...generate7Bag()];
    const firstType = initialBag.shift() as TetrominoType;
    
    setNextBuffer(initialBag);

    const firstShape = TETROMINOES[firstType];
    const spawnPiece = {
      type: firstType,
      matrix: firstShape,
      x: Math.floor((10 - firstShape[0].length) / 2),
      y: firstType === 'I' ? -1 : 0,
      rotationId: 0,
      lastActionWasRotate: false
    };

    setCurrentPiece(spawnPiece);
    setGhostY(19);

    // BGM 연주 시작
    audio.startBGM(1.0);
  };

  // 16. 게임 오버 트리거 제어소
  const handleGameOverTrigger = () => {
    setIsGameOver(true);
    audio.playGameOver();
    audio.stopBGM();

    // 로컬스토리지 명각 명예의 전당 갱신 사양 전송
    const { stats: updatedStats, newlyUnlocked } = GameStorage.updateAfterGame(
      scoreRef.current,
      levelRef.current,
      playTimeRef.current,
      currentGameMaxCombo,
      currentGameTetrisCount,
      linesRemovedRef.current,
      (unlockedAch) => {
        // 실시간 업적 달성 알림 유도용 보조 팝업
        setLatestUnlockedAchievement(unlockedAch);
        setTimeout(() => setLatestUnlockedAchievement(null), 4000);
      }
    );

    // 정보 동기화
    setStats(updatedStats);
    setAchievements(GameStorage.loadAchievements());
  };

  // 기지로 도망 (메인 메뉴 환수)
  const handleExitToMenu = () => {
    audio.stopBGM();
    setIsPaused(false);
    setIsGameOver(false);
    setGameState('MENU');
    
    // 혹시 모를 오디오 강제 진정 조치
    try {
      audio.setMute(settings.isMuted);
    } catch(e){}
  };

  // 실시간 AI 플레이어 실력 계량 분석
  const currentAISkill = GameStorage.analyzeSkill(
    stats.totalGames > 0 ? (stats.highScore / stats.totalGames) : score,
    stats.totalPlayTime / Math.max(1, stats.totalGames),
    stats.maxCombo,
    stats.tetrisCount
  );

  return (
    <div 
      className="relative min-h-screen w-full overflow-x-hidden flex flex-col justify-between items-center select-none pb-4 md:pb-8"
      style={{ background: 'radial-gradient(circle at center, #1a1a2e 0%, #050505 100%)' }}
    >
      
      {/* 백그라운드 우주적인 사이버펑크 네온 질주 도로 그리드 */}
      <NeonGridBackground isGameOver={isGameOver} clearIntensity={clearIntensity} />

      {/* 실시간 도전 과제 오프라인 인공지능 팝업 수뇌부 */}
      {latestUnlockedAchievement && (
        <div className="fixed top-4 right-4 z-50 p-4 bg-[#09041b]/95 border-2 border-fuchsia-400 text-white rounded-xl shadow-[0_0_20px_rgba(240,0,255,0.6)] flex items-center gap-3 animate-bounce">
          <div className="p-2.5 bg-fuchsia-500/20 border border-fuchsia-400 text-fuchsia-400 rounded-lg">
            <Check className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-fuchsia-400 block">빛나는 도전 과제 완료!</span>
            <span className="text-sm font-black">{latestUnlockedAchievement.title}</span>
            <p className="text-[11px] text-gray-400 mt-0.5">{latestUnlockedAchievement.description}</p>
          </div>
        </div>
      )}

      {/* 주 본문 헤더 */}
      <header className="relative z-10 w-full py-3 border-b border-cyan-500/10 backdrop-blur-sm flex justify-between items-center px-4 md:px-8">
        <span className="font-mono text-xs font-bold text-cyan-400 flex items-center gap-1">
          <Brain className="w-4 h-4 animate-pulse" />
          <span>네온 테트리스 : 인피니티</span>
        </span>
        <span className="font-mono text-[10px] text-gray-500 font-bold uppercase tracking-widest hidden sm:inline">
          System v1.8 &bull; Client Offline Authorized
        </span>
      </header>

      {/* 본문 레이아웃 교체 연산 */}
      {gameState === 'MENU' ? (
        <MainMenu
          stats={stats}
          achievements={achievements}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onStartGame={handleStartGame}
        />
      ) : (
        <div className="relative z-10 w-full max-w-5xl px-3 md:px-6 flex flex-col gap-2 flex-grow justify-center">
          
          <GameHUD
            score={score}
            highScore={stats.highScore}
            level={level}
            lines={linesRemoved}
            mode={activeMode}
            playTime={playTime}
            timeAttackRemaining={timeAttackRemaining}
            nextBuffer={nextBuffer}
            holdType={holdType}
            holdLocked={holdLocked}
            isPaused={isPaused}
            isMuted={settings.isMuted}
            aiLevel={currentAISkill}
            comboCount={comboCount}
            backToBack={backToBack}
            actionMessage={actionMessage}
            survivalWarningProgress={survivalWarning}
            onPauseToggle={() => setIsPaused((p) => !p)}
            onMuteToggle={() => handleUpdateSettings({ ...settings, isMuted: !settings.isMuted })}
            onExitToMenu={handleExitToMenu}
          />

          <div className="grid grid-cols-12 gap-4 items-center">
            {/* 플레이 보드판 센터링 */}
            <div className="col-span-12 sm:col-span-8 sm:col-start-3 md:col-span-6 md:col-start-4">
              <TetrisPlayfield
                grid={grid}
                currentPiece={currentPiece}
                ghostY={ghostY}
                linesBeingCleared={linesBeingCleared}
                levelUpFlash={levelUpFlash}
                isPaused={isPaused}
                isGameOver={isGameOver}
                colorblindFriendly={settings.colorblindFriendly}
                score={score}
                gameMode={activeMode}
                onRestart={() => handleStartGame(activeMode)}
                onExitToMenu={handleExitToMenu}
                onResume={() => setIsPaused(false)}
              />
            </div>
          </div>

          {/* 모바일 가상 서라운드 고감도 조종 패드 (스마트폰 기기 완벽 대응 가이드라인 준수) */}
          <div className="w-full max-w-md mx-auto bg-black/60 backdrop-blur-md rounded-2xl border border-cyan-500/10 p-3 flex flex-col gap-3 my-2 sm:hidden shadow-[0_0_15px_rgba(0,240,240,0.08)] select-none">
            
            {/* 첫번째 가로줄: HOLD 보관 및 회전 */}
            <div className="flex justify-between items-center gap-2">
              <button
                id="pad_btn_hold"
                onTouchStart={(e) => { e.preventDefault(); holdPieceTrigger(); }}
                onClick={holdPieceTrigger}
                className="flex-1 py-3.5 rounded-lg border border-[#f000ff]/30 bg-[#f000ff]/10 text-white font-extrabold text-xs active:bg-[#f000ff]/30 flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>블록 보관(SHIFT)</span>
              </button>

              <button
                id="pad_btn_rotate"
                onTouchStart={(e) => { e.preventDefault(); rotateActivePiece(); }}
                onClick={rotateActivePiece}
                className="flex-1 py-3.5 rounded-lg border border-yellow-500/30 bg-yellow-500/15 text-white font-extrabold text-xs active:bg-yellow-500/30 flex items-center justify-center gap-1 cursor-pointer"
              >
                <RotateCw className="w-4 h-4 text-yellow-400" />
                <span>회전하기(UP)</span>
              </button>
            </div>

            {/* 두번째 가로줄: 조작 디패드 및 소프트/하드 드롭 */}
            <div className="grid grid-cols-5 gap-2 items-center">
              
              <button
                id="pad_btn_left"
                onTouchStart={(e) => { e.preventDefault(); moveActivePiece(-1, 0); }}
                onClick={() => moveActivePiece(-1, 0)}
                className="py-4 rounded-lg bg-cyan-950/40 border border-cyan-500/20 text-cyan-400 flex justify-center active:bg-cyan-900/40 cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <button
                id="pad_btn_down"
                onTouchStart={(e) => { e.preventDefault(); softwareDropActivePiece(); }}
                onClick={softwareDropActivePiece}
                className="py-4 rounded-lg bg-cyan-950/40 border border-cyan-500/20 text-cyan-400 flex justify-center active:bg-cyan-900/40 cursor-pointer col-span-1"
                title="소프트 드롭"
              >
                <ArrowDown className="w-5 h-5" />
              </button>

              <button
                id="pad_btn_right"
                onTouchStart={(e) => { e.preventDefault(); moveActivePiece(1, 0); }}
                onClick={() => moveActivePiece(1, 0)}
                className="py-4 rounded-lg bg-cyan-950/40 border border-cyan-500/20 text-cyan-400 flex justify-center active:bg-cyan-900/40 cursor-pointer"
              >
                <ArrowRight className="w-5 h-5" />
              </button>

              <button
                id="pad_btn_harddrop"
                onTouchStart={(e) => { e.preventDefault(); hardDropActivePiece(); }}
                onClick={hardDropActivePiece}
                className="py-4 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex flex-col items-center justify-center col-span-2 active:bg-emerald-500/35 cursor-pointer"
              >
                <ChevronsDown className="w-5 h-5 text-emerald-400 animate-bounce" />
                <span className="text-[10px] font-bold mt-0.5">하드 드롭(SPACE)</span>
              </button>

            </div>

          </div>
        </div>
      )}

      {/* 바닥 카피라이트 및 푸터 */}
      <footer className="relative z-10 text-center font-mono text-[9px] text-gray-600 mt-4 max-w-xs mx-auto">
        &copy; 2026 NEON TETRIS INFINITY &bull; ALL RIGHTS RESERVED.
        <br />
        DESIGNED FOR ULTIMATE CYBERPUNK ARCADE PASSIONS.
      </footer>
    </div>
  );
}
