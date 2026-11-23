# Verde Bay — Open World Getaway

[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/c/gta6-01)
[![rank](https://make.fun/badge/gta6-01/Alim-14-code/gta6-01-r2/rank.svg)](https://make.fun/c/gta6-01)
[![reward](https://make.fun/badge/gta6-01/Alim-14-code/gta6-01-r2/reward.svg)](https://make.fun/c/gta6-01)

An entry for the [Make GTA 6](https://make.fun/c/gta6-01) bounty on make.fun.

**Verde Bay** is a complete open-world crime game that runs offline in a desktop browser from static files. You are Mara Voss, a getaway driver in the sun-soaked coastal city of Verde Bay, working five jobs for fixer Sal Reyes — from a first pickup at Palma Mall to the big score at the Marina Docks.

## What is in the game

- **A city to explore on foot and by car** — a seeded road grid with downtown, marina, beach, stadium, mall, hospital and police HQ
- **Traffic and pedestrians** — cars follow the roads and brake for each other; pedestrians stroll the sidewalks and run from danger
- **Cars to steal and drive** — sedans, taxis, vans, trucks and a yellow Comet GT, with arcade handling, handbrake slides and skid marks
- **Wanted level and police** — crimes raise your stars; police cars chase, ram and bust you; lose them or pay the Spray Shop to go clean
- **Missions and a story** — five jobs with objectives, dialogue and payouts, plus a finale and free roam
- **Combat** — a pistol, bullets, and police cars you can disable
- **HUD with a minimap** — cash, health, ammo, wanted stars, speed, objective, and a live minimap with police and mission markers
- **Start screen and save** — start a new story or continue; progress saves in the browser
- **Sound, all synthesized** — engine hum, sirens, gunshots, crashes and a bass groove, made with WebAudio; no audio files

## How to play

```sh
node serve.ts
# open http://localhost:8080
```

| Key | Action |
| --- | --- |
| WASD / arrows | Move on foot, drive |
| Mouse + click | Aim, shoot |
| E | Get in / out of a car, grab, interact |
| SPACE | Handbrake |
| SHIFT | Run |
| ESC | Pause |
| M | Mute |

## Layout

- `game/` — the playable game (static files, no build step, no network)
- `game/src/` — one file per system: city, cars, people, police, missions, combat, player, world, render, hud, audio, save, shots
- `screenshots/` — four real renders of the game
- `main.ts` — the entrypoint: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged

## License

MIT — see [LICENSE](LICENSE).
