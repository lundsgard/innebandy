import test from 'node:test';
import assert from 'node:assert/strict';
import { FloorballGame, type Keepers } from '../src/game-state';
import { BALL_RADIUS, GRAVITY, GOAL_Z, getShotOutcome, directedShotOutcome, projectileAt, shotVelocity } from '../src/shot-rules';
import { PLAYER_RADIUS, GOAL_CROSSBAR_Y, isInsideRink } from '../src/rink-dimensions';
import { TEAMS } from '../src/teams';

const absentKeeper = { x: 100, gloves: [] };
const centerKeeper = { x: 0, gloves: [] };
const keepers: Keepers = [absentKeeper, absentKeeper];
function started(ai = false, duration = 120) { const game = new FloorballGame({ ai, duration }); game.start(); return game; }
function advance(game: FloorballGame, seconds: number, x = 0, z = 0) {
  for (let time = 0; time < seconds; time += 0.01) game.update(0.01, { x, z }, keepers, keepers);
}

test('matchen har fyra utespelare per lag och de önskade lagnamnen', () => {
  const game = new FloorballGame();
  assert.equal(game.players.length, 8);
  assert.equal(game.players.filter(player => player.team === 0).length, 4);
  assert.equal(game.players.filter(player => player.team === 1).length, 4);
  assert.deepEqual(TEAMS.map(team => team.name), ['Nykvarns IF', 'Nyköping FBC']);
});

test('spel och matchklocka väntar på matchstart', () => {
  const game = new FloorballGame();
  const before = structuredClone(game.players);
  advance(game, 3, 1, 0);
  assert.deepEqual(game.players, before);
  assert.equal(game.remaining, 120);
  assert.equal(game.running, false);
});

test('löpningen håller spelare och boll på planen', () => {
  const game = started();
  advance(game, 10, 1, -1);
  assert.ok(isInsideRink(game.controlled, PLAYER_RADIUS));
  assert.ok(isInsideRink(game.ball, BALL_RADIUS));
  assert.ok(game.controlled.x > 8);
  assert.ok(game.controlled.z < -18);
});

test('diagonal löpning har samma fart som rak löpning', () => {
  const straight = started();
  const diagonal = started();
  advance(straight, 0.5, 0, -1);
  advance(diagonal, 0.5, 1, -1);
  assert.ok(Math.abs(straight.controlled.distance - diagonal.controlled.distance) < 0.001);
});

test('passning hittar en av tre lagkamrater och byter kontroll vid mottagningen', () => {
  const game = started();
  game.pass();
  advance(game, 2);
  assert.notEqual(game.active, 0);
  assert.equal(game.controlled.team, 0);
  assert.equal(game.passes, 1);
  assert.equal(game.shots, 0);
  assert.equal(game.carrier, game.active);
  assert.deepEqual(game.ball, game.stickPoint());
});

test('en passning kan brytas av en motståndare längs bollbanan', () => {
  const game = started(true);
  game.pass();
  for (let i = 0; i < 40 && game.phase !== 'pass'; i++) game.update(0.01, { x: 0, z: 0 }, keepers, keepers);
  assert.equal(game.phase, 'pass');
  game.players[4].x = game.ball.x + game.velocity.x * 0.01;
  game.players[4].z = game.ball.z + game.velocity.z * 0.01;
  game.update(0.02, { x: 0, z: 0 }, keepers, keepers);
  assert.equal(game.possession, 1);
  assert.equal(game.passes, 0);
  assert.match(game.message, /bryter passningen/);
});

test('Bryt kan vinna motståndarens boll och P utan boll byter hemmaspelare', () => {
  const game = started();
  game.carrier = 4;
  advance(game, 2.5);
  const previous = game.active;
  game.pass();
  assert.notEqual(game.active, previous);
  assert.equal(game.controlled.team, 0);
  game.controlled.x = game.ball.x;
  game.controlled.z = game.ball.z;
  game.tackle();
  assert.equal(game.hasBall, true);
  assert.equal(game.possession, 0);
});

test('datorlaget kan vinna bollen, anfalla och skjuta', () => {
  const game = started(true);
  advance(game, 30);
  assert.ok(game.teamShots[1] > 0);
  assert.ok(game.score[1] > 0 || game.teamSaves[0] > 0);
  assert.equal(game.players[game.active].team, 0);
});

test('även datorlaget kan genomföra passningar', () => {
  const game = started(true);
  game.carrier = 7;
  game.ball = game.stickPoint(7);
  for (const player of game.players.filter(player => player.team === 0)) player.z = 3.8;
  advance(game, 12);
  assert.ok(game.teamPasses[1] > 0);
});

test('ett högt skott når den valda höjden med en ballistisk bollbana', () => {
  const from = { x: 0, y: BALL_RADIUS, z: 3.65 };
  const target = { x: 0.65, y: 1.02, z: GOAL_Z };
  const velocity = shotVelocity(from, target);
  const duration = (target.z - from.z) / velocity.z;
  const point = projectileAt(from, velocity, duration);
  assert.ok(Math.abs(point.y - target.y) < 0.001);
  assert.ok(Math.abs(point.x - target.x) < 0.001);
  assert.ok(Math.abs(from.y + velocity.y * duration - GRAVITY * duration * duration / 2 - target.y) < 0.001);
});

test('högt hörnskott kan bli mål, över ribban blir miss och ribban stoppar bollen', () => {
  assert.equal(getShotOutcome({ x: 0.65, y: 1.02, z: GOAL_Z + 0.8 }, { x: 0.65, y: 1.02, z: GOAL_Z - 0.2 }, centerKeeper, centerKeeper)?.result, 'goal');
  assert.equal(getShotOutcome({ x: 0, y: 1.8, z: GOAL_Z + 0.8 }, { x: 0, y: 1.8, z: GOAL_Z - 0.2 }, centerKeeper, centerKeeper)?.result, 'over');
  assert.equal(getShotOutcome({ x: 0, y: GOAL_CROSSBAR_Y, z: GOAL_Z + 0.2 }, { x: 0, y: GOAL_CROSSBAR_Y, z: GOAL_Z - 0.2 }, absentKeeper, absentKeeper)?.result, 'post');
});

test('båda målvakterna kan rädda i var sin anfallsriktning', () => {
  assert.equal(directedShotOutcome({ x: 0, y: BALL_RADIUS, z: GOAL_Z + 2 }, { x: 0, y: BALL_RADIUS, z: GOAL_Z - 1 }, centerKeeper, centerKeeper, -1)?.result, 'save');
  assert.equal(directedShotOutcome({ x: 0, y: BALL_RADIUS, z: -GOAL_Z - 2 }, { x: 0, y: BALL_RADIUS, z: -GOAL_Z + 1 }, centerKeeper, centerKeeper, 1)?.result, 'save');
});

test('höjd handske räddar en boll bredvid kroppen', () => {
  const pose = { x: 0, gloves: [{ x: 0.6, y: 1.1, z: GOAL_Z + 0.8 }] };
  assert.equal(getShotOutcome({ x: 0.6, y: 1.1, z: GOAL_Z + 1.1 }, { x: 0.6, y: 1.1, z: GOAL_Z - 0.2 }, pose, pose)?.result, 'save');
});

test('hemmascore räknas en gång och motståndarna får uppstart efter mål', () => {
  const game = started();
  game.targetX = 0.65;
  game.targetHeight = 1.02;
  game.shoot();
  advance(game, 3.5);
  assert.deepEqual(game.score, [1, 0]);
  assert.equal(game.possession, 1);
  assert.equal(game.phase, 'ready');
});

test('bortamål hamnar på rätt sida av resultattavlan och hemma får uppstart', () => {
  const game = started();
  game.carrier = null;
  game.phase = 'flight';
  game.resultTeam = 1;
  game.actionOwner = 4;
  game.ball = { x: 0.65, y: 1.0, z: -GOAL_Z - 0.2 };
  game.velocity = { x: 0, y: 0, z: 14 };
  advance(game, 2);
  assert.deepEqual(game.score, [0, 1]);
  assert.equal(game.possession, 0);
});

test('extra knapptryck under passning ger inte fler bollar eller skott', () => {
  const game = started();
  game.pass(); game.pass(); game.shoot();
  advance(game, 2);
  assert.equal(game.passes, 1);
  assert.equal(game.shots, 0);
});

test('matchen tar slut, stannar och kan startas om med tom resultattavla', () => {
  const game = started(false, 0.1);
  advance(game, 0.3);
  assert.equal(game.running, false);
  assert.equal(game.finished, true);
  assert.equal(game.remaining, 0);
  const before = structuredClone(game.players);
  advance(game, 1, 1, 0);
  assert.deepEqual(game.players, before);
  game.start();
  assert.equal(game.running, true);
  assert.equal(game.finished, false);
  assert.deepEqual(game.score, [0, 0]);
  assert.equal(game.remaining, 0.1);
});
