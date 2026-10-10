import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMatchHistory, registerMatch } from "../api/matchesApi";
import type { MatchHistoryQueryParams, MatchRecordInput } from "../api/types";
import { rankingKeys } from "./useRanking";

export const matchHistoryKeys = {
    all: ["matchHistory"] as const,
    list: (playerId: string, page: number, pageSize: number) =>
       ["matchHistory", playerId, page, pageSize] as const,
};

export function useMatchHistory ({
    playerId,
    page = 1,
    pageSize = 10,
}: MatchHistoryQueryParams) {
    return useQuery({
        queryKey: matchHistoryKeys.list(playerId, page, pageSize),
        queryFn: () => getMatchHistory({ playerId, page, pageSize }),
        enabled: playerId.trim().length > 0,
    });
}

export function useRegisterMatch() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (match: MatchRecordInput) => registerMatch(match),

        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: matchHistoryKeys.all,
                }),
                queryClient.invalidateQueries({
                    queryKey: rankingKeys.all,
                }),
            ]);
        },
    });
}