import { delay, http, HttpResponse } from "msw";
import { DEFAULT_CONFIG } from "../game/types/gameConfig";
import type { GameConfig } from "../game/types/gameConfig";
import type {
  MatchRecord,
  MatchRecordInput,
  MatchRegistrationResponse,
  NetworkScenario,
  PaginatedResponse,
  RankingEntry,
} from "../api/types";

const MATCHES_STORAGE_KEY = "pirate-battle-matches";
const SCENARIO_STORAGE_KEY = "pirate-battle-network-scenario";

const fixtureRanking: RankingEntry[] = [
  {
    rank: 1,
    matchId: "fixture-match-001",
    playerId: "player-001",
    playerName: "Captain Morgan",
    playedAt: "2026-10-07T12:00:00.000Z",
    score: 15,
    duration: 90,
    config: { ...DEFAULT_CONFIG },
  },
  {
    rank: 2,
    matchId: "fixture-match-002",
    playerId: "player-002",
    playerName: "Anne Bonny",
    playedAt: "2026-10-06T12:00:00.000Z",
    score: 10,
    duration: 90,
    config: { ...DEFAULT_CONFIG },
  },
  {
    rank: 3,
    matchId: "fixture-match-003",
    playerId: "player-003",
    playerName: "Blackbeard",
    playedAt: "2026-10-05T12:00:00.000Z",
    score: 5,
    duration: 90,
    config: { ...DEFAULT_CONFIG },
  },
];

function getScenario(): NetworkScenario {
  try {
    const stored = localStorage.getItem(SCENARIO_STORAGE_KEY);

    const validScenarios: NetworkScenario[] = [
      "normal",
      "empty",
      "slow",
      "network-error",
      "server-error",
      "client-error",
    ];

    if (stored && validScenarios.includes(stored as NetworkScenario)) {
      return stored as NetworkScenario;
    }
  } catch {
    // Use the default scenario if local storage is unavailable.
  }

  return "normal";
}

function readStoredMatches(): MatchRecord[] {
  try {
    const serialized = localStorage.getItem(MATCHES_STORAGE_KEY);

    if (!serialized) {
      return [];
    }

    const parsed: unknown = JSON.parse(serialized);

    return Array.isArray(parsed) ? (parsed as MatchRecord[]) : [];
  } catch {
    return [];
  }
}

function writeStoredMatches(matches: MatchRecord[]): boolean {
  try {
    localStorage.setItem(MATCHES_STORAGE_KEY, JSON.stringify(matches));

    return true;
  } catch {
    return false;
  }
}

function isSameConfig(first: GameConfig, second: GameConfig): boolean {
  const firstKeys = Object.keys(first) as Array<keyof GameConfig>;
  const secondKeys = Object.keys(second) as Array<keyof GameConfig>;

  return (
    firstKeys.length === secondKeys.length &&
    firstKeys.every((key) => first[key] === second[key])
  );
}

function getPagination(url: URL) {
  const requestedPage = Number(url.searchParams.get("page") ?? 1);
  const requestedPageSize = Number(url.searchParams.get("pageSize") ?? 10);

  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const pageSize =
    Number.isInteger(requestedPageSize) && requestedPageSize > 0
      ? Math.min(requestedPageSize, 50)
      : 10;

  return { page, pageSize };
}

function paginate<T>(
  items: T[],
  page: number,
  pageSize: number,
): PaginatedResponse<T> {
  const start = (page - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    page,
    pageSize,
    totalItems: items.length,
    totalPages: Math.ceil(items.length / pageSize),
  };
}

async function applyScenarioDelay(scenario: NetworkScenario): Promise<void> {
  if (scenario === "slow") {
    await delay(1500);
  }
}

function scenarioError(scenario: NetworkScenario) {
  switch (scenario) {
    case "network-error":
      return HttpResponse.error();

    case "server-error":
      return HttpResponse.json(
        { message: "Simulated server error." },
        { status: 500 },
      );

    case "client-error":
      return HttpResponse.json(
        { message: "Simulated client error." },
        { status: 400 },
      );

    default:
      return null;
  }
}

export const handlers = [
  http.get("/api/ranking", async ({ request }) => {
    const scenario = getScenario();
    await applyScenarioDelay(scenario);

    const error = scenarioError(scenario);

    if (error) {
      return error;
    }

    const url = new URL(request.url);
    const { page, pageSize } = getPagination(url);

    if (scenario === "empty") {
      return HttpResponse.json(paginate<RankingEntry>([], page, pageSize));
    }

    const serializedConfig = url.searchParams.get("config");

    if (!serializedConfig) {
      return HttpResponse.json(
        { message: "A game configuration is required." },
        { status: 400 },
      );
    }

    let requestedConfig: GameConfig;

    try {
      requestedConfig = JSON.parse(serializedConfig) as GameConfig;
    } catch {
      return HttpResponse.json(
        { message: "Invalid game configuration." },
        { status: 400 },
      );
    }

    const savedMatches = readStoredMatches();

    const localEntries: RankingEntry[] = savedMatches
      .filter((match) => isSameConfig(match.config, requestedConfig))
      .map((match) => ({
        rank: 0,
        matchId: match.matchId,
        playerId: match.playerId,
        playerName: match.playerName,
        playedAt: match.playedAt,
        score: match.score,
        duration: match.duration,
        config: match.config,
      }));

    const matchingFixtures = fixtureRanking.filter((entry) =>
      isSameConfig(entry.config, requestedConfig),
    );

    const sortedEntries = [...matchingFixtures, ...localEntries].sort(
      (first, second) =>
        second.score - first.score ||
        first.duration - second.duration ||
        first.playedAt.localeCompare(second.playedAt) ||
        first.playerId.localeCompare(second.playerId) ||
        first.matchId.localeCompare(second.matchId),
    );

    const rankedEntries = sortedEntries.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

    return HttpResponse.json(paginate(rankedEntries, page, pageSize));
  }),

  http.get("/api/matches", async ({ request }) => {
    const scenario = getScenario();
    await applyScenarioDelay(scenario);

    const error = scenarioError(scenario);

    if (error) {
      return error;
    }

    const url = new URL(request.url);
    const { page, pageSize } = getPagination(url);

    if (scenario === "empty") {
      return HttpResponse.json(paginate<MatchRecord>([], page, pageSize));
    }

    const playerId = url.searchParams.get("playerId");

    if (!playerId) {
      return HttpResponse.json(
        { message: "Player ID is required." },
        { status: 400 },
      );
    }

    const matches = readStoredMatches()
      .filter((match) => match.playerId === playerId)
      .sort(
        (first, second) =>
          second.playedAt.localeCompare(first.playedAt) ||
          first.matchId.localeCompare(second.matchId),
      );

    return HttpResponse.json(paginate(matches, page, pageSize));
  }),

  http.post("/api/matches", async ({ request }) => {
    const scenario = getScenario();
    await applyScenarioDelay(scenario);

    const error = scenarioError(scenario);

    if (error) {
      return error;
    }

    let input: MatchRecordInput;

    try {
      input = (await request.json()) as MatchRecordInput;
    } catch {
      return HttpResponse.json(
        { message: "Invalid match payload." },
        { status: 400 },
      );
    }

    if (
      !input.matchId?.trim() ||
      !input.playerId?.trim() ||
      !input.playerName?.trim() ||
      !input.config ||
      !Number.isFinite(input.score) ||
      input.score < 0 ||
      !Number.isFinite(input.duration) ||
      input.duration < 0 ||
      !["TIMEOUT", "DIED"].includes(input.reason)
    ) {
      return HttpResponse.json(
        { message: "The match payload is invalid." },
        { status: 400 },
      );
    }

    const idempotencyKey = request.headers.get("Idempotency-Key");

    if (idempotencyKey && idempotencyKey !== input.matchId) {
      return HttpResponse.json(
        { message: "Idempotency key does not match the match ID." },
        { status: 400 },
      );
    }

    const matches = readStoredMatches();
    const existingMatch = matches.find(
      (match) => match.matchId === input.matchId,
    );

    if (existingMatch) {
      const duplicateResponse: MatchRegistrationResponse = {
        match: existingMatch,
        duplicate: true,
      };

      return HttpResponse.json(duplicateResponse);
    }

    const registeredMatch: MatchRecord = {
      ...input,
      registeredAt: new Date().toISOString(),
    };

    const updatedMatches = [...matches, registeredMatch];

    if (!writeStoredMatches(updatedMatches)) {
      return HttpResponse.json(
        { message: "Unable to persist the match record." },
        { status: 500 },
      );
    }

    const response: MatchRegistrationResponse = {
      match: registeredMatch,
      duplicate: false,
    };

    return HttpResponse.json(response, { status: 201 });
  }),
];
