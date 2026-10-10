import { Assets } from "pixi.js";
import type { Texture } from "pixi.js";

const ASSET_PATHS = {
  playerShip: "/assets/png/default/ships/ship_1.png",
  chaserShip: "/assets/png/default/ships/ship_2.png",
  shooterShip: "/assets/png/default/ships/ship_3.png",
  cannonBall: "/assets/png/default/ship_parts/cannon_ball.png",
  explosion1: "/assets/png/default/effects/explosion_1.png",
  explosion2: "/assets/png/default/effects/explosion_2.png",
  explosion3: "/assets/png/default/effects/explosion_3.png",
} as const;

export interface GameAssets {
  playerShip: Texture;
  chaserShip: Texture;
  shooterShip: Texture;
  cannonBall: Texture;
  explosions: Texture[];
}

export async function loadGameAssets(
  onProgress?: (loaded: number, total: number) => void,
): Promise<GameAssets> {
  const entries = Object.entries(ASSET_PATHS);
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

  function getTexture(name: keyof typeof ASSET_PATHS): Texture {
    const texture = textures.get(name);

    if (!texture) {
      throw new Error(`Game asset failed to load: ${name}`);
    }

    return texture;
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
  };
}
