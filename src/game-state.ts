import { BALL_RADIUS, GOAL_Z, GRAVITY, directedShotOutcome, shotVelocity, type Point3, type KeeperPose, type ShotResult } from './shot-rules';
import { RINK, PLAYER_RADIUS, STICK_BALL_OFFSET, RUN_SPEED, AI_RUN_SPEED, PASS_SPEED, constrainToRink, isInsideRink, keepOutsideGoalNets, bounceOffBoards, bounceOffGoalNet } from './rink-dimensions';
import { TEAMS, attackDirection, playerSurname, type TeamId } from './teams';

export type GamePhase = 'ready' | 'windup' | 'flight' | 'pass' | 'loose' | 'result' | 'finished';
export type Runner = { x: number; z: number; vx: number; vz: number; facing: number; number: number; team: TeamId; distance: number; speed: number };
export const PLAYER_BOUNDS = { left: -RINK.width / 2 + PLAYER_RADIUS, right: RINK.width / 2 - PLAYER_RADIUS, front: -RINK.length / 2 + PLAYER_RADIUS, back: RINK.length / 2 - PLAYER_RADIUS };
export const MATCH_DURATION = 120;
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
const distance = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z);
const otherTeam = (team: TeamId): TeamId => team === 0 ? 1 : 0;
const absentKeeper: KeeperPose = { x: 100, gloves: [] };
export type Keepers = [KeeperPose, KeeperPose];

export class FloorballGame {
  players: Runner[] = [];
  active = 0;
  carrier: number | null = 0;
  actionOwner = 0;
  phase: GamePhase = 'ready';
  phaseTime = 0;
  targetX = 0;
  targetHeight = BALL_RADIUS;
  ball: Point3 = { x: 0, y: BALL_RADIUS, z: 0 };
  velocity: Point3 = { x: 0, y: 0, z: 0 };
  score: [number, number] = [0, 0];
  teamShots = [0, 0];
  teamPasses = [0, 0];
  teamSaves = [0, 0];
  message = 'Du spelar Nykvarns IF. Tryck på Starta match!';
  announcement = '';
  result: ShotResult | null = null;
  resultTeam: TeamId = 0;
  running = false;
  finished = false;
  remaining: number;
  private action: 'shot' | 'pass' = 'shot';
  private passTarget: Point3 = this.ball;
  private receiver = 1;
  private restartTeam: TeamId = 0;
  private possessionTime = 0;
  private stealCooldown = 0;
  private seed = 173;
  private duration: number;
  private ai: boolean;
  private shotTargetX = 0;
  private shotTargetHeight = BALL_RADIUS;

  constructor(options: { ai?: boolean; duration?: number } = {}) {
    this.ai = options.ai ?? true;
    this.duration = options.duration ?? MATCH_DURATION;
    this.remaining = this.duration;
    this.resetPositions(0);
  }

  get controlled() { return this.players[this.active]; }
  get actionDuration() { return this.action === 'shot' ? 0.3 : 0.2; }
  get goals() { return this.score[0]; }
  get awayGoals() { return this.score[1]; }
  get shots() { return this.teamShots[0]; }
  get passes() { return this.teamPasses[0]; }
  get saves() { return this.teamSaves[0]; }
  get hasBall() { return this.carrier === this.active && this.phase === 'ready'; }
  get possession(): TeamId | null { return this.carrier === null ? null : this.players[this.carrier].team; }

  start() {
    this.score = [0, 0];
    this.teamShots = [0, 0];
    this.teamPasses = [0, 0];
    this.teamSaves = [0, 0];
    this.remaining = this.duration;
    this.running = true;
    this.finished = false;
    this.result = null;
    this.announcement = '';
    this.seed = 173;
    this.resetPositions(0);
    this.message = 'Matchen är igång! Du spelar Nykvarns IF. Anfall mot Nyköpings mål!';
  }

  private resetPositions(team: TeamId) {
    const positions = [[-0.9, 2], [6, 4.8], [-6, 10.5], [3.5, 12], [0.9, -2], [-6, -4.8], [6, -10.5], [-3.5, -12]];
    const numbers = [10, 7, 12, 19, 8, 9, 11, 17];
    this.players = positions.map(([x, z], index) => ({ x, z, vx: 0, vz: 0, facing: index < 4 ? 0 : Math.PI, team: index < 4 ? 0 : 1, number: numbers[index], distance: 0, speed: 0 }));
    this.active = 0;
    this.phase = 'ready';
    this.phaseTime = 0;
    this.carrier = team === 0 ? 0 : 4;
    this.actionOwner = this.carrier;
    this.ball = this.stickPoint(this.carrier);
    this.velocity = { x: 0, y: 0, z: 0 };
    this.possessionTime = 0;
    this.stealCooldown = 2.4;
  }

  stickPoint(index = this.active): Point3 {
    const player = this.players[index];
    const c = Math.cos(player.facing);
    const s = Math.sin(player.facing);
    return { x: player.x + STICK_BALL_OFFSET.x * c + STICK_BALL_OFFSET.z * s, y: BALL_RADIUS, z: player.z - STICK_BALL_OFFSET.x * s + STICK_BALL_OFFSET.z * c };
  }

  shoot() {
    if (!this.running || this.phase === 'windup' || this.phase === 'result') return;
    if (!this.hasBall) { this.tackle(); return; }
    this.beginAction(this.active, 'shot');
  }

  pass() {
    if (!this.running || this.phase === 'windup' || this.phase === 'result') return;
    if (!this.hasBall) { this.switchPlayer(); return; }
    this.beginAction(this.active, 'pass', this.bestPass(this.active));
  }

  switchPlayer() {
    if (!this.running) return;
    const candidates = this.players.map((player, id) => ({ player, id })).filter(item => item.player.team === 0 && item.id !== this.active);
    candidates.sort((a, b) => distance(a.player, this.ball) - distance(b.player, this.ball));
    this.active = candidates[0].id;
    this.message = `Du styr ${playerSurname(this.controlled.team, this.controlled.number)}, nummer ${this.controlled.number}. Spring mot bollen och bryt!`;
  }

  tackle() {
    if (this.carrier !== null && this.players[this.carrier].team !== 0 && Math.min(distance(this.controlled, this.ball), distance(this.stickPoint(), this.ball)) < 1.45 && this.stealCooldown <= 0) {
      this.giveBall(this.active);
      this.message = 'Du vann bollen! Spring, passa eller skjut.';
    } else if (this.phase === 'loose' && distance(this.controlled, this.ball) < 1.1) this.giveBall(this.active);
    else this.message = 'Spring närmare bollen för att bryta. P byter spelare.';
  }

  private beginAction(owner: number, action: 'shot' | 'pass', receiver?: number) {
    if (this.phase !== 'ready' || this.carrier !== owner) return;
    this.actionOwner = owner;
    this.action = action;
    this.receiver = receiver ?? this.bestPass(owner);
    this.phase = 'windup';
    this.phaseTime = 0;
    this.announcement = '';
    const team = this.players[owner].team;
    if (action === 'shot') {
      this.teamShots[team] += 1;
      this.shotTargetX = team === 0 ? this.targetX : (this.random() > 0.5 ? 1 : -1) * (0.55 + this.random() * 0.12);
      this.shotTargetHeight = team === 0 ? this.targetHeight : [BALL_RADIUS, 0.55, 1.02][Math.floor(this.random() * 3)];
      this.message = `${TEAMS[team].name} skjuter!`;
    } else this.message = `${TEAMS[team].name} passar till ${playerSurname(team, this.players[this.receiver].number)}, nummer ${this.players[this.receiver].number}.`;
  }

  private bestPass(owner: number) {
    const player = this.players[owner];
    const opponents = this.players.filter(candidate => candidate.team !== player.team);
    return this.players.map((candidate, id) => {
      const space = Math.min(...opponents.map(opponent => distance(opponent, this.stickPoint(id))));
      const forward = (candidate.z - player.z) * attackDirection(player.team);
      return { id, candidate, score: space * 1.1 + forward * 1.3 - distance(candidate, player) * 0.12 };
    }).filter(item => item.candidate.team === player.team && item.id !== owner).sort((a, b) => b.score - a.score)[0].id;
  }

  private random() { this.seed = (this.seed * 1664525 + 1013904223) >>> 0; return this.seed / 4294967296; }

  private movePlayer(player: Runner, dx: number, dz: number, dt: number, speed: number, faceMovement: boolean) {
    const length = Math.hypot(dx, dz);
    const factor = length > 1 ? 1 / length : 1;
    const smoothing = Math.min(1, dt * 6);
    player.vx += (dx * factor * speed - player.vx) * smoothing;
    player.vz += (dz * factor * speed - player.vz) * smoothing;
    const oldX = player.x;
    const oldZ = player.z;
    player.x = clamp(player.x + player.vx * dt, PLAYER_BOUNDS.left, PLAYER_BOUNDS.right);
    player.z = clamp(player.z + player.vz * dt, PLAYER_BOUNDS.front, PLAYER_BOUNDS.back);
    Object.assign(player, keepOutsideGoalNets(constrainToRink(player, PLAYER_RADIUS), PLAYER_RADIUS));
    const travelled = Math.hypot(player.x - oldX, player.z - oldZ);
    player.distance += travelled;
    player.speed = dt > 0 ? travelled / dt : 0;
    if (faceMovement && length > 0.1 && player.speed > 0.1) this.face(player, Math.atan2(-dx, -dz), dt);
  }

  private face(player: Runner, angle: number, dt: number) {
    const difference = Math.atan2(Math.sin(angle - player.facing), Math.cos(angle - player.facing));
    player.facing += difference * Math.min(1, dt * 10);
  }

  private tacticalTarget(id: number) {
    const player = this.players[id];
    const direction = attackDirection(player.team);
    const sameTeam = this.players.map((candidate, index) => ({ candidate, index })).filter(item => item.candidate.team === player.team);
    const ranked = [...sameTeam].sort((a, b) => distance(a.candidate, this.ball) - distance(b.candidate, this.ball));
    if (this.carrier === id) return { x: clamp(player.x * 0.7, -6, 6), z: direction * 14.2 };
    const carrierTeam = this.possession;
    if ((carrierTeam !== player.team || this.phase === 'loose') && ranked.find(item => item.index !== this.active)?.index === id) return this.ball;
    const slot = sameTeam.findIndex(item => item.index === id);
    const lanes = [-6, 6, -4, 4];
    const owner = this.carrier === null ? this.ball : this.players[this.carrier];
    if (carrierTeam === player.team) return { x: lanes[slot], z: clamp(owner.z + direction * (slot < 2 ? 4.5 : -4), -14, 14) };
    return { x: lanes[slot] * 0.75, z: clamp(this.ball.z - direction * (2.5 + slot * 1.2), -14, 14) };
  }

  update(dt: number, movement: { x: number; z: number }, keeperFrom: Keepers = [absentKeeper, absentKeeper], keeperTo: Keepers = keeperFrom) {
    if (!this.running) return;
    dt = Math.min(dt, 0.05);
    this.phaseTime += dt;
    this.stealCooldown = Math.max(0, this.stealCooldown - dt);
    this.possessionTime += dt;
    if (this.phase !== 'result') this.remaining = Math.max(0, this.remaining - dt);
    if (this.remaining <= 0) { this.finishMatch(); return; }
    for (let id = 0; id < this.players.length; id++) {
      const player = this.players[id];
      const frozen = this.phase === 'result' || (this.phase === 'windup' && id === this.actionOwner) || ((this.phase === 'pass' || this.phase === 'windup') && this.action === 'pass' && id === this.receiver);
      if (frozen) this.movePlayer(player, 0, 0, dt, 0, false);
      else if (id === this.active) this.movePlayer(player, movement.x, movement.z, dt, RUN_SPEED, true);
      else if (this.ai) {
        const target = this.tacticalTarget(id);
        const dx = target.x - player.x;
        const dz = target.z - player.z;
        const gap = Math.hypot(dx, dz);
        this.movePlayer(player, gap > 0.15 ? dx : 0, gap > 0.15 ? dz : 0, dt, this.carrier === id ? AI_RUN_SPEED + 0.2 : AI_RUN_SPEED, true);
      } else this.movePlayer(player, 0, 0, dt, 0, false);
    }
    if (this.ai) {
      this.separatePlayers();
      if (this.carrier !== null) this.players.forEach((player, id) => {
        if (id !== this.active && player.team !== this.possession && distance(player, this.ball) < 1.8) {
          this.face(player, Math.atan2(-(this.ball.x - player.x), -(this.ball.z - player.z)) + 0.865, dt * 2);
        }
      });
    }
    if (this.carrier !== null && (this.phase === 'ready' || this.phase === 'windup')) {
      const owner = this.players[this.carrier];
      if (this.phase === 'windup' || owner.speed < 0.15) {
        const target = this.phase === 'windup' && this.action === 'pass' ? this.players[this.receiver] : { x: owner.team === 0 ? this.targetX : 0, z: attackDirection(owner.team) * Math.abs(GOAL_Z) };
        this.face(owner, Math.atan2(-(target.x - owner.x), -(target.z - owner.z)), dt);
      }
      this.ball = this.stickPoint(this.carrier);
      const held = keepOutsideGoalNets(constrainToRink(this.ball, BALL_RADIUS), BALL_RADIUS);
      owner.x += held.x - this.ball.x;
      owner.z += held.z - this.ball.z;
      Object.assign(owner, keepOutsideGoalNets(constrainToRink(owner, PLAYER_RADIUS), PLAYER_RADIUS));
      this.ball = this.stickPoint(this.carrier);
    }
    if (this.phase === 'ready') {
      if (this.ai) {
        this.trySteal();
        if (this.carrier !== null && this.carrier !== this.active && this.phase === 'ready') {
          const owner = this.players[this.carrier];
          const goalDistance = Math.abs(attackDirection(owner.team) * Math.abs(GOAL_Z) - this.ball.z);
          if (this.possessionTime > 0.65) {
            const receiver = this.bestPass(this.carrier);
            const underPressure = this.players.some(player => player.team !== owner.team && distance(player, owner) < 1.5);
            const shouldPass = goalDistance > 4.0 && distance(owner, this.players[receiver]) > 1.4 && (underPressure || this.teamPasses[owner.team] <= this.teamShots[owner.team]);
            if (goalDistance < 10.5 && this.teamPasses[owner.team] > this.teamShots[owner.team] + 1) this.beginAction(this.carrier, 'shot');
            else if (shouldPass) this.beginAction(this.carrier, 'pass', receiver);
            else if (goalDistance < 8.5) this.beginAction(this.carrier, 'shot');
            else if (this.possessionTime > 2.8) this.beginAction(this.carrier, 'pass', receiver);
          }
        }
      }
    } else if (this.phase === 'windup') {
      if (this.phaseTime >= this.actionDuration) this.launch();
    } else if (this.phase === 'pass') this.updatePass(dt);
    else if (this.phase === 'flight' || this.phase === 'loose') this.updateFlyingBall(dt, keeperFrom, keeperTo);
    else if (this.phase === 'result') {
      if (this.phaseTime >= 1.65) {
        this.resetPositions(this.restartTeam);
        this.result = null;
        this.announcement = '';
        this.message = `Ny uppstart. ${TEAMS[this.restartTeam].name} har bollen.`;
      }
    }
  }

  private separatePlayers() {
    for (let a = 0; a < this.players.length; a++) for (let b = a + 1; b < this.players.length; b++) {
      const first = this.players[a];
      const second = this.players[b];
      const dx = second.x - first.x;
      const dz = second.z - first.z;
      const gap = Math.hypot(dx, dz);
      if (gap >= 0.68) continue;
      const nx = gap > 0.001 ? dx / gap : 1;
      const nz = gap > 0.001 ? dz / gap : 0;
      const push = (0.68 - gap) * 0.5;
      first.x = clamp(first.x - nx * push, PLAYER_BOUNDS.left, PLAYER_BOUNDS.right);
      first.z = clamp(first.z - nz * push, PLAYER_BOUNDS.front, PLAYER_BOUNDS.back);
      second.x = clamp(second.x + nx * push, PLAYER_BOUNDS.left, PLAYER_BOUNDS.right);
      second.z = clamp(second.z + nz * push, PLAYER_BOUNDS.front, PLAYER_BOUNDS.back);
    }
    this.players.forEach(player => Object.assign(player, keepOutsideGoalNets(constrainToRink(player, PLAYER_RADIUS), PLAYER_RADIUS)));
  }

  private trySteal() {
    if (this.carrier === null || this.stealCooldown > 0) return;
    const team = this.players[this.carrier].team;
    const challenger = this.players.map((player, id) => ({ player, id, reach: Math.min(distance(player, this.ball), distance(this.stickPoint(id), this.ball)) })).filter(item => item.player.team !== team && item.reach < 0.65).sort((a, b) => a.reach - b.reach)[0];
    if (challenger) {
      this.giveBall(challenger.id);
      this.message = `${TEAMS[challenger.player.team].name} vinner bollen!`;
    }
  }

  private giveBall(id: number) {
    this.carrier = id;
    if (this.players[id].team === 0) this.active = id;
    this.phase = 'ready';
    this.phaseTime = 0;
    this.result = null;
    this.possessionTime = 0;
    this.stealCooldown = 0.9;
    this.velocity = { x: 0, y: 0, z: 0 };
    this.ball = this.stickPoint(id);
  }

  private launch() {
    const team = this.players[this.actionOwner].team;
    this.resultTeam = team;
    this.carrier = null;
    this.phaseTime = 0;
    this.stealCooldown = 0.25;
    if (this.action === 'shot') {
      this.phase = 'flight';
      this.velocity = shotVelocity(this.ball, { x: this.shotTargetX, y: this.shotTargetHeight, z: attackDirection(team) * Math.abs(GOAL_Z) });
    } else {
      this.phase = 'pass';
      this.passTarget = this.stickPoint(this.receiver);
      const gap = Math.max(0.01, distance(this.passTarget, this.ball));
      this.velocity = { x: (this.passTarget.x - this.ball.x) / gap * PASS_SPEED, y: 0, z: (this.passTarget.z - this.ball.z) / gap * PASS_SPEED };
    }
  }

  private sweptDistance(from: Point3, to: Point3, target: { x: number; z: number }) {
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const denominator = dx * dx + dz * dz;
    const fraction = denominator > 1e-9 ? clamp(((target.x - from.x) * dx + (target.z - from.z) * dz) / denominator, 0, 1) : 0;
    return { gap: Math.hypot(target.x - from.x - dx * fraction, target.z - from.z - dz * fraction), fraction };
  }

  private updatePass(dt: number) {
    const previous = { ...this.ball };
    const remaining = distance(this.passTarget, this.ball);
    const step = Math.min(remaining, PASS_SPEED * dt);
    const factor = step / Math.max(remaining, 0.0001);
    this.ball.x += (this.passTarget.x - this.ball.x) * factor;
    this.ball.z += (this.passTarget.z - this.ball.z) * factor;
    if (bounceOffGoalNet(previous, this.ball, this.velocity)) {
      this.phase = 'loose';
      this.phaseTime = 0;
      this.message = 'Passningen tar i målnätet!';
      return;
    }
    if (this.ai) {
      const team = this.players[this.actionOwner].team;
      const interceptor = this.players.map((player, id) => ({ player, id, hit: this.sweptDistance(previous, this.ball, player) })).filter(item => item.player.team !== team && item.hit.gap < 0.43).sort((a, b) => a.hit.fraction - b.hit.fraction)[0];
      if (interceptor) {
        this.giveBall(interceptor.id);
        this.message = `${TEAMS[interceptor.player.team].name} bryter passningen!`;
        return;
      }
    }
    if (remaining <= PASS_SPEED * dt + 0.04) {
      const team = this.players[this.receiver].team;
      this.teamPasses[team] += 1;
      this.giveBall(this.receiver);
      this.message = `${TEAMS[team].name}: passningen framme hos nummer ${this.players[this.receiver].number}.`;
    }
  }

  private integrateBall(dt: number) {
    this.ball.x += this.velocity.x * dt;
    this.ball.z += this.velocity.z * dt;
    if (this.ball.y > BALL_RADIUS + 0.001 || this.velocity.y > 0) {
      this.ball.y += this.velocity.y * dt - 0.5 * GRAVITY * dt * dt;
      this.velocity.y -= GRAVITY * dt;
      if (this.ball.y <= BALL_RADIUS) {
        this.ball.y = BALL_RADIUS;
        this.velocity.y = Math.abs(this.velocity.y) > 0.7 ? -this.velocity.y * 0.32 : 0;
      }
    }
    if (bounceOffBoards(this.ball, this.velocity)) {
      this.phase = 'loose';
      this.phaseTime = 0;
      this.carrier = null;
      this.message = 'Bollen studsar mot sargen!';
    }
  }

  private updateFlyingBall(dt: number, fromKeepers: Keepers, toKeepers: Keepers) {
    const previous = { ...this.ball };
    this.integrateBall(dt);
    const wasShot = this.phase === 'flight';
    if (wasShot && this.ai && this.ball.y < 1.3 && this.phaseTime > 0.08) {
      const blocker = this.players.map((player, id) => ({ player, id, hit: this.sweptDistance(previous, this.ball, player) })).filter(item => item.player.team !== this.resultTeam && item.hit.gap < 0.28).sort((a, b) => a.hit.fraction - b.hit.fraction)[0];
      if (blocker) {
        this.velocity.x *= -0.3;
        this.velocity.z *= -0.3;
        this.velocity.y = 0.6;
        this.phase = 'loose';
        this.phaseTime = 0;
        this.message = `${TEAMS[blocker.player.team].name} täcker skottet!`;
        return;
      }
    }
    for (const team of [0, 1] as const) {
      const defendingTeam = otherTeam(team);
      const outcome = directedShotOutcome(previous, this.ball, fromKeepers[defendingTeam], toKeepers[defendingTeam], attackDirection(team));
      if (!outcome || (outcome.result === 'miss' && isInsideRink(this.ball, -BALL_RADIUS))) continue;
      this.ball = outcome.point;
      this.resultTeam = team;
      if (outcome.result === 'goal') {
        this.score[team] += 1;
        this.stoppage(team, 'goal', otherTeam(team));
      } else if (outcome.result === 'save') {
        this.teamSaves[defendingTeam] += 1;
        this.phase = 'loose';
        this.phaseTime = 0;
        this.velocity = { x: (Math.sign(this.ball.x - toKeepers[defendingTeam].x) || 1) * 2.2, y: 0.9, z: -attackDirection(team) * 3.0 };
        this.message = `${TEAMS[defendingTeam].name}s målvakt räddar! Retur!`;
        this.result = 'save';
      } else if (outcome.result === 'post') {
        this.phase = 'loose';
        this.phaseTime = 0;
        this.velocity = { x: -Math.sign(this.ball.x) * 2, y: 1, z: -attackDirection(team) * 2.8 };
        this.message = 'I målramen! Bollen är fortfarande i spel.';
      } else this.stoppage(this.resultTeam, outcome.result, this.ball.z > 0 ? 0 : 1);
      return;
    }
    if (bounceOffGoalNet(previous, this.ball, this.velocity)) {
      this.phase = 'loose';
      this.phaseTime = 0;
      this.message = 'Bollen tar i målnätet!';
      return;
    }
    if (this.phase === 'loose') {
      const damping = Math.exp(-dt * 0.8);
      this.velocity.x *= damping;
      this.velocity.z *= damping;
      if (this.ball.y < 0.22 && this.phaseTime > 0.25) {
        const catcher = this.players.map((player, id) => ({ player, id, gap: Math.min(distance(player, this.ball), distance(this.stickPoint(id), this.ball)) })).filter(item => item.gap < 0.58).sort((a, b) => a.gap - b.gap)[0];
        if (catcher) this.giveBall(catcher.id);
        else if (this.phaseTime > 5) {
          const closest = this.players.map((player, id) => ({ player, id })).sort((a, b) => distance(a.player, this.ball) - distance(b.player, this.ball))[0];
          this.giveBall(closest.id);
        }
      }
    }
  }

  private stoppage(scoringTeam: TeamId, result: ShotResult, restartTeam: TeamId) {
    this.phase = 'result';
    this.phaseTime = 0;
    this.result = result;
    this.restartTeam = restartTeam;
    this.velocity = { x: 0, y: 0, z: 0 };
    if (result === 'goal') {
      this.announcement = `MÅL! ${TEAMS[scoringTeam].shortName}`;
      this.message = `${TEAMS[scoringTeam].name} gör mål! ${this.score[0]}–${this.score[1]}.`;
    } else {
      this.announcement = result === 'over' ? 'ÖVER MÅL!' : 'UTANFÖR!';
      this.message = `Ny uppstart för ${TEAMS[restartTeam].name}.`;
    }
  }

  private finishMatch() {
    this.running = false;
    this.finished = true;
    this.phase = 'finished';
    this.players.forEach(player => { player.speed = 0; player.vx = player.vz = 0; });
    this.velocity = { x: 0, y: 0, z: 0 };
    this.announcement = 'SLUT!';
    this.message = this.score[0] === this.score[1] ? `Oavgjort! ${this.score[0]}–${this.score[1]}.` : `${TEAMS[this.score[0] > this.score[1] ? 0 : 1].name} vinner med ${Math.max(...this.score)}–${Math.min(...this.score)}!`;
  }
}
