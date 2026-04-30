export type Binding = [string, string];

export interface PhysicsConfig {
  gravity: number;
  playerRadius: number;
  playerHeight: number;
  enemyRadius: number;
  enemyHeight: number;
}

export interface Weapon {
  name: string;
  mode: string;
  damage: number;
  fireRate: number;
  reach: number;
  projectileSpeed: number;
  multishot: number;
  pierce: number;
  orbitals: number;
  chain: number;
  upgrades: string[];
}

export interface EnemyTypeConfig {
  label: string;
  hp: number;
  speed: number;
  damage: number;
  range: number;
  color: string;
  attack: string;
  stationary?: boolean;
  minion?: boolean;
}

export interface EnemyModelConfig {
  url: string;
  height: number;
  yaw: number;
  pitch?: number;
  roll?: number;
}

export interface PlayerState {
  group: any;
  hp: number;
  stamina: number;
  sanity: number;
  goon: number;
  age: number;
  decay: number;
  speed: number;
  int: number;
  str: number;
  grit: number;
  luck: number;
  level: number;
  kills: number;
  weaponIndex: number;
  invuln: number;
  attackCd: number;
  shotCd: number;
  shoulderCd: number;
  repairKits: number;
  yVelocity: number;
  grounded: boolean;
  dead: boolean;
}

export interface PointerState {
  locked: boolean;
  yaw: number;
  pitch: number;
}

export interface InputState {
  left: boolean;
  right: boolean;
}

export interface LockState {
  target: any;
  marker: any;
  enabled: boolean;
}

export interface DebugCollisionState {
  enabled: boolean;
  dirty: boolean;
  group: any;
  staticGroup: any;
  dynamicGroup: any;
}

export interface GameState {
  keys: Set<string>;
  pointer: PointerState;
  input: InputState;
  lock: LockState;
  player: PlayerState;
  weapons: Weapon[];
  enemies: any[];
  projectiles: any[];
  impacts: any[];
  levelObjects: any[];
  colliders: any[];
  floorZones: any[];
  spawnPoints: any[];
  debugCollision: DebugCollisionState;
  wave: number;
  levelSeed: number;
  enemyNameSerial: number;
  waveHostileCount: number;
  portal: any;
  portalActive: boolean;
}

export interface GameContext {
  canvas: HTMLCanvasElement;
  renderer: any;
  scene: any;
  camera: any;
  clock: any;
  materials: Record<string, any>;
  hud: any;
  audio: any;
  state: GameState;
}
