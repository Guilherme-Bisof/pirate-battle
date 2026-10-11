interface MainMenuProps {
  onPlay: () => void;
  onOptions: () => void;
  onRanking: () => void;
  onMatchHistory: () => void;
}

export function MainMenu({
  onPlay,
  onOptions,
  onRanking,
  onMatchHistory,
}: MainMenuProps) {
  return (
    <main className="pirate-menu relative isolate flex min-h-dvh w-full items-center justify-center overflow-hidden bg-slate-950 p-2 text-white sm:p-4">
      {/* Cenário original */}
      <img
        src="/assets/ui_scene_background.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
      />

      <div aria-hidden="true" className="absolute inset-0 bg-slate-950/20" />

      {/* Painel principal */}
      <section
        aria-labelledby="game-title"
        className="relative z-10 aspect-[1.07] w-[min(94vw,760px)] max-h-[88dvh] shrink-0"
      >
        <img
          src="/assets/png/default/ui/menu/panel_menu.png"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-fill"
        />

        <div className="relative z-10 flex h-full w-full flex-col items-center px-[8%] pb-[6%] pt-[7%] text-center">
          <h1 id="game-title" className="sr-only">
            Pirate Battle
          </h1>

          {/* Logo original do jogo */}
          <img
            src="/assets/png/default/ui/menu/title_pirate_battle.png"
            alt=""
            aria-hidden="true"
            className="h-auto w-[90%] max-w-[560px] shrink-0 object-contain"
          />

          <p className="mt-[2%] text-[8px] font-extrabold uppercase tracking-[0.25em] text-amber-100 sm:text-xs sm:tracking-[0.3em]">
            Set sail. Take command.
          </p>

          {/* Ações principais */}
          <div className="mt-[4%] flex w-full flex-col items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onPlay}
              className="group relative h-16 w-[min(78%,360px)] shrink-0 transition-transform hover:scale-[1.03] active:scale-95 sm:h-[80px]"
            >
              <img
                src="/assets/png/default/ui/menu/button_primary_normal.png"
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-contain transition-opacity group-hover:opacity-0"
              />
              <img
                src="/assets/png/default/ui/menu/button_primary_hover.png"
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-contain opacity-0 transition-opacity group-hover:opacity-100 group-active:opacity-0"
              />
              <img
                src="/assets/png/default/ui/menu/button_primary_pressed.png"
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-contain opacity-0 transition-opacity group-active:opacity-100"
              />
              <span className="relative z-10 text-lg font-extrabold text-slate-900 sm:text-2xl">
                Play
              </span>
            </button>

            <button
              type="button"
              onClick={onOptions}
              className="group relative h-16 w-[min(78%,360px)] shrink-0 transition-transform hover:scale-[1.03] active:scale-95 sm:h-[80px]"
            >
              <img
                src="/assets/png/default/ui/menu/button_primary_normal.png"
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-contain transition-opacity group-hover:opacity-0"
              />
              <img
                src="/assets/png/default/ui/menu/button_primary_hover.png"
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-contain opacity-0 transition-opacity group-hover:opacity-100 group-active:opacity-0"
              />
              <img
                src="/assets/png/default/ui/menu/button_primary_pressed.png"
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-contain opacity-0 transition-opacity group-active:opacity-100"
              />
              <span className="relative z-10 text-lg font-extrabold text-slate-900 sm:text-2xl">
                Options
              </span>
            </button>
          </div>

          <img
            src="/assets/png/default/ships/ship_2.png"
            alt=""
            aria-hidden="true"
            className="mt-[2%] h-[13%] max-h-[96px] w-auto shrink-0 object-contain"
          />

          {/* Espaço flexível entre as ações principais e secundárias */}
          <div className="min-h-2 flex-1" />

          <p className="mb-[3%] text-[8px] font-semibold text-amber-100 sm:text-sm">
            Navigate the islands. Survive the battle.
          </p>

          {/* Ranking e histórico */}
          <div className="flex w-full items-center justify-center gap-[3%]">
            <button
              type="button"
              onClick={onRanking}
              className="group relative h-11 w-[min(48%,230px)] shrink-0 transition-transform hover:scale-[1.03] active:scale-95 sm:h-14"
            >
              <img
                src="/assets/png/default/ui/menu/button_secondary_normal.png"
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-fill transition-[filter] group-hover:brightness-110 group-active:brightness-90"
              />
              <span className="relative z-10 text-xs font-extrabold text-white sm:text-base">
                Ranking
              </span>
            </button>

            <button
              type="button"
              onClick={onMatchHistory}
              className="group relative h-11 w-[min(48%,230px)] shrink-0 transition-transform hover:scale-[1.03] active:scale-95 sm:h-14"
            >
              <img
                src="/assets/png/default/ui/menu/button_secondary_normal.png"
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-fill transition-[filter] group-hover:brightness-110 group-active:brightness-90"
              />
              <span className="relative z-10 text-xs font-extrabold text-white sm:text-base">
                Match History
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Marca do estúdio */}
      <img
        src="/assets/logo_jungle_gaming.svg"
        alt="Jungle Gaming"
        className="absolute bottom-3 right-3 z-20 h-auto w-24 sm:bottom-5 sm:right-5 sm:w-32"
      />
    </main>
  );
}
