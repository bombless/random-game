export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  rotation: number;
  vRot: number;
  type: 'leaf' | 'petal' | 'dust' | 'ink_splash' | 'spark' | 'sword_arc';
}

export class ParticleSystem {
  public particles: Particle[] = [];

  constructor() {}

  public update(dt: number, scrollSpeed: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }

      p.x += (p.vx - scrollSpeed) * dt;
      p.y += p.vy * dt;
      p.rotation += p.vRot * dt;

      // 自然落叶飘荡效果
      if (p.type === 'leaf' || p.type === 'petal') {
        p.vx += Math.sin(p.life * 3) * 15 * dt;
        p.vy += Math.cos(p.life * 2) * 5 * dt;
      }

      // 墨滴与火花衰减
      if (p.type === 'ink_splash' || p.type === 'spark') {
        p.vx *= 0.95;
        p.vy += 400 * dt; // 重力
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D) {
    ctx.save();
    for (const p of this.particles) {
      const progress = p.life / p.maxLife;
      const currentAlpha = p.alpha * (1 - progress);
      if (currentAlpha <= 0) continue;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = Math.max(0, Math.min(1, currentAlpha));

      if (p.type === 'leaf') {
        // 竹叶剪影
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 2, p.size * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'petal') {
        // 桃花花瓣
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(0, -p.size);
        ctx.quadraticCurveTo(p.size, -p.size * 0.3, 0, p.size);
        ctx.quadraticCurveTo(-p.size, -p.size * 0.3, 0, -p.size);
        ctx.fill();
      } else if (p.type === 'dust') {
        // 奔跑扬尘
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.size * (1 + progress * 0.5), 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'ink_splash') {
        // 水墨飞溅圆形墨点
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'spark') {
        // 金铁火花
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-p.size, 0);
        ctx.lineTo(p.size, 0);
        ctx.stroke();
      }

      ctx.restore();
    }
    ctx.restore();
  }

  // 生成飞落竹叶/花瓣
  public spawnAmbientLeaves(width: number, _height: number, count = 2) {
    for (let i = 0; i < count; i++) {
      const isPetal = Math.random() > 0.6;
      this.particles.push({
        x: Math.random() * (width + 200),
        y: -20,
        vx: -60 - Math.random() * 80,
        vy: 40 + Math.random() * 60,
        size: isPetal ? 3 + Math.random() * 3 : 4 + Math.random() * 4,
        color: isPetal ? '#ea9999' : '#334433',
        alpha: 0.4 + Math.random() * 0.4,
        life: 0,
        maxLife: 8 + Math.random() * 5,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 4,
        type: isPetal ? 'petal' : 'leaf'
      });
    }
  }

  // 跑步扬尘
  public spawnDust(x: number, y: number) {
    for (let i = 0; i < 2; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y - 2,
        vx: -50 - Math.random() * 60,
        vy: -15 - Math.random() * 30,
        size: 3 + Math.random() * 4,
        color: '#8b7d72',
        alpha: 0.35,
        life: 0,
        maxLife: 0.35 + Math.random() * 0.2,
        rotation: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 3,
        type: 'dust'
      });
    }
  }

  // 水墨喷溅
  public spawnInkSplash(x: number, y: number, count = 12) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 120 + Math.random() * 260;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2.5 + Math.random() * 5,
        color: '#111111',
        alpha: 0.85,
        life: 0,
        maxLife: 0.45 + Math.random() * 0.3,
        rotation: 0,
        vRot: 0,
        type: 'ink_splash'
      });
    }
  }

  // 刀剑火花碰撞
  public spawnSparks(x: number, y: number, count = 8) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.random() - 0.5) * Math.PI * 1.5;
      const speed = 180 + Math.random() * 250;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 5,
        color: '#ffcc44',
        alpha: 1.0,
        life: 0,
        maxLife: 0.2 + Math.random() * 0.15,
        rotation: angle,
        vRot: 0,
        type: 'spark'
      });
    }
  }
}
