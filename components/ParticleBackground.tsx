
import React, { useEffect, useRef } from 'react';
import { ParticleType } from '../types';

interface ParticleBackgroundProps {
  type: ParticleType;
  color: string;
}

const ParticleBackground: React.FC<ParticleBackgroundProps> = ({ type, color }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (type === ParticleType.NONE || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: any[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    class Particle {
      x: number = 0;
      y: number = 0;
      size: number = 0;
      speedX: number = 0;
      speedY: number = 0;
      life: number = 0;
      opacity: number = 0;

      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * canvas.width;
        this.y = type === ParticleType.RAIN || type === ParticleType.SNOW ? -10 : Math.random() * canvas.height;
        this.size = Math.random() * 3 + 1;
        this.speedX = Math.random() * 2 - 1;
        this.speedY = type === ParticleType.RAIN ? Math.random() * 5 + 5 : type === ParticleType.SNOW ? Math.random() * 1 + 0.5 : Math.random() * 1 - 0.5;
        this.life = Math.random() * 100 + 100;
        this.opacity = Math.random() * 0.5 + 0.1;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.y > canvas.height || this.x > canvas.width || this.x < 0) {
          this.reset();
        }
      }

      draw() {
        if (!ctx) return;
        ctx.fillStyle = color;
        ctx.globalAlpha = this.opacity;
        
        if (type === ParticleType.DIGITAL) {
          ctx.font = '10px monospace';
          ctx.fillText(Math.round(Math.random()).toString(), this.x, this.y);
        } else if (type === ParticleType.RAIN) {
          ctx.fillRect(this.x, this.y, 1, 15);
        } else {
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    const init = () => {
      resize();
      particles = [];
      const count = Math.min(Math.floor((canvas.width * canvas.height) / 15000), 100);
      for (let i = 0; i < count; i++) {
        particles.push(new Particle());
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.update();
        p.draw();
      });
      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resize);
    init();
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [type, color]);

  if (type === ParticleType.NONE) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ filter: 'blur(1px)' }}
    />
  );
};

export default ParticleBackground;
