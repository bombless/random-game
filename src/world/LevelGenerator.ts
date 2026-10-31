export interface Platform {
  x: number;
  y: number;
  w: number;
  h: number;
  type: 'ground' | 'bridge' | 'roof';
}

export interface Obstacle {
  x: number;
  y: number;
  w: number;
  h: number;
  type: 'spikes' | 'barrier' | 'pendulum' | 'sawblade';
  active: boolean;
  angle?: number;
  swingSpeed?: number;
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  type: 'arrow' | 'shuriken';
  reflected?: boolean;
}

export interface Enemy {
  x: number;
  y: number;
  w: number;
  h: number;
  type: 'archer' | 'ninja';
  alive: boolean;
  attackCooldown: number;
}

export interface Collectible {
  x: number;
  y: number;
  size: number;
  type: 'coin' | 'jade';
  collected: boolean;
}

export class LevelGenerator {
  public platforms: Platform[] = [];
  public obstacles: Obstacle[] = [];
  public enemies: Enemy[] = [];
  public projectiles: Projectile[] = [];
  public collectibles: Collectible[] = [];

  private nextSpawnX = 0;
  private canvasWidth = 0;
  private canvasHeight = 0;

  constructor() {}

  public init(w: number, h: number) {
    this.canvasWidth = w;
    this.canvasHeight = h;
    this.platforms = [];
    this.obstacles = [];
    this.enemies = [];
    this.projectiles = [];
    this.collectibles = [];

    // 初始平坦安全跑道
    const groundY = h * 0.75;
    this.platforms.push({
      x: 0,
      y: groundY,
      w: w + 500,
      h: h - groundY,
      type: 'ground'
    });
    this.nextSpawnX = w + 500;
  }

  public update(dt: number, scrollSpeed: number, heroX: number) {
    // 1. 移动所有物件 (左移)
    const dx = scrollSpeed * dt;

    for (const p of this.platforms) p.x -= dx;
    for (const o of this.obstacles) {
      o.x -= dx;
      if (o.type === 'pendulum') {
        o.angle = (o.angle || 0) + (o.swingSpeed || 3) * dt;
      }
    }
    for (const e of this.enemies) {
      e.x -= dx;
      if (e.alive) {
        e.attackCooldown -= dt;
        // 在一定距离内触发射击
        if (e.attackCooldown <= 0 && e.x > heroX + 50 && e.x < heroX + 650) {
          e.attackCooldown = 2.2 + Math.random() * 0.8;
          if (e.type === 'archer') {
            this.projectiles.push({
              x: e.x,
              y: e.y + 16,
              vx: -380,
              vy: 0,
              radius: 4,
              type: 'arrow'
            });
          } else {
            this.projectiles.push({
              x: e.x,
              y: e.y + 14,
              vx: -320,
              vy: (Math.random() - 0.5) * 40,
              radius: 6,
              type: 'shuriken'
            });
          }
        }
      }
    }

    for (const c of this.collectibles) c.x -= dx;

    // 更新飞矢弹道
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;
      if (proj.x < -100 || proj.x > this.canvasWidth + 200) {
        this.projectiles.splice(i, 1);
      }
    }

    // 2. 清理屏幕左侧不可见实体
    this.platforms = this.platforms.filter((p) => p.x + p.w > -200);
    this.obstacles = this.obstacles.filter((o) => o.x + o.w > -200);
    this.enemies = this.enemies.filter((e) => e.x + e.w > -200);
    this.collectibles = this.collectibles.filter((c) => c.x + c.size > -100);

    // 3. 动态生成前方地形
    this.nextSpawnX -= dx;
    if (this.nextSpawnX < this.canvasWidth + 600) {
      this.generateChunk();
    }
  }

  private generateChunk() {
    const groundY = this.canvasHeight * 0.75;
    const chunkWidth = 700 + Math.random() * 400;
    const gap = Math.random() > 0.4 ? 120 + Math.random() * 90 : 0; // 地面悬空断崖

    const platX = this.nextSpawnX + gap;
    this.platforms.push({
      x: platX,
      y: groundY,
      w: chunkWidth,
      h: this.canvasHeight - groundY,
      type: 'ground'
    });

    // 随机悬空平台/屋檐 (供跳跃攀登)
    if (Math.random() > 0.4) {
      const elevatedY = groundY - 110 - Math.random() * 60;
      const elevatedW = 180 + Math.random() * 140;
      this.platforms.push({
        x: platX + 160,
        y: elevatedY,
        w: elevatedW,
        h: 22,
        type: Math.random() > 0.5 ? 'roof' : 'bridge'
      });

      // 屋檐上生成敌方弓箭手
      if (Math.random() > 0.4) {
        this.enemies.push({
          x: platX + 220,
          y: elevatedY - 54,
          w: 36,
          h: 54,
          type: 'archer',
          alive: true,
          attackCooldown: 1.0 + Math.random() * 1.5
        });
      }
    }

    // 地面障碍物生成 (地刺 / 竹栅栏 / 飞轮 / 摆锤)
    const obstacleRand = Math.random();
    if (obstacleRand < 0.28) {
      // 地刺
      this.obstacles.push({
        x: platX + 250,
        y: groundY - 26,
        w: 64,
        h: 26,
        type: 'spikes',
        active: true
      });
    } else if (obstacleRand < 0.55) {
      // 可斩碎竹桩栅栏
      this.obstacles.push({
        x: platX + 320,
        y: groundY - 60,
        w: 32,
        h: 60,
        type: 'barrier',
        active: true
      });
    } else if (obstacleRand < 0.78) {
      // 低矮旋转齿轮 (需滑铲避开)
      this.obstacles.push({
        x: platX + 280,
        y: groundY - 48,
        w: 42,
        h: 48,
        type: 'sawblade',
        active: true
      });
    } else {
      // 摆动弦月镰刀
      this.obstacles.push({
        x: platX + 350,
        y: groundY - 140,
        w: 60,
        h: 120,
        type: 'pendulum',
        active: true,
        angle: 0,
        swingSpeed: 2.8 + Math.random() * 1.5
      });
    }

    // 生成收集品 (铜钱 & 翡翠灵玉)
    const coinCount = 3 + Math.floor(Math.random() * 4);
    for (let c = 0; c < coinCount; c++) {
      this.collectibles.push({
        x: platX + 100 + c * 40,
        y: groundY - 45 - Math.sin((c / coinCount) * Math.PI) * 50,
        size: 14,
        type: Math.random() > 0.85 ? 'jade' : 'coin',
        collected: false
      });
    }

    this.nextSpawnX = platX + chunkWidth;
  }

  public render(ctx: CanvasRenderingContext2D) {
    // 1. 渲染平台地面
    for (const p of this.platforms) {
      ctx.save();
      if (p.type === 'ground') {
        // 水墨厚土平台
        const grad = ctx.createLinearGradient(0, p.y, 0, p.y + p.h);
        grad.addColorStop(0, '#151110');
        grad.addColorStop(1, '#0d0a09');
        ctx.fillStyle = grad;
        ctx.fillRect(p.x, p.y, p.w, p.h);

        // 顶面草苔墨点
        ctx.strokeStyle = '#2d2420';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.w, p.y);
        ctx.stroke();

        ctx.fillStyle = '#221a17';
        for (let gx = p.x; gx < p.x + p.w; gx += 40) {
          ctx.beginPath();
          ctx.moveTo(gx, p.y);
          ctx.lineTo(gx + 4, p.y - 6);
          ctx.lineTo(gx + 8, p.y);
          ctx.fill();
        }
      } else if (p.type === 'roof') {
        // 古风屋檐平台
        ctx.fillStyle = '#1e1815';
        ctx.fillRect(p.x, p.y, p.w, p.h);
        // 翘角两端
        ctx.beginPath();
        ctx.moveTo(p.x - 10, p.y - 6);
        ctx.lineTo(p.x + 8, p.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(p.x + p.w + 10, p.y - 6);
        ctx.lineTo(p.x + p.w - 8, p.y);
        ctx.stroke();
      } else {
        // 竹木悬桥
        ctx.fillStyle = '#281e18';
        ctx.fillRect(p.x, p.y, p.w, p.h);
      }
      ctx.restore();
    }

    // 2. 渲染障碍陷阱
    for (const o of this.obstacles) {
      if (!o.active) continue;
      ctx.save();
      if (o.type === 'spikes') {
        ctx.fillStyle = '#110d0c';
        const numSpikes = Math.floor(o.w / 14);
        for (let s = 0; s < numSpikes; s++) {
          const sx = o.x + s * 14;
          ctx.beginPath();
          ctx.moveTo(sx, o.y + o.h);
          ctx.lineTo(sx + 7, o.y);
          ctx.lineTo(sx + 14, o.y + o.h);
          ctx.fill();
        }
      } else if (o.type === 'barrier') {
        // 粗竹桩屏障
        ctx.fillStyle = '#3a2d26';
        ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.strokeStyle = '#181210';
        ctx.lineWidth = 2;
        ctx.strokeRect(o.x, o.y, o.w, o.h);
        // 绑绳
        ctx.strokeStyle = '#b25d25';
        ctx.beginPath();
        ctx.moveTo(o.x, o.y + 15);
        ctx.lineTo(o.x + o.w, o.y + 25);
        ctx.moveTo(o.x, o.y + 40);
        ctx.lineTo(o.x + o.w, o.y + 50);
        ctx.stroke();
      } else if (o.type === 'sawblade') {
        // 贴地飞轮
        const cx = o.x + o.w / 2;
        const cy = o.y + o.h / 2;
        ctx.translate(cx, cy);
        ctx.rotate(Date.now() * 0.01);
        ctx.fillStyle = '#4a3d36';
        ctx.beginPath();
        ctx.arc(0, 0, o.w / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#151110';
        ctx.beginPath();
        ctx.arc(0, 0, o.w / 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (o.type === 'pendulum') {
        // 摆动大镰刀
        const pivotX = o.x + o.w / 2;
        const pivotY = o.y;
        const ang = Math.sin(o.angle || 0) * 0.9;
        ctx.translate(pivotX, pivotY);
        ctx.rotate(ang);
        ctx.strokeStyle = '#2b211d';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, o.h);
        ctx.stroke();
        // 弧刃
        ctx.fillStyle = '#6d5a4f';
        ctx.beginPath();
        ctx.arc(0, o.h, 28, 0, Math.PI);
        ctx.fill();
      }
      ctx.restore();
    }

    // 3. 渲染敌人
    for (const e of this.enemies) {
      if (!e.alive) continue;
      ctx.save();
      ctx.translate(e.x + e.w / 2, e.y + e.h / 2);
      ctx.fillStyle = '#181412';

      // 敌方刺客身姿剪影
      ctx.lineWidth = 10;
      ctx.strokeStyle = '#181412';
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(0, 10);
      ctx.stroke();

      // 敌方斗笠蒙面
      ctx.beginPath();
      ctx.ellipse(0, -18, 16, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // 双眼红光微露
      ctx.fillStyle = '#ff3333';
      ctx.beginPath();
      ctx.arc(-4, -16, 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // 4. 渲染投掷物 (飞矢 / 苦无飞镖)
    for (const p of this.projectiles) {
      ctx.save();
      ctx.translate(p.x, p.y);
      if (p.type === 'arrow') {
        ctx.strokeStyle = p.reflected ? '#5dade2' : '#cca47a';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(14, 0);
        ctx.lineTo(-14, 0);
        ctx.stroke();
        // 箭头与羽翎
        ctx.fillStyle = p.reflected ? '#5dade2' : '#cca47a';
        ctx.beginPath();
        ctx.moveTo(-14, 0);
        ctx.lineTo(-6, -4);
        ctx.lineTo(-6, 4);
        ctx.fill();
      } else {
        // 旋转飞镖
        ctx.rotate(Date.now() * 0.02);
        ctx.fillStyle = p.reflected ? '#5dade2' : '#777777';
        for (let i = 0; i < 4; i++) {
          ctx.rotate(Math.PI / 2);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-4, -10);
          ctx.lineTo(0, -14);
          ctx.lineTo(4, -10);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    // 5. 渲染收集品
    for (const c of this.collectibles) {
      if (c.collected) continue;
      ctx.save();
      ctx.translate(c.x, c.y);

      if (c.type === 'coin') {
        // 方孔金铜钱
        const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 16);
        glow.addColorStop(0, 'rgba(255, 204, 51, 0.9)');
        glow.addColorStop(1, 'rgba(255, 180, 0, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffd54f';
        ctx.beginPath();
        ctx.arc(0, 0, c.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#1c1512';
        ctx.fillRect(-3, -3, 6, 6);
      } else {
        // 翠绿灵玉
        const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 18);
        glow.addColorStop(0, 'rgba(80, 240, 160, 0.9)');
        glow.addColorStop(1, 'rgba(40, 200, 120, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#52e0a2';
        ctx.beginPath();
        ctx.moveTo(0, -c.size);
        ctx.lineTo(c.size * 0.8, 0);
        ctx.lineTo(0, c.size);
        ctx.lineTo(-c.size * 0.8, 0);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    }
  }
}
