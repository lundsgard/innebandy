import * as THREE from 'three';
import { createCrowd } from './crowd';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const HALL_NAME = 'Furuborghallen';

// Färger och uppbyggnad följer Teos två referensbilder av läktaren och hallgolvet.
export function createHall(scene: THREE.Scene) {
  const roof: THREE.Object3D[] = [];
  const cutaway: THREE.Object3D[] = [];
  const materials = new Map<number, THREE.MeshStandardMaterial>();
  const material = (color: number) => {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.78 }));
    return materials.get(color)!;
  };
  const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  function block(size: THREE.Vector3Tuple, position: THREE.Vector3Tuple, color: number) {
    const mesh = new THREE.Mesh(boxGeometry, material(color));
    mesh.scale.set(...size);
    mesh.position.set(...position);
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }
  function instances(geometry: THREE.BufferGeometry, color: number, transforms: THREE.Matrix4[]) {
    const mesh = new THREE.InstancedMesh(geometry, material(color), transforms.length);
    transforms.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }
  const transform = new THREE.Object3D();
  function matrix(position: THREE.Vector3Tuple, scale: THREE.Vector3Tuple = [1, 1, 1]) {
    transform.position.set(...position);
    transform.scale.set(...scale);
    transform.rotation.set(0, 0, 0);
    transform.updateMatrix();
    return transform.matrix.clone();
  }

  const concrete = 0x62696d;
  const seatGreen = 0x165b56;
  const paleWood = 0xc8ad77;
  const timber = 0xc39556;
  const cream = 0xe6e1d5;
  const metal = 0x424e50;

  // Ljust hallgolv fortsätter utanför sargen och fram till läktarens nedersta rad.
  block([39, 0.12, 49], [-4.8, -0.2, 0], 0xbab5a2);
  block([0.24, 8.7, 48], [-23.15, 4.25, 0], cream);
  for (const z of [-24, 24]) {
    block([37.5, 8.7, 0.24], [-4.5, 4.25, z], cream);
    block([37.5, 2.25, 0.09], [-4.5, 1.125, z - Math.sign(z) * 0.14], 0xc7aa7c);
    block([12, 2.0, 0.06], [-4.5, 6.7, z - Math.sign(z) * 0.15], 0x658176);
  }
  cutaway.push(block([0.24, 8.7, 48], [14, 4.25, 0], cream));

  // Lodräta träpaneler på kortsidornas nedre väggar.
  const slats: THREE.Matrix4[] = [];
  for (const z of [-23.79, 23.79]) for (let x = -22.9; x < 13.8; x += 0.12) slats.push(matrix([x, 1.12, z], [0.025, 2.24, 0.025]));
  instances(boxGeometry, 0xa58659, slats);

  // Stor långsidesläktare: sex stolssektioner, fem trappgångar och tolv rader.
  const rows = 12;
  const blocks = 6;
  const seatsPerBlock = 10;
  const seatPitch = 0.53;
  const aisleWidth = 1.0;
  const blockWidth = seatsPerBlock * seatPitch;
  const standLength = blocks * blockWidth + (blocks - 1) * aisleWidth;
  const startZ = -standLength / 2;
  const frontX = -11.7;
  const rowDepth = 0.82;
  const rowRise = 0.34;
  const platforms: THREE.Matrix4[] = [];
  const nosings: THREE.Matrix4[] = [];
  const backFrames: THREE.Matrix4[] = [];
  const backCushions: THREE.Matrix4[] = [];
  const cushions: THREE.Matrix4[] = [];
  const legs: THREE.Matrix4[] = [];
  const underSeats: THREE.Matrix4[] = [];
  const occupiedSeats: { x: number; y: number; z: number; row: number; index: number }[] = [];

  for (let row = 0; row < rows; row++) {
    const front = frontX - row * rowDepth;
    const floorY = 0.14 + row * rowRise;
    const seatX = front - 0.38;
    for (let section = 0; section < blocks; section++) {
      const sectionZ = startZ + section * (blockWidth + aisleWidth);
      platforms.push(matrix([front - rowDepth / 2, floorY / 2, sectionZ + blockWidth / 2], [rowDepth, floorY, blockWidth]));
      nosings.push(matrix([front - 0.02, floorY + 0.012, sectionZ + blockWidth / 2], [0.035, 0.024, blockWidth]));
      underSeats.push(matrix([seatX, floorY + 0.27, sectionZ + blockWidth / 2], [0.05, 0.055, blockWidth - 0.12]));
      for (let seat = 0; seat < seatsPerBlock; seat++) {
        const z = sectionZ + (seat + 0.5) * seatPitch;
        occupiedSeats.push({ x: seatX + 0.035, y: floorY + 0.49, z, row, index: occupiedSeats.length });
        backFrames.push(matrix([seatX - 0.19, floorY + 0.72, z]));
        backCushions.push(matrix([seatX - 0.145, floorY + 0.707, z]));
        cushions.push(matrix([seatX + 0.04, floorY + 0.445, z]));
        for (const edge of [-1, 1]) legs.push(matrix([seatX + 0.02, floorY + 0.22, z + edge * 0.16], [0.035, 0.4, 0.035]));
      }
      if (section < blocks - 1) {
        const aisleZ = sectionZ + blockWidth + aisleWidth / 2;
        for (let half = 0; half < 2; half++) {
          const treadY = row === 0 ? 0.07 * (half + 1) : floorY - (half === 0 ? rowRise / 2 : 0);
          const x = front - rowDepth * (half + 0.5) / 2;
          platforms.push(matrix([x, treadY / 2, aisleZ], [rowDepth / 2, treadY, aisleWidth]));
          nosings.push(matrix([front - rowDepth * half / 2 - 0.02, treadY + 0.012, aisleZ], [0.035, 0.024, aisleWidth]));
        }
      }
    }
  }
  instances(boxGeometry, concrete, platforms);
  instances(boxGeometry, 0xb7bdb9, nosings);
  instances(boxGeometry, 0x8b9392, underSeats);
  instances(boxGeometry, metal, legs);
  instances(new RoundedBoxGeometry(0.075, 0.47, 0.49, 3, 0.055), paleWood, backFrames);
  instances(new RoundedBoxGeometry(0.028, 0.405, 0.435, 3, 0.045), seatGreen, backCushions);
  instances(new RoundedBoxGeometry(0.43, 0.085, 0.465, 3, 0.035), 0x206a61, cushions);

  // Smala metallräcken bakom översta raden samt längs läktarens gavlar.
  const rails: THREE.Matrix4[] = [];
  const railGeometry = new THREE.CylinderGeometry(0.016, 0.016, 1, 8);
  function railing(a: THREE.Vector3Tuple, b: THREE.Vector3Tuple) {
    const from = new THREE.Vector3(...a);
    const to = new THREE.Vector3(...b);
    const direction = to.clone().sub(from);
    transform.position.copy(from.add(to).multiplyScalar(0.5));
    transform.scale.set(1, direction.length(), 1);
    transform.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    transform.updateMatrix();
    rails.push(transform.matrix.clone());
  }
  const rearX = frontX - rows * rowDepth + 0.05;
  const rearFloor = 0.14 + (rows - 1) * rowRise;
  block([1.35, rearFloor, standLength], [rearX - 0.675, rearFloor / 2, 0], concrete);
  railing([rearX, rearFloor + 1.05, startZ], [rearX, rearFloor + 1.05, -startZ]);
  railing([rearX, rearFloor + 0.55, startZ], [rearX, rearFloor + 0.55, -startZ]);
  for (let z = startZ; z <= -startZ; z += 1.06) railing([rearX, rearFloor, z], [rearX, rearFloor + 1.05, z]);
  for (const z of [startZ, -startZ]) {
    for (let row = 0; row < rows; row++) {
      const x = frontX - (row + 0.5) * rowDepth;
      const y = 0.14 + row * rowRise;
      railing([x, y, z], [x, y + 0.95, z]);
    }
    railing([frontX - 0.4, 1.1, z], [rearX, rearFloor + 1.05, z]);
  }
  instances(railGeometry, 0x3d4648, rails);

  // Trästolpar, överliggare och krysstag liknar dem i bilderna.
  for (let z = -21.5; z <= 21.5; z += 6.14) {
    block([0.3, 8.35, 0.33], [-22.96, 4.175, z], timber);
    roof.push(block([37, 0.42, 0.24], [-4.5, 8.05, z], timber));
  }
  const braces: THREE.Matrix4[] = [];
  const braceGeometry = new THREE.CylinderGeometry(0.025, 0.025, 1, 8);
  function brace(a: THREE.Vector3Tuple, b: THREE.Vector3Tuple) {
    const from = new THREE.Vector3(...a); const to = new THREE.Vector3(...b); const d = to.clone().sub(from);
    transform.position.copy(from.add(to).multiplyScalar(0.5)); transform.scale.set(1, d.length(), 1);
    transform.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); transform.updateMatrix(); braces.push(transform.matrix.clone());
  }
  for (const z of [-23.65, 23.65]) {
    brace([-10.5, 5.8, z], [1.5, 7.65, z]);
    brace([-10.5, 7.65, z], [1.5, 5.8, z]);
  }
  instances(braceGeometry, 0xd8ddda, braces);
  roof.push(block([37.5, 0.12, 48], [-4.5, 8.4, 0], 0x777d76));
  const lampMaterial = new THREE.MeshBasicMaterial({ color: 0xfff7dd });
  const lamps: THREE.Matrix4[] = [];
  for (let z = -20; z <= 20; z += 4) for (const x of [-15, -5, 5]) lamps.push(matrix([x, 7.78, z], [2.1, 0.07, 0.24]));
  const lighting = new THREE.InstancedMesh(boxGeometry, lampMaterial, lamps.length);
  lamps.forEach((m, i) => lighting.setMatrixAt(i, m));
  scene.add(lighting);
  roof.push(lighting);

  const signCanvas = document.createElement('canvas');
  signCanvas.width = 1536; signCanvas.height = 160;
  const ctx = signCanvas.getContext('2d')!;
  ctx.fillStyle = '#ece6d8'; ctx.fillRect(0, 0, 1536, 160);
  ctx.fillStyle = '#1c514b'; ctx.textAlign = 'center'; ctx.font = 'bold 100px sans-serif';
  ctx.fillText(HALL_NAME.toUpperCase(), 768, 116);
  const signTexture = new THREE.CanvasTexture(signCanvas); signTexture.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(12, 1.25), new THREE.MeshStandardMaterial({ map: signTexture, roughness: 0.8 }));
  sign.rotation.y = Math.PI / 2;
  sign.position.set(-22.76, 6.5, 0);
  scene.add(sign);
  const crowd = createCrowd(scene, occupiedSeats);
  for (const z of [-12, 0, 12]) {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 128;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#252932'; context.fillRect(0, 0, 1024, 128);
    context.fillStyle = '#f4e1a3'; context.textAlign = 'center'; context.font = 'bold 72px sans-serif';
    context.fillText(z === 0 ? 'HEJA NYKVARNS IF!' : z < 0 ? 'KOM IGEN NYKVARN!' : 'LUNDSGÅRD!', 512, 90, 980);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(5.3, 0.67), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9, side: THREE.DoubleSide }));
    banner.rotation.y = Math.PI / 2; banner.position.set(frontX + 0.03, 0.56, z); scene.add(banner);
  }
  return { roof, cutaway, crowd };
}
