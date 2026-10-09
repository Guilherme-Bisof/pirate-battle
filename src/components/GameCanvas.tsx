import React, { useEffect, useRef } from "react";
import { GameEngine } from "../game/core/GameEngine";
import type { GameConfig, GameOverResult, HudState } from "../game/types/gameConfig";

interface GameCanvasProps {
    config: GameConfig;
    isPaused: boolean;
    onGameOver: (result: GameOverResult) => void;
    onHudUpdate: (hud: HudState) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
    config,
    isPaused,
    onGameOver,
    onHudUpdate,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const engineRef = useRef<GameEngine | null> (null);

    useEffect(() => {
        if (!containerRef.current) return;
        
        const engine = new GameEngine({
            container: containerRef.current,
            config,
            onGameOver,
            onHudUpdate,
        });

        engineRef.current = engine;
        engine.init();

        return () => {
            engine.destroy();
            engineRef.current = null;
        };
    }, [config, onGameOver, onHudUpdate]);

    useEffect(() => {
        if (engineRef.current) {
            engineRef.current.setPaused(isPaused);
        }
    }, [isPaused]);

    return <div ref={containerRef} className="w-full h-full relative overflow-hidden select-none" />;
}