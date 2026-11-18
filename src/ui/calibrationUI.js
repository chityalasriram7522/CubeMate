// Calibration View (Step 1)
import { COLOR_DISPLAY, DEFAULT_CALIBRATION } from '../vision/colorDetector.js';

export class CalibrationUI {
  constructor(appState, container, onStartScan, onSampleCenter) {
    this.appState = appState;
    this.container = container;
    this.onStartScan = onStartScan;
    this.onSampleCenter = onSampleCenter;
    this.calibratingIndex = 0;
    this.tempCalibration = JSON.parse(JSON.stringify(this.appState.colorManager.calibration));

    this.render();
  }

  getCalibrationOrder() {
    return this.appState.puzzleType === 'pyraminx'
      ? ['F', 'R', 'B', 'D'] // Green (F), Red (R), Blue (B), Yellow (D)
      : ['U', 'D', 'R', 'L', 'B', 'F'];
  }

  render() {
    this.container.innerHTML = '';

    const hasSaved = this.appState.hasSavedCalibration && !this.isManualCalibrating;

    if (hasSaved) {
      this.renderSavedView();
    } else {
      this.renderInteractiveCalibrationView();
    }
  }

  renderSavedView() {
    const order = this.getCalibrationOrder();
    const puzzleLabel = this.appState.puzzleType === 'pyraminx' ? 'Pyraminx (4 colors)' : "3x3 Rubik's Cube (6 colors)";
    const colorNames = order.map(k => DEFAULT_CALIBRATION[k].name).join(', ');

    const card = document.createElement('div');
    card.className = 'glass-card calibration-card p-6 rounded-3xl max-w-md w-full mx-auto text-white shadow-2xl animate-fade-in';

    card.innerHTML = `
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></div>
          <span class="text-xs font-semibold tracking-wider uppercase text-emerald-400">Calibration Profile</span>
        </div>
        <span class="text-xs bg-white/10 px-2.5 py-1 rounded-full text-slate-300 font-medium">${puzzleLabel}</span>
      </div>

      <h2 class="text-2xl font-bold tracking-tight mb-2">Using saved colour calibration</h2>
      <p class="text-sm text-slate-300 mb-6">
        Using lighting-calibrated color profiles for ${colorNames}.
      </p>

      <div class="grid ${order.length === 4 ? 'grid-cols-4' : 'grid-cols-6'} gap-2 mb-6 p-3 bg-black/30 rounded-2xl border border-white/10">
        ${order.map(key => {
          const cal = this.appState.colorManager.calibration[key] || DEFAULT_CALIBRATION[key];
          return `
            <div class="flex flex-col items-center gap-1.5">
              <div class="w-9 h-9 rounded-xl border border-white/20 shadow-md flex items-center justify-center font-bold text-xs" style="background-color: ${cal.hex}; color: ${key === 'U' || key === 'D' ? '#000' : '#FFF'}">
                ${key}
              </div>
              <span class="text-[10px] text-slate-400 font-medium">${cal.name}</span>
            </div>
          `;
        }).join('')}
      </div>

      <div class="flex flex-col gap-3">
        <button id="btn-start-scan" class="w-full py-4 px-6 rounded-2xl bg-white text-slate-950 font-bold text-base shadow-lg hover:bg-slate-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer">
          <span>Start scan</span>
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
          </svg>
        </button>

        <div class="flex gap-2">
          <button id="btn-recalibrate" class="flex-1 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Recalibrate colours
          </button>
          <button id="btn-reset-defaults" class="py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 text-xs font-medium transition cursor-pointer">
            Reset Defaults
          </button>
        </div>
      </div>
    `;

    this.container.appendChild(card);

    card.querySelector('#btn-start-scan').addEventListener('click', () => {
      this.appState.sounds.playClick();
      this.onStartScan();
    });

    card.querySelector('#btn-recalibrate').addEventListener('click', () => {
      this.appState.sounds.playClick();
      this.isManualCalibrating = true;
      this.render();
    });

    card.querySelector('#btn-reset-defaults').addEventListener('click', () => {
      this.appState.sounds.playClick();
      this.appState.colorManager.resetToDefaults();
      this.appState.hasSavedCalibration = false;
      this.isManualCalibrating = false;
      this.render();
    });
  }

  renderInteractiveCalibrationView() {
    const order = this.getCalibrationOrder();
    if (this.calibratingIndex >= order.length) {
      this.calibratingIndex = 0;
    }
    const activeKey = order[this.calibratingIndex];
    const targetMeta = DEFAULT_CALIBRATION[activeKey];

    const card = document.createElement('div');
    card.className = 'glass-card calibration-card p-6 rounded-3xl max-w-md w-full mx-auto text-white shadow-2xl animate-fade-in';

    card.innerHTML = `
      <div class="flex items-center justify-between mb-3">
        <span class="text-xs font-bold uppercase tracking-wider text-cyan-400">Colour Calibration</span>
        <span class="text-xs bg-white/10 px-2.5 py-1 rounded-full text-slate-300 font-mono">
          ${this.calibratingIndex + 1} of ${order.length}
        </span>
      </div>

      <h2 class="text-xl font-bold tracking-tight mb-1">
        Calibrate <span style="color: ${targetMeta.hex}">${targetMeta.name}</span>
      </h2>
      <p class="text-xs text-slate-300 mb-4">
        Hold the camera over a <strong>${targetMeta.name}</strong> sticker in the center circle and tap "Capture Color".
      </p>

      <!-- Color Progress Dots -->
      <div class="grid ${order.length === 4 ? 'grid-cols-4' : 'grid-cols-6'} gap-2 mb-5">
        ${order.map((key, i) => {
          const isDone = i < this.calibratingIndex;
          const isCurrent = i === this.calibratingIndex;
          const meta = DEFAULT_CALIBRATION[key];
          return `
            <div class="flex flex-col items-center gap-1 cursor-pointer" data-step="${i}">
              <div class="w-8 h-8 rounded-xl border ${isCurrent ? 'border-2 border-white ring-2 ring-cyan-400/50 scale-110' : 'border-white/20 opacity-70'} flex items-center justify-center font-bold text-xs transition-all" style="background-color: ${this.tempCalibration[key]?.hex || meta.hex}; color: ${key === 'U' || key === 'D' ? '#000' : '#FFF'}">
                ${isDone ? '✓' : key}
              </div>
              <span class="text-[9px] ${isCurrent ? 'text-white font-bold' : 'text-slate-400'}">${meta.name}</span>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Action Buttons -->
      <div class="flex flex-col gap-2.5">
        <button id="btn-capture-color" class="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-lg active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          Capture ${targetMeta.name}
        </button>

        <div class="flex gap-2">
          <button id="btn-use-defaults" class="flex-1 py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-medium transition cursor-pointer">
            Use Defaults & Skip
          </button>
          ${this.appState.hasSavedCalibration ? `
            <button id="btn-cancel-cal" class="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 text-xs font-medium transition cursor-pointer">
              Back
            </button>
          ` : ''}
        </div>
      </div>
    `;

    this.container.appendChild(card);

    // Event handlers
    card.querySelectorAll('[data-step]').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.getAttribute('data-step'), 10);
        this.calibratingIndex = idx;
        this.render();
      });
    });

    card.querySelector('#btn-capture-color').addEventListener('click', () => {
      this.appState.sounds.playSnap();
      if (this.onSampleCenter) {
        const rgb = this.onSampleCenter();
        if (rgb) {
          const currentKey = order[this.calibratingIndex];
          this.tempCalibration[currentKey] = {
            ...DEFAULT_CALIBRATION[currentKey],
            hex: `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`,
            rgb
          };
          this.appState.colorManager.calibrateColor(currentKey, rgb[0], rgb[1], rgb[2]);
        }
      }

      if (this.calibratingIndex < order.length - 1) {
        this.calibratingIndex++;
        this.render();
      } else {
        // All calibrated!
        this.appState.colorManager.saveCalibration(this.tempCalibration);
        this.appState.hasSavedCalibration = true;
        this.isManualCalibrating = false;
        this.appState.sounds.playSuccess();
        this.onStartScan();
      }
    });

    card.querySelector('#btn-use-defaults').addEventListener('click', () => {
      this.appState.sounds.playClick();
      this.appState.colorManager.resetToDefaults();
      this.appState.hasSavedCalibration = true;
      this.isManualCalibrating = false;
      this.onStartScan();
    });

    const cancelBtn = card.querySelector('#btn-cancel-cal');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.appState.sounds.playClick();
        this.isManualCalibrating = false;
        this.render();
      });
    }
  }
}

