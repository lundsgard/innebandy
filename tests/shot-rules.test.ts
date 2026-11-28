import test from 'node:test';
import assert from 'node:assert/strict';
import { getShotOutcome, KEEPER_Z, GOAL_Z, GOAL_HALF_WIDTH, BALL_RADIUS } from '../src/shot-rules';
import { RINK } from '../src/rink-dimensions';

test('ett snabbt skott mitt på målvakten räddas före mållinjen', () => {
  const outcome = getShotOutcome({ x: 0, z: 0 }, { x: 0, z: GOAL_Z - 1 }, 0, 0);
  assert.equal(outcome?.result, 'save');
  assert.equal(outcome?.point.z, KEEPER_Z);
});

test('ett hörnskott förbi målvakten blir mål', () => {
  assert.equal(getShotOutcome({ x: 0.68, z: GOAL_Z + 2 }, { x: 0.68, z: GOAL_Z - 0.2 }, 0, 0)?.result, 'goal');
});

test('en målvakt som förflyttar sig kan rädda skottet', () => {
  assert.equal(getShotOutcome({ x: 0.65, z: KEEPER_Z + 0.2 }, { x: 0.65, z: KEEPER_Z - 0.2 }, 0.3, 0.6)?.result, 'save');
});

test('en boll som redan passerat målvakten kan inte räddas i efterhand', () => {
  assert.equal(getShotOutcome({ x: 0, z: KEEPER_Z - 0.1 }, { x: 0, z: GOAL_Z - 0.1 }, 0, 0)?.result, 'goal');
});

test('stolpträff på en 32 mm målram blir inte mål', () => {
  assert.equal(getShotOutcome({ x: GOAL_HALF_WIDTH, z: GOAL_Z + 0.2 }, { x: GOAL_HALF_WIDTH, z: GOAL_Z - 0.2 }, 0, 0)?.result, 'post');
});

test('en boll som flyger över sargen räknas som ute', () => {
  assert.equal(getShotOutcome({ x: 9.5, y: 1, z: 0 }, { x: RINK.width / 2 + BALL_RADIUS + 0.01, y: 1, z: 0 }, 0, 0)?.result, 'miss');
});

test('en boll på väg tillbaka efter en räddning ger inget nytt resultat', () => {
  assert.equal(getShotOutcome({ x: 0, z: GOAL_Z - 0.2 }, { x: 0, z: GOAL_Z + 1 }, 0, 0), undefined);
});
