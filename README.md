# Tetris

A browser-based Tetris game built with plain HTML, CSS, and JavaScript — no build step, no dependencies.

Play it live: https://yanzzpro.github.io/tetris/

## Controls

| Key | Action |
| --- | --- |
| &larr; / &rarr; | Move left / right |
| &uarr; | Rotate |
| &darr; | Soft drop |
| Space | Hard drop |
| C | Hold piece |
| P | Pause |

## Features

- 7-bag piece randomizer
- Hold and next-piece previews
- Wall-kick rotation
- Scoring, line clears, and increasing level/speed
- Pause and game-over states

## Running locally

Just open `index.html` in a browser, or serve the folder with any static file server:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.
