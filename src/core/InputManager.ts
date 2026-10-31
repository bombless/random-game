export class InputManager {
  public jump = false;
  public slide = false;
  public slash = false;
  public dash = false;

  private onJumpCb?: () => void;
  private onSlideCb?: () => void;
  private onSlashCb?: () => void;
  private onDashCb?: () => void;

  constructor() {
    this.bindKeyboard();
    this.bindTouch();
  }

  public setCallbacks(cbs: {
    onJump?: () => void;
    onSlide?: () => void;
    onSlash?: () => void;
    onDash?: () => void;
  }) {
    this.onJumpCb = cbs.onJump;
    this.onSlideCb = cbs.onSlide;
    this.onSlashCb = cbs.onSlash;
    this.onDashCb = cbs.onDash;
  }

  private bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const key = e.code;

      if (key === 'Space' || key === 'KeyW' || key === 'ArrowUp') {
        this.jump = true;
        this.onJumpCb?.();
      } else if (key === 'KeyS' || key === 'ArrowDown') {
        this.slide = true;
        this.onSlideCb?.();
      } else if (key === 'KeyJ' || key === 'KeyX') {
        this.slash = true;
        this.onSlashCb?.();
      } else if (key === 'KeyK' || key === 'KeyL' || key === 'ShiftLeft' || key === 'ShiftRight') {
        this.dash = true;
        this.onDashCb?.();
      }
    });

    window.addEventListener('keyup', (e) => {
      const key = e.code;
      if (key === 'Space' || key === 'KeyW' || key === 'ArrowUp') this.jump = false;
      if (key === 'KeyS' || key === 'ArrowDown') this.slide = false;
      if (key === 'KeyJ' || key === 'KeyX') this.slash = false;
      if (key === 'KeyK' || key === 'KeyL' || key === 'ShiftLeft' || key === 'ShiftRight') this.dash = false;
    });
  }

  private bindTouch() {
    const bindBtn = (id: string, onPress: () => void, onRelease?: () => void) => {
      const el = document.getElementById(id);
      if (!el) return;

      el.addEventListener('touchstart', (e) => {
        e.preventDefault();
        onPress();
      }, { passive: false });

      el.addEventListener('touchend', (e) => {
        e.preventDefault();
        onRelease?.();
      }, { passive: false });

      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        onPress();
      });

      el.addEventListener('mouseup', (e) => {
        e.preventDefault();
        onRelease?.();
      });
    };

    bindBtn('btn-jump', () => this.onJumpCb?.(), () => { this.jump = false; });
    bindBtn('btn-slide', () => this.onSlideCb?.(), () => { this.slide = false; });
    bindBtn('btn-slash', () => this.onSlashCb?.(), () => { this.slash = false; });
    bindBtn('btn-dash', () => this.onDashCb?.(), () => { this.dash = false; });
  }
}
