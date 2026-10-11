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

  useEffect(() => {
    const handleWindowBlur = () => {
      setIsPaused(true);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsPaused(true);
      }
    };

    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

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
    return (
      <MatchHistoryTab
        playerId="local-player"
        onClose={returnToMenu}
        onRanking={() => setScreen("ranking")}
      />
    );
  }

  return (
    <main className="w-screen h-screen relative bg-slate-950 overflow-hidden flex flex-col items-center justify-center">
      {/* HUD com assets originais */}
      <header className="absolute top-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-3 font-mono pointer-events-none">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Vida do jogador */}
          <div className="relative h-14 w-40 shrink-0">
            <img
              src="/assets/png/default/ui/hud/counter_panel.png"
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full"
            />
            <img
              src="/assets/png/default/ui/hud/icon_heart.png"
              alt=""
              aria-hidden="true"
              className="absolute left-2.5 top-1/2 h-8 w-8 -translate-y-1/2 object-contain"
            />
            <div className="absolute left-12 right-2 top-1/2 flex -translate-y-1/2 flex-col gap-1">
              <span className="text-[9px] leading-none tracking-widest text-amber-100/70">
                HP
              </span>
              <span className="text-sm font-bold leading-none tabular-nums text-white">
                {hud.health} / {hud.maxHealth}
              </span>
            </div>
          </div>

          {/* Tempo restante */}
          <div className="relative h-14 w-40 shrink-0">
            <img
              src="/assets/png/default/ui/hud/counter_panel.png"
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full"
            />
            <img
              src="/assets/png/default/ui/hud/icon_time.png"
              alt=""
              aria-hidden="true"
              className="absolute left-2.5 top-1/2 h-8 w-8 -translate-y-1/2 object-contain"
            />
            <div className="absolute left-12 right-2 top-1/2 flex -translate-y-1/2 flex-col gap-1">
              <span className="text-[9px] leading-none tracking-widest text-amber-100/70">
                TIME
              </span>
              <span className="text-sm font-bold leading-none tabular-nums text-white">
                {hud.timeLeft}s
              </span>
            </div>
          </div>

          {/* Pontuação */}
          <div className="relative h-14 w-40 shrink-0">
            <img
              src="/assets/png/default/ui/hud/counter_panel.png"
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full"
            />
            <img
              src="/assets/png/default/ui/hud/icon_score.png"
              alt=""
              aria-hidden="true"
              className="absolute left-2.5 top-1/2 h-8 w-8 -translate-y-1/2 object-contain"
            />
            <div className="absolute left-12 right-2 top-1/2 flex -translate-y-1/2 flex-col gap-1">
              <span className="text-[9px] leading-none tracking-widest text-amber-100/70">
                SCORE
              </span>
              <span className="text-sm font-bold leading-none tabular-nums text-white">
                {hud.score}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          aria-label={isPaused ? "Resume" : "Pause"}
          title={isPaused ? "Resume" : "Pause"}
          onClick={() => setIsPaused((prev) => !prev)}
          className="pointer-events-auto group relative h-12 w-12 shrink-0 border-0 bg-transparent p-0 transition-transform hover:scale-105 active:scale-95"
        >
          {/* Estado normal */}
          <img
            src="/assets/png/default/ui/controls/button_round_normal.png"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-contain transition-opacity group-hover:opacity-0 group-active:opacity-0"
          />

          {/* Estado ao passar o mouse */}
          <img
            src="/assets/png/default/ui/controls/button_round_hover.png"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-contain opacity-0 transition-opacity group-hover:opacity-100 group-active:opacity-0"
          />

          {/* Estado pressionado */}
          <img
            src="/assets/png/default/ui/controls/button_round_pressed.png"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-contain opacity-0 transition-opacity group-active:opacity-100"
          />

          {/* Ícone de pausa ou retomar */}
          <img
            src={
              isPaused
                ? "/assets/png/default/ui/controls/icon_play.png"
                : "/assets/png/default/ui/controls/icon_pause.png"
            }
            alt=""
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 z-10 h-6 w-6 -translate-x-1/2 -translate-y-1/2 object-contain"
          />
        </button>
      </header>

      {isPaused && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pause-title"
          className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/15 px-4"
        >
          <section className="pirate-panel relative z-10 flex aspect-[1.16] w-[min(92vw,720px)] max-h-[88dvh] flex-col items-center justify-center px-5 py-6 text-center sm:px-10 sm:py-8">
            <div className="flex w-full flex-col items-center">
              <h2
                id="pause-title"
                className="text-3xl font-extrabold text-amber-100 drop-shadow-md sm:text-4xl"
              >
                PAUSED
              </h2>

              <p className="mt-3 text-sm font-semibold text-amber-100 sm:text-base">
                Ready when you are.
              </p>

              <div className="mt-5 flex w-full flex-col items-center gap-2.5 sm:mt-6 sm:gap-3">
                {/* Resume */}
                <button
                  type="button"
                  aria-label="Continuar partida"
                  onClick={() => setIsPaused(false)}
                  className="group relative h-[68px] w-[min(68%,340px)] shrink-0 transition-transform hover:scale-[1.03] active:scale-95 sm:h-[78px]"
                >
                  <img
                    src="/assets/png/default/ui/menu/button_primary_normal.png"
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full object-fill group-hover:opacity-0"
                  />
                  <img
                    src="/assets/png/default/ui/menu/button_primary_hover.png"
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full object-fill opacity-0 group-hover:opacity-100 group-active:opacity-0"
                  />
                  <img
                    src="/assets/png/default/ui/menu/button_primary_pressed.png"
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full object-fill opacity-0 group-active:opacity-100"
                  />
                  <span className="relative z-10 text-base font-extrabold text-slate-950 sm:text-lg">
                    RESUME
                  </span>
                </button>

                {/* Options */}
                <button
                  type="button"
                  onClick={() => setScreen("options")}
                  className="group relative h-[68px] w-[min(68%,340px)] shrink-0 transition-transform hover:scale-[1.03] active:scale-95 sm:h-[78px]"
                >
                  <img
                    src="/assets/png/default/ui/menu/button_primary_normal.png"
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full object-fill group-hover:opacity-0"
                  />
                  <img
                    src="/assets/png/default/ui/menu/button_primary_hover.png"
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full object-fill opacity-0 group-hover:opacity-100 group-active:opacity-0"
                  />
                  <img
                    src="/assets/png/default/ui/menu/button_primary_pressed.png"
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full object-fill opacity-0 group-active:opacity-100"
                  />
                  <span className="relative z-10 text-base font-extrabold text-slate-950 sm:text-lg">
                    OPTIONS
                  </span>
                </button>

                {/* Main Menu */}
                <button
                  type="button"
                  onClick={returnToMenu}
                  className="group relative h-[68px] w-[min(68%,340px)] shrink-0 transition-transform hover:scale-[1.03] active:scale-95 sm:h-[78px]"
                >
                  <img
                    src="/assets/png/default/ui/menu/button_primary_normal.png"
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full object-fill group-hover:opacity-0"
                  />
                  <img
                    src="/assets/png/default/ui/menu/button_primary_hover.png"
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full object-fill opacity-0 group-hover:opacity-100 group-active:opacity-0"
                  />
                  <img
                    src="/assets/png/default/ui/menu/button_primary_pressed.png"
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full object-fill opacity-0 group-active:opacity-100"
                  />
                  <span className="relative z-10 text-base font-extrabold text-slate-950 sm:text-lg">
                    MAIN MENU
                  </span>
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Instruções de Controle */}
      <footer className="hidden sm:block absolute bottom-4 left-4 z-10 px-4 py-2 bg-slate-900/80 backdrop-blur border border-slate-700 rounded text-xs text-slate-300 font-mono pointer-events-none">
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
        <section className="absolute inset-0 z-20 flex items-center justify-center bg-black/15 p-3 sm:p-6">
          <div
            className="relative flex min-h-[500px] w-[min(92vw,780px)] flex-col items-center justify-center border-[42px] border-solid border-transparent px-4 py-8 text-center text-white sm:aspect-[1.17/1] sm:min-h-0 sm:px-10 sm:py-12"
            style={{
              borderImage:
                "url('/assets/png/default/ui/menu/panel_menu.png') 64 fill / 42px / 0 stretch",
              backgroundColor: "#102331",
            }}
          >
            <h2 className="mb-5 text-2xl font-black tracking-wide text-[#ffe2a0] sm:text-3xl">
              {gameOverResult.reason === "TIMEOUT"
                ? "BATTLE COMPLETE"
                : "GAME OVER"}
            </h2>

            <p className="mb-3 text-5xl font-black leading-none text-[#ffd36c] sm:text-6xl">
              {gameOverResult.score}
            </p>

            <p className="mb-6 text-xs font-bold uppercase tracking-wide text-[#f4d79c] sm:text-sm">
              POINTS ·{" "}
              {`${Math.floor(gameOverResult.duration / 60)
                .toString()
                .padStart(2, "0")}:${Math.floor(gameOverResult.duration % 60)
                .toString()
                .padStart(2, "0")}`}{" "}
              · {gameOverResult.reason === "TIMEOUT" ? "TIME UP" : "DEFEATED"}
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
              type="button"
              onClick={startGame}
              className="mt-2 flex h-[76px] w-full max-w-[330px] items-center justify-center bg-center bg-no-repeat px-6 font-extrabold uppercase text-[#4b2d12] transition hover:brightness-110 active:scale-[0.98]"
              style={{
                backgroundImage:
                  "url('/assets/png/default/ui/menu/button_primary_normal.png')",
                backgroundSize: "100% 100%",
              }}
            >
              PLAY AGAIN
            </button>
            <button
              type="button"
              onClick={returnToMenu}
              className="mt-3 flex h-[76px] w-full max-w-[330px] items-center justify-center bg-center bg-no-repeat px-6 font-extrabold uppercase text-[#4b2d12] transition hover:brightness-110 active:scale-[0.98]"
              style={{
                backgroundImage:
                  "url('/assets/png/default/ui/menu/button_primary_normal.png')",
                backgroundSize: "100% 100%",
              }}
            >
              MAIN MENU
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
