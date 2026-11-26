// Meridian Air Rally — target rings and gates. Fly through the glowing hoop.
import { TAU, clamp } from "./utils.js";

export class Rings {
  constructor(defs) {
    // defs: [{x, alt, r, kind}] — kind 'ring' or 'gate'.
    this.list = defs.map((d) => ({
      x: d.x,
      alt: d.alt,
      r: d.r || 90,
      kind: d.kind || "ring",
      passed: false,
      missed: false,
      flash: 0,
    }));
  }

  get next() {
    return this.list.find((r) => !r.passed && !r.missed) || null;
  }

  get passedCount() {
    return this.list.filter((r) => r.passed).length;
  }

  get total() {
    return this.list.length;
  }

  // Returns the ring just passed, or null. Call every frame.
  checkPass(plane, prevX) {
    for (const r of this.list) {
      if (r.passed || r.missed) continue;
      if (prevX < r.x && plane.x >= r.x) {
        if (Math.abs(plane.alt - r.alt) < r.r) {
          r.passed = true;
          r.flash = 1;
          return r;
        }
        r.missed = true;
        return null;
      }
    }
    return null;
  }

  update(dt) {
    for (const r of this.list) {
      if (r.flash > 0) r.flash = Math.max(0, r.flash - dt * 1.6);
    }
  }

  draw(ctx, camX, camAlt, screenY, pxPerM, pxPerFt, timeSec) {
    for (const r of this.list) {
      const sx = (r.x - camX) * pxPerM;
      if (sx < -120 || sx > 1400) continue;
      const sy = screenY(r.alt);
      const ry = r.r * pxPerFt;
      const rx = ry * 0.72;
      const pulse = 0.75 + 0.25 * Math.sin(timeSec * 3 + r.x * 0.01);
      if (r.passed) {
        // Passed rings stay as a faint green ghost.
        ctx.strokeStyle = `rgba(120, 255, 160, ${0.25 + r.flash * 0.5})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(sx, sy, rx, ry, 0, 0, TAU);
        ctx.stroke();
        continue;
      }
      if (r.missed) {
        ctx.strokeStyle = "rgba(150, 150, 160, 0.3)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(sx, sy, rx, ry, 0, 0, TAU);
        ctx.stroke();
        continue;
      }
      const glow = r.kind === "gate" ? "255, 120, 60" : "255, 190, 80";
      ctx.save();
      ctx.shadowColor = `rgba(${glow}, 0.9)`;
      ctx.shadowBlur = 18 * pulse;
      ctx.strokeStyle = `rgba(${glow}, ${0.85 * pulse + 0.15})`;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.ellipse(sx, sy, rx, ry, 0, 0, TAU);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(255, 250, 235, 0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(sx, sy, rx, ry, 0, 0, TAU);
      ctx.stroke();
      // Chevron pointing through the hoop.
      ctx.fillStyle = `rgba(255, 240, 200, ${0.6 + 0.4 * pulse})`;
      ctx.beginPath();
      ctx.moveTo(sx - 8, sy - 12);
      ctx.lineTo(sx + 12, sy);
      ctx.lineTo(sx - 8, sy + 12);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      // Label above the next ring.
      const nxt = this.next;
      if (nxt === r) {
        ctx.fillStyle = "rgba(255, 235, 180, 0.95)";
        ctx.font = "bold 13px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(r.kind === "gate" ? "GATE" : "RING", sx, sy - ry - 10);
      }
    }
  }
}
