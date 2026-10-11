import { useState } from "react";
import { useMatchHistory } from "../../hooks/useMatchHistory";

interface MatchHistoryTabProps {
  playerId: string;
  onClose: () => void;
  onRanking: () => void;
}

export function MatchHistoryTab({ playerId, onClose, onRanking }: MatchHistoryTabProps) {
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const { data, isPending, isError, error, isFetching, refetch } =
    useMatchHistory({
      playerId,
      page,
      pageSize,
    });

  const totalPages = data?.totalPages ?? 0;

  const formatDuration = (seconds: number) => {
    const totalSeconds = Math.floor(seconds);

    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds,
    ).padStart(2, "0")}`;
  };

  return (
    <main
      className="relative flex min-h-[100dvh] items-center justify-center overflow-x-hidden bg-[#071522] px-3 py-5 text-white sm:px-5"
      style={{
        backgroundImage:
          "linear-gradient(rgba(3, 12, 20, 0.12), rgba(3, 12, 20, 0.28)), url('/assets/ui_scene_background.png')",
        backgroundPosition: "center",
        backgroundSize: "cover",
      }}
    >
      <section
        aria-labelledby="captains-log-title"
        className="relative mx-auto aspect-[1/1] w-[min(92vw,680px)] border-[22px] border-solid border-transparent p-1 sm:border-[28px] sm:p-2"
        style={{
          borderImage:
            "url('/assets/png/default/ui/menu/panel_menu.png') 38 fill / 28px / 0 stretch",
          backgroundColor: "#102331",
        }}
      >
        <div className="relative z-10 flex h-full min-h-[345px] flex-col rounded-sm border-[6px] border-[#a0521e] bg-[#102331]/95 p-2 shadow-[inset_0_4px_8px_rgba(0,0,0,0.8),0_8px_16px_rgba(0,0,0,0.5)] ring-2 ring-[#5c2b09] sm:p-4">
          <header className="text-center">
            <h1
              id="captains-log-title"
              aria-label="Match History"
              className="text-xl font-black uppercase tracking-wide text-[#ffe5ad] drop-shadow sm:text-2xl"
            >
              Captain&apos;s Log
            </h1>

            <nav
              aria-label="Captain's log sections"
              className="mt-2 flex flex-wrap justify-center gap-3"
            >
              <button
                type="button"
                onClick={onRanking}
                className="group relative h-8 w-[132px] shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
              >
                <img
                  src="/assets/png/default/ui/menu/button_secondary_normal.png"
                  alt=""
                  className="absolute inset-0 h-full w-full object-fill transition-opacity group-hover:opacity-0"
                />
                <img
                  src="/assets/png/default/ui/menu/button_secondary_pressed.png"
                  alt=""
                  className="absolute inset-0 h-full w-full object-fill opacity-0 transition-opacity group-hover:opacity-100"
                />
                <span className="relative text-[10px] font-extrabold uppercase tracking-wide text-[#f8e6c2]">
                  Ranking
                </span>
              </button>

              <button
                type="button"
                disabled
                aria-current="page"
                className="relative h-8 w-[132px] shrink-0 cursor-default"
              >
                <img
                  src="/assets/png/default/ui/menu/button_primary_normal.png"
                  alt=""
                  className="absolute inset-0 h-full w-full object-fill"
                />
                <span className="relative text-[10px] font-extrabold uppercase tracking-wide text-[#3c260f]">
                  Match History
                </span>
              </button>
            </nav>

            <p className="mt-2 text-[9px] font-semibold uppercase tracking-wide text-[#cbd3d6]">
              Your recent battles
            </p>
          </header>

          <div className="mt-3 flex-1">
            {isPending && (
              <p
                role="status"
                className="py-8 text-center text-sm text-[#f4ddb0]"
              >
                Loading captain&apos;s log...
              </p>
            )}

            {isError && (
              <div
                role="alert"
                className="rounded-md border border-red-300/30 bg-red-950/70 p-4 text-center"
              >
                <p className="text-sm font-bold text-red-200">
                  Unable to load match history.
                </p>

                <p className="mt-1 text-xs text-red-100/80">
                  {error instanceof Error
                    ? error.message
                    : "An unexpected error occurred."}
                </p>

                <button
                  type="button"
                  onClick={() => void refetch()}
                  className="mt-3 rounded border border-amber-300/50 px-4 py-1.5 text-xs font-bold text-amber-100 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                >
                  Try Again
                </button>
              </div>
            )}

            {!isPending && !isError && data && (
              <>
                {isFetching && (
                  <p
                    role="status"
                    className="mb-2 text-right text-[10px] text-[#d7c69f]"
                  >
                    Updating log...
                  </p>
                )}

                <div
                  className="mb-1 grid grid-cols-[1.6fr_0.6fr_1fr_0.8fr] gap-1 px-2 text-[8px] font-bold uppercase tracking-[0.12em] text-[#cbd3d6] sm:text-[9px]"
                  aria-hidden="true"
                >
                  <span>Date</span>
                  <span>Points</span>
                  <span>Duration</span>
                  <span>Result</span>
                </div>

                {data.items.length === 0 ? (
                  <p className="rounded-md border border-white/10 bg-[#102331]/90 p-5 text-center text-xs text-slate-200">
                    No completed matches have been registered yet.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {data.items.map((match, index) => {
                      const playedAt = new Date(match.playedAt);
                      const resultLabel =
                        match.reason === "TIMEOUT" ? "TIME UP" : "DEFEATED";

                      return (
                        <article
                          key={match.matchId}
                          className={`grid grid-cols-[1.6fr_0.6fr_1fr_0.8fr] items-center gap-1 rounded-md border px-2 py-[7px] text-[9px] sm:text-[11px] ${
                            index === 0
                              ? "border-amber-300/20 bg-amber-300/20"
                              : "border-white/5 bg-[#102331]/90"
                          }`}
                        >
                          <div className="min-w-0">
                            <span className="font-bold text-[#f9e5bd]">
                              {playedAt
                                .toLocaleDateString("en-GB", {
                                  day: "2-digit",
                                  month: "short",
                                })
                                .toUpperCase()}
                            </span>
                            <span className="ml-1 text-[8px] text-slate-400 sm:text-[9px]">
                              ·{" "}
                              {playedAt.toLocaleTimeString("en-GB", {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: false,
                              })}
                            </span>
                          </div>

                          <span className="font-bold text-[#ffd47d]">
                            {match.score}
                          </span>

                          <span className="font-medium text-white">
                            {formatDuration(match.duration)}
                          </span>

                          <span
                            className={`text-[7px] font-bold uppercase sm:text-[9px] ${
                              resultLabel === "TIME UP"
                                ? "text-emerald-200"
                                : "text-red-200"
                            }`}
                          >
                            {resultLabel}
                          </span>
                        </article>
                      );
                    })}
                  </div>
                )}

                <div className="mt-3 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    aria-label="Previous page"
                    disabled={page <= 1 || isFetching}
                    onClick={() => setPage((current) => current - 1)}
                    className="flex size-6 items-center justify-center rounded-full border border-amber-500 bg-[#56321a] text-lg leading-none text-[#ffdf9a] hover:bg-[#805020] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                  >
                    ‹
                  </button>

                  <span className="text-[9px] font-semibold uppercase text-[#e6d8ba]">
                    Page {page} of {Math.max(totalPages, 1)}
                  </span>

                  <button
                    type="button"
                    aria-label="Next page"
                    disabled={
                      page >= totalPages || totalPages === 0 || isFetching
                    }
                    onClick={() => setPage((current) => current + 1)}
                    className="flex size-6 items-center justify-center rounded-full border border-amber-500 bg-[#56321a] text-lg leading-none text-[#ffdf9a] hover:bg-[#805020] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                  >
                    ›
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="mt-auto flex justify-center pt-3">
            <button
              type="button"
              onClick={onClose}
              className="group relative h-10 w-[170px] shrink-0 transition-transform hover:scale-[1.03] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              <img
                src="/assets/png/default/ui/menu/button_primary_normal.png"
                alt=""
                className="absolute inset-0 h-full w-full object-fill transition-opacity group-hover:opacity-0"
              />
              <img
                src="/assets/png/default/ui/menu/button_primary_hover.png"
                alt=""
                className="absolute inset-0 h-full w-full object-fill opacity-0 transition-opacity group-hover:opacity-100"
              />
              <img
                src="/assets/png/default/ui/menu/button_primary_pressed.png"
                alt=""
                className="absolute inset-0 h-full w-full object-fill opacity-0 group-active:opacity-100"
              />
              <span className="relative text-xs font-black uppercase tracking-wide text-[#3c260f]">
                Main Menu
              </span>
            </button>
          </div>
        </div>
      </section>

      <img
        src="/assets/logo_jungle_gaming.svg"
        alt="Jungle Gaming"
        className="pointer-events-none absolute bottom-3 right-3 w-[76px] sm:bottom-4 sm:right-5 sm:w-[90px]"
      />
    </main>
  );
}
