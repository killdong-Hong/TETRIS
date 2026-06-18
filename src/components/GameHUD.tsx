/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Home, Brain, Trophy, Zap, AlertTriangle, ShieldAlert, Clock } from 'lucide-react';
import { GameMode, AISkillLevel, TetrominoType } from '../types';

interface GameHUDProps {
  score: number;
  highScore: number;
  level: number;
  lines: number;
  mode: GameMode;
  playTime: number; // 초 단위
  timeAttackRemaining?: number; // 0 ~ 180초
  nextBuffer: TetrominoType[]; // 5개 큐
  holdType: TetrominoType | null;
  holdLocked: boolean; // 이번 턴에 이미 홀드했는지
  isPaused: boolean;
  isMuted: boolean;
  aiLevel: AISkillLevel;
  comboCount: number;
  backToBack: boolean;
  actionMessage: string; // T-Spin!, Tetris!, Combo! 등 기분 좋은 앰플리튜드 텍스트
  survivalWarningProgress?: number; // 0 ~ 100 (% 다음 오염물이 솟아오르기 전 위험도)
  onPauseToggle: () => void;
  onMuteToggle: () => void;
  onExitToMenu: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  score,
  highScore,
  level,
  lines,
  mode,
  playTime,
  timeAttackRemaining,
  nextBuffer,
  holdType,
  holdLocked,
  isPaused,
  isMuted,
  aiLevel,
  comboCount,
  backToBack,
  actionMessage,
  survivalWarningProgress,
  onPauseToggle,
  onMuteToggle,
  onExitToMenu,
}) => {

  // 초 -> 시간 스트링 계산
  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60).toString().padStart(2, '0');
    const secs = (sec % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  // 모드 한글명 포맷
  const getModeLabelName = () => {
    switch (mode) {
      case GameMode.CLASSIC: return '클래식 모드';
      case GameMode.MARATHON: return '마라톤 모드';
      case GameMode.TIME_ATTACK: return '타임어택 모드';
      case GameMode.SURVIVAL: return '서바이벌 모드';
      default: return '네온 모드';
    }
  };

  // 다음 피스 셀 일러스트 렌더링 도우미 (작은 4x4 Grid)
  const renderMiniBlock = (type: TetrominoType | null) => {
    if (!type) {
      return (
        <div className="w-16 h-16 bg-black/40 border border-gray-800 rounded-lg flex items-center justify-center text-[10px] text-gray-500 font-semibold font-mono">
          비어있음
        </div>
      );
    }

    // 블록들의 상대좌표 정의
    const shapes: Record<TetrominoType, { grid: number[][], color: string, glow: string }> = {
      I: { grid: [[1, 1, 1, 1]], color: '#00f0f0', glow: 'shadow-[0_0_8px_#00f0f0]' },
      O: { grid: [[1, 1], [1, 1]], color: '#f0f000', glow: 'shadow-[0_0_8px_#f0f000]' },
      T: { grid: [[0, 1, 0], [1, 1, 1]], color: '#a000f0', glow: 'shadow-[0_0_8px_#a000f0]' },
      S: { grid: [[0, 1, 1], [1, 1, 0]], color: '#00f000', glow: 'shadow-[0_0_8px_#00f000]' },
      Z: { grid: [[1, 1, 0], [0, 1, 1]], color: '#f00000', glow: 'shadow-[0_0_8px_#f00000]' },
      J: { grid: [[1, 0, 0], [1, 1, 1]], color: '#0000f0', glow: 'shadow-[0_0_8px_#0000f0]' },
      L: { grid: [[0, 0, 1], [1, 1, 1]], color: '#f0a000', glow: 'shadow-[0_0_8px_#f0a000]' },
    };

    const block = shapes[type];
    
    return (
      <div className="relative w-16 h-16 bg-black/50 border border-cyan-500/15 rounded-xl flex items-center justify-center p-2">
        <div className="grid gap-[2px]" style={{ gridTemplateRows: `repeat(${block.grid.length}, minmax(0, 1fr))` }}>
          {block.grid.map((row, rIdx) => (
            <div key={rIdx} className="flex gap-[2px]">
              {row.map((cell, cIdx) => (
                <div 
                  key={cIdx} 
                  className={`w-3.5 h-3.5 rounded-sm transition-all ${
                    cell ? '' : 'bg-transparent'
                  }`}
                  style={{
                    backgroundColor: cell ? block.color : 'transparent',
                    boxShadow: cell ? `0 0 6px ${block.color}` : 'none'
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col gap-4 text-white font-sans p-2">
      
      {/* 1. 최상단 실시간 사이버 스피돔 네온 바 */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl panel-card">
        
        {/* 왼쪽: 게임 모드 및 타이머 */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 rounded bg-gradient-to-r from-cyan-950/40 to-[#050505]/40 border border-cyan-400/40 text-cyan-300 font-extrabold text-xs tracking-wider uppercase">
            {getModeLabelName()}
          </div>
          
          <div className="flex items-center gap-1.5 font-mono text-sm tracking-widest text-[#00f0f0] font-bold">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span className="text-white text-shadow-[0_0_8px_rgba(0,243,255,0.5)]">
              {mode === GameMode.TIME_ATTACK && timeAttackRemaining !== undefined
                ? formatTime(timeAttackRemaining)
                : formatTime(playTime)}
            </span>
          </div>

          {/* 타임어택 남은 시간 위험 바 */}
          {mode === GameMode.TIME_ATTACK && timeAttackRemaining !== undefined && (
            <div className="w-16 h-1.5 bg-gray-900 rounded-full overflow-hidden hidden sm:block border border-cyan-500/20">
              <div 
                className={`h-full transition-all duration-1000 ${timeAttackRemaining < 30 ? 'bg-red-500 animate-pulse' : 'bg-yellow-400'}`}
                style={{ width: `${(timeAttackRemaining / 180) * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* 중앙: 실시간 AI 지휘관 분석 등급 */}
        <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#f000ff]/10 border border-[#f000ff]/30 text-xs text-[#f000ff] font-semibold animate-pulse sm:flex">
          <Brain className="w-3.5 h-3.5 text-[#f000ff]" />
          <span>실력 분석: {aiLevel}</span>
        </div>

        {/* 오른쪽: 시스템 컨트롤러 (일시정지, 음소거, 나가기) */}
        <div className="flex items-center gap-2">
          <button
            id="hud_btn_mute"
            onClick={onMuteToggle}
            className="p-1.5 rounded-lg border border-cyan-500/30 bg-cyan-950/20 text-cyan-400 hover:text-white hover:border-cyan-400 transition-all cursor-pointer shadow-[0_0_8px_rgba(0,243,255,0.15)]"
            title="소음 차단"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            id="hud_btn_pause"
            onClick={onPauseToggle}
            className="px-3 py-1 text-xs font-bold rounded-lg border border-yellow-500/30 bg-yellow-950/20 text-yellow-400 hover:text-white hover:border-yellow-400 flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_8px_rgba(234,179,8,0.15)]"
          >
            {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            <span>{isPaused ? '재개' : '정지'}</span>
          </button>

          <button
            id="hud_btn_exit"
            onClick={onExitToMenu}
            className="p-1.5 rounded-lg border border-red-500/30 bg-red-950/20 text-red-500 hover:bg-red-500/25 hover:text-white transition-all cursor-pointer shadow-[0_0_8px_rgba(239,68,68,0.15)]"
            title="기지 퇴각 (메뉴로)"
          >
            <Home className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. 행동 폭발 메시지 배너 팝업 (액션 피드백) */}
      <div className="relative h-12 flex items-center justify-center overflow-hidden">
        {actionMessage ? (
          <div className="absolute px-5 py-1.5 bg-[#f000ff]/20 border border-[#f000ff]/50 rounded-full text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-fuchsia-400 to-cyan-400 font-black text-sm tracking-widest uppercase shadow-[0_0_15px_rgba(240,0,255,0.4)] animate-bounce">
            🔥 {actionMessage} 🔥
          </div>
        ) : comboCount > 0 ? (
          <div className="absolute text-orange-400 font-extrabold text-sm tracking-wide animate-pulse drop-shadow-[0_0_10px_rgba(251,146,60,0.5)]">
            ⚡ 연속 {comboCount} 콤보 중! ⚡
          </div>
        ) : backToBack ? (
          <div className="absolute text-cyan-400 font-mono text-xs uppercase tracking-widest animate-pulse drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">
            &lt; BACK-TO-BACK 활성화됨 &gt;
          </div>
        ) : null}
      </div>

      {/* 3. 인게임 메인 그리드 및 좌우 사이드 보드 정보 구성 */}
      <div className="grid grid-cols-12 gap-3.5 items-stretch">
        
        {/* 가상 모바일 레이아웃 지탱 도우미 (모바일 좌우 정렬을 위함) */}
        
        {/* [왼쪽 판넬]: HOLD 보관함 & 실기 점수 */}
        <div className="col-span-12 sm:col-span-3 flex flex-row sm:flex-col gap-3 justify-between sm:justify-start">
          
          {/* A. HOLD 보관 구역 */}
          <div className="flex-1 panel-card p-3 rounded-xl flex flex-col items-center justify-center relative group min-w-[120px]">
            <div className="absolute top-1.5 left-2 label-sm">
              저장 블록 (HOLD)
            </div>
            <div className="mt-5 mb-1">
              {renderMiniBlock(holdType)}
            </div>
            <div className={`text-[10px] uppercase font-bold tracking-tighter ${holdLocked ? 'text-red-400' : 'text-emerald-400'}`}>
              {holdLocked ? '사용 완료(잠금)' : '교체 대기'}
            </div>
          </div>

          {/* B. 점수판 정보 구역 */}
          <div className="flex-[1.5] panel-card-magenta p-3 rounded-xl flex flex-col justify-between gap-1 text-left relative min-w-[140px]">
            <div className="absolute top-1.5 left-2 label-sm-magenta">
              현재 점수 & 최고기록
            </div>
            
            <div className="space-y-1.5 mt-4">
              <div>
                <span className="text-[10px] text-gray-400 font-semibold block">CURRENT SCORE</span>
                <span className="value-lg block">
                  {score.toLocaleString()}
                </span>
              </div>
              
              <div>
                <span className="text-[10px] text-gray-400 font-semibold block">HIGH SCORE</span>
                <span className="value-lg-magenta text-xl block">
                  {highScore.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* [중앙]: 플레이 필드가 6칸을 채워 넣는다 (이 공간은 `TetrisPlayfield`를 위한 공간이며, HUD는 구조상 위치만 잡아줌) */}
        <div className="hidden sm:block sm:col-span-6">
          {/* 이 영역은 외부의 TetrisPlayfield가 절대 위치 또는 자식 구조로 들어가 자리 세팅 */}
          <div className="h-full border border-dashed border-cyan-500/10 rounded-xl flex items-center justify-center text-xs text-gray-500 font-mono">
            사이버 공간 그리드 중앙 안착선
          </div>
        </div>

        {/* [오른쪽 판넬]: NEXT 대기열 & 환경 인스펙터 */}
        <div className="col-span-12 sm:col-span-3 flex flex-row sm:flex-col gap-3 justify-between sm:justify-start">
          
          {/* C. NEXT 미리보기 (대기 목록 무려 5개!) */}
          <div className="flex-[2] panel-card p-3 rounded-xl flex flex-col items-center relative min-w-[150px]">
            <div className="absolute top-1.5 left-2 label-sm">
              다음 블록 (NEXT)
            </div>
            
            <div className="flex flex-row sm:flex-col gap-2 mt-5.5 justify-center">
              {nextBuffer.slice(0, 5).map((type, idx) => (
                <div 
                  key={idx} 
                  className={`transition-all duration-300 flex items-center justify-center ${
                    idx === 0 
                      ? 'scale-100 opacity-100 drop-shadow-[0_0_8px_rgba(0,243,255,0.4)]' 
                      : idx === 1 
                      ? 'scale-90 opacity-90' 
                      : idx === 2
                      ? 'scale-80 opacity-75'
                      : 'scale-70 opacity-40'
                  }`}
                >
                  {renderMiniBlock(type)}
                </div>
              ))}
            </div>
          </div>

          {/* D. 레벨업 & 라인 상태 인스펙터 */}
          <div className="flex-1 panel-card-yellow p-3 rounded-xl flex flex-col justify-between text-left relative min-w-[120px]">
            <div className="absolute top-1.5 left-2 label-sm-yellow">
              레벨 & 제거한 줄
            </div>

            <div className="space-y-1.5 mt-4 flex-1 flex flex-col justify-center">
              <div>
                <span className="text-[10px] text-gray-400 font-semibold">DRIVE LEVEL</span>
                <div className="value-lg-yellow flex items-center gap-1">
                  <Zap className="w-5 h-5 text-amber-400 fill-amber-400 animate-pulse" />
                  <span>{level}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-gray-400 font-semibold block">REMOVED LINES</span>
                <span className="value-lg block text-emerald-400 text-shadow-[0_0_8px_rgba(57,255,20,0.4)]">
                  {lines}
                </span>
              </div>
            </div>

            {/* 서바이벌 모드의 장애물 생성 바 */}
            {mode === GameMode.SURVIVAL && survivalWarningProgress !== undefined && (
              <div className="border-t border-cyan-500/15 pt-2 mt-1 pb-1">
                <span className="text-[9px] text-red-400 font-mono flex items-center gap-1 uppercase animate-pulse">
                  <ShieldAlert className="w-3 h-3 text-red-500" />
                  쓰레기줄 생성 경각
                </span>
                <div className="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden mt-1">
                  <div 
                    className="h-full bg-red-500 transition-all duration-300"
                    style={{ width: `${survivalWarningProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};

export default GameHUD;
