// 3D Rubik's Cube Model in Three.js
import * as THREE from 'three';

export const HEX_COLORS = {
  U: '#FFFFFF', // White
  R: '#EF4444', // Red
  F: '#22C55E', // Green
  D: '#EAB308', // Yellow
  L: '#F97316', // Orange
  B: '#3B82F6'  // Blue
};

const BLACK_COLOR = '#11141E';

export class CubeModel {
  constructor(scene) {
    this.scene = scene;
    this.cubeGroup = new THREE.Group();
    this.scene.add(this.cubeGroup);
    this.cubies = [];

    // Pre-create reusable materials
    this.blackMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(BLACK_COLOR),
      roughness: 0.65,
      metalness: 0.15
    });

    this.colorMaterials = {};
    for (const [key, hex] of Object.entries(HEX_COLORS)) {
      this.colorMaterials[key] = new THREE.MeshStandardMaterial({
        color: new THREE.Color(hex),
        roughness: 0.25,
        metalness: 0.1
      });
    }

    this.buildCube('UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB');
  }

  // Get facelet color key for a specific cubie coordinate and face direction
  getFaceletKey(x, y, z, faceDir, faceletString) {
    // faceDir: '+X', '-X', '+Y', '-Y', '+Z', '-Z'
    // Default to face color if no string
    if (!faceletString || faceletString.length !== 54) {
      if (faceDir === '+Y') return 'U';
      if (faceDir === '-Y') return 'D';
      if (faceDir === '+X') return 'R';
      if (faceDir === '-X') return 'L';
      if (faceDir === '+Z') return 'F';
      if (faceDir === '-Z') return 'B';
      return null;
    }

    // Top (+Y, U)
    if (faceDir === '+Y' && y === 1) {
      const col = x + 1; // 0, 1, 2
      const row = z + 1; // 0, 1, 2
      const idx = row * 3 + col;
      return faceletString[idx];
    }

    // Right (+X, R)
    if (faceDir === '+X' && x === 1) {
      const row = 1 - y; // y=1 -> 0, y=0 -> 1, y=-1 -> 2
      const col = 1 - z; // z=1 (F) -> 0, z=0 -> 1, z=-1 (B) -> 2
      const idx = 9 + row * 3 + col;
      return faceletString[idx];
    }

    // Front (+Z, F)
    if (faceDir === '+Z' && z === 1) {
      const row = 1 - y; // y=1 -> 0, y=0 -> 1, y=-1 -> 2
      const col = x + 1; // x=-1 -> 0, x=0 -> 1, x=1 -> 2
      const idx = 18 + row * 3 + col;
      return faceletString[idx];
    }

    // Down (-Y, D)
    if (faceDir === '-Y' && y === -1) {
      const row = 1 - z; // z=1 (F) -> 0, z=0 -> 1, z=-1 (B) -> 2
      const col = x + 1; // x=-1 -> 0, x=0 -> 1, x=1 -> 2
      const idx = 27 + row * 3 + col;
      return faceletString[idx];
    }

    // Left (-X, L)
    if (faceDir === '-X' && x === -1) {
      const row = 1 - y; // y=1 -> 0, y=0 -> 1, y=-1 -> 2
      const col = z + 1; // z=-1 (B) -> 0, z=0 -> 1, z=1 (F) -> 2
      const idx = 36 + row * 3 + col;
      return faceletString[idx];
    }

    // Back (-Z, B)
    if (faceDir === '-Z' && z === -1) {
      const row = 1 - y; // y=1 -> 0, y=0 -> 1, y=-1 -> 2
      const col = 1 - x; // x=1 (R) -> 0, x=0 -> 1, x=-1 (L) -> 2
      const idx = 45 + row * 3 + col;
      return faceletString[idx];
    }

    return null;
  }

  buildCube(faceletString) {
    // Clear existing cubies
    while (this.cubeGroup.children.length > 0) {
      const child = this.cubeGroup.children[0];
      if (child.geometry) child.geometry.dispose();
      this.cubeGroup.remove(child);
    }
    this.cubies = [];

    const cubieSize = 0.94;
    const geometry = new THREE.BoxGeometry(cubieSize, cubieSize, cubieSize);

    // Build 27 cubies
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          // Skip internal center cubie (not visible)
          if (x === 0 && y === 0 && z === 0) continue;

          // Box materials order: [+X, -X, +Y, -Y, +Z, -Z]
          // Index 0: +X (Right)
          // Index 1: -X (Left)
          // Index 2: +Y (Top)
          // Index 3: -Y (Bottom)
          // Index 4: +Z (Front)
          // Index 5: -Z (Back)
          const materials = [
            x === 1 ? this.getMaterial(this.getFaceletKey(x, y, z, '+X', faceletString)) : this.blackMaterial,
            x === -1 ? this.getMaterial(this.getFaceletKey(x, y, z, '-X', faceletString)) : this.blackMaterial,
            y === 1 ? this.getMaterial(this.getFaceletKey(x, y, z, '+Y', faceletString)) : this.blackMaterial,
            y === -1 ? this.getMaterial(this.getFaceletKey(x, y, z, '-Y', faceletString)) : this.blackMaterial,
            z === 1 ? this.getMaterial(this.getFaceletKey(x, y, z, '+Z', faceletString)) : this.blackMaterial,
            z === -1 ? this.getMaterial(this.getFaceletKey(x, y, z, '-Z', faceletString)) : this.blackMaterial
          ];

          const cubie = new THREE.Mesh(geometry, materials);
          cubie.position.set(x, y, z);
          cubie.castShadow = true;
          cubie.receiveShadow = true;

          // Store initial and current grid coordinates
          cubie.userData = {
            gridX: x,
            gridY: y,
            gridZ: z
          };

          this.cubeGroup.add(cubie);
          this.cubies.push(cubie);
        }
      }
    }
  }

  getMaterial(faceKey) {
    if (!faceKey || !this.colorMaterials[faceKey]) {
      return this.blackMaterial;
    }
    return this.colorMaterials[faceKey];
  }

  resetCube(faceletString) {
    this.buildCube(faceletString);
  }
}

