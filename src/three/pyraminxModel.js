// 3D Pyraminx (Tetrahedron) Three.js Model and Smooth 120° Vertex Layer Animator
import * as THREE from 'three';

export const PYRAMINX_HEX = {
  F: '#22C55E', // Green (Front)
  G: '#22C55E', // Green
  R: '#EF4444', // Red
  L: '#EF4444', // Red (Left Face)
  B: '#3B82F6', // Blue (Right Face)
  D: '#EAB308', // Yellow (Bottom Face)
  Y: '#EAB308'  // Yellow
};

const BODY_COLOR = '#11141E';

export class PyraminxModel {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.pieces = [];

    // Pre-create materials
    this.bodyMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(BODY_COLOR),
      roughness: 0.65,
      metalness: 0.15
    });

    this.colorMaterials = {};
    for (const [key, hex] of Object.entries(PYRAMINX_HEX)) {
      this.colorMaterials[key] = new THREE.MeshStandardMaterial({
        color: new THREE.Color(hex),
        roughness: 0.25,
        metalness: 0.1
      });
    }

    // 4 Tetrahedron Vertices in 3D:
    // U (Top), L (Left), R (Right), B (Back)
    this.V_U = new THREE.Vector3(0, 1.91, 0);
    this.V_L = new THREE.Vector3(-1.56, -0.635, 0.90);
    this.V_R = new THREE.Vector3(1.56, -0.635, 0.90);
    this.V_B = new THREE.Vector3(0, -0.635, -1.80);

    this.vertexPositions = {
      U: this.V_U,
      L: this.V_L,
      R: this.V_R,
      B: this.V_B
    };

    this.buildPyraminx();
  }

  // Helper to interpolate points on triangle
  barycentric(A, B, C, u, v, w) {
    return new THREE.Vector3(
      u * A.x + v * B.x + w * C.x,
      u * A.y + v * B.y + w * C.y,
      u * A.z + v * B.z + w * C.z
    );
  }

  // Create a triangular sticker facet centered at its local center
  createTriangleMesh(p1, p2, p3, center, material) {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array([
      p1.x - center.x, p1.y - center.y, p1.z - center.z,
      p2.x - center.x, p2.y - center.y, p2.z - center.z,
      p3.x - center.x, p3.y - center.y, p3.z - center.z
    ]);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, material);
    mesh.position.copy(center);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  buildPyraminx(faceColors = null) {
    // Clear existing
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      if (child.geometry) child.geometry.dispose();
      this.group.remove(child);
    }
    this.pieces = [];

    // 4 Triangular Faces definitions:
    // Each face is defined by 3 vertices [Top, BottomLeft, BottomRight]
    const faceDefs = [
      { key: 'F', v: [this.V_U, this.V_L, this.V_R], defaultColor: 'F' }, // Front (Green)
      { key: 'L', v: [this.V_U, this.V_B, this.V_L], defaultColor: 'R' }, // Left (Red)
      { key: 'R', v: [this.V_U, this.V_R, this.V_B], defaultColor: 'B' }, // Right (Blue)
      { key: 'D', v: [this.V_B, this.V_L, this.V_R], defaultColor: 'D' }  // Bottom (Yellow)
    ];

    // Build solid dark inner core aligned with our 4 tetrahedron faces for depth
    const coreScale = 0.97;
    faceDefs.forEach(def => {
      const [v1, v2, v3] = def.v;
      const cp1 = v1.clone().multiplyScalar(coreScale);
      const cp2 = v2.clone().multiplyScalar(coreScale);
      const cp3 = v3.clone().multiplyScalar(coreScale);
      const coreCenter = new THREE.Vector3().add(cp1).add(cp2).add(cp3).divideScalar(3);
      const coreMesh = this.createTriangleMesh(cp1, cp2, cp3, coreCenter, this.bodyMaterial);
      this.group.add(coreMesh);
    });

    // For each face, generate 9 smaller equilateral triangles
    faceDefs.forEach(faceDef => {
      const [topV, leftV, rightV] = faceDef.v;
      const faceStickers = (faceColors && faceColors[faceDef.key]) || Array(9).fill(faceDef.defaultColor);

      // Normal to face
      const edge1 = new THREE.Vector3().subVectors(leftV, topV);
      const edge2 = new THREE.Vector3().subVectors(rightV, topV);
      const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();
      const faceOffset = normal.clone().multiplyScalar(0.015); // slight raise for sticker facet

      // Grid of 9 triangles:
      // Row 0: 1 triangle (pointing down in coordinates)
      // Row 1: 3 triangles
      // Row 2: 5 triangles
      let tileIdx = 0;
      for (let row = 0; row < 3; row++) {
        const count = 2 * row + 1;
        for (let col = 0; col < count; col++) {
          const isUpright = col % 2 === 0;

          let p1, p2, p3;
          if (isUpright) {
            const k = col / 2;
            // Upright triangle
            p1 = this.barycentric(topV, leftV, rightV, (3 - row) / 3, (row - k) / 3, k / 3);
            p2 = this.barycentric(topV, leftV, rightV, (2 - row) / 3, (row - k + 1) / 3, k / 3);
            p3 = this.barycentric(topV, leftV, rightV, (2 - row) / 3, (row - k) / 3, (k + 1) / 3);
          } else {
            const k = (col - 1) / 2;
            // Inverted triangle
            p1 = this.barycentric(topV, leftV, rightV, (2 - row) / 3, (row - k) / 3, (k + 1) / 3);
            p2 = this.barycentric(topV, leftV, rightV, (3 - row) / 3, (row - k) / 3, k / 3);
            p3 = this.barycentric(topV, leftV, rightV, (3 - row) / 3, (row - k - 1) / 3, (k + 1) / 3);
          }

          // Shrink slightly to create black border gap between stickers
          const center = new THREE.Vector3().add(p1).add(p2).add(p3).divideScalar(3);
          const inset = 0.90;
          const sp1 = center.clone().lerp(p1, inset).add(faceOffset);
          const sp2 = center.clone().lerp(p2, inset).add(faceOffset);
          const sp3 = center.clone().lerp(p3, inset).add(faceOffset);

          const colorKey = faceStickers[tileIdx] || faceDef.defaultColor;
          const mat = this.colorMaterials[colorKey] || this.bodyMaterial;

          const triMesh = this.createTriangleMesh(sp1, sp2, sp3, center, mat);
          triMesh.userData = {
            faceKey: faceDef.key,
            tileIndex: tileIdx,
            centerPos: center.clone()
          };

          this.group.add(triMesh);
          this.pieces.push(triMesh);
          tileIdx++;
        }
      }
    });
  }

  // Get rotation axis and center for vertex turn: U, L, R, B
  getVertexTurnInfo(faceKey) {
    const v = this.vertexPositions[faceKey] || this.V_U;
    const axis = v.clone().normalize();
    return { axis, origin: v };
  }

  // Filter pieces belonging to the rotating layer
  getLayerPieces(faceKey, isTipOnly = false) {
    const localVertex = this.vertexPositions[faceKey] || this.V_U;
    const worldVertex = localVertex.clone().applyMatrix4(this.group.matrixWorld);
    // Tip threshold is 0.75 (captures only the 3 tip stickers). Body threshold is 1.70 (captures tip + middle layer = 12 stickers).
    const threshold = isTipOnly ? 0.75 : 1.70;

    return this.pieces.filter(p => {
      const pos = new THREE.Vector3();
      p.getWorldPosition(pos);
      const dist = pos.distanceTo(worldVertex);
      return dist <= threshold;
    });
  }

  // Animate a 120° vertex turn
  animateMove(moveObj, isReverse = false, duration = 380) {
    const { face, isTip, modifier } = moveObj;
    const { axis } = this.getVertexTurnInfo(face);

    let angle = -(2 * Math.PI) / 3; // 120° clockwise looking from vertex
    if (modifier === "'") angle = -angle;
    if (isReverse) angle = -angle;

    const layerPieces = this.getLayerPieces(face, Boolean(isTip));

    const pivot = new THREE.Group();
    this.group.add(pivot);

    layerPieces.forEach(p => pivot.attach(p));

    return new Promise((resolve) => {
      const startTime = performance.now();
      let currentAngle = 0;

      const animate = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(1.0, elapsed / duration);

        const ease = progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        const targetDelta = angle * ease;
        const deltaToRotate = targetDelta - currentAngle;
        currentAngle = targetDelta;

        pivot.rotateOnAxis(axis, deltaToRotate);

        if (progress < 1.0) {
          requestAnimationFrame(animate);
        } else {
          // Finish turn
          const rem = angle - currentAngle;
          if (Math.abs(rem) > 0.0001) {
            pivot.rotateOnAxis(axis, rem);
          }

          layerPieces.forEach(p => {
            this.group.attach(p);
            p.updateMatrix();
          });

          this.group.remove(pivot);
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  }
}

