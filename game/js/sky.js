// Meridian Air Rally — sky, sun, clouds, birds and far mountain silhouettes.
// Everything is drawn procedurally; the palette is one golden-hour style.
import { clamp, lerp, mulberry32, TAU } from "./utils.js";

const SUNSET_TOP = [26, 18, 64];
const SUNSET_MID = [122, 62, 110];
const SUNSET_LOW = [255, 158, 84];

function mix(a, b, t) {
  return [lerp(a[0], b[0], t) | 0, lerp(a[1], b[1], t) | 0, lerp(a[2], b[2], t) | 0];
}

export class Sky {
  constructor() {
    this.clouds = [];
    const rand = mulberry32(20261126);
    for (let i = 0; i < 14; i++) {
      this.clouds.push({
        x: rand() * 1600,
        y: 40 + rand() * 260,
        s: 0.6 + rand() * 1.4,
        v: 4 + rand() * 9,
        a: 0.35 + rand() * 0.4,
      });
    }
    this.birds = [];
    for (let i = 0; i < 5; i++) {
      this.birds.push({ x: rand() * 1280, y: 90 + rand() * 160, v: 14 + rand() * 10, ph: rand() * TAU });
    }
    // Far ridge silhouettes, two parallax layers, drawn from fixed noise.
    this.ridgeFar = this._ridge(777, 0.0016, 120, 210);
    this.ridgeNear = this._ridge(4242, 0.0028, 60, 150);
  }

  _ridge(seed, freq, base, amp) {
    const rand = mulberry32(seed);
    const pts = [];
    const n = 260;
    let v = 0.5;
    for (let i = 0; i <= n; i++) {
      v = clamp(v + (rand() - 0.5) * 0.55, 0.08, 1);
      pts.push(base + v * amp);
    }
    return { pts, freq };
  }

  _drawRidge(ctx, ridge, scrollX, color, horizonY) {
    const w = ridge.pts.length - 1;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-4, horizonY + 4);
    for (let sx = -4; sx <= 1284; sx += 8) {
      const wx = sx + scrollX;
      const raw = Math.floor(wx * ridge.freq * w);
      const idx = ((raw % w) + w) % w;
      const f = ((wx * ridge.freq * w) % 1 + 1) % 1;
      const h = lerp(ridge.pts[idx], ridge.pts[(idx + 1) % w], f);
      ctx.lineTo(sx, horizonY - h);
    }
    ctx.lineTo(1284, horizonY + 4);
    ctx.closePath();
    ctx.fill();
  }

  draw(ctx, dt, timeSec, camX, camAlt) {
    const W = 1280;
    const H = 720;
    // Golden-hour gradient, deeper as you climb.
    const climb = clamp(camAlt / 2600, 0, 1);
    const top = mix(SUNSET_TOP, [10, 10, 38], climb * 0.6);
    const mid = mix(SUNSET_MID, [58, 40, 96], climb * 0.6);
    const low = mix(SUNSET_LOW, [255, 190, 120], climb * 0.35);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, `rgb(${top[0]},${top[1]},${top[2]})`);
    g.addColorStop(0.55, `rgb(${mid[0]},${mid[1]},${mid[2]})`);
    g.addColorStop(1, `rgb(${low[0]},${low[1]},${low[2]})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Sun, low over the ridge line, with a warm halo.
    const sunX = 980;
    const sunY = 300 - climb * 60;
    const halo = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 190);
    halo.addColorStop(0, "rgba(255, 214, 130, 0.85)");
    halo.addColorStop(0.35, "rgba(255, 170, 90, 0.28)");
    halo.addColorStop(1, "rgba(255, 170, 90, 0)");
    ctx.fillStyle = halo;
    ctx.fillRect(sunX - 200, sunY - 200, 400, 400);
    ctx.fillStyle = "#ffe9b0";
    ctx.beginPath();
    ctx.arc(sunX, sunY, 34, 0, TAU);
    ctx.fill();

    // Clouds drift with the wind and with the camera.
    for (const c of this.clouds) {
      c.x -= (c.v + 6) * dt;
      if (c.x < -220) c.x = 1500;
      const sx = ((c.x - camX * 0.08) % 1600 + 1600) % 1600 - 160;
      ctx.fillStyle = `rgba(255, 226, 205, ${c.a})`;
      ctx.beginPath();
      ctx.ellipse(sx, c.y, 74 * c.s, 17 * c.s, 0, 0, TAU);
      ctx.ellipse(sx - 42 * c.s, c.y + 6, 44 * c.s, 12 * c.s, 0, 0, TAU);
      ctx.ellipse(sx + 46 * c.s, c.y + 5, 48 * c.s, 13 * c.s, 0, 0, TAU);
      ctx.fill();
    }

    // Far mountain silhouettes, parallax 0.15 and 0.3.
    const horizonY = 560;
    this._drawRidge(ctx, this.ridgeFar, camX * 0.15, "rgba(74, 52, 110, 0.55)", horizonY - 40);
    this._drawRidge(ctx, this.ridgeNear, camX * 0.3, "rgba(52, 36, 84, 0.7)", horizonY - 8);

    // Birds, tiny and far away.
    ctx.strokeStyle = "rgba(30, 18, 48, 0.8)";
    ctx.lineWidth = 2;
    for (const b of this.birds) {
      b.x -= b.v * dt;
      if (b.x < -30) {
        b.x = 1310;
        b.y = 80 + Math.random() * 180;
      }
      const flap = Math.sin(timeSec * 6 + b.ph) * 4;
      ctx.beginPath();
      ctx.moveTo(b.x - 8, b.y);
      ctx.quadraticCurveTo(b.x - 3, b.y - 4 - flap, b.x, b.y);
      ctx.quadraticCurveTo(b.x + 3, b.y - 4 - flap, b.x + 8, b.y);
      ctx.stroke();
    }
  }
}
