import { Assets, Rectangle, Texture } from "pixi.js";

const ASSET_PATHS = {
  playerShip: "/assets/png/default/ships/ship_1.png",
  chaserShip: "/assets/png/default/ships/ship_2.png",
  shooterShip: "/assets/png/default/ships/ship_3.png",
  cannonBall: "/assets/png/default/ship_parts/cannon_ball.png",
  explosion1: "/assets/png/default/effects/explosion_1.png",
  explosion2: "/assets/png/default/effects/explosion_2.png",
  explosion3: "/assets/png/default/effects/explosion_3.png",
  fire1: "/assets/png/default/effects/fire_1.png",
  fire2: "/assets/png/default/effects/fire_2.png",
  counterPanel: "/assets/png/default/ui/hud/counter_panel.png",
  enemyHealthFillGreen:
    "/assets/png/default/ui/hud/enemy_health_fill_green.png",
  enemyHealthFillRed: "/assets/png/default/ui/hud/enemy_health_fill_red.png",
  enemyHealthFrame: "/assets/png/default/ui/hud/enemy_health_frame.png",
  healthFillAmber: "/assets/png/default/ui/hud/health_fill_amber.png",
  healthFillGreen: "/assets/png/default/ui/hud/health_fill_green.png",
  healthFillRed: "/assets/png/default/ui/hud/health_fill_red.png",
  healthFrame: "/assets/png/default/ui/hud/health_frame.png",
  heartIcon: "/assets/png/default/ui/hud/icon_heart.png",
  scoreIcon: "/assets/png/default/ui/hud/icon_score.png",
  timeIcon: "/assets/png/default/ui/hud/icon_time.png",
  tileSheet: "/assets/tilesheet/tiles_sheet.png",
  dinghyLarge1: "/assets/png/default/ships/dinghy_large_1.png",
  dinghyLarge2: "/assets/png/default/ships/dinghy_large_2.png",
  dinghyLarge3: "/assets/png/default/ships/dinghy_large_3.png",
  dinghySmall1: "/assets/png/default/ships/dinghy_small_1.png",
  dinghySmall2: "/assets/png/default/ships/dinghy_small_2.png",
  dinghySmall3: "/assets/png/default/ships/dinghy_small_3.png",
  wood1: "/assets/png/default/ship_parts/wood_1.png",
  wood2: "/assets/png/default/ship_parts/wood_2.png",
  wood3: "/assets/png/default/ship_parts/wood_3.png",
  wood4: "/assets/png/default/ship_parts/wood_4.png",

  ...Object.fromEntries(
    Array.from({ length: 21 }, (_, index) => {
      const shipId = index + 4;

      return [`ship${shipId}`, `/assets/png/default/ships/ship_${shipId}.png`];
    }),
  ),
} as const;

export interface GameAssets {
  playerShip: Texture;
  chaserShip: Texture;
  shooterShip: Texture;
  cannonBall: Texture;
  explosions: Texture[];
  fire: Texture[];
  islandBase: Texture;

  tiles: Record<number, Texture>;
  hud: {
    counterPanel: Texture;
    enemyHealthFillGreen: Texture;
    enemyHealthFillRed: Texture;
    enemyHealthFrame: Texture;
    healthFillAmber: Texture;
    healthFillGreen: Texture;
    healthFillRed: Texture;
    healthFrame: Texture;
    heartIcon: Texture;
    scoreIcon: Texture;
    timeIcon: Texture;
  };
  dinghies: Texture[];
  woodDebris: Texture[];
  enemyShips: Texture[];
}

export async function loadGameAssets(
  onProgress?: (loaded: number, total: number) => void,
): Promise<GameAssets> {
  const tileEntries: [string, string][] = Array.from(
    { length: 96 },
    (_, index) => {
      const tileId = index + 1;

      return [`tile${tileId}`, `/assets/png/default/tiles/tile_${tileId}.png`];
    },
  );

  const staticEntries: [string, string][] = Object.entries(ASSET_PATHS).map(
    ([name, path]) => [name, path],
  );

  const entries = [...staticEntries, ...tileEntries];
  const total = entries.length;
  let loadedCount = 0;

  const textures = new Map<string, Texture>();

  await Promise.all(
    entries.map(async ([name, path]) => {
      const texture = await Assets.load<Texture>(path);

      textures.set(name, texture);
      loadedCount += 1;
      onProgress?.(loadedCount, total);
    }),
  );

  function getTexture(name: string): Texture {
    const texture = textures.get(name);

    if (!texture) {
      throw new Error(`Game asset failed to load: ${name}`);
    }

    return texture;
  }

  const tileSheet = getTexture("tileSheet");

  const islandBase = new Texture({
    source: tileSheet.source,
    frame: new Rectangle(320, 0, 256, 256),
  });

  const tiles: Record<number, Texture> = {};

  for (let tileId = 1; tileId <= 96; tileId += 1) {
    tiles[tileId] = getTexture(`tile${tileId}`);
  }

  return {
    playerShip: getTexture("playerShip"),
    chaserShip: getTexture("chaserShip"),
    shooterShip: getTexture("shooterShip"),
    cannonBall: getTexture("cannonBall"),
    explosions: [
      getTexture("explosion1"),
      getTexture("explosion2"),
      getTexture("explosion3"),
    ],
    islandBase,

    fire: [getTexture("fire1"), getTexture("fire2")],

    tiles,

    hud: {
      counterPanel: getTexture("counterPanel"),
      enemyHealthFillGreen: getTexture("enemyHealthFillGreen"),
      enemyHealthFillRed: getTexture("enemyHealthFillRed"),
      enemyHealthFrame: getTexture("enemyHealthFrame"),
      healthFillAmber: getTexture("healthFillAmber"),
      healthFillGreen: getTexture("healthFillGreen"),
      healthFillRed: getTexture("healthFillRed"),
      healthFrame: getTexture("healthFrame"),
      heartIcon: getTexture("heartIcon"),
      scoreIcon: getTexture("scoreIcon"),
      timeIcon: getTexture("timeIcon"),
    },
    dinghies: [
      getTexture("dinghyLarge1"),
      getTexture("dinghyLarge2"),
      getTexture("dinghyLarge3"),
      getTexture("dinghySmall1"),
      getTexture("dinghySmall2"),
      getTexture("dinghySmall3"),
    ],

    woodDebris: [
      getTexture("wood1"),
      getTexture("wood2"),
      getTexture("wood3"),
      getTexture("wood4"),
    ],

    enemyShips: [
      getTexture("chaserShip"),
      getTexture("shooterShip"),
      ...Array.from({ length: 21 }, (_, index) =>
        getTexture(`ship${index + 4}`),
      ),
    ],
  };
}
