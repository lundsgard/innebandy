import * as THREE from 'three';
import type { PlayerFigure } from './player-figure';

// Lagens likadana kroppsdelar ritas tillsammans för att hålla matchen lättare att köra.
export function batchPlayers(scene: THREE.Scene, figures: PlayerFigure[]) {
  const groups = new Map<string, THREE.Mesh[]>();
  for (const figure of figures) figure.root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    const geometry = object.geometry as THREE.BufferGeometry & { parameters?: unknown };
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    const key = `${geometry.type}:${geometry.userData.batchKey ?? (geometry.parameters ? JSON.stringify(geometry.parameters) : geometry.uuid)}:${materials.map(material => material.uuid).join(',')}`;
    const group = groups.get(key) ?? [];
    group.push(object);
    groups.set(key, group);
    object.visible = false;
  });
  const batches = [...groups.values()].map(sources => {
    const first = sources[0];
    const mesh = new THREE.InstancedMesh(first.geometry, first.material, sources.length);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.castShadow = first.castShadow;
    mesh.receiveShadow = first.receiveShadow;
    mesh.frustumCulled = false;
    scene.add(mesh);
    return { mesh, sources };
  });
  return () => {
    figures.forEach(figure => figure.root.updateMatrixWorld(true));
    batches.forEach(({ mesh, sources }) => {
      sources.forEach((source, index) => mesh.setMatrixAt(index, source.matrixWorld));
      mesh.instanceMatrix.needsUpdate = true;
    });
  };
}
