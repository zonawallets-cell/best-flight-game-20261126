// Meridian Air Rally — small math and random helpers shared by every module.
export const TAU = Math.PI * 2;

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function smoothstep(a, b, x) {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

export function deg2rad(d) {
  return (d * Math.PI) / 180;
}

export function rad2deg(r) {
  return (r * 180) / Math.PI;
}

// Deterministic PRNG (mulberry32) so the world is the same every run.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Deterministic 1D value noise: smooth hills from a seed.
export function makeNoise1D(seed) {
  const rand = mulberry32(seed);
  const table = new Float64Array(512);
  for (let i = 0; i < 512; i++) table[i] = rand();
  function hash(i) {
    return table[((i % 512) + 512) % 512];
  }
  function smooth(t) {
    return t * t * (3 - 2 * t);
  }
  return function (x) {
    const i = Math.floor(x);
    const f = x - i;
    return lerp(hash(i), hash(i + 1), smooth(f));
  };
}

// Layered noise: a few octaves of value noise, result in [0, 1].
export function makeFbm(seed, octaves) {
  const layers = [];
  for (let o = 0; o < octaves; o++) layers.push(makeNoise1D(seed + o * 1013));
  return function (x) {
    let sum = 0;
    let amp = 1;
    let total = 0;
    let freq = 1;
    for (let o = 0; o < octaves; o++) {
      sum += layers[o](x * freq) * amp;
      total += amp;
      amp *= 0.5;
      freq *= 2.03;
    }
    return sum / total;
  };
}

export function fmt(n, digits) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: digits || 0,
    maximumFractionDigits: digits || 0,
  });
}

export function pad3(n) {
  const s = String(Math.round(n) % 360);
  return s.padStart(3, "0");
}
