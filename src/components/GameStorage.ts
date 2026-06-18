/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PlayerStats, Achievement, GameMode, AISkillLevel } from '../types';

const STATS_KEY = 'NEON_TETRIS_INFINITY_STATS_V1';
const ACHIEVEMENTS_KEY = 'NEON_TETRIS_INFINITY_ACHIEVEMENTS_V1';

const DEFAULT_STATS: PlayerStats = {
  highScore: 0,
  maxLevel: 1,
  totalGames: 0,
  totalPlayTime: 0,
  maxCombo: 0,
  tetrisCount: 0,
};

const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_game',
    title: '새로운 네온 도전자',
    description: '첫번째 게임 완료하기',
    targetKey: 'totalGames',
    unlocked: false
  },
  {
    id: 'lines_100',
    title: '그리드 청소부',
    description: '누적 라인 100개 이상 제거하기 (다른 판 합산)',
    targetKey: 'lines100',
    unlocked: false
  },
  {
    id: 'combo_10',
    title: '연쇄 에너지 로드',
    description: '공중 콤보 10회 돌파하기',
    targetKey: 'combo10',
    unlocked: false
  },
  {
    id: 'tetris_50',
    title: '인피니티 차원 초월자',
    description: '누적 테트리스(4줄 동시 삭제) 50회 달성하기',
    targetKey: 'tetrisCount',
    unlocked: false
  },
  {
    id: 'level_30',
    title: '하이퍼 드라이브 속도',
    description: '게임 레벨 30 이상 도달하기',
    targetKey: 'level30',
    unlocked: false
  },
  {
    id: 'level_50',
    title: '네온 인피니티 마스터',
    description: '신의 경지! 50레벨 이상 도달하기',
    targetKey: 'level50',
    unlocked: false
  }
];

export class GameStorage {
  // 1. 플레이어 스탯 로드
  public static loadStats(): PlayerStats {
    try {
      const data = localStorage.getItem(STATS_KEY);
      if (data) {
        return { ...DEFAULT_STATS, ...JSON.parse(data) };
      }
    } catch (e) {
      console.error('스탯 불러오기 실패:', e);
    }
    return { ...DEFAULT_STATS };
  }

  // 2. 플레이어 스탯 저장
  public static saveStats(stats: PlayerStats): void {
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch (e) {
      console.error('스탯 저장 실패:', e);
    }
  }

  // 3. 도전과제 로드
  public static loadAchievements(): Achievement[] {
    try {
      const data = localStorage.getItem(ACHIEVEMENTS_KEY);
      if (data) {
        const saved: Achievement[] = JSON.parse(data);
        // 혹시 기존 스펙 변경됐을수도있으니 초기배열에 덮어씀
        return INITIAL_ACHIEVEMENTS.map(initial => {
          const match = saved.find(s => s.id === initial.id);
          return match ? { ...initial, unlocked: match.unlocked } : initial;
        });
      }
    } catch (e) {
      console.error('도전과제 불러오기 실패:', e);
    }
    return [ ...INITIAL_ACHIEVEMENTS ];
  }

  // 4. 도전과제 저장
  public static saveAchievements(achievements: Achievement[]): void {
    try {
      localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(achievements));
    } catch (e) {
      console.error('도전과제 저장 실패:', e);
    }
  }

  // 5. 게임 완료 후 통계 업데이트 및 업적 체크
  public static updateAfterGame(
    gameScore: number,
    gameLevel: number,
    gamePlayTime: number,
    gameMaxCombo: number,
    gameTetrisCount: number,
    gameRemovedLines: number,
    onUnlockAchievement?: (ach: Achievement) => void
  ): { stats: PlayerStats; newlyUnlocked: Achievement[] } {
    const stats = this.loadStats();
    
    // 점수 누적 및 갱신
    stats.totalGames += 1;
    stats.totalPlayTime += gamePlayTime;
    
    if (gameScore > stats.highScore) {
      stats.highScore = gameScore;
    }
    if (gameLevel > stats.maxLevel) {
      stats.maxLevel = gameLevel;
    }
    if (gameMaxCombo > stats.maxCombo) {
      stats.maxCombo = gameMaxCombo;
    }
    
    // 누적 테트리스 횟수
    stats.tetrisCount += gameTetrisCount;

    // 로컬 스택에 누적 라인 수 임시 기록용 (통계와는 별개로 업적 체크용)
    const totalLinesRemovedHistoryKey = 'NEON_TETRIS_INFINITY_TOTAL_LINES_REMOVED';
    let totalLinesRemoved = parseInt(localStorage.getItem(totalLinesRemovedHistoryKey) || '0', 10);
    totalLinesRemoved += gameRemovedLines;
    localStorage.setItem(totalLinesRemovedHistoryKey, totalLinesRemoved.toString());

    this.saveStats(stats);

    // 업적 검사
    const achievements = this.loadAchievements();
    const newlyUnlocked: Achievement[] = [];

    const updatedAchievements = achievements.map(ach => {
      if (ach.unlocked) return ach;

      let meetsCondition = false;

      switch (ach.targetKey) {
        case 'totalGames':
          meetsCondition = stats.totalGames >= 1;
          break;
        case 'tetrisCount':
          meetsCondition = stats.tetrisCount >= 50;
          break;
        case 'maxCombo':
          meetsCondition = stats.maxCombo >= 5;
          break;
        case 'combo10':
          meetsCondition = gameMaxCombo >= 10;
          break;
        case 'level30':
          meetsCondition = gameLevel >= 30;
          break;
        case 'level50':
          meetsCondition = gameLevel >= 50;
          break;
        case 'lines100':
          meetsCondition = totalLinesRemoved >= 100;
          break;
        default:
          break;
      }

      if (meetsCondition) {
        newlyUnlocked.push({ ...ach, unlocked: true });
        if (onUnlockAchievement) {
          onUnlockAchievement({ ...ach, unlocked: true });
        }
        return { ...ach, unlocked: true };
      }
      return ach;
    });

    if (newlyUnlocked.length > 0) {
      this.saveAchievements(updatedAchievements);
    }

    return { stats, newlyUnlocked };
  }

  // 6. 플레이어 실력 AI 분석
  // 분석 기준: 평균 점수, 생존 시간, 콤보 수, 테트리스 성공 횟수
  public static analyzeSkill(
    avgScore: number,
    surviveTime: number,
    maxCombo: number,
    tetrisCount: number
  ): AISkillLevel {
    // 실력 지수 점수 환산
    let skillScore = 0;
    
    // 1. 점수 가중치 (평균 점수가 높을수록 실력 증가)
    if (avgScore > 100000) skillScore += 40;
    else if (avgScore > 30000) skillScore += 25;
    else if (avgScore > 5000) skillScore += 10;

    // 2. 생존 시간 (한 판에 버틴 최장 시간)
    if (surviveTime > 300) skillScore += 20; // 5분 이상
    else if (surviveTime > 120) skillScore += 12; // 2분 이상
    else if (surviveTime > 45) skillScore += 5;

    // 3. 콤보
    if (maxCombo >= 8) skillScore += 20;
    else if (maxCombo >= 4) skillScore += 10;
    else if (maxCombo >= 2) skillScore += 5;

    // 4. 테트리스
    if (tetrisCount >= 10) skillScore += 20;
    else if (tetrisCount >= 3) skillScore += 10;
    else if (tetrisCount >= 1) skillScore += 5;

    // 판정
    if (skillScore >= 65) {
      return AISkillLevel.EXPERT; // 고급
    } else if (skillScore >= 25) {
      return AISkillLevel.INTERMEDIATE; // 중급
    } else {
      return AISkillLevel.NOVICE; // 초급
    }
  }
}
export default GameStorage;
