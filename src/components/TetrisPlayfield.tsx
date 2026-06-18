/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { RotateCcw, Play, Home, RefreshCw } from 'lucide-react';
import { TetrominoType, GameMode } from '../types';

interface TetrisPlayfieldProps {
  grid: (TetrominoType | null)[][]; // 20 행 * 10 열 배열
  currentPiece: {
    type: TetrominoType;
    matrix: number[][];
    x: number;
    y: number;
  } | null;
  ghostY: number; // 고스트 피스 랜딩 행 인덱스
  linesBeingCleared: number[]; // 현재 애니메이션 효과 수행 대상 행 인덱스 목록
  levelUpFlash: boolean; // 레벨업 시 화면 번쩍임 신호
  isPaused: boolean;
  isGameOver: boolean;
  colorblindFriendly: boolean;
  score: number;
  gameMode: GameMode;
  onRestart: () => void;
  onExitToMenu: () => void;
  onResume: () => void;
}

// 블록 칼라 팔레트 정의 (가독성 높은 초정밀 네온 칼라)
const TETROMINO_COLORS: Record<TetrominoType, string> = {
  I: '#00f0f0', // 시안 (하늘)
  O: '#fbfb1e', // 옐로우 (노랑)
  T: '#b913f0', // 퍼플 (보라)
  S: '#1bf01b', // 그린 (초록)
  Z: '#f01b1b', // 레드 (빨강)
  J: '#1b1bf0', // 블루 (파랑)
  L: '#f0961b', // 오렌지 (주황)
};

// 입자 효과를 구현하기 위한 간단한 클래스
class StarParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  size: number;
  life: number;

  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    // 무작위 속도
    this.vx = (Math.random() - 0.5) * 6;
    this.vy = (Math.random() - 0.5) * 6 - 2; // 주로 위쪽으로 약간 퍼짐
    this.color = color;
    this.alpha = 1.0;
    this.size = Math.random() * 4 + 2;
    this.life = 1.0; // 0이 될때까지 페이드 아웃
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.1; // 간이 중력 작용
    this.life -= 0.04;
    this.alpha = Math.max(0, this.life);
  }
}

export const TetrisPlayfield: React.FC<TetrisPlayfieldProps> = ({
  grid,
  currentPiece,
  ghostY,
  linesBeingCleared,
  levelUpFlash,
  isPaused,
  isGameOver,
  colorblindFriendly,
  score,
  gameMode,
  onRestart,
  onExitToMenu,
  onResume,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const particlesRef = useRef<StarParticle[]>([]);
  const flashAnimRef = useRef<number>(0);

  // 반응형 보정용 셀 크기 상태
  const [blockSize, setBlockSize] = useState<number>(30);

  // 창크기 변화 등에 유연하게 대응하기 위해 ResizeObserver 부착
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      // 바둑판 가로세로 비율: 10 X 20
      const parentWidth = container.clientWidth;
      const parentHeight = container.clientHeight;

      // 가능한 셀의 크기를 계산하여 테두리와 공백을 뺀 절대값 선정
      const calculatedWidth = Math.floor((parentWidth - 10) / 10);
      const calculatedHeight = Math.floor((parentHeight - 10) / 20);
      
      // 최적 한계치 적용 (최소 18px ~ 최대 44px)
      const size = Math.max(18, Math.min(36, calculatedWidth, calculatedHeight));
      setBlockSize(size);
    };

    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });

    resizeObserver.observe(container);
    updateSize(); // 초기 실행

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // 라인 클리어 시 그 위치에 실시간 번개 이펙트 파티클 투사
  useEffect(() => {
    if (linesBeingCleared.length === 0) return;

    // 캔버스 크기 기준 셀 환산 좌표
    const colsCount = 10;
    const particlesTemp: StarParticle[] = [];

    linesBeingCleared.forEach((rowIdx) => {
      // 해당 행전체를 가로지르며 파티클 수십개 생성
      for (let xCol = 0; xCol < colsCount; xCol++) {
        const color = grid[rowIdx]?.[xCol] ? TETROMINO_COLORS[grid[rowIdx]?.[xCol] as TetrominoType] : '#00f0f0';
        
        // 블록 중심에서 방출
        const px = xCol * blockSize + blockSize / 2;
        const py = rowIdx * blockSize + blockSize / 2;

        for (let k = 0; k < 4; k++) {
          particlesTemp.push(new StarParticle(px, py, color));
        }
      }
    });

    particlesRef.current = [...particlesRef.current, ...particlesTemp];
  }, [linesBeingCleared, blockSize, grid]);

  // 메인 드로잉 루프
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const cols = 10;
    const rows = 20;

    // 캔버스 사이즈 물리 셋업
    canvas.width = cols * blockSize;
    canvas.height = rows * blockSize;

    // 기하 도형 그리기 도우미 (색약 보정 질감 및 네온 디자인 반영)
    const drawBlock = (x: number, y: number, type: TetrominoType, isGhost = false) => {
      const px = x * blockSize;
      const py = y * blockSize;
      const rColor = TETROMINO_COLORS[type];

      if (isGhost) {
        // [A] 고스트 피스는 속이 빈 고해상도 네온 테두리로만 그리기
        ctx.save();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = rColor;
        ctx.shadowColor = rColor;
        ctx.shadowBlur = 8;
        
        // 바운스 박스 속 그리기
        ctx.strokeRect(px + 1.5, py + 1.5, blockSize - 3, blockSize - 3);
        
        // 고스트 텍스처 (색약용 보조 마크)
        if (colorblindFriendly) {
          ctx.fillStyle = `rgba(255, 255, 255, 0.25)`;
          ctx.font = `bold ${Math.floor(blockSize * 0.45)}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(type, px + blockSize / 2, py + blockSize / 2);
        }
        ctx.restore();
        return;
      }

      // [B] 채워진 고품격 아케이드 네온 블록 그리기
      ctx.save();
      
      // 네온 글로우 필터 장착
      ctx.shadowColor = rColor;
      ctx.shadowBlur = 10;
      
      // 그라데이션으로 입체 네온 튜브 연출
      const blockGradient = ctx.createLinearGradient(px, py, px + blockSize, py + blockSize);
      blockGradient.addColorStop(0, '#ffffff'); // 최고 하이라이트
      blockGradient.addColorStop(0.2, rColor);
      blockGradient.addColorStop(1, 'rgba(0, 0, 0, 0.95)'); // 짙은 사이드 그림자

      ctx.fillStyle = blockGradient;
      ctx.fillRect(px + 1, py + 1, blockSize - 2, blockSize - 2);
      
      // 내부 얇은 보조 테두리
      ctx.strokeStyle = '#rgba(255, 255, 255, 0.55)';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(px + 2.5, py + 2.5, blockSize - 5, blockSize - 5);

      // 색약 보정을 켰을 때, 블록마다 아주 명확한 식별 심볼 일러스트 기재
      // I: 가로 한줄, O: 가운데 사각, T: 십자 모양, S: 동그라미, Z: 세로선, J: 엑스표, L: 삼각형
      if (colorblindFriendly) {
        ctx.shadowBlur = 0; // 글자 가독성을 위해 글로우 OFF
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.floor(blockSize * 0.45)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        let symStr: string = type;
        switch (type) {
          case 'I': symStr = '◈'; break;
          case 'O': symStr = '▣'; break;
          case 'T': symStr = '▲'; break;
          case 'S': symStr = '◆'; break;
          case 'Z': symStr = '▼'; break;
          case 'J': symStr = '◀'; break;
          case 'L': symStr = '▶'; break;
        }

        ctx.fillText(symStr, px + blockSize / 2, py + blockSize / 2);
      }

      ctx.restore();
    };

    // 타겟 프레임 그리기 루프
    const renderPlayfield = () => {
      // 1. 반투명 배경 지우기
      ctx.fillStyle = 'rgba(10, 5, 25, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. 가로 세로 네온 실선 격자판 그리기
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = 'rgba(0, 240, 240, 0.12)';
      
      for (let r = 0; r <= rows; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * blockSize);
        ctx.lineTo(cols * blockSize, r * blockSize);
        ctx.stroke();
      }

      for (let c = 0; c <= cols; c++) {
        ctx.beginPath();
        ctx.moveTo(c * blockSize, 0);
        ctx.lineTo(c * blockSize, rows * blockSize);
        ctx.stroke();
      }

      // 3. 고스트 피스 그리기
      if (currentPiece && !isGameOver && !isPaused) {
        const pieceShape = currentPiece.matrix;
        const hRows = pieceShape.length;
        const hCols = pieceShape[0].length;

        for (let r = 0; r < hRows; r++) {
          for (let c = 0; c < hCols; c++) {
            if (pieceShape[r][c]) {
              const gx = currentPiece.x + c;
              const gy = ghostY + r;
              // 상단 바깥 범위를 제한하고 그림
              if (gy >= 0 && gy < rows) {
                drawBlock(gx, gy, currentPiece.type, true);
              }
            }
          }
        }
      }

      // 4. 벽에 이미 안착하여 보관 중인 고정 블록들 복원
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const type = grid[r][c];
          
          // 만약 라인이 지워지는 애니메이션 중이면 번쩍이는 흰색 플래시로 대체
          if (type) {
            if (linesBeingCleared.includes(r)) {
              ctx.save();
              ctx.fillStyle = '#ffffff';
              ctx.shadowColor = '#00ffff';
              ctx.shadowBlur = 15;
              ctx.fillRect(c * blockSize + 0.5, r * blockSize + 0.5, blockSize - 1, blockSize - 1);
              ctx.restore();
            } else {
              drawBlock(c, r, type, false);
            }
          }
        }
      }

      // 5. 활성화된 현재 조종중인 블록 그리기
      if (currentPiece && !isGameOver && !isPaused) {
        const pieceShape = currentPiece.matrix;
        const hRows = pieceShape.length;
        const hCols = pieceShape[0].length;

        for (let r = 0; r < hRows; r++) {
          for (let c = 0; c < hCols; c++) {
            if (pieceShape[r][c]) {
              const px = currentPiece.x + c;
              const py = currentPiece.y + r;
              if (py >= 0 && py < rows) {
                drawBlock(px, py, currentPiece.type, false);
              }
            }
          }
        }
      }

      // 6. 실시간 라인 삭제 폭탄 파티클 업데이트 및 렌더
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update();
        if (p.alpha <= 0) {
          particles.splice(i, 1);
        } else {
          ctx.save();
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha;
          ctx.shadowBlur = 6;
          ctx.shadowColor = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // 7. 레벨업 시 화면 번쩍임 사이버 위기경보 연출
      if (levelUpFlash) {
        ctx.save();
        ctx.fillStyle = 'rgba(234, 179, 8, 0.25)'; // 골드 플래시
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#ffffff';
         ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 20;
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚡ LEVEL UP! 속도 가속! ⚡', canvas.width / 2, canvas.height / 2);
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(renderPlayfield);
    };

    renderPlayfield();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [grid, currentPiece, ghostY, linesBeingCleared, levelUpFlash, isPaused, isGameOver, colorblindFriendly, blockSize]);

  const getModeTitle = () => {
    switch (gameMode) {
      case GameMode.CLASSIC: return '클래식';
      case GameMode.MARATHON: return '마라톤';
      case GameMode.TIME_ATTACK: return '타임어택';
      case GameMode.SURVIVAL: return '서바이벌';
    }
  };

  return (
    <div className="relative w-full aspect-[1/2] max-h-[650px] mx-auto flex flex-col items-center justify-center">
      
      {/* 바둑판 실외곽 케이스: 네온 사이버 광선 테두리 */}
      <div 
        ref={containerRef}
        className="relative w-full h-full board-frame rounded-xl p-1 overflow-hidden flex items-center justify-center"
      >
        <canvas 
          ref={canvasRef} 
          id="main_tetris_screen"
          className="mx-auto block rounded"
        />

        {/* 8. 일시 정지 (PAUSE) 오버레이 */}
        {isPaused && !isGameOver && (
          <div className="absolute inset-0 bg-[#060312]/92 backdrop-blur-md flex flex-col items-center justify-center p-6 space-y-5 select-none z-20">
            <div className="p-3 bg-yellow-500/10 border border-yellow-500 rounded-full text-yellow-400 animate-pulse">
              <Play className="w-8 h-8 rotate-90" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-xl font-bold text-white tracking-widest uppercase">작전 일시 중지</h3>
              <p className="text-xs text-gray-400">시스템 동결 중. 조작 준비를 하십시오.</p>
            </div>
            
            <div className="w-full max-w-xs space-y-2 pt-2">
              <button
                id="pause_overlay_btn_resume"
                onClick={onResume}
                className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase tracking-widest transition-all cursor-pointer shadow-[0_0_15px_rgba(0,240,240,0.4)] flex items-center justify-center gap-1.5"
              >
                <span>이어서 계속하기</span>
              </button>

              <button
                id="pause_overlay_btn_restart"
                onClick={onRestart}
                className="w-full py-2.5 rounded-xl border border-yellow-500/30 hover:border-yellow-400 text-yellow-400 hover:bg-yellow-500/10 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>처음부터 재시작</span>
              </button>

              <button
                id="pause_overlay_btn_exit"
                onClick={onExitToMenu}
                className="w-full py-2.5 rounded-xl border border-red-500/30 hover:border-red-500 text-red-400 hover:bg-red-500/10 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                <span>기지 복귀 (메인으로)</span>
              </button>
            </div>
          </div>
        )}

        {/* 9. 게임오버 (GAME OVER) 오버레이 */}
        {isGameOver && (
          <div className="absolute inset-0 bg-red-950/92 backdrop-blur-md flex flex-col items-center justify-center p-6 space-y-5 select-none z-20">
            <div className="p-3 bg-red-600/10 border border-red-500 rounded-full text-red-500 animate-bounce">
              <RotateCcw className="w-8 h-8" />
            </div>
            
            <div className="text-center space-y-1">
              <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-fuchsia-500 tracking-wider">
                그리드 붕괴 (게임오버)
              </h3>
              <p className="text-xs text-gray-300">최선을 다해 방어하였으나 한계에 도달했습니다.</p>
            </div>

            <div className="bg-black/40 border border-red-500/20 p-4 rounded-xl text-center w-full max-w-[200px]">
              <span className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold block">모드: {getModeTitle()}</span>
              <span className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold block">최종 점수</span>
              <span className="text-2xl font-black font-mono text-[#00f0f0] tracking-tight">{score.toLocaleString()}</span>
            </div>

            <div className="w-full max-w-xs space-y-2 pt-2">
              <button
                id="gameover_overlay_btn_retry"
                onClick={onRestart}
                className="w-full py-3 rounded-xl bg-red-500 hover:bg-red-400 text-black font-black text-xs uppercase tracking-widest transition-all cursor-pointer shadow-[0_0_15px_rgba(239,68,68,0.4)]"
              >
                도전 재시도 (재학습)
              </button>

              <button
                id="gameover_overlay_btn_exit"
                onClick={onExitToMenu}
                className="w-full py-2.5 rounded-xl border border-gray-600 hover:border-white text-gray-300 font-bold text-xs transition-all cursor-pointer"
              >
                메인 허브 메뉴로 돌아가기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TetrisPlayfield;
