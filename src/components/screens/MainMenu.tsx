interface MainMenuProps {
  onPlay: () => void;
  onOptions: () => void;
}

export function MainMenu({ onPlay, onOptions }: MainMenuProps) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-6">
      <section
        aria-labelledby="game-title"
        className="w-full max-w-lg text-center"
      >
        <h1 id="game-title" className="text-5xl font-bold tracking-wider mb-4">
          PIRATE BATTLE
        </h1>

        <p className="text-slate-400 mb-8">
          Navigate the seas. Defeat enemy ships. Make your mark.
        </p>

        <div className="flex flex-col gap-4 mb-10">
          <button
            type="button"
            onClick={onPlay}
            className="w-full rounded-lg bg-amber-500 px-6 py-3 font-bold text-slate-950 hover:bg-amber-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          >
            Play
          </button>

          <button
            type="button"
            onClick={onOptions}
            className="w-full rounded-lg border border-slate-600 px-6 py-3 font-bold hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          >
            Options
          </button>
        </div>

        <section
          aria-labelledby="controls-title"
          className="rounded-lg border border-slate-800 bg-slate-900 p-5 text-left"
        >
          <h2 id="controls-title" className="font-bold mb-3">
            Controls
          </h2>

          <p className="text-sm text-slate-300">Move forward: W / Arrow Up</p>
          <p className="text-sm text-slate-300">Steer: A / D or Arrow Keys</p>
          <p className="text-sm text-slate-300">Fire forward: Space</p>
          <p className="text-sm text-slate-300">Fire cannons: Q / E</p>
        </section>
      </section>
    </main>
  );
}
