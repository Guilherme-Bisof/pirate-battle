export type GameSound =
  | "playerFire"
  | "broadside"
  | "enemyFire"
  | "waterHit"
  | "shipHit"
  | "explosion"
  | "score"
  | "gameStart"
  | "gameOver"
  | "gameComplete"
  | "pause"
  | "resume";

const SOUND_PATHS: Record<GameSound, string> = {
  playerFire: "/assets/sounds/cannon_fire_1.wav",
  broadside: "/assets/sounds/cannon_broadside.wav",
  enemyFire: "/assets/sounds/cannon_fire_2.wav",
  waterHit: "/assets/sounds/cannonball_water_hit_1.wav",
  shipHit: "/assets/sounds/ship_wood_hit_1.wav",
  explosion: "/assets/sounds/ship_explosion_1.wav",
  score: "/assets/sounds/score_point.wav",
  gameStart: "/assets/sounds/game_start.wav",
  gameOver: "/assets/sounds/game_over.wav",
  gameComplete: "/assets/sounds/game_complete.wav",
  pause: "/assets/sounds/game_pause.wav",
  resume: "/assets/sounds/game_resume.wav",
};

const SOUND_VOLUMES: Record<GameSound, number> = {
  playerFire: 0.35,
  broadside: 0.4,
  enemyFire: 0.3,
  waterHit: 0.25,
  shipHit: 0.35,
  explosion: 0.45,
  score: 0.3,
  gameStart: 0.35,
  gameOver: 0.4,
  gameComplete: 0.4,
  pause: 0.3,
  resume: 0.3,
};

export class GameAudio {
  private sounds = new Map<GameSound, HTMLAudioElement>();
  private activeClones = new Set<HTMLAudioElement>();

  public play(sound: GameSound): void {
    let baseAudio = this.sounds.get(sound);

    if (!baseAudio) {
      baseAudio = new Audio(SOUND_PATHS[sound]);
      baseAudio.preload = "auto";
      this.sounds.set(sound, baseAudio);
    }

    const audio =
      baseAudio.paused || baseAudio.ended
        ? baseAudio
        : (baseAudio.cloneNode(true) as HTMLAudioElement);

    if (audio !== baseAudio) {
      this.activeClones.add(audio);
    }

    audio.volume = SOUND_VOLUMES[sound];
    audio.currentTime = 0;

    audio.addEventListener(
      "ended",
      () => {
        if (audio !== baseAudio) {
          this.activeClones.delete(audio);
          audio.removeAttribute("src");
          audio.load();
        }
      },
      { once: true },
    );

    void audio.play().catch(() => {
      // Autoplay policies or failed audio requests must not break gameplay.
      if (audio !== baseAudio) {
        this.activeClones.delete(audio);
        audio.removeAttribute("src");
        audio.load();
      }
    });
  }

  public destroy(): void {
    for (const audio of this.sounds.values()) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }

    for (const audio of this.activeClones) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }

    this.sounds.clear();
    this.activeClones.clear();
  }
}
