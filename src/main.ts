import './style.css';
import { Hero } from './entities/Hero';
import { InkBackground } from './graphics/InkBackground';
import { ParticleSystem } from './graphics/ParticleSystem';
import { LevelGenerator } from './world/LevelGenerator';
import { SoundSynthesizer } from './audio/SoundSynthesizer';
import { InputManager } from './core/InputManager';

class GameApp {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private hero: Hero;
  private background: InkBackground;
  private particles: ParticleSystem;
  private level: LevelGenerator;
  private sound: SoundSynthesizer;
  private input: InputManager;

  private isRunning = false;
  private isGameOver = false;

  private scrollSpeed = 380; // 奔跑速度 (像素/秒)
  private distance = 0;
  private score = 0;
  private jadeCount = 0;
  private combo = 0;
  private maxCombo = 0;
  private comboResetTimer = 0;
  private health = 100;

  private screenShake = 0;
  private lastTime = 0;

  // DOM 元素引用
  private healthFillEl = document.getElementById('health-bar-fill')!;
  private distanceEl = document.getElementById('distance-val')!;
  private scoreEl = document.getElementById('score-val')!;
  private jadeEl = document.getElementById('jade-val')!;
  private comboEl = document.getElementById('combo-display')!;
  private startOverlay = document.getElementById('start-overlay')!;
  private gameoverOverlay = document.getElementById('gameover-overlay')!;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;

    this.background = new InkBackground();
    this.particles = new ParticleSystem();
    this.level = new LevelGenerator();
    this.sound = new SoundSynthesizer();
    this.input = new InputManager();

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    this.hero = new Hero(this.canvas.width * 0.18, this.canvas.height * 0.75);

    this.setupInputs();
    this.bindUI();

    requestAnimationFrame((t) => this.loop(t));
  }

  private resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.background.resize(this.canvas.width, this.canvas.height);
  }

  private setupInputs() {
    this.input.setCallbacks({
      onJump: () => {
        if (!this.isRunning || this.isGameOver) return;
        if (this.hero.jump()) {
          this.sound.playJump();
          this.particles.spawnDust(this.hero.x + 10, this.hero.y + this.hero.height);
        }
      },
      onSlide: () => {
        if (!this.isRunning || this.isGameOver) return;
        this.hero.slide();
        this.particles.spawnDust(this.hero.x + 20, this.hero.y + 30);
      },
      onSlash: () => {
        if (!this.isRunning || this.isGameOver) return;
        if (this.hero.slash()) {
          this.sound.playSlash();
          this.checkSlashCollisions();
        }
      },
      onDash: () => {
        if (!this.isRunning || this.isGameOver) return;
        if (this.hero.dash()) {
          this.sound.playDash();
          this.particles.spawnInkSplash(this.hero.x, this.hero.y + 30, 8);
        }
      }
    });
  }

  private bindUI() {
    document.getElementById('btn-start')?.addEventListener('click', () => {
      this.startGame();
    });

    document.getElementById('btn-restart')?.addEventListener('click', () => {
      this.restartGame();
    });
  }

  private startGame() {
    this.startOverlay.classList.add('hidden');
    this.gameoverOverlay.classList.add('hidden');
    this.isRunning = true;
    this.isGameOver = false;

    this.distance = 0;
    this.score = 0;
    this.jadeCount = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.health = 100;
    this.scrollSpeed = 380;

    this.level.init(this.canvas.width, this.canvas.height);
    this.hero = new Hero(this.canvas.width * 0.18, this.canvas.height * 0.75);
    this.updateHUD();
  }

  private restartGame() {
    this.startGame();
  }

  private loop(timestamp: number) {
    if (!this.lastTime) this.lastTime = timestamp;
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05); // 防止大跳帧
    this.lastTime = timestamp;

    if (this.isRunning && !this.isGameOver) {
      this.update(dt);
    }

    this.render();
    requestAnimationFrame((t) => this.loop(t));
  }

  private update(dt: number) {
    // 渐进加速提升刺激感
    this.scrollSpeed += dt * 3.5;
    if (this.scrollSpeed > 750) this.scrollSpeed = 750;

    this.distance += (this.scrollSpeed * dt) / 30;
    this.score += Math.round(dt * 20);

    // 连斩倒计时衰减
    if (this.combo > 0) {
      this.comboResetTimer -= dt;
      if (this.comboResetTimer <= 0) {
        this.combo = 0;
        this.comboEl.classList.add('hidden');
      }
    }

    // 屏幕震动衰减
    if (this.screenShake > 0) {
      this.screenShake -= dt * 25;
      if (this.screenShake < 0) this.screenShake = 0;
    }

    // 各子系统物理与动画更新
    this.background.update(dt, this.scrollSpeed);
    this.hero.update(dt);
    this.level.update(dt, this.scrollSpeed, this.hero.x);
    this.particles.update(dt, this.scrollSpeed);

    // 飘落环境竹叶/花瓣
    if (Math.random() < 0.25) {
      this.particles.spawnAmbientLeaves(this.canvas.width, this.canvas.height, 1);
    }
    // 奔跑扬尘
    if (this.hero.isGrounded && Math.random() < 0.4) {
      this.particles.spawnDust(this.hero.x, this.hero.y + this.hero.height);
    }

    // 地形与碰撞检测
    this.checkPlatformCollisions();
    this.checkObstacleAndEnemyCollisions();

    // 掉落深渊判断
    if (this.hero.y > this.canvas.height + 60) {
      this.takeDamage(100);
    }

    this.updateHUD();
  }

  private checkPlatformCollisions() {
    let onAnyPlatform = false;
    const heroBox = this.hero.getBoundingBox();
    const heroBottom = heroBox.y + heroBox.h;
    const heroFeetX = this.hero.x + this.hero.width / 2;

    for (const plat of this.level.platforms) {
      if (heroFeetX >= plat.x && heroFeetX <= plat.x + plat.w) {
        // 下落穿透检测
        if (heroBottom >= plat.y && heroBottom <= plat.y + 24 && this.hero.vy >= 0) {
          this.hero.land(plat.y);
          onAnyPlatform = true;
          break;
        }
      }
    }

    if (!onAnyPlatform && this.hero.isGrounded) {
      this.hero.isGrounded = false;
    }
  }

  private checkSlashCollisions() {
    const slashBox = this.hero.getSlashHitbox();
    if (!slashBox) return;

    // 1. 斩碎阻碍
    for (const obs of this.level.obstacles) {
      if (!obs.active) continue;
      if (obs.type === 'barrier') {
        if (this.boxIntersect(slashBox, { x: obs.x, y: obs.y, w: obs.w, h: obs.h })) {
          obs.active = false;
          this.sound.playHit();
          this.particles.spawnInkSplash(obs.x + obs.w / 2, obs.y + obs.h / 2, 20);
          this.addCombo(obs.x, obs.y);
          this.screenShake = 6;
        }
      }
    }

    // 2. 劈斩反弹飞矢 / 苦无
    for (const proj of this.level.projectiles) {
      if (!proj.reflected && this.boxIntersect(slashBox, { x: proj.x - proj.radius, y: proj.y - proj.radius, w: proj.radius * 2, h: proj.radius * 2 })) {
        proj.reflected = true;
        proj.vx = -proj.vx * 1.5;
        this.sound.playHit();
        this.particles.spawnSparks(proj.x, proj.y, 10);
        this.addCombo(proj.x, proj.y);
      }
    }

    // 3. 击倒敌方刺客
    for (const enemy of this.level.enemies) {
      if (enemy.alive && this.boxIntersect(slashBox, { x: enemy.x, y: enemy.y, w: enemy.w, h: enemy.h })) {
        enemy.alive = false;
        this.sound.playHit();
        this.particles.spawnInkSplash(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, 25);
        this.addCombo(enemy.x, enemy.y);
        this.screenShake = 8;
      }
    }
  }

  private checkObstacleAndEnemyCollisions() {
    const heroBox = this.hero.getBoundingBox();

    // 1. 障碍陷阱
    for (const obs of this.level.obstacles) {
      if (!obs.active) continue;

      if (obs.type === 'sawblade') {
        // 低矮飞轮：滑铲时可穿行避开
        if (this.hero.isSliding) continue;
      }

      const obsBox = { x: obs.x, y: obs.y, w: obs.w, h: obs.h };
      if (this.boxIntersect(heroBox, obsBox)) {
        if (this.hero.isInvulnerable) {
          // 突进无敌直接撞碎
          obs.active = false;
          this.particles.spawnInkSplash(obs.x + obs.w / 2, obs.y + obs.h / 2, 14);
          this.sound.playHit();
        } else {
          this.takeDamage(25);
          obs.active = false;
          break;
        }
      }
    }

    // 2. 飞矢与投掷物
    for (let i = this.level.projectiles.length - 1; i >= 0; i--) {
      const proj = this.level.projectiles[i];
      if (proj.reflected) continue; // 已反弹的不再伤害自己
      const pBox = { x: proj.x - proj.radius, y: proj.y - proj.radius, w: proj.radius * 2, h: proj.radius * 2 };
      if (this.boxIntersect(heroBox, pBox)) {
        if (!this.hero.isInvulnerable) {
          this.takeDamage(15);
        }
        this.level.projectiles.splice(i, 1);
        break;
      }
    }

    // 3. 收集品 (金币 / 翡翠灵玉)
    for (const item of this.level.collectibles) {
      if (item.collected) continue;
      const cBox = { x: item.x - item.size, y: item.y - item.size, w: item.size * 2, h: item.size * 2 };
      if (this.boxIntersect(heroBox, cBox)) {
        item.collected = true;
        this.sound.playCollect();
        if (item.type === 'coin') {
          this.score += 50;
        } else {
          this.jadeCount += 1;
          this.score += 200;
          // 灵玉回复少许气血
          this.health = Math.min(100, this.health + 8);
        }
      }
    }
  }

  private boxIntersect(
    a: { x: number; y: number; w: number; h: number },
    b: { x: number; y: number; w: number; h: number }
  ): boolean {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }

  private addCombo(x: number, y: number) {
    this.combo++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    this.comboResetTimer = 2.8;
    this.score += this.combo * 50;

    this.comboEl.textContent = `${this.combo}连斩!`;
    this.comboEl.classList.remove('hidden');
    this.comboEl.classList.add('pulse');
    setTimeout(() => this.comboEl.classList.remove('pulse'), 150);

    this.particles.spawnSparks(x, y, 6);
  }

  private takeDamage(amount: number) {
    if (this.hero.isInvulnerable) return;

    this.health -= amount;
    this.hero.isInvulnerable = true;
    this.hero.invulnerableTimer = 1.0; // 1秒无敌闪烁
    this.screenShake = 14;

    this.particles.spawnInkSplash(this.hero.x + 20, this.hero.y + 30, 20);
    this.sound.playHit();

    if (this.health <= 0) {
      this.health = 0;
      this.gameOver();
    }
  }

  private gameOver() {
    this.isGameOver = true;
    this.isRunning = false;
    this.sound.playGameOver();

    // 显示力竭结算弹窗
    document.getElementById('final-dist')!.textContent = Math.floor(this.distance).toString();
    document.getElementById('final-score')!.textContent = this.score.toString();
    document.getElementById('final-jade')!.textContent = this.jadeCount.toString();
    document.getElementById('final-combo')!.textContent = this.maxCombo.toString();

    this.gameoverOverlay.classList.remove('hidden');
  }

  private updateHUD() {
    this.healthFillEl.style.width = `${this.health}%`;
    this.distanceEl.textContent = Math.floor(this.distance).toString();
    this.scoreEl.textContent = this.score.toString();
    this.jadeEl.textContent = this.jadeCount.toString();
  }

  private render() {
    this.ctx.save();

    // 震屏位移
    if (this.screenShake > 0) {
      const shakeX = (Math.random() - 0.5) * this.screenShake;
      const shakeY = (Math.random() - 0.5) * this.screenShake;
      this.ctx.translate(shakeX, shakeY);
    }

    // 1. 视差水墨山水背景
    this.background.render(this.ctx);

    // 2. 跑酷地形、敌人、障碍物与收集品
    this.level.render(this.ctx);

    // 3. 主角武侠剪影、飘带与剑气
    this.hero.render(this.ctx);

    // 4. 水墨与火花粒子系统
    this.particles.render(this.ctx);

    this.ctx.restore();
  }
}

// 启动游戏实例
window.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});
