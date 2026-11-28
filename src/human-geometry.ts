import * as THREE from 'three';

type Section = [height: number, halfWidth: number, halfDepth: number, centerZ?: number];
const surfaces = new Map<string, THREE.BufferGeometry>();

// Sammanhängande ytor med ovala tvärsnitt, i stället för staplade klot.
export function bodySurface(sections: Section[], segments = 32) {
  const key = JSON.stringify([sections, segments]);
  if (surfaces.has(key)) return surfaces.get(key)!;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  sections.forEach(([y, width, depth, z = 0], row) => {
    for (let side = 0; side <= segments; side++) {
      const angle = side / segments * Math.PI * 2;
      positions.push(Math.sin(angle) * width, y, Math.cos(angle) * depth + z);
      uvs.push(side / segments, row / (sections.length - 1));
      if (row && side) {
        const a = row * (segments + 1) + side;
        indices.push(a, a - 1, a - segments - 1, a - 1, a - segments - 2, a - segments - 1);
      }
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.userData.batchKey = key;
  surfaces.set(key, geometry);
  return geometry;
}

// Radierna varierar längs muskeln: smal handled/ankel och fylligare överarm/vad.
export function limbSurface(length: number, radii: [number, number][]) {
  return bodySurface([[0, 0.001, 0.001], ...radii.map(([t, r]): Section => [t * length, r, r * 0.88]), [length, 0.001, 0.001]], 20);
}

export const headSurface = () => bodySurface([
  [1.594, 0.018, 0.025, -0.028], [1.61, 0.05, 0.053, -0.012],
  [1.635, 0.068, 0.067, -0.004], [1.67, 0.079, 0.079],
  [1.705, 0.083, 0.086], [1.74, 0.081, 0.087, 0.004],
  [1.78, 0.074, 0.078, 0.006], [1.81, 0.055, 0.058, 0.006],
  [1.826, 0.001, 0.001, 0.006],
], 40);
