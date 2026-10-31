export class InkBackground {
  private width = 0;
  private height = 0;
  private scrollOffsets = [0, 0, 0, 0]; // 对应不同景深的滚动偏移

  // 离屏缓冲加速月亮和静态山水纹理渲染
  private moonCanvas: HTMLCanvasElement;
  private moonCtx: CanvasRenderingContext2D;

  constructor() {
    this.moonCanvas = document.createElement('canvas');
    this.moonCanvas.width = 300;
    this.moonCanvas.height = 300;
    this.moonCtx = this.moonCanvas.getContext('2d')!;
    this.renderMoonBuffer();
  }

  private renderMoonBuffer() {
    const ctx = this.moonCtx;
    const cx = 150;
    const cy = 150;
    const r = 90;

    // 外圈光晕 (圆满幽月)
    const glow = ctx.createRadialGradient(cx, cy, r * 0.7, cx, cy, 140);
    glow.addColorStop(0, 'rgba(255, 246, 215, 0.9)');
    glow.addColorStop(0.5, 'rgba(230, 200, 160, 0.35)');
    glow.addColorStop(1, 'rgba(200, 170, 130, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, 140, 0, Math.PI * 2);
    ctx.fill();

    // 幽月本体
    const moonGrad = ctx.createRadialGradient(cx - 20, cy - 20, 10, cx, cy, r);
    moonGrad.addColorStop(0, '#fffdfa');
    moonGrad.addColorStop(0.8, '#ecd7b3');
    moonGrad.addColorStop(1, '#cbaf84');
    ctx.fillStyle = moonGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // 月亮水墨暗斑
    ctx.fillStyle = 'rgba(165, 135, 100, 0.18)';
    ctx.beginPath();
    ctx.arc(cx - 25, cy - 10, 32, 0, Math.PI * 2);
    ctx.arc(cx + 20, cy + 20, 42, 0, Math.PI * 2);
    ctx.arc(cx + 10, cy - 30, 25, 0, Math.PI * 2);
    ctx.fill();
  }

  public resize(w: number, h: number) {
    this.width = w;
    this.height = h;
  }

  public update(dt: number, baseSpeed: number) {
    // 各层视差速度比：0.05 (极远), 0.15 (远山), 0.35 (中景峰峦), 0.6 (近景竹影)
    this.scrollOffsets[0] += baseSpeed * 0.04 * dt;
    this.scrollOffsets[1] += baseSpeed * 0.12 * dt;
    this.scrollOffsets[2] += baseSpeed * 0.3 * dt;
    this.scrollOffsets[3] += baseSpeed * 0.55 * dt;
  }

  public render(ctx: CanvasRenderingContext2D) {
    const w = this.width;
    const h = this.height;

    // 1. 夜空背景底色渐变 (夜墨深沉)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, '#161312');
    skyGrad.addColorStop(0.5, '#26201c');
    skyGrad.addColorStop(1, '#3b2f28');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. 悬空冷月 (右上方)
    const moonX = w * 0.75;
    const moonY = h * 0.22;
    ctx.drawImage(this.moonCanvas, moonX - 150, moonY - 150);

    // 3. 流动墨云
    this.renderClouds(ctx, w, h);

    // 4. 第一层：极远水墨重山
    this.renderMountains(ctx, w, h, 0.12, this.scrollOffsets[1], '#423730', 0.5, 0.45);

    // 5. 第二层：中景层峦叠嶂 + 宝塔剪影
    this.renderMountains(ctx, w, h, 0.22, this.scrollOffsets[2], '#29211c', 0.65, 0.6);
    this.renderPagodas(ctx, w, h, this.scrollOffsets[2]);

    // 6. 第三层：近景摇曳竹林与水墨飞鸟/红灯笼
    this.renderNearFoliage(ctx, w, h, this.scrollOffsets[3]);
  }

  private renderClouds(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.save();
    ctx.fillStyle = 'rgba(75, 60, 50, 0.15)';
    const offset = this.scrollOffsets[0];
    for (let i = 0; i < 3; i++) {
      const cx = ((i * 500 - offset) % (w + 400)) - 100;
      const cy = h * (0.15 + i * 0.1);
      ctx.beginPath();
      ctx.ellipse(cx, cy, 180, 24, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 60, cy - 8, 120, 28, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private renderMountains(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    _parallax: number,
    offset: number,
    color: string,
    alpha: number,
    baseHeightRatio: number
  ) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;

    const segmentWidth = 140;
    const baseY = h * baseHeightRatio;
    const totalSegments = Math.ceil(w / segmentWidth) + 3;
    const startIdx = Math.floor(offset / segmentWidth);
    const localOffset = offset % segmentWidth;

    ctx.beginPath();
    ctx.moveTo(-segmentWidth, h);

    for (let i = -1; i <= totalSegments; i++) {
      const idx = startIdx + i;
      const x = i * segmentWidth - localOffset;
      // 确定性伪随机山峦起伏
      const peakHeight = Math.sin(idx * 1.3) * 60 + Math.cos(idx * 2.7) * 40;
      const y = baseY - peakHeight;
      if (i === -1) {
        ctx.lineTo(x, y);
      } else {
        const prevX = (i - 1) * segmentWidth - localOffset;
        const prevIdx = idx - 1;
        const prevY = baseY - (Math.sin(prevIdx * 1.3) * 60 + Math.cos(prevIdx * 2.7) * 40);
        const cpx = (prevX + x) / 2;
        ctx.quadraticCurveTo(cpx, prevY - 20, x, y);
      }
    }

    ctx.lineTo(w + segmentWidth, h);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private renderPagodas(ctx: CanvasRenderingContext2D, w: number, h: number, offset: number) {
    ctx.save();
    ctx.fillStyle = '#1c1613';
    ctx.globalAlpha = 0.85;

    const spacing = 900;
    const startX = -(offset % spacing);
    const count = Math.ceil(w / spacing) + 2;

    for (let i = 0; i < count; i++) {
      const px = startX + i * spacing;
      const py = h * 0.72;

      // 绘制古代宝塔剪影
      const tiers = 3;
      const baseW = 44;
      for (let t = 0; t < tiers; t++) {
        const tw = baseW - t * 8;
        const ty = py - t * 18;
        // 飞檐
        ctx.beginPath();
        ctx.moveTo(px - tw, ty);
        ctx.lineTo(px + tw, ty);
        ctx.lineTo(px + tw * 0.7, ty - 14);
        ctx.lineTo(px - tw * 0.7, ty - 14);
        ctx.closePath();
        ctx.fill();
        // 塔尖
        if (t === tiers - 1) {
          ctx.beginPath();
          ctx.moveTo(px, ty - 24);
          ctx.lineTo(px - 3, ty - 14);
          ctx.lineTo(px + 3, ty - 14);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  private renderNearFoliage(ctx: CanvasRenderingContext2D, w: number, h: number, offset: number) {
    ctx.save();
    // 渲染近景细长竹竿与竹节
    ctx.strokeStyle = '#1b1411';
    ctx.fillStyle = '#1b1411';
    ctx.lineWidth = 6;
    ctx.globalAlpha = 0.95;

    const spacing = 450;
    const startX = -(offset % spacing);
    const count = Math.ceil(w / spacing) + 2;

    for (let i = 0; i < count; i++) {
      const bx = startX + i * spacing + 120;
      const topY = h * 0.38;
      const bottomY = h;

      // 竹竿主干
      ctx.beginPath();
      ctx.moveTo(bx, bottomY);
      ctx.quadraticCurveTo(bx + 15, (topY + bottomY) / 2, bx + 5, topY);
      ctx.stroke();

      // 竹节与竹叶枝
      for (let y = bottomY; y > topY; y -= 70) {
        ctx.beginPath();
        ctx.arc(bx + 8, y, 5, 0, Math.PI * 2);
        ctx.fill();

        // 旁逸斜出竹叶
        ctx.save();
        ctx.translate(bx + 8, y);
        ctx.rotate(-0.4);
        ctx.beginPath();
        ctx.ellipse(20, -5, 18, 4, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 飘动红灯笼 (中国风红韵点缀)
      if (i % 2 === 0) {
        const lx = bx - 140;
        const ly = topY + 60;

        // 提线
        ctx.strokeStyle = '#3a201b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(lx, ly - 30);
        ctx.lineTo(lx, ly);
        ctx.stroke();

        // 红色发光灯笼
        const lanternGlow = ctx.createRadialGradient(lx, ly + 14, 2, lx, ly + 14, 32);
        lanternGlow.addColorStop(0, 'rgba(255, 60, 40, 0.85)');
        lanternGlow.addColorStop(0.5, 'rgba(220, 40, 30, 0.4)');
        lanternGlow.addColorStop(1, 'rgba(180, 20, 20, 0)');
        ctx.fillStyle = lanternGlow;
        ctx.beginPath();
        ctx.arc(lx, ly + 14, 32, 0, Math.PI * 2);
        ctx.fill();

        // 灯笼骨架剪影
        ctx.fillStyle = '#b72828';
        ctx.beginPath();
        ctx.ellipse(lx, ly + 14, 12, 18, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#f5b041';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(lx, ly + 14, 6, 18, 0, 0, Math.PI * 2);
        ctx.stroke();

        // 流苏穗子
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(lx, ly + 32);
        ctx.lineTo(lx, ly + 46);
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}
