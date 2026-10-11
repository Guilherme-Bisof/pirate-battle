import { Application, Container,  Sprite } from "pixi.js";
import { loadGameAssets } from "./GameAssets";
import type { GameAssets } from "./GameAssets";
import { GameAudio } from "./GameAudio";
import type { GameConfig, GameOverResult, HudState } from "../types/gameConfig";
import { InputManager } from "../systems/InputManager";

export interface GameEngineOptions {
  container: HTMLElement;
  config: GameConfig;
  onGameOver: (result: GameOverResult) => void;
  onHudUpdate: (hudState: HudState) => void;
}

interface Projectile {
  graphic: Sprite;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  remainingLife: number;
  owner: "PLAYER" | "ENEMY";
}

type EnemyKind = "CHASER" | "SHOOTER";

interface Enemy {
  kind: EnemyKind;
  graphic: Sprite;
  fireGraphic: Sprite;
  healthBarBackground: Sprite;
  healthBarFill: Sprite;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  radius: number;
  attackCooldownRemaining: number;
}

interface ExplosionEffect {
  graphic: Sprite;
  elapsed: number;
}

export class GameEngine {
  private app: Application;
  private readonly audio = new GameAudio();
  private container: HTMLElement;
  private config: GameConfig;
  private onGameOver: (result: GameOverResult) => void;
  private onHudUpdate: (hud: HudState) => void;

  public readonly input: InputManager;
  private isRunning: boolean = false;
  private isPaused: boolean = false;

  private isInitialized = false;
  private isDestroyed = false;

  // Dimensões da arena
  public static readonly WORLD_WIDTH = 1280;
  public static readonly WORLD_HEIGHT = 720;

  // Estado da Partida
  private timeLeft: number;
  private score = 0;
  private playerHealth: number;

  // Camadas e Entidades
  private stageContainer: Container;
  private playerGraphics: Sprite;
  private playerFireGraphic: Sprite;
  private fireAnimationElapsed = 0;
  private assets: GameAssets | null = null;
  private playerHealthBarBackground: Sprite;
  private playerHealthBarFill: Sprite;
  private playerPos = { x: 760, y: 360, rotation: 0 };
  private playerRadius = 24;

  private readonly projectileRadius = 5;

  // Projetéis

  private projectiles: Projectile[] = [];

  private frontalCooldownRemaining = 0;
  private lateralCooldownRemaining = 0;

  private enemies: Enemy[] = [];
  private explosions: ExplosionEffect[] = [];

  private enemySpawnTimer = 0;
  private enemySpawnCount = 0;

  // Ilhas (obstáculos de colisão)
  public readonly islands = [
    { x: -64, y: -128, width: 768, height: 512, radius: 64 },
    { x: 384, y: 512, width: 576, height: 320, radius: 64 },
    { x: 928, y: 448, width: 448, height: 384, radius: 64 },
  ];

  // HUD
  private lasthudSecond = -1;

  constructor(options: GameEngineOptions) {
    this.container = options.container;
    this.config = { ...options.config };
    this.onGameOver = options.onGameOver;
    this.onHudUpdate = options.onHudUpdate;

    this.timeLeft = this.config.sessionDurationSec;
    this.playerHealth = this.config.playerMaxHealth;

    this.input = new InputManager();
    this.app = new Application();
    this.stageContainer = new Container();
    this.playerGraphics = new Sprite();
    this.playerFireGraphic = new Sprite();
    this.playerHealthBarBackground = new Sprite();
    this.playerHealthBarFill = new Sprite();
  }

  public async init(): Promise<void> {
    await this.app.init({
      background: "#0e3854",
      resizeTo: this.container,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      antialias: true,
    });

    if (this.isDestroyed) {
      this.app.destroy({ removeView: true }, { children: true });
      return;
    }

    this.assets = await loadGameAssets();

    if (this.isDestroyed) {
      this.app.destroy({ removeView: true }, { children: true });
      return;
    }

    this.isInitialized = true;

    this.container.appendChild(this.app.canvas);
    this.app.stage.addChild(this.stageContainer);

    this.buildWorld();
    this.input.attach();
    this.handleResize();

    window.addEventListener("resize", this.handleResize);

    // Inicia Game Loop via Pixi Tracker
    this.isRunning = true;
    this.app.ticker.add(this.update, this);
    this.audio.play("gameStart");

    // Dispara o estado inicial do HUD
    this.emitHud();
  }

  private buildWorld(): void {
    // Grid água
    const waterTexture = this.assets?.tiles[73];

    if (!waterTexture) {
      throw new Error("Water texture (tile_73.png) failed to load.");
    }

    const tileSize = 64;
    const backgroundBleed = 256;

    for (
      let y = -backgroundBleed;
      y < GameEngine.WORLD_HEIGHT + backgroundBleed;
      y += tileSize
    ) {
      for (
        let x = -backgroundBleed;
        x < GameEngine.WORLD_WIDTH + backgroundBleed;
        x += tileSize
      ) {
        const waterTile = new Sprite(waterTexture);

        waterTile.x = x;
        waterTile.y = y;
        waterTile.width = tileSize;
        waterTile.height = tileSize;

        this.stageContainer.addChild(waterTile);
      }
    }

    // Renderiza ilhas
    // Render terrain using the original 64x64 tiles.
    const assets = this.assets;

    if (!assets) {
      throw new Error("Game assets must be loaded before building islands.");
    }

    // Place decorative dinghies in open water.
    const dinghyPlacements = [
      { variant: 0, x: 860, y: 140, width: 24, height: 46, rotation: 0.4 },
      { variant: 4, x: 1100, y: 330, width: 20, height: 33, rotation: -0.6 },
      { variant: 2, x: 270, y: 470, width: 24, height: 46, rotation: 0.8 },
      { variant: 3, x: 820, y: 70, width: 20, height: 33, rotation: -0.2 },
    ];

    for (const placement of dinghyPlacements) {
      const texture = assets.dinghies[placement.variant];

      if (!texture) {
        throw new Error(`Dinghy texture failed to load: ${placement.variant}`);
      }

      const dinghy = new Sprite(texture);

      dinghy.anchor.set(0.5);
      dinghy.x = placement.x;
      dinghy.y = placement.y;
      dinghy.width = placement.width;
      dinghy.height = placement.height;
      dinghy.rotation = placement.rotation;

      this.stageContainer.addChild(dinghy);
    }

    // Place small floating wood debris.
    const woodPlacements = [
      { variant: 0, x: 1010, y: 405, width: 24, height: 11, rotation: 0.5 },
      { variant: 1, x: 760, y: 470, width: 36, height: 14, rotation: -0.3 },
      { variant: 2, x: 350, y: 480, width: 24, height: 16, rotation: 0.9 },
      { variant: 3, x: 890, y: 420, width: 36, height: 10, rotation: -0.7 },
    ];

    for (const placement of woodPlacements) {
      const texture = assets.woodDebris[placement.variant];

      if (!texture) {
        throw new Error(
          `Wood debris texture failed to load: ${placement.variant}`,
        );
      }

      const debris = new Sprite(texture);

      debris.anchor.set(0.5);
      debris.x = placement.x;
      debris.y = placement.y;
      debris.width = placement.width;
      debris.height = placement.height;
      debris.rotation = placement.rotation;

      this.stageContainer.addChild(debris);
    }

    const islandTileSize = 64;

    const terrainLayouts = [
      {
        island: this.islands[0],
        tiles: [
          [6, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 9],
          [22, 23, 23, 39, 23, 40, 23, 23, 40, 39, 23, 25],
          [22, 23, 23, 23, 39, 23, 23, 40, 23, 23, 23, 25],
          [22, 39, 23, 40, 23, 23, 39, 23, 40, 23, 23, 25],
          [22, 23, 23, 23, 23, 40, 23, 23, 39, 23, 23, 25],
          [22, 23, 39, 23, 23, 23, 40, 23, 23, 39, 23, 25],
          [22, 23, 23, 40, 23, 39, 23, 23, 23, 40, 23, 25],
          [54, 55, 56, 55, 56, 55, 56, 55, 56, 55, 55, 57],
        ],
      },
      {
        island: this.islands[1],
        tiles: [
          [6, 7, 7, 7, 7, 7, 7, 7, 9],
          [22, 23, 39, 23, 24, 23, 40, 23, 25],
          [22, 40, 23, 23, 39, 23, 23, 40, 25],
          [22, 23, 23, 40, 23, 39, 23, 23, 25],
          [54, 55, 56, 55, 56, 55, 56, 55, 57],
        ],
      },
      {
        island: this.islands[2],
        tiles: [
          [6, 7, 7, 8, 7, 7, 9],
          [22, 23, 39, 23, 40, 23, 25],
          [22, 23, 23, 24, 23, 23, 25],
          [22, 40, 23, 23, 39, 23, 25],
          [22, 23, 39, 23, 40, 23, 25],
          [54, 55, 56, 55, 56, 55, 57],
        ],
      },
    ];

    for (const layout of terrainLayouts) {
      const island = layout.island;

      if (!island) {
        continue;
      }

      layout.tiles.forEach((row, rowIndex) => {
        row.forEach((tileId, columnIndex) => {
          const texture = assets.tiles[tileId];

          if (!texture) {
            throw new Error(`Island tile failed to load: ${tileId}`);
          }

          const tile = new Sprite(texture);

          tile.x = island.x + columnIndex * islandTileSize;
          tile.y = island.y + rowIndex * islandTileSize;
          tile.width = islandTileSize;
          tile.height = islandTileSize;

          this.stageContainer.addChild(tile);
        });
      });
    }

    const addDecoration = (
      tileId: number,
      x: number,
      y: number,
      size = 64,
    ): void => {
      const texture = assets.tiles[tileId];

      if (!texture) {
        throw new Error(`Decoration tile failed to load: ${tileId}`);
      }

      const sprite = new Sprite(texture);

      sprite.x = x;
      sprite.y = y;
      sprite.width = size;
      sprite.height = size;

      this.stageContainer.addChild(sprite);
    };

    // Upper stone path with a cannon.
    addDecoration(13, 64, 0);
    addDecoration(16, 128, 0);
    addDecoration(47, 192, 0);
    addDecoration(16, 256, 0);
    addDecoration(13, 320, 0);

    // Lower path with a wooden bridge.
    addDecoration(13, 224, 64);
    addDecoration(16, 288, 64);
    addDecoration(76, 352, 64);
    addDecoration(13, 416, 64);

    // Tropical vegetation.
    addDecoration(71, 32, 128, 48);
    addDecoration(70, 400, 144, 48);
    addDecoration(72, 464, 176, 40);

    // Rocks.
    addDecoration(50, 448, 128, 48);
    addDecoration(49, 96, 192, 40);

    // Renderiza o navio do jogador
    this.drawPlayer();
    this.stageContainer.addChild(this.playerGraphics);

    const initialFireTexture = assets.fire[0];

    if (!initialFireTexture) {
      throw new Error("Fire effect textures failed to load.");
    }

    this.playerFireGraphic.texture = initialFireTexture;
    this.playerFireGraphic.anchor.set(0.5);
    this.playerFireGraphic.width = 28;
    this.playerFireGraphic.height = 34;
    this.playerFireGraphic.visible = false;
    this.playerFireGraphic.x = this.playerPos.x;
    this.playerFireGraphic.y = this.playerPos.y - 3;

    this.stageContainer.addChild(this.playerFireGraphic);

    this.playerHealthBarBackground.texture = assets.hud.healthFrame;
    this.playerHealthBarBackground.anchor.set(0.5);
    this.playerHealthBarBackground.width = 56;
    this.playerHealthBarBackground.height = 14;

    this.playerHealthBarFill.texture = assets.hud.healthFillGreen;
    this.playerHealthBarFill.anchor.set(0, 0.5);
    this.playerHealthBarFill.width = 46;
    this.playerHealthBarFill.height = 6;

    this.playerHealthBarBackground.x = this.playerPos.x;
    this.playerHealthBarBackground.y = this.playerPos.y - 35;

    this.playerHealthBarFill.x = this.playerPos.x - 23;
    this.playerHealthBarFill.y = this.playerPos.y - 35;

    this.updatePlayerHealthBar();

    this.stageContainer.addChild(this.playerHealthBarBackground);
    this.stageContainer.addChild(this.playerHealthBarFill);
  }

  private drawPlayer(): void {
    if (!this.assets) return;

    this.playerGraphics.texture = this.assets.playerShip;
    this.playerGraphics.anchor.set(0.5);
    this.playerGraphics.width = 34;
    this.playerGraphics.height = 50;
  }

  private update(): void {
    if (!this.isRunning || this.isPaused) return;

    // Delta time em segundos
    const dt = this.app.ticker.deltaMS / 1000;

    // Atualiza o tempo restante
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.endGame("TIMEOUT");
      return;
    }

    // Processa movimento do jogador
    this.updatePlayer(dt);

    this.updateEnemySpawning(dt);
    this.updateEnemies(dt);

    this.updateFrontalWeapon(dt);
    this.updateLateralWeapon(dt);
    this.updateProjectiles(dt);

    this.updateExplosion(dt);
    this.updateDamageVisuals(dt);

    // Sincroniza HUD a cada segundo cheio ou em mudanças
    const currentSec = Math.ceil(this.timeLeft);
    if (currentSec !== this.lasthudSecond) {
      this.lasthudSecond = currentSec;
      this.emitHud();
    }
  }

  private updatePlayer(dt: number): void {
    const input = this.input.getState();

    // Rotação
    if (input.rotateLeft) {
      this.playerPos.rotation -= this.config.playerRotationSpeed * dt;
    }
    if (input.rotateRight) {
      this.playerPos.rotation += this.config.playerRotationSpeed * dt;
    }

    // Avanço linear
    if (input.forward) {
      const nextX =
        this.playerPos.x +
        Math.cos(this.playerPos.rotation) * this.config.playerSpeed * dt;
      const nextY =
        this.playerPos.y +
        Math.sin(this.playerPos.rotation) * this.config.playerSpeed * dt;

      // Validação de limites da arena
      const boundedX = Math.max(
        this.playerRadius,
        Math.min(GameEngine.WORLD_WIDTH - this.playerRadius, nextX),
      );
      const boundedY = Math.max(
        this.playerRadius,
        Math.min(GameEngine.WORLD_HEIGHT - this.playerRadius, nextY),
      );

      // Colisão com ilhas
      if (!this.checkIslandCollision(boundedX, boundedY, this.playerRadius)) {
        this.playerPos.x = boundedX;
        this.playerPos.y = boundedY;
      }
    }

    // Sincroniza o sprite
    this.playerGraphics.x = this.playerPos.x;
    this.playerGraphics.y = this.playerPos.y;
    this.playerGraphics.rotation = this.playerPos.rotation + Math.PI / 2;

    this.playerHealthBarBackground.x = this.playerPos.x;
    this.playerHealthBarBackground.y = this.playerPos.y - 35;

    this.playerHealthBarFill.x = this.playerPos.x - 23;
    this.playerHealthBarFill.y = this.playerPos.y - 35;
  }

  private updateFrontalWeapon(dt: number): void {
    this.frontalCooldownRemaining = Math.max(
      0,
      this.frontalCooldownRemaining - dt,
    );

    const input = this.input.getState();

    if (!input.fireFront || this.frontalCooldownRemaining > 0) {
      return;
    }

    this.spawnProjectile(this.playerPos.rotation);
    this.audio.play("playerFire");
    this.frontalCooldownRemaining = this.config.frontalCooldownSec;
  }

  private updateLateralWeapon(dt: number): void {
    this.lateralCooldownRemaining = Math.max(
      0,
      this.lateralCooldownRemaining - dt,
    );

    const input = this.input.getState();

    if (
      (!input.fireLeft && !input.fireRight) ||
      this.lateralCooldownRemaining > 0
    ) {
      return;
    }

    this.audio.play("broadside");
    if (input.fireLeft) {
      this.spawnBroadside(-1);
    }

    if (input.fireRight) {
      this.spawnBroadside(1);
    }

    this.lateralCooldownRemaining = this.config.lateralCooldownSec;
  }

  private spawnBroadside(side: -1 | 1): void {
    const sideAngle = this.playerPos.rotation + side * (Math.PI / 2);

    const forwardOffset = [-16, 0, 16];

    for (const offset of forwardOffset) {
      this.spawnProjectile(sideAngle, offset);
    }
  }

  private spawnProjectile(angle: number, forwardOffset = 0): void {
    const directionX = Math.cos(angle);
    const directionY = Math.sin(angle);
    const startDistance = this.playerRadius + 8;

    const forwardX = Math.cos(this.playerPos.rotation);
    const forwardY = Math.sin(this.playerPos.rotation);

    const x =
      this.playerPos.x + directionX * startDistance + forwardX * forwardOffset;
    const y =
      this.playerPos.y + directionY * startDistance + forwardY * forwardOffset;

    if (!this.assets) return;
    const graphic = new Sprite(this.assets.cannonBall);
    graphic.anchor.set(0.5);
    graphic.width = 10;
    graphic.height = 10;

    graphic.x = x;
    graphic.y = y;

    this.stageContainer.addChild(graphic);

    this.projectiles.push({
      graphic,
      x,
      y,
      velocityX: directionX * this.config.projectileSpeed,
      velocityY: directionY * this.config.projectileSpeed,
      remainingLife: this.config.projectileMaxlifeSec,
      owner: "PLAYER",
    });
  }

  private spawnEnemyProjectile(enemy: Enemy, angle: number): void {
    const directionX = Math.cos(angle);
    const directionY = Math.sin(angle);
    const startDistance = enemy.radius + this.projectileRadius + 2;

    const x = enemy.x + directionX * startDistance;
    const y = enemy.y + directionY * startDistance;

    if (!this.assets) return;

    const graphic = new Sprite(this.assets.cannonBall);
    graphic.anchor.set(0.5);
    graphic.width = 10;
    graphic.height = 10;

    graphic.x = x;
    graphic.y = y;

    this.stageContainer.addChild(graphic);

    this.projectiles.push({
      graphic,
      x,
      y,
      velocityX: directionX * this.config.projectileSpeed * 0.65,
      velocityY: directionY * this.config.projectileSpeed * 0.65,
      remainingLife: this.config.projectileMaxlifeSec,
      owner: "ENEMY",
    });
  }

  private updateEnemySpawning(dt: number): void {
    this.enemySpawnTimer += dt;

    if (this.enemySpawnTimer < this.config.spawnIntervalSec) {
      return;
    }

    this.enemySpawnTimer = 0;
    this.spawnEnemy();
  }

  private spawnEnemy(): void {
    const kind: EnemyKind =
      this.enemySpawnCount % 2 === 0 ? "CHASER" : "SHOOTER";
    const radius = 20;

    const spawnPoints = [
      { x: 70, y: 70 },
      { x: GameEngine.WORLD_WIDTH - 70, y: 70 },
      { x: 70, y: GameEngine.WORLD_HEIGHT - 70 },
      {
        x: GameEngine.WORLD_WIDTH - 70,
        y: GameEngine.WORLD_HEIGHT - 70,
      },
    ];

    const validSpawnPoints = spawnPoints.filter((point) => {
      const distanceToPlayer = Math.hypot(
        point.x - this.playerPos.x,
        point.y - this.playerPos.y,
      );

      return (
        distanceToPlayer >= 240 &&
        !this.checkIslandCollision(point.x, point.y, radius)
      );
    });

    const fallbackSpawn = spawnPoints.reduce((farthest, point) => {
      const pointDistance = Math.hypot(
        point.x - this.playerPos.x,
        point.y - this.playerPos.y,
      );

      const farthestDistance = Math.hypot(
        farthest.x - this.playerPos.x,
        farthest.y - this.playerPos.y,
      );

      return pointDistance > farthestDistance ? point : farthest;
    });

    const spawnPoint =
      validSpawnPoints.length > 0
        ? (validSpawnPoints[this.enemySpawnCount % validSpawnPoints.length] ??
          fallbackSpawn)
        : fallbackSpawn;

    const maxHealth =
      kind === "CHASER"
        ? this.config.chaserMaxHealth
        : this.config.shooterMaxHealth;

    if (!this.assets) return;

    const shipVariants = this.assets.enemyShips;

    const variantIndex = this.enemySpawnCount % shipVariants.length;

    const texture =
      shipVariants[variantIndex] ??
      (kind === "CHASER" ? this.assets.chaserShip : this.assets.shooterShip);

    const graphic = new Sprite(texture);
    graphic.anchor.set(0.5);
    graphic.width = 30;
    graphic.height = 52;

    graphic.x = spawnPoint.x;
    graphic.y = spawnPoint.y;

    const fireTexture = this.assets.fire[0];

    if (!fireTexture) {
      throw new Error("Fire effect textures failed to load.");
    }

    const fireGraphic = new Sprite(fireTexture);

    fireGraphic.anchor.set(0.5);
    fireGraphic.width = 26;
    fireGraphic.height = 34;
    fireGraphic.visible = false;
    fireGraphic.x = spawnPoint.x;
    fireGraphic.y = spawnPoint.y - 4;

    const healthBarBackground = new Sprite(this.assets.hud.enemyHealthFrame);
    healthBarBackground.anchor.set(0.5);
    healthBarBackground.width = 48;
    healthBarBackground.height = 10;

    const healthBarFill = new Sprite(this.assets.hud.enemyHealthFillGreen);
    healthBarFill.anchor.set(0, 0.5);
    healthBarFill.width = 36;
    healthBarFill.height = 4;

    healthBarBackground.x = spawnPoint.x;
    healthBarBackground.y = spawnPoint.y - 28;

    healthBarFill.x = spawnPoint.x - 18;
    healthBarFill.y = spawnPoint.y - 28;

    this.stageContainer.addChild(healthBarBackground);
    this.stageContainer.addChild(healthBarFill);
    this.stageContainer.addChild(graphic);

    this.stageContainer.addChild(fireGraphic);

    this.enemies.push({
      kind,
      graphic,
      healthBarBackground,
      healthBarFill,
      x: spawnPoint.x,
      y: spawnPoint.y,
      health: maxHealth,
      maxHealth,
      radius,
      attackCooldownRemaining: 0,
      fireGraphic,
    });

    this.enemySpawnCount += 1;
  }

  private updateEnemies(dt: number): void {
    for (const enemy of this.enemies) {
      enemy.attackCooldownRemaining = Math.max(
        0,
        enemy.attackCooldownRemaining - dt,
      );

      const dx = this.playerPos.x - enemy.x;
      const dy = this.playerPos.y - enemy.y;
      const distance = Math.hypot(dx, dy);

      if (distance === 0) {
        continue;
      }

      const angleToPlayer = Math.atan2(dy, dx);
      enemy.graphic.rotation = angleToPlayer + Math.PI / 2;

      const isChaser = enemy.kind === "CHASER";
      const outsideAttackRange = distance > this.config.shooterAttackRange;

      if (!isChaser && !outsideAttackRange) {
        if (enemy.attackCooldownRemaining <= 0) {
          this.spawnEnemyProjectile(enemy, angleToPlayer);
          this.audio.play("enemyFire");
          enemy.attackCooldownRemaining = this.config.shooterCooldownSec;
        }

        continue;
      }

      if (isChaser && distance <= enemy.radius + this.playerRadius) {
        if (enemy.attackCooldownRemaining <= 0) {
          this.damagePlayer(this.config.chaserDamage);
          enemy.attackCooldownRemaining = 1;
        }

        continue;
      }

      const speed = isChaser
        ? this.config.chaserSpeed
        : this.config.shooterSpeed;

      const nextX = enemy.x + (dx / distance) * speed * dt;
      const nextY = enemy.y + (dy / distance) * speed * dt;

      const boundedX = Math.max(
        enemy.radius,
        Math.min(GameEngine.WORLD_WIDTH - enemy.radius, nextX),
      );

      const boundedY = Math.max(
        enemy.radius,
        Math.min(GameEngine.WORLD_HEIGHT - enemy.radius, nextY),
      );

      if (!this.checkIslandCollision(boundedX, boundedY, enemy.radius)) {
        enemy.x = boundedX;
        enemy.y = boundedY;
      } else {
        if (!this.checkIslandCollision(boundedX, enemy.y, enemy.radius)) {
          enemy.x = boundedX;
        }

        if (!this.checkIslandCollision(enemy.x, boundedY, enemy.radius)) {
          enemy.y = boundedY;
        }
      }

      enemy.graphic.x = enemy.x;
      enemy.graphic.y = enemy.y;

      enemy.healthBarBackground.x = enemy.x;
      enemy.healthBarBackground.y = enemy.y - 28;

      enemy.healthBarFill.x = enemy.x - 18;
      enemy.healthBarFill.y = enemy.y - 28;
    }
  }

  private updateEnemyHealthbar(enemy: Enemy): void {
    if (!this.assets) return;

    const healthRatio = Math.max(
      0,
      Math.min(1, enemy.health / enemy.maxHealth),
    );

    enemy.healthBarFill.texture =
      healthRatio <= 0.3
        ? this.assets.hud.enemyHealthFillRed
        : this.assets.hud.enemyHealthFillGreen;

    enemy.healthBarFill.width = 36 * healthRatio;
  }

  private spawnExplosion(x: number, y: number): void {
    if (!this.assets || this.assets.explosions.length === 0) {
      return;
    }

    const firstFrame = this.assets.explosions[0];

    if (!firstFrame) {
      return;
    }

    const graphic = new Sprite(firstFrame);

    graphic.anchor.set(0.5);
    graphic.width = 58;
    graphic.height = 58;
    graphic.x = x;
    graphic.y = y;

    this.stageContainer.addChild(graphic);

    this.explosions.push({
      graphic,
      elapsed: 0,
    });

    this.audio.play("explosion");
  }

  private updateExplosion(dt: number): void {
    if (!this.assets) {
      return;
    }

    const frameDuration = 0.09;

    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const effect = this.explosions[i];

      if (!effect) {
        continue;
      }

      effect.elapsed += dt;

      const frameIndex = Math.floor(effect.elapsed / frameDuration);

      const texture = this.assets.explosions[frameIndex];

      if (!texture) {
        this.stageContainer.removeChild(effect.graphic);
        effect.graphic.destroy();
        this.explosions.splice(i, 1);
        continue;
      }

      effect.graphic.texture = texture;
    }
  }

  private updateProjectiles(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];

      if (!projectile) {
        continue;
      }

      projectile.x += projectile.velocityX * dt;
      projectile.y += projectile.velocityY * dt;
      projectile.remainingLife -= dt;

      projectile.graphic.x = projectile.x;
      projectile.graphic.y = projectile.y;

      const outsideArena =
        projectile.x < 0 ||
        projectile.x > GameEngine.WORLD_WIDTH ||
        projectile.y < 0 ||
        projectile.y > GameEngine.WORLD_HEIGHT;

      const hitsIsland = this.isProjectileCollindingWithIsland(
        projectile.x,
        projectile.y,
      );

      const hitsEnemyIndex =
        projectile.owner === "PLAYER" && !outsideArena && !hitsIsland
          ? this.findCollidingEnemyIndex(projectile.x, projectile.y)
          : -1;

      const hitsPlayer =
        projectile.owner === "ENEMY" &&
        !outsideArena &&
        !hitsIsland &&
        Math.hypot(
          projectile.x - this.playerPos.x,
          projectile.y - this.playerPos.y,
        ) <=
          this.playerRadius + this.projectileRadius;

      if (hitsEnemyIndex !== -1) {
        const enemy = this.enemies[hitsEnemyIndex];

        if (enemy) {
          enemy.health -= this.config.projectDamage;

          this.updateEnemyHealthbar(enemy);

          if (enemy.health <= 0) {
            this.spawnExplosion(enemy.x, enemy.y);

            this.stageContainer.removeChild(enemy.healthBarBackground);
            this.stageContainer.removeChild(enemy.healthBarFill);
            this.stageContainer.removeChild(enemy.graphic);
            this.stageContainer.removeChild(enemy.fireGraphic);

            enemy.healthBarBackground.destroy();
            enemy.healthBarFill.destroy();
            enemy.graphic.destroy();
            enemy.fireGraphic.destroy();

            this.enemies.splice(hitsEnemyIndex, 1);

            this.score += 1;
            this.audio.play("score");
            this.emitHud();
          }
        }
      }

      if (hitsPlayer) {
        this.damagePlayer(this.config.shooterDamage);
      }

      const projectileMissed =
        (projectile.remainingLife <= 0 || outsideArena) &&
        !hitsIsland &&
        hitsEnemyIndex === -1 &&
        !hitsPlayer;
      if (projectileMissed) {
        this.audio.play("waterHit");
      }

      const shouldRemoveProjectile =
        projectile.remainingLife <= 0 ||
        outsideArena ||
        hitsIsland ||
        hitsEnemyIndex !== -1 ||
        hitsPlayer;

      if (shouldRemoveProjectile) {
        this.stageContainer.removeChild(projectile.graphic);
        projectile.graphic.destroy();
        this.projectiles.splice(i, 1);
      }
    }
  }

  private checkIslandCollision(x: number, y: number, radius: number): boolean {
    for (const island of this.islands) {
      const cornerRadius = Math.min(64, island.width / 2, island.height / 2);

      const closestX = Math.max(
        island.x + cornerRadius,
        Math.min(island.x + island.width - cornerRadius, x),
      );

      const closestY = Math.max(
        island.y + cornerRadius,
        Math.min(island.y + island.height - cornerRadius, y),
      );

      if (Math.hypot(x - closestX, y - closestY) <= cornerRadius + radius) {
        return true;
      }
    }

    return false;
  }

  private isProjectileCollindingWithIsland(x: number, y: number): boolean {
    for (const island of this.islands) {
      const cornerRadius = Math.min(64, island.width / 2, island.height / 2);

      const closestX = Math.max(
        island.x + cornerRadius,
        Math.min(island.x + island.width - cornerRadius, x),
      );

      const closestY = Math.max(
        island.y + cornerRadius,
        Math.min(island.y + island.height - cornerRadius, y),
      );

      if (
        Math.hypot(x - closestX, y - closestY) <=
        cornerRadius + this.projectileRadius
      ) {
        return true;
      }
    }

    return false;
  }

  private findCollidingEnemyIndex(x: number, y: number): number {
    return this.enemies.findIndex((enemy) => {
      const distance = Math.hypot(x - enemy.x, y - enemy.y);

      return distance <= enemy.radius + this.projectileRadius;
    });
  }

  private damagePlayer(amount: number): void {
    if (!this.isRunning || amount <= 0) {
      return;
    }

    this.audio.play("shipHit");

    this.playerHealth = Math.max(0, this.playerHealth - amount);

    this.updatePlayerHealthBar();
    this.emitHud();

    if (this.playerHealth <= 0) {
      this.endGame("DIED");
    }
  }

  private updatePlayerHealthBar(): void {
    if (!this.assets) return;

    const healthRatio = Math.max(
      0,
      Math.min(1, this.playerHealth / this.config.playerMaxHealth),
    );

    if (healthRatio <= 0.3) {
      this.playerHealthBarFill.texture = this.assets.hud.healthFillRed;
    } else if (healthRatio <= 0.6) {
      this.playerHealthBarFill.texture = this.assets.hud.healthFillAmber;
    } else {
      this.playerHealthBarFill.texture = this.assets.hud.healthFillGreen;
    }

    this.playerHealthBarFill.width = 46 * healthRatio;
  }

  private updateDamageVisuals(dt: number): void {
    if (!this.assets || this.assets.fire.length === 0) {
      return;
    }

    this.fireAnimationElapsed += dt;

    const frameDuration = 0.16;
    const frameIndex =
      Math.floor(this.fireAnimationElapsed / frameDuration) %
      this.assets.fire.length;

    const fireTexture = this.assets.fire[frameIndex];

    if (!fireTexture) {
      return;
    }

    // Player fire.
    const playerHealthRatio = this.playerHealth / this.config.playerMaxHealth;

    this.playerFireGraphic.visible =
      this.playerHealth > 0 && playerHealthRatio <= 0.5;

    this.playerFireGraphic.texture = fireTexture;
    this.playerFireGraphic.x = this.playerPos.x;
    this.playerFireGraphic.y = this.playerPos.y - 3;

    // Enemy fire.
    for (const enemy of this.enemies) {
      const healthRatio = enemy.health / enemy.maxHealth;

      enemy.fireGraphic.visible = healthRatio <= 0.5;
      enemy.fireGraphic.texture = fireTexture;
      enemy.fireGraphic.x = enemy.x;
      enemy.fireGraphic.y = enemy.y - 4;
    }
  }

  private emitHud(): void {
    this.onHudUpdate({
      health: this.playerHealth,
      maxHealth: this.config.playerMaxHealth,
      score: this.score,
      timeLeft: Math.ceil(this.timeLeft),
    });
  }

  private endGame(reason: "TIMEOUT" | "DIED"): void {
    this.isRunning = false;

    this.audio.play(reason === "TIMEOUT" ? "gameComplete" : "gameOver");

    this.input.reset();
    this.onGameOver({
      score: this.score,
      duration: Number(
        (this.config.sessionDurationSec - this.timeLeft).toFixed(1),
      ),
      reason,
      config: this.config,
    });
  }

  public setPaused(paused: boolean): void {
    if (this.isPaused === paused) {
      return;
    }

    this.isPaused = paused;

    if (paused) {
      this.input.reset();
      this.audio.play("pause");
    } else if (this.isRunning) {
      this.audio.play("resume");
    }
  }

  private handleResize = (): void => {
    if (!this.container || !this.app.renderer) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;

    // Escala uniforme
    const scale = Math.min(
      w / GameEngine.WORLD_WIDTH,
      h / GameEngine.WORLD_HEIGHT,
    );
    this.stageContainer.scale.set(scale);

    // Centraliza a arena
    this.stageContainer.x = (w - GameEngine.WORLD_WIDTH * scale) / 2;
    this.stageContainer.y = (h - GameEngine.WORLD_HEIGHT * scale) / 2;
  };

  public destroy(): void {
    if (this.isDestroyed) {
      return;
    }

    this.isDestroyed = true;
    this.isRunning = false;

    window.removeEventListener("resize", this.handleResize);
    this.input.detach();
    this.audio.destroy();

    if (!this.isInitialized) {
      return;
    }

    this.app.ticker.remove(this.update, this);

    this.app.destroy({ removeView: true }, { children: true });
  }
}
