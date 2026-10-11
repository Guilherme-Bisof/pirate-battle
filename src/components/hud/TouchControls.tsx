import type { PointerEvent } from "react";
import type { InputState } from "../../game/systems/InputManager";

interface TouchControlsProps {
  onInputChange: (key: keyof InputState, pressed: boolean) => void;
}

interface TouchButtonProps {
  inputKey: keyof InputState;
  label: string;
  symbol: string;
  onInputChange: TouchControlsProps["onInputChange"];
}

function TouchButton({
  inputKey,
  label,
  symbol,
  onInputChange,
}: TouchButtonProps) {
  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    onInputChange(inputKey, true);
  }

  function handlePointerUp(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    onInputChange(inputKey, false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => onInputChange(inputKey, false)}
      onLostPointerCapture={() => onInputChange(inputKey, false)}
      className="pointer-events-auto touch-none select-none rounded-xl border border-slate-400/50 bg-slate-950/80 px-3 py-3 font-bold text-white shadow-lg backdrop-blur active:bg-amber-500 active:text-slate-950"
    >
      <span className="block text-sm">{symbol}</span>
      <span className="block text-[10px]">{label}</span>
    </button>
  );
}

export function TouchControls({ onInputChange }: TouchControlsProps) {
  return (
    <div
      aria-label="Touch controls"
      className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex items-end justify-between gap-3 px-3 sm:hidden"
    >
      <div className="grid grid-cols-3 items-end gap-2">
        <span />
        <TouchButton
          inputKey="forward"
          label="Move"
          symbol="▲"
          onInputChange={onInputChange}
        />
        <span />

        <TouchButton
          inputKey="rotateLeft"
          label="Turn left"
          symbol="◀"
          onInputChange={onInputChange}
        />
        <span />
        <TouchButton
          inputKey="rotateRight"
          label="Turn right"
          symbol="▶"
          onInputChange={onInputChange}
        />
      </div>

      <div className="flex flex-col items-center gap-2">
        <TouchButton
          inputKey="fireFront"
          label="Fire forward"
          symbol="FIRE"
          onInputChange={onInputChange}
        />

        <div className="flex gap-2">
          <TouchButton
            inputKey="fireLeft"
            label="Left cannons"
            symbol="L"
            onInputChange={onInputChange}
          />

          <TouchButton
            inputKey="fireRight"
            label="Right cannons"
            symbol="R"
            onInputChange={onInputChange}
          />
        </div>
      </div>
    </div>
  );
}
