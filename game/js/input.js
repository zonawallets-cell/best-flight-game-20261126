// Meridian Air Rally — keyboard and mouse input, one shared state object.
import { clamp } from "./utils.js";

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.mouse = { x: 0, y: 0, down: false, clicked: false, clickX: 0, clickY: 0 };
    this.canvas = canvas;
    this._onKeyDown = (e) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
        e.preventDefault();
      }
      this.keys.add(e.code);
    };
    this._onKeyUp = (e) => this.keys.delete(e.code);
    this._onMouseMove = (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - r.left) / r.width) * canvas.width;
      this.mouse.y = ((e.clientY - r.top) / r.height) * canvas.height;
    };
    this._onMouseDown = (e) => {
      this._onMouseMove(e);
      this.mouse.down = true;
      this.mouse.clicked = true;
      this.mouse.clickX = this.mouse.x;
      this.mouse.clickY = this.mouse.y;
    };
    this._onMouseUp = () => {
      this.mouse.down = false;
    };
    this._onBlur = () => this.keys.clear();
    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    window.addEventListener("blur", this._onBlur);
    canvas.addEventListener("mousemove", this._onMouseMove);
    canvas.addEventListener("mousedown", this._onMouseDown);
    window.addEventListener("mouseup", this._onMouseUp);
  }

  down(code) {
    return this.keys.has(code);
  }

  // Pitch: ArrowUp / W climbs, ArrowDown / S descends. Returns -1, 0 or 1.
  pitchAxis() {
    const up = this.down("ArrowUp") || this.down("KeyW");
    const dn = this.down("ArrowDown") || this.down("KeyS");
    return (up ? 1 : 0) - (dn ? 1 : 0);
  }

  // Throttle: ArrowRight / D more power, ArrowLeft / A less.
  throttleAxis() {
    const up = this.down("ArrowRight") || this.down("KeyD");
    const dn = this.down("ArrowLeft") || this.down("KeyA");
    return (up ? 1 : 0) - (dn ? 1 : 0);
  }

  flaps() {
    return this.down("Space");
  }

  // True once for a key press this frame; callers clear it after reading.
  pressed(code) {
    return this.keys.has(code);
  }

  consumeClick() {
    if (!this.mouse.clicked) return null;
    this.mouse.clicked = false;
    return { x: this.mouse.clickX, y: this.mouse.clickY };
  }

  mouseY() {
    return this.mouse.y;
  }
}
