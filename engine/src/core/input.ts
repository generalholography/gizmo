export interface InputState {
  /** left/right movement */
  moveX: number;
  /** upward/downward movement */
  moveY: number;
  /** forward/back movement */
  moveZ: number;
  /** camera yaw */
  yaw: number;
  /** camera pitch */
  pitch: number;
  /** interaction hold time */
  interact: number;
  /** primary action hold time */
  primary: number;
  /** secondary action hold time */
  secondary: number;
  /** sprint key active */
  sprint: boolean;
}

export const defaultInputState: InputState = {
  moveX: 0,
  moveY: 0,
  moveZ: 0,
  yaw: 0,
  pitch: 0,
  interact: 0,
  primary: 0,
  secondary: 0,
  sprint: false,
};
