// Interactive 3D Three.js Scene Manager for 3x3 Cube & Pyraminx
import * as THREE from 'three';
import { CubeModel } from './cubeModel.js';
import { LayerAnimator } from './layerAnimator.js';
import { PyraminxModel } from './pyraminxModel.js';
import { ArrowOverlay } from './arrowOverlay.js';

export class CubeScene {
  constructor(containerElement) {
    this.container = containerElement || null;
    this.width = (this.container && this.container.clientWidth) || 360;
    this.height = (this.container && this.container.clientHeight) || 360;
    this.puzzleType = 'cube3x3'; // 'cube3x3' or 'pyraminx'

    // Scene
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(40, this.width / this.height, 0.1, 100);
    this.defaultCamPos = new THREE.Vector3(5.2, 4.4, 6.4);
    this.camera.position.copy(this.defaultCamPos);
    this.camera.lookAt(0, 0, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.width, this.height, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.display = 'block';
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    if (this.container) {
      this.container.appendChild(this.renderer.domElement);
    }

    // Lighting
    this.setupLighting();

    // Root Group for user drag interaction
    this.interactionGroup = new THREE.Group();
    this.scene.add(this.interactionGroup);

    // 3x3 Cube Model & Animator
    this.cubeModel = new CubeModel(this.scene);
    this.animator = new LayerAnimator(this.cubeModel, this.scene);
    this.interactionGroup.add(this.cubeModel.cubeGroup);

    // Pyraminx Model
    this.pyraminxModel = new PyraminxModel(this.scene);
    this.pyraminxModel.group.visible = false;
    this.interactionGroup.add(this.pyraminxModel.group);

    // 3D Directional Arrow Overlay
    this.arrowOverlay = new ArrowOverlay(this.interactionGroup);

    // Touch & Mouse Drag Rotation Interaction
    this.setupInteraction();

    // Resize Observer
    this.setupResize();

    // Render loop
    this.isRunning = true;
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  setPuzzleType(type) {
    this.puzzleType = type;
    this.arrowOverlay.clear();
    this.resetView();

    if (type === 'pyraminx') {
      this.cubeModel.cubeGroup.visible = false;
      this.pyraminxModel.group.visible = true;
    } else {
      this.cubeModel.cubeGroup.visible = true;
      this.pyraminxModel.group.visible = false;
    }
  }

  mountTo(newContainer) {
    if (!newContainer) return;
    this.container = newContainer;

    const dom = this.renderer.domElement;
    dom.style.width = '100%';
    dom.style.height = '100%';
    dom.style.display = 'block';

    if (!newContainer.contains(dom)) {
      newContainer.innerHTML = '';
      newContainer.appendChild(dom);
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver.observe(newContainer);
    }

    this.updateSize();
    requestAnimationFrame(() => this.updateSize());
    setTimeout(() => this.updateSize(), 60);
    setTimeout(() => this.updateSize(), 180);
  }

  updateSize() {
    if (!this.container) return;
    const rect = this.container.getBoundingClientRect();
    const w = Math.floor(rect.width || this.container.clientWidth || 320);
    const h = Math.floor(rect.height || this.container.clientHeight || 260);

    if (w > 0 && h > 0) {
      this.width = w;
      this.height = h;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h, false);
      this.adjustCameraDistance();
    }
  }

  adjustCameraDistance() {
    const isPyraminx = this.puzzleType === 'pyraminx';
    const aspect = this.width / this.height;

    if (isPyraminx) {
      // Natural human-holding view: Green in front, Yellow at base, Top vertex up.
      // Generous distance scale ensures tip vertices and curved arrows never clip on any screen.
      const distScale = aspect < 1.0 ? Math.min(2.8, 2.2 / aspect) : 1.9;
      this.defaultCamPos.set(0.3 * distScale, 0.8 * distScale, 8.0 * distScale);
      this.camera.position.copy(this.defaultCamPos);
      this.camera.lookAt(0, 0.35, 0);
    } else {
      // 3x3 Cube standard isometric view scaled for ample margins and full arrow visibility
      const distScale = aspect < 1.0 ? Math.min(2.6, 2.0 / aspect) : 1.75;
      this.defaultCamPos.set(5.2 * distScale, 4.2 * distScale, 6.6 * distScale);
      this.camera.position.copy(this.defaultCamPos);
      this.camera.lookAt(0, 0, 0);
    }
  }

  setupResize() {
    this.resizeObserver = new ResizeObserver(() => {
      this.updateSize();
    });
    if (this.container) {
      this.resizeObserver.observe(this.container);
    }
  }

  resetView() {
    this.interactionGroup.rotation.set(0, 0, 0);
    this.adjustCameraDistance();
  }

  setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    this.scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(6, 9, 7);
    keyLight.castShadow = true;
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.6);
    fillLight.position.set(-6, -4, -6);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.5);
    rimLight.position.set(0, -8, 5);
    this.scene.add(rimLight);
  }

  setupInteraction() {
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const onPointerDown = (e) => {
      isDragging = true;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      prevMouseX = clientX;
      prevMouseY = clientY;
    };

    const onPointerMove = (e) => {
      if (!isDragging) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      const deltaX = clientX - prevMouseX;
      const deltaY = clientY - prevMouseY;
      prevMouseX = clientX;
      prevMouseY = clientY;

      const rotSpeed = 0.007;
      this.interactionGroup.rotation.y += deltaX * rotSpeed;
      this.interactionGroup.rotation.x += deltaY * rotSpeed;
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const dom = this.renderer.domElement;
    dom.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    dom.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('touchend', onPointerUp);
  }



  loadCubeState(stateData) {
    this.arrowOverlay.clear();
    this.resetView();

    if (this.puzzleType === 'pyraminx') {
      this.pyraminxModel.buildPyraminx(stateData);
    } else {
      this.cubeModel.resetCube(typeof stateData === 'string' ? stateData : null);
    }
  }

  showMove(moveObj) {
    this.arrowOverlay.showMoveArrow(moveObj, this.puzzleType);
  }

  clearArrow() {
    this.arrowOverlay.clear();
  }

  async applyMove(moveObj, isReverse = false, duration = 380) {
    if (this.puzzleType === 'pyraminx') {
      return await this.pyraminxModel.animateMove(moveObj, isReverse, duration);
    } else {
      return await this.animator.animateMove(moveObj, isReverse, duration);
    }
  }

  animate() {
    if (!this.isRunning) return;
    requestAnimationFrame(this.animate);

    this.arrowOverlay.updatePulse();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.isRunning = false;
    if (this.resizeObserver) this.resizeObserver.disconnect();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
