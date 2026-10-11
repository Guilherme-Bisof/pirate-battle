export interface GameConfig {
    sessionDurationSec: number;
    spawnIntervalSec: number;
    playerSpeed: number;
    playerRotationSpeed: number;
    playerMaxHealth: number;
    chaserMaxHealth: number;
    shooterMaxHealth: number;
    frontalCooldownSec: number;
    lateralCooldownSec: number;
    projectileSpeed: number;
    projectDamage: number;
    projectileMaxlifeSec: number;
    chaserSpeed: number;
    chaserDamage: number;
    shooterSpeed: number;
    shooterAttackRange: number;
    shooterCooldownSec: number;
    shooterDamage: number;
}

export const DEFAULT_CONFIG: GameConfig = {
    sessionDurationSec: 90,
    spawnIntervalSec: 3.5,
    playerSpeed: 220,
    playerRotationSpeed: 3.0,
    playerMaxHealth: 100,
    chaserMaxHealth: 60,
    shooterMaxHealth: 40,
    frontalCooldownSec: 0.35,
    lateralCooldownSec: 1.2,
    projectileSpeed: 480,
    projectDamage: 25,
    projectileMaxlifeSec: 1.8,
    chaserSpeed: 160,
    chaserDamage: 30,
    shooterSpeed: 110,
    shooterAttackRange: 280,
    shooterCooldownSec: 1.5,
    shooterDamage: 15,
};

export interface HudState {
    health: number;
    maxHealth: number;
    score: number;
    timeLeft: number;
}

export interface GameOverResult {
    score: number;
    duration: number;
    reason: 'TIMEOUT'| 'DIED';
    config: GameConfig;
}