import { apiClient } from "./client";
import type {
    MatchHistoryQueryParams,
    MatchRecord,
    MatchRecordInput,
    MatchRegistrationResponse,
    PaginatedResponse,
} from "./types";

export async function registerMatch(
    match: MatchRecordInput,
): Promise<MatchRegistrationResponse> {
    const response = await apiClient.post<MatchRegistrationResponse>(
        "/matches",
        match,
        {
            headers: {
                "Idempotency-Key": match.matchId,
            },
        },
    );

    return response.data;
}

export async function getMatchHistory({
    playerId,
    page = 1,
    pageSize = 10,
}: MatchHistoryQueryParams): Promise<PaginatedResponse<MatchRecord>> {
    const response = await apiClient.get<
     PaginatedResponse<MatchRecord>
    >("/matches", {
        params: {
            playerId,
            page,
            pageSize
        },
    });

    return response.data
}