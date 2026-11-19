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
    this.onConfirmNextFace = callbacks.onConfirmNextFace || (() => {});
    this.onRetakeFace = callbacks.onRetakeFace || (() => {});
    this.onToggleAutoCapture = callbacks.onToggleAutoCapture || (() => {});
    this.onAutoBalanceRequested = callbacks.onAutoBalanceRequested || (() => {});

    this.autoCaptureEnabled = true;
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
    const sequence = this.appState.getActiveFaceSequence();
    const currentFace = sequence[this.appState.scanIndex];
    const captured = currentFace ? this.appState.scannedFaces[currentFace.key] : null;

    if (captured && captured.length === 9) {
      // Freeze probe display on captured face colors
      this.probeElements.forEach((el, i) => {
        const key = captured[i];
        const dot = el.querySelector('.probe-dot');
        const text = el.querySelector('.probe-text');
        if (dot && text && key) {
          const hex = COLOR_DISPLAY[key]?.hex || '#333';
          dot.style.backgroundColor = hex;
          dot.style.borderColor = '#10b981';
          text.innerText = key;
          text.style.color = key === 'U' || key === 'D' ? '#000' : '#FFF';
        }
      });
      return;
    }

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

  getColorTallies() {
    const isPyraminx = this.appState.puzzleType === 'pyraminx';
    const keys = isPyraminx ? ['F', 'R', 'B', 'D'] : ['U', 'R', 'F', 'D', 'L', 'B'];
    const tallies = {};
    keys.forEach(k => { tallies[k] = 0; });

    Object.values(this.appState.scannedFaces).forEach(faceColors => {
      if (Array.isArray(faceColors)) {
        faceColors.forEach(c => {
          if (tallies[c] !== undefined) tallies[c]++;
        });
      }
    });

    return tallies;
  }

  renderPyraminxFaceMini(faceKey) {
    const face = this.appState.scannedFaces[faceKey];
    const defaultColor = faceKey === 'F' ? 'F' : (faceKey === 'L' ? 'R' : (faceKey === 'R' ? 'B' : 'D'));
    const stickers = face && face.length === 9 ? face : Array(9).fill(defaultColor);

    const renderTile = (idx) => {
      const c = stickers[idx];
      const meta = COLOR_DISPLAY[c] || DEFAULT_CALIBRATION[c] || { hex: '#334155', textColor: '#FFF' };
      return `
        <div class="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-[2px] flex items-center justify-center font-black text-[8px] cursor-pointer hover:scale-125 transition-transform shadow-sm"
             style="background-color: ${meta.hex}; color: ${meta.textColor || '#FFF'}"
             data-tile-index="${idx}"
             data-face-key="${faceKey}"
             title="${faceKey} Tile ${idx + 1} (${meta.name || c}) - Tap to edit">
          ${c}
        </div>
      `;
    };

    return `
      <div class="flex flex-col items-center gap-[2px] p-1.5 bg-black/80 rounded-xl border border-white/20 shadow-md" title="${faceKey} Face (Tap sticker to edit)">
        <!-- Row 0: 1 Tip Sticker (0) -->
        <div class="flex justify-center">
          ${renderTile(0)}
        </div>
        <!-- Row 1: 3 Stickers (1, 2, 3) -->
        <div class="flex justify-center gap-[2px]">
          ${renderTile(1)}
          ${renderTile(2)}
          ${renderTile(3)}
        </div>
        <!-- Row 2: 5 Stickers (4, 5, 6, 7, 8) -->
        <div class="flex justify-center gap-[2px]">
          ${renderTile(4)}
          ${renderTile(5)}
          ${renderTile(6)}
          ${renderTile(7)}
          ${renderTile(8)}
        </div>
      </div>
    `;
  }

  renderNetFaceMini(faceKey) {
    if (this.appState.puzzleType === 'pyraminx') {
      return this.renderPyraminxFaceMini(faceKey);
    }
    const face = this.appState.scannedFaces[faceKey];
    if (!face || face.length !== 9) {
      return `
        <div class="grid grid-cols-3 grid-rows-3 gap-[1px] p-0.5 bg-black/60 rounded border border-white/20 w-11 h-11">
          ${Array(9).fill(0).map(() => '<div class="bg-slate-700 rounded-[1px]"></div>').join('')}
        </div>
      `;
    }
    return `
      <div class="grid grid-cols-3 grid-rows-3 gap-[1px] p-0.5 bg-black/80 rounded border border-white/20 w-11 h-11 sm:w-12 sm:h-12 shadow" title="${faceKey} Face (Tap sticker to edit)">
        ${face.map((colorKey, idx) => `
          <div class="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-[1px] cursor-pointer hover:scale-125 transition-transform"
               style="background-color: ${COLOR_DISPLAY[colorKey]?.hex || '#333'}"
               data-tile-index="${idx}"
               data-face-key="${faceKey}">
          </div>
        `).join('')}
      </div>
    `;
  }

  // Render Bottom Preview Card: Live Camera / Face Confirmation / Full Net Review
  renderBottomPreview() {
    const sequence = this.appState.getActiveFaceSequence();
    const currentIndex = this.appState.scanIndex;
    const currentFace = sequence[currentIndex] || sequence[0];
    const totalFaces = this.appState.getTotalFaces();
    const isCaptured = this.appState.scannedFaces[currentFace.key] !== null;
    const allScanned = Object.values(this.appState.scannedFaces).filter(Boolean).length === totalFaces;
    const isPyraminx = this.appState.puzzleType === 'pyraminx';

    // 1. STATE 1: ALL 6 FACES SCANNED -> FULL NET REVIEW SCREEN
    if (allScanned) {
      const tallies = this.getColorTallies();
      const is3x3 = !isPyraminx;
      const isPerfect = Object.values(tallies).every(count => count === 9);

      this.bottomPreviewEl.innerHTML = `
        <div class="glass-card hud-bottom-card px-3.5 py-3 sm:px-5 sm:py-3.5 rounded-2xl sm:rounded-3xl max-w-xl w-full mx-auto text-white shadow-2xl flex flex-col gap-2.5 border border-white/20 animate-fade-in max-h-[46vh] sm:max-h-[50vh] overflow-y-auto">
          <!-- Top Header -->
          <div class="flex items-center justify-between pb-1 border-b border-white/10">
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 rounded-full ${isPerfect ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}"></div>
              <h3 class="text-xs sm:text-sm font-black uppercase tracking-wide text-white">
                ${is3x3 ? '6-Face Cube Review' : 'Pyraminx Review'}
              </h3>
            </div>
            <span class="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full ${isPerfect ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}">
              ${isPerfect ? '✓ 100% Balanced' : '⚠️ Adjust Glare'}
            </span>
          </div>

          <!-- Color Tallies Row -->
          <div class="grid ${is3x3 ? 'grid-cols-6' : 'grid-cols-4'} gap-1 sm:gap-1.5 py-1 px-2 bg-black/40 rounded-xl border border-white/10">
            ${(is3x3 ? ['U', 'R', 'F', 'D', 'L', 'B'] : ['F', 'R', 'B', 'D']).map(k => {
              const count = tallies[k] || 0;
              const meta = COLOR_DISPLAY[k] || DEFAULT_CALIBRATION[k];
              const ok = count === 9;
              return `
                <div class="flex flex-col items-center gap-0.5">
                  <div class="w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center font-bold text-[10px] sm:text-xs shadow" style="background-color: ${meta.hex}; color: ${k === 'U' || k === 'D' ? '#000' : '#FFF'}">
                    ${k}
                  </div>
                  <span class="text-[9px] sm:text-[10px] font-mono font-black ${ok ? 'text-emerald-400' : 'text-amber-400 underline'}">
                    ${count}/9
                  </span>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Unfolded Net View (Cross Layout for 3x3, 4 Triangular Faces for Pyraminx) -->
          ${is3x3 ? `
            <div class="flex flex-col items-center gap-1 py-1">
              <span class="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Unfolded Net (Tap sticker to edit)</span>
              <!-- Row 1: U (Top) -->
              <div class="flex justify-center">
                ${this.renderNetFaceMini('U')}
              </div>
              <!-- Row 2: L, F, R, B -->
              <div class="flex justify-center gap-1 sm:gap-1.5">
                ${this.renderNetFaceMini('L')}
                ${this.renderNetFaceMini('F')}
                ${this.renderNetFaceMini('R')}
                ${this.renderNetFaceMini('B')}
              </div>
              <!-- Row 3: D (Bottom) -->
              <div class="flex justify-center">
                ${this.renderNetFaceMini('D')}
              </div>
            </div>
          ` : `
            <div class="grid grid-cols-4 gap-1.5 sm:gap-2 py-1">
              ${[
                { key: 'F', name: 'Front', color: 'Green' },
                { key: 'L', name: 'Left', color: 'Red' },
                { key: 'R', name: 'Right', color: 'Blue' },
                { key: 'D', name: 'Bottom', color: 'Yellow' }
              ].map(faceInfo => `
                <div class="flex flex-col items-center gap-1 p-1 sm:p-1.5 bg-black/50 rounded-xl border border-white/10">
                  <span class="text-[9px] sm:text-[10px] font-bold text-slate-200 truncate">${faceInfo.name} (${faceInfo.color})</span>
                  ${this.renderPyraminxFaceMini(faceInfo.key)}
                </div>
              `).join('')}
            </div>
          `}

          <!-- Action Buttons -->
          <div class="flex flex-col gap-2 pt-1 border-t border-white/10">
            ${isPerfect ? `
              <button id="btn-solve-now" class="w-full py-3 px-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 text-slate-950 font-black text-sm sm:text-base shadow-xl hover:opacity-95 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer shadow-emerald-500/30">
                <svg class="w-5 h-5 text-slate-950" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                <span>${isPyraminx ? 'Solve Pyraminx 🚀' : 'Solve Cube (15–20 Optimal Moves) 🚀'}</span>
              </button>
            ` : `
              <button id="btn-autofix-glare" class="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-400 text-slate-950 font-black text-xs sm:text-sm shadow-xl hover:opacity-95 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer shadow-amber-500/25">
                <svg class="w-4 h-4 text-slate-950" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                <span>Auto-Fix Lighting Glare & Balance to 9 Each</span>
              </button>
            `}

            <div class="flex gap-2">
              <button id="btn-retake-any" class="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                <span>Rescan a Face</span>
              </button>
              ${!isPerfect ? `
                <button id="btn-force-solve" class="py-2 px-3 rounded-xl bg-white/15 hover:bg-white/20 text-white text-xs font-bold transition active:scale-95 cursor-pointer">
                  Solve Anyway
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

      const autoFixBtn = this.bottomPreviewEl.querySelector('#btn-autofix-glare');
      if (autoFixBtn) {
        autoFixBtn.addEventListener('click', () => {
          this.onAutoBalanceRequested();
        });
      }

      const forceSolveBtn = this.bottomPreviewEl.querySelector('#btn-force-solve');
      if (forceSolveBtn) {
        forceSolveBtn.addEventListener('click', () => {
          this.appState.sounds.playClick();
          this.onSolveRequested();
        });
      }

      const retakeAnyBtn = this.bottomPreviewEl.querySelector('#btn-retake-any');
      if (retakeAnyBtn) {
        retakeAnyBtn.addEventListener('click', () => {
          this.appState.sounds.playClick();
          this.appState.scanIndex = 0;
          this.renderTopHud();
          this.renderBottomPreview();
          this.onFaceSelected(0);
        });
      }

    // 2. STATE 2: CURRENT FACE CAPTURED -> REVIEW & CONFIRM CARD
    } else if (isCaptured) {
      const faceColors = this.appState.scannedFaces[currentFace.key];
      this.bottomPreviewEl.innerHTML = `
        <div class="glass-card hud-bottom-card px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl sm:rounded-3xl max-w-xl w-full mx-auto text-white shadow-2xl flex flex-col gap-3 border border-emerald-500/30 animate-fade-in">
          <!-- Header -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
              <span class="text-xs sm:text-sm font-black text-emerald-400">
                ✓ ${currentFace.name} (${currentFace.colorName}) Face Captured
              </span>
            </div>
            <span class="text-[10px] sm:text-xs text-slate-300 font-mono font-bold bg-white/10 px-2 py-0.5 rounded-full">
              Face ${currentIndex + 1} of ${totalFaces}
            </span>
          </div>

          <!-- Middle Row: Interactive 9-Sticker Preview + Verification Notice -->
          <div class="flex items-center justify-between gap-3 bg-black/40 p-2.5 rounded-xl border border-white/10">
            ${isPyraminx ? `
              <!-- Triangular 9-Sticker Layout for Pyraminx -->
              <div class="flex flex-col items-center gap-[2px] shrink-0 p-1 bg-black/60 rounded-xl border border-white/15">
                <div class="flex justify-center">
                  <div class="w-6 h-6 rounded-[2px] flex items-center justify-center font-black text-[10px] cursor-pointer hover:scale-110 hover:ring-2 hover:ring-white transition-all shadow"
                       style="background-color: ${COLOR_DISPLAY[faceColors[0]]?.hex || '#333'}; color: ${COLOR_DISPLAY[faceColors[0]]?.textColor || '#FFF'}"
                       data-tile-index="0" data-face-key="${currentFace.key}" title="Tap to change color">
                    ${faceColors[0]}
                  </div>
                </div>
                <div class="flex justify-center gap-[2px]">
                  ${[1, 2, 3].map(tileIdx => `
                    <div class="w-6 h-6 rounded-[2px] flex items-center justify-center font-black text-[10px] cursor-pointer hover:scale-110 hover:ring-2 hover:ring-white transition-all shadow"
                         style="background-color: ${COLOR_DISPLAY[faceColors[tileIdx]]?.hex || '#333'}; color: ${COLOR_DISPLAY[faceColors[tileIdx]]?.textColor || '#FFF'}"
                         data-tile-index="${tileIdx}" data-face-key="${currentFace.key}" title="Tap to change color">
                      ${faceColors[tileIdx]}
                    </div>
                  `).join('')}
                </div>
                <div class="flex justify-center gap-[2px]">
                  ${[4, 5, 6, 7, 8].map(tileIdx => `
                    <div class="w-5 h-5 sm:w-6 sm:h-6 rounded-[2px] flex items-center justify-center font-black text-[9px] sm:text-[10px] cursor-pointer hover:scale-110 hover:ring-2 hover:ring-white transition-all shadow"
                         style="background-color: ${COLOR_DISPLAY[faceColors[tileIdx]]?.hex || '#333'}; color: ${COLOR_DISPLAY[faceColors[tileIdx]]?.textColor || '#FFF'}"
                         data-tile-index="${tileIdx}" data-face-key="${currentFace.key}" title="Tap to change color">
                      ${faceColors[tileIdx]}
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : `
              <!-- 9-Sticker Grid for 3x3 -->
              <div class="grid grid-cols-3 grid-rows-3 gap-1 shrink-0 p-1 bg-black/60 rounded-lg border border-white/15">
                ${faceColors.map((colorKey, tileIdx) => `
                  <div class="w-6 h-6 sm:w-7 sm:h-7 rounded-[3px] flex items-center justify-center font-black text-[10px] cursor-pointer hover:scale-110 hover:ring-2 hover:ring-white transition-all shadow"
                       style="background-color: ${COLOR_DISPLAY[colorKey]?.hex || '#333'}; color: ${colorKey === 'U' || colorKey === 'D' ? '#000' : '#FFF'}"
                       data-tile-index="${tileIdx}"
                       data-face-key="${currentFace.key}"
                       title="Tap to change color">
                    ${colorKey}
                  </div>
                `).join('')}
              </div>
            `}

            <!-- Hint text -->
            <div class="flex-1 min-w-0">
              <p class="text-xs font-bold text-white leading-snug">
                Check against your ${isPyraminx ? 'Pyraminx' : 'cube'}
              </p>
              <p class="text-[10px] sm:text-[11px] text-slate-300 mt-0.5 leading-tight">
                Tap any sticker if room lighting or glare caused a mistake.
              </p>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center gap-2 pt-0.5">
            <button id="btn-retake-face" class="py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl sm:rounded-2xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs sm:text-sm font-bold transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              <span>Retake</span>
            </button>

            <button id="btn-confirm-face" class="flex-1 py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl sm:rounded-2xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-black text-xs sm:text-sm shadow-xl active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer shadow-cyan-500/25">
              <span>Confirm & Next Face</span>
              <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
            </button>
          </div>
        </div>
      `;

      const confirmBtn = this.bottomPreviewEl.querySelector('#btn-confirm-face');
      if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
          this.onConfirmNextFace();
        });
      }

      const retakeBtn = this.bottomPreviewEl.querySelector('#btn-retake-face');
      if (retakeBtn) {
        retakeBtn.addEventListener('click', () => {
          this.onRetakeFace();
        });
      }

    // 3. STATE 3: LIVE CAMERA / NOT YET CAPTURED
    } else {
      this.bottomPreviewEl.innerHTML = `
        <div class="glass-card hud-bottom-card px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl sm:rounded-3xl max-w-xl w-full mx-auto text-white shadow-2xl flex flex-col gap-2.5 border border-white/15">
          <!-- Status Line -->
          <div class="flex items-center justify-between text-xs sm:text-sm font-bold">
            <div class="flex items-center gap-2 min-w-0">
              <span class="text-cyan-400 font-mono font-black">${currentIndex + 1}/${totalFaces} Faces</span>
              <span class="text-slate-400">•</span>
              <span id="auto-capture-status" class="text-slate-200 font-semibold truncate max-w-[200px] sm:max-w-none">
                Align ${currentFace.name} (${currentFace.colorName} ${isPyraminx ? 'face' : 'center'})
              </span>
            </div>

            <!-- Auto-Capture Toggle Pill -->
            <button id="btn-toggle-autocap" class="px-2 py-0.5 rounded-md text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ${this.autoCaptureEnabled ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-white/10 text-slate-400 border border-white/15'}" title="Toggle Auto-Capture">
              <span>${this.autoCaptureEnabled ? '⚡ Auto ON' : '📸 Manual'}</span>
            </button>
          </div>

          <!-- Progress Meter -->
          <div class="w-full bg-white/15 rounded-full h-1.5 sm:h-2 overflow-hidden">
            <div id="capture-progress-fill" class="bg-gradient-to-r from-cyan-400 to-emerald-400 h-full rounded-full transition-all duration-150" style="width: 0%"></div>
          </div>

          <!-- Action Row: Mini Preview + Capture Face Button + Nav Arrows -->
          <div class="flex items-center justify-between gap-2.5 pt-0.5">
            <!-- Mini live preview grid -->
            ${isPyraminx ? `
              <div id="live-color-grid" class="flex flex-col items-center gap-[2px] p-1 bg-black/70 rounded-xl border border-white/20 shrink-0 shadow-md">
                <div class="flex justify-center">
                  <div class="live-tile w-2 h-2 rounded-[1px]" style="background-color: #334155" data-tile-index="0"></div>
                </div>
                <div class="flex justify-center gap-[2px]">
                  <div class="live-tile w-2 h-2 rounded-[1px]" style="background-color: #334155" data-tile-index="1"></div>
                  <div class="live-tile w-2 h-2 rounded-[1px]" style="background-color: #334155" data-tile-index="2"></div>
                  <div class="live-tile w-2 h-2 rounded-[1px]" style="background-color: #334155" data-tile-index="3"></div>
                </div>
                <div class="flex justify-center gap-[1px]">
                  <div class="live-tile w-1.5 h-1.5 rounded-[1px]" style="background-color: #334155" data-tile-index="4"></div>
                  <div class="live-tile w-1.5 h-1.5 rounded-[1px]" style="background-color: #334155" data-tile-index="5"></div>
                  <div class="live-tile w-1.5 h-1.5 rounded-[1px]" style="background-color: #334155" data-tile-index="6"></div>
                  <div class="live-tile w-1.5 h-1.5 rounded-[1px]" style="background-color: #334155" data-tile-index="7"></div>
                  <div class="live-tile w-1.5 h-1.5 rounded-[1px]" style="background-color: #334155" data-tile-index="8"></div>
                </div>
              </div>
            ` : `
              <div id="live-color-grid" class="grid grid-cols-3 grid-rows-3 gap-[2px] w-9 h-9 p-1 bg-black/70 rounded-xl border border-white/20 shrink-0 shadow-md">
                ${Array(9).fill(0).map((_, i) => `
                  <div class="live-tile w-2 h-2 rounded-[1px]" style="background-color: #334155" data-tile-index="${i}"></div>
                `).join('')}
              </div>
            `}

            <!-- Big Manual Capture Button -->
            <div class="flex-1">
              <button id="btn-manual-capture" class="w-full py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl sm:rounded-2xl bg-white text-slate-950 font-black text-xs sm:text-sm shadow-xl hover:bg-slate-100 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer">
                <div class="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-md shadow-emerald-500/50 animate-pulse"></div>
                <span>Capture Face</span>
              </button>
            </div>

            <!-- Prev / Next Navigation Arrows -->
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

      const captureBtn = this.bottomPreviewEl.querySelector('#btn-manual-capture');
      if (captureBtn) {
        captureBtn.addEventListener('click', () => {
          this.onManualCapture();
        });
      }

      const autoCapToggleBtn = this.bottomPreviewEl.querySelector('#btn-toggle-autocap');
      if (autoCapToggleBtn) {
        autoCapToggleBtn.addEventListener('click', () => {
          this.autoCaptureEnabled = !this.autoCaptureEnabled;
          this.onToggleAutoCapture(this.autoCaptureEnabled);
          this.renderBottomPreview();
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
    }

    // Attach click listeners to any sticker tile with data-tile-index
    this.bottomPreviewEl.querySelectorAll('[data-tile-index]').forEach(el => {
      el.addEventListener('click', () => {
        const tileIdx = parseInt(el.getAttribute('data-tile-index'), 10);
        const faceKey = el.getAttribute('data-face-key') || currentFace.key;
        this.openStickerColorPalette(tileIdx, faceKey);
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

  // Manual sticker color correction modal (supports specific faceKey)
  openStickerColorPalette(tileIndex, explicitFaceKey = null) {
    const sequence = this.appState.getActiveFaceSequence();
    const faceKey = explicitFaceKey || sequence[this.appState.scanIndex].key;
    const isPyraminx = this.appState.puzzleType === 'pyraminx';
    const colorChoices = isPyraminx ? ['F', 'R', 'B', 'D'] : ['U', 'D', 'R', 'L', 'F', 'B'];

    const existing = document.getElementById('sticker-palette-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'sticker-palette-modal';
    modal.className = 'fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in';

    modal.innerHTML = `
      <div class="glass-card p-6 rounded-3xl max-w-xs w-full text-white shadow-2xl border border-white/20 flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-base font-bold">Edit ${faceKey} Face Tile ${tileIndex + 1}</h3>
            <p class="text-[11px] text-cyan-300">Tap the color matching your cube:</p>
          </div>
          <button id="btn-close-palette" class="p-1.5 rounded-full hover:bg-white/10 text-slate-400 cursor-pointer">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="grid ${isPyraminx ? 'grid-cols-2' : 'grid-cols-3'} gap-2.5">
          ${colorChoices.map(k => {
            const meta = COLOR_DISPLAY[k] || DEFAULT_CALIBRATION[k];
            return `
              <button class="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 transition active:scale-95 cursor-pointer" data-palette-color="${k}">
                <div class="w-9 h-9 rounded-lg shadow-md flex items-center justify-center font-bold text-xs" style="background-color: ${meta.hex}; color: ${meta.textColor || '#FFF'}">
                  ${k}
                </div>
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
