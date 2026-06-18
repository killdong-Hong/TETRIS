/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Play, 
  Settings as SettingsIcon, 
  Trophy, 
  HelpCircle, 
  Volume2, 
  VolumeX, 
  Award, 
  BookOpen, 
  Flame, 
  Sparkles, 
  Smartphone, 
  Keyboard,
  Clock,
  ShieldAlert,
  Gamepad2
} from 'lucide-react';
import { GameMode, PlayerStats, Achievement, SettingState } from '../types';

interface MainMenuProps {
  stats: PlayerStats;
  achievements: Achievement[];
  settings: SettingState;
  onUpdateSettings: (newSettings: SettingState) => void;
  onStartGame: (mode: GameMode) => void;
}

type TabType = 'MENU' | 'SETTINGS' | 'ACHIEVEMENTS' | 'HELP' | 'RECORDS';

export const MainMenu: React.FC<MainMenuProps> = ({
  stats,
  achievements,
  settings,
  onUpdateSettings,
  onStartGame,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('MENU');

  const playClick = () => {
    // 임시 오디오 트리거용 (사용자 반응 후 Audio 작동 활성화)
    try {
      const tempCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      tempCtx.resume();
    } catch (e) {}
  };

  const toggleMute = () => {
    onUpdateSettings({ ...settings, isMuted: !settings.isMuted });
  };

  const handleSoundVol = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateSettings({ ...settings, soundVolume: parseFloat(e.target.value) });
  };

  const handleBgmVol = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateSettings({ ...settings, bgmVolume: parseFloat(e.target.value) });
  };

  const toggleColorblind = () => {
    onUpdateSettings({ ...settings, colorblindFriendly: !settings.colorblindFriendly });
  };

  // 포맷 시간 도우미 (초 -> 분:초)
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}분 ${secs}초`;
  };

  return (
    <div 
      className="relative z-10 w-full max-w-lg mx-auto flex flex-col justify-center min-h-[85vh] p-4 text-white font-sans text-center md:p-6"
      onClick={playClick}
    >
      {/* 1. 타이틀 영역 */}
      <div className="mb-8 space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f000ff]/15 border border-[#f000ff]/30 text-[#f000ff] text-xs font-mono uppercase tracking-widest animate-pulse">
          <Sparkles className="w-3 h-3" />
          네온 아케이드 인피니티
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase drop-shadow-[0_0_15px_rgba(0,240,240,0.8)] filter">
          <span className="text-[#00f0f0]">네온 테트리스</span>
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f000ff] to-[#00f0f0] font-extrabold text-2xl md:text-3xl tracking-[0.2em] block mt-1">
            : 인피니티
          </span>
        </h1>
        <p className="text-gray-400 text-xs font-mono tracking-widest uppercase">
          PRODUCED BY ULTIMATE CODER &bull; 60 FPS Engine
        </p>
      </div>

      {/* 2. 대시보드 박스 - 글래스모피즘 네온 테두리 적용 */}
      <div className="w-full panel-card overflow-hidden transition-all duration-300">
        
        {/* 네온 프레임 헤더 (장식) */}
        <div className="h-1 bg-gradient-to-r from-[#00f0f0] via-[#f000ff] to-[#00f0f0]"></div>

        {/* 탭 이동에 따른 동적 컴포넌트 렌더링 */}
        {activeTab === 'MENU' && (
          <div className="p-6 space-y-6">
            <h2 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
              게임 모드 선택
            </h2>
            
            {/* 모드 카드 그리드 */}
            <div className="grid grid-cols-1 gap-3.5">
              {/* 클래식 모드 */}
              <button
                id="btn_mode_classic"
                onClick={() => onStartGame(GameMode.CLASSIC)}
                className="group relative flex items-center justify-between p-4 rounded-xl border border-cyan-500/25 bg-gradient-to-r from-cyan-950/20 to-black/40 hover:from-cyan-950/40 hover:to-cyan-900/10 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(0,240,240,0.3)] transition-all duration-300 text-left cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-400/30 text-cyan-400 group-hover:scale-110 transition-transform">
                    <Gamepad2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">
                      클래식 모드
                    </div>
                    <div className="text-xs text-cyan-300/60 mt-0.5">
                      정통 규칙, 속도 및 낙하 점수로 돌파
                    </div>
                  </div>
                </div>
                <Play className="w-4 h-4 text-cyan-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </button>

              {/* 마라톤 모드 */}
              <button
                id="btn_mode_marathon"
                onClick={() => onStartGame(GameMode.MARATHON)}
                className="group relative flex items-center justify-between p-4 rounded-xl border border-[#f000ff]/25 bg-gradient-to-r from-fuchsia-950/20 to-black/40 hover:from-fuchsia-950/40 hover:to-fuchsia-900/10 hover:border-[#f000ff] hover:shadow-[0_0_15px_rgba(240,0,255,0.3)] transition-all duration-300 text-left cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 rounded-lg bg-[#f000ff]/10 border border-[#f000ff]/30 text-[#f000ff] group-hover:scale-110 transition-transform">
                    <Flame className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white group-hover:text-[#f000ff] transition-colors">
                      마라톤 모드
                    </div>
                    <div className="text-xs text-[#f000ff]/60 mt-0.5">
                      끝없는 극한 영역, 최고 50레벨 돌달 도전
                    </div>
                  </div>
                </div>
                <Play className="w-4 h-4 text-[#f000ff] opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </button>

              {/* 타임어택 모드 */}
              <button
                id="btn_mode_timeattack"
                onClick={() => onStartGame(GameMode.TIME_ATTACK)}
                className="group relative flex items-center justify-between p-4 rounded-xl border border-yellow-500/25 bg-gradient-to-r from-yellow-950/25 to-black/40 hover:from-yellow-950/40 hover:to-yellow-900/10 hover:border-yellow-400 hover:shadow-[0_0_15px_rgba(234,179,8,0.3)] transition-all duration-300 text-left cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-400/30 text-yellow-400 group-hover:scale-110 transition-transform">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white group-hover:text-yellow-400 transition-colors">
                      타임어택 모드
                    </div>
                    <div className="text-xs text-yellow-300/60 mt-0.5">
                      3분(180초) 제한 시간 내 고화력 콤보 득점전
                    </div>
                  </div>
                </div>
                <Play className="w-4 h-4 text-yellow-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </button>

              {/* 서바이벌 모드 */}
              <button
                id="btn_mode_survival"
                onClick={() => onStartGame(GameMode.SURVIVAL)}
                className="group relative flex items-center justify-between p-4 rounded-xl border border-red-500/25 bg-gradient-to-r from-red-950/25 to-black/40 hover:from-red-950/40 hover:to-red-900/10 hover:border-red-400 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all duration-300 text-left cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-400/30 text-red-400 group-hover:scale-110 transition-transform">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white group-hover:text-red-400 transition-colors">
                      서바이벌 모드
                    </div>
                    <div className="text-xs text-red-400/60 mt-0.5">
                      경고! 주기마다 바닥에서 솟구치는 오염된 장애물 극복
                    </div>
                  </div>
                </div>
                <Play className="w-4 h-4 text-red-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </button>
            </div>

            {/* 메인 메뉴 보조 버튼들 */}
            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-cyan-500/15">
              <button
                id="btn_tab_settings"
                onClick={() => setActiveTab('SETTINGS')}
                className="flex flex-col items-center gap-1 py-2 rounded-lg hover:bg-cyan-500/10 text-gray-300 hover:text-cyan-400 transition-all text-xs cursor-pointer"
              >
                <SettingsIcon className="w-4.5 h-4.5" />
                <span>게임 설정</span>
              </button>

              <button
                id="btn_tab_achievements"
                onClick={() => setActiveTab('ACHIEVEMENTS')}
                className="flex flex-col items-center gap-1 py-2 rounded-lg hover:bg-[#f000ff]/10 text-gray-300 hover:text-[#f000ff] transition-all text-xs cursor-pointer"
              >
                <Award className="w-4.5 h-4.5" />
                <span>도전 과제</span>
              </button>

              <button
                id="btn_tab_help"
                onClick={() => setActiveTab('HELP')}
                className="flex flex-col items-center gap-1 py-2 rounded-lg hover:bg-yellow-500/10 text-gray-300 hover:text-yellow-400 transition-all text-xs cursor-pointer"
              >
                <HelpCircle className="w-4.5 h-4.5" />
                <span>조작 안내</span>
              </button>

              <button
                id="btn_tab_records"
                onClick={() => setActiveTab('RECORDS')}
                className="flex flex-col items-center gap-1 py-2 rounded-lg hover:bg-emerald-500/10 text-gray-300 hover:text-emerald-400 transition-all text-xs cursor-pointer"
              >
                <Trophy className="w-4.5 h-4.5" />
                <span>기록실</span>
              </button>
            </div>
          </div>
        )}

        {/* 2-1. 설정 화면 */}
        {activeTab === 'SETTINGS' && (
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <SettingsIcon className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-bold text-white">오픈 시스템 환율 및 볼륨 설정</h2>
            </div>

            <div className="space-y-5 text-left border-t border-cyan-500/15 pt-4">
              {/* 음소거 토글 */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-black/40 border border-cyan-500/15">
                <div>
                  <div className="text-sm font-semibold text-white">마스터 사운드 음소거</div>
                  <div className="text-xs text-gray-400">전체 아케이드 오디오 차단</div>
                </div>
                <button
                  id="btn_toggle_mute"
                  onClick={toggleMute}
                  className={`p-2 rounded-lg border cursor-pointer transition-all ${
                    settings.isMuted 
                      ? 'bg-red-500/25 border-red-500 text-red-400' 
                      : 'bg-cyan-500/15 border-cyan-500 text-cyan-400'
                  }`}
                >
                  {settings.isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
              </div>

              {/* 효과음 볼륨 */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-gray-300">인게임 아케이드 효과음 볼륨</span>
                  <span className="text-cyan-400">{Math.round(settings.soundVolume * 100)}%</span>
                </div>
                <input
                  id="slider_sfx_volume"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.soundVolume}
                  onChange={handleSoundVol}
                  disabled={settings.isMuted}
                  className="w-full accent-cyan-400 cursor-pointer opacity-80 hover:opacity-100 disabled:opacity-40"
                />
              </div>

              {/* BGM 볼륨 */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-gray-300">네온 합성 앰비언스 BGM 볼륨</span>
                  <span className="text-[#f000ff]">{Math.round(settings.bgmVolume * 100)}%</span>
                </div>
                <input
                  id="slider_bgm_volume"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.bgmVolume}
                  onChange={handleBgmVol}
                  disabled={settings.isMuted}
                  className="w-full accent-[#f000ff] cursor-pointer opacity-80 hover:opacity-100 disabled:opacity-40"
                />
              </div>

              {/* 색약 보정 모드 */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-black/40 border border-cyan-500/15">
                <div>
                  <div className="text-sm font-semibold text-white">색약 보조 모드 적용</div>
                  <div className="text-xs text-gray-400">색약 사용자를 위한 텍스처 질감 렌더링 활성화</div>
                </div>
                <button
                  id="btn_toggle_colorblind"
                  onClick={toggleColorblind}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                    settings.colorblindFriendly 
                      ? 'bg-emerald-500/25 border-emerald-500 text-emerald-400' 
                      : 'bg-gray-700/30 border-gray-600 text-gray-400'
                  }`}
                >
                  {settings.colorblindFriendly ? '설정됨' : '미사용'}
                </button>
              </div>
            </div>

            <button
              id="btn_settings_back"
              onClick={() => setActiveTab('MENU')}
              className="w-full py-3 rounded-lg border border-cyan-500/30 bg-cyan-950/20 hover:bg-cyan-900/40 text-cyan-400 font-bold text-sm transition-all cursor-pointer"
            >
              메인 메인으로 돌아가기
            </button>
          </div>
        )}

        {/* 2-2. 도전 과제 */}
        {activeTab === 'ACHIEVEMENTS' && (
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-2 mb-1">
              <Award className="w-5 h-5 text-[#f000ff]" />
              <h2 className="text-lg font-bold text-white">홀로그램 도전 과제 업적 완료도</h2>
            </div>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 border-t border-cyan-500/15 pt-4 text-left custom-scrollbar">
              {achievements.map((ach) => (
                <div 
                  key={ach.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                    ach.unlocked 
                      ? 'bg-fuchsia-950/20 border-fuchsia-500/40 shadow-[0_0_10px_rgba(240,0,255,0.1)]' 
                      : 'bg-black/40 border-gray-800 opacity-60'
                  }`}
                >
                  <div className={`p-2 rounded-lg border ${
                    ach.unlocked 
                      ? 'bg-fuchsia-500/10 border-fuchsia-400 text-fuchsia-400' 
                      : 'bg-gray-900/50 border-gray-700 text-gray-500'
                  }`}>
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-sm font-bold ${ach.unlocked ? 'text-fuchsia-400' : 'text-gray-400'}`}>
                        {ach.title}
                      </span>
                      {ach.unlocked && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 font-bold uppercase tracking-wider scale-95 origin-left">
                          완료
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{ach.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              id="btn_achievements_back"
              onClick={() => setActiveTab('MENU')}
              className="w-full py-3 rounded-lg border border-[#f000ff]/30 bg-fuchsia-950/20 hover:bg-fuchsia-900/40 text-[#f000ff] font-bold text-sm transition-all cursor-pointer animate-pulse"
            >
              차원 기록 해제 완료 &bull; 돌아가기
            </button>
          </div>
        )}

        {/* 2-3. 조작 안내 */}
        {activeTab === 'HELP' && (
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="w-5 h-5 text-yellow-400" />
              <h2 className="text-lg font-bold text-white">조작 방식 및 테트리스 전술 훈련</h2>
            </div>

            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 border-t border-cyan-500/15 pt-4 text-left text-xs custom-scrollbar">
              {/* PC 키보드 단축키 */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-yellow-400 font-bold">
                  <Keyboard className="w-4 h-4" />
                  <span>PC 키보드 매핑 정보</span>
                </div>
                <div className="grid grid-cols-2 gap-2 bg-black/30 p-3 rounded-lg border border-yellow-500/10">
                  <div className="flex justify-between items-center py-1 border-b border-gray-800">
                    <span className="text-gray-400">← / →</span>
                    <span className="font-semibold text-white">블록 좌우 이동</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-gray-800">
                    <span className="text-gray-400">↑ (위 방향키)</span>
                    <span className="font-semibold text-white">블록 시계방향 회전</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-gray-800">
                    <span className="text-gray-400">↓ (아래 방향키)</span>
                    <span className="font-semibold text-white">소프트 드롭 (가속)</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-gray-800">
                    <span className="text-gray-400">스페이스바 (Space)</span>
                    <span className="font-semibold text-white">하드 드롭 (즉시낙하)</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-gray-800">
                    <span className="text-gray-400">Shift (왼쪽/오른쪽)</span>
                    <span className="font-semibold text-white">홀드 (블록 임시보관)</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-gray-800">
                    <span className="text-gray-400">P / Escape</span>
                    <span className="font-semibold text-white">일시정지 / 게임정지</span>
                  </div>
                </div>
              </div>

              {/* 모바일 터치 패드 */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-yellow-400 font-bold">
                  <Smartphone className="w-4 h-4" />
                  <span>모바일 디바이스 지원 정보</span>
                </div>
                <p className="text-gray-400 bg-black/20 p-2.5 rounded-lg border border-yellow-500/10 leading-relaxed">
                  모바일 스마트폰 세로 뷰포트에 완벽 정밀 설계된 전용 <b>가상 고감도 네온 버츄얼 패드</b>가 부착됩니다. 하단 버튼들을 직접 터치하여 정밀 컨트롤할 수 있습니다.
                </p>
              </div>

              {/* T-Spin 공식 가이드 */}
              <div className="space-y-1.5 bg-yellow-500/5 border border-yellow-400/20 p-3 rounded-lg">
                <div className="font-bold text-yellow-400 flex items-center gap-1">
                  <Award className="w-4 h-4" />
                  <span>AAA급 T-Spin 보너스 공식</span>
                </div>
                <p className="text-[#eab308]/70 leading-relaxed text-[11px]">
                  T 블록이 3면 구석 모서리가 막힌 공간에서 회전하여 안착 시 <b>T-Spin 판정</b>이 완성되어 엄청난 폭발 보너스 점수와 콤보 백투백 효과를 유도할 수 있습니다. 적극 공략하십시오.
                </p>
              </div>
            </div>

            <button
              id="btn_help_back"
              onClick={() => setActiveTab('MENU')}
              className="w-full py-3 rounded-lg border border-yellow-500/30 bg-yellow-950/20 hover:bg-yellow-900/40 text-yellow-400 font-bold text-sm transition-all cursor-pointer"
            >
              조작법 학습 완료 &bull; 확인
            </button>
          </div>
        )}

        {/* 2-4. 기록실 */}
        {activeTab === 'RECORDS' && (
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-white">인피니티 명예의 기록실</h2>
            </div>

            <div className="grid grid-cols-2 gap-3 text-left text-xs border-t border-cyan-500/15 pt-4">
              <div className="p-3 bg-black/40 border border-emerald-500/10 rounded-xl space-y-0.5">
                <span className="text-gray-400 block text-[10px] uppercase font-semibold">최고 명예 점수</span>
                <span className="text-lg font-black font-mono text-emerald-400 tracking-tight">
                  {stats.highScore.toLocaleString()}
                </span>
              </div>

              <div className="p-3 bg-black/40 border border-emerald-500/10 rounded-xl space-y-0.5">
                <span className="text-gray-400 block text-[10px] uppercase font-semibold">클리어 최고 레벨</span>
                <span className="text-lg font-black font-mono text-cyan-400 tracking-tight">
                  {stats.maxLevel} <span className="text-xs font-normal text-gray-400">Lv</span>
                </span>
              </div>

              <div className="p-3 bg-black/40 border border-emerald-500/10 rounded-xl space-y-0.5">
                <span className="text-gray-400 block text-[10px] uppercase font-semibold">총 우주 파일럿 플레이 횟수</span>
                <span className="text-base font-bold font-mono text-white">
                  {stats.totalGames} <span className="text-[10px] font-normal text-gray-400">판</span>
                </span>
              </div>

              <div className="p-3 bg-black/40 border border-emerald-500/10 rounded-xl space-y-0.5">
                <span className="text-gray-400 block text-[10px] uppercase font-semibold">누적 가속 시간</span>
                <span className="text-base font-bold font-mono text-white">
                  {formatTime(stats.totalPlayTime)}
                </span>
              </div>

              <div className="p-3 bg-black/40 border border-emerald-500/10 rounded-xl space-y-0.5">
                <span className="text-gray-400 block text-[10px] uppercase font-semibold">최고 연속 콤보</span>
                <span className="text-lg font-black font-mono text-yellow-400 tracking-tight">
                  {stats.maxCombo} <span className="text-xs font-normal text-gray-400">히트</span>
                </span>
              </div>

              <div className="p-3 bg-black/40 border border-emerald-500/10 rounded-xl space-y-0.5">
                <span className="text-gray-400 block text-[10px] uppercase font-semibold">최다 테트리스 성공</span>
                <span className="text-lg font-black font-mono text-[#f000ff] tracking-tight">
                  {stats.tetrisCount} <span className="text-xs font-normal text-gray-400">회</span>
                </span>
              </div>
            </div>

            <button
              id="btn_records_back"
              onClick={() => setActiveTab('MENU')}
              className="w-full py-3 rounded-lg border border-emerald-500/30 bg-emerald-950/20 hover:bg-emerald-900/40 text-emerald-400 font-bold text-sm transition-all cursor-pointer"
            >
              기록 연동 해제 &bull; 돌아가기
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MainMenu;
