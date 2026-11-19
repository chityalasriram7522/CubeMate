// Auto-capture & stability detector for MakeMeCubeMaster
import { DEFAULT_CALIBRATION } from './colorDetector.js';

export class AutoCaptureController {
  constructor(options = {}) {
    this.requiredDurationMs = options.requiredDurationMs || 1800; // 1.8s steady hold
    this.cooldownMs = options.cooldownMs || 1500; // 1.5s pause after capture
    this.onProgress = options.onProgress || (() => {});
    this.onCapture = options.onCapture || (() => {});

    this.lastColorsKey = '';
    this.stableStartTime = 0;
    this.lastCaptureTime = 0;
    this.isCoolingDown = false;
    this.isPaused = false;
    this.progress = 0;
    this.expectedCenter = 'F';
    this.puzzleType = 'cube3x3';
    this.enabled = true;
  }

  setPuzzleType(puzzleType) {
    this.puzzleType = puzzleType;
    this.reset();
  }

  setExpectedCenter(centerColorKey) {
    this.expectedCenter = centerColorKey;
    this.reset();
  }

  setPaused(paused) {
    this.isPaused = paused;
    if (paused) {
      this.reset();
    }
  }

  reset() {
    this.lastColorsKey = '';
    this.stableStartTime = 0;
    this.progress = 0;
    this.onProgress(0, 'Align face inside frame');
  }

  processFrame(classifiedColors) {
    if (!this.enabled || this.isPaused || !classifiedColors || classifiedColors.length !== 9) {
      this.reset();
      return;
    }

    const now = performance.now();

    // Check cooldown after last snap
    if (now - this.lastCaptureTime < this.cooldownMs) {
      this.progress = 0;
      this.onProgress(0, 'Preparing...');
      return;
    }

    const centerIdx = this.puzzleType === 'pyraminx' ? 2 : 4;
    const centerColor = classifiedColors[centerIdx]?.colorKey;

    // Center tile must match target face center (if specified)
    if (this.expectedCenter && centerColor && centerColor !== this.expectedCenter) {
      this.stableStartTime = 0;
      this.progress = 0;
      const expectedName = DEFAULT_CALIBRATION[this.expectedCenter]?.name || this.expectedCenter;
      const detectedName = DEFAULT_CALIBRATION[centerColor]?.name || centerColor;
      this.onProgress(0, `Center is ${detectedName} • Show ${expectedName} face`);
      return;
    }

    // Build unique key from 9 facelets
    const currentKey = classifiedColors.map(c => c.colorKey).join('');

    if (currentKey === this.lastColorsKey) {
      if (!this.stableStartTime) {
        this.stableStartTime = now;
      }
      const elapsed = now - this.stableStartTime;
      this.progress = Math.min(1.0, elapsed / this.requiredDurationMs);

      const pct = Math.round(this.progress * 100);
      this.onProgress(this.progress, `Holding steady... ${pct}%`);

      if (this.progress >= 1.0) {
        // Trigger capture!
        this.lastCaptureTime = now;
        this.stableStartTime = 0;
        this.progress = 0;
        this.isPaused = true;
        this.onProgress(1.0, 'Captured! Verify stickers');
        this.onCapture(classifiedColors.map(c => c.colorKey), classifiedColors);
      }
    } else {
      // Colors shifted or still moving
      this.lastColorsKey = currentKey;
      this.stableStartTime = now;
      this.progress = 0.05;
      this.onProgress(0.05, 'Keep steady');
    }
  }

  forceManualCapture(classifiedColors) {
    if (!classifiedColors || classifiedColors.length !== 9) return false;
    this.lastCaptureTime = performance.now();
    this.stableStartTime = 0;
    this.progress = 0;
    this.isPaused = true;
    this.onProgress(1.0, 'Captured! Verify stickers');
    this.onCapture(classifiedColors.map(c => c.colorKey), classifiedColors);
    return true;
  }
}

