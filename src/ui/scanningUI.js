// Scanning View (Step 2) for 3x3 Cube & Pyraminx
import { SCAN_FACE_SEQUENCE } from '../state/appState.js';
import { PYRAMINX_FACE_SEQUENCE, PYRAMINX_COLORS } from '../solver/pyraminxSolver.js';
import { COLOR_DISPLAY, DEFAULT_CALIBRATION } from '../vision/colorDetector.js';

export class ScanningUI {
  constructor(appState, elements, callbacks = {}) {
    this.appState = appState;
    this.topHudEl = elements.topHud;
    this.viewfinderEl = elements.viewfinder;
    this.bottomPreviewEl = elements.bottomPreview;
    this.computingModalEl = elements.computingModal;

    this.onManualCapture = callbacks.onManualCapture || (() => {});
    this.onFaceSelected = callbacks.onFaceSelected || (() => {});
    this.onAllFacesReady = callbacks.onAllFacesReady || (() => {});
    this.onSolveRequested = callbacks.onSolveRequested || (() => {});

    this.editingTileIndex = null;
    this.editingFaceKey = null;

    this.setupSizeSwitcher();
    this.initViewfinderProbes();
    this.renderTopHud();
    this.renderBottomPreview();
  }

  // Interactive Viewfinder Size Switcher (Medium / Big / Extra Big)
  setupSizeSwitcher() {
    const sizeBtns = this.topHudEl.querySelectorAll('.vf-size-btn');
    if (!sizeBtns || sizeBtns.length === 0) return;

    const sizeClasses = {
      medium: ['w-[min(68vw,30vh)]', 'h-[min(68vw,30vh)]', 'sm:w-72', 'sm:h-72'],
      large: ['w-[min(82vw,38vh)]', 'h-[min(82vw,38vh)]', 'sm:w-84', 'sm:h-84', 'md:w-96', 'md:h-96'],
      xlarge: ['w-[min(90vw,44vh)]', 'h-[min(90vw,44vh)]', 'sm:w-96', 'sm:h-96', 'md:w-[28rem]', 'md:h-[28rem]']
    };

    const currentSize = localStorage.getItem('cube_vf_size') || 'large';

    const applySize = (sizeKey) => {
      localStorage.setItem('cube_vf_size', sizeKey);

      // Remove existing size classes
      Object.values(sizeClasses).flat().forEach(cls => this.viewfinderEl.classList.remove(cls));

      // Add target size classes
      const targetClasses = sizeClasses[sizeKey] || sizeClasses.large;
      targetClasses.forEach(cls => this.viewfinderEl.classList.add(cls));

      // Update button active styling
      sizeBtns.forEach(btn => {
        const isSelected = btn.getAttribute('data-size') === sizeKey;
        if (isSelected) {
          btn.className = 'vf-size-btn px-2.5 py-1 rounded-lg font-black text-xs transition bg-cyan-500 text-slate-950 shadow-sm cursor-pointer';
        } else {
          btn.className = 'vf-size-btn px-2 py-1 rounded-lg font-bold text-xs transition text-slate-300 hover:text-white cursor-pointer';
        }
      });
    };

    applySize(currentSize);

    sizeBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.appState.sounds.playClick();
        const sizeKey = e.currentTarget.getAttribute('data-size');
        applySize(sizeKey);
      });
    });
  }

  // Setup the 9 probe DOM elements inside the bounding box (Square or Triangle)
  initViewfinderProbes() {
    const isPyraminx = this.appState.puzzleType === 'pyraminx';

    if (isPyraminx) {
      // True Equilateral Triangular Viewfinder with 9 Facet Guidelines for Pyraminx
      this.viewfinderEl.innerHTML = `
        <div class="viewfinder-bounding-box relative w-full h-full p-2 flex items-center justify-center">
          <!-- Equilateral Triangle SVG Outline with Facet Dividers (Base 90, Height 78, Centered) -->
          <svg class="absolute inset-0 w-full h-full drop-shadow-2xl pointer-events-none" viewBox="0 0 100 100">
            <!-- Outer Equilateral Triangle -->
            <polygon points="50,11 95,89 5,89" fill="rgba(0,0,0,0.22)" stroke="rgba(255,255,255,0.95)" stroke-width="2.5" stroke-dasharray="4 3"/>

            <!-- Internal facet dividing lines (showing the 9 triangular stickers) -->
            <!-- Horizontal line 1 (y = 37) -->
            <line x1="35" y1="37" x2="65" y2="37" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" stroke-dasharray="3 2"/>
            <!-- Horizontal line 2 (y = 63) -->
            <line x1="20" y1="63" x2="80" y2="63" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" stroke-dasharray="3 2"/>
            <!-- Diagonal lines (Left-Up to Right-Down) -->
            <line x1="35" y1="37" x2="65" y2="89" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" stroke-dasharray="3 2"/>
            <line x1="20" y1="63" x2="35" y2="89" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" stroke-dasharray="3 2"/>
            <!-- Diagonal lines (Right-Up to Left-Down) -->
            <line x1="65" y1="37" x2="35" y2="89" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" stroke-dasharray="3 2"/>
            <line x1="80" y1="63" x2="65" y2="89" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" stroke-dasharray="3 2"/>
          </svg>

          <!-- 9 Triangular Probe Points (Exact mathematical centroids of each sticker) -->
          <div class="relative w-full h-full">
            ${[
              { x: 50.0, y: 28.3 }, // Tip 0
              { x: 35.0, y: 54.3 }, // Row 1: Left 1
              { x: 50.0, y: 45.7 }, // Row 1: Center Inverted 2
              { x: 65.0, y: 54.3 }, // Row 1: Right 3
              { x: 20.0, y: 80.3 }, // Row 2: Bottom-Left Tip 4
              { x: 35.0, y: 71.7 }, // Row 2: Inverted 5
              { x: 50.0, y: 80.3 }, // Row 2: Center Upright 6
              { x: 65.0, y: 71.7 }, // Row 2: Inverted 7
              { x: 80.0, y: 80.3 }  // Row 2: Bottom-Right Tip 8
            ].map((p, i) => `
              <div class="probe-target absolute flex items-center justify-center -translate-x-1/2 -translate-y-1/2" style="left: ${p.x}%; top: ${p.y}%;" data-probe="${i}">
                <div class="probe-dot w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-white/95 shadow-xl flex items-center justify-center bg-black/60 transition-transform hover:scale-110">
                  <span class="probe-text text-[10px] sm:text-xs font-black text-white drop-shadow"></span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } else {
      // Standard 3x3 Square Viewfinder (Enlarged)
      this.viewfinderEl.innerHTML = `
        <div class="viewfinder-bounding-box relative w-full h-full border-2 border-dashed border-white/85 rounded-3xl p-3 flex flex-col justify-between shadow-2xl backdrop-blur-[2px]">
          <!-- Corner brackets -->
          <div class="corner-bracket top-0 left-0 border-t-4 border-l-4 border-cyan-400 rounded-tl-2xl w-7 h-7"></div>
          <div class="corner-bracket top-0 right-0 border-t-4 border-r-4 border-cyan-400 rounded-tr-2xl w-7 h-7"></div>
          <div class="corner-bracket bottom-0 left-0 border-b-4 border-l-4 border-cyan-400 rounded-bl-2xl w-7 h-7"></div>
          <div class="corner-bracket bottom-0 right-0 border-b-4 border-r-4 border-cyan-400 rounded-br-2xl w-7 h-7"></div>

          <!-- 3x3 Probe Grid -->
          <div class="grid grid-cols-3 grid-rows-3 gap-3 sm:gap-4 w-full h-full p-2.5 sm:p-3.5">
            ${Array(9).fill(0).map((_, i) => `
              <div class="probe-target flex items-center justify-center relative" data-probe="${i}">
                <div class="probe-dot w-8 h-8 sm:w-11 sm:h-11 rounded-full border-2 border-white/95 shadow-xl transition-all duration-100 flex items-center justify-center bg-black/50 hover:scale-110">
                  <span class="probe-text text-[11px] sm:text-xs font-black text-white drop-shadow"></span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    this.probeElements = Array.from(this.viewfinderEl.querySelectorAll('.probe-target'));
  }

  getProbeElements() {
    return this.probeElements;
  }

  // Update live viewfinder dots with classified color
  updateProbes(classifiedColors) {
    if (!classifiedColors || classifiedColors.length !== 9) return;
    this.probeElements.forEach((el, i) => {
      const c = classifiedColors[i];
      const dot = el.querySelector('.probe-dot');
      const text = el.querySelector('.probe-text');
      if (c && dot) {
        dot.style.backgroundColor = c.hex;
        dot.style.borderColor = c.colorKey === 'U' ? '#000' : '#FFF';
        text.innerText = c.colorKey;
        text.style.color = c.colorKey === 'U' || c.colorKey === 'D' ? '#000' : '#FFF';
      }
    });

    this.updateLiveGrid(classifiedColors);
  }

  // Render Top HUD Card: Face Status + Thumbnails + Embedded Size Switcher (Comfortable & Prominent)
  renderTopHud() {
    const isPyraminx = this.appState.puzzleType === 'pyraminx';
    const sequence = this.appState.getActiveFaceSequence();
    const currentIndex = this.appState.scanIndex;
    const currentFace = sequence[currentIndex] || sequence[0];
    const totalFaces = this.appState.getTotalFaces();
    const currentSize = localStorage.getItem('cube_vf_size') || 'large';

    this.topHudEl.innerHTML = `
      <div class="glass-card hud-top-card px-3.5 py-2.5 sm:px-5 sm:py-3.5 rounded-2xl sm:rounded-3xl max-w-xl w-full mx-auto text-white shadow-2xl flex flex-col gap-2.5 border border-white/15">
        <!-- Row 1: Active Face Badge + Face Title + Size Selector Pills -->
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-xs sm:text-sm font-mono font-black px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 uppercase shrink-0 shadow-sm">
              SCAN ${currentIndex + 1}/${totalFaces}
            </span>
            <span class="text-sm sm:text-base font-extrabold text-white truncate tracking-wide">
              ${currentFace.name} <span class="text-slate-300 font-semibold text-xs sm:text-sm">(${currentFace.colorName})</span>
            </span>
          </div>

          <!-- Guide Size Switcher Pills inside top bar -->
          <div class="flex items-center gap-1.5 bg-black/60 px-2.5 py-1 rounded-xl border border-white/15 shrink-0 shadow-inner">
            <span class="text-slate-400 font-bold text-[10px] sm:text-xs uppercase tracking-wider">Size:</span>
            <button class="vf-size-btn px-2 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${currentSize === 'medium' ? 'bg-cyan-500 text-slate-950 font-black shadow-sm' : 'text-slate-300 hover:text-white'}" data-size="medium">M</button>
            <button class="vf-size-btn px-2.5 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${currentSize === 'large' ? 'bg-cyan-500 text-slate-950 font-black shadow-sm' : 'text-slate-300 hover:text-white'}" data-size="large">Big</button>
            <button class="vf-size-btn px-2 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${currentSize === 'xlarge' ? 'bg-cyan-500 text-slate-950 font-black shadow-sm' : 'text-slate-300 hover:text-white'}" data-size="xlarge">XL</button>
          </div>
        </div>

        <!-- Row 2: Prominent Thumbnails + Clear Guidance Text -->
        <div class="flex items-center justify-between gap-3 pt-1 border-t border-white/10">
          <!-- Face Thumbnails -->
          <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
            ${sequence.map((face, i) => {
              const isActive = i === currentIndex;
              const captured = this.appState.scannedFaces[face.key];
              const isDone = captured !== null;
              const centerColorHex = DEFAULT_CALIBRATION[face.center || face.key]?.hex || '#FFF';

              return `
                <div class="thumb-face flex items-center cursor-pointer transition-transform ${isActive ? 'scale-110' : 'opacity-70 hover:opacity-100 hover:scale-105'}" data-face-index="${i}" title="${face.name}">
                  <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-xl border-2 ${isActive ? 'border-cyan-400 ring-2 ring-cyan-400/60 shadow-lg shadow-cyan-500/30' : isDone ? 'border-emerald-400 shadow-sm' : 'border-white/20'} bg-black/70 p-1 flex items-center justify-center relative overflow-hidden">
                    ${isDone ? (isPyraminx ? `
                      <div class="flex flex-col items-center gap-[1px] w-full h-full justify-center">
                        <div class="w-1.5 h-1.5 rounded-[1px]" style="background-color: ${COLOR_DISPLAY[captured[0]]?.hex || '#333'}"></div>
                        <div class="flex gap-[1px]">
                          <div class="w-1.5 h-1.5 rounded-[1px]" style="background-color: ${COLOR_DISPLAY[captured[1]]?.hex || '#333'}"></div>
                          <div class="w-1.5 h-1.5 rounded-[1px]" style="background-color: ${COLOR_DISPLAY[captured[2]]?.hex || '#333'}"></div>
                          <div class="w-1.5 h-1.5 rounded-[1px]" style="background-color: ${COLOR_DISPLAY[captured[3]]?.hex || '#333'}"></div>
                        </div>
                        <div class="flex gap-[1px]">
                          <div class="w-1 h-1 rounded-[1px]" style="background-color: ${COLOR_DISPLAY[captured[4]]?.hex || '#333'}"></div>
                          <div class="w-1 h-1 rounded-[1px]" style="background-color: ${COLOR_DISPLAY[captured[5]]?.hex || '#333'}"></div>
                          <div class="w-1 h-1 rounded-[1px]" style="background-color: ${COLOR_DISPLAY[captured[6]]?.hex || '#333'}"></div>
                          <div class="w-1 h-1 rounded-[1px]" style="background-color: ${COLOR_DISPLAY[captured[7]]?.hex || '#333'}"></div>
                          <div class="w-1 h-1 rounded-[1px]" style="background-color: ${COLOR_DISPLAY[captured[8]]?.hex || '#333'}"></div>
                        </div>
                      </div>
                    ` : `
                      <div class="grid grid-cols-3 grid-rows-3 gap-[1px] w-full h-full rounded">
                        ${captured.map(colorKey => `
                          <div style="background-color: ${COLOR_DISPLAY[colorKey]?.hex || '#333'}"></div>
                        `).join('')}
                      </div>
                    `) : `
                      <div class="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full shadow-md" style="background-color: ${centerColorHex}"></div>
                    `}
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Instructions -->
          <div class="text-xs sm:text-[13px] text-slate-200 truncate font-semibold flex items-center gap-1.5 min-w-0">
            <span class="text-cyan-400 text-sm shrink-0">💡</span>
            <span class="truncate">${currentFace.instruction}</span>
          </div>
        </div>
      </div>
    `;

    this.setupSizeSwitcher();

    // Click on thumbnail to jump to face
    this.topHudEl.querySelectorAll('[data-face-index]').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.getAttribute('data-face-index'), 10);
        this.appState.sounds.playClick();
        this.appState.scanIndex = idx;
        this.renderTopHud();
        this.renderBottomPreview();
        this.onFaceSelected(idx);
      });
    });
  }

  getTileHex(faceKey, tileIdx) {
    const capturedFace = this.appState.scannedFaces[faceKey];
    const tileColorKey = capturedFace ? capturedFace[tileIdx] : null;
    return tileColorKey ? (COLOR_DISPLAY[tileColorKey]?.hex || '#334155') : '#334155';
  }

  // Render Bottom Preview Card: Status + Action Button + Mini Grid (Comfortable & Prominent)
  renderBottomPreview() {
    const sequence = this.appState.getActiveFaceSequence();
    const currentIndex = this.appState.scanIndex;
    const currentFace = sequence[currentIndex] || sequence[0];
    const totalFaces = this.appState.getTotalFaces();
    const isCaptured = this.appState.scannedFaces[currentFace.key] !== null;
    const allScanned = Object.values(this.appState.scannedFaces).filter(Boolean).length === totalFaces;
    const isPyraminx = this.appState.puzzleType === 'pyraminx';

    this.bottomPreviewEl.innerHTML = `
      <div class="glass-card hud-bottom-card px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl sm:rounded-3xl max-w-xl w-full mx-auto text-white shadow-2xl flex flex-col gap-2.5 border border-white/15">
        <!-- Status Line -->
        <div class="flex items-center justify-between text-xs sm:text-sm font-bold">
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-cyan-400 font-mono font-black">${currentIndex + 1}/${totalFaces} Faces</span>
            <span class="text-slate-400">•</span>
            <span id="auto-capture-status" class="text-slate-200 font-semibold truncate max-w-[200px] sm:max-w-none">${allScanned ? 'All faces scanned!' : 'Hold steady inside frame...'}</span>
          </div>

          <!-- Progress Meter -->
          <div class="w-20 sm:w-28 bg-white/15 rounded-full h-1.5 sm:h-2 overflow-hidden shrink-0">
            <div id="capture-progress-fill" class="bg-gradient-to-r from-cyan-400 to-emerald-400 h-full rounded-full transition-all duration-150" style="width: ${allScanned ? '100%' : '0%'}"></div>
          </div>
        </div>

        <!-- Bottom Action Row: Mini Grid + Capture Face Button + Nav Buttons -->
        <div class="flex items-center justify-between gap-2.5 pt-0.5">
          <!-- Live Color Preview (Pyraminx Triangle or 3x3 Grid) -->
          ${isPyraminx ? `
            <div id="live-color-grid" class="flex flex-col items-center gap-[2px] p-2 bg-black/70 rounded-xl border border-white/20 shrink-0 cursor-pointer shadow-md hover:border-cyan-400 transition" title="Tap tile to fix color">
              <div class="flex justify-center">
                <div class="live-tile w-3 h-3 rounded-[2px] cursor-pointer hover:scale-110 transition-transform" style="background-color: ${this.getTileHex(currentFace.key, 0)}" data-tile-index="0"></div>
              </div>
              <div class="flex justify-center gap-[2px]">
                <div class="live-tile w-3 h-3 rounded-[2px] cursor-pointer hover:scale-110 transition-transform" style="background-color: ${this.getTileHex(currentFace.key, 1)}" data-tile-index="1"></div>
                <div class="live-tile w-3 h-3 rounded-[2px] cursor-pointer hover:scale-110 transition-transform" style="background-color: ${this.getTileHex(currentFace.key, 2)}" data-tile-index="2"></div>
                <div class="live-tile w-3 h-3 rounded-[2px] cursor-pointer hover:scale-110 transition-transform" style="background-color: ${this.getTileHex(currentFace.key, 3)}" data-tile-index="3"></div>
              </div>
              <div class="flex justify-center gap-[2px]">
                <div class="live-tile w-2.5 h-2.5 rounded-[2px] cursor-pointer hover:scale-110 transition-transform" style="background-color: ${this.getTileHex(currentFace.key, 4)}" data-tile-index="4"></div>
                <div class="live-tile w-2.5 h-2.5 rounded-[2px] cursor-pointer hover:scale-110 transition-transform" style="background-color: ${this.getTileHex(currentFace.key, 5)}" data-tile-index="5"></div>
                <div class="live-tile w-2.5 h-2.5 rounded-[2px] cursor-pointer hover:scale-110 transition-transform" style="background-color: ${this.getTileHex(currentFace.key, 6)}" data-tile-index="6"></div>
                <div class="live-tile w-2.5 h-2.5 rounded-[2px] cursor-pointer hover:scale-110 transition-transform" style="background-color: ${this.getTileHex(currentFace.key, 7)}" data-tile-index="7"></div>
                <div class="live-tile w-2.5 h-2.5 rounded-[2px] cursor-pointer hover:scale-110 transition-transform" style="background-color: ${this.getTileHex(currentFace.key, 8)}" data-tile-index="8"></div>
              </div>
            </div>
          ` : `
            <div id="live-color-grid" class="grid grid-cols-3 grid-rows-3 gap-[2px] w-10 h-10 p-1.5 bg-black/70 rounded-xl border border-white/20 shrink-0 cursor-pointer shadow-md hover:border-cyan-400 transition" title="Tap tile to fix color">
              ${Array(9).fill(0).map((_, i) => `
                <div class="live-tile w-2.5 h-2.5 rounded-[2px] cursor-pointer hover:scale-110 transition-transform" style="background-color: ${this.getTileHex(currentFace.key, i)}" data-tile-index="${i}"></div>
              `).join('')}
            </div>
          `}

          <!-- Center Action Button (Capture / Solve) -->
          <div class="flex-1">
            ${allScanned ? `
              <button id="btn-solve-now" class="w-full py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl sm:rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 text-slate-950 font-black text-sm sm:text-base shadow-xl hover:opacity-95 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer shadow-emerald-500/30">
                <svg class="w-4 h-4 sm:w-5 sm:h-5 text-slate-950" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                <span>Solve ${isPyraminx ? 'Pyraminx' : 'Cube'}</span>
              </button>
            ` : `
              <button id="btn-manual-capture" class="w-full py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl sm:rounded-2xl bg-white text-slate-950 font-black text-sm sm:text-base shadow-xl hover:bg-slate-100 active:scale-95 transition flex items-center justify-center gap-2.5 cursor-pointer">
                <div class="w-3 h-3 rounded-full bg-emerald-500 shadow-md shadow-emerald-500/50 animate-pulse"></div>
                <span>${isCaptured ? 'Retake Face' : 'Capture Face'}</span>
              </button>
            `}
          </div>

          <!-- Prev / Next Navigation -->
          <div class="flex items-center gap-1.5 shrink-0">
            ${currentIndex > 0 ? `
              <button id="btn-prev-face" class="p-2 sm:p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-100 transition active:scale-95 cursor-pointer" title="Previous Face">
                <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
              </button>
            ` : `
              <div class="w-8 sm:w-9"></div>
            `}
            ${currentIndex < totalFaces - 1 ? `
              <button id="btn-next-face" class="p-2 sm:p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-100 transition active:scale-95 cursor-pointer" title="Next Face">
                <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    const solveNowBtn = this.bottomPreviewEl.querySelector('#btn-solve-now');
    if (solveNowBtn) {
      solveNowBtn.addEventListener('click', () => {
        this.appState.sounds.playClick();
        this.onSolveRequested();
      });
    }

    const captureBtn = this.bottomPreviewEl.querySelector('#btn-manual-capture');
    if (captureBtn) {
      captureBtn.addEventListener('click', () => {
        this.onManualCapture();
      });
    }

    const prevBtn = this.bottomPreviewEl.querySelector('#btn-prev-face');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (this.appState.scanIndex > 0) {
          this.appState.scanIndex--;
          this.renderTopHud();
          this.renderBottomPreview();
          this.onFaceSelected(this.appState.scanIndex);
        }
      });
    }

    const nextBtn = this.bottomPreviewEl.querySelector('#btn-next-face');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (this.appState.scanIndex < totalFaces - 1) {
          this.appState.scanIndex++;
          this.renderTopHud();
          this.renderBottomPreview();
          this.onFaceSelected(this.appState.scanIndex);
        }
      });
    }

    // Tap tile to open edit palette
    this.bottomPreviewEl.querySelectorAll('[data-tile-index]').forEach(el => {
      el.addEventListener('click', () => {
        const tileIdx = parseInt(el.getAttribute('data-tile-index'), 10);
        this.openStickerColorPalette(tileIdx);
      });
    });
  }

  // Update the mini live grid
  updateLiveGrid(classifiedColors) {
    const tiles = this.bottomPreviewEl.querySelectorAll('.live-tile');
    if (!tiles || tiles.length !== 9 || !classifiedColors) return;

    tiles.forEach((tile, i) => {
      const c = classifiedColors[i];
      if (c) {
        tile.style.backgroundColor = c.hex;
      }
    });
  }

  // Update auto-capture progress bar and status text
  updateAutoCaptureProgress(progress, statusText) {
    const fill = this.bottomPreviewEl.querySelector('#capture-progress-fill');
    const statusEl = this.bottomPreviewEl.querySelector('#auto-capture-status');
    if (fill) {
      fill.style.width = `${Math.round(progress * 100)}%`;
    }
    if (statusEl && statusText) {
      statusEl.innerText = statusText;
    }
  }

  // Flash animation on face capture
  triggerCaptureFlash() {
    const flash = document.createElement('div');
    flash.className = 'fixed inset-0 bg-white pointer-events-none z-50 transition-opacity duration-300';
    flash.style.opacity = '0.7';
    document.body.appendChild(flash);
    setTimeout(() => {
      flash.style.opacity = '0';
      setTimeout(() => flash.remove(), 300);
    }, 50);
  }

  // Manual sticker color correction modal
  openStickerColorPalette(tileIndex) {
    const sequence = this.appState.getActiveFaceSequence();
    const faceKey = sequence[this.appState.scanIndex].key;
    const isPyraminx = this.appState.puzzleType === 'pyraminx';
    const colorChoices = isPyraminx ? ['F', 'R', 'B', 'D'] : ['U', 'D', 'R', 'L', 'F', 'B'];

    const existing = document.getElementById('sticker-palette-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'sticker-palette-modal';
    modal.className = 'fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in';

    modal.innerHTML = `
      <div class="glass-card p-6 rounded-3xl max-w-xs w-full text-white shadow-2xl border border-white/20 flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <h3 class="text-base font-bold">Edit Tile ${tileIndex + 1} Color</h3>
          <button id="btn-close-palette" class="p-1 rounded-full hover:bg-white/10 text-slate-400">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <p class="text-xs text-slate-300">Select the correct color for this sticker:</p>

        <div class="grid ${isPyraminx ? 'grid-cols-2' : 'grid-cols-3'} gap-2.5">
          ${colorChoices.map(k => {
            const meta = COLOR_DISPLAY[k] || DEFAULT_CALIBRATION[k];
            return `
              <button class="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 transition active:scale-95 cursor-pointer" data-palette-color="${k}">
                <div class="w-8 h-8 rounded-lg shadow" style="background-color: ${meta.hex}; color: ${meta.textColor || '#FFF'}"></div>
                <span class="text-[10px] font-semibold">${meta.name}</span>
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#btn-close-palette').addEventListener('click', () => modal.remove());
    modal.querySelectorAll('[data-palette-color]').forEach(btn => {
      btn.addEventListener('click', () => {
        const colorKey = btn.getAttribute('data-palette-color');
        this.appState.updateSticker(faceKey, tileIndex, colorKey);
        this.renderTopHud();
        this.renderBottomPreview();
        modal.remove();
      });
    });
  }

  showComputingModal(visible = true, message = 'Computing shortest solution...') {
    if (!this.computingModalEl) return;
    if (visible) {
      this.computingModalEl.classList.remove('hidden');
      this.computingModalEl.innerHTML = `
        <div class="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div class="glass-card p-8 rounded-3xl max-w-sm w-full text-white text-center shadow-2xl border border-white/15 flex flex-col items-center gap-4">
            <div class="cube-loader-wrapper my-2">
              <div class="cube-spinner">
                <div class="face front"></div>
                <div class="face back"></div>
                <div class="face right"></div>
                <div class="face left"></div>
                <div class="face top"></div>
                <div class="face bottom"></div>
              </div>
            </div>

            <div class="flex flex-col gap-1">
              <h2 class="text-2xl font-bold tracking-tight text-white">Computing...</h2>
              <p class="text-xs text-cyan-300 font-medium">${message}</p>
              <p class="text-[11px] text-slate-400 mt-1">Calculating optimal moves</p>
            </div>
          </div>
        </div>
      `;
    } else {
      this.computingModalEl.classList.add('hidden');
      this.computingModalEl.innerHTML = '';
    }
  }

  showValidationError(errorMessage, onFix, onAutoBalance = null) {
    this.showComputingModal(false);
    const existing = document.getElementById('validation-error-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'validation-error-modal';
    modal.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in';

    modal.innerHTML = `
      <div class="glass-card p-6 rounded-3xl max-w-md w-full text-white shadow-2xl border border-rose-500/30 flex flex-col gap-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-bold text-white">Scan Verification</h3>
            <p class="text-xs text-rose-300">Adjustment needed before solving</p>
          </div>
        </div>

        <p class="text-xs text-slate-300 bg-white/5 p-3 rounded-xl border border-white/10 leading-relaxed font-mono">
          ${errorMessage}
        </p>

        <div class="flex flex-col sm:flex-row gap-2 mt-1">
          ${onAutoBalance ? `
            <button id="btn-autobalance" class="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-black text-xs hover:opacity-95 transition active:scale-95 flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
              Auto-Balance & Solve
            </button>
          ` : ''}
          <button id="btn-review-faces" class="flex-1 py-3 px-4 rounded-xl ${onAutoBalance ? 'bg-white/10 hover:bg-white/15 text-white' : 'bg-white text-slate-950'} font-bold text-xs transition active:scale-95 cursor-pointer">
            Review & Edit Faces
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const autoBtn = modal.querySelector('#btn-autobalance');
    if (autoBtn) {
      autoBtn.addEventListener('click', () => {
        modal.remove();
        if (onAutoBalance) onAutoBalance();
      });
    }

    modal.querySelector('#btn-review-faces').addEventListener('click', () => {
      modal.remove();
      if (onFix) onFix();
    });
  }
}
