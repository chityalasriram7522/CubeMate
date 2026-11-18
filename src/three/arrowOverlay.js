// 3D Curved Directional Arrows for 3x3 Cube & Pyraminx in Three.js
import * as THREE from 'three';

export class ArrowOverlay {
  constructor(parent) {
    this.parent = parent;
    this.arrowGroup = new THREE.Group();
    this.parent.add(this.arrowGroup);

    this.pulsePhase = 0;
    this.material = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.85,
      roughness: 0.2,
      metalness: 0.3
    });
  }

  clear() {
    while (this.arrowGroup.children.length > 0) {
      const child = this.arrowGroup.children[0];
      if (child.geometry) child.geometry.dispose();
      this.arrowGroup.remove(child);
    }
  }

  showMoveArrow(moveObj, puzzleType = 'cube3x3') {
    this.clear();
    if (!moveObj || !moveObj.face) return;

    const { face, modifier, isTip } = moveObj;
    const isDouble = modifier === '2';
    const isCounter = modifier === "'";
    const isTipMove = Boolean(isTip);

    const radius = puzzleType === 'pyraminx' ? (isTipMove ? 0.65 : 1.0) : 1.45;
    const arcAngle = puzzleType === 'pyraminx'
      ? (2 * Math.PI) / 3 * 0.85
      : (isDouble ? Math.PI : Math.PI * 0.55);

    const segments = 32;
    const tubeRadius = puzzleType === 'pyraminx' ? 0.065 : 0.085;

    // Build curved arc curve in local 2D plane
    const points = [];
    const dir = isCounter ? 1 : -1;
    const startAngle = isDouble ? -arcAngle / 2 : (dir > 0 ? -arcAngle * 0.5 : arcAngle * 0.5);

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = startAngle + t * arcAngle * dir;
      points.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0));
    }

    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeo = new THREE.TubeGeometry(curve, 32, tubeRadius, 12, false);
    const tubeMesh = new THREE.Mesh(tubeGeo, this.material);

    // Create Arrow Head at end of curve
    const endPoint = points[points.length - 1];
    const prevPoint = points[points.length - 2];
    const tangent = new THREE.Vector3().subVectors(endPoint, prevPoint).normalize();

    const coneRadius = puzzleType === 'pyraminx' ? 0.16 : 0.20;
    const coneHeight = puzzleType === 'pyraminx' ? 0.35 : 0.42;
    const coneGeo = new THREE.ConeGeometry(coneRadius, coneHeight, 16);
    coneGeo.translate(0, coneHeight / 2, 0); // shift pivot to base
    const coneMesh = new THREE.Mesh(coneGeo, this.material);

    coneMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
    coneMesh.position.copy(endPoint);

    const subGroup = new THREE.Group();
    subGroup.add(tubeMesh);
    subGroup.add(coneMesh);

    if (isDouble) {
      const coneGeo2 = new THREE.ConeGeometry(coneRadius, coneHeight, 16);
      coneGeo2.translate(0, coneHeight / 2, 0);
      const coneMesh2 = new THREE.Mesh(coneGeo2, this.material);
      const tangent2 = new THREE.Vector3().subVectors(points[0], points[1]).normalize();
      coneMesh2.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent2);
      coneMesh2.position.copy(points[0]);
      subGroup.add(coneMesh2);
    }

    if (puzzleType === 'pyraminx') {
      // Pyraminx vertices matching pyraminxModel.js exactly
      const vMap = {
        U: new THREE.Vector3(0, 1.91, 0),
        L: new THREE.Vector3(-1.56, -0.635, 0.90),
        R: new THREE.Vector3(1.56, -0.635, 0.90),
        B: new THREE.Vector3(0, -0.635, -1.80)
      };
      const baseV = vMap[face] || vMap.U;
      const normal = baseV.clone().normalize();
      const targetPos = isTipMove ? baseV.clone().multiplyScalar(1.02) : baseV.clone().multiplyScalar(0.72);
      subGroup.position.copy(targetPos);
      subGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    } else {
      // 3x3 Cube faces: U (+Y), D (-Y), R (+X), L (-X), F (+Z), B (-Z)
      const offsetDist = 1.68;
      switch (face) {
        case 'U':
          subGroup.position.set(0, offsetDist, 0);
          subGroup.rotation.x = Math.PI / 2;
          subGroup.rotation.z = Math.PI;
          break;
        case 'D':
          subGroup.position.set(0, -offsetDist, 0);
          subGroup.rotation.x = -Math.PI / 2;
          break;
        case 'R':
          subGroup.position.set(offsetDist, 0, 0);
          subGroup.rotation.y = Math.PI / 2;
          break;
        case 'L':
          subGroup.position.set(-offsetDist, 0, 0);
          subGroup.rotation.y = -Math.PI / 2;
          break;
        case 'F':
          subGroup.position.set(0, 0, offsetDist);
          break;
        case 'B':
          subGroup.position.set(0, 0, -offsetDist);
          subGroup.rotation.y = Math.PI;
          break;
      }
    }

    this.arrowGroup.add(subGroup);
  }

  updatePulse() {
    this.pulsePhase += 0.05;
    const factor = 0.7 + 0.3 * Math.sin(this.pulsePhase);
    this.material.emissiveIntensity = factor;
  }
}
