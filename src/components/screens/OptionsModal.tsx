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

  return (
    <main className="fixed inset-0 z-30 flex items-center justify-center bg-black/80 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="options-title"
        className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 text-white"
      >
        <h2 id="options-title" className="mb-6 text-2xl font-bold">
          Options
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="session-duration"
              className="mb-2 block text-sm font-medium"
            >
              Game session time (seconds)
            </label>

            <input
              id="session-duration"
              type="number"
              min="60"
              max="180"
              step="1"
              required
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white"
            />

            <p className="mt-1 text-xs text-slate-400">
              Allowed range: 60–180 seconds.
            </p>
          </div>

          <div>
            <label
              htmlFor="enemy-spawn-interval"
              className="mb-2 block text-sm font-medium"
            >
              Enemy spawn time (seconds)
            </label>

            <input
              id="enemy-spawn-interval"
              type="number"
              min="0.5"
              max="10"
              step="0.5"
              required
              value={spawnInterval}
              onChange={(event) => setSpawnInterval(event.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white"
            />

            <p className="mt-1 text-xs text-slate-400">
              Allowed range: 0.5–10 seconds.
            </p>
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-400">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 rounded-lg bg-amber-500 px-4 py-2 font-bold text-slate-950 hover:bg-amber-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              Save
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-600 px-4 py-2 font-bold hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              Cancel
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
