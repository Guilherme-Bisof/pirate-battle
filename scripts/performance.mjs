import { chromium } from "playwright";
import os from "node:os";
import { mkdir, writeFile } from "node:fs/promises";

const BASE_URL = "http://127.0.0.1:4173";
const TARGET_MS = 180_000;
const REPORT_DIR = "reports";

const round = (value, digits = 2) =>
  Number.isFinite(value) ? Number(value.toFixed(digits)) : null;

const percentile = (values, p) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)];
};

const readHeap = (page) =>
  page.evaluate(() => {
    const memory = performance.memory;
    return memory ? memory.usedJSHeapSize : null;
  });

const browser = await chromium.launch({
  headless: false,
  args: ["--enable-precise-memory-info"],
});

try {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });

  // Parte A: cinco ciclos de iniciar e abandonar uma partida.
  const cyclePage = await context.newPage();
  await cyclePage.goto(BASE_URL);

  const cdp = await context.newCDPSession(cyclePage);
  await cdp.send("HeapProfiler.enable");
  await cdp.send("HeapProfiler.collectGarbage");

  const heapBefore = await readHeap(cyclePage);
  const cycleMeasurements = [];

  for (let cycle = 1; cycle <= 5; cycle++) {
    await cyclePage.goto(BASE_URL);

    await cyclePage.getByRole("button", { name: "Play" }).click();
    await cyclePage.getByRole("button", { name: "Pause" }).waitFor();
    await cyclePage.locator("canvas").first().waitFor({
      state: "visible",
      timeout: 15_000,
    });

    await cyclePage.waitForTimeout(1_500);

    // Sai da partida pela interface, acionando a desmontagem do motor.
    await cyclePage.getByRole("button", { name: "Pause" }).click();
    await cyclePage
      .getByRole("button", {
        name: "MAIN MENU",
        exact: true,
      })
      .click();

    await cyclePage
      .getByRole("heading", {
        name: "PIRATE BATTLE",
      })
      .waitFor();

    await cdp.send("HeapProfiler.collectGarbage");

    cycleMeasurements.push({
      cycle,
      heapUsedBytes: await readHeap(cyclePage),
    });

    console.log(`Ciclo ${cycle}/5 concluído.`);
  }

  await cdp.detach();
  await cyclePage.close();

  // Parte B: sessão de até três minutos com instrumentação ativada.
  const perfPage = await context.newPage();

  await perfPage.addInitScript(() => {
    localStorage.setItem(
      "pirate-battle-options",
      JSON.stringify({
        sessionDurationSec: 180,
        spawnIntervalSec: 10,
      }),
    );
  });

  await perfPage.goto(`${BASE_URL}/?perf=1`);

  const browserInfo = await perfPage.evaluate(() => ({
    userAgent: navigator.userAgent,
    viewport: `${innerWidth}x${innerHeight}`,
    devicePixelRatio,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemoryGiB: navigator.deviceMemory ?? null,
  }));

  await perfPage.getByRole("button", { name: "Play" }).click();
  await perfPage.locator("canvas").first().waitFor({
    state: "visible",
    timeout: 15_000,
  });

  const runStarted = Date.now();

  // Movimento circular e disparos para tentar manter a partida ativa.
  for (const key of ["w", "Space", "q", "e", "a"]) {
    await perfPage.keyboard.down(key);
  }

  let rotatingLeft = true;
  let lastRotationChange = Date.now();
  let endedEarly = false;

  while (Date.now() - runStarted < TARGET_MS) {
    await perfPage.waitForTimeout(500);

    if (Date.now() - lastRotationChange >= 500) {
      await perfPage.keyboard.up(rotatingLeft ? "a" : "d");
      rotatingLeft = !rotatingLeft;
      await perfPage.keyboard.down(rotatingLeft ? "a" : "d");
      lastRotationChange = Date.now();
    }

    const gameEnded = await perfPage
      .getByRole("heading", { name: /^(GAME OVER|BATTLE COMPLETE)$/ })
      .count();

    if (gameEnded > 0) {
      endedEarly = true;
      break;
    }
  }

  for (const key of ["w", "Space", "q", "e", "a", "d"]) {
    await perfPage.keyboard.up(key).catch(() => {});
  }

  const wallDurationSeconds = (Date.now() - runStarted) / 1000;

  const performanceData = await perfPage.evaluate(() => {
    const store = window.__PIRATE_BATTLE_PERF__;

    if (!store) return null;

    const frames = store.frameIntervalsMs.filter(
      (value) => Number.isFinite(value) && value > 0,
    );

    const meanMs = frames.length
      ? frames.reduce((sum, value) => sum + value, 0) / frames.length
      : null;

    const samples = store.entitySamples;
    const maximum = (key) =>
      samples.length ? Math.max(...samples.map((sample) => sample[key])) : null;

    return {
      frameCount: frames.length,
      meanFrameIntervalMs: meanMs,
      averageFps: meanMs ? 1000 / meanMs : null,
      p95FrameIntervalMs: percentileForPage(frames, 0.95),
      framesOver16_67ms: frames.filter((value) => value > 16.67).length,
      entitySampleCount: samples.length,
      maxEnemies: maximum("enemies"),
      maxProjectiles: maximum("projectiles"),
      maxExplosions: maximum("explosions"),
      maxTotalEntities: maximum("total"),
      lastEntitySampleMs: samples.length
        ? samples[samples.length - 1].atMs
        : null,
    };

    function percentileForPage(values, p) {
      if (!values.length) return null;
      const sorted = [...values].sort((a, b) => a - b);
      return sorted[
        Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)
      ];
    }
  });

  if (!performanceData) {
    throw new Error(
      "Nenhuma métrica foi coletada. Confirme se o GameEngine recebeu a instrumentação ?perf=1.",
    );
  }

  const result = {
    generatedAt: new Date().toISOString(),
    environment: {
      platform: `${os.type()} ${os.release()}`,
      architecture: os.arch(),
      cpu: os.cpus()[0]?.model ?? "Indisponível",
      logicalCpuCount: os.cpus().length,
      systemMemoryGiB: round(os.totalmem() / 1024 ** 3),
      browserVersion: browser.version(),
      ...browserInfo,
    },
    build: {
      mode: "Vite preview / build de produção",
      viewport: "1280x720",
      deviceScaleFactor: 1,
    },
    memoryCycles: {
      baselineHeapBytes: heapBefore,
      samples: cycleMeasurements,
      finalHeapBytes: cycleMeasurements.length
        ? cycleMeasurements[cycleMeasurements.length - 1].heapUsedBytes
        : null,
      metricNote:
        "Heap JavaScript após coleta de lixo via Chromium CDP; não representa a memória total do processo.",
    },
    gameplay: {
      targetDurationSeconds: TARGET_MS / 1000,
      observedWallDurationSeconds: round(wallDurationSeconds),
      endedBeforeTarget: endedEarly,
      frameCount: performanceData.frameCount,
      averageFps: round(performanceData.averageFps),
      meanFrameIntervalMs: round(performanceData.meanFrameIntervalMs),
      p95FrameIntervalMs: round(performanceData.p95FrameIntervalMs),
      framesOver16_67ms: performanceData.framesOver16_67ms,
      entitySampleCount: performanceData.entitySampleCount,
      maxEnemies: performanceData.maxEnemies,
      maxProjectiles: performanceData.maxProjectiles,
      maxExplosions: performanceData.maxExplosions,
      maxTotalEntities: performanceData.maxTotalEntities,
      lastEntitySampleSeconds: round(
        (performanceData.lastEntitySampleMs ?? 0) / 1000,
      ),
      measurementNote:
        "Medição observacional em Chromium; a sessão pode terminar antes de 180 segundos se o jogador perder.",

      benchmarkMode:
        "Invulnerabilidade ativada via ?perf=1 para permitir uma sessão sustentada; inimigos e projéteis continuam simulados.",
    },
  };

  await mkdir(REPORT_DIR, { recursive: true });

  await writeFile(
    `${REPORT_DIR}/performance-report.json`,
    JSON.stringify(result, null, 2),
    "utf8",
  );

  const formatBytes = (bytes) =>
    bytes == null ? "Indisponível" : `${(bytes / 1024 / 1024).toFixed(2)} MiB`;

  const report = [
    "# Pirate Battle — Relatório de desempenho",
    "",
    `Data: ${result.generatedAt}`,
    "",
    "## Ambiente",
    `- Sistema: ${result.environment.platform} (${result.environment.architecture})`,
    `- CPU: ${result.environment.cpu}`,
    `- Processadores lógicos: ${result.environment.logicalCpuCount}`,
    `- Memória física do sistema: ${result.environment.systemMemoryGiB} GiB`,
    `- Chromium: ${result.environment.browserVersion}`,
    `- User agent: ${result.environment.userAgent}`,
    `- Viewport: ${result.environment.viewport}; DPR ${result.environment.devicePixelRatio}`,
    "",
    "## Cinco ciclos de partida",
    `- Heap inicial: ${formatBytes(result.memoryCycles.baselineHeapBytes)}`,
    ...result.memoryCycles.samples.map(
      (sample) =>
        `- Ciclo ${sample.cycle}: heap após GC = ${formatBytes(sample.heapUsedBytes)}`,
    ),
    `- Heap final: ${formatBytes(result.memoryCycles.finalHeapBytes)}`,
    "",
    "## Sessão de gameplay",
    `- Duração alvo: ${result.gameplay.targetDurationSeconds} s`,
    `- Tempo observado: ${result.gameplay.observedWallDurationSeconds} s`,
    `- A partida terminou antes do alvo: ${result.gameplay.endedBeforeTarget}`,
    `- FPS médio estimado: ${result.gameplay.averageFps ?? "Indisponível"}`,
    `- Intervalo médio entre frames: ${result.gameplay.meanFrameIntervalMs ?? "Indisponível"} ms`,
    `- P95 entre frames: ${result.gameplay.p95FrameIntervalMs ?? "Indisponível"} ms`,
    `- Frames acima de 16,67 ms: ${result.gameplay.framesOver16_67ms}`,
    `- Pico de inimigos: ${result.gameplay.maxEnemies ?? "Indisponível"}`,
    `- Pico de projéteis: ${result.gameplay.maxProjectiles ?? "Indisponível"}`,
    `- Pico de explosões: ${result.gameplay.maxExplosions ?? "Indisponível"}`,
    `- Pico total de entidades amostradas: ${result.gameplay.maxTotalEntities ?? "Indisponível"}`,
    `- Modo de benchmark: ${result.gameplay.benchmarkMode}`,
    "",
    "## Limitações",
    "- O heap JavaScript não equivale à memória total do navegador ou da GPU.",
    "- A contagem de entidades é amostrada aproximadamente a cada seis frames.",
    "- Execução em Chromium visível, resolução e condições da máquina influenciam os resultados.",
    "- Os resultados descrevem esta execução; não são uma garantia de desempenho em outros dispositivos.",
    "",
  ].join("\n");

  await writeFile(`${REPORT_DIR}/performance-report.md`, report, "utf8");

  console.log("\nMedição concluída:");
  console.log(report);
  console.log(`\nArquivos salvos em ${REPORT_DIR}/`);
} finally {
  await browser.close();
}
