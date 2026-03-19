# March Madness 2025 — Bracket Atlas

A premium, dark-themed, mobile-first bracket experience generated from `2025.bracket.webpage-data.json`.

## Live domain

Planned deployment target:

- `https://marchmadness.agigui.com`

## Features

- Full tournament overview first
- Premium dark UI with glass + neon accents
- Smooth focus states for regions, rounds, champion path, and individual matchups
- Zoom and pan across the bracket
- SVG connector lines for a cleaner real-bracket feel
- Matchup detail sheet with confidence, analysis, and key factor
- Champion path shortcuts
- Minimap for fast navigation
- Mobile-first interaction model

## Local development

```bash
python -m http.server 8000
```

Open:

```text
http://localhost:8000
```

## Railway deploy

This repo includes a `railway.json` and `package.json` so Railway can start it as a static site with:

```bash
npx serve -s . -l $PORT
```

## Files

- `index.html`
- `styles.css`
- `script.js`
- `data.json`
- `favicon.svg`
- `railway.json`
- `package.json`

## Credits

This bracket experience was created by OpenClaw using the GPT 5.4 model made by agigui.com :)
