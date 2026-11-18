// Smooth Layer Rotation Animator for Three.js Rubik's Cube
import * as THREE from 'three';

export class LayerAnimator {
  constructor(cubeModel, scene) {
    this.cubeModel = cubeModel;
    this.scene = scene;
    this.isAnimating = false;
  }

  // Get rotation axis and target angle for a standard move
  getMoveRotation(face, modifier, isReverse = false) {
    let axis = new THREE.Vector3();
    let baseAngle = -Math.PI / 2; // Default clockwise angle

    switch (face) {
      case 'U': // Top
        axis.set(0, 1, 0);
        baseAngle = -Math.PI / 2;
        break;
      case 'D': // Bottom
        axis.set(0, 1, 0);
        baseAngle = Math.PI / 2;
        break;
      case 'R': // Right
        axis.set(1, 0, 0);
        baseAngle = -Math.PI / 2;
        break;
      case 'L': // Left
        axis.set(1, 0, 0);
        baseAngle = Math.PI / 2;
        break;
      case 'F': // Front
        axis.set(0, 0, 1);
        baseAngle = -Math.PI / 2;
        break;
      case 'B': // Back
        axis.set(0, 0, 1);
        baseAngle = Math.PI / 2;
        break;
      default:
        axis.set(0, 1, 0);
    }

    let angle = baseAngle;
    if (modifier === '2') {
      angle = baseAngle * 2;
    } else if (modifier === "'") {
      angle = -baseAngle;
    }

    if (isReverse) {
      angle = -angle;
    }

    return { axis, angle };
  }

  // Filter cubies belonging to the target face layer
  getLayerCubies(face) {
    const threshold = 0.45;
    return this.cubeModel.cubies.filter(cubie => {
      const pos = new THREE.Vector3();
      cubie.getWorldPosition(pos);

      switch (face) {
        case 'U': return pos.y > threshold;
        case 'D': return pos.y < -threshold;
        case 'R': return pos.x > threshold;
        case 'L': return pos.x < -threshold;
        case 'F': return pos.z > threshold;
        case 'B': return pos.z < -threshold;
        default: return false;
      }
    });
  }

  // Animate a single move
  animateMove(moveObj, isReverse = false, duration = 380) {
    if (this.isAnimating || !moveObj) return Promise.resolve();
    this.isAnimating = true;

    const { face, modifier } = moveObj;
    const { axis, angle } = this.getMoveRotation(face, modifier, isReverse);
    const layerCubies = this.getLayerCubies(face);

    const pivot = new THREE.Group();
    this.scene.add(pivot);

    // Attach cubies to pivot
    layerCubies.forEach(cubie => {
      pivot.attach(cubie);
    });

    return new Promise((resolve) => {
      const startTime = performance.now();
      let currentAngle = 0;

      const animate = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(1.0, elapsed / duration);

        // Smooth cubic easing (ease-in-out)
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
          // Snap final angle exactly
          const remaining = angle - currentAngle;
          if (Math.abs(remaining) > 0.0001) {
            pivot.rotateOnAxis(axis, remaining);
          }

          // Re-attach cubies to main cubeGroup and clean up
          layerCubies.forEach(cubie => {
            this.cubeModel.cubeGroup.attach(cubie);

            // Snap position to exact integers to eliminate floating point drift
            cubie.position.x = Math.round(cubie.position.x);
            cubie.position.y = Math.round(cubie.position.y);
            cubie.position.z = Math.round(cubie.position.z);

            // Snap rotation quaternions to orthogonal matrix
            cubie.rotation.x = Math.round(cubie.rotation.x / (Math.PI / 2)) * (Math.PI / 2);
            cubie.rotation.y = Math.round(cubie.rotation.y / (Math.PI / 2)) * (Math.PI / 2);
            cubie.rotation.z = Math.round(cubie.rotation.z / (Math.PI / 2)) * (Math.PI / 2);
            cubie.updateMatrix();
          });

          this.scene.remove(pivot);
          this.isAnimating = false;
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  }
}

