import { Application, Container, Graphics, Sprite } from "pixi.js";
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
  healthBarBackground: Graphics;
  healthBarFill: Graphics;
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
  private assets: GameAssets | null = null;
  private playerHealthBarBackground: Graphics;
  private playerHealthBarFill: Graphics;
  private playerPos = { x: 200, y: 360, rotation: 0 };
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
    this.playerGraphics = new Sprite();
    this.playerHealthBarBackground = new Graphics();
    this.playerHealthBarFill = new Graphics();
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

    this.playerHealthBarBackground.rect(-25, -38, 50, 6);
    this.playerHealthBarBackground.fill({ color: 0x292929 });

    this.playerHealthBarBackground.x = this.playerPos.x;
    this.playerHealthBarBackground.y = this.playerPos.y;

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
    this.playerHealthBarBackground.y = this.playerPos.y;

    this.playerHealthBarFill.x = this.playerPos.x;
    this.playerHealthBarFill.y = this.playerPos.y;
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

    const texture =
      kind === "CHASER" ? this.assets.chaserShip : this.assets.shooterShip;

    const graphic = new Sprite(texture);
    graphic.anchor.set(0.5);
    graphic.width = 30;
    graphic.height = 52;

    graphic.x = spawnPoint.x;
    graphic.y = spawnPoint.y;

    const healthBarBackground = new Graphics();
    healthBarBackground.rect(-20, -28, 40, 5);
    healthBarBackground.fill({ color: 0x292929 });

    const healthBarFill = new Graphics();
    healthBarFill.rect(-20, -28, 40, 5);
    healthBarFill.fill({ color: 0x45d483 });

    healthBarBackground.x = spawnPoint.x;
    healthBarBackground.y = spawnPoint.y;

    healthBarFill.x = spawnPoint.x;
    healthBarFill.y = spawnPoint.y;

    this.stageContainer.addChild(healthBarBackground);
    this.stageContainer.addChild(healthBarFill);
    this.stageContainer.addChild(graphic);

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
      enemy.healthBarBackground.y = enemy.y;

      enemy.healthBarFill.x = enemy.x;
      enemy.healthBarFill.y = enemy.y;
    }
  }

  private updateEnemyHealthbar(enemy: Enemy): void {
    const healthRatio = Math.max(
      0,
      Math.min(1, enemy.health / enemy.maxHealth),
    );

    enemy.healthBarFill.clear();
    enemy.healthBarFill.rect(-20, -28, 40 * healthRatio, 5);
    enemy.healthBarFill.fill({
      color: healthRatio <= 0.3 ? 0xe74c3c : 0x45d483,
    });
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

            enemy.healthBarBackground.destroy();
            enemy.healthBarFill.destroy();
            enemy.graphic.destroy();

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
    const healthRatio = Math.max(
      0,
      Math.min(1, this.playerHealth / this.config.playerMaxHealth),
    );

    this.playerHealthBarFill.clear();
    this.playerHealthBarFill.rect(-25, -38, 50 * healthRatio, 6);
    this.playerHealthBarFill.fill({
      color: healthRatio <= 0.3 ? 0xe74c3c : 0x45d483,
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
