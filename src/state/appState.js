// Central Reactive State Store for MakeMeCubeMaster (3x3 Cube & Pyraminx)
import { ColorManager, DEFAULT_CALIBRATION } from '../vision/colorDetector.js';
import { PYRAMINX_FACE_SEQUENCE } from '../solver/pyraminxSolver.js';

export const SCAN_FACE_SEQUENCE = [
  { key: 'F', name: 'Front', colorName: 'Green', center: 'F', instruction: 'Hold GREEN in front • WHITE on top, YELLOW at bottom, RED on right' },
  { key: 'R', name: 'Right', colorName: 'Red', center: 'R', instruction: 'Turn cube 90° LEFT to RED • WHITE stays on top, BLUE on right' },
  { key: 'B', name: 'Back', colorName: 'Blue', center: 'B', instruction: 'Turn cube 90° LEFT to BLUE • WHITE stays on top, ORANGE on right' },
  { key: 'L', name: 'Left', colorName: 'Orange', center: 'L', instruction: 'Turn cube 90° LEFT to ORANGE • WHITE stays on top, GREEN on right' },
  { key: 'U', name: 'Top', colorName: 'White', center: 'U', instruction: 'Tilt cube DOWN to WHITE • BLUE at top, GREEN at bottom, RED on right' },
  { key: 'D', name: 'Bottom', colorName: 'Yellow', center: 'D', instruction: 'Tilt cube UP to YELLOW • GREEN at top, BLUE at bottom, RED on right' }
];

class SoundEffects {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx && typeof AudioContext !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  playSnap() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.09);
    } catch (e) {}
  }

  playClick() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch (e) {}
  }

  playSuccess() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + i * 0.1);
        gain.gain.setValueAtTime(0.25, this.ctx.currentTime + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + i * 0.1 + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(this.ctx.currentTime + i * 0.1);
        osc.stop(this.ctx.currentTime + i * 0.1 + 0.38);
      });
    } catch (e) {}
  }
}

export class AppState {
  constructor() {
    this.colorManager = new ColorManager();
    this.sounds = new SoundEffects();

    // Puzzle type: 'cube3x3' or 'pyraminx'
    this.puzzleType = 'cube3x3';

    // Steps: 1: Calibration, 2: Scanning, 3: Solution, 4: Completion
    this.currentStep = 1;

    // Calibration
    this.hasSavedCalibration = true;
    this.isCalibrating = false;
    this.calibratingIndex = 0;

    // Scanning
    this.scanIndex = 0;
    this.scannedFaces = {
      U: null,
      R: null,
      F: null,
      D: null,
      L: null,
      B: null
    };
    this.scannedDetails = {
      U: null,
      R: null,
      F: null,
      D: null,
      L: null,
      B: null
    };
    this.isComputing = false;

    // Solution
    this.solution = null;
    this.currentMoveIndex = 0;
    this.isAutoPlaying = false;
    this.autoPlaySpeed = 1.0;
    this.startTime = 0;
    this.solutionStartTime = 0;

    this.listeners = [];
  }

  setPuzzleType(type) {
    if (this.puzzleType === type) return;
    this.puzzleType = type;
    this.sounds.playClick();
    this.resetScan();
    this.notify('PUZZLE_TYPE_CHANGED', type);
  }

  getActiveFaceSequence() {
    return this.puzzleType === 'pyraminx' ? PYRAMINX_FACE_SEQUENCE : SCAN_FACE_SEQUENCE;
  }

  getTotalFaces() {
    return this.puzzleType === 'pyraminx' ? 4 : 6;
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify(event, payload) {
    this.listeners.forEach(fn => fn(event, payload, this));
  }

  setStep(stepNumber) {
    this.currentStep = stepNumber;
    this.notify('STEP_CHANGED', stepNumber);
  }

  resetScan() {
    this.scanIndex = 0;
    if (this.puzzleType === 'pyraminx') {
      this.scannedFaces = {
        F: null,
        L: null,
        R: null,
        D: null
      };
      this.scannedDetails = {
        F: null,
        L: null,
        R: null,
        D: null
      };
    } else {
      this.scannedFaces = {
        U: null,
        R: null,
        F: null,
        D: null,
        L: null,
        B: null
      };
      this.scannedDetails = {
        U: null,
        R: null,
        F: null,
        D: null,
        L: null,
        B: null
      };
    }
    this.isComputing = false;
    this.solution = null;
    this.currentMoveIndex = 0;
    this.isAutoPlaying = false;
  }

  saveCapturedFace(faceKey, colors9, classifiedDetails = null) {
    this.scannedFaces[faceKey] = colors9.slice();
    if (classifiedDetails) {
      this.scannedDetails[faceKey] = classifiedDetails.slice();
    }
    this.sounds.playSnap();
    this.notify('FACE_CAPTURED', { faceKey, colors9 });
  }

  confirmAndNextFace() {
    this.sounds.playClick();
    const total = this.getTotalFaces();
    if (this.scanIndex < total - 1) {
      this.scanIndex++;
      this.notify('SCAN_INDEX_CHANGED', this.scanIndex);
    } else {
      this.notify('ALL_FACES_SCANNED');
    }
  }

  retakeCurrentFace() {
    this.sounds.playClick();
    const sequence = this.getActiveFaceSequence();
    const currentFace = sequence[this.scanIndex];
    if (currentFace) {
      this.scannedFaces[currentFace.key] = null;
      if (this.scannedDetails[currentFace.key]) {
        this.scannedDetails[currentFace.key] = null;
      }
      this.notify('FACE_RETAKE', { faceKey: currentFace.key });
    }
  }

  updateSticker(faceKey, tileIndex, newColorKey) {
    if (!this.scannedFaces[faceKey]) {
      this.scannedFaces[faceKey] = Array(9).fill(faceKey);
    }
    this.scannedFaces[faceKey][tileIndex] = newColorKey;
    if (this.scannedDetails[faceKey] && this.scannedDetails[faceKey][tileIndex]) {
      this.scannedDetails[faceKey][tileIndex].colorKey = newColorKey;
    }
    this.sounds.playClick();
    this.notify('STICKER_EDITED', { faceKey, tileIndex, newColorKey });
  }

  setFaceletString(str) {
    if (!str || str.length !== 54) return;
    this.scannedFaces = {
      U: str.slice(0, 9).split(''),
      R: str.slice(9, 18).split(''),
      F: str.slice(18, 27).split(''),
      D: str.slice(27, 36).split(''),
      L: str.slice(36, 45).split(''),
      B: str.slice(45, 54).split('')
    };
    this.notify('FACES_UPDATED');
  }

  getFlatDetailsList() {
    const keys = ['U', 'R', 'F', 'D', 'L', 'B'];
    const list = [];
    for (const k of keys) {
      const details = this.scannedDetails[k];
      if (details) {
        list.push(...details);
      } else {
        for (let i = 0; i < 9; i++) list.push(null);
      }
    }
    return list;
  }

  getFaceletString() {
    if (this.puzzleType === 'pyraminx') {
      return this.scannedFaces;
    }
    const keys = ['U', 'R', 'F', 'D', 'L', 'B'];
    let str = '';
    for (const key of keys) {
      const face = this.scannedFaces[key];
      if (!face || face.length !== 9) return null;
      str += face.join('');
    }
    return str;
  }
}
