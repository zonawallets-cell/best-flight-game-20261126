// Meridian Air Rally — the HUD: lit instruments, gauges, compass, objective,
// warnings and every menu screen. Drawn on canvas so screenshots show it all.
import { clamp, fmt, pad3 } from "./utils.js";

function panel(ctx, x, y, w, h, alpha) {
  ctx.fillStyle = `rgba(12, 10, 26, ${alpha || 0.62})`;
  ctx.strokeStyle = "rgba(255, 205, 130, 0.35)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();
}

function label(ctx, text, x, y, color) {
  ctx.fillStyle = color || "#ffb35c";
  ctx.font = "bold 11px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(text, x, y);
}

function value(ctx, text, x, y, color, size) {
  ctx.fillStyle = color || "#ffe9b0";
  ctx.font = `bold ${size || 26}px system-ui, sans-serif`;
  ctx.textAlign = "left";
  ctx.shadowColor = "rgba(255, 180, 80, 0.7)";
  ctx.shadowBlur = 8;
  ctx.fillText(text, x, y);
  ctx.shadowBlur = 0;
}

export function drawHUD(ctx, G) {
  const p = G.plane;
  const m = G.mission;
  // Top-left: altitude + vertical speed.
  panel(ctx, 16, 14, 210, 74);
  label(ctx, "ALTITUDE  FT", 30, 32);
  value(ctx, fmt(p.alt), 30, 62);
  ctx.fillStyle = p.vspeed > 200 ? "#7dff9e" : p.vspeed < -400 ? "#ff7a6e" : "#ffe9b0";
  ctx.font = "bold 14px system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText((p.vspeed >= 0 ? "+" : "") + fmt(p.vspeed) + " fpm", 212, 82);

  // Top-center: compass strip with heading.
  panel(ctx, 480, 14, 320, 74);
  label(ctx, "HEADING", 494, 32);
  ctx.save();
  ctx.beginPath();
  ctx.rect(494, 40, 292, 40);
  ctx.clip();
  ctx.font = "bold 15px system-ui, sans-serif";
  ctx.textAlign = "center";
  for (let d = -60; d <= 60; d += 15) {
    const hdg = Math.round((p.heading + d) / 15) * 15;
    const off = (hdg - p.heading) * 3.4;
    const cx = 640 + off;
    if (cx < 490 || cx > 790) continue;
    ctx.fillStyle = hdg % 90 === 0 ? "#ffe9b0" : "#b9a8e8";
    ctx.fillText(hdg === 0 ? "N" : hdg === 90 ? "E" : hdg === 180 ? "S" : hdg === 270 ? "W" : String(hdg).padStart(3, "0"), cx, 68);
    ctx.fillRect(cx - 0.5, 72, 1, 6);
  }
  ctx.restore();
  ctx.strokeStyle = "#ffb35c";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(640, 40);
  ctx.lineTo(640, 50);
  ctx.stroke();
  value(ctx, pad3(p.heading) + "°", 700, 32, "#ffe9b0", 16);

  // Top-right: speed + throttle.
  panel(ctx, 1054, 14, 210, 74);
  label(ctx, "AIRSPEED  KT", 1068, 32);
  value(ctx, fmt(p.speed), 1068, 62);
  ctx.fillStyle = "#3a2f5e";
  ctx.fillRect(1068, 70, 182, 8);
  ctx.fillStyle = p.throttle > 0.85 ? "#ff9a3c" : "#7dff9e";
  ctx.fillRect(1068, 70, 182 * p.throttle, 8);
  ctx.fillStyle = "#b9a8e8";
  ctx.font = "11px system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("THR " + Math.round(p.throttle * 100) + "%", 1250, 62);

  // Bottom-left: fuel + damage.
  panel(ctx, 16, 616, 240, 88);
  label(ctx, "FUEL", 30, 634);
  ctx.fillStyle = "#3a2f5e";
  ctx.fillRect(30, 640, 212, 12);
  ctx.fillStyle = p.fuel < 25 ? "#ff5a4e" : "#ffb35c";
  ctx.fillRect(30, 640, 212 * clamp(p.fuel / 100, 0, 1), 12);
  ctx.fillStyle = "#ffe9b0";
  ctx.font = "bold 13px system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(Math.round(p.fuel) + "%", 242, 650);
  label(ctx, "DAMAGE", 30, 676);
  ctx.fillStyle = "#3a2f5e";
  ctx.fillRect(30, 682, 212, 10);
  ctx.fillStyle = p.damage > 60 ? "#ff5a4e" : "#ffd23c";
  ctx.fillRect(30, 682, 212 * clamp(p.damage / 100, 0, 1), 10);

  // Bottom-right: score + objective.
  panel(ctx, 1000, 616, 264, 88);
  label(ctx, "SCORE", 1014, 634);
  value(ctx, fmt(G.score), 1014, 664, "#ffe9b0", 24);
  ctx.fillStyle = "#b9a8e8";
  ctx.font = "12px system-ui, sans-serif";
  ctx.textAlign = "left";
  const obj = G.objectiveText || "";
  ctx.fillText(obj, 1014, 690, 240);

  // Attitude mini-indicator, bottom centre.
  const ax = 640;
  const ay = 668;
  ctx.save();
  ctx.beginPath();
  ctx.arc(ax, ay, 30, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "#2a4a7a";
  ctx.fillRect(ax - 30, ay - 30, 60, 60);
  ctx.save();
  ctx.translate(ax, ay);
  ctx.rotate((-p.pitch * Math.PI) / 180);
  ctx.translate(0, p.pitch * 0.9);
  ctx.fillStyle = "#7a5a34";
  ctx.fillRect(-34, 0, 68, 34);
  ctx.fillStyle = "#8ec9ee";
  ctx.fillRect(-34, -34, 68, 34);
  ctx.restore();
  ctx.strokeStyle = "#ffe9b0";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ax - 18, ay);
  ctx.lineTo(ax - 6, ay);
  ctx.moveTo(ax + 6, ay);
  ctx.lineTo(ax + 18, ay);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = "rgba(255, 205, 130, 0.5)";
  ctx.beginPath();
  ctx.arc(ax, ay, 30, 0, Math.PI * 2);
  ctx.stroke();

  // Timer for the canyon dash.
  if (m && m.timeLimit > 0 && G.state === "flying") {
    const left = Math.max(0, m.timeLimit - G.elapsed);
    ctx.fillStyle = left < 30 ? "#ff5a4e" : "#ffe9b0";
    ctx.font = "bold 22px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(fmt(left, 1) + "s", 640, 120);
  }

  // Warnings.
  if (G.state === "flying") {
    const warns = [];
    if (p.fuel < 25) warns.push("LOW FUEL");
    if (p.engineOut) warns.push("ENGINE OUT — GLIDE TO THE RUNWAY");
    const groundClear = p.alt - G.terrain.groundAlt(p.x);
    if (groundClear < 120 && p.vspeed < -300) warns.push("PULL UP");
    if (warns.length) {
      ctx.fillStyle = Math.sin(G.timeSec * 8) > 0 ? "#ff5a4e" : "#ffb35c";
      ctx.font = "bold 26px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(warns.join("  •  "), 640, 170);
    }
  }

  // Toasts (ring passed, touchdown, etc).
  ctx.textAlign = "center";
  let ty = 210;
  for (const t of G.toasts) {
    ctx.globalAlpha = clamp(t.life, 0, 1);
    ctx.fillStyle = "#ffe9b0";
    ctx.font = "bold 22px system-ui, sans-serif";
    ctx.fillText(t.text, 640, ty);
    ty += 30;
  }
  ctx.globalAlpha = 1;
}

function bigButton(ctx, x, y, w, h, text, hot) {
  ctx.fillStyle = hot ? "#ffb35c" : "#2c2350";
  ctx.strokeStyle = "#ffb35c";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = hot ? "#1c1626" : "#ffe9b0";
  ctx.font = "bold 20px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(text, x + w / 2, y + h / 2 + 7);
  return { x, y, w, h };
}

export function drawMenu(ctx, G) {
  ctx.fillStyle = "rgba(10, 8, 24, 0.55)";
  ctx.fillRect(0, 0, 1280, 720);
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffe9b0";
  ctx.font = "bold 64px system-ui, sans-serif";
  ctx.shadowColor = "rgba(255, 170, 80, 0.8)";
  ctx.shadowBlur = 24;
  ctx.fillText("MERIDIAN AIR RALLY", 640, 130);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ffb35c";
  ctx.font = "20px system-ui, sans-serif";
  ctx.fillText("Three sorties down one golden valley. Fly the rings, mind the fuel, land her gentle.", 640, 168);
  const buttons = [];
  G.missions.forEach((m, i) => {
    const y = 230 + i * 92;
    const done = G.best[m.id];
    const stars = done ? "★".repeat(done.stars) + "☆".repeat(3 - done.stars) : "";
    const hot = G.hoverButton === "m" + i;
    const b = bigButton(ctx, 380, y, 520, 64, m.name + (stars ? "   " + stars : ""), hot);
    b.id = "m" + i;
    buttons.push(b);
    ctx.fillStyle = "#b9a8e8";
    ctx.font = "15px system-ui, sans-serif";
    ctx.fillText(m.tagline, 640, y + 84);
  });
  ctx.fillStyle = "#8f83b8";
  ctx.font = "14px system-ui, sans-serif";
  ctx.fillText("W/S throttle  •  ↑/↓ pitch  •  Space flaps  •  P pause  •  M mute  •  click a sortie to fly", 640, 540);
  ctx.fillText("Total score " + fmt(G.totalScore) + "  •  best flight " + fmt(G.bestScore), 640, 566);
  return buttons;
}

export function drawBriefing(ctx, G) {
  const m = G.mission;
  ctx.fillStyle = "rgba(10, 8, 24, 0.6)";
  ctx.fillRect(0, 0, 1280, 720);
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffe9b0";
  ctx.font = "bold 44px system-ui, sans-serif";
  ctx.fillText(m.name, 640, 150);
  ctx.fillStyle = "#ffb35c";
  ctx.font = "20px system-ui, sans-serif";
  ctx.fillText(m.tagline, 640, 190);
  ctx.fillStyle = "#e8e0ff";
  ctx.font = "19px system-ui, sans-serif";
  m.briefing.forEach((line, i) => ctx.fillText(line, 640, 250 + i * 32));
  const b = bigButton(ctx, 490, 420, 300, 60, "TAKE OFF  →", G.hoverButton === "go");
  b.id = "go";
  ctx.fillStyle = "#8f83b8";
  ctx.font = "14px system-ui, sans-serif";
  ctx.fillText("or press Enter", 640, 510);
  return [b];
}

export function drawDebrief(ctx, G) {
  const d = G.debrief;
  ctx.fillStyle = "rgba(10, 8, 24, 0.62)";
  ctx.fillRect(0, 0, 1280, 720);
  ctx.textAlign = "center";
  ctx.fillStyle = d.ok ? "#7dff9e" : "#ff8a7a";
  ctx.font = "bold 46px system-ui, sans-serif";
  ctx.fillText(d.title, 640, 150);
  ctx.fillStyle = "#ffe9b0";
  ctx.font = "bold 30px system-ui, sans-serif";
  ctx.fillText("Score  " + fmt(d.score), 640, 210);
  ctx.fillStyle = "#ffb35c";
  ctx.font = "bold 34px system-ui, sans-serif";
  ctx.fillText("★".repeat(d.stars) + "☆".repeat(3 - d.stars), 640, 258);
  ctx.fillStyle = "#e8e0ff";
  ctx.font = "18px system-ui, sans-serif";
  d.lines.forEach((line, i) => ctx.fillText(line, 640, 310 + i * 30));
  const buttons = [];
  const b1 = bigButton(ctx, 330, 470, 260, 60, "FLY AGAIN", G.hoverButton === "again");
  b1.id = "again";
  buttons.push(b1);
  const b2 = bigButton(ctx, 690, 470, 260, 60, "MENU", G.hoverButton === "menu");
  b2.id = "menu";
  buttons.push(b2);
  return buttons;
}

export function drawPaused(ctx) {
  ctx.fillStyle = "rgba(10, 8, 24, 0.55)";
  ctx.fillRect(0, 0, 1280, 720);
  ctx.fillStyle = "#ffe9b0";
  ctx.font = "bold 44px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("PAUSED", 640, 340);
  ctx.fillStyle = "#b9a8e8";
  ctx.font = "18px system-ui, sans-serif";
  ctx.fillText("Press P to keep flying", 640, 380);
}
