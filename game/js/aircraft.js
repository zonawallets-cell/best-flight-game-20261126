// Meridian Air Rally — the rally plane, drawn in profile with a spinning prop,
// banking wings, nav lights and landing gear. All vector art, no image files.
import { TAU, deg2rad } from "./utils.js";

export function drawPlane(ctx, x, y, plane, timeSec) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(deg2rad(-plane.pitch * 0.7));
  ctx.rotate(deg2rad(plane.bank * 0.12));

  // Soft shadow on the ground far below is drawn by the caller; here is the plane.
  // Wing (far side, darker).
  ctx.fillStyle = "#8c2f26";
  ctx.beginPath();
  ctx.moveTo(-6, 2);
  ctx.lineTo(-34, 16);
  ctx.lineTo(-26, 20);
  ctx.lineTo(8, 8);
  ctx.closePath();
  ctx.fill();

  // Tail.
  ctx.fillStyle = "#a83a2c";
  ctx.beginPath();
  ctx.moveTo(-46, -2);
  ctx.lineTo(-62, -20);
  ctx.lineTo(-54, -22);
  ctx.lineTo(-38, -6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#c04534";
  ctx.beginPath();
  ctx.moveTo(-44, 4);
  ctx.lineTo(-60, 10);
  ctx.lineTo(-58, 14);
  ctx.lineTo(-40, 8);
  ctx.closePath();
  ctx.fill();

  // Fuselage: cream with a red cheatline, nose to tail.
  ctx.fillStyle = "#f3e9d2";
  ctx.beginPath();
  ctx.moveTo(52, 0);
  ctx.quadraticCurveTo(46, -12, 22, -13);
  ctx.quadraticCurveTo(-12, -14, -48, -6);
  ctx.quadraticCurveTo(-54, 0, -48, 5);
  ctx.quadraticCurveTo(-10, 12, 24, 10);
  ctx.quadraticCurveTo(46, 8, 52, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#c04534";
  ctx.beginPath();
  ctx.moveTo(50, 1);
  ctx.quadraticCurveTo(20, 5, -12, 5);
  ctx.lineTo(-46, 2);
  ctx.lineTo(-44, 6);
  ctx.quadraticCurveTo(0, 10, 26, 8);
  ctx.quadraticCurveTo(46, 6, 50, 1);
  ctx.closePath();
  ctx.fill();

  // Canopy: blue glass with a glint.
  ctx.fillStyle = "#274b73";
  ctx.beginPath();
  ctx.moveTo(28, -12);
  ctx.quadraticCurveTo(34, -22, 20, -23);
  ctx.quadraticCurveTo(6, -23, 2, -13);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.moveTo(26, -14);
  ctx.lineTo(18, -21);
  ctx.lineTo(13, -20);
  ctx.lineTo(21, -13);
  ctx.closePath();
  ctx.fill();

  // Registration on the tail.
  ctx.fillStyle = "#f3e9d2";
  ctx.font = "bold 9px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("PK-MRN", -42, -8);

  // Prop: blurred disc + two blades, spinning fast.
  const propX = 54;
  ctx.fillStyle = "rgba(40, 30, 50, 0.18)";
  ctx.beginPath();
  ctx.ellipse(propX, 0, 4, 30, 0, 0, TAU);
  ctx.fill();
  const a = timeSec * 34;
  ctx.strokeStyle = "#2a2138";
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(propX + Math.cos(a) * 6, Math.sin(a) * 6);
  ctx.lineTo(propX + Math.cos(a) * 28, Math.sin(a) * 28);
  ctx.moveTo(propX - Math.cos(a) * 6, -Math.sin(a) * 6);
  ctx.lineTo(propX - Math.cos(a) * 28, -Math.sin(a) * 28);
  ctx.stroke();
  ctx.fillStyle = "#3a2f4e";
  ctx.beginPath();
  ctx.arc(propX, 0, 4.5, 0, TAU);
  ctx.fill();

  // Landing gear, down when slow or flaps out.
  if (plane.gearDown) {
    ctx.strokeStyle = "#2a2138";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(26, 8);
    ctx.lineTo(26, 20);
    ctx.moveTo(-28, 6);
    ctx.lineTo(-28, 20);
    ctx.stroke();
    ctx.fillStyle = "#1c1626";
    ctx.beginPath();
    ctx.arc(26, 22, 5, 0, TAU);
    ctx.arc(-28, 22, 5, 0, TAU);
    ctx.fill();
  }

  // Nav lights: red left, green right, white tail — blinking strobe.
  const strobe = Math.sin(timeSec * 6) > 0.4;
  ctx.fillStyle = "#ff3b30";
  ctx.beginPath();
  ctx.arc(-8, -2, 2.6, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#34d17b";
  ctx.beginPath();
  ctx.arc(6, 8, 2.6, 0, TAU);
  ctx.fill();
  if (strobe) {
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.beginPath();
    ctx.arc(-52, -2, 3.4, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}
