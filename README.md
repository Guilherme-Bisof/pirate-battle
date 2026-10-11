# Pirate Battle

A single-player, top-down naval shooter built with React, TypeScript and PixiJS. Sail through an arena of islands, fight Chaser and Shooter enemy ships, and earn points before time runs out or your ship is destroyed.

## Project Overview

Pirate Battle separates the React interface from the PixiJS gameplay engine. React handles menus, configuration, navigation, the HUD, and match results. PixiJS renders the arena and runs the game simulation. Ranking and match history are exposed through typed REST-style APIs mocked by Mock Service Worker (MSW).

### Technology Stack

| Responsibility | Technology |
| --- | --- |
| User interface | React |
| Language | TypeScript |
| Game rendering and simulation | PixiJS |
| Remote-state management | TanStack Query |
| HTTP client | Axios |
| API mocking | MSW |
| End-to-end tests | Playwright |
| Build tool | Vite |
| Styling | Tailwind CSS |

## Getting Started

### Prerequisites

- Node.js compatible with the project's Vite version.
- npm.
- Chromium browser installation for Playwright tests.

### Installation

Clone the repository and enter the project directory:

```bash
git clone https://github.com/Guilherme-Bisof/pirate-battle.git
cd pirate-battle
```

Install the dependencies:

```bash
npm ci
```

Install the Chromium browser used by Playwright:

```bash
npx playwright install chromium
```

Start the development server:

```bash
npm run dev
```

Open the local URL printed by Vite in the terminal.

## Available Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Starts the Vite development server. |
| `npm run build` | Runs the TypeScript project build and generates the production bundle. |
| `npm run preview` | Serves the production build locally. |
| `npm run lint` | Runs ESLint. |
| `npx tsc -b` | Checks the TypeScript projects. |
| `npm run test:e2e` | Runs the Playwright end-to-end suite. |
| `npm run test:e2e:report` | Opens the generated Playwright HTML report. |

Run commands from the repository root.

## Gameplay

The player controls a ship in a bounded arena containing islands. Enemy ships spawn during the match and attempt to attack the player. Player projectiles can destroy enemies, increasing the score.

### Controls

| Action | Keyboard |
| --- | --- |
| Move forward | `W` or `Arrow Up` |
| Rotate left | `A` or `Arrow Left` |
| Rotate right | `D` or `Arrow Right` |
| Fire the forward cannon | `Space` |
| Fire the left broadside | `Q` |
| Fire the right broadside | `E` |

Touch controls are available through the in-game controls on supported screens. Movement, rotation and firing are handled by the gameplay input system.

Use the in-game Pause control to suspend and resume the match. The application also pauses when the browser window loses focus or the document becomes hidden.

### Enemy Types

- **Chaser:** pursues the player and deals damage at close range.
- **Shooter:** approaches the player and fires projectiles when within its attack range.

Enemy movement, attacks, collision checks, projectile updates and health changes are handled by the game engine.

### Match End Conditions

A match ends when the configured timer expires or the player's health reaches zero. The result contains the final score, elapsed game duration, end reason and configuration used for that match.

The player can start another match or return to the main menu from the result screen.

## Gameplay Configuration

The Options screen exposes two persisted gameplay settings.

| Option | Supported range | Default |
| --- | --- | --- |
| Game session time | 60–180 seconds | 90 seconds |
| Enemy spawn time | 0.5–10 seconds | 3.5 seconds |

Gameplay parameters are defined by the typed configuration in `src/game/types/gameConfig.ts`. These parameters include ship health and movement, enemy behaviour, projectile damage and speed, attack ranges and weapon cooldowns.

A match uses the configuration supplied when the game engine is created. Changes to saved options are intended to apply to subsequent matches.

Options are stored in browser `localStorage` under `pirate-battle-options`.

## Ranking and Match History

The application uses typed API contracts, Axios and TanStack Query for ranking and match-history operations. MSW intercepts the API requests so the application can run without a private backend.

The mock API exposes these endpoints:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/ranking` | Retrieves a paginated ranking for a game configuration. |
| `GET` | `/api/matches` | Retrieves a player's paginated match history. |
| `POST` | `/api/matches` | Registers a completed match. |

Match records include a match ID, player ID and name, play date, score, elapsed duration, end reason and game configuration.

The ranking combines fixtures with locally persisted match records. Results are filtered by configuration and ordered deterministically. Match registration uses an idempotency key based on the match ID to avoid creating duplicate entries when a request is retried.

Confirmed mock records are stored in the current browser's `localStorage`. This is a demonstration implementation, not a shared, production multiplayer backend.

## Simulating Network Scenarios

MSW supports the following scenarios, selected through the `pirate-battle-network-scenario` local-storage key:

| Scenario | Behaviour |
| --- | --- |
| `normal` | Normal mock API responses. |
| `empty` | Returns empty ranking and history results. |
| `slow` | Adds a fixed 1.5-second delay before responding. |
| `network-error` | Simulates a network-level failure. |
| `server-error` | Returns HTTP 500. |
| `client-error` | Returns HTTP 400. |

To select a scenario, open the browser developer tools, select the Console and execute the following command, replacing `slow` with the desired scenario:

```javascript
localStorage.setItem("pirate-battle-network-scenario", "slow");
location.reload();
```

To restore the default scenario and clear locally stored match data, execute:

```javascript
localStorage.setItem("pirate-battle-network-scenario", "normal");
localStorage.removeItem("pirate-battle-matches");
localStorage.removeItem("pirate-battle-pending-matches");
location.reload();
```

To reset saved gameplay options as well, remove the `pirate-battle-options` key before reloading.

The scenarios above are the scenarios currently available in the mock handlers. Timeout-after-write recovery, variable latency and out-of-order responses require separate implementation and verification before they can be considered supported test scenarios.

## Testing

Run the end-to-end suite:

```bash
npm run test:e2e
```

The Playwright configuration runs Chromium in desktop and mobile projects. It starts a local Vite server and configures screenshots, videos and traces to be retained when a test fails.

Open the HTML report after a run:

```bash
npm run test:e2e:report
```

The most recent recorded local validation passed ESLint, the production build and all 14 Playwright test runs. This is the current suite result, not a claim that every requirement in the original challenge has automated coverage.

The full challenge also calls for combat regression tests, deterministic simulation tests, visual baselines, and recovery tests for difficult network conditions. These areas must be assessed separately against the implemented suite.

## Project Structure

```text
src/
  api/                     Typed contracts and Axios API functions
  components/              React components and gameplay canvas
    screens/               Main menu, options, ranking and history
  game/
    core/                  Game engine, assets and audio
    systems/               Input handling
    types/                 Gameplay configuration and result types
  hooks/                   TanStack Query hooks
  mocks/                   MSW worker and API handlers
tests-e2e/
  fixtures/                Playwright end-to-end tests
public/
  assets/                  Game sprites, UI graphics and sounds
```

## Deployment

**Public demo URL:** https://pirate-battle-psi.vercel.app/


The deployed application must serve the built frontend and the MSW worker so that ranking and match history remain functional without a private backend. Verify the public build by opening it directly, reloading it, completing a match and checking both ranking and history.

## Performance and Delivery Evidence

The challenge requires performance profiling in an optimized build, including FPS, 95th-percentile frame time, entity counts during a three-minute match and memory behaviour over repeated game cycles.

These results must be recorded from actual measurements with the test environment documented. Do not infer performance compliance from a successful production build alone.

The final submission should include `ARCHITECTURE.md`, reproducible test instructions, an HTML test report, profiling evidence and a verified public deployment URL.

## Assets and Licenses

The project uses the game assets supplied with the challenge. Keep asset provenance and applicable licenses documented with the delivered resources. Do not assume that challenge-provided assets are freely redistributable unless their license permits it.
