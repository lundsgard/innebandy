import * as THREE from 'three';
import { bodySurface } from './human-geometry';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { GRAVITY, KEEPER_Z, type KeeperPose } from './shot-rules';
import type { GamePhase } from './game-state';
import { TEAMS, playerSurname, type TeamId } from './teams';
import { KEEPER_SCALE, GOAL_HALF_WIDTH, KEEPER_HALF_WIDTH } from './rink-dimensions';

export class Goalkeeper {
  readonly root = new THREE.Group();
  private leftArm = new THREE.Group();
  private rightArm = new THREE.Group();
  private savedDirection = 0;
  private gloves: THREE.Mesh[] = [];
  private lift = 0;

  constructor(scene: THREE.Scene, private team: TeamId = 1) {
    this.root.position.z = team === 0 ? -KEEPER_Z : KEEPER_Z;
    this.root.rotation.y = team === 0 ? Math.PI : 0;
    this.root.scale.setScalar(KEEPER_SCALE);
    scene.add(this.root);
    const red = TEAMS[team].keeper;
    const dark = 0x202b36;
    const pad = 0x303e4c;
    const mesh = (geometry: THREE.BufferGeometry, position: THREE.Vector3Tuple, color: number, parent: THREE.Object3D = this.root) => {
      const object = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: 0.75 }));
      object.position.set(...position);
      object.castShadow = true;
      object.receiveShadow = true;
      parent.add(object);
      return object;
    };
    const ellipsoid = (position: THREE.Vector3Tuple, scale: THREE.Vector3Tuple, color: number, parent: THREE.Object3D = this.root) => {
      const object = mesh(new THREE.SphereGeometry(1, 24, 16), position, color, parent);
      object.scale.set(...scale);
      return object;
    };
    const limb = (from: THREE.Vector3Tuple, to: THREE.Vector3Tuple, radius: number, color: number, parent: THREE.Object3D = this.root) => {
      const a = new THREE.Vector3(...from);
      const b = new THREE.Vector3(...to);
      const direction = b.clone().sub(a);
      const object = mesh(new THREE.CapsuleGeometry(radius, Math.max(0.01, direction.length() - radius * 2), 6, 12), a.clone().add(b).multiplyScalar(0.5).toArray(), color, parent);
      object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
      return object;
    };
    // Innebandymålvakten sitter på knä och har ingen klubba.
    mesh(bodySurface([[0.47, 0.21, 0.16], [0.6, 0.24, 0.18], [0.8, 0.255, 0.18], [0.98, 0.28, 0.17], [1.055, 0.22, 0.13], [1.1, 0.08, 0.075]]), [0, 0, 0], red);
    ellipsoid([0, 0.5, -0.03], [0.3, 0.18, 0.2], dark);
    for (const side of [-1, 1]) {
      limb([side * 0.17, 0.51, -0.02], [side * 0.29, 0.22, 0.18], 0.16, dark);
      ellipsoid([side * 0.29, 0.19, 0.1], [0.18, 0.19, 0.31], pad);
      ellipsoid([side * 0.29, 0.075, -0.25], [0.13, 0.075, 0.23], dark);
      mesh(new RoundedBoxGeometry(0.22, 0.09, 0.05, 2, 0.02), [side * 0.29, 0.22, 0.38], 0xdce2df);
      mesh(new RoundedBoxGeometry(0.22, 0.045, 0.05, 2, 0.015), [side * 0.29, 0.11, 0.36], 0x7a8790);
      ellipsoid([side * 0.25, 0.96, 0], [0.145, 0.17, 0.17], red);
    }
    this.root.add(this.leftArm, this.rightArm);
    for (const [side, arm] of [[-1, this.leftArm], [1, this.rightArm]] as const) {
      arm.position.set(side * 0.25, 0.98, 0);
      limb([0, 0, 0], [side * 0.18, -0.23, 0.1], 0.1, red, arm);
      limb([side * 0.18, -0.23, 0.1], [side * 0.26, -0.46, 0.28], 0.085, dark, arm);
      this.gloves.push(ellipsoid([side * 0.26, -0.48, 0.29], [0.095, 0.13, 0.08], dark, arm));
      ellipsoid([side * 0.26, -0.47, 0.36], [0.072, 0.085, 0.027], 0x606c74, arm);
    }
    ellipsoid([0, 1.07, 0], [0.09, 0.12, 0.09], dark);
    ellipsoid([0, 1.285, -0.015], [0.143, 0.155, 0.15], 0xe6e8e2);
    ellipsoid([0, 1.265, 0.11], [0.1, 0.115, 0.055], 0xb6886c);
    ellipsoid([0, 1.26, 0.166], [0.014, 0.025, 0.015], 0xb6886c);
    for (const side of [-1, 1]) ellipsoid([side * 0.037, 1.295, 0.162], [0.014, 0.005, 0.004], 0x3f392f);
    for (const side of [-1, 1]) limb([side * 0.13, 1.16, 0.18], [side * 0.13, 1.36, 0.18], 0.014, 0x28343c);
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 256;
      const context = canvas.getContext('2d')!;
      context.fillStyle = '#f4f1e8'; context.textAlign = 'center'; context.font = 'bold 65px sans-serif';
      context.fillText(playerSurname(team, 1).toUpperCase(), 256, 70, 490);
      context.font = 'bold 150px sans-serif'; context.fillText('1', 256, 230);
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      const label = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.23), new THREE.MeshStandardMaterial({ map: texture, transparent: true, depthWrite: false }));
      label.position.set(0, 0.84, -0.184); label.rotation.y = Math.PI; this.root.add(label);
    }
    const cage = new THREE.Group();
    this.root.add(cage);
    for (const y of [1.13, 1.2, 1.28, 1.35]) limb([-0.14, y, 0.205], [0.14, y, 0.205], 0.008, 0xbac5c8, cage);
    for (const x of [-0.12, -0.04, 0.04, 0.12]) limb([x, 1.12, 0.21], [x, 1.36, 0.21], 0.008, 0xbac5c8, cage);
    mesh(new RoundedBoxGeometry(0.05, 0.16, 0.015, 2, 0.005), [0, 0.8, 0.205], 0xf1e6d5);
  }

  get x() { return this.root.position.x; }

  save(ballX: number) { this.savedDirection = Math.sign(ballX - this.x) || 1; }

  pose(): KeeperPose {
    this.root.updateMatrixWorld(true);
    return { x: this.x, gloves: this.gloves.map(glove => {
      const point = glove.getWorldPosition(new THREE.Vector3());
      return { x: point.x, y: point.y, z: point.z };
    }) };
  }

  update(dt: number, phase: GamePhase, phaseTime: number, time: number, ball: THREE.Vector3, velocity: THREE.Vector3) {
    let targetX = this.x;
    let speed = 0.7;
    let targetLift = 0;
    if (phase === 'ready' || phase === 'windup' || phase === 'pass') {
      targetX = Math.sin(time * 1.1) * 0.23;
      this.savedDirection = 0;
    } else if ((phase === 'flight' || phase === 'loose') && phaseTime > 0.19 && velocity.z * (this.team === 0 ? 1 : -1) > 0) {
      // Målvakten reagerar först efter skottet och hinner inte alltid till hörnen.
      const arrivalTime = (this.root.position.z - ball.z) / velocity.z;
      const limit = GOAL_HALF_WIDTH - KEEPER_HALF_WIDTH;
      targetX = THREE.MathUtils.clamp(ball.x + velocity.x * Math.max(0, arrivalTime), -limit, limit);
      const predictedY = ball.y + velocity.y * arrivalTime - 0.5 * GRAVITY * arrivalTime * arrivalTime;
      targetLift = THREE.MathUtils.clamp((predictedY - 0.5 * KEEPER_SCALE) / (0.7 * KEEPER_SCALE), 0, 1);
      speed = 0.85;
    }
    const movement = THREE.MathUtils.clamp(targetX - this.x, -speed * dt, speed * dt);
    this.root.position.x += movement;
    this.lift += THREE.MathUtils.clamp(targetLift - this.lift, -dt * 4, dt * 4);
    const reach = phase === 'flight' ? THREE.MathUtils.clamp((targetX - this.x) * 0.3, -0.22, 0.22) : 0;
    this.root.rotation.z = -reach - this.savedDirection * 0.12 * Math.max(0, 1 - phaseTime);
    this.leftArm.rotation.z = -0.07 + reach + Math.sin(time * 2) * 0.025;
    this.rightArm.rotation.z = 0.07 + reach - Math.sin(time * 2) * 0.025;
    this.leftArm.rotation.x = this.rightArm.rotation.x = -this.lift * 1.4;
  }
}
