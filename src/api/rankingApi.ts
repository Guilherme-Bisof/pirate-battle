import { apiClient } from "./client";
import type {
    PaginatedResponse,
    RankingEntry,
    RankingQueryParams,
} from "./types";

export async function getRanking ({
    config,
    page = 1,
    pageSize = 10,
}: RankingQueryParams): Promise<PaginatedResponse<RankingEntry>> {
    const response = await apiClient.get<PaginatedResponse<RankingEntry>>("/ranking", {
        params: {
            page,
            pageSize,
            config: JSON.stringify(config),
        },
    });

    return response.data
}