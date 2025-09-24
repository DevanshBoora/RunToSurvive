# Run to Survive (Scorch Zone preview)

Premium gamified environmental education app. This first build includes a cinematic splash, world dashboard, and a playable Scorch Zone inspired by Subway Surfers with 3 lanes, well-spaced cacti, and Chance Cards that trigger climate quiz questions.

## Quickstart

1) Install Node.js 18+ (https://nodejs.org)

2) In a terminal (PowerShell), run in this folder:

```
npm install
npm run dev
```

3) Open the printed local URL (e.g. http://localhost:5173)

## Controls

- Left/Right or A/D: switch lanes
- Space: jump
- P: pause
- Esc: back to dashboard

## Scoring

- +5 for safely passing a cactus
- +10 for each correct Chance Card
- Health drops on cactus hit or wrong answer. When it hits 0, game over.

## Create a ZIP

From PowerShell in this folder:

```
Compress-Archive -Path * -DestinationPath RunToSurvive.zip -Force
```

This will create `RunToSurvive.zip` in the same directory for easy sharing.

## Project Structure

- `index.html` — Vite entry
- `src/main.jsx` — React bootstrap
- `src/App.jsx` — screen router (splash, dashboard, scorch)
- `src/components/Splash.jsx` — cinematic splash
- `src/components/Dashboard.jsx` — world selection UI
- `src/components/ScorchZone.jsx` — 3-lane runner with spaced cacti and Chance Cards
- `src/components/quiz/QuizModal.jsx` — quiz overlay
- `src/data/questions.js` — sample climate questions
- `src/styles.css` — UI/game styles

## Notes

- This is a 2.5D web preview capturing your 3D vision. Next steps: full 3D with Three.js/Babylon.js, particle systems, dynamic weather, and real data integration.
