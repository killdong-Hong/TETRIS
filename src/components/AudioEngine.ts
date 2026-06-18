/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Web Audio API 기반 네온 사이버펑크 오디오 엔진
class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterVolumeNode: GainNode | null = null;
  private bgmVolumeNode: GainNode | null = null;
  private bgmIntervalId: number | null = null;

  // 볼륨 설정 상태 (0 ~ 1)
  private soundVolume: number = 0.5;
  private bgmVolume: number = 0.3;
  private isMuted: boolean = false;
  private currentBgmStep: number = 0;
  private isBgmPlaying: boolean = false;

  constructor() {
    // Lazy initialization on User interaction
  }

  private initCtx() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      this.masterVolumeNode = this.ctx.createGain();
      this.masterVolumeNode.gain.setValueAtTime(this.isMuted ? 0 : this.soundVolume, this.ctx.currentTime);
      this.masterVolumeNode.connect(this.ctx.destination);

      this.bgmVolumeNode = this.ctx.createGain();
      this.bgmVolumeNode.gain.setValueAtTime(this.isMuted ? 0 : this.bgmVolume, this.ctx.currentTime);
      this.bgmVolumeNode.connect(this.ctx?.destination || this.masterVolumeNode);
    } catch (e) {
      console.error('Web Audio API가 지원되지 않음:', e);
    }
  }

  public setSoundVolume(vol: number) {
    this.soundVolume = Math.max(0, Math.min(1, vol));
    if (this.masterVolumeNode && this.ctx) {
      this.masterVolumeNode.gain.setValueAtTime(this.isMuted ? 0 : this.soundVolume, this.ctx.currentTime);
    }
  }

  public setBgmVolume(vol: number) {
    this.bgmVolume = Math.max(0, Math.min(1, vol));
    if (this.bgmVolumeNode && this.ctx) {
      this.bgmVolumeNode.gain.setValueAtTime(this.isMuted ? 0 : this.bgmVolume, this.ctx.currentTime);
    }
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (this.ctx) {
      const time = this.ctx.currentTime;
      this.masterVolumeNode?.gain.setValueAtTime(muted ? 0 : this.soundVolume, time);
      this.bgmVolumeNode?.gain.setValueAtTime(muted ? 0 : this.bgmVolume, time);
    }
  }

  // 1. 블록 이동 사운드 (짧고 빠른 펄스 수락음)
  public playMove() {
    this.initCtx();
    if (!this.ctx || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(350, this.ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);

    osc.connect(gain);
    gain.connect(this.masterVolumeNode!);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.06);
  }

  // 2. 회전 사운드 (우주적인 피치 벤드 sweep)
  public playRotate() {
    this.initCtx();
    if (!this.ctx || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(this.masterVolumeNode!);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  // 3. 착지 사운드 (저음의 단단한 킥/타격 사운드)
  public playLand() {
    this.initCtx();
    if (!this.ctx || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(this.masterVolumeNode!);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  // 4. 일반 라인 제거 사운드 (짜릿한 가벼운 레이저 빔 소리)
  public playLineClear() {
    this.initCtx();
    if (!this.ctx || this.isMuted) return;

    const time = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();

    osc1.type = 'square';
    osc1.frequency.setValueAtTime(400, time);
    osc1.frequency.exponentialRampToValueAtTime(1200, time + 0.2);

    gain1.gain.setValueAtTime(0.1, time);
    gain1.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

    osc1.connect(gain1);
    gain1.connect(this.masterVolumeNode!);

    osc1.start();
    osc1.stop(time + 0.2);

    // 쾌활한 보조 아르페지오 한 음 추가
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(800, time + 0.05);
    osc2.frequency.exponentialRampToValueAtTime(1600, time + 0.2);
    gain2.gain.setValueAtTime(0.08, time + 0.05);
    gain2.gain.linearRampToValueAtTime(0.001, time + 0.2);
    osc2.connect(gain2);
    gain2.connect(this.masterVolumeNode!);
    osc2.start(time + 0.05);
    osc2.stop(time + 0.2);
  }

  // 5. 테트리스 제거 사운드 (장엄한 오버드라이브 폭발 사운드)
  public playTetrisClear() {
    this.initCtx();
    if (!this.ctx || this.isMuted) return;

    const time = this.ctx.currentTime;
    
    // 저음 럼블
    const oscLow = this.ctx.createOscillator();
    const gainLow = this.ctx.createGain();
    oscLow.type = 'sawtooth';
    oscLow.frequency.setValueAtTime(80, time);
    oscLow.frequency.linearRampToValueAtTime(30, time + 0.45);
    gainLow.gain.setValueAtTime(0.25, time);
    gainLow.gain.linearRampToValueAtTime(0.001, time + 0.45);
    oscLow.connect(gainLow);
    gainLow.connect(this.masterVolumeNode!);
    oscLow.start();
    oscLow.stop(time + 0.45);

    // 사이버 레이저 스윕
    const oscLaser = this.ctx.createOscillator();
    const gainLaser = this.ctx.createGain();
    oscLaser.type = 'sawtooth';
    oscLaser.frequency.setValueAtTime(300, time);
    oscLaser.frequency.exponentialRampToValueAtTime(2000, time + 0.35);
    
    gainLaser.gain.setValueAtTime(0.15, time);
    gainLaser.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
    
    oscLaser.connect(gainLaser);
    gainLaser.connect(this.masterVolumeNode!);
    
    oscLaser.start();
    oscLaser.stop(time + 0.35);
  }

  // 6. T-Spin 사운드 (미래지향적인 홀로그램 변형 시그널음)
  public playTSpin() {
    this.initCtx();
    if (!this.ctx || this.isMuted) return;

    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(500, time);
    osc.frequency.setValueAtTime(750, time + 0.08);
    osc.frequency.setValueAtTime(1100, time + 0.16);

    gain.gain.setValueAtTime(0.12, time);
    gain.gain.linearRampToValueAtTime(0.001, time + 0.24);

    osc.connect(gain);
    gain.connect(this.masterVolumeNode!);

    osc.start();
    osc.stop(time + 0.25);
  }

  // 7. 레벨업 사운드 (승리의 밝은 상승 스윕 멜로디)
  public playLevelUp() {
    this.initCtx();
    if (!this.ctx || this.isMuted) return;

    const time = this.ctx.currentTime;
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // 도 미 솔 도 미 솔 도
    
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time + idx * 0.06);
      
      gain.gain.setValueAtTime(0.1, time + idx * 0.06);
      gain.gain.linearRampToValueAtTime(0.001, time + idx * 0.06 + 0.15);
      
      osc.connect(gain);
      gain.connect(this.masterVolumeNode!);
      
      osc.start(time + idx * 0.06);
      osc.stop(time + idx * 0.06 + 0.15);
    });
  }

  // 8. 게임오버 사운드 (다마고치 스타일 쓸쓸하게 하강하는 조화음)
  public playGameOver() {
    this.initCtx();
    if (!this.ctx || this.isMuted) return;

    const time = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, time);
    osc.frequency.linearRampToValueAtTime(50, time + 1.2);
    
    gain.gain.setValueAtTime(0.15, time);
    gain.gain.linearRampToValueAtTime(0.001, time + 1.2);
    
    osc.connect(gain);
    gain.connect(this.masterVolumeNode!);
    
    osc.start();
    osc.stop(time + 1.2);
  }

  // 9. 연속 콤보 사운드 (콤보 수에 따라 음정이 점점 증가하는 기분 좋은 버저)
  public playCombo(comboCount: number) {
    this.initCtx();
    if (!this.ctx || this.isMuted) return;

    const time = this.ctx.currentTime;
    const baseFreq = 220; // A3
    const freqFactor = 1 + comboCount * 0.08;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq * freqFactor, time);
    
    gain.gain.setValueAtTime(0.15, time);
    gain.gain.linearRampToValueAtTime(0.001, time + 0.12);
    
    osc.connect(gain);
    gain.connect(this.masterVolumeNode!);
    
    osc.start();
    osc.stop(time + 0.12);
  }

  // 10. Web Audio 기반 사이버펑크 앰비언스 BGM 생성기 (간단한 드럼 & 아르페지오 신시사이저 루프)
  public startBGM(speedMultiplier: number = 1.0) {
    this.initCtx();
    this.isBgmPlaying = true;
    if (this.bgmIntervalId) {
      clearInterval(this.bgmIntervalId);
    }

    const intervalTime = Math.max(120, 250 - speedMultiplier * 2.5); // 레벨에 따라 템포 증가

    this.bgmIntervalId = window.setInterval(() => {
      if (!this.ctx || this.isMuted || !this.isBgmPlaying) return;

      const time = this.ctx.currentTime;
      const step = this.currentBgmStep % 16;
      
      // 1. 네온 킥 드럼 (4박자 마다 어택감 제공)
      if (step % 4 === 0) {
        const kickOsc = this.ctx.createOscillator();
        const kickGain = this.ctx.createGain();
        kickOsc.type = 'sine';
        kickOsc.frequency.setValueAtTime(100, time);
        kickOsc.frequency.exponentialRampToValueAtTime(0.01, time + 0.15);
        kickGain.gain.setValueAtTime(0.12, time);
        kickGain.gain.linearRampToValueAtTime(0.001, time + 0.15);
        kickOsc.connect(kickGain);
        kickGain.connect(this.bgmVolumeNode!);
        kickOsc.start();
        kickOsc.stop(time + 0.15);
      }

      // 2. 일렉트로닉 네온 베이스 라인 (사이버 아그레시브 펜타토닉)
      const pentatonic = [55, 65.41, 73.42, 82.41, 98]; // A1, C2, D2, E2, G2
      const noteToPlay = pentatonic[step % pentatonic.length];
      
      // 퐁당퐁당하는 오프비트 신스 베이스
      if (step % 2 === 1) {
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = 'triangle';
        bassOsc.frequency.setValueAtTime(noteToPlay, time);
        bassGain.gain.setValueAtTime(0.08, time);
        bassGain.gain.linearRampToValueAtTime(0.001, time + 0.18);
        bassOsc.connect(bassGain);
        bassGain.connect(this.bgmVolumeNode!);
        bassOsc.start();
        bassOsc.stop(time + 0.18);
      }

      // 3. 스타라이트 하이햇 사운드 (경쾌한 비트)
      if (step % 4 === 2) {
        const hhOsc = this.ctx.createOscillator();
        const hhGain = this.ctx.createGain();
        hhOsc.type = 'triangle';
        hhOsc.frequency.setValueAtTime(5000, time);
        hhGain.gain.setValueAtTime(0.01, time);
        hhGain.gain.linearRampToValueAtTime(0.001, time + 0.05);
        hhOsc.connect(hhGain);
        hhGain.connect(this.bgmVolumeNode!);
        hhOsc.start();
        hhOsc.stop(time + 0.05);
      }

      this.currentBgmStep++;
    }, intervalTime);
  }

  public stopBGM() {
    this.isBgmPlaying = false;
    if (this.bgmIntervalId) {
      clearInterval(this.bgmIntervalId);
      this.bgmIntervalId = null;
    }
  }
}

// 싱글톤
export const audio = new AudioEngine();
