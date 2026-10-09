import { Application, Container, Graphics, Text, TextStyle } from "pixi.js";
import { GameConfig, GameOverResult, HudState } from "../types/gameConfig";
import { InputManager } from "../systems/InputManager";

export interface GameEngineOptions {
    container: HTMLElement;
    config: GameConfig;
    onGameOver: (result: GameOverResult) => void;
    onHudUpdate: (hudState: HudState) => void;
}

export class GameEngine {
    private app: Application;
    private container: HTMLElement;
    private config: GameConfig;
    private onGameOver: (result: GameOverResult) => void;
    private onHudUpdate: (hud: HudState) => void;

    public readonly input: InputManager;
    private isRunning: false;
    private isPaused: false;

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
    private playerPos = { x:200, y: 360, rotation: 0 };
    private playerRadius = 24;

    // Ilhas (obstáculos de colisão)
    public readonly islands = [
        { x:540, y: 260, width: 200, height: 200, radius: 100 },
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
            background: '#0e3854',
            resizeTo: this.container,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
            antialias: true,
        });

        this.container.appendChild(this.app.canvas);
        this.app.stage.addChild(this.stageContainer);

        this.buildWorld();
        this.input.attach();
        this.handleResize();

        window.addEventListener('resize', this.handleResize);

        // Inicia Game Loop via Pixi Tracker
        this.app.ticker.add(this.onHudUpdate, this);
        this.isRunning = true;

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
        for (const island of this.islands){
            const islandGfx = new Graphics();
            islandGfx.circle(island.x + island.width / 2, island.y + island.height / 2, island.radius);
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
        this.playerGraphics.poly([
            -20, -14,
            16, -14,
            28, 0,
            16, 14,
            -20, 14,
        ]);
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
            this.endGame('TIMEOUT');
            return;
        } 

        // Processa movimento do jogador
        this.updatePlayer(dt);

        // Sincroniza HUD a cada segundo cheio ou em mudanças
        const currentSec = Math.ceil(this.timeLeft);
        if (currentSec !== this.lasthudSecond) {
            this.lasthudSecon = currentSec;
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
            const nextX = this.playerPos.x + Math.cos(this.playerPos.rotation) * this.config.playerSpeed * dt;
            const nextY = this.playerPos.y + Math.sin(this.playerPos.rotation) * this.config.playerSpeed * dt;

            // Validação de limites da arena
            const boundedX = Math.max(this.playerRadius, Math.min(GameEngine.WORLD_WIDTH - this.playerRadius, nextX));
            const boundedY = Math.max(this.playerRadius, Math.min(GameEngine.WORLD_HEIGHT - this.playerRadius, nextY));

            // Colisão com ilhas
            if (!this.isCollidingWithIslands(boundedX, boundedY, this.playerRadius)) {
                this.playerPos.x = boundedX;
                this.playerPos.y = boundedY;
            }
        }

        // Sincroniza o sprite
        this.playerGraphics.x = this.playerPos.x;
        this.playerGraphics.y = this.playerPos.y;
        this.playerGraphics.rotation = this.playerPos.rotation;
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

    private emitHud(): void {
        this.onHudUpdate({
            health: this.playerHealth,
            maxHealth: this.config.playerMaxHealth,
            score: this.score,
            timeleft: Math.ceil(this.timeLeft),
        });
    }

    private endGame(reason: 'TIMEOUT' | 'DIED'): void {
        this.isRunning = false;
        this.input.reset();
        this.onGameOver({
            score: this.score,
            duration: Number((this.config.sessionDurationSec - this.timeLeft).toFixed(1)),
            reason,
            config: this.config
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
        const scale = Math.min(w / GameEngine.WORLD_WIDTH, h / GameEngine.WORLD_HEIGHT);
        this.stageContainer.scale.set(scale);

        // Centraliza a arena
        this.stageContainer.x = (w - GameEngine.WORLD_WIDTH * scale) / 2;
        this.stageContainer.y = (h - GameEngine.WORLD_HEIGHT * scale) / 2;
    };

    public destroy(): void {
        this.isRunning = false;
        window.removeEventListener('resize', this.handleResize);
        this.input.detach();
        this.app.ticker.remove(this.update, this);
        this.app.destroy(true, { children: true });
    }
}