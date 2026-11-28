// Alla längder i spelvärlden anges i meter. Se måttkällor i README.md.
export const RINK = {
  width: 20,
  length: 40,
  cornerRadius: 2,
  boardHeight: 0.5,
  boardThickness: 0.06,
  lineWidth: 0.05,
  goalLineFromEnd: 3.5,
  creaseWidth: 5,
  creaseLength: 4,
  creaseRearFromEnd: 2.85,
  keeperAreaWidth: 2.5,
  keeperAreaLength: 1,
} as const;

export const GOAL_WIDTH = 1.6;
export const GOAL_HEIGHT = 1.15;
export const GOAL_POST_RADIUS = 0.016;
export const GOAL_BACK_BAR_RADIUS = 0.01;
export const GOAL_BOTTOM_DEPTH = 0.65;
export const GOAL_TOP_DEPTH = 0.4;
export const GOAL_CORNER_RADIUS = 0.1;
export const GOAL_Z = -(RINK.length / 2 - RINK.goalLineFromEnd);
export const GOAL_HALF_WIDTH = GOAL_WIDTH / 2 - GOAL_POST_RADIUS;
export const GOAL_CROSSBAR_Y = GOAL_HEIGHT - GOAL_POST_RADIUS;
export const GOAL_BACK_Z = GOAL_Z + GOAL_POST_RADIUS - GOAL_BOTTOM_DEPTH + GOAL_BACK_BAR_RADIUS;
export const GOAL_TOP_BACK_Z = GOAL_Z + GOAL_POST_RADIUS - GOAL_TOP_DEPTH + GOAL_BACK_BAR_RADIUS;
export const KEEPER_Z = GOAL_Z + 0.55;
export const BALL_RADIUS = 0.036;
export const PLAYER_HEIGHT = 1.8;
export const PLAYER_MODEL_HEIGHT = 1.84;
export const PLAYER_SCALE = PLAYER_HEIGHT / PLAYER_MODEL_HEIGHT;
export const PLAYER_RADIUS = 0.28;
export const CLUB_SHAFT_TOP: [number, number, number] = [0.24, 1.16, -0.32];
export const CLUB_SHAFT_BOTTOM: [number, number, number] = [0.62, 0.09, -0.57];
export const CLUB_UPPER_HAND: [number, number, number] = [0.261, 1.10, -0.334];
export const CLUB_LOWER_HAND: [number, number, number] = [0.35, 0.85, -0.392];
export const CLUB_BLADE_POINTS: [number, number, number][] = [[0.62, 0.04 / PLAYER_SCALE, -0.57], [0.79, 0.04 / PLAYER_SCALE, -0.61], [0.86, 0.04 / PLAYER_SCALE, -0.68]];
export const STICK_BALL_OFFSET = { x: 0.82 * PLAYER_SCALE, z: -0.695 * PLAYER_SCALE };
export const KEEPER_SCALE = 1.25 / 1.44;
export const KEEPER_HALF_WIDTH = 0.43 * KEEPER_SCALE;
export const RUN_SPEED = 5.5;
export const AI_RUN_SPEED = 3.8;
export const PASS_SPEED = 12;
export const SHOT_SPEED = 22;

export type PlanPoint = { x: number; z: number };

export function constrainToRink(point: PlanPoint, margin = 0): PlanPoint {
  const halfWidth = RINK.width / 2 - margin;
  const halfLength = RINK.length / 2 - margin;
  const radius = RINK.cornerRadius - margin;
  let x = Math.max(-halfWidth, Math.min(halfWidth, point.x));
  let z = Math.max(-halfLength, Math.min(halfLength, point.z));
  const cornerX = RINK.width / 2 - RINK.cornerRadius;
  const cornerZ = RINK.length / 2 - RINK.cornerRadius;
  const dx = Math.abs(x) - cornerX;
  const dz = Math.abs(z) - cornerZ;
  if (dx > 0 && dz > 0 && Math.hypot(dx, dz) > radius) {
    const factor = radius / Math.hypot(dx, dz);
    x = Math.sign(x) * (cornerX + dx * factor);
    z = Math.sign(z) * (cornerZ + dz * factor);
  }
  return { x, z };
}

export function isInsideRink(point: PlanPoint, margin = 0) {
  const constrained = constrainToRink(point, margin);
  return Math.hypot(point.x - constrained.x, point.z - constrained.z) < 1e-8;
}

export function bounceOffBoards(point: PlanPoint & { y: number }, velocity: PlanPoint, radius = BALL_RADIUS) {
  if (point.y - radius > RINK.boardHeight) return false;
  const inside = constrainToRink(point, radius);
  const dx = point.x - inside.x;
  const dz = point.z - inside.z;
  const distance = Math.hypot(dx, dz);
  if (distance < 1e-9) return false;
  const nx = dx / distance;
  const nz = dz / distance;
  const outwardSpeed = velocity.x * nx + velocity.z * nz;
  if (outwardSpeed > 0) {
    velocity.x -= 1.8 * outwardSpeed * nx;
    velocity.z -= 1.8 * outwardSpeed * nz;
  }
  point.x = inside.x;
  point.z = inside.z;
  return true;
}

export function bounceOffGoalNet(from: PlanPoint & { y: number }, to: PlanPoint & { y: number }, velocity: PlanPoint & { y: number }) {
  const hits: { t: number; axis: 'x' | 'z'; side: number }[] = [];
  const front = -GOAL_Z;
  const bottom = -GOAL_BACK_Z;
  const slope = (GOAL_TOP_BACK_Z - GOAL_BACK_Z) / GOAL_CROSSBAR_Y;
  for (const end of [-1, 1]) {
    const a = from.z * end - (bottom - slope * from.y) - BALL_RADIUS;
    const b = to.z * end - (bottom - slope * to.y) - BALL_RADIUS;
    if (a > 0 && b <= 0) {
      const t = a / (a - b);
      const x = from.x + (to.x - from.x) * t;
      const y = from.y + (to.y - from.y) * t;
      if (Math.abs(x) <= GOAL_HALF_WIDTH + BALL_RADIUS && y <= GOAL_HEIGHT + BALL_RADIUS) hits.push({ t, axis: 'z', side: end });
    }
    for (const side of [-1, 1]) {
      const a = from.x * side - GOAL_HALF_WIDTH - BALL_RADIUS;
      const b = to.x * side - GOAL_HALF_WIDTH - BALL_RADIUS;
      if (a <= 0 || b > 0) continue;
      const t = a / (a - b);
      const z = (from.z + (to.z - from.z) * t) * end;
      const y = from.y + (to.y - from.y) * t;
      if (z >= front && z <= bottom - slope * y && y <= GOAL_HEIGHT + BALL_RADIUS) hits.push({ t, axis: 'x', side });
    }
  }
  const hit = hits.sort((a, b) => a.t - b.t)[0];
  if (!hit) return false;
  to.x = from.x + (to.x - from.x) * hit.t;
  to.y = from.y + (to.y - from.y) * hit.t;
  to.z = from.z + (to.z - from.z) * hit.t;
  to[hit.axis] += hit.side * 0.003;
  velocity[hit.axis] *= -0.4;
  velocity.y *= 0.4;
  return true;
}

// Spelare och bollhållare ska kunna gå runt, men inte genom, målnäten.
export function keepOutsideGoalNets(point: PlanPoint, margin: number): PlanPoint {
  const result = { ...point };
  for (const side of [-1, 1]) {
    const z = result.z * side;
    const front = -GOAL_Z - GOAL_POST_RADIUS - margin;
    const back = -GOAL_BACK_Z + GOAL_BACK_BAR_RADIUS + margin;
    const halfWidth = GOAL_WIDTH / 2 + margin;
    if (Math.abs(result.x) >= halfWidth || z <= front || z >= back) continue;
    const exits = [
      { gap: halfWidth - result.x, x: halfWidth, z },
      { gap: halfWidth + result.x, x: -halfWidth, z },
      { gap: z - front, x: result.x, z: front },
      { gap: back - z, x: result.x, z: back },
    ].sort((a, b) => a.gap - b.gap);
    result.x = exits[0].x;
    result.z = exits[0].z * side;
  }
  return result;
}

export function goalFramePoints(): { x: number; y: number }[] {
  const r = GOAL_CORNER_RADIUS;
  const y = GOAL_CROSSBAR_Y - r;
  const points = [{ x: -GOAL_HALF_WIDTH, y: GOAL_POST_RADIUS }, { x: -GOAL_HALF_WIDTH, y }];
  for (let i = 1; i <= 16; i++) {
    const angle = i / 16 * Math.PI / 2;
    points.push({ x: -GOAL_HALF_WIDTH + r - r * Math.cos(angle), y: y + r * Math.sin(angle) });
  }
  points.push({ x: GOAL_HALF_WIDTH - r, y: GOAL_CROSSBAR_Y });
  for (let i = 1; i <= 16; i++) {
    const angle = (1 - i / 16) * Math.PI / 2;
    points.push({ x: GOAL_HALF_WIDTH - r + r * Math.cos(angle), y: y + r * Math.sin(angle) });
  }
  points.push({ x: GOAL_HALF_WIDTH, y: GOAL_POST_RADIUS });
  return points;
}

const frontFrame = goalFramePoints();
export function distanceToGoalFrame(x: number, y: number) {
  let closest = Infinity;
  for (let i = 1; i < frontFrame.length; i++) {
    const a = frontFrame[i - 1];
    const b = frontFrame[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy)));
    closest = Math.min(closest, Math.hypot(x - a.x - dx * t, y - a.y - dy * t));
  }
  return closest;
}
