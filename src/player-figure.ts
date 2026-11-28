import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { Runner } from './game-state';
import { TEAMS, playerSurname, type TeamId } from './teams';
import { PLAYER_SCALE, CLUB_SHAFT_TOP, CLUB_SHAFT_BOTTOM, CLUB_UPPER_HAND, CLUB_LOWER_HAND, CLUB_BLADE_POINTS } from './rink-dimensions';
import { bodySurface, headSurface, limbSurface } from './human-geometry';

type Point = THREE.Vector3Tuple;
const materials = new Map<string, THREE.MeshStandardMaterial>();
const sphere = new THREE.SphereGeometry(1, 24, 16);
const skinCanvas = document.createElement('canvas');
skinCanvas.width = skinCanvas.height = 128;
const pores = skinCanvas.getContext('2d')!;
let seed = 91;
for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  const value = 125 + (seed % 19);
  pores.fillStyle = `rgb(${value},${value},${value})`;
  pores.fillRect(x, y, 1, 1);
}
const skinGrain = new THREE.CanvasTexture(skinCanvas);
skinGrain.wrapS = skinGrain.wrapT = THREE.RepeatWrapping;
skinGrain.repeat.set(3, 3);
const skinColors = [0xc99b7a, 0xb17c5b, 0x77513d];
const knitCanvas = document.createElement('canvas');
knitCanvas.width = knitCanvas.height = 64;
const knit = knitCanvas.getContext('2d')!;
for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
  const gray = Math.round(125 + Math.cos(y * Math.PI / 2 + x) * 25);
  knit.fillStyle = `rgb(${gray},${gray},${gray})`;
  knit.fillRect(x, y, 1, 1);
}
const weave = new THREE.CanvasTexture(knitCanvas);
weave.wrapS = weave.wrapT = THREE.RepeatWrapping;
weave.repeat.set(10, 10);
function surface(color: number, fabric = false) {
  const key = `${color}:${fabric}`;
  if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({
    color, roughness: fabric ? 0.92 : 0.72, bumpMap: fabric ? weave : skinColors.includes(color) ? skinGrain : null, bumpScale: fabric ? 0.0008 : 0.00015,
  }));
  return materials.get(key)!;
}

export class PlayerFigure {
  readonly root = new THREE.Group();
  private body = new THREE.Group();
  private swing = new THREE.Group();
  private pivot = new THREE.Vector3(0.1, 1.30, -0.1);
  private legs: { hip: THREE.Group; knee: THREE.Group; foot: THREE.Group }[] = [];
  private skin: number;
  private kit;

  constructor(scene: THREE.Scene, private number: number, private team: TeamId = 0) {
    this.skin = skinColors[number % 3];
    this.kit = TEAMS[team];
    scene.add(this.root);
    this.root.scale.setScalar(PLAYER_SCALE);
    this.root.add(this.body);
    this.body.add(this.swing);
    this.swing.position.copy(this.pivot);
    this.mesh(bodySurface([
      [0.89, 0.15, 0.10], [0.94, 0.17, 0.116], [1.04, 0.153, 0.106],
      [1.15, 0.155, 0.112], [1.28, 0.188, 0.124], [1.40, 0.211, 0.116],
      [1.46, 0.205, 0.105], [1.505, 0.16, 0.088], [1.545, 0.06, 0.058],
    ]), [0, 0, 0], this.kit.shirt, this.body, true);
    this.mesh(bodySurface([[0.84, 0.145, 0.11], [0.92, 0.178, 0.122], [1.005, 0.161, 0.112]]), [0, 0, 0], this.kit.shorts, this.body, true);
    this.limb([0, 1.48, 0], [0, 1.655, 0.005], [[0.1, 0.05], [0.6, 0.048], [0.9, 0.05]], this.skin, this.body);
    const collar = this.mesh(new THREE.TorusGeometry(0.06, 0.006, 8, 32), [0, 1.545, 0], this.kit.shorts, this.body, true);
    collar.rotation.x = Math.PI / 2;
    this.makeHead();
    for (const side of [-1, 1]) {
      this.limb([side * 0.154, 1.02, 0.006], [side * 0.185, 1.33, 0.008], [[0.01, 0.002], [0.99, 0.002]], this.kit.shorts, this.body, true);
    }
    for (const side of [-1, 1]) {
      this.makeLeg(side);
      const shoulder: Point = [side * 0.205, 1.448, 0];
      const elbow: Point = side < 0 ? [-0.12, 1.17, -0.22] : [0.4, 1.13, -0.15];
      const hand = side < 0 ? CLUB_UPPER_HAND : CLUB_LOWER_HAND;
      const upper = new THREE.Vector3(...shoulder).lerp(new THREE.Vector3(...elbow), 0.43).toArray();
      this.limb(shoulder, elbow, [[0.05, 0.059], [0.25, 0.067], [0.6, 0.059], [0.94, 0.044]], this.skin, this.swing, false, true);
      this.limb(shoulder, upper, [[0.02, 0.07], [0.35, 0.084], [0.85, 0.076], [0.99, 0.074]], this.kit.shirt, this.swing, true, true);
      this.ellipsoid(elbow, [0.044, 0.044, 0.043], this.skin, this.swing, true);
      this.limb(elbow, hand, [[0.03, 0.043], [0.3, 0.052], [0.65, 0.041], [0.97, 0.027]], this.skin, this.swing, false, true);
      this.ellipsoid(hand, [0.039, 0.052, 0.026], this.skin, this.swing, true);
      for (let finger = 0; finger < 4; finger++) {
        const from: Point = [hand[0] - 0.029, hand[1] + 0.03 - finger * 0.016, hand[2] - 0.018];
        this.limb(from, [hand[0] + 0.025, from[1] - 0.006, hand[2] - 0.025], [[0.1, 0.007], [0.85, 0.006]], this.skin, this.swing, false, true);
      }
      this.ellipsoid([hand[0] - 0.03, hand[1] - 0.005, hand[2] + 0.016], [0.014, 0.028, 0.012], this.skin, this.swing, true);
    }
    this.makeStick();
    this.makeNumber();
  }

  private mesh(geometry: THREE.BufferGeometry, position: Point, color: number, parent: THREE.Object3D, fabric = false) {
    const mesh = new THREE.Mesh(geometry, surface(color, fabric));
    mesh.position.set(...position);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  private ellipsoid(position: Point, size: Point, color: number, parent = this.body, inSwing = false) {
    const mesh = this.mesh(sphere, position, color, parent);
    mesh.scale.set(...size);
    if (inSwing) mesh.position.sub(this.pivot);
    return mesh;
  }

  private limb(from: Point, to: Point, radii: [number, number][], color: number, parent: THREE.Object3D, fabric = false, inSwing = false) {
    const a = new THREE.Vector3(...from);
    const direction = new THREE.Vector3(...to).sub(a);
    const mesh = this.mesh(limbSurface(direction.length(), radii), from, color, parent, fabric);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    if (inSwing) mesh.position.sub(this.pivot);
    return mesh;
  }

  private makeHead() {
    const head = new THREE.Group();
    head.rotation.y = (this.number % 3 - 1) * 0.04;
    this.body.add(head);
    this.mesh(headSurface(), [0, 0, 0], this.skin, head);
    const hair = [0x30261e, 0x201b17, 0x65503a, 0x796144][this.number % 4];
    // Hårfästet är högre i pannan och lägre i nacken.
    const hairGeometry = new THREE.SphereGeometry(1, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2);
    const points = hairGeometry.getAttribute('position');
    for (let i = 0; i < points.count; i++) {
      const x = points.getX(i), y = points.getY(i), z = points.getZ(i);
      const hairline = 1.715 - z * 0.048;
      points.setXYZ(i, x * 0.084, hairline + y * (1.84 - hairline), z * 0.09 + 0.006);
    }
    hairGeometry.computeVertexNormals();
    hairGeometry.userData.batchKey = 'scalp';
    this.mesh(hairGeometry, [0, 0, 0], hair, head);
    for (const side of [-1, 1]) {
      this.ellipsoid([side * 0.083, 1.69, 0.002], [0.014, 0.027, 0.017], this.skin, head);
      this.ellipsoid([side * 0.091, 1.69, -0.005], [0.0025, 0.015, 0.009], 0x9c6d55, head);
      // Små ögonspringor under ögonbrynsbågen, med iris i stället för stora klotögon.
      this.ellipsoid([side * 0.032, 1.715, -0.079], [0.018, 0.008, 0.008], 0x815d49, head);
      this.ellipsoid([side * 0.032, 1.714, -0.086], [0.013, 0.0041, 0.003], 0xd2cdc0, head);
      this.ellipsoid([side * 0.031, 1.714, -0.089], [0.004, 0.004, 0.0018], 0x373629, head);
      const brow = this.ellipsoid([side * 0.033, 1.728, -0.083], [0.021, 0.003, 0.004], hair, head);
      brow.rotation.z = side * -0.1;
    }
    this.ellipsoid([0, 1.69, -0.086], [0.013, 0.029, 0.015], this.skin, head);
    this.ellipsoid([0, 1.676, -0.103], [0.017, 0.012, 0.014], this.skin, head);
    this.ellipsoid([0, 1.641, -0.073], [0.025, 0.0023, 0.003], 0x926451, head);
    this.ellipsoid([0, 1.636, -0.072], [0.021, 0.003, 0.003], 0xb4846b, head);
  }

  private makeLeg(side: number) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.106, 0.925, 0);
    this.root.add(hip);
    this.limb([0, 0, 0], [0, -0.435, 0], [[0.05, 0.09], [0.3, 0.086], [0.67, 0.064], [0.98, 0.05]], this.skin, hip);
    this.limb([0, 0.01, 0], [side * 0.009, -0.24, 0], [[0.02, 0.09], [0.3, 0.104], [0.95, 0.092], [0.99, 0.09]], this.kit.shorts, hip, true);
    const knee = new THREE.Group();
    knee.position.y = -0.435;
    hip.add(knee);
    this.ellipsoid([0, -0.002, -0.025], [0.048, 0.052, 0.035], this.skin, knee);
    this.limb([0, -0.01, 0], [0, -0.4, 0.012], [[0.01, 0.048], [0.25, 0.064], [0.5, 0.057], [0.85, 0.033], [0.99, 0.031]], this.kit.socks, knee, true);
    this.limb([0, -0.046, 0], [0, -0.068, 0], [[0.01, 0.054], [0.99, 0.055]], this.kit.shirt, knee, true);
    const foot = new THREE.Group();
    foot.position.set(0, -0.4, 0.005);
    knee.add(foot);
    const shoe = this.mesh(bodySurface([[-0.076, 0.046, 0.135, -0.06], [-0.053, 0.051, 0.14, -0.06], [-0.014, 0.05, 0.12, -0.055], [0.038, 0.033, 0.057, -0.01], [0.055, 0.024, 0.038]]), [0, 0, 0], 0x343c40, foot);
    const sole = this.mesh(new RoundedBoxGeometry(0.106, 0.017, 0.276, 3, 0.008), [0, -0.081, -0.06], 0xbdbcb0, foot);
    shoe.castShadow = sole.castShadow = true;
    for (let lace = 0; lace < 4; lace++) this.limb([-0.026, 0.017 - lace * 0.006, -0.04 - lace * 0.02], [0.026, 0.017 - lace * 0.006, -0.04 - lace * 0.02], [[0.01, 0.002], [0.99, 0.002]], 0xc5c9c5, foot);
    this.legs.push({ hip, knee, foot });
  }

  private makeStick() {
    this.limb(CLUB_SHAFT_BOTTOM, CLUB_SHAFT_TOP, [[0.001, 0.014], [0.999, 0.014]], 0x252b30, this.swing, false, true);
    const gripBottom = new THREE.Vector3(...CLUB_SHAFT_TOP).lerp(new THREE.Vector3(...CLUB_SHAFT_BOTTOM), 0.29).toArray();
    this.limb(gripBottom, CLUB_SHAFT_TOP, [[0.001, 0.015], [0.999, 0.015]], 0x626c6c, this.swing, false, true);
    for (let i = 1; i < CLUB_BLADE_POINTS.length; i++) {
      const from = new THREE.Vector3(...CLUB_BLADE_POINTS[i - 1]);
      const to = new THREE.Vector3(...CLUB_BLADE_POINTS[i]);
      const direction = to.clone().sub(from);
      const blade = this.mesh(new RoundedBoxGeometry(direction.length(), 0.076 / PLAYER_SCALE, 0.008 / PLAYER_SCALE, 3, 0.003), from.add(to).multiplyScalar(0.5).toArray(), 0xe78535, this.swing);
      blade.position.sub(this.pivot);
      blade.rotation.y = -Math.atan2(direction.z, direction.x);
    }
  }

  private makeNumber() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#eceee5'; context.textAlign = 'center';
    context.font = 'bold 22px sans-serif';
    context.font = 'bold 26px sans-serif';
    context.fillText(playerSurname(this.team, this.number).toUpperCase(), 128, 45, 246);
    context.font = 'bold 144px sans-serif';
    context.fillText(String(this.number), 128, 198);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshStandardMaterial({ map: texture, transparent: true, depthWrite: false, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -1 });
    const back = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.27), material);
    back.position.set(0, 1.3, 0.126);
    this.body.add(back);
    const front = new THREE.Mesh(new THREE.PlaneGeometry(0.115, 0.125), material);
    front.position.set(-0.065, 1.365, -0.122);
    front.rotation.y = Math.PI;
    this.body.add(front);
  }

  update(player: Runner, time: number, swingProgress: number, followThrough: boolean) {
    this.root.position.set(player.x, 0, player.z);
    this.root.rotation.y = player.facing;
    const running = Math.min(1, player.speed / 4);
    const step = player.distance * 3.6;
    this.legs.forEach((leg, index) => {
      const phase = step + index * Math.PI;
      const stride = Math.sin(phase);
      leg.hip.rotation.x = stride * 0.72 * running + (index === 0 ? 0.08 : -0.08) * (1 - running);
      leg.knee.rotation.x = -Math.max(0, -Math.cos(phase)) * 1.05 * running - 0.06;
      leg.foot.rotation.x = -leg.hip.rotation.x * 0.32 + Math.max(0, -stride) * 0.22 * running;
    });
    this.body.position.y = running * Math.abs(Math.sin(step)) * 0.021 + Math.sin(time * 2) * 0.002;
    this.body.rotation.x = running * -0.075;
    this.body.rotation.z = Math.sin(step) * running * 0.017;
    if (swingProgress > 0) {
      this.swing.rotation.y = swingProgress < 0.6 ? swingProgress / 0.6 * 0.6 : THREE.MathUtils.lerp(0.6, -0.2, (swingProgress - 0.6) / 0.4);
      this.body.rotation.x -= Math.sin(swingProgress * Math.PI) * 0.06;
    } else this.swing.rotation.y = followThrough ? -0.3 : Math.sin(step) * running * 0.035;
  }
}
