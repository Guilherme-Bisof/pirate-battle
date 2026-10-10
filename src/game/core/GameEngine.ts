import { Application, Container, Graphics } from "pixi.js";
import type { GameConfig, GameOverResult, HudState } from "../types/gameConfig";
import { InputManager } from "../systems/InputManager";

export interface GameEngineOptions {
  container: HTMLElement;
  config: GameConfig;
  onGameOver: (result: GameOverResult) => void;
  onHudUpdate: (hudState: HudState) => void;
}

interface Projectile {
  graphic: Graphics;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  remainingLife: number;
}

type EnemyKind = "CHASER" | "SHOOTER";

interface Enemy {
  kind: EnemyKind;
  graphic: Graphics;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  radius: number;
}

export class GameEngine {
  private app: Application;
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
  private playerGraphics: Graphics;
  private playerPos = { x: 200, y: 360, rotation: 0 };
  private playerRadius = 24;

  private readonly projectileRadius = 5;

  // Projetéis

  private projectiles: Projectile[] = [];

  private frontalCooldownRemaining = 0;
  private lateralCooldownRemaining = 0;

  private enemies: Enemy[] = [];

  private enemySpawnTimer = 0;
  private enemySpawnCount = 0;

  // Ilhas (obstáculos de colisão)
  public readonly islands = [
    { x: 540, y: 260, width: 200, height: 200, radius: 100 },
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
    this.playerGraphics = new Graphics();
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

    // Dispara o estado inicial do HUD
    this.emitHud();
  }

  private buildWorld(): void {
    // Grid água
    const waterGrid = new Graphics();
    waterGrid.rect(0, 0, GameEngine.WORLD_WIDTH, GameEngine.WORLD_HEIGHT);
    waterGrid.fill({ color: 0x12486b });
    this.stageContainer.addChild(waterGrid);

    // Renderiza ilhas
    for (const island of this.islands) {
      const islandGfx = new Graphics();
      islandGfx.circle(
        island.x + island.width / 2,
        island.y + island.height / 2,
        island.radius,
      );
      islandGfx.fill({ color: 0x3d7332 });
      islandGfx.stroke({ color: 0x24461e, width: 6 });
      this.stageContainer.addChild(islandGfx);
    }

    // Renderiza o navio do jogador
    this.drawPlayer();
    this.stageContainer.addChild(this.playerGraphics);
  }

  private drawPlayer(): void {
    this.playerGraphics.clear();
    // Casco
    this.playerGraphics.poly([-20, -14, 16, -14, 28, 0, 16, 14, -20, 14]);
    this.playerGraphics.fill({ color: 0x8b5a2b });
    this.playerGraphics.stroke({ color: 0xffd700, width: 2 });

    // Vela
    this.playerGraphics.rect(-4, -12, 8, 24);
    this.playerGraphics.fill({ color: 0xf5f5f5 });
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
    this.playerGraphics.rotation = this.playerPos.rotation;
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

    const graphic = new Graphics();
    graphic.circle(0, 0, this.projectileRadius);
    graphic.fill({ color: 0xffd166 });

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

    const graphic = new Graphics();

    graphic.poly([-17, -12, 14, -12, 22, 0, 14, 12, -17, 12]);

    graphic.fill({
      color: kind === "CHASER" ? 0xc7473c : 0xe59b35,
    });

    graphic.stroke({
      color: 0x171717,
      width: 2,
    });

    graphic.x = spawnPoint.x;
    graphic.y = spawnPoint.y;

    this.stageContainer.addChild(graphic);

    this.enemies.push({
      kind,
      graphic,
      x: spawnPoint.x,
      y: spawnPoint.y,
      health: maxHealth,
      maxHealth,
      radius,
    });

    this.enemySpawnCount += 1;
  }

  private updateEnemies(dt: number): void {
    for (const enemy of this.enemies) {
      const dx = this.playerPos.x - enemy.x;
      const dy = this.playerPos.y - enemy.y;
      const distance = Math.hypot(dx, dy);

      if (distance === 0) {
        continue;
      }

      enemy.graphic.rotation = Math.atan2(dy, dx);

      const isChaser = enemy.kind === "CHASER";
      const outsideAttackRange = distance > this.config.shooterAttackRange;

      if (!isChaser && !outsideAttackRange) {
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
        !outsideArena && !hitsIsland
          ? this.findCollidingEnemyIndex(projectile.x, projectile.y)
          : -1;

      if (hitsEnemyIndex !== 1) {
        const enemy = this.enemies[hitsEnemyIndex];

        if (enemy) {
          enemy.health -= this.config.projectDamage;

          if (enemy.health <= 0) {
            this.stageContainer.removeChild(enemy.graphic);
            enemy.graphic.destroy();

            this.enemies.splice(hitsEnemyIndex, 1);

            this.score += 1;
            this.emitHud();
          }
        }
      }

      if (projectile.remainingLife <= 0 || outsideArena || hitsIsland || hitsEnemyIndex !== -1) {
        this.stageContainer.removeChild(projectile.graphic);
        projectile.graphic.destroy();
        this.projectiles.splice(i, 1);
      }
    }
  }

  private checkIslandCollision(x: number, y: number, radius: number): boolean {
    for (const island of this.islands) {
      const centerX = island.x + island.width / 2;
      const centerY = island.y + island.height / 2;
      const dist = Math.hypot(x - centerX, y - centerY);
      if (dist < radius + island.radius) {
        return true;
      }
    }
    return false;
  }

  private isProjectileCollindingWithIsland(x: number, y: number): boolean {
    for (const island of this.islands) {
      const centerX = island.x + island.width / 2;
      const centerY = island.y + island.height / 2;

      const distance = Math.hypot(x - centerX, y - centerY);

      if (distance <= island.radius + this.projectileRadius) {
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
    this.isPaused = paused;
    if (paused) {
      this.input.reset();
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

    if (!this.isInitialized) {
      return;
    }

    this.app.ticker.remove(this.update, this);

    this.app.destroy({ removeView: true }, { children: true });
  }
}
