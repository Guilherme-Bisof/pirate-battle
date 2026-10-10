import type{
    GameConfig,
    GameOverResult
} from "../game/types/gameConfig"

export interface MatchRecordInput {
    matchId: string;
    playerId: string;
    playerName: string;
    playedAt: string;
    score: number;
    duration: number;
    reason: GameOverResult["reason"];
    config: GameConfig;
}

export interface MatchRecord extends MatchRecordInput {
    registeredAt: string;
}

export interface RankingEntry {
    rank: number;
    matchId: string;
    playerId: string;
    playerName: string;
    playedAt: string;
    score: number;
    duration: number;
    config: GameConfig;
}

export interface PaginationParams {
    page?: number;
    pageSize?: number;
}

export interface PaginatedResponse<T> {
    items: T[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

export interface RankingQueryParams extends PaginationParams {
    config: GameConfig;
}

export interface MatchHistoryQueryParams extends PaginationParams {
    playerId: string;
}

export interface MatchRegistrationResponse {
    match: MatchRecord;
    duplicate: boolean;
}

export type NetworkScenario =
    | "normal"
    | "empty"
    | "slow"
    | "network-error"
    | "server-error"
    | "client-error";