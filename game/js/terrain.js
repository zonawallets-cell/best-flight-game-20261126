// Meridian Air Rally — the world: one procedural valley with ridges, a river,
// fields, pine forest and a lit runway. Deterministic: same seed, same world.
import { clamp, lerp, makeFbm, mulberry32, smoothstep } from "./utils.js";

export const RUNWAY_X0 = 13200; // metres along the course
export const RUNWAY_X1 = 14400;
export const RUNWAY_ALT = 200; // feet
export const COURSE_END = 14800;

export class Terrain {
  constructor() {
    this.ridge = makeFbm(1337, 4);
    this.detail = makeFbm(9021, 3);
    this.treeRand = mulberry32(5150);
    // Pre-roll deterministic tree slots so drawing is stable frame to frame.
    this.trees = [];
    const r = mulberry32(777001);
    for (let x = 200; x < COURSE_END; x += 26 + r() * 60) {
      this.trees.push({ x, s: 0.7 + r() * 0.9, lean: (r() - 0.5) * 0.3 });
    }
    this.fieldRand = mulberry32(31337);
    this.fields = [];
    for (let x = 600; x < COURSE_END; x += 420 + this.fieldRand() * 500) {
      this.fields.push({
        x,
        w: 260 + this.fieldRand() * 420,
        hue: 42 + this.fieldRand() * 40,
        sat: 42 + this.fieldRand() * 22,
      });
    }
  }

  // Ground altitude in feet at course distance x (metres).
  groundAlt(x) {
    if (x < 0) x = 0;
    // Rolling ridges: 220..1150 ft, rougher in the canyon stretch.
    const rough = smoothstep(2800, 4200, x) * (1 - smoothstep(9200, 10500, x));
    let h = 240 + this.ridge(x * 0.00042) * (520 + rough * 480);
    h += (this.detail(x * 0.0021) - 0.5) * 90;
    // River valley carve around x = 7600..9000, down to ~130 ft.
    const river = smoothstep(900, 0, Math.abs(x - 8300));
    h = lerp(h, 130, river);
    // Runway: dead flat at RUNWAY_ALT on a long level valley floor, blended
    // in gently from 11000 so a normal glidepath clears the approach.
    const rw = smoothstep(11000, 12400, x) * (1 - smoothstep(RUNWAY_X1, RUNWAY_X1 + 400, x));
    h = lerp(h, RUNWAY_ALT, rw);
    return h;
  }

  onRunway(x) {
    return x >= RUNWAY_X0 && x <= RUNWAY_X1;
  }

  inRiver(x) {
    return x > 7950 && x < 8650;
  }

  // Screen helpers: the camera gives these to the draw call.
  draw(ctx, camX, camAlt, screenY, pxPerM, timeSec) {
    const W = 1280;
    const H = 720;
    const x0 = camX - 60;
    const x1 = camX + W / pxPerM + 60;

    // Ground body: fill from the profile down to the bottom of the screen.
    ctx.beginPath();
    ctx.moveTo(-4, H + 4);
    for (let sx = -4; sx <= W + 4; sx += 6) {
      const wx = camX + sx / pxPerM;
      ctx.lineTo(sx, screenY(this.groundAlt(wx)));
    }
    ctx.lineTo(W + 4, H + 4);
    ctx.closePath();
    const gg = ctx.createLinearGradient(0, 300, 0, H);
    gg.addColorStop(0, "#5d7a44");
    gg.addColorStop(0.45, "#48603a");
    gg.addColorStop(1, "#2c4426");
    ctx.fillStyle = gg;
    ctx.fill();

    // Snow caps on the high ridges: white where the ground is tall.
    ctx.fillStyle = "rgba(245, 240, 255, 0.85)";
    for (let sx = -4; sx <= W + 4; sx += 6) {
      const wx = camX + sx / pxPerM;
      const alt = this.groundAlt(wx);
      if (alt > 980) {
        const y = screenY(alt);
        ctx.fillRect(sx, y, 7, 5 + (alt - 980) * 0.02);
      }
    }

    // Fields: golden patchwork in the low valley.
    for (const f of this.fields) {
      const sx = (f.x - camX) * pxPerM;
      if (sx < -500 || sx > W + 500) continue;
      const y = screenY(this.groundAlt(f.x + f.w / 2));
      ctx.fillStyle = `hsla(${f.hue}, ${f.sat}%, 52%, 0.5)`;
      ctx.fillRect(sx, y - 8, f.w * pxPerM, 14);
    }

    // River: a blue band through the valley floor.
    if (x1 > 7950 && x0 < 8650) {
      const rx0 = Math.max(x0, 7950);
      const rx1 = Math.min(x1, 8650);
      ctx.beginPath();
      ctx.moveTo((rx0 - camX) * pxPerM, H + 4);
      for (let wx = rx0; wx <= rx1; wx += 12) {
        ctx.lineTo((wx - camX) * pxPerM, screenY(this.groundAlt(wx)) - 2);
      }
      ctx.lineTo((rx1 - camX) * pxPerM, H + 4);
      ctx.closePath();
      const shimmer = 0.5 + 0.2 * Math.sin(timeSec * 1.4);
      ctx.fillStyle = `rgba(86, 164, 214, ${shimmer})`;
      ctx.fill();
    }

    // Pines on gentle ground, never on the runway or in the river.
    ctx.fillStyle = "#1e3d24";
    for (const t of this.trees) {
      if (t.x < x0 || t.x > x1) continue;
      if (this.onRunway(t.x) || this.inRiver(t.x)) continue;
      const alt = this.groundAlt(t.x);
      if (alt > 900) continue;
      const sx = (t.x - camX) * pxPerM;
      const sy = screenY(alt);
      const h = 26 * t.s;
      ctx.beginPath();
      ctx.moveTo(sx, sy - h);
      ctx.lineTo(sx - 8 * t.s, sy);
      ctx.lineTo(sx + 8 * t.s, sy);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(sx - 1.5, sy - 2, 3, 4);
    }

    // Runway: grey strip with centreline, threshold bars and edge lights.
    if (x1 > RUNWAY_X0 - 200 && x0 < RUNWAY_X1 + 200) {
      const r0 = (RUNWAY_X0 - camX) * pxPerM;
      const r1 = (RUNWAY_X1 - camX) * pxPerM;
      const ry = screenY(RUNWAY_ALT);
      ctx.fillStyle = "#3d3d46";
      ctx.fillRect(r0, ry - 3, r1 - r0, 26);
      ctx.fillStyle = "#565660";
      ctx.fillRect(r0, ry - 3, r1 - r0, 5);
      // Centreline dashes.
      ctx.fillStyle = "#f5f0dc";
      for (let wx = RUNWAY_X0 + 60; wx < RUNWAY_X1 - 40; wx += 150) {
        const dx = (wx - camX) * pxPerM;
        ctx.fillRect(dx, ry + 8, 46, 4);
      }
      // Threshold bars.
      ctx.fillRect(r0 + 14, ry + 2, 26, 4);
      ctx.fillRect(r1 - 40, ry + 2, 26, 4);
      // Edge lights, warm amber, blinking gently.
      const blink = 0.55 + 0.45 * Math.sin(timeSec * 3);
      ctx.fillStyle = `rgba(255, 190, 80, ${blink})`;
      for (let wx = RUNWAY_X0; wx <= RUNWAY_X1; wx += 150) {
        const dx = (wx - camX) * pxPerM;
        ctx.beginPath();
        ctx.arc(dx, ry - 6, 3.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(dx, ry + 26, 3.4, 0, Math.PI * 2);
        ctx.fill();
      }
      // Windsock at the threshold.
      const wx0 = (RUNWAY_X0 + 40 - camX) * pxPerM;
      ctx.strokeStyle = "#d8d2c0";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(wx0, ry - 3);
      ctx.lineTo(wx0, ry - 42);
      ctx.stroke();
      ctx.fillStyle = "#ff7a3c";
      ctx.beginPath();
      ctx.moveTo(wx0, ry - 42);
      ctx.lineTo(wx0 + 26 + Math.sin(timeSec * 2) * 3, ry - 36);
      ctx.lineTo(wx0, ry - 30);
      ctx.closePath();
      ctx.fill();
      // Runway label on the ground.
      ctx.fillStyle = "rgba(245, 240, 220, 0.9)";
      ctx.font = "bold 20px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("MERIDIAN 09", (r0 + r1) / 2, ry + 46);
    }
  }
}
