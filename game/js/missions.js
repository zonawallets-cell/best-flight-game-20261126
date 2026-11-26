// Meridian Air Rally — the three sorties. Same valley, three different jobs.
import { RUNWAY_X0, RUNWAY_X1 } from "./terrain.js";

export const MISSIONS = [
  {
    id: "ring-run",
    name: "SORTIE 1 — RING RUN",
    short: "Ring Run",
    tagline: "Ten rings down the valley, then put her down on Meridian 09.",
    briefing: [
      "Fly the valley rally: 10 rings, low and fast.",
      "Each ring is worth 100 points and buys you 5 fuel.",
      "Finish by landing on runway Meridian 09 — gentle and slow.",
    ],
    startX: 0,
    startAlt: 800,
    startSpeed: 110,
    fuel: 100,
    timeLimit: 0,
    rings: [
      { x: 1500, alt: 700, r: 90 },
      { x: 2700, alt: 1050, r: 90 },
      { x: 3900, alt: 1050, r: 90 },
      { x: 5100, alt: 1250, r: 90 },
      { x: 6300, alt: 1200, r: 90 },
      { x: 7500, alt: 1150, r: 90 },
      { x: 8700, alt: 750, r: 90 },
      { x: 9900, alt: 1000, r: 90 },
      { x: 11100, alt: 800, r: 90 },
      { x: 12300, alt: 750, r: 90 },
    ],
    needsLanding: true,
    landZone: [RUNWAY_X0 + 200, RUNWAY_X1 - 200],
    maxLandSpeed: 140,
    maxLandVsink: 680,
  },
  {
    id: "canyon-dash",
    name: "SORTIE 2 — CANYON DASH",
    short: "Canyon Dash",
    tagline: "Six gates through the high ridges. Stay low, beat the clock.",
    briefing: [
      "The ridges rise to 1,100 ft here — stay under the tops.",
      "Six gates, 150 points each. Clock stops at the last gate.",
      "Beat 150 seconds for the time bonus. Terrain bites hard.",
    ],
    startX: 2800,
    startAlt: 600,
    startSpeed: 130,
    fuel: 100,
    timeLimit: 210,
    rings: [
      { x: 3600, alt: 853, r: 110, kind: "gate" },
      { x: 4600, alt: 1091, r: 110, kind: "gate" },
      { x: 5600, alt: 1205, r: 110, kind: "gate" },
      { x: 6600, alt: 1216, r: 110, kind: "gate" },
      { x: 7600, alt: 1027, r: 110, kind: "gate" },
      { x: 8600, alt: 597, r: 110, kind: "gate" },
    ],
    needsLanding: false,
    landZone: null,
    maxLandSpeed: 0,
    maxLandVsink: 0,
  },
  {
    id: "precision-landing",
    name: "SORTIE 3 — PRECISION LANDING",
    short: "Precision Landing",
    tagline: "One approach, one runway, one gentle touchdown in the zone.",
    briefing: [
      "You are 9 km out, 2,200 ft up, over the river valley.",
      "Touch down inside the marked zone, under 135 knots,",
      "sinking slower than 650 feet per minute. Flaps help.",
    ],
    startX: 4500,
    startAlt: 2200,
    startSpeed: 120,
    fuel: 100,
    timeLimit: 0,
    rings: [],
    needsLanding: true,
    landZone: [RUNWAY_X0 + 200, RUNWAY_X1 - 300],
    maxLandSpeed: 135,
    maxLandVsink: 650,
  },
];

export function missionStars(mission, score) {
  if (mission.id === "ring-run") return score >= 1500 ? 3 : score >= 1100 ? 2 : score >= 700 ? 1 : 0;
  if (mission.id === "canyon-dash") return score >= 1200 ? 3 : score >= 900 ? 2 : score >= 600 ? 1 : 0;
  return score >= 850 ? 3 : score >= 650 ? 2 : score >= 400 ? 1 : 0;
}
