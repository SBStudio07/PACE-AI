# PACE AI (frontend prototype)

Understand your workload. Plan realistically. Adapt continuously.

A frontend-only prototype. There is no backend: all data lives in `localStorage`, and all "AI" is simulated
in `src/services/` (labelled **Demo AI** in the UI). Gemini, Firebase and Firestore are NOT connected.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build into dist/
npm test           # scheduler + recovery logic tests (plain Node, no extra packages)
```

Needs Node.js 18+ (LTS recommended).

## Structure

```
src/
  app/            App.jsx, routes.jsx
  components/     ui/ (Button, Modal, Toast...), layout/ (sidebar + header)
  context/        AppContext.jsx   shared state + localStorage + derived selectors
  data/           demoData.js      Suman Bhattacharya demo profile (demo date 9 Nov 2026)
  features/       tasks/, planner/, document-extraction/
  pages/          Landing, Onboarding, Dashboard, Tasks, Planner, Workload, Recovery, Settings
  services/       mockSchedulingService, mockRecoveryService, mockTaskService, mockAIService
  utils/          dateUtils, workloadUtils, priorityUtils
tests/logic.test.mjs
```

## Swapping in a real backend later

Components only call context actions and the functions in `src/services/`. Replace the bodies of
`generatePlan`, `proposeRecovery`/`runRecovery` and `extractTasksFromPdf` with API calls and keep the
same inputs and outputs.

## Scheduling rules (src/services/mockSchedulingService.js)

- slack = usable study minutes before the deadline - remaining effort; lower slack (adjusted by importance) goes first
- a planning buffer (default 15%) is held back at the end of each study window and never scheduled
- sessions never overlap and never land after a deadline
- work that does not fit is returned as an explicit gap, never dropped
- recovery reuses the same scheduler and only applies after the student approves
