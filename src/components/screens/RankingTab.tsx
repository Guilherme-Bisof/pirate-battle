import { useState } from "react";
import type { GameConfig } from "../../game/types/gameConfig";
import { useRanking } from "../../hooks/useRanking";

interface RankingTabProps {
  config: GameConfig;
  onClose: () => void;
}

export function RankingTab({ config, onClose }: RankingTabProps) {
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const { data, isPending, isError, error, isFetching, refetch } = useRanking(
    config,
    page,
    pageSize,
  );

  const totalPages = data?.totalPages ?? 0;

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <section className="mx-auto w-full max-w-4xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Ranking</h1>
            <p className="mt-1 text-sm text-slate-400">
              Scores for the current game configuration
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
            Loading ranking...
          </p>
        )}

        {isError && (
          <div
            role="alert"
            className="rounded-lg border border-red-800 bg-red-950/40 p-4"
          >
            <p className="font-semibold">Unable to load the ranking.</p>

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
                Updating ranking...
              </p>
            )}

            {data.items.length === 0 ? (
              <p className="rounded-lg border border-slate-800 p-6 text-slate-300">
                No ranking entries for this configuration yet.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-900 text-slate-300">
                    <tr>
                      <th scope="col" className="p-3">
                        Rank
                      </th>
                      <th scope="col" className="p-3">
                        Player
                      </th>
                      <th scope="col" className="p-3">
                        Score
                      </th>
                      <th scope="col" className="p-3">
                        Duration
                      </th>
                      <th scope="col" className="p-3">
                        Date
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {data.items.map((entry) => (
                      <tr
                        key={entry.matchId}
                        className="border-t border-slate-800"
                      >
                        <td className="p-3">{entry.rank}</td>
                        <td className="p-3 font-medium">{entry.playerName}</td>
                        <td className="p-3 text-cyan-300">{entry.score}</td>
                        <td className="p-3">{entry.duration.toFixed(1)}s</td>
                        <td className="p-3 text-slate-400">
                          {new Date(entry.playedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
