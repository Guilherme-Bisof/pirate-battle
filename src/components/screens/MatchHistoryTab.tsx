import { useState } from "react";
import { useMatchHistory } from "../../hooks/useMatchHistory";

interface MatchHistoryTabProps {
  playerId: string;
  onClose: () => void;
}

export function MatchHistoryTab({ playerId, onClose }: MatchHistoryTabProps) {
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const { data, isPending, isError, error, isFetching, refetch } =
    useMatchHistory({
      playerId,
      page,
      pageSize,
    });

  const totalPages = data?.totalPages ?? 0;

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <section className="mx-auto w-full max-w-4xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Match History</h1>
            <p className="mt-1 text-sm text-slate-400">
              Your completed matches
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-600 px-4 py-2 hover:bg-slate-800"
          >
            Main Menu
          </button>
        </div>

        {isPending && (
          <p role="status" className="py-8 text-slate-300">
            Loading match history...
          </p>
        )}

        {isError && (
          <div
            role="alert"
            className="rounded-lg border border-red-800 bg-red-950/40 p-4"
          >
            <p className="font-semibold">Unable to load match history.</p>

            <p className="mt-1 text-sm text-red-200">
              {error instanceof Error
                ? error.message
                : "An unexpected error occurred."}
            </p>

            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-3 rounded border border-red-700 px-3 py-2 hover:bg-red-900"
            >
              Try Again
            </button>
          </div>
        )}

        {!isPending && !isError && data && (
          <>
            {isFetching && (
              <p role="status" className="mb-3 text-xs text-slate-400">
                Updating match history...
              </p>
            )}

            {data.items.length === 0 ? (
              <p className="rounded-lg border border-slate-800 p-6 text-slate-300">
                No completed matches have been registered yet.
              </p>
            ) : (
              <div className="space-y-3">
                {data.items.map((match) => (
                  <article
                    key={match.matchId}
                    className="rounded-lg border border-slate-800 bg-slate-900 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="font-semibold">Match {match.matchId}</h2>

                        <p className="mt-1 text-sm text-slate-400">
                          {new Date(match.playedAt).toLocaleString()}
                        </p>
                      </div>

                      <span className="rounded border border-slate-700 px-2 py-1 text-xs text-amber-300">
                        {match.reason}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <div>
                        <p className="text-xs text-slate-400">Score</p>
                        <p className="text-lg font-bold text-cyan-300">
                          {match.score}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">Duration</p>
                        <p className="font-medium">
                          {match.duration.toFixed(1)}s
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">Registered</p>
                        <p className="text-sm">
                          {new Date(match.registeredAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

            <div className="mt-5 flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={page <= 1 || isFetching}
                onClick={() => setPage((current) => current - 1)}
                className="rounded-lg border border-slate-600 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              <span className="text-sm text-slate-400">
                Page {page} of {totalPages}
              </span>

              <button
                type="button"
                disabled={page >= totalPages || totalPages === 0 || isFetching}
                onClick={() => setPage((current) => current + 1)}
                className="rounded-lg border border-slate-600 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
