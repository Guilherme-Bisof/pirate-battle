import { useCallback, useEffect, useState, useRef } from "react";
import { GameCanvas } from "./components/GameCanvas";
import type {
  GameConfig,
  GameOverResult,
  HudState,
} from "./game/types/gameConfig";
import { MainMenu } from "./components/screens/MainMenu";
import { OptionsModal } from "./components/screens/OptionsModal";
import { DEFAULT_CONFIG } from "./game/types/gameConfig";
import { RankingTab } from "./components/screens/RankingTab";
import { MatchHistoryTab } from "./components/screens/MatchHistoryTab";
import type { MatchRecordInput } from "./api/types";
import { useRegisterMatch } from "./hooks/useMatchHistory";

const OPTIONS_STORAGE_KEY = "pirate-battle-options";

type SavedOptions = Pick<GameConfig, "sessionDurationSec" | "spawnIntervalSec">;

function loadSavedOptions(): SavedOptions {
  const defaults: SavedOptions = {
    sessionDurationSec: DEFAULT_CONFIG.sessionDurationSec,
    spawnIntervalSec: DEFAULT_CONFIG.spawnIntervalSec,
  };

  try {
    const saved = localStorage.getItem(OPTIONS_STORAGE_KEY);

    if (!saved) {
      return defaults;
    }

    const parsed: unknown = JSON.parse(saved);

    if (typeof parsed !== "object" || parsed === null) {
      return defaults;
    }

    const options = parsed as Partial<SavedOptions>;

    return {
      sessionDurationSec:
        typeof options.sessionDurationSec === "number" &&
        Number.isInteger(options.sessionDurationSec) &&
        options.sessionDurationSec >= 60 &&
        options.sessionDurationSec <= 180
          ? options.sessionDurationSec
          : defaults.sessionDurationSec,

      spawnIntervalSec:
        typeof options.spawnIntervalSec === "number" &&
        options.spawnIntervalSec >= 0.5 &&
        options.spawnIntervalSec <= 10
          ? options.spawnIntervalSec
          : defaults.spawnIntervalSec,
    };
  } catch {
    return defaults;
  }
}

const PENDING_MATCHES_KEY = "pirate-battle-pending-matches";

function readPendingMatches(): MatchRecordInput[] {
  try {
    const serialized = localStorage.getItem(PENDING_MATCHES_KEY);

    if (!serialized) {
      return [];
    }

    const parsed: unknown = JSON.parse(serialized);

    return Array.isArray(parsed) ? (parsed as MatchRecordInput[]) : [];
  } catch {
    return [];
  }
}

function savePendingMatch(match: MatchRecordInput): void {
  try {
    const pending = readPendingMatches();

    if (!pending.some((item) => item.matchId === match.matchId)) {
      localStorage.setItem(
        PENDING_MATCHES_KEY,
        JSON.stringify([...pending, match]),
      );
    }
  } catch {
    console.error("Unable to persist the pending match.");
  }
}

function removePendingMatch(matchId: string): void {
  try {
    const pending = readPendingMatches().filter(
      (match) => match.matchId !== matchId,
    );

    localStorage.setItem(PENDING_MATCHES_KEY, JSON.stringify(pending));
  } catch {
    console.error("Unable to update pending matches.");
  }
}

export default function App() {
  const [screen, setScreen] = useState<
    "menu" | "options" | "game" | "ranking" | "history"
  >("menu");

  const [config, setConfig] = useState<GameConfig>(() => ({
    ...DEFAULT_CONFIG,
    ...loadSavedOptions(),
  }));

  const {
    mutateAsync: submitMatch,
    isPending: isRegisteringMatch,
    isError: isRegistrationError,
    isSuccess: isRegistrationSuccess,
    reset: resetMatchRegistration,
  } = useRegisterMatch();

  const currentMatchIdRef = useRef<string | null>(null);

  const [completedMatchRecord, setCompletedMatchRecord] =
    useState<MatchRecordInput | null>(null);

  const [gameSessionId, setGameSessionId] = useState(0);

  const [hud, setHud] = useState<HudState>({
    health: DEFAULT_CONFIG.playerMaxHealth,
    maxHealth: DEFAULT_CONFIG.playerMaxHealth,
    score: 0,
    timeLeft: DEFAULT_CONFIG.sessionDurationSec,
  });

  const [gameOverResult, setGameOverResult] = useState<GameOverResult | null>(
    null,
  );
  const [isPaused, setIsPaused] = useState(false);

  const handleGameOver = useCallback(
    (result: GameOverResult) => {
      const match: MatchRecordInput = {
        matchId: currentMatchIdRef.current ?? crypto.randomUUID(),
        playerId: "local-player",
        playerName: "You",
        playedAt: new Date().toISOString(),
        score: result.score,
        duration: result.duration,
        reason: result.reason,
        config: result.config,
      };

      currentMatchIdRef.current = match.matchId;

      setGameOverResult(result);
      setCompletedMatchRecord(match);

      savePendingMatch(match);

      void submitMatch(match)
        .then(() => {
          removePendingMatch(match.matchId);
        })
        .catch(() => {
          // Keep the match in local storage for retry.
        });
    },
    [submitMatch],
  );

  useEffect(() => {
    const pendingMatches = readPendingMatches();

    for (const match of pendingMatches) {
      void submitMatch(match)
        .then(() => {
          removePendingMatch(match.matchId);
        })
        .catch(() => {
          // Keep failed records for a future retry.
        });
    }
  }, [submitMatch]);

  function startGame() {
    setGameOverResult(null);
    setIsPaused(false);

    setHud({
      health: config.playerMaxHealth,
      maxHealth: config.playerMaxHealth,
      score: 0,
      timeLeft: config.sessionDurationSec,
    });

    currentMatchIdRef.current = crypto.randomUUID();
    resetMatchRegistration();
    setGameSessionId((current) => current + 1);
    setScreen("game");
  }

  function returnToMenu() {
    setGameOverResult(null);
    setIsPaused(false);
    setScreen("menu");
  }

  function saveOptions(options: SavedOptions) {
    setConfig((current) => ({
      ...current,
      ...options,
    }));

    try {
      localStorage.setItem(OPTIONS_STORAGE_KEY, JSON.stringify(options));
    } catch {
      console.error("Unable to save game options.");
    }

    setScreen("menu");
  }

  if (screen === "menu") {
    return (
      <MainMenu
        onPlay={startGame}
        onOptions={() => setScreen("options")}
        onRanking={() => setScreen("ranking")}
        onMatchHistory={() => setScreen("history")}
      />
    );
  }

  if (screen === "options") {
    return (
      <OptionsModal
        sessionDurationSec={config.sessionDurationSec}
        spawnIntervalSec={config.spawnIntervalSec}
        onSave={saveOptions}
        onClose={() => setScreen("menu")}
      />
    );
  }

  if (screen === "ranking") {
    return <RankingTab config={config} onClose={returnToMenu} />;
  }

  if (screen === "history") {
    return <MatchHistoryTab playerId="local-player" onClose={returnToMenu} />;
  }

  return (
    <main className="w-screen h-screen relative bg-slate-950 overflow-hidden flex flex-col items-center justify-center">
      {/* HUD Provisório */}
      <header className="absolute top-4 left-4 right-4 z-10 flex justify-between items-center px-6 py-3 bg-slate-900/80 backdrop-blur border border-slate-700 rounded-lg text-white font-mono pointer-events-none">
        <div>
          <span className="text-slate-400 text-xs block">HP</span>
          <span className="text-emerald-400 font-bold text-lg">
            {hud.health} / {hud.maxHealth}
          </span>
        </div>
        <div>
          <span className="text-slate-400 text-xs block">TIME</span>
          <span className="text-amber-400 font-bold text-lg">
            {hud.timeLeft}s
          </span>
        </div>
        <div>
          <span className="text-slate-400 text-xs block">SCORE</span>
          <span className="text-cyan-400 font-bold text-lg">{hud.score}</span>
        </div>
        <button
          onClick={() => setIsPaused((prev) => !prev)}
          className="pointer-events-auto px-4 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-sm transition"
        >
          {isPaused ? "Resume" : "Pause"}
        </button>
      </header>

      {/* Instruções de Controle */}
      <footer className="absolute bottom-4 left-4 z-10 px-4 py-2 bg-slate-900/80 backdrop-blur border border-slate-700 rounded text-xs text-slate-300 font-mono pointer-events-none">
        <p>
          Movement: <span className="text-amber-400">W / Seta Cima</span>
        </p>
        <p>
          Steer: <span className="text-amber-400">A / D ou Setas</span>
        </p>
        <p>
          Frontal: <span className="text-amber-400">Space</span> | Cannons:{" "}
          <span className="text-amber-400">Q / E</span>
        </p>
      </footer>

      {/* Canvas PixiJS */}
      <section className="w-full h-full flex items-center justify-center">
        <GameCanvas
          key={gameSessionId}
          config={config}
          isPaused={isPaused}
          onGameOver={handleGameOver}
          onHudUpdate={setHud}
        />
      </section>

      {/* Modal de Fim de Jogo */}
      {gameOverResult && (
        <section className="absolute inset-0 z-20 flex items-center justify-center bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 p-8 rounded-xl max-w-sm w-full text-center text-white">
            <h2 className="text-2xl font-bold mb-2">Game Over</h2>
            <p className="text-slate-400 text-sm mb-4">
              Reason: {gameOverResult.reason}
            </p>
            <p className="text-lg mb-6">
              Final Score:{" "}
              <span className="font-bold text-cyan-400">
                {gameOverResult.score}
              </span>
            </p>

            {isRegisteringMatch && (
              <p role="status" className="mb-4 text-sm text-amber-300">
                Saving match record...
              </p>
            )}

            {isRegistrationSuccess && (
              <p role="status" className="mb-4 text-sm text-emerald-300">
                Match record saved successfully.
              </p>
            )}

            {isRegistrationError && completedMatchRecord && (
              <div
                role="alert"
                className="mb-4 rounded-lg border border-red-800 p-3 text-sm"
              >
                <p className="text-red-300">
                  The match could not be registered. It remains pending on this
                  device.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    resetMatchRegistration();

                    void submitMatch(completedMatchRecord)
                      .then(() => {
                        removePendingMatch(completedMatchRecord.matchId);
                      })
                      .catch(() => {
                        // Preserve the pending record.
                      });
                  }}
                  className="mt-3 rounded border border-red-700 px-3 py-2 hover:bg-red-950"
                >
                  Retry Registration
                </button>
              </div>
            )}
            <button
              onClick={startGame}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition"
            >
              Play Again
            </button>
            <button
              type="button"
              onClick={returnToMenu}
              className="mt-3 w-full rounded-lg border border-slate-600 py-2.5 font-bold text-white hover:bg-slate-800"
            >
              Main Menu
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
