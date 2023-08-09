import { list } from "postcss";

export type Action = "strum-up" | "strum-down" | "0" | "1" | "2" | "3" | "4";
export type ActionMap = Record<string, Action>;

const actionStates = ["inactive", "pressed", "held"] as const;
type ActionState = (typeof actionStates)[number];

type ActionStateMap = {
  [k in Action]: ActionState;
};

const defaultKeyboardKeyMap: ActionMap = {
  "1": "0",
  "2": "1",
  "3": "2",
  "4": "3",
  "5": "4",
  ArrowUp: "strum-up",
  ArrowDown: "strum-down",
};

const baseActionStateMap: ActionStateMap = {
  "strum-up": "inactive",
  "strum-down": "inactive",
  "0": "inactive",
  "1": "inactive",
  "2": "inactive",
  "3": "inactive",
  "4": "inactive",
};

function getGamepadId(gamepad: Gamepad): string {
  return gamepad.id + gamepad.index;
}

export class InputManager {
  private readonly keyMaps: Record<string, ActionMap>;
  private readonly actionStateMaps: Record<string, ActionStateMap>;
  private readonly eventListeners: [keyof WindowEventMap, Function][] = [];

  // TODO use constructor parameter + svelte stores + localStorage to make rebindable per-device keymaps
  constructor(keyMaps?: Record<string, ActionMap>) {
    if (keyMaps && "keyboard" in keyMaps) {
      this.keyMaps = keyMaps;
    } else {
      this.keyMaps = {
        keyboard: defaultKeyboardKeyMap,
      };
    }
    this.actionStateMaps = Object.fromEntries(
      Object.keys(this.keyMaps).map((key) => [key, { ...baseActionStateMap }])
    );

    this.addEventListener("gamepadconnected", this.onGamepadConnected);
    this.addEventListener("gamepaddisconnected", this.onGamepadDisconnected);
    this.addEventListener("keydown", this.onKeyDown);
    this.addEventListener("keyup", this.onKeyUp.bind(this));
  }

  private addEventListener<K extends keyof WindowEventMap>(
    type: K,
    listener: (ev: WindowEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): void {
    const boundListener = listener.bind(this);
    window.addEventListener(type, boundListener, options);
    this.eventListeners.push([type, boundListener]);
  }

  private setActionState(
    controllerName: string,
    action: Action,
    state: ActionState
  ): void {
    const currentState = this.actionStateMaps["keyboard"][action];
    if (currentState !== state) {
      this.actionStateMaps[controllerName][action] = state;
      console.log(controllerName, action, state);
    }
  }

  private onKeyUp(ev: KeyboardEvent): void {
    const keyMap = this.keyMaps["keyboard"];
    const action = keyMap[ev.key];
    if (action) {
      this.setActionState("keyboard", action, "inactive");
    }
  }

  private onKeyDown(ev: KeyboardEvent): void {
    const keyMap = this.keyMaps["keyboard"];
    const action = keyMap[ev.key];
    if (action) {
      const currentState = this.actionStateMaps["keyboard"][action];
      this.setActionState(
        "keyboard",
        action,
        currentState === "inactive" ? "pressed" : "held"
      );
    }
  }

  private onGamepadConnected({ gamepad }: GamepadEvent): void {
    // note that we don't set up a default action map - we expect that to be passed in externally since there's
    // so many different controllers. action maps can be set in the constructor or via setActionMap
    console.log(gamepad, "connect");
    this.actionStateMaps[getGamepadId(gamepad)] = { ...baseActionStateMap };
  }

  private onGamepadDisconnected({ gamepad }: GamepadEvent): void {
    console.log(gamepad, "disconnect");
    delete this.actionStateMaps[getGamepadId(gamepad)];
  }

  destroy(): void {
    this.eventListeners.forEach(([key, listener]) => {
      window.removeEventListener(key, listener as any);
    });
  }

  setActionMap(controllerName: string, map: ActionMap): void {
    this.keyMaps[controllerName] = map;
  }

  getActionState(action: Action): ActionState | undefined {
    const prioInput = Math.max(
      ...Object.values(this.actionStateMaps).map((v) =>
        actionStates.indexOf(v[action])
      )
    );
    return actionStates[prioInput];
  }

  update(): void {
    // TODO test this
    for (const gamepad of navigator.getGamepads()) {
      if (gamepad === null) {
        continue;
      }

      const gamepadId = getGamepadId(gamepad);
      const keyMap = this.keyMaps[gamepadId];
      const actionStateMap = this.actionStateMaps[gamepadId];
      if (!keyMap || !actionStateMap) {
        continue;
      }

      for (const [index, btn] of gamepad.buttons.entries()) {
        const btnId = index.toString();
        const action = keyMap[btnId];
        if (action) {
          const currentState = actionStateMap[action];
          const nextState = btn.pressed
            ? currentState === "inactive"
              ? "pressed"
              : "held"
            : "inactive";
          this.setActionState(gamepadId, action, nextState);
        }
      }
    }
  }
}
