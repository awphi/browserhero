export type ButtonAction =
  | "strum-up"
  | "strum-down"
  | "0"
  | "1"
  | "2"
  | "3"
  | "4";
export type AxisAction = "whammy";

export type AxisToButtonAction = {
  min: number;
  max: number;
  buttonAction: ButtonAction;
};
export type ButtonToAxisAction = {
  axisAction: AxisAction;
  pressedValue: number;
  unpressedValue: number;
};
export type ActionMap = {
  buttons: Record<string, ButtonAction | ButtonToAxisAction>;
  axes: Record<string, AxisAction | AxisToButtonAction[]>;
};

const buttonActionStates = ["inactive", "pressed", "held"] as const;
type ButtonActionState = (typeof buttonActionStates)[number];

type ActionStateMap = {
  [k in ButtonAction]: ButtonActionState;
} & {
  [k in AxisAction]: number;
};

const defaultKeyboardMap: ActionMap = {
  buttons: {
    "1": "0",
    "2": "1",
    "3": "2",
    "4": "3",
    "5": "4",
    ArrowUp: "strum-up",
    ArrowDown: "strum-down",
  },
  axes: {},
};

const defaultGH4Map: ActionMap = {
  buttons: {
    "1": "0",
    "2": "1",
    "0": "2",
    "3": "3",
    "4": "4",
  },
  axes: {
    "9": [
      {
        min: -1.25,
        max: -0.75,
        buttonAction: "strum-up",
      },
      {
        max: 0.25,
        min: -0.25,
        buttonAction: "strum-down",
      },
    ],
    "2": "whammy",
  },
};

const baseActionStateMap: ActionStateMap = {
  "strum-up": "inactive",
  "strum-down": "inactive",
  "0": "inactive",
  "1": "inactive",
  "2": "inactive",
  "3": "inactive",
  "4": "inactive",
  whammy: 0,
};

export class InputManager {
  private readonly actionMaps: Record<string, ActionMap>;
  private readonly actionStateMaps: Record<string, ActionStateMap>;
  private readonly eventListeners: [keyof WindowEventMap, Function][] = [];
  private readonly keyboardState: Record<string, boolean> = Object.create(null);

  // TODO use constructor parameter + svelte stores + localStorage to make rebindable per-device actionmaps
  constructor(actionMaps?: Record<string, ActionMap>) {
    if (actionMaps && "keyboard" in actionMaps) {
      this.actionMaps = actionMaps;
    } else {
      this.actionMaps = {
        keyboard: defaultKeyboardMap,
        // a default map for a controller we have. worth checking if the key mapping is consistent per controller ID
        "Guitar Hero4 for PlayStation (R) 3 (Vendor: 12ba Product: 0100)":
          defaultGH4Map,
      };
    }
    this.actionStateMaps = Object.fromEntries(
      Object.keys(this.actionMaps).map((key) => [
        key,
        { ...baseActionStateMap },
      ])
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
    action: AxisAction | ButtonAction,
    state: number | ButtonActionState
  ): void {
    const currentState = this.actionStateMaps[controllerName][action];
    if (currentState !== state) {
      const actionMap = this.actionStateMaps[controllerName];
      // dangerously case action map to any to avoid TS errors
      // just be careful not to set an axis action with a button state
      // or a button action with a number
      (actionMap as any)[action] = state;
      console.log(controllerName, action, state);
    }
  }

  private onKeyUp({ key }: KeyboardEvent): void {
    this.keyboardState[key] = false;
  }

  private onKeyDown({ key }: KeyboardEvent): void {
    this.keyboardState[key] = true;
  }

  private onGamepadConnected({ gamepad }: GamepadEvent): void {
    // note that we don't set up a default action map - we expect that to be passed in externally since there's
    // so many different controllers. action maps can be set in the constructor or via setActionMap
    this.actionStateMaps[gamepad.index.toString()] = { ...baseActionStateMap };
  }

  private onGamepadDisconnected({ gamepad }: GamepadEvent): void {
    delete this.actionStateMaps[gamepad.index.toString()];
  }

  destroy(): void {
    this.eventListeners.forEach(([key, listener]) => {
      window.removeEventListener(key, listener as any);
    });
  }

  setActionMap(controllerName: string, map: ActionMap): void {
    this.actionMaps[controllerName] = map;
  }

  getButtonState(action: ButtonAction): ButtonActionState | undefined {
    const prioInput = Math.max(
      ...Object.values(this.actionStateMaps).map((v) =>
        buttonActionStates.indexOf(v[action])
      )
    );
    return buttonActionStates[prioInput];
  }

  getAxisState(action: AxisAction): number | undefined {
    const prioInput = Math.max(
      ...Object.values(this.actionStateMaps).map((v) => v[action])
    );
    return prioInput;
  }

  private updateGamepads(): void {
    for (const gamepad of navigator.getGamepads()) {
      if (gamepad === null) {
        continue;
      }

      const gamepadIndex = gamepad.index.toString();
      // action maps are tied to the name of the controller whereas action state is tied to the individual device
      const map = this.actionMaps[gamepad.id];
      const actionStateMap = this.actionStateMaps[gamepadIndex];
      if (!map || !actionStateMap) {
        continue;
      }

      for (const [index, btn] of gamepad.buttons.entries()) {
        const btnId = index.toString();
        const action = map.buttons[btnId];
        if (typeof action === "string") {
          const currentState = actionStateMap[action];
          const nextPressedState =
            currentState === "inactive" ? "pressed" : "held";
          const nextState = btn.pressed ? nextPressedState : "inactive";
          this.setActionState(gamepadIndex, action, nextState);
        } else if (action) {
          const value = btn.pressed
            ? action.pressedValue
            : action.unpressedValue;
          this.setActionState(gamepadIndex, action.axisAction, value);
        }
      }

      // TODO test all this works
      for (const [index, axis] of gamepad.axes.entries()) {
        const btnId = index.toString();
        const action = map.axes[btnId];
        if (Array.isArray(action)) {
          for (const act of action) {
            const pressed = axis > act.min && axis < act.max;
            const currentState = actionStateMap[act.buttonAction];
            const nextPressedState =
              currentState === "inactive" ? "pressed" : "held";
            const nextState = pressed ? nextPressedState : "inactive";
            this.setActionState(gamepadIndex, act.buttonAction, nextState);
          }
        } else if (action) {
          this.setActionState(gamepadIndex, action, axis);
        }
      }
    }
  }

  private updateKeyboard(): void {
    const map = this.actionMaps["keyboard"];
    for (const [key, pressed] of Object.entries(this.keyboardState)) {
      const action = map.buttons[key];
      if (typeof action === "string") {
        const currentState = this.actionStateMaps["keyboard"][action];
        const nextPressedState =
          currentState === "inactive" ? "pressed" : "held";
        const nextState = pressed ? nextPressedState : "inactive";
        this.setActionState("keyboard", action, nextState);
      } else if (action) {
        const value = pressed ? action.pressedValue : action.unpressedValue;
        this.setActionState("keyboard", action.axisAction, value);
      }
    }
  }

  update(): void {
    this.updateGamepads();
    this.updateKeyboard();
  }
}
