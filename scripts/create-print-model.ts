import { mkdir, writeFile } from 'node:fs/promises';
import Module, { type Manifold as Solid } from 'manifold-3d';
import { playerParts, printBall, type Point } from '../src/player-model';

const wasm = await Module();
wasm.setup();
const { Manifold } = wasm;
const allocated: Solid[] = [];
const keep = (solid: Solid) => { allocated.push(solid); return solid; };
const sphere = (radius: number, position: Point) => keep(keep(Manifold.sphere(radius, 32)).translate(position));

try {
  const parts = playerParts.filter(part => !part.detail).map(part => {
    if (part.shape === 'box') return keep(keep(Manifold.cube(part.size!, true)).translate(part.position!));
    if (part.shape === 'sphere') {
      return keep(keep(keep(Manifold.sphere(1, 40)).scale(part.size!)).translate(part.position!));
    }
    return keep(Manifold.hull([sphere(part.radius!, part.from!), sphere(part.radius!, part.to!)]));
  });
  parts.push(sphere(printBall.radius, printBall.position));
  // The flat base overlaps both shoes, the blade and the ball.
  parts.push(keep(keep(Manifold.cube([1.95, 0.12, 1.75], true)).translate([0.35, -0.01, -0.27])));
  const union = keep(Manifold.union(parts));
  const scaled = keep(union.scale(50)); // STL coordinates are millimetres.
  const upright = keep(scaled.rotate([90, 0, 0])); // Convert Y-up to Z-up.
  const solid = keep(upright.translate([0, 0, -upright.boundingBox().min[2]]));
  if (solid.status() !== 'NoError' || solid.volume() <= 0) throw new Error('Figuren saknar en giltig, sluten volym.');
  const components = solid.decompose();
  allocated.push(...components);
  if (components.length !== 1) throw new Error(`Figuren består av ${components.length} lösa delar.`);

  const mesh = solid.getMesh();
  const triangleCount = mesh.triVerts.length / 3;
  const data = Buffer.alloc(84 + triangleCount * 50);
  data.write('Teos innebandyspelare - millimetres - flat base down', 0, 'ascii');
  data.writeUInt32LE(triangleCount, 80);
  const vertex = (index: number): Point => [0, 1, 2].map(axis => mesh.vertProperties[index * mesh.numProp + axis]) as Point;
  const edges = new Map<string, { count: number; direction: number }>();
  let signedVolume = 0;
  for (let triangle = 0; triangle < triangleCount; triangle++) {
    const indices = Array.from(mesh.triVerts.slice(triangle * 3, triangle * 3 + 3));
    const [a, b, c] = indices.map(vertex);
    const ab = b.map((value, axis) => value - a[axis]);
    const ac = c.map((value, axis) => value - a[axis]);
    const normal = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
    const length = Math.hypot(...normal);
    if (length <= 1e-12) throw new Error('Figuren innehåller en platt triangel.');
    const offset = 84 + triangle * 50;
    normal.forEach((value, axis) => data.writeFloatLE(value / length, offset + axis * 4));
    [a, b, c].flat().forEach((value, index) => data.writeFloatLE(value, offset + 12 + index * 4));
    signedVolume += (a[0] * (b[1] * c[2] - b[2] * c[1]) + a[1] * (b[2] * c[0] - b[0] * c[2]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
    for (let side = 0; side < 3; side++) {
      const first = indices[side];
      const second = indices[(side + 1) % 3];
      const key = `${Math.min(first, second)}:${Math.max(first, second)}`;
      const edge = edges.get(key) ?? { count: 0, direction: 0 };
      edge.count += 1;
      edge.direction += first < second ? 1 : -1;
      edges.set(key, edge);
    }
  }
  if ([...edges.values()].some(edge => edge.count !== 2 || edge.direction !== 0) || signedVolume <= 0) {
    throw new Error('Figurens yta har ett hål eller felvända trianglar.');
  }
  const bounds = solid.boundingBox();
  const sizeMm = bounds.max.map((value, axis) => Number((value - bounds.min[axis]).toFixed(2)));
  await mkdir('public/models', { recursive: true });
  await writeFile('public/models/teos-innebandyspelare.stl', data);
  await writeFile('public/models/teos-innebandyspelare.json', JSON.stringify({
    unit: 'mm', sizeMm, triangles: triangleCount, connectedParts: components.length,
    closedSurface: true, outwardNormals: true, volumeMm3: Number(signedVolume.toFixed(2)),
    stickDiameterMm: 3.5, orientation: 'Foten nedåt', supports: 'Under armar, händer och klubba',
    physicallyTestPrinted: false,
  }, null, 2) + '\n');
  console.log(`STL skapad: ${sizeMm.join(' × ')} mm, ${triangleCount} trianglar. En sammanhängande, sluten volym.`);
} finally {
  for (const solid of allocated.reverse()) solid.delete();
}
