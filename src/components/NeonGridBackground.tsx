/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';

interface NeonGridBackgroundProps {
  isGameOver: boolean;
  clearIntensity: number; // 0.0 ~ 1.0 (라인 클리어 시 번쩍이는 충격 폭발 반향)
}

export const NeonGridBackground: React.FC<NeonGridBackgroundProps> = ({ isGameOver, clearIntensity }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // 격자선 이동 변위
    let gridOffset = 0;
    
    // 입자 상태 관리
    const particles: Array<{
      x: number;
      y: number;
      size: number;
      speedY: number;
      color: string;
      alpha: number;
    }> = [];

    // 초기 파티클 생성
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2 + 1,
        speedY: Math.random() * 0.8 + 0.2,
        color: i % 2 === 0 ? 'rgba(0, 240, 240, ' : 'rgba(240, 0, 240, ', // 시안 & 마젠타
        alpha: Math.random() * 0.5 + 0.20
      });
    }

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        width = canvas.width = entry.contentRect.width || window.innerWidth;
        height = canvas.height = entry.contentRect.height || window.innerHeight;
      }
    });
    
    resizeObserver.observe(canvas.parentElement || document.body);

    // 렌더링 루프
    const render = () => {
      // 1. 깊은 사이버 퍼플/블랙 그라데이션 클리어
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      
      // 라인 삭제 강도가 높을 때 일시적으로 번쩍이는 효과를 적용하기 위해 블랙의 끝점을 사이버스펙트럼으로 올림
      const flashColor = Math.floor(clearIntensity * 30);
      const hexFlash = flashColor.toString(16).padStart(2, '0');
      
      gradient.addColorStop(0, '#060212');
      gradient.addColorStop(0.5, '#0a0524');
      gradient.addColorStop(1, isGameOver ? '#1a0505' : `#03010b`);
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // 격자 속도 조정
      gridOffset += isGameOver ? 0.2 : 1.2;
      if (gridOffset >= 60) gridOffset = 0;

      // 2. 투시(사선) 네온 그리드 그리기 (마치 레이싱 로드 같은 원근법 3D 그리드)
      ctx.lineWidth = 1.5;
      
      if (isGameOver) {
        ctx.strokeStyle = `rgba(240, 50, 50, ${0.15 + clearIntensity * 0.4})`;
      } else {
        ctx.strokeStyle = `rgba(0, 240, 240, ${0.12 + clearIntensity * 0.5})`;
      }

      // 수평 격자선 그리기 (원근에 따라 촘촘함 수치 차등)
      const horizontalLineCount = 18;
      for (let i = 0; i < horizontalLineCount; i++) {
        const py = height * 0.4 + Math.pow(i / horizontalLineCount, 2.5) * height * 0.6 + gridOffset * (i / horizontalLineCount);
        if (py <= height) {
          ctx.beginPath();
          ctx.moveTo(0, py);
          ctx.lineTo(width, py);
          ctx.stroke();
        }
      }

      // 수직(방사성) 소실점 격자선 그리기. 원근감 소실점: (width / 2, height * 0.35)
      const vanishingX = width / 2;
      const vanishingY = height * 0.35;
      const perspectiveLines = 24;

      for (let i = -perspectiveLines; i <= perspectiveLines; i++) {
        // 하단 끝점 계산
        const endX = width / 2 + (i * (width / perspectiveLines) * 2.5);
        ctx.beginPath();
        ctx.moveTo(vanishingX + (i * 4), vanishingY);
        ctx.lineTo(endX, height);
        ctx.stroke();
      }

      // 소실점 근처 사이버 안개 구현
      const radialFog = ctx.createRadialGradient(vanishingX, vanishingY, 2, vanishingX, vanishingY, height * 0.5);
      radialFog.addColorStop(0, 'rgba(20, 4, 44, 0.95)');
      radialFog.addColorStop(0.3, 'rgba(10, 5, 36, 0.6)');
      radialFog.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = radialFog;
      ctx.fillRect(0, 0, width, height);

      // 수평 레이저 가이드 선 (중간 네온선)
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(240, 0, 245, 0.45)';
      ctx.lineWidth = 2.5;
      ctx.moveTo(0, vanishingY + 10);
      ctx.lineTo(width, vanishingY + 10);
      ctx.stroke();

      // 3. 네온 유성 파티클 그리기
      particles.forEach((p) => {
        p.y += p.speedY * (isGameOver ? 0.3 : 1.5) + (clearIntensity * 5);
        if (p.y > height) {
          p.y = 0;
          p.x = Math.random() * width;
        }

        ctx.fillStyle = `${p.color}${p.alpha + clearIntensity * 0.3})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size + clearIntensity * 2, 0, Math.PI * 2);
        ctx.fill();

        // 은은한 네온 가로 빛 꼬리 그리기 (사이버펑크 스피드글로우)
        if (Math.random() > 0.85) {
          ctx.strokeStyle = 'rgba(0, 240, 240, 0.2)';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(p.x - 20, p.y);
          ctx.lineTo(p.x + 20, p.y);
          ctx.stroke();
        }
      });

      // 비트 충격 비쥬얼 블룸 (Line Clear Intensity 충격파)
      if (clearIntensity > 0) {
        ctx.fillStyle = `rgba(0, 240, 255, ${clearIntensity * 0.08})`;
        ctx.fillRect(0, 0, width, height);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }, [isGameOver, clearIntensity]);

  return (
    <canvas
      ref={canvasRef}
      id="neon_grid_backdrop"
      className="absolute top-0 left-0 w-full h-full block z-0 pointer-events-none"
    />
  );
};

export default NeonGridBackground;
