# AGENTS.md — March Madness Bracket Atlas

This project is a **static bracket experience**.

Repo:
- `https://github.com/auragoetz52/marchmadness-bracket-atlas`

Live URLs:
- GitHub Pages: `https://auragoetz52.github.io/marchmadness-bracket-atlas/`
- Planned custom domain: `https://marchmadness.agigui.com`

## Project shape

Files that matter most:
- `index.html` — page structure + meta tags
- `styles.css` — all visuals/responsive styling
- `script.js` — bracket rendering, focus logic, zoom/pan, touch behavior
- `data.json` — source bracket content used by the page
- `favicon.svg` — site icon
- `package.json` — static start command for Railway
- `railway.json` — Railway deploy config
- `README.md` — public-facing project notes

## Local testing

Simplest local server:

```powershell
cd C:\code\marchmadness\web
python -m http.server 8000
```

Then open:

- `http://localhost:8000`

If port 8000 is busy, use another port.

## Browser testing expectations

When making visual or interaction changes, test at minimum:

1. **Desktop overview**
   - Full bracket visible
   - Focus buttons work
   - Matchup details open correctly

2. **Mobile layout**
   - Bracket canvas appears before sidebar/helper content
   - Tap targets are usable
   - No broken overlays

3. **Touch interactions**
   - One-finger pan works
   - Pinch zoom works on touch devices / emulation
   - Focus actions do not trap the user in weird zoom states

## Deployment

### GitHub Pages

This repo is already configured to publish from:
- branch: `main`
- folder: `/`

After pushing to `main`, GitHub Pages should update automatically.

### Railway

This is a static deploy.

Start command is:

```bash
npx serve -s . -l $PORT
```

Railway config is already present in `railway.json`.

## Standard update workflow

After making changes:

```powershell
git status
git add .
git commit -m "<clear message>"
git push
```

## Useful GitHub commands

Check auth:

```powershell
gh auth status
```

If auth is missing:

```powershell
gh auth login
```

## Branching

Primary branch:
- `main`

Do not recreate `master`.

## Notes for future agents

- This project is intentionally static. Do not add backend complexity unless explicitly asked.
- Prefer direct edits to `index.html`, `styles.css`, and `script.js` over introducing frameworks.
- Be careful with mobile UX; that is where most regressions will show up.
- If a feature is flaky on iOS/touch, remove or simplify it rather than keeping a broken gimmick.
- Always push changes after validating unless the user says not to.
