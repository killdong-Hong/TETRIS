/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum GameMode {
  CLASSIC = 'CLASSIC',        // 클래식 모드
  MARATHON = 'MARATHON',      // 마라톤 모드
  TIME_ATTACK = 'TIME_ATTACK',  // 타임어택 모드
  SURVIVAL = 'SURVIVAL',      // 서바이벌 모드
}

export enum AISkillLevel {
  NOVICE = '초급',
  INTERMEDIATE = '중급',
  EXPERT = '고급',
}

export interface PlayerStats {
  highScore: number;          // 최고 점수
  maxLevel: number;           // 최고 레벨
  totalGames: number;         // 총 플레이 횟수
  totalPlayTime: number;      // 총 플레이 시간 (초)
  maxCombo: number;           // 최고 콤보
  tetrisCount: number;        // 최다 테트리스 성공 횟수 (4줄 동시 제거)
}

export interface Achievement {
  id: string;
  title: string;              // 업적 제목
  description: string;        // 업적 설명
  targetKey: keyof PlayerStats | 'combo10' | 'level30' | 'level50' | 'lines100'; // 달성 조건 키
  unlocked: boolean;          // 잠금 해제 여부
}

export type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

export type Point = { x: number; y: number };

export interface SettingState {
  soundVolume: number;        // 효과음 볼륨 (0.0 ~ 1.0)
  bgmVolume: number;          // BGM 볼륨 (0.0 ~ 1.0 - Web Audio 합성음으로 생성)
  isMuted: boolean;           // 음소거 상태
  colorblindFriendly: boolean; // 색약 보정 모드
}
