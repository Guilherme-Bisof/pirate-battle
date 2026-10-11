# Pirate Battle — Architecture

## 1. Overview

Pirate Battle is a browser-based, single-player naval shooter built with React, TypeScript and PixiJS.

The application separates the interface layer from the real-time gameplay engine. React owns screen navigation, options, HUD state, pause controls and match results. PixiJS renders and updates the arena, ships, projectiles, health indicators and combat effects.

Ranking and match history are exposed through typed HTTP API functions. Axios sends the requests, TanStack Query manages remote state, and Mock Service Worker (MSW) intercepts the API calls. Confirmed match records and pending submissions are stored in the browser's local storage.

There is no private backend. The ranking and history implementation is a local demonstration using fixtures and browser-persisted records.

## 2. High-Level Structure

```text
src/
├── main.tsx
├── App.tsx
├── api/
│   ├── client.ts
│   ├── types.ts
│   ├── rankingApi.ts
│   └── matchesApi.ts
├── components/
│   ├── GameCanvas.tsx
│   ├── hud/
│   │   └── TouchControls.tsx
│   └── screens/
│       ├── MainMenu.tsx
│       ├── OptionsModal.tsx
│       ├── RankingTab.tsx
│       └── MatchHistoryTab.tsx
├── game/
│   ├── core/
│   │   ├── GameEngine.ts
│   │   ├── GameAssets.ts
│   │   └── GameAudio.ts
│   ├── systems/
│   │   └── InputManager.ts
│   └── types/
│       └── gameConfig.ts
├── hooks/
│   ├── useRanking.ts
│   └── useMatchHistory.ts
└── mocks/
    ├── browser.ts
    └── handlers.ts

tests-e2e/
└── fixtures/
```

The actual implementation keeps most gameplay rules, entity state and collision checks inside `GameEngine.ts`. These responsibilities are not yet extracted into independent simulation modules.

## 3. Application and Interface Layer

### React application shell

`src/main.tsx` initializes the MSW browser worker before rendering React. It also creates the TanStack Query client and wraps the application in `StrictMode` and `QueryClientProvider`.

The query client uses a 15-second query stale time, retries failed queries once and refetches queries when the browser window regains focus. Mutations do not automatically retry.

`src/App.tsx` coordinates the primary application state:

- Active screen: menu, options, gameplay, ranking or match history.
- Current gameplay configuration.
- Game session identifier.
- HUD state received from the game engine.
- Pause state and completed match result.
- Match registration state and pending submissions.

React does not own the continuously changing position of every ship or projectile. Those values remain inside the gameplay engine.

### Screens and dialogs

React components provide the main menu, options, ranking and match history. The result dialog is currently rendered directly in `App.tsx`.

The interface uses the supplied game artwork for backgrounds, decorative panels, HUD elements and buttons. Navigation callbacks connect the individual screens to the application shell.

### Game canvas bridge

`src/components/GameCanvas.tsx` is the boundary between React and PixiJS.

On mount, it creates a `GameEngine` and passes the engine:

- The HTML element that will contain the canvas.
- A snapshot of the current game configuration.
- A callback for completed matches.
- A callback for HUD updates.

A second effect forwards pause-state changes to the engine. Touch controls use virtual input methods exposed by the engine's input manager.

The React interface receives selected state updates rather than rendering the complete simulation on every animation frame.

## 4. Gameplay Engine

### Engine ownership

`src/game/core/GameEngine.ts` owns the PixiJS application, display containers, player state, enemies, projectiles, explosion effects, spawn timers, weapon cooldowns, audio integration and game lifecycle.

The arena uses a logical coordinate system of 1280 × 720. On resize, the game scales the stage uniformly and centers it inside the available container. The renderer also uses the browser's device pixel ratio and automatic density adjustment.

### Simulation update order

The engine registers its update method with the PixiJS ticker. The frame delta is converted from milliseconds to seconds and used to update gameplay values.

The current update sequence is:

1. Stop updating if the game is not running or is paused.
2. Advance the remaining match timer and finish the match if it reaches zero.
3. Update player rotation and movement.
4. Process enemy spawning and enemy behaviour.
5. Update frontal and lateral weapons.
6. Move projectiles and resolve impacts.
7. Update explosions and damage-related visual effects.
8. Emit HUD changes when the displayed timer changes or gameplay state requires an update.

This is a delta-time-based update loop, not a separate fixed-timestep simulation. Timing-sensitive behaviour should be tested at different frame rates, particularly after pauses and tab visibility changes.

### Player controls and weapons

`src/game/systems/InputManager.ts` maintains a state containing the player's forward movement, rotation and three firing actions.

The keyboard mappings are:

| Action | Keys |
| --- | --- |
| Move forward | W or Arrow Up |
| Rotate left | A or Arrow Left |
| Rotate right | D or Arrow Right |
| Fire forward | Space |
| Fire left broadside | Q |
| Fire right broadside | E |

The input manager also supports virtual input, allowing touch controls to feed into the same gameplay input state.

The engine processes frontal and lateral weapons separately, with cooldowns and projectile parameters supplied by the game configuration.

### Enemies, projectiles and collisions

The engine supports two enemy types:

- **Chaser:** pursues the player and causes damage through close-range collision.
- **Shooter:** moves towards the player and attacks when its distance satisfies the configured attack range and cooldown.

Player and enemy state, health and attack cooldowns are managed by the engine. Health indicators are represented using PixiJS sprites.

Projectile updates use direction, velocity and remaining lifetime. Projectiles are removed after hitting a target or obstacle, expiring or leaving the arena. Player projectiles reduce enemy health; enemy projectiles can damage the player. Destroyed enemies are removed from the active entity collection, and player-attributed enemy destruction adds one point.

Island collision and projectile-island collision checks are implemented inside `GameEngine.ts`. The current collision implementation uses geometric checks against the island regions rather than a separate general-purpose physics engine.

### Match completion

The engine ends a match with either `TIMEOUT` or `DIED` as its reason. It stops the running state, clears current input and emits a `GameOverResult` containing the score, elapsed duration, end reason and configuration.

The application creates the match record and displays the result screen. Restarting increments the game-session identifier so that React creates a fresh canvas engine with reset gameplay state.

## 5. Configuration and Local Persistence

`src/game/types/gameConfig.ts` defines the `GameConfig`, `HudState` and `GameOverResult` contracts and the default configuration.

The default gameplay configuration includes:

| Parameter | Default |
| --- | ---: |
| Session duration | 90 seconds |
| Enemy spawn interval | 3.5 seconds |
| Player maximum health | 100 |
| Chaser maximum health | 60 |
| Shooter maximum health | 40 |
| Player movement speed | 220 |
| Player rotation speed | 3.0 |
| Projectile speed | 480 |
| Projectile damage | 25 |
| Projectile lifetime | 1.8 seconds |
| Chaser speed | 160 |
| Chaser collision damage | 30 |
| Shooter speed | 110 |
| Shooter attack range | 280 |
| Shooter cooldown | 1.5 seconds |
| Shooter projectile damage | 15 |

The Options screen exposes session duration and enemy spawn interval. Session duration is validated between 60 and 180 seconds; the spawn interval is validated between 0.5 and 10 seconds.

The engine copies the provided configuration when constructed. The resulting configuration is included in the match result and registration record.

Local storage keys used by the current implementation include:

| Key | Purpose |
| --- | --- |
| `pirate-battle-options` | Saved session duration and spawn interval |
| `pirate-battle-network-scenario` | Selected MSW scenario |
| `pirate-battle-matches` | Confirmed mock match records |
| `pirate-battle-pending-matches` | Match records awaiting successful registration |

Local storage is best-effort browser persistence. It does not synchronize records across different browsers or devices.

## 6. Asset Loading, Audio and Resource Lifecycle

### Assets

`src/game/core/GameAssets.ts` loads the ship sprites, projectiles, effects, tiles and HUD textures through PixiJS's asset loader. The resulting `GameAssets` object supplies textures to the game engine.

Required textures are checked before the world is constructed. Missing textures result in descriptive errors rather than being silently substituted.

The asset loader exposes an optional progress callback, but the current `GameEngine` initialization does not connect that callback to a visible loading-progress component.

### Audio

`src/game/core/GameAudio.ts` centralizes game audio playback for events such as starting a match, shooting, scoring, taking damage, pausing, resuming and ending the match.

### Lifecycle and cleanup

`GameCanvas` creates the engine in a React effect and calls `destroy()` during cleanup.

The engine tracks whether it has been initialized or destroyed. It removes the resize listener, detaches keyboard listeners, destroys the audio resources, removes its ticker callback and destroys the PixiJS application and display children.

Initialization checks the destroyed flag after asynchronous initialization and asset loading so a component unmounted during an asynchronous operation does not continue building an active game.

These lifecycle protections are important when React Strict Mode runs additional effect setup and cleanup cycles during development. Repeated mount, restart and unmount behaviour should still be verified through automated and manual testing.

## 7. Ranking and Match History Data Flow

### API contracts

`src/api/types.ts` defines the data contracts for match records, ranking entries, pagination, query parameters and registration responses.

A match record contains a match ID, player ID, player name, timestamp, score, elapsed duration, end reason and the configuration used for the match.

### Axios client

`src/api/client.ts` creates a shared Axios client with `/api` as its base URL, a 5-second request timeout and JSON request/response headers.

`src/api/rankingApi.ts` retrieves ranking pages. The configuration is serialized and supplied with page and page-size parameters.

`src/api/matchesApi.ts` retrieves the current player's history and registers completed matches. Registration sends the match ID in the `Idempotency-Key` HTTP header.

### TanStack Query

`src/hooks/useRanking.ts` defines ranking query keys using the requested configuration, page and page size.

`src/hooks/useMatchHistory.ts` defines history query keys using the player ID, page and page size. The same module exposes the registration mutation.

After a successful registration, the mutation invalidates the ranking and history query families so the UI can request updated data.

Loading, error and empty states are handled by the respective screen components. Query caching and the configured retry policy are managed by TanStack Query.

### MSW mock service

`src/mocks/browser.ts` creates the browser worker from the shared mock handlers. The worker starts before the React application renders, so the application can use the same API contracts without an external backend.

The current handlers implement:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/ranking` | Retrieve a configuration-specific paginated ranking |
| GET | `/api/matches` | Retrieve paginated history for a player |
| POST | `/api/matches` | Register a completed match |

Ranking results combine fixture entries with confirmed local records matching the requested configuration. Entries are ordered by descending score, then ascending duration, play date, player ID and match ID.

Match history is filtered by player and ordered by descending play date, with match ID as a deterministic tie-breaker.

Pagination parameters are validated and page size is limited by the mock handler.

### Registration and pending recovery

When a match ends, `App.tsx` creates a `MatchRecordInput` using the match ID associated with that session. Before submitting the record, the application stores it in the local pending queue. This permits a failed submission to remain available for a later retry.

On successful registration, the corresponding pending record is removed. When the application mounts, pending records are read from local storage and submitted again.

The mock registration handler checks the match ID and idempotency header. If the match already exists, it returns the existing record instead of creating another one. This supports safe retries in the local mock implementation.

This mechanism does not provide server durability or cross-device consistency; those guarantees would require a persistent shared backend.

## 8. Network Scenarios

The MSW handlers support the following scenarios through `pirate-battle-network-scenario`:

| Scenario | Current behaviour |
| --- | --- |
| `normal` | Returns the mock data normally |
| `empty` | Returns empty paginated query results |
| `slow` | Adds a 1.5-second delay |
| `network-error` | Simulates a network-level failure |
| `server-error` | Returns HTTP 500 |
| `client-error` | Returns HTTP 400 |

Scenarios can be selected in the browser console during development:

```javascript
localStorage.setItem("pirate-battle-network-scenario", "slow");
location.reload();
```

Replace `slow` with any supported scenario. To return to normal responses, set the value to `normal` and reload.

The current implementation does not provide dedicated scenarios for variable latency, intentionally out-of-order responses or a timeout after a write has already been committed. Such cases should not be treated as verified capabilities until explicit handlers and corresponding tests are added.

## 9. Testing Strategy and Current Evidence

Playwright is configured in `playwright.config.ts` to run Chromium in desktop and mobile projects. The configuration retains screenshots, videos and traces for failed tests and generates an HTML report.

The current test directory is `tests-e2e/fixtures/`. The existing automated suite verifies selected navigation, ranking, history and network-state behaviours.

The most recent recorded validation for the submitted code passed:

- `npm run lint`
- `npm run build`
- `npm run test:e2e` — 14 test runs passed across the configured projects

These results confirm the current checks only. They do not demonstrate complete automated coverage of every gameplay, accessibility, resilience or performance requirement from the original challenge.

## 10. Known Limitations and Follow-up Work

The following items require separate verification or implementation before claiming complete compliance with the challenge:

1. The simulation uses PixiJS ticker delta time rather than a separate fixed-step simulation.
2. The asset loader exposes progress reporting, but the current canvas bridge does not present a complete visible loading-progress and retry flow.
3. The existing MSW scenario set does not simulate variable latency, out-of-order responses or timeout-after-write recovery as dedicated scenarios.
4. The current Playwright results do not establish coverage of every required combat, collision, pause, registration and recovery scenario.
5. Versioned visual-regression baselines for the menu, arena and result screen have not been confirmed by the current test run.
6. Performance profiling evidence, including FPS, 95th-percentile frame time, entity counts and memory behaviour over repeated game cycles, must be collected separately.
7. Public deployment and its behaviour must be checked against the exact commit delivered for evaluation.

These limitations are listed explicitly so architectural decisions and delivered evidence remain distinguishable from planned improvements.

## 11. Design Rationale

The current implementation keeps the real-time combat state out of React to avoid tying every entity update to React rendering. PixiJS owns rendering and the gameplay ticker; React receives higher-level HUD and match lifecycle updates.

The shared input interface allows keyboard and touch controls to drive the same actions. The typed configuration keeps the primary gameplay tuning values in one contract. Axios and TanStack Query separate HTTP communication and remote-state caching from the UI, while MSW provides repeatable local API behaviour.

Local storage makes options and mock match records available after page reloads without requiring a server. The idempotency key and pending queue support retrying match registration when the mock API is unavailable.

The current boundaries are a practical foundation for this challenge. The main follow-up architectural improvement would be to extract simulation logic from the large `GameEngine` class into smaller independently testable systems, while preserving PixiJS as the renderer and React as the application interface.
