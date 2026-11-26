# Meridian Air Rally

[![Make.fun bounty](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![Rank](https://make.fun/badge/best-flight-game-20261126-0057/zonawallets-cell/best-flight-game-20261126/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![Reward](https://make.fun/badge/best-flight-game-20261126-0057/zonawallets-cell/best-flight-game-20261126/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)

A complete flight game that runs offline in a desktop browser. Fly a rally plane
down one golden valley in three sorties: thread ten rings, dash a canyon low
under the ridges, then put her down gentle on runway Meridian 09. Throttle and
pitch discipline, fuel that burns, terrain that bites, and a lit HUD with
altitude, speed and heading.

## Play

Open `game/index.html` in desktop Chrome, or serve the folder:

```sh
node serve.ts
# then open http://localhost:8080
```

Controls: **W/S** or **←/→** throttle, **↑/↓** pitch, **Space** flaps,
**P** pause, **M** mute, **R** restart the sortie. Click a sortie on the menu
to fly it.

## How it is built

- `game/` — the game as static files: `index.html` plus one module per job
  (`physics.js`, `aircraft.js`, `terrain.js`, `sky.js`, `rings.js`,
  `missions.js`, `hud.js`, `audio.js`, `input.js`, `utils.js`, `main.js`).
  No libraries, no network requests, no build step. All art is drawn in
  code; all sound is synthesized with WebAudio.
- `main.ts` — the hand-in program (Node 22, standard library only): copies
  `game/` and `screenshots/` to `/output` and writes `dossier.json`.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.
- `screenshots/` — four real renders of the game running in a browser.

## Entry

Built for the [Make the best flight game](https://make.fun/bounty/best-flight-game-20261126-0057)
bounty on [make.fun](https://make.fun/r/891cqs0k).
