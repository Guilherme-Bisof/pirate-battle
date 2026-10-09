export interface InputState {
    forward: boolean;
    rotateLeft: boolean;
    rotateRight: boolean;
    fireFront: boolean;
    fireLeft: boolean;
    fireRight: boolean;
}

export class InputManager {
    private state: InputState = {
        forward: false,
        rotateLeft: false,
        rotateRight: false,
        fireFront: false,
        fireLeft: false,
        fireRight: false,
    };

    private active = false;

    constructor() {
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
    }

    public attach(): void {
        if (this.active) return;
        this.active = true;
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
    }

    public detach(): void {
        this.active = false;
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
        this.reset();
    }

    public reset(): void {
        this.state = {
            forward: false,
            rotateLeft: false,
            rotateRight: false,
            fireFront: false,
            fireLeft: false,
            fireRight: false,
        };
    }

    public getState(): Readonly<InputState> {
        return this.state;
    }

    public setVirtualInput(key: keyof InputState, value: boolean): void {
        this.state[key] = value;
    }

    private handleKeyDown(e: KeyboardEvent): void {
        if (!this.active) return;
        this.mapKeyCode(e.code, true);
    }

    private handleKeyUp(e: KeyboardEvent): void {
        if (!this.active) return;
        this.mapKeyCode(e.code, false);
    }

    private mapKeyCode(code: string, pressed: boolean): void {
        switch (code) {
            case 'KeyW':
            case 'ArrowUp':
                this.state.forward = pressed;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.state.rotateLeft = pressed;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.state.rotateRight = pressed;
                break;
            case 'Space':
                this.state.fireFront = pressed;
                break;
            case 'KeyQ':
                this.state.fireLeft = pressed;
                break;
            case 'KeyE':
                this.state.fireRight = pressed;
                break;
        }
    }
}