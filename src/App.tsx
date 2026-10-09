import { useCallback, useState } from "react";
import { GameCanvas } from "./components/GameCanvas";
import type{
  GameOverResult,
  HudState,
} from "./game/types/gameConfig";

import { DEFAULT_CONFIG } from "./game/types/gameConfig";

export default function App() {
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

  const handleGameOver = useCallback((result: GameOverResult) => {
    setGameOverResult(result);
  }, []);

  const handleRestart = () => {
    setGameOverResult(null);
    window.location.reload();
  };

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
          config={DEFAULT_CONFIG}
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
            <button
              onClick={handleRestart}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition"
            >
              Play Again
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
