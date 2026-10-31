export interface RibbonPoint {
  x: number;
  y: number;
  oldX: number;
  oldY: number;
}

export interface ShadowGhost {
  x: number;
  y: number;
  alpha: number;
  state: 'run' | 'jump' | 'double_jump' | 'slide' | 'slash' | 'dash';
  rotation: number;
  ribbon: { x: number; y: number }[];
}

export class Hero {
  public x = 180;
  public y = 0;
  public vx = 0;
  public vy = 0;
  public width = 42;
  public height = 64;

  public isGrounded = false;
  public jumpCount = 0;
  public maxJumps = 2;

  // 动作状态
  public isSliding = false;
  public slideTimer = 0;
  public isSlashing = false;
  public slashTimer = 0;
  public slashCooldown = 0;

  public isDashing = false;
  public dashTimer = 0;
  public dashCooldown = 0;

  public isInvulnerable = false;
  public invulnerableTimer = 0;

  // 动画状态
  public runAnimTime = 0;
  public flipAngle = 0; // 二段跳空中翻滚角度

  // 飘逸红丝带 (Verlet 物理模拟)
  public ribbon: RibbonPoint[] = [];
  public ribbonLength = 7;
  public ribbonSegmentDist = 9;

  // 疾风残影队列
  public ghosts: ShadowGhost[] = [];
  public ghostSpawnTimer = 0;

  constructor(startX = 180, groundY = 0) {
    this.x = startX;
    this.y = groundY - this.height;

    // 初始化红丝带质点
    for (let i = 0; i < this.ribbonLength; i++) {
      this.ribbon.push({
        x: this.x - i * this.ribbonSegmentDist,
        y: this.y + 12,
        oldX: this.x - i * this.ribbonSegmentDist,
        oldY: this.y + 12
      });
    }
  }

  public update(dt: number, gravity = 1800) {
    // 1. 重力与物理位移
    if (!this.isDashing) {
      this.vy += gravity * dt;
      if (this.vy > 950) this.vy = 950; // 终端速度
    } else {
      this.vy = 0; // 突进时不受重力影响
    }

    this.y += this.vy * dt;

    // 2. 状态计时器衰减
    if (this.slashCooldown > 0) this.slashCooldown -= dt;
    if (this.dashCooldown > 0) this.dashCooldown -= dt;

    if (this.isSlashing) {
      this.slashTimer -= dt;
      if (this.slashTimer <= 0) {
        this.isSlashing = false;
      }
    }

    if (this.isDashing) {
      this.dashTimer -= dt;
      if (this.dashTimer <= 0) {
        this.isDashing = false;
      }
    }

    if (this.isSliding) {
      this.slideTimer -= dt;
      if (this.slideTimer <= 0) {
        this.isSliding = false;
      }
    }

    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= dt;
      if (this.invulnerableTimer <= 0) {
        this.isInvulnerable = false;
      }
    }

    // 3. 奔跑与空中翻滚动作更新
    if (this.isGrounded) {
      this.runAnimTime += dt * 14;
      this.flipAngle = 0;
    } else {
      if (this.jumpCount >= 2) {
        // 空中二段翻滚
        this.flipAngle += dt * Math.PI * 4;
      }
    }

    // 4. 残影生成与衰减
    this.updateGhosts(dt);

    // 5. 飘逸红丝带 Verlet 模拟
    this.updateRibbon(dt);
  }

  private updateRibbon(_dt: number) {
    // 锚定在斗笠/脑后位置
    const headX = this.x + 12;
    const headY = this.isSliding ? this.y + 36 : this.y + 16;
    this.ribbon[0].x = headX;
    this.ribbon[0].y = headY;

    // Verlet 积分与风阻拖曳
    for (let i = 1; i < this.ribbon.length; i++) {
      const p = this.ribbon[i];
      const vx = (p.x - p.oldX) * 0.88;
      const vy = (p.y - p.oldY) * 0.88;

      p.oldX = p.x;
      p.oldY = p.y;

      // 疾风阻力向后吹拂，并受少许下垂重力
      p.x += vx - 4.5;
      p.y += vy + 0.8;
    }

    // 距离约束 (多次迭代增强柔顺韧性)
    for (let iter = 0; iter < 4; iter++) {
      for (let i = 0; i < this.ribbon.length - 1; i++) {
        const p1 = this.ribbon[i];
        const p2 = this.ribbon[i + 1];

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.hypot(dx, dy);
        if (dist === 0) continue;

        const diff = (dist - this.ribbonSegmentDist) / dist;
        if (i === 0) {
          // 第一个固定在头上，只移动第二个
          p2.x -= dx * diff;
          p2.y -= dy * diff;
        } else {
          p1.x += dx * diff * 0.5;
          p1.y += dy * diff * 0.5;
          p2.x -= dx * diff * 0.5;
          p2.y -= dy * diff * 0.5;
        }
      }
    }
  }

  private updateGhosts(dt: number) {
    // 突进或高速拔刀时生成残影
    if (this.isDashing || this.isSlashing) {
      this.ghostSpawnTimer += dt;
      if (this.ghostSpawnTimer >= 0.04) {
        this.ghostSpawnTimer = 0;
        this.ghosts.push({
          x: this.x,
          y: this.y,
          alpha: 0.6,
          state: this.getCurrentState(),
          rotation: this.flipAngle,
          ribbon: this.ribbon.map((p) => ({ x: p.x, y: p.y }))
        });
      }
    }

    for (let i = this.ghosts.length - 1; i >= 0; i--) {
      const g = this.ghosts[i];
      g.alpha -= dt * 3.0;
      if (g.alpha <= 0) {
        this.ghosts.splice(i, 1);
      }
    }
  }

  public getCurrentState(): 'run' | 'jump' | 'double_jump' | 'slide' | 'slash' | 'dash' {
    if (this.isDashing) return 'dash';
    if (this.isSlashing) return 'slash';
    if (this.isSliding) return 'slide';
    if (!this.isGrounded) return this.jumpCount >= 2 ? 'double_jump' : 'jump';
    return 'run';
  }

  public jump(): boolean {
    if (this.jumpCount < this.maxJumps) {
      this.jumpCount++;
      this.isGrounded = false;
      this.isSliding = false;
      // 一段跳弹力适中，二段跳空灵轻盈
      this.vy = this.jumpCount === 1 ? -640 : -580;
      return true;
    }
    return false;
  }

  public slide() {
    if (this.isGrounded && !this.isSliding) {
      this.isSliding = true;
      this.slideTimer = 0.55;
    }
  }

  public slash(): boolean {
    if (this.slashCooldown <= 0) {
      this.isSlashing = true;
      this.slashTimer = 0.28;
      this.slashCooldown = 0.45;
      return true;
    }
    return false;
  }

  public dash(): boolean {
    if (this.dashCooldown <= 0) {
      this.isDashing = true;
      this.dashTimer = 0.22;
      this.dashCooldown = 0.9;
      this.isInvulnerable = true;
      this.invulnerableTimer = 0.3;
      return true;
    }
    return false;
  }

  public land(groundY: number) {
    this.y = groundY - (this.isSliding ? 34 : this.height);
    this.vy = 0;
    this.isGrounded = true;
    this.jumpCount = 0;
    this.flipAngle = 0;
  }

  public getBoundingBox() {
    if (this.isSliding) {
      return {
        x: this.x - 10,
        y: this.y + 30,
        w: this.width + 25,
        h: 34
      };
    }
    return {
      x: this.x - 5,
      y: this.y,
      w: this.width + 10,
      h: this.height
    };
  }

  public getSlashHitbox() {
    if (!this.isSlashing) return null;
    return {
      x: this.x + 10,
      y: this.y - 15,
      w: 80,
      h: this.height + 30
    };
  }

  public render(ctx: CanvasRenderingContext2D) {
    // 渲染残影
    for (const g of this.ghosts) {
      ctx.save();
      ctx.globalAlpha = g.alpha * 0.45;
      this.drawSilhouette(ctx, g.x, g.y, g.state, g.rotation, '#25201c');
      this.drawRibbonFromCoords(ctx, g.ribbon, '#b22222', g.alpha * 0.45);
      ctx.restore();
    }

    // 渲染主角本体
    ctx.save();
    if (this.isInvulnerable && Math.floor(Date.now() / 60) % 2 === 0) {
      ctx.globalAlpha = 0.5; // 受伤或突进闪烁
    }

    const state = this.getCurrentState();
    this.drawSilhouette(ctx, this.x, this.y, state, this.flipAngle, '#120f0e');
    this.drawRibbon(ctx);

    // 拔刀斩剑气光弧
    if (this.isSlashing) {
      this.drawSlashArc(ctx);
    }

    ctx.restore();
  }

  private drawSilhouette(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    state: string,
    rotation: number,
    color: string
  ) {
    ctx.save();
    ctx.translate(x + this.width / 2, y + this.height / 2);

    if (state === 'double_jump' || rotation !== 0) {
      ctx.rotate(rotation);
    }

    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (state === 'slide') {
      // 贴地滑铲剪影
      ctx.beginPath();
      // 斗笠倾斜
      ctx.ellipse(5, 5, 20, 5, 0.2, 0, Math.PI * 2);
      ctx.fill();
      // 身躯向前俯冲
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(-16, 18);
      ctx.lineTo(16, 12);
      ctx.stroke();
      // 伸出的前腿与曲起的后腿
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(12, 12);
      ctx.lineTo(34, 18);
      ctx.stroke();
    } else {
      // 头部与经典斗笠 (Bamboo Hat)
      const headOffsetY = -20;
      // 斗笠大沿
      ctx.beginPath();
      ctx.moveTo(-24, headOffsetY + 2);
      ctx.lineTo(24, headOffsetY + 2);
      ctx.lineTo(0, headOffsetY - 11);
      ctx.closePath();
      ctx.fill();

      // 躯干 (黑色修身行装)
      ctx.lineWidth = 15;
      ctx.beginPath();
      ctx.moveTo(0, headOffsetY + 6);
      ctx.lineTo(-2, 10);
      ctx.stroke();

      // 拔刀手势 / 佩刀剪影
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = '#2b231f';
      ctx.beginPath();
      ctx.moveTo(-10, 2);
      ctx.lineTo(12, 18);
      ctx.stroke();

      // 四肢动作 (根据奔跑相位 / 跳跃姿态)
      ctx.lineWidth = 6;
      ctx.strokeStyle = color;

      if (state === 'run') {
        const cycle = Math.sin(this.runAnimTime);
        const armCycle = Math.cos(this.runAnimTime);

        // 前后腿交替
        ctx.beginPath();
        ctx.moveTo(-3, 10);
        ctx.lineTo(cycle * 18, 22);
        ctx.lineTo(cycle * 14 + 4, 34);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(2, 10);
        ctx.lineTo(-cycle * 18, 22);
        ctx.lineTo(-cycle * 14 + 4, 34);
        ctx.stroke();

        // 双臂摆动
        ctx.beginPath();
        ctx.moveTo(0, headOffsetY + 10);
        ctx.lineTo(armCycle * 14, 0);
        ctx.stroke();
      } else if (state === 'jump' || state === 'double_jump') {
        // 空中轻盈屈膝展开
        ctx.beginPath();
        ctx.moveTo(-3, 10);
        ctx.lineTo(-14, 20);
        ctx.lineTo(-18, 32);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(3, 10);
        ctx.lineTo(14, 18);
        ctx.lineTo(22, 28);
        ctx.stroke();
      } else {
        // 站立或突进
        ctx.beginPath();
        ctx.moveTo(-3, 10);
        ctx.lineTo(-12, 34);
        ctx.moveTo(3, 10);
        ctx.lineTo(12, 34);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  private drawRibbon(ctx: CanvasRenderingContext2D) {
    if (this.ribbon.length < 2) return;
    ctx.save();
    ctx.strokeStyle = '#c0392b'; // 鲜明朱红丝带
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(this.ribbon[0].x, this.ribbon[0].y);
    for (let i = 1; i < this.ribbon.length; i++) {
      const xc = (this.ribbon[i - 1].x + this.ribbon[i].x) / 2;
      const yc = (this.ribbon[i - 1].y + this.ribbon[i].y) / 2;
      ctx.quadraticCurveTo(this.ribbon[i - 1].x, this.ribbon[i - 1].y, xc, yc);
    }
    ctx.lineTo(this.ribbon[this.ribbon.length - 1].x, this.ribbon[this.ribbon.length - 1].y);
    ctx.stroke();
    ctx.restore();
  }

  private drawRibbonFromCoords(
    ctx: CanvasRenderingContext2D,
    pts: { x: number; y: number }[],
    color: string,
    alpha: number
  ) {
    if (pts.length < 2) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.stroke();
    ctx.restore();
  }

  private drawSlashArc(ctx: CanvasRenderingContext2D) {
    ctx.save();
    const progress = 1 - this.slashTimer / 0.28;
    const cx = this.x + 35;
    const cy = this.y + this.height * 0.5;
    const radius = 58;

    // 动态剑气弧线 (月牙墨痕)
    const startAngle = -Math.PI * 0.45 + progress * 0.3;
    const endAngle = Math.PI * 0.45 + progress * 0.3;

    ctx.strokeStyle = 'rgba(235, 230, 220, 0.9)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.stroke();

    // 墨韵拖尾
    ctx.strokeStyle = 'rgba(40, 30, 25, 0.7)';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 3, startAngle, endAngle);
    ctx.stroke();

    ctx.restore();
  }
}
