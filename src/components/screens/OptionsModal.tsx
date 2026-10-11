import { useState, type FormEvent } from "react";

interface OptionsModalProps {
  sessionDurationSec: number;
  spawnIntervalSec: number;
  onSave: (options: {
    sessionDurationSec: number;
    spawnIntervalSec: number;
  }) => void;
  onClose: () => void;
}

export function OptionsModal({
  sessionDurationSec,
  spawnIntervalSec,
  onSave,
  onClose,
}: OptionsModalProps) {
  const [duration, setDuration] = useState(String(sessionDurationSec));
  const [spawnInterval, setSpawnInterval] = useState(String(spawnIntervalSec));
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsedDuration = Number(duration);
    const parsedSpawnInterval = Number(spawnInterval);

    if (
      !Number.isInteger(parsedDuration) ||
      parsedDuration < 60 ||
      parsedDuration > 180
    ) {
      setError("Game session time must be between 60 and 180 seconds.");
      return;
    }

    if (
      !Number.isFinite(parsedSpawnInterval) ||
      parsedSpawnInterval < 0.5 ||
      parsedSpawnInterval > 10
    ) {
      setError("Enemy spawn time must be between 0.5 and 10 seconds.");
      return;
    }

    setError("");

    onSave({
      sessionDurationSec: parsedDuration,
      spawnIntervalSec: parsedSpawnInterval,
    });
  }

  function adjustDuration(change: number) {
    setDuration((current) =>
      String(Math.max(60, Math.min(180, Number(current) + change))),
    );
    setError("");
  }

  function adjustSpawnInterval(change: number) {
    setSpawnInterval((current) => {
      const next = Math.round((Number(current) + change) * 2) / 2;
      return String(Math.max(0.5, Math.min(10, next)));
    });
    setError("");
  }

  return (
    <main className="pirate-menu fixed inset-0 z-30 flex items-center justify-center overflow-hidden bg-slate-950 p-3 text-white sm:p-4">
      {/* Cenário original */}
      <img
        src="/assets/ui_scene_background.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
      />

      <div aria-hidden="true" className="absolute inset-0 bg-slate-950/15" />

      {/* Painel com a moldura original */}
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="options-title"
        className="pirate-panel relative z-10 flex aspect-[1.16] w-[min(92vw,720px)] max-h-[82dvh] flex-col items-center px-5 py-6 text-center sm:px-10 sm:py-8"
      >
        <form
          onSubmit={handleSubmit}
          className="flex h-full w-full flex-col items-center justify-center"
        >
          <h2
            id="options-title"
            className="shrink-0 text-3xl font-extrabold text-amber-100 drop-shadow-md sm:text-4xl"
          >
            OPTIONS
          </h2>

          {/* Duração da partida */}
          <div className="mt-5 flex w-full shrink-0 flex-col items-center">
            <label className="text-sm font-bold text-amber-100 sm:text-base">
              Game session time
            </label>

            <div className="mt-6 grid w-[min(100%,300px)] grid-cols-[44px_minmax(0,1fr)_44px] items-center">
              <button
                type="button"
                aria-label="Decrease game session time"
                onClick={() => adjustDuration(-30)}
                disabled={Number(duration) <= 60}
                className="group relative h-11 w-11 transition-transform hover:scale-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <img
                  src="/assets/png/default/ui/controls/button_round_normal.png"
                  alt=""
                  className="absolute inset-0 h-full w-full object-contain group-hover:opacity-0"
                />
                <img
                  src="/assets/png/default/ui/controls/button_round_hover.png"
                  alt=""
                  className="absolute inset-0 h-full w-full object-contain opacity-0 group-hover:opacity-100"
                />
                <img
                  src="/assets/png/default/ui/controls/button_round_pressed.png"
                  alt=""
                  className="absolute inset-0 h-full w-full object-contain opacity-0 group-active:opacity-100"
                />
                <img
                  src="/assets/png/default/ui/controls/icon_minus.png"
                  alt=""
                  className="absolute inset-0 m-auto h-6 w-6 object-contain"
                />
              </button>

              <output
                aria-live="polite"
                className="text-center text-xl font-extrabold tabular-nums text-amber-100 sm:text-2xl"
              >
                {duration} s
              </output>

              <button
                type="button"
                aria-label="Increase game session time"
                onClick={() => adjustDuration(30)}
                disabled={Number(duration) >= 180}
                className="group relative h-11 w-11 justify-self-end transition-transform hover:scale-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <img
                  src="/assets/png/default/ui/controls/button_round_normal.png"
                  alt=""
                  className="absolute inset-0 h-full w-full object-contain group-hover:opacity-0"
                />
                <img
                  src="/assets/png/default/ui/controls/button_round_hover.png"
                  alt=""
                  className="absolute inset-0 h-full w-full object-contain opacity-0 group-hover:opacity-100"
                />
                <img
                  src="/assets/png/default/ui/controls/button_round_pressed.png"
                  alt=""
                  className="absolute inset-0 h-full w-full object-contain opacity-0 group-active:opacity-100"
                />
                <img
                  src="/assets/png/default/ui/controls/icon_plus.png"
                  alt=""
                  className="absolute inset-0 m-auto h-6 w-6 object-contain"
                />
              </button>
            </div>
          </div>

          {/* Intervalo de surgimento dos inimigos */}
          <div className="mt-6 flex w-full shrink-0 flex-col items-center">
            <label className="text-sm font-bold text-amber-100 sm:text-base">
              Enemy spawn time
            </label>

            <div className="mt-6 grid w-[min(100%,300px)] grid-cols-[44px_minmax(0,1fr)_44px] items-center">
              <button
                type="button"
                aria-label="Decrease enemy spawn time"
                onClick={() => adjustSpawnInterval(-0.5)}
                disabled={Number(spawnInterval) <= 0.5}
                className="group relative h-11 w-11 transition-transform hover:scale-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <img
                  src="/assets/png/default/ui/controls/button_round_normal.png"
                  alt=""
                  className="absolute inset-0 h-full w-full object-contain group-hover:opacity-0"
                />
                <img
                  src="/assets/png/default/ui/controls/button_round_hover.png"
                  alt=""
                  className="absolute inset-0 h-full w-full object-contain opacity-0 group-hover:opacity-100"
                />
                <img
                  src="/assets/png/default/ui/controls/button_round_pressed.png"
                  alt=""
                  className="absolute inset-0 h-full w-full object-contain opacity-0 group-active:opacity-100"
                />
                <img
                  src="/assets/png/default/ui/controls/icon_minus.png"
                  alt=""
                  className="absolute inset-0 m-auto h-6 w-6 object-contain"
                />
              </button>

              <output
                aria-live="polite"
                className="text-center text-xl font-extrabold tabular-nums text-amber-100 sm:text-2xl"
              >
                {spawnInterval} s
              </output>

              <button
                type="button"
                aria-label="Increase enemy spawn time"
                onClick={() => adjustSpawnInterval(0.5)}
                disabled={Number(spawnInterval) >= 10}
                className="group relative h-11 w-11 justify-self-end transition-transform hover:scale-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <img
                  src="/assets/png/default/ui/controls/button_round_normal.png"
                  alt=""
                  className="absolute inset-0 h-full w-full object-contain group-hover:opacity-0"
                />
                <img
                  src="/assets/png/default/ui/controls/button_round_hover.png"
                  alt=""
                  className="absolute inset-0 h-full w-full object-contain opacity-0 group-hover:opacity-100"
                />
                <img
                  src="/assets/png/default/ui/controls/button_round_pressed.png"
                  alt=""
                  className="absolute inset-0 h-full w-full object-contain opacity-0 group-active:opacity-100"
                />
                <img
                  src="/assets/png/default/ui/controls/icon_plus.png"
                  alt=""
                  className="absolute inset-0 m-auto h-6 w-6 object-contain"
                />
              </button>
            </div>
          </div>

          {/* Salva as opções e retorna ao menu */}
          {error && (
            <p role="alert" className="mt-2 text-xs text-red-200">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="group relative mt-5 h-[68px] w-[min(100%,300px)] shrink-0 transition-transform hover:scale-[1.03] active:scale-95"
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
            <span className="relative z-10 text-lg font-extrabold text-slate-950">
              MAIN MENU
            </span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="group relative mt-3 h-[68px] w-[min(100%,300px)] shrink-0 transition-transform hover:scale-[1.03] active:scale-95"
          >
            <img
              src="/assets/png/default/ui/menu/button_secondary_normal.png"
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-fill"
            />
            <span className="relative z-10 text-lg font-extrabold text-slate-950">
              CANCEL
            </span>
          </button>
        </form>
      </section>

      {/* Identidade do jogo */}
      <img
        src="/assets/logo_jungle_gaming.svg"
        alt="Jungle Gaming"
        className="absolute bottom-3 right-3 z-20 h-auto w-24 sm:bottom-5 sm:right-5 sm:w-32"
      />
    </main>
  );
}
