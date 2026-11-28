import * as THREE from 'three';
import {
  RINK, GOAL_Z, GOAL_HALF_WIDTH, GOAL_POST_RADIUS,
  GOAL_BACK_BAR_RADIUS, GOAL_CROSSBAR_Y, GOAL_BACK_Z, GOAL_TOP_BACK_Z, goalFramePoints,
} from './rink-dimensions';

export function roundedRinkShape(width: number = RINK.width, length: number = RINK.length, radius: number = RINK.cornerRadius): THREE.Shape {
  const x = width / 2;
  const z = length / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-x + radius, -z);
  shape.lineTo(x - radius, -z);
  shape.absarc(x - radius, -z + radius, radius, -Math.PI / 2, 0, false);
  shape.lineTo(x, z - radius);
  shape.absarc(x - radius, z - radius, radius, 0, Math.PI / 2, false);
  shape.lineTo(-x + radius, z);
  shape.absarc(-x + radius, z - radius, radius, Math.PI / 2, Math.PI, false);
  shape.lineTo(-x, -z + radius);
  shape.absarc(-x + radius, -z + radius, radius, Math.PI, Math.PI * 1.5, false);
  shape.closePath();
  return shape;
}

export function boardGeometry(height: number = RINK.boardHeight) {
  const thickness = RINK.boardThickness;
  const shape = roundedRinkShape(RINK.width + thickness * 2, RINK.length + thickness * 2, RINK.cornerRadius + thickness);
  shape.holes.push(new THREE.Path(roundedRinkShape().getPoints(48).reverse()));
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments: 48 });
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

function tube(from: THREE.Vector3Tuple, to: THREE.Vector3Tuple, radius: number, material: THREE.Material, parent: THREE.Object3D) {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const direction = b.clone().sub(a);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), 12), material);
  mesh.position.copy(a.add(b).multiplyScalar(0.5));
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  mesh.castShadow = true;
  parent.add(mesh);
}

// Lokal mållinje z=0. Yttermått: 1,60 m bredd, 1,15 m höjd och 0,65 m bottendjup.
export function createGoal() {
  const goal = new THREE.Group();
  const red = new THREE.MeshStandardMaterial({ color: 0xbd382d, roughness: 0.45, metalness: 0.2 });
  const points = goalFramePoints();
  const curve = new THREE.CurvePath<THREE.Vector3>();
  for (let i = 1; i < points.length; i++) {
    curve.add(new THREE.LineCurve3(new THREE.Vector3(points[i - 1].x, points[i - 1].y, 0), new THREE.Vector3(points[i].x, points[i].y, 0)));
  }
  const frame = new THREE.Mesh(new THREE.TubeGeometry(curve, 160, GOAL_POST_RADIUS, 12, false), red);
  frame.castShadow = true;
  goal.add(frame);
  const bottomZ = GOAL_BACK_Z - GOAL_Z;
  const topZ = GOAL_TOP_BACK_Z - GOAL_Z;
  const backX = GOAL_HALF_WIDTH - 0.03;
  const baseY = GOAL_BACK_BAR_RADIUS;
  const topY = GOAL_CROSSBAR_Y - 0.015;
  for (const side of [-1, 1]) {
    tube([side * GOAL_HALF_WIDTH, baseY, 0], [side * backX, baseY, bottomZ], GOAL_BACK_BAR_RADIUS, red, goal);
    tube([side * backX, baseY, bottomZ], [side * backX, topY, topZ], GOAL_BACK_BAR_RADIUS, red, goal);
    tube([side * GOAL_HALF_WIDTH, topY, 0], [side * backX, topY, topZ], GOAL_BACK_BAR_RADIUS, red, goal);
  }
  tube([-backX, baseY, bottomZ], [backX, baseY, bottomZ], GOAL_BACK_BAR_RADIUS, red, goal);
  tube([-backX, topY, topZ], [backX, topY, topZ], GOAL_BACK_BAR_RADIUS, red, goal);
  const net: THREE.Vector3[] = [];
  const line = (a: THREE.Vector3Tuple, b: THREE.Vector3Tuple) => net.push(new THREE.Vector3(...a), new THREE.Vector3(...b));
  const grid = 0.045;
  for (let x = -backX; x <= backX + 0.001; x += grid) {
    line([x, baseY, bottomZ], [x, topY, topZ]);
    line([x, topY, topZ], [x, topY, 0]);
    // Nedhängande fångstnät, 20 cm bakom målramen.
    line([x, 0.03, -0.2], [x, topY, -0.2]);
  }
  for (let y = 0.03; y <= topY; y += grid) {
    const z = THREE.MathUtils.lerp(bottomZ, topZ, y / topY);
    line([-backX, y, z], [backX, y, z]);
    line([-backX, y, -0.2], [backX, y, -0.2]);
    for (const side of [-1, 1]) line([side * GOAL_HALF_WIDTH, y, 0], [side * backX, y, z]);
  }
  for (let z = bottomZ; z < 0; z += grid) {
    const height = z < topZ ? topY * (bottomZ - z) / (bottomZ - topZ) : topY;
    for (const side of [-1, 1]) line([side * backX, baseY, z], [side * backX, Math.max(baseY, height), z]);
  }
  goal.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(net), new THREE.LineBasicMaterial({ color: 0xe7e6da, transparent: true, opacity: 0.7 })));
  return goal;
}

export function createRink(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const context = canvas.getContext('2d')!;
  for (let x = 0; x < 512; x += 64) {
    context.fillStyle = x % 128 ? '#c7c1ac' : '#cdc7b3';
    context.fillRect(x, 0, 64, 512);
    context.strokeStyle = '#b4ad96';
    context.beginPath(); context.moveTo(x, 0); context.lineTo(x, 512);
    context.moveTo(x, x % 128 ? 150 : 350); context.lineTo(x + 64, x % 128 ? 150 : 350); context.stroke();
  }
  let seed = 43;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 6000; i++) {
    const x = random() * 512; const y = random() * 512;
    context.strokeStyle = random() > 0.5 ? '#81785f10' : '#fff8df18';
    context.beginPath(); context.moveTo(x, y); context.lineTo(x + (random() - 0.5) * 1.6, y + random() * 30); context.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(0.6, 0.35);
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const courtGeometry = new THREE.ExtrudeGeometry(roundedRinkShape(), { depth: 0.12, bevelEnabled: false, curveSegments: 48 });
  courtGeometry.rotateX(-Math.PI / 2);
  const court = new THREE.Mesh(courtGeometry, new THREE.MeshPhysicalMaterial({ map: texture, roughness: 0.38, clearcoat: 0.3, clearcoatRoughness: 0.32 }));
  court.position.y = -0.12;
  court.receiveShadow = true;
  scene.add(court);
  const board = new THREE.Mesh(boardGeometry(), new THREE.MeshStandardMaterial({ color: 0xdfe3df, roughness: 0.6 }));
  board.castShadow = board.receiveShadow = true;
  scene.add(board);
  const rail = new THREE.Mesh(boardGeometry(0.025), new THREE.MeshStandardMaterial({ color: 0x365764, roughness: 0.65 }));
  rail.position.y = RINK.boardHeight - 0.025;
  scene.add(rail);
  const joints: THREE.Vector3[] = [];
  for (const point of roundedRinkShape().getSpacedPoints(60)) {
    joints.push(new THREE.Vector3(point.x * 1.0001, 0.02, -point.y * 1.0001), new THREE.Vector3(point.x * 1.0001, RINK.boardHeight - 0.025, -point.y * 1.0001));
  }
  scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(joints), new THREE.LineBasicMaterial({ color: 0x708481, transparent: true, opacity: 0.25 })));
  const paint = new THREE.MeshBasicMaterial({ color: 0xeee7d2 });
  function floorLine(x1: number, z1: number, x2: number, z2: number, material = paint) {
    const length = Math.hypot(x2 - x1, z2 - z1);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(RINK.lineWidth, 0.003, length), material);
    mesh.position.set((x1 + x2) / 2, 0.003, (z1 + z2) / 2);
    mesh.rotation.y = Math.atan2(x2 - x1, z2 - z1);
    scene.add(mesh);
  }
  function rectangle(width: number, length: number, z: number, material = paint) {
    const x = width / 2 - RINK.lineWidth / 2;
    const back = z - length / 2 + RINK.lineWidth / 2;
    const front = z + length / 2 - RINK.lineWidth / 2;
    floorLine(-x, back, x, back, material); floorLine(x, back, x, front, material);
    floorLine(x, front, -x, front, material); floorLine(-x, front, -x, back, material);
  }
  function dot(x: number, z: number, radius: number) {
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(radius, 24), paint);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.005, z);
    scene.add(mesh);
  }
  // Extra hallinjer inspirerade av fotona, under innebandyns målmarkeringar.
  const redPaint = new THREE.MeshBasicMaterial({ color: 0xb45b4c });
  const darkPaint = new THREE.MeshBasicMaterial({ color: 0x454a43 });
  const yellowPaint = new THREE.MeshBasicMaterial({ color: 0xddc651 });
  rectangle(15, 28, 0, darkPaint);
  rectangle(18, 36, 0, redPaint);
  for (const z of [-10, 10]) rectangle(12, 6, z);
  const centerCircle = new THREE.Mesh(new THREE.RingGeometry(1.775, 1.825, 96), redPaint);
  centerCircle.rotation.x = -Math.PI / 2;
  centerCircle.position.y = 0.003;
  scene.add(centerCircle);
  floorLine(-RINK.width / 2, 0, RINK.width / 2, 0, yellowPaint);
  dot(0, 0, 0.05);
  for (const z of [GOAL_Z, 0, -GOAL_Z]) for (const side of [-1, 1]) dot(side * (RINK.width / 2 - 1.5), z, 0.1);
  for (const side of [-1, 1]) {
    const rear = RINK.length / 2 - RINK.creaseRearFromEnd;
    rectangle(RINK.creaseWidth, RINK.creaseLength, side * (rear - RINK.creaseLength / 2));
    rectangle(RINK.keeperAreaWidth, RINK.keeperAreaLength, side * (-GOAL_Z - RINK.keeperAreaLength / 2));
    const goal = createGoal();
    goal.position.z = side * -GOAL_Z;
    goal.rotation.y = side > 0 ? Math.PI : 0;
    scene.add(goal);
  }
}
