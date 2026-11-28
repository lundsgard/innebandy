import {
  BALL_RADIUS, GOAL_Z, GOAL_HALF_WIDTH, GOAL_POST_RADIUS, GOAL_CROSSBAR_Y,
  KEEPER_Z, KEEPER_HALF_WIDTH, KEEPER_SCALE, SHOT_SPEED, distanceToGoalFrame, isInsideRink,
} from './rink-dimensions';
export { BALL_RADIUS, GOAL_Z, GOAL_HEIGHT, GOAL_HALF_WIDTH, KEEPER_Z, KEEPER_HALF_WIDTH } from './rink-dimensions';
export const GRAVITY = 9.81;

export type Point3 = { x: number; y: number; z: number };
export type ShotPoint = { x: number; y?: number; z: number };
export type ShotResult = 'goal' | 'save' | 'post' | 'miss' | 'over';
export type ShotOutcome = { result: ShotResult; point: Point3 };
export type KeeperPose = { x: number; gloves: Point3[] };

export function directedShotOutcome(from: Point3, to: Point3, keeperFrom: KeeperPose, keeperTo: KeeperPose, direction: -1 | 1): ShotOutcome | undefined {
  const mirror = direction === 1 ? -1 : 1;
  const pose = (value: KeeperPose): KeeperPose => ({ x: value.x, gloves: value.gloves.map(glove => ({ ...glove, z: glove.z * mirror })) });
  const outcome = getShotOutcome({ ...from, z: from.z * mirror }, { ...to, z: to.z * mirror }, pose(keeperFrom), pose(keeperTo));
  return outcome && { result: outcome.result, point: { ...outcome.point, z: outcome.point.z * mirror } };
}

export function shotVelocity(from: Point3, target: Point3, speed = SHOT_SPEED): Point3 {
  const dx = target.x - from.x;
  const dz = target.z - from.z;
  const distance = Math.max(0.15, Math.hypot(dx, dz));
  const time = Math.max(0.12, distance / speed);
  return { x: dx / time, z: dz / time, y: target.y <= BALL_RADIUS + 0.001 ? 0 : (target.y - from.y + 0.5 * GRAVITY * time * time) / time };
}

export function projectileAt(from: Point3, velocity: Point3, time: number): Point3 {
  return { x: from.x + velocity.x * time, y: Math.max(BALL_RADIUS, from.y + velocity.y * time - 0.5 * GRAVITY * time * time), z: from.z + velocity.z * time };
}

// Hela vägen mellan bildrutorna kontrolleras, även vid höga och snabba skott.
export function getShotOutcome(from: ShotPoint, to: ShotPoint, keeperFrom: number | KeeperPose, keeperTo: number | KeeperPose): ShotOutcome | undefined {
  const a = typeof keeperFrom === 'number' ? { x: keeperFrom, gloves: [] } : keeperFrom;
  const b = typeof keeperTo === 'number' ? { x: keeperTo, gloves: [] } : keeperTo;
  const fromY = from.y ?? BALL_RADIUS;
  const toY = to.y ?? BALL_RADIUS;
  function at(fraction: number): Point3 {
    return { x: from.x + (to.x - from.x) * fraction, y: fromY + (toY - fromY) * fraction, z: from.z + (to.z - from.z) * fraction };
  }
  function crossing(z: number) {
    if (from.z <= z || to.z > z) return undefined;
    const fraction = (from.z - z) / (from.z - to.z);
    return { fraction, point: at(fraction) };
  }
  const hits: { fraction: number; outcome: ShotOutcome }[] = [];
  const body = crossing(KEEPER_Z);
  if (body) {
    const x = a.x + (b.x - a.x) * body.fraction;
    const dx = Math.abs(body.point.x - x);
    const y = body.point.y;
    const pads = y <= 0.4 * KEEPER_SCALE + BALL_RADIUS && dx <= KEEPER_HALF_WIDTH + BALL_RADIUS;
    const torso = y >= 0.38 * KEEPER_SCALE && y <= 1.07 * KEEPER_SCALE + BALL_RADIUS && dx <= 0.29 * KEEPER_SCALE + BALL_RADIUS;
    const helmet = y >= 1.03 * KEEPER_SCALE && y <= 1.44 * KEEPER_SCALE + BALL_RADIUS && dx <= 0.17 * KEEPER_SCALE + BALL_RADIUS;
    if (pads || torso || helmet) hits.push({ fraction: body.fraction, outcome: { result: 'save', point: body.point } });
  }
  a.gloves.forEach((glove, index) => {
    const end = b.gloves[index] ?? glove;
    const firstDistance = from.z - glove.z;
    const lastDistance = to.z - end.z;
    if (firstDistance <= 0 || lastDistance > 0) return;
    const fraction = firstDistance / (firstDistance - lastDistance);
    const point = at(fraction);
    const x = glove.x + (end.x - glove.x) * fraction;
    const y = glove.y + (end.y - glove.y) * fraction;
    if (Math.hypot(point.x - x, point.y - y) <= 0.12 * KEEPER_SCALE + BALL_RADIUS) {
      hits.push({ fraction, outcome: { result: 'save', point } });
    }
  });
  const goal = crossing(GOAL_Z);
  if (goal) {
    const { x, y } = goal.point;
    const frameHit = distanceToGoalFrame(x, y) <= BALL_RADIUS + GOAL_POST_RADIUS;
    let result: ShotResult | undefined;
    if (frameHit) result = 'post';
    else if (y > GOAL_CROSSBAR_Y - GOAL_POST_RADIUS - BALL_RADIUS) result = 'over';
    else if (Math.abs(x) < GOAL_HALF_WIDTH - GOAL_POST_RADIUS - BALL_RADIUS) result = 'goal';
    if (result) hits.push({ fraction: goal.fraction, outcome: { result, point: goal.point } });
  }
  if (hits.length) return hits.sort((first, second) => first.fraction - second.fraction)[0].outcome;
  if (!isInsideRink(to, -BALL_RADIUS)) return { result: 'miss', point: { ...to, y: toY } };
}
