import * as THREE from 'three';
import { bodySurface } from './human-geometry';

type Seat = { x: number; y: number; z: number; row: number; index: number };
type Point = THREE.Vector3Tuple;
type Part = { position: Point; scale: Point; rotation?: Point };
type Batch = { geometry: THREE.BufferGeometry; color: number; parts: Part[]; mesh?: THREE.InstancedMesh };

export function createCrowd(scene: THREE.Scene, seats: Seat[]) {
  const sphere = new THREE.SphereGeometry(1, 12, 8);
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 8);
  const ear = new THREE.ConeGeometry(1, 1, 3);
  const shirt = bodySurface([[0, 0.15, 0.1], [0.16, 0.14, 0.095], [0.38, 0.19, 0.115], [0.46, 0.2, 0.1], [0.5, 0.065, 0.06]], 16);
  const batches = new Map<string, Batch>();
  const transform = new THREE.Object3D();
  const up = new THREE.Vector3(0, 1, 0);
  const arms: { seat: Seat; shoulder: Point; skin: number; phase: number; side: number }[] = [];
  function batch(geometry: THREE.BufferGeometry, color: number) {
    const key = `${geometry.uuid}:${color}`;
    if (!batches.has(key)) batches.set(key, { geometry, color, parts: [] });
    return batches.get(key)!;
  }
  function part(geometry: THREE.BufferGeometry, color: number, position: Point, scale: Point, rotation?: Point) {
    batch(geometry, color).parts.push({ position, scale, rotation });
  }
  function point(seat: Seat, x: number, y: number, forward: number): Point { return [seat.x + forward, seat.y + y, seat.z + x]; }
  function ball(seat: Seat, color: number, p: Point, scale: Point) { part(sphere, color, point(seat, ...p), [scale[2], scale[1], scale[0]]); }
  function segment(seat: Seat, color: number, a: Point, b: Point, radius: number) {
    const from = new THREE.Vector3(...point(seat, ...a)); const to = new THREE.Vector3(...point(seat, ...b));
    const direction = to.clone().sub(from);
    transform.quaternion.setFromUnitVectors(up, direction.clone().normalize());
    part(cylinder, color, from.add(to).multiplyScalar(0.5).toArray(), [radius, direction.length(), radius], [transform.rotation.x, transform.rotation.y, transform.rotation.z]);
  }
  const skinColors = [0xd4a37d, 0xbc8966, 0x855b42, 0xe0b798];
  const clothes = [0x272b33, 0x313943, 0xd4c8a6, 0x8b3d32, 0x374b63, 0x596052];
  seats.forEach(seat => {
    const n = seat.index;
    if (n % 9 === 4) {
      const kind = Math.floor(n / 9) % 3;
      const fur = [0xb28a55, 0x67615b, 0xd2c5b1, 0xddd8cb][Math.floor(n / 27) % 4];
      const height = kind === 0 ? 0.45 : 0.33;
      ball(seat, fur, [0, 0.16, 0.015], [0.14, 0.21, 0.17]);
      ball(seat, fur, [0, height, 0.12], [0.12, 0.125, 0.115]);
      ball(seat, fur, [0, height - 0.03, 0.225], [0.075, 0.055, kind === 0 ? 0.085 : 0.04]);
      ball(seat, 0x292622, [0, height - 0.013, kind === 0 ? 0.305 : 0.265], [0.024, 0.018, 0.012]);
      for (const side of [-1, 1]) {
        ball(seat, 0x1d2421, [side * 0.049, height + 0.029, 0.22], [0.011, 0.011, 0.008]);
        ball(seat, fur, [side * 0.077, -0.015, 0.17], [0.047, 0.05, 0.095]);
        if (kind === 0) ball(seat, fur, [side * 0.12, height - 0.025, 0.07], [0.04, 0.12, 0.06]);
        else if (kind === 1) part(ear, fur, point(seat, side * 0.075, height + 0.13, 0.10), [0.057, 0.12, 0.04]);
        else ball(seat, fur, [side * 0.055, height + 0.19, 0.105], [0.033, 0.15, 0.032]);
      }
      segment(seat, fur, [0, 0.08, -0.1], [kind === 1 ? 0.17 : 0.09, 0.26, -0.22], 0.035);
      // Svartgul halsduk också på djuren.
      ball(seat, 0x252932, [0, height - 0.105, 0.12], [0.105, 0.029, 0.1]);
      return;
    }
    const skin = skinColors[n % skinColors.length];
    const top = clothes[(n * 7 + seat.row) % clothes.length];
    const scale = n % 13 === 0 ? 0.82 : 1;
    const pelvisY = 0.025;
    part(shirt, top, point(seat, 0, pelvisY, 0), [1, scale, 1], [0, Math.PI / 2, 0]);
    ball(seat, 0x26313b, [0, 0.015, 0.02], [0.16, 0.09, 0.13]);
    ball(seat, skin, [0, 0.57 * scale, 0.01], [0.055, 0.075, 0.055]);
    ball(seat, skin, [0, 0.7 * scale, 0.025], [0.085, 0.12, 0.09]);
    // Näsa, öron och små ögon syns i den nära kameran.
    ball(seat, skin, [0, 0.69 * scale, 0.12], [0.015, 0.023, 0.023]);
    const hair = [0x34271e, 0x796044, 0xb8b3a4, 0x29211b][n % 4];
    ball(seat, hair, [0, 0.785 * scale, 0.015], [0.086, 0.044, 0.085]);
    for (const side of [-1, 1]) {
      ball(seat, skin, [side * 0.084, 0.695 * scale, 0.02], [0.013, 0.024, 0.015]);
      ball(seat, 0x3c342b, [side * 0.03, 0.72 * scale, 0.108], [0.01, 0.004, 0.004]);
      segment(seat, 0x26313b, [side * 0.095, 0, 0.03], [side * 0.105, -0.045, 0.3], 0.067);
      segment(seat, 0x26313b, [side * 0.105, -0.045, 0.3], [side * 0.11, -0.34, 0.32], 0.045);
      ball(seat, 0x45494a, [side * 0.11, -0.375, 0.365], [0.055, 0.04, 0.11]);
      const shoulder: Point = [side * 0.195, 0.43 * scale, 0.015];
      ball(seat, top, shoulder, [0.073, 0.09, 0.08]);
      arms.push({ seat, shoulder, skin, side, phase: n * 2.17 });
    }
    if (n % 3 === 0) {
      ball(seat, 0xd8c68d, [-0.058, 0.38, 0.12], [0.027, 0.13, 0.015]);
      ball(seat, 0xd8c68d, [0.058, 0.38, 0.12], [0.027, 0.13, 0.015]);
    }
  });
  batches.forEach(group => {
    const mesh = new THREE.InstancedMesh(group.geometry, new THREE.MeshStandardMaterial({ color: group.color, roughness: 0.88 }), group.parts.length);
    group.parts.forEach((p, index) => {
      transform.position.set(...p.position); transform.scale.set(...p.scale); transform.rotation.set(...(p.rotation ?? [0, 0, 0])); transform.updateMatrix(); mesh.setMatrixAt(index, transform.matrix);
    });
    mesh.receiveShadow = true; scene.add(mesh); group.mesh = mesh;
  });
  const moving = skinColors.map(color => {
    const sources = arms.filter(arm => arm.skin === color);
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
    const limbs = new THREE.InstancedMesh(cylinder, material, sources.length * 2);
    const hands = new THREE.InstancedMesh(sphere, material, sources.length);
    limbs.instanceMatrix.setUsage(THREE.DynamicDrawUsage); hands.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    limbs.frustumCulled = hands.frustumCulled = false;
    scene.add(limbs, hands); return { sources, limbs, hands };
  });
  let lastUpdate = -1;
  function update(time: number, cheering: boolean) {
    if (time - lastUpdate < 1 / 15) return;
    lastUpdate = time;
    moving.forEach(({ sources, limbs, hands }) => {
      sources.forEach((arm, index) => {
        const wave = Math.sin(time * (cheering ? 5 : 2) + arm.phase);
        const raised = cheering || arm.seat.index % 5 === 0;
        const elbow: Point = [arm.side * (raised ? 0.29 : 0.24), arm.shoulder[1] + (raised ? 0.10 : -0.17), 0.11];
        const hand: Point = [arm.side * (raised ? 0.23 + wave * 0.04 : 0.13), arm.shoulder[1] + (raised ? 0.37 + wave * 0.045 : -0.27), raised ? 0.09 : 0.28];
        for (const [i, a, b] of [[0, arm.shoulder, elbow], [1, elbow, hand]] as const) {
          const from = new THREE.Vector3(...point(arm.seat, ...a)); const to = new THREE.Vector3(...point(arm.seat, ...b)); const direction = to.clone().sub(from);
          transform.position.copy(from.add(to).multiplyScalar(0.5)); transform.scale.set(0.033, direction.length(), 0.033); transform.quaternion.setFromUnitVectors(up, direction.normalize()); transform.updateMatrix(); limbs.setMatrixAt(index * 2 + i, transform.matrix);
        }
        transform.position.set(...point(arm.seat, ...hand)); transform.scale.set(0.03, 0.045, 0.027); transform.rotation.set(0, 0, 0); transform.updateMatrix(); hands.setMatrixAt(index, transform.matrix);
      });
      limbs.instanceMatrix.needsUpdate = hands.instanceMatrix.needsUpdate = true;
    });
  }
  update(0, false);
  return { update, people: seats.length - seats.filter(seat => seat.index % 9 === 4).length, animals: seats.filter(seat => seat.index % 9 === 4).length };
}
