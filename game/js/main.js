// Meridian Air Rally — boot, game loop, state machine, camera and autopilot.
import { Input } from "./input.js";
import { AudioEngine } from "./audio.js";
import { Sky } from "./sky.js";
import { Terrain, RUNWAY_X0, RUNWAY_X1, RUNWAY_ALT } from "./terrain.js";
import { FlightModel, makePlane, PLANE_SCREEN_X, PX_PER_M, PX_PER_FT, HORIZON_Y } from "./physics.js";
import { drawPlane } from "./aircraft.js";
import { Rings } from "./rings.js";
import { MISSIONS, missionStars } from "./missions.js";
import { drawHUD, drawMenu, drawBriefing, drawDebrief, drawPaused } from "./hud.js";
import { clamp, fmt, lerp } from "./utils.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const G = {
  canvas,
  ctx,
  input: new Input(canvas),
  audio: new AudioEngine(),
  sky: new Sky(),
  terrain: new Terrain(),
  flight: new FlightModel(),
  missions: MISSIONS,
  state: "menu", // menu | briefing | flying | paused | debrief
  missionIndex: 0,
  mission: MISSIONS[0],
  plane: null,
  rings: new Rings([]),
  camX: 0,
  camAlt: 0,
  score: 0,
  totalScore: 0,
  bestScore: 0,
  best: {}, // mission id -> { stars, score }
  elapsed: 0,
  timeSec: 0,
  toasts: [],
  objectiveText: "",
  debrief: null,
  hoverButton: null,
  buttons: [],
  autopilot: false,
  shot: null,
  muted: false,
};

function screenY(alt) {
  return HORIZON_Y - (alt - G.camAlt) * PX_PER_FT;
}

function toast(text) {
  G.toasts.push({ text, life: 2.4 });
  if (G.toasts.length > 3) G.toasts.shift();
}

function startMission(i) {
  const m = MISSIONS[i];
  G.missionIndex = i;
  G.mission = m;
  G.plane = makePlane(m.startX, m.startAlt, m.startSpeed, m.fuel);
  G.rings = new Rings(m.rings);
  G.score = 0;
  G.elapsed = 0;
  G.toasts = [];
  G.camX = m.startX - PLANE_SCREEN_X / PX_PER_M;
  G.camAlt = m.startAlt - 1045;
  G.objectiveText = m.rings.length ? `Rings ${G.rings.passedCount}/${G.rings.total}` : "Land on Meridian 09";
  G.state = "briefing";
}

function takeOff() {
  G.state = "flying";
  G.elapsed = 0;
  G.audio.start();
  toast(G.mission.short + " — good luck, Meridian");
}

function finishMission(ok, title, lines) {
  const m = G.mission;
  let score = G.score;
  if (m.id === "canyon-dash" && ok) {
    const bonus = Math.max(0, Math.round((m.timeLimit - G.elapsed) * 4));
    score += bonus;
    lines.push("Time bonus  +" + fmt(bonus));
  }
  const stars = ok ? missionStars(m, score) : 0;
  const prev = G.best[m.id];
  if (!prev || score > prev.score) G.best[m.id] = { stars, score };
  G.totalScore = Object.values(G.best).reduce((s, b) => s + b.score, 0);
  G.bestScore = Math.max(G.bestScore, score);
  G.debrief = { ok, title, score, stars, lines };
  G.state = "debrief";
}

function autopilotInput() {
  const p = G.plane;
  const m = G.mission;
  // Never aim below the highest terrain in the next 400 m: stay 120 ft
  // clear of it. The floor fades out on final so the plane can reach the runway.
  const distRw = RUNWAY_X0 - p.x;
  const floorW = clamp((distRw - 300) / 700, 0, 1);
  let maxGround = -Infinity;
  for (let d = 0; d <= 400; d += 100) maxGround = Math.max(maxGround, G.terrain.groundAlt(p.x + d));
  const floorAlt = lerp(RUNWAY_ALT, maxGround + 120, floorW);
  let targetAlt = 900;
  const nxt = G.rings.next;
  if (nxt) {
    // Rings are placed above their local ground, so the ring altitude IS
    // the safe path — the terrain floor must not override it and push the
    // plane over the ring's band (that missed canyon gate 6 in testing).
    targetAlt = nxt.alt;
  } else if (m.needsLanding) {
    const dist = RUNWAY_X0 - p.x;
    if (dist < 500) {
      // Flare: aim just BELOW the runway so the plane keeps settling
      // onto the strip (level flight holds altitude — a target at the
      // runway height would float past the end of it).
      targetAlt = 195;
    } else {
      targetAlt = Math.max(200 + Math.max(0, dist) * 0.1, floorAlt);
      if (dist > 2500) targetAlt = Math.max(targetAlt, 900);
    }
  }
  const dAlt = targetAlt - p.alt;
  const pitchAxis = clamp(dAlt / 150, -1, 1);
  const targetThr = m.needsLanding && distRw < 1500 ? (distRw < 500 ? 0.45 : 0.55) : 0.62;
  const thrAxis = p.throttle < targetThr - 0.03 ? 1 : p.throttle > targetThr + 0.03 ? -1 : 0;
  return {
    throttleAxis: () => thrAxis,
    pitchAxis: () => pitchAxis,
    flaps: () => false,
    down: () => false,
  };
}

function updateFlying(dt) {
  const p = G.plane;
  const m = G.mission;
  G.elapsed += dt;
  const input = G.autopilot ? autopilotInput() : G.input;
  const prevX = p.x;
  const ev = G.flight.update(p, input, dt, G.terrain);

  const passed = G.rings.checkPass(p, prevX);
  if (passed) {
    const pts = passed.kind === "gate" ? 150 : 100;
    G.score += pts;
    p.fuel = Math.min(100, p.fuel + 5);
    G.audio.chime();
    toast((passed.kind === "gate" ? "GATE" : "RING") + "  +" + pts);
    G.objectiveText = m.rings.length ? `Rings ${G.rings.passedCount}/${G.rings.total}` : "Land on Meridian 09";
    if (G.rings.passedCount === G.rings.total) {
      if (m.needsLanding) {
        toast("All rings clear — land on Meridian 09");
        G.objectiveText = "Land on Meridian 09";
      } else {
        finishMission(true, "CANYON CLEAR", [
          `All ${G.rings.total} gates in ${fmt(G.elapsed, 1)}s`,
          "Fuel left " + Math.round(p.fuel) + "%",
          "Damage " + Math.round(p.damage) + "%",
        ]);
        return;
      }
    }
  }
  if (ev.struck) {
    G.audio.thud();
    toast("TERRAIN STRIKE — damage " + Math.round(p.damage) + "%");
  }
  if (ev.lowFuel) {
    G.audio.warning();
    toast("FUEL EMPTY — engine out");
  }
  if (m.timeLimit > 0 && G.elapsed > m.timeLimit) {
    finishMission(false, "OUT OF TIME", [
      `Gates ${G.rings.passedCount}/${G.rings.total} when the clock ran out`,
      "Fly it faster next time — throttle discipline wins rallies.",
    ]);
    return;
  }
  if (ev.crashed) {
    G.audio.thud();
    finishMission(false, p.fuel <= 0 ? "OUT OF FUEL" : "CRASHED", [
      `Went down ${fmt(p.x / 1000, 1)} km down the valley`,
      `Rings ${G.rings.passedCount}/${G.rings.total}  •  Score ${fmt(G.score)}`,
      "The valley always wins when you stop watching the ground.",
    ]);
    return;
  }
  if (ev.landed) {
    G.audio.thud();
    if (m.needsLanding) {
      const zone = m.landZone;
      const center = (zone[0] + zone[1]) / 2;
      const half = (zone[1] - zone[0]) / 2;
      const acc = clamp(1 - Math.abs(p.x - center) / half, 0, 1);
      const soft = clamp(1 - Math.abs(ev.touchVs || 0) / m.maxLandVsink, 0, 1);
      const landScore = Math.round(400 + 300 * acc + 200 * soft);
      G.score += landScore;
      const inZone = p.x >= zone[0] && p.x <= zone[1];
      const speedOk = p.speed <= m.maxLandSpeed;
      const ok = inZone && speedOk;
      finishMission(ok, ok ? "TOUCHDOWN" : "LANDED SHORT", [
        (inZone ? "In the zone" : "Outside the zone") + "  •  " + fmt(p.speed) + " kt at touchdown",
        "Sink rate " + fmt(Math.abs(ev.touchVs || 0)) + " fpm  •  Fuel left " + Math.round(p.fuel) + "%",
        "Landing score  +" + fmt(landScore),
      ]);
    } else {
      finishMission(true, "LANDED EARLY", [
        `Gates ${G.rings.passedCount}/${G.rings.total} before you put her down`,
        "Score " + fmt(G.score),
      ]);
    }
    return;
  }
  G.rings.update(dt);
}

function update(dt) {
  G.timeSec += dt;
  for (const t of G.toasts) t.life -= dt;
  G.toasts = G.toasts.filter((t) => t.life > 0);

  // Camera follows the plane.
  if (G.plane) {
    G.camX = G.plane.x - PLANE_SCREEN_X / PX_PER_M;
    const targetAlt = G.plane.alt - 1045;
    G.camAlt += (targetAlt - G.camAlt) * Math.min(1, dt * 1.6);
  } else {
    // Menu backdrop: slow drift over the valley.
    G.camX += 26 * dt;
    G.camAlt += (420 - G.camAlt) * Math.min(1, dt * 0.5);
  }

  if (G.state === "flying") updateFlying(dt);

  // Hover tracking for menu buttons.
  const mx = G.input.mouse.x;
  const my = G.input.mouse.y;
  G.hoverButton = null;
  for (const b of G.buttons) {
    if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) G.hoverButton = b.id;
  }
}

function handleKeys() {
  if (G.input.down("KeyM")) {
    G.muted = !G.muted;
    G.audio.setMuted(G.muted);
    G.input.keys.delete("KeyM");
  }
  if (G.state === "flying" && G.input.down("KeyP")) {
    G.state = "paused";
    G.input.keys.delete("KeyP");
  } else if (G.state === "paused" && G.input.down("KeyP")) {
    G.state = "flying";
    G.input.keys.delete("KeyP");
  }
  if (G.state === "briefing" && G.input.down("Enter")) {
    takeOff();
    G.input.keys.delete("Enter");
  }
  if (G.state === "flying" && G.input.down("KeyR")) {
    startMission(G.missionIndex);
    G.input.keys.delete("KeyR");
  }
}

function handleClicks() {
  const click = G.input.consumeClick();
  if (!click) return;
  G.audio.start();
  if (G.state === "menu") {
    for (const b of G.buttons) {
      if (b.id && b.id.startsWith("m") && click.x >= b.x && click.x <= b.x + b.w && click.y >= b.y && click.y <= b.y + b.h) {
        startMission(Number(b.id.slice(1)));
        return;
      }
    }
  }
  if (G.state === "briefing") {
    for (const b of G.buttons) {
      if (b.id === "go" && click.x >= b.x && click.x <= b.x + b.w && click.y >= b.y && click.y <= b.y + b.h) {
        takeOff();
        return;
      }
    }
  }
  if (G.state === "debrief") {
    for (const b of G.buttons) {
      if (click.x >= b.x && click.x <= b.x + b.w && click.y >= b.y && click.y <= b.y + b.h) {
        if (b.id === "again") startMission(G.missionIndex);
        if (b.id === "menu") {
          G.state = "menu";
          G.plane = null;
        }
        return;
      }
    }
  }
}

function render() {
  const ctx = G.ctx;
  // World behind every state: the menu flies over a live valley.
  G.sky.draw(ctx, 1 / 60, G.timeSec, G.camX, G.camAlt);
  G.terrain.draw(ctx, G.camX, G.camAlt, screenY, PX_PER_M, G.timeSec);
  if (G.plane) {
    G.rings.draw(ctx, G.camX, G.camAlt, screenY, PX_PER_M, PX_PER_FT, G.timeSec);
    // Plane shadow on the ground.
    const gy = screenY(G.terrain.groundAlt(G.plane.x));
    const h = clamp(1 - (G.plane.alt - G.terrain.groundAlt(G.plane.x)) / 1400, 0.12, 0.5);
    ctx.fillStyle = `rgba(10, 8, 20, ${h})`;
    ctx.beginPath();
    ctx.ellipse(PLANE_SCREEN_X, gy + 4, 46, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    drawPlane(ctx, PLANE_SCREEN_X, screenY(G.plane.alt), G.plane, G.timeSec);
  }
  if (G.state === "flying" || G.state === "paused") {
    drawHUD(ctx, G);
  }
  if (G.state === "menu") {
    G.buttons = drawMenu(ctx, G);
  } else if (G.state === "briefing") {
    G.buttons = drawBriefing(ctx, G);
  } else if (G.state === "debrief") {
    G.buttons = drawDebrief(ctx, G);
  } else if (G.state === "paused") {
    drawPaused(ctx);
    G.buttons = [];
  } else {
    G.buttons = [];
  }
}

let last = performance.now();
function loop(now) {
  const dt = clamp((now - last) / 1000, 0, 0.05);
  last = now;
  handleKeys();
  handleClicks();
  if (G.state !== "paused") update(dt);
  render();
  if (G.state === "flying") {
    G.audio.update(G.plane.throttle, G.plane.speed, true);
  } else {
    G.audio.update(0, 0, false);
  }
  requestAnimationFrame(loop);
}

// Screenshot staging: ?shot=ring|canyon|landing|menu starts the game composed
// for a still — same code, same world, autopilot at the controls.
function applyShot() {
  const params = new URLSearchParams(location.search);
  const shot = params.get("shot");
  if (!shot) return;
  G.shot = shot;
  G.autopilot = true;
  if (shot === "menu") {
    G.state = "menu";
    G.plane = makePlane(4200, 900, 120, 100);
    G.rings = new Rings(MISSIONS[0].rings);
    G.camX = G.plane.x - PLANE_SCREEN_X / PX_PER_M;
    G.camAlt = G.plane.alt - 1045;
    return;
  }
  if (shot === "ring") {
    startMission(0);
    G.plane.x = 6100;
    G.plane.alt = 1150;
    G.plane.throttle = 0.62;
  } else if (shot === "canyon") {
    startMission(1);
    G.plane.x = 5450;
    G.plane.alt = 1050;
    G.plane.throttle = 0.66;
  } else if (shot === "landing") {
    startMission(2);
    G.plane.x = 13350;
    G.plane.alt = 480;
    G.plane.speed = 115;
    G.plane.throttle = 0.4;
  }
  // Snap the camera to the staged plane so the first frame is already
  // framed right (the camera easing would need a second to settle).
  G.camX = G.plane.x - PLANE_SCREEN_X / PX_PER_M;
  G.camAlt = G.plane.alt - 1045;
  G.state = "flying";
  G.audio.start();
}

applyShot();
requestAnimationFrame(loop);
