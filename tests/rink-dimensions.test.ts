import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { RINK, GOAL_WIDTH, GOAL_HEIGHT, GOAL_BOTTOM_DEPTH, GOAL_Z, GOAL_BACK_Z, BALL_RADIUS, PLAYER_HEIGHT, PLAYER_SCALE, PLAYER_MODEL_HEIGHT, PLAYER_RADIUS, constrainToRink, isInsideRink, bounceOffBoards, bounceOffGoalNet, keepOutsideGoalNets } from '../src/rink-dimensions';
import { boardGeometry, createGoal, roundedRinkShape } from '../src/rink-view';
import { Goalkeeper } from '../src/goalkeeper';
import { FloorballGame, type Keepers } from '../src/game-state';
import { shotVelocity } from '../src/shot-rules';

const near = (actual: number, expected: number, tolerance = 0.001) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} skiljer sig från ${expected}`);

test('planen har verkliga innermått 40 × 20 m och hörnradie 2 m', () => {
  assert.equal(RINK.length, 40); assert.equal(RINK.width, 20); assert.equal(RINK.cornerRadius, 2);
  const points = roundedRinkShape().getPoints(64);
  near(Math.max(...points.map(point => point.x)) - Math.min(...points.map(point => point.x)), 20);
  near(Math.max(...points.map(point => point.y)) - Math.min(...points.map(point => point.y)), 40);
  const corner = constrainToRink({ x: 10, z: 20 });
  near(Math.hypot(corner.x - 8, corner.z - 18), 2);
  assert.ok(corner.x < 10 && corner.z < 20);
});

test('den ritade sargen är 50 cm hög och ligger utanför planens innermått', () => {
  const geometry = boardGeometry(); geometry.computeBoundingBox();
  const size = geometry.boundingBox!.getSize(new THREE.Vector3());
  near(size.x, 20 + RINK.boardThickness * 2); near(size.y, 0.5); near(size.z, 40 + RINK.boardThickness * 2);
});

test('den faktiska målmodellen mäter 160 × 115 cm och är 65 cm djup', () => {
  const goal = createGoal();
  const size = new THREE.Box3().setFromObject(goal).getSize(new THREE.Vector3());
  near(size.x, 1.6); near(size.y, 1.15); near(size.z, 0.65);
  near(GOAL_WIDTH, size.x); near(GOAL_HEIGHT, size.y); near(GOAL_BOTTOM_DEPTH, size.z);
  near(RINK.length / 2 + GOAL_Z, 3.5);
});

test('människans skala motsvarar 1,80 m och den knästående målvakten 1,25 m', () => {
  near(PLAYER_MODEL_HEIGHT * PLAYER_SCALE, PLAYER_HEIGHT);
  near(PLAYER_HEIGHT, 1.8);
  const keeper = new Goalkeeper(new THREE.Scene(), 1);
  const bounds = new THREE.Box3().setFromObject(keeper.root);
  near(bounds.max.y, 1.25);
});

test('raka sargen studsar tillbaka en låg boll utan att öka farten', () => {
  const ball = { x: 10.2, y: BALL_RADIUS, z: 0 };
  const velocity = { x: 8, z: 2 };
  assert.equal(bounceOffBoards(ball, velocity), true);
  near(ball.x, 10 - BALL_RADIUS);
  assert.ok(velocity.x < 0); assert.equal(velocity.z, 2);
  assert.ok(Math.hypot(velocity.x, velocity.z) < Math.hypot(8, 2));
});

test('alla fyra rundade hörn studsar bollen efter hörnets normal', () => {
  for (const x of [-1, 1]) for (const z of [-1, 1]) {
    const ball = { x: x * 9.8, y: BALL_RADIUS, z: z * 19.8 };
    const velocity = { x: x * 4, z: z * 4 };
    assert.equal(bounceOffBoards(ball, velocity), true);
    assert.ok(velocity.x * x < 0 && velocity.z * z < 0);
    assert.ok(isInsideRink(ball, BALL_RADIUS));
    near(Math.hypot(Math.abs(ball.x) - 8, Math.abs(ball.z) - 18), 2 - BALL_RADIUS);
  }
});

test('en boll över sargens höjd får lämna planen', () => {
  const ball = { x: 10.2, y: 0.6, z: 0 }; const velocity = { x: 8, z: 0 };
  assert.equal(bounceOffBoards(ball, velocity), false); assert.equal(velocity.x, 8);
});

test('det finns spelbar yta bakom målen men spelare kan inte gå genom näten', () => {
  const behind = { x: 0, z: GOAL_Z - 2 };
  assert.ok(isInsideRink(behind, PLAYER_RADIUS));
  assert.deepEqual(keepOutsideGoalNets(behind, PLAYER_RADIUS), behind);
  const inNet = { x: 0, z: GOAL_Z - 0.3 };
  assert.notDeepEqual(keepOutsideGoalNets(inNet, PLAYER_RADIUS), inNet);
});

test('en boll bakifrån studsar på nätet i stället för att gå igenom målet', () => {
  const from = { x: 0, y: BALL_RADIUS, z: GOAL_BACK_Z - 0.5 };
  const to = { x: 0, y: BALL_RADIUS, z: GOAL_Z + 0.1 };
  const velocity = { x: 0, y: 0, z: 10 };
  assert.equal(bounceOffGoalNet(from, to, velocity), true);
  assert.ok(velocity.z < 0); assert.ok(to.z < GOAL_Z);
});

test('bollen hålls innanför den rundade sargen även när spelaren springer in i hörnet', () => {
  const game = new FloorballGame({ ai: false }); game.start();
  const poses: Keepers = [{ x: 100, gloves: [] }, { x: 100, gloves: [] }];
  for (let frame = 0; frame < 2200; frame++) {
    game.update(0.01, { x: 1, z: -1 }, poses, poses);
    assert.ok(isInsideRink(game.controlled, PLAYER_RADIUS));
    assert.ok(isInsideRink(game.ball, BALL_RADIUS), `Bollen lämnar planen vid bildruta ${frame}`);
  }
});

test('skott alldeles intill mål får en ändlig, begränsad utgångsfart', () => {
  const velocity = shotVelocity({ x: 0, y: BALL_RADIUS, z: GOAL_Z + 0.01 }, { x: 0, y: 1.02, z: GOAL_Z });
  assert.ok(Object.values(velocity).every(Number.isFinite)); assert.ok(Math.abs(velocity.y) < 15);
});
