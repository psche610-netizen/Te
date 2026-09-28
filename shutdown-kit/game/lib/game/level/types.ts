export type Axis = 'x' | 'z'

export type CellKind = 'void' | 'floor' | 'wall' | 'door' | 'dynamic' | 'gate' | 'prop'

export interface Box {
  x: number
  y: number
  z: number
  sx: number
  sy: number
  sz: number
  rotY?: number
}

export interface AABB {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

interface Module {
  id: number
  cx: number
  cz: number
  x: number
  z: number
}

export interface DoorModule extends Module {
  axis: Axis
  open: boolean
  locked: boolean
  panelAabb: AABB
  /** A shift is about to close this door. */
  telegraph: boolean
}

export interface DynamicWallModule extends Module {
  axis: Axis
  raised: boolean
  aabb: AABB
  /** A shift is about to move this wall. */
  telegraph: boolean
}

export interface GateModule extends Module {
  axis: Axis
  powered: boolean
  open: boolean
  /** 0..1 while the player opens it. */
  progress: number
  /** Blocks only while closed. */
  aabb: AABB
}

export type WallSide = 'N' | 'S' | 'W' | 'E'

/** Camera on the wall on `wall` side of floor cell (cx, cz), looking into the room. */
export interface CameraDef {
  cx: number
  cz: number
  wall: WallSide
}

export interface CameraModule extends Module {
  /** Looking direction at the centre of the sweep. */
  baseAngle: number
  angle: number
  blindTimer: number
  seenTime: number
  cooldown: number
}

export interface PropModule extends Module {
  rotY: number
}

export interface LevelDef {
  id: string
  name: string
  /**
   * One char per grid cell.
   * `#` wall  `D` door  `=` dynamic wall (raised)  `-` dynamic wall (lowered)
   * `E` exit gate  `L` locker  `G` generator  `c` crate  `P` player spawn  `.` floor  ` ` void
   */
  rows: string[]
  cameras?: CameraDef[]
}

export interface LevelData {
  id: string
  name: string
  width: number
  height: number
  cellSize: number
  cells: CellKind[]
  wallArms: Box[]
  wallPosts: Box[]
  floorCells: { cx: number; cz: number }[]
  doors: DoorModule[]
  dynamicWalls: DynamicWallModule[]
  gates: GateModule[]
  lockers: PropModule[]
  generators: PropModule[]
  crates: PropModule[]
  cameras: CameraModule[]
  spawn: { x: number; z: number }
  staticColliders: AABB[]
  /** Per-cell indices into `staticColliders`. */
  buckets: number[][]
}
