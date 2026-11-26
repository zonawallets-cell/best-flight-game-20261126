// Meridian Air Rally — the flight model: throttle, pitch, speed, fuel, damage.
// Units: metres along the course, feet of altitude, knots of speed.
import { clamp, deg2rad } from "./utils.js";

export const PLANE_SCREEN_X = 420;
export const PX_PER_M = 3.5;
export const PX_PER_FT = 0.22;
export const HORIZON_Y = 560;

export function makePlane(startX, startAlt, startSpeed, fuel) {
  return {
    x: startX,
    alt: startAlt,
    speed: startSpeed,
    pitch: 0, // degrees, + climbs
    throttle: 0.55,
    vspeed: 0, // feet per minute
    fuel: fuel,
    damage: 0,
    heading: 90,
    flaps: false,
    gearDown: false,
    engineOut: false,
    bank: 0, // visual roll, degrees
  };
}

export class FlightModel {
  // Returns events for this step: { crashed, landed, struck, lowFuel }.
  update(plane, input, dt, terrain) {
    const events = { crashed: false, landed: false, struck: false, lowFuel: false };
    if (plane.engineOut) {
      plane.throttle = 0;
    } else {
      plane.throttle = clamp(plane.throttle + input.throttleAxis() * 0.55 * dt, 0, 1);
    }
    plane.flaps = input.flaps();
    plane.gearDown = plane.flaps || plane.alt < 500;

    // Pitch eases toward the pilot's command; climbs are eager, dives are
    // capped so a steep descent cannot outrun the terrain. The command is
    // proportional, so the autopilot can make gentle corrections.
    const ax = clamp(input.pitchAxis(), -1, 1);
    const pitchTarget = ax >= 0 ? 20 * ax : -12 * -ax;
    plane.pitch += (pitchTarget - plane.pitch) * Math.min(1, dt * 3.2);
    plane.bank += ((plane.pitch * 0.6) - plane.bank) * Math.min(1, dt * 2.5);

    // Speed chases its throttle target; flaps bleed speed for landing.
    let target = 55 + plane.throttle * 150;
    if (plane.flaps) target -= 28;
    plane.speed += (target - plane.speed) * Math.min(1, dt * 0.45);

    // Vertical speed from pitch; a slow wing sinks.
    let vs = plane.speed * 101 * Math.sin(deg2rad(plane.pitch));
    if (plane.speed < 62) vs -= (62 - plane.speed) * 9;
    if (plane.flaps) vs *= 0.82;
    plane.vspeed = vs;
    plane.alt += (vs / 60) * dt;
    plane.x += plane.speed * 0.5144 * dt;

    // The valley winds: heading wanders gently with the course.
    plane.heading = 90 + 12 * Math.sin(plane.x / 2600);

    // Fuel burns with throttle; rings refund some (handled by the caller).
    if (!plane.engineOut) {
      plane.fuel -= (0.12 + plane.throttle * 0.5) * dt;
      if (plane.fuel <= 0) {
        plane.fuel = 0;
        plane.engineOut = true;
        events.lowFuel = true;
      }
    }

    // Ground contact.
    const ground = terrain.groundAlt(plane.x);
    if (plane.alt <= ground + 2) {
      plane.alt = ground + 2;
      const hard = plane.vspeed < -700;
      const onRunway = terrain.onRunway(plane.x);
      const gentle = onRunway && plane.speed < 140 && plane.vspeed > -680;
      if (gentle) {
        events.landed = true;
        events.touchVs = plane.vspeed;
        events.touchSpeed = plane.speed;
        plane.vspeed = 0;
        plane.pitch = 0;
      } else if (hard || plane.damage + 30 >= 100) {
        events.crashed = true;
      } else {
        plane.damage += 30;
        plane.vspeed = 320;
        plane.alt = ground + 8;
        plane.speed *= 0.68;
        plane.pitch = 6;
        events.struck = true;
      }
    }
    if (plane.damage >= 100) events.crashed = true;
    if (plane.alt < 0) plane.alt = 0;
    return events;
  }
}
