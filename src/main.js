// Main Application Orchestrator for MakeMeCubeMaster
import { AppState, SCAN_FACE_SEQUENCE } from './state/appState.js';
import { CameraManager } from './vision/camera.js';
import { AutoCaptureController } from './vision/autoCapture.js';
import { CubeScene } from './three/cubeScene.js';
import { CalibrationUI } from './ui/calibrationUI.js';
import { ScanningUI } from './ui/scanningUI.js';
import { SolutionUI } from './ui/solutionUI.js';
import { CompletionUI } from './ui/completionUI.js';
import { initSolver, solveCube, generateDemoCube } from './solver/kociemba.js';
import { validateCubeState, autoBalanceCubeFacelets } from './solver/cubeValidator.js';
import { solvePyraminx, generatePyraminxDemo, validatePyraminxFaces, autoBalancePyraminxFaces, buildPyraminxStateFromFaces } from './solver/pyraminxSolver.js';

class MakeMeCubeMasterApp {
  constructor() {
    this.appState = new AppState();

    // DOM Elements
    this.videoEl = document.getElementById('camera-feed');
    this.step1El = document.getElementById('step-1-container');
    this.step2El = document.getElementById('step-2-container');
    this.step3El = document.getElementById('step-3-container');
    this.completionModalEl = document.getElementById('completion-modal');
    this.computingModalEl = document.getElementById('computing-modal');
    this.fallbackEl = document.getElementById('camera-fallback');

    // Stepper elements
    this.stepper1 = document.getElementById('stepper-step-1');
    this.stepper2 = document.getElementById('stepper-step-2');
    this.stepper3 = document.getElementById('stepper-step-3');

    // Quick action buttons
    this.demoBtn = document.getElementById('btn-demo-cube');
    this.demoBtnLabel = document.getElementById('demo-btn-label');
    this.appSubtitle = document.getElementById('app-subtitle');
    this.flipCamBtn = document.getElementById('btn-flip-camera');
    this.torchBtn = document.getElementById('btn-toggle-torch');
    this.soundBtn = document.getElementById('btn-toggle-sound');

    // Puzzle selector buttons
    this.select3x3Btn = document.getElementById('btn-select-3x3');
    this.selectPyraminxBtn = document.getElementById('btn-select-pyraminx');

    // Subsystems
    this.camera = new CameraManager(this.videoEl);
    this.latestClassifiedColors = null;

    // Start background precomputation of solver tables
    initSolver();

    // Initialize application immediately
    this.init();
  }

  init() {
    // 1. Initialize 3D Cube Scene
    try {
      this.cubeScene = new CubeScene();
    } catch (e) {
      console.warn('3D Scene init note:', e);
    }

    // 2. Initialize AutoCapture Controller
    this.autoCapture = new AutoCaptureController({
      requiredDurationMs: 1200,
      onProgress: (progress, statusText) => {
        if (this.scanningUI) {
          this.scanningUI.updateAutoCaptureProgress(progress, statusText);
        }
      },
      onCapture: (capturedColors, classifiedDetails) => {
        this.handleFaceCaptured(capturedColors, classifiedDetails);
      }
    });

    // 3. Initialize UI Views synchronously
    this.initViews();

    // 4. Setup Header Utility Buttons synchronously
    this.setupHeaderActions();

    // 5. Navigate to Step 2 immediately so live camera and scanner are ready on launch
    if (this.appState.hasSavedCalibration) {
      this.goToStep(2);
    } else {
      this.goToStep(1);
    }

    // 6. Start Video Camera Stream asynchronously in the background
    this.startCameraInBackground();

    // 7. Start Real-Time Vision Loop
    this.startVisionLoop();
  }

  async startCameraInBackground() {
    try {
      const camRes = await this.camera.startCamera('environment');
      if (camRes && camRes.success) {
        if (this.camera.hasTorch && this.torchBtn) {
          this.torchBtn.classList.remove('hidden');
        }
      } else {
        console.warn('Camera could not be started automatically:', camRes ? camRes.error : 'Unknown');
      }
    } catch (err) {
      console.warn('Background camera exception:', err);
    }
  }

  initViews() {
    // 1. Step 1: Calibration View
    this.calibrationUI = new CalibrationUI(
      this.appState,
      this.step1El,
      () => this.goToStep(2), // Start scan
      () => this.sampleCenterPixel() // Sample center for calibration
    );

    // 2. Step 2: Scanning View
    this.scanningUI = new ScanningUI(
      this.appState,
      {
        topHud: document.getElementById('scanning-top-hud'),
        viewfinder: document.getElementById('viewfinder-box'),
        bottomPreview: document.getElementById('scanning-bottom-preview'),
        computingModal: this.computingModalEl
      },
      {
        onManualCapture: () => this.handleManualCapture(),
        onFaceSelected: (idx) => {
          const sequence = this.appState.getActiveFaceSequence();
          const face = sequence[idx] || sequence[0];
          this.autoCapture.setExpectedCenter(face.center || face.key);
          const isCaptured = this.appState.scannedFaces[face.key] !== null;
          this.autoCapture.setPaused(isCaptured);
          this.scanningUI.renderTopHud();
          this.scanningUI.renderBottomPreview();
        },
        onConfirmNextFace: () => {
          this.appState.confirmAndNextFace();
          const sequence = this.appState.getActiveFaceSequence();
          const nextFace = sequence[this.appState.scanIndex] || sequence[0];
          this.autoCapture.setExpectedCenter(nextFace.center || nextFace.key);
          const isCaptured = this.appState.scannedFaces[nextFace.key] !== null;
          this.autoCapture.setPaused(isCaptured);
          this.scanningUI.renderTopHud();
          this.scanningUI.renderBottomPreview();
        },
        onRetakeFace: () => {
          this.appState.retakeCurrentFace();
          this.autoCapture.setPaused(false);
          this.scanningUI.renderTopHud();
          this.scanningUI.renderBottomPreview();
        },
        onToggleAutoCapture: (enabled) => {
          this.autoCapture.enabled = enabled;
        },
        onAutoBalanceRequested: () => {
          this.autoBalanceAndRefresh();
        },
        onSolveRequested: () => this.computeSolutionAndLaunch()
      }
    );

    // Set initial target center for scanning
    const initialSequence = this.appState.getActiveFaceSequence();
    const initialFace = initialSequence[0];
    this.autoCapture.setExpectedCenter(initialFace.center || initialFace.key);

    // 3. Step 3: Solution View
    this.solutionUI = new SolutionUI(
      this.appState,
      { solutionContainer: document.getElementById('solution-container') },
      this.cubeScene,
      {
        onCompleted: () => this.goToStep(4)
      }
    );

    // 4. Step 4: Completion View
    this.completionUI = new CompletionUI(
      this.appState,
      this.completionModalEl,
      () => {
        this.appState.resetScan();
        this.goToStep(2);
      }
    );
  }

  setupHeaderActions() {
    // Puzzle Selector Buttons
    if (this.select3x3Btn) {
      this.select3x3Btn.addEventListener('click', () => {
        this.switchPuzzle('cube3x3');
      });
    }
    if (this.selectPyraminxBtn) {
      this.selectPyraminxBtn.addEventListener('click', () => {
        this.switchPuzzle('pyraminx');
      });
    }

    // Demo Cube Button
    if (this.demoBtn) {
      this.demoBtn.addEventListener('click', () => {
        this.loadScrambledDemoCube();
      });
    }

    // Flip Camera Button
    if (this.flipCamBtn) {
      this.flipCamBtn.addEventListener('click', async () => {
        this.appState.sounds.playClick();
        await this.camera.flipCamera();
      });
    }

    // Torch Toggle
    if (this.torchBtn) {
      this.torchBtn.addEventListener('click', async () => {
        this.appState.sounds.playClick();
        const isOn = await this.camera.toggleTorch();
        this.torchBtn.classList.toggle('bg-amber-500/30', isOn);
      });
    }

    // Sound Toggle
    if (this.soundBtn) {
      this.soundBtn.addEventListener('click', () => {
        this.appState.sounds.muted = !this.appState.sounds.muted;
        const iconOn = document.getElementById('icon-sound-on');
        const iconOff = document.getElementById('icon-sound-off');
        if (iconOn) iconOn.classList.toggle('hidden', this.appState.sounds.muted);
        if (iconOff) iconOff.classList.toggle('hidden', !this.appState.sounds.muted);
      });
    }

    // Interactive Stepper Navigation (Step 1, Step 2, Step 3)
    if (this.stepper1) {
      this.stepper1.classList.add('cursor-pointer');
      this.stepper1.addEventListener('click', () => {
        this.appState.sounds.playClick();
        this.goToStep(1);
      });
    }
    if (this.stepper2) {
      this.stepper2.classList.add('cursor-pointer');
      this.stepper2.addEventListener('click', () => {
        this.appState.sounds.playClick();
        this.goToStep(2);
      });
    }
    if (this.stepper3) {
      this.stepper3.classList.add('cursor-pointer');
      this.stepper3.addEventListener('click', () => {
        if (this.appState.solution) {
          this.appState.sounds.playClick();
          this.goToStep(3);
        }
      });
    }

    // Camera Fallback Buttons
    const btnRetry = document.getElementById('btn-request-cam-again');
    if (btnRetry) {
      btnRetry.addEventListener('click', async () => {
        this.fallbackEl.classList.add('hidden');
        await this.camera.startCamera(this.camera.facingMode);
      });
    }

    const btnFallbackDemo = document.getElementById('btn-fallback-demo');
    if (btnFallbackDemo) {
      btnFallbackDemo.addEventListener('click', () => {
        this.fallbackEl.classList.add('hidden');
        this.loadScrambledDemoCube();
      });
    }
  }

  switchPuzzle(type) {
    if (this.appState.puzzleType === type) return;
    this.appState.setPuzzleType(type);
    if (this.cubeScene) {
      this.cubeScene.setPuzzleType(type);
    }
    if (this.autoCapture) {
      this.autoCapture.setPuzzleType(type);
    }

    const isPyraminx = type === 'pyraminx';

    if (this.select3x3Btn && this.selectPyraminxBtn) {
      if (isPyraminx) {
        this.select3x3Btn.className = 'flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:bg-white/5';
        this.selectPyraminxBtn.className = 'flex-1 py-1.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md shadow-amber-500/25 scale-[1.02]';
      } else {
        this.select3x3Btn.className = 'flex-1 py-1.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 scale-[1.02]';
        this.selectPyraminxBtn.className = 'flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:bg-white/5';
      }
    }

    if (this.demoBtnLabel) {
      this.demoBtnLabel.innerText = isPyraminx ? 'Demo Pyraminx' : 'Demo 3×3';
    }

    if (this.appSubtitle) {
      this.appSubtitle.innerText = isPyraminx ? 'Pyraminx Camera Scanner & Solver' : '3×3 Camera Scanner & Solver';
    }

    // Refresh scanning viewfinder probes and sequence
    if (this.scanningUI) {
      this.scanningUI.initViewfinderProbes();
    }

    if (this.appState.hasSavedCalibration) {
      this.goToStep(2);
    } else {
      this.goToStep(1);
    }
  }

  showCameraFallback(errorMsg) {
    if (this.fallbackEl) {
      this.fallbackEl.classList.remove('hidden');
    }
  }

  goToStep(stepNumber) {
    this.appState.currentStep = stepNumber;

    // Update visibility of main containers
    if (this.step1El) this.step1El.classList.toggle('hidden', stepNumber !== 1);
    if (this.step2El) this.step2El.classList.toggle('hidden', stepNumber !== 2);
    if (this.step3El) this.step3El.classList.toggle('hidden', stepNumber !== 3);

    // Keep top puzzle switcher and stepper cards visible for seamless navigation

    // Update 3-Step Stepper in Top Bar
    this.updateStepperUI(stepNumber);

    if (stepNumber === 1 && this.calibrationUI) {
      this.calibrationUI.render();
    } else if (stepNumber === 2 && this.scanningUI) {
      this.scanningUI.initViewfinderProbes();
      this.scanningUI.renderTopHud();
      this.scanningUI.renderBottomPreview();
      const sequence = this.appState.getActiveFaceSequence();
      const face = sequence[this.appState.scanIndex] || sequence[0];
      this.autoCapture.setExpectedCenter(face.center || face.key);
    } else if (stepNumber === 4 && this.completionUI) {
      const movesCount = this.solutionUI?.totalMoves || 19;
      this.completionUI.show(movesCount);
    }
  }

  updateStepperUI(step) {
    if (!this.stepper1 || !this.stepper2 || !this.stepper3) return;

    const activeClass = 'bg-white/10 text-white font-bold border border-white/20';
    const doneClass = 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30';
    const inactiveClass = 'text-slate-400 font-medium opacity-60';

    // Step 1 Stepper
    if (step === 1) {
      this.stepper1.className = `stepper-item flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-xl transition-all ${activeClass}`;
      this.stepper1.querySelector('span:first-child').className = 'w-4 h-4 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center text-[10px] font-black';
      this.stepper1.querySelector('span:first-child').innerText = '1';
    } else {
      this.stepper1.className = `stepper-item flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-xl transition-all ${doneClass}`;
      this.stepper1.querySelector('span:first-child').className = 'w-4 h-4 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center text-[10px] font-black';
      this.stepper1.querySelector('span:first-child').innerText = '✓';
    }

    // Step 2 Stepper
    if (step < 2) {
      this.stepper2.className = `stepper-item flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-xl transition-all ${inactiveClass}`;
      this.stepper2.querySelector('span:first-child').className = 'w-4 h-4 rounded-full bg-white/10 text-slate-300 flex items-center justify-center text-[10px] font-bold';
      this.stepper2.querySelector('span:first-child').innerText = '2';
    } else if (step === 2) {
      this.stepper2.className = `stepper-item flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-xl transition-all ${activeClass}`;
      this.stepper2.querySelector('span:first-child').className = 'w-4 h-4 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center text-[10px] font-black';
      this.stepper2.querySelector('span:first-child').innerText = '2';
    } else {
      this.stepper2.className = `stepper-item flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-xl transition-all ${doneClass}`;
      this.stepper2.querySelector('span:first-child').className = 'w-4 h-4 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center text-[10px] font-black';
      this.stepper2.querySelector('span:first-child').innerText = '✓';
    }

    // Step 3 Stepper
    if (step < 3) {
      this.stepper3.className = `stepper-item flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-xl transition-all ${inactiveClass}`;
      this.stepper3.querySelector('span:first-child').className = 'w-4 h-4 rounded-full bg-white/10 text-slate-300 flex items-center justify-center text-[10px] font-bold';
      this.stepper3.querySelector('span:first-child').innerText = '3';
    } else {
      this.stepper3.className = `stepper-item flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-xl transition-all ${activeClass}`;
      this.stepper3.querySelector('span:first-child').className = 'w-4 h-4 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center text-[10px] font-black';
      this.stepper3.querySelector('span:first-child').innerText = '3';
    }
  }

  // Sample center pixel of video for calibration
  sampleCenterPixel() {
    if (!this.scanningUI) return null;
    const probeEls = this.scanningUI.getProbeElements();
    if (probeEls && probeEls.length === 9) {
      const sampled = this.camera.samplePoints([probeEls[4]]);
      return sampled ? sampled[0] : null;
    }
    return null;
  }

  // Continuous Camera Vision Loop
  startVisionLoop() {
    const loop = () => {
      requestAnimationFrame(loop);

      // Only sample colors when on Step 2 (Scanning)
      if (this.appState.currentStep === 2 && this.scanningUI) {
        const probeEls = this.scanningUI.getProbeElements();
        if (probeEls && probeEls.length === 9) {
          const sampledRgbList = this.camera.samplePoints(probeEls);
          if (sampledRgbList && sampledRgbList.length === 9) {
            // Classify each probe with puzzleType awareness
            this.latestClassifiedColors = sampledRgbList.map(rgb =>
              this.appState.colorManager.classifyRgb(rgb[0], rgb[1], rgb[2], this.appState.puzzleType)
            );

            // Update live viewfinder dots and mini 3x3 preview grid
            this.scanningUI.updateProbes(this.latestClassifiedColors);

            // Feed into Auto-capture controller
            this.autoCapture.processFrame(this.latestClassifiedColors);
          }
        }
      }
    };

    requestAnimationFrame(loop);
  }

  handleManualCapture() {
    if (!this.latestClassifiedColors || this.latestClassifiedColors.length !== 9) return;
    this.autoCapture.forceManualCapture(this.latestClassifiedColors);
  }

  handleFaceCaptured(capturedColorKeys, classifiedDetails = null) {
    const sequence = this.appState.getActiveFaceSequence();
    const currentFace = sequence[this.appState.scanIndex] || sequence[0];
    this.scanningUI.triggerCaptureFlash();
    this.appState.saveCapturedFace(currentFace.key, capturedColorKeys, classifiedDetails);

    // Pause auto-capture while user reviews and confirms this face
    this.autoCapture.setPaused(true);

    this.scanningUI.renderTopHud();
    this.scanningUI.renderBottomPreview();
  }

  autoBalanceAndRefresh() {
    this.appState.sounds.playClick();
    if (this.appState.puzzleType === 'pyraminx') {
      autoBalancePyraminxFaces(this.appState.scannedFaces, this.appState.scannedDetails);
    } else {
      const faceletString = this.appState.getFaceletString();
      if (faceletString) {
        const balanced = autoBalanceCubeFacelets(faceletString, this.appState.getFlatDetailsList());
        if (balanced) {
          this.appState.setFaceletString(balanced);
        }
      }
    }
    this.scanningUI.renderTopHud();
    this.scanningUI.renderBottomPreview();
  }

  async computeSolutionAndLaunch() {
    const isPyraminx = this.appState.puzzleType === 'pyraminx';

    if (isPyraminx) {
      this.scanningUI.showComputingModal(true, 'Validating Pyraminx faces...');
      await new Promise(r => setTimeout(r, 200));

      let validation = validatePyraminxFaces(this.appState.scannedFaces, this.appState.scannedDetails);
      if (!validation.valid) {
        if (validation.canAutoBalance) {
          // Auto-balance slight lighting / glare deviations to exactly 9 of each color
          autoBalancePyraminxFaces(this.appState.scannedFaces, this.appState.scannedDetails);
          validation = validatePyraminxFaces(this.appState.scannedFaces, this.appState.scannedDetails);
        }
      }

      if (!validation.valid) {
        this.scanningUI.showValidationError(
          validation.error,
          () => this.goToStep(2),
          () => {
            autoBalancePyraminxFaces(this.appState.scannedFaces, this.appState.scannedDetails);
            this.scanningUI.renderTopHud();
            this.scanningUI.renderBottomPreview();
            this.computeSolutionAndLaunch();
          }
        );
        return;
      }

      this.scanningUI.showComputingModal(true, 'Calculating optimal Pyraminx solution...');
      try {
        const state = buildPyraminxStateFromFaces(this.appState.scannedFaces);
        const solution = solvePyraminx(state);
        this.scanningUI.showComputingModal(false);

        if (solution.solvedAlready) {
          this.goToStep(4);
          return;
        }

        this.appState.solution = solution;
        this.goToStep(3);
        this.solutionUI.init(solution);
      } catch (err) {
        console.error('Pyraminx solver error:', err);
        this.scanningUI.showValidationError(
          `Unable to solve Pyraminx: ${err.message || 'Check face colors.'}`,
          () => this.goToStep(2)
        );
      }
      return;
    }

    // 3x3 Cube Logic
    this.scanningUI.showComputingModal(true, 'Validating scanned faces...');
    await new Promise(r => setTimeout(r, 200));

    const faceletString = this.appState.getFaceletString();

    // Validate Cube State
    const validation = validateCubeState(faceletString);
    if (!validation.valid) {
      const canAutoBalance = validation.code === 'COLOR_COUNT_MISMATCH';
      this.scanningUI.showValidationError(
        validation.error,
        () => {
          this.goToStep(2);
        },
        canAutoBalance ? () => {
          const balanced = autoBalanceCubeFacelets(faceletString, this.appState.getFlatDetailsList());
          this.appState.setFaceletString(balanced);
          this.scanningUI.renderTopHud();
          this.scanningUI.renderBottomPreview();
          this.computeSolutionAndLaunch();
        } : null
      );
      return;
    }

    this.scanningUI.showComputingModal(true, 'Calculating optimal 2-phase solution...');

    try {
      const solution = await solveCube(faceletString);
      this.scanningUI.showComputingModal(false);

      if (solution.solvedAlready) {
        // Cube was already solved!
        this.goToStep(4);
        return;
      }

      this.appState.solution = solution;
      this.goToStep(3);
      this.solutionUI.init(solution);
    } catch (err) {
      console.error('Solver error:', err);
      this.scanningUI.showValidationError(
        `Unable to solve cube: ${err.message || 'Check face colors and orientations.'}`,
        () => this.goToStep(2)
      );
    }
  }

  // Load Pre-Scrambled Demo for Instant Testing & Review
  async loadScrambledDemoCube() {
    this.appState.sounds.playClick();
    const isPyraminx = this.appState.puzzleType === 'pyraminx';

    if (isPyraminx) {
      this.scanningUI.showComputingModal(true, 'Loading scrambled Pyraminx demo...');
      const demo = generatePyraminxDemo();
      for (const key of ['F', 'L', 'R', 'D']) {
        this.appState.scannedFaces[key] = demo.faces[key];
      }

      await new Promise(r => setTimeout(r, 350));

      try {
        const solution = solvePyraminx(demo.state);
        this.scanningUI.showComputingModal(false);

        this.appState.solution = solution;
        this.goToStep(3);
        this.solutionUI.init(solution);
      } catch (e) {
        this.scanningUI.showComputingModal(false);
        console.error('Pyraminx demo solve failed:', e);
      }
      return;
    }

    // Standard 3x3 Demo
    this.scanningUI.showComputingModal(true, 'Loading scrambled 3x3 demo cube...');
    const demo = generateDemoCube("R U R' F' U2 D B' R2 F D' L2 B");

    // Populate all 6 scanned faces
    for (const key of ['U', 'R', 'F', 'D', 'L', 'B']) {
      this.appState.scannedFaces[key] = demo.faces[key];
    }

    await new Promise(r => setTimeout(r, 350));

    try {
      const solution = await solveCube(demo.faceletString);
      this.scanningUI.showComputingModal(false);

      this.appState.solution = solution;
      this.goToStep(3);
      this.solutionUI.init(solution);
    } catch (e) {
      this.scanningUI.showComputingModal(false);
      console.error('Demo solve failed:', e);
    }
  }
}

// Bootstrap application on DOM ready
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => {
    window.cubeApp = new MakeMeCubeMasterApp();
  });
} else {
  window.cubeApp = new MakeMeCubeMasterApp();
}
