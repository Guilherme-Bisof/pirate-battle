import { useQuery } from "@tanstack/react-query";
import { getRanking } from "../api/rankingApi";
import type { GameConfig } from "../game/types/gameConfig";

export const rankingKeys = {
  all: ["ranking"] as const,
  list: (config: GameConfig, page: number, pageSize: number) =>
    ["ranking", config, page, pageSize] as const,
};

export function useRanking(config: GameConfig, page = 1, pageSize = 10) {
  return useQuery({
    queryKey: rankingKeys.list(config, page, pageSize),
    queryFn: () => getRanking({ config, page, pageSize }),
  });
}
