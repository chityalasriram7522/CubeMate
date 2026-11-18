// Step 3: 3D Step-by-Step Solution UI
export class SolutionUI {
  constructor(appState, elements, cubeScene, callbacks = {}) {
    this.appState = appState;
    this.container = elements.solutionContainer;
    this.cubeScene = cubeScene;
    this.onCompleted = callbacks.onCompleted || (() => {});

    this.autoPlayTimer = null;
    this.isAnimating = false;
  }

  init(solution) {
    this.solution = solution;
    this.moves = solution.moves || [];
    this.totalMoves = this.moves.length;
    this.currentIndex = 0;
    this.isAutoPlaying = false;
    this.autoPlaySpeed = 1.0;

    // Load initial scanned cube state into 3D scene
    const faceletString = this.appState.getFaceletString();
    if (faceletString) {
      this.cubeScene.loadCubeState(faceletString);
    }

    this.render();
    this.updateCurrentMoveView();
  }

  render() {
    this.container.innerHTML = `
      <div class="glass-card solution-hud-card p-4 sm:p-5 rounded-3xl max-w-lg w-full mx-auto text-white shadow-2xl flex flex-col gap-3 animate-fade-in">
        <!-- Header Row: Move Counter + Auto-play toggle + Prev/Next Buttons -->
        <div class="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
          <!-- Move Counter Badge -->
          <div class="flex items-center gap-2">
            <span class="text-xs uppercase font-extrabold tracking-wider text-slate-400">Move</span>
            <span id="move-counter-badge" class="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-xs font-black border border-cyan-500/30">
              ${this.currentIndex + 1}/${this.totalMoves}
            </span>
          </div>

          <!-- Center: Auto-play Toggle -->
          <div class="flex items-center gap-2">
            <button id="btn-toggle-autoplay" class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-xs font-bold transition active:scale-95 cursor-pointer">
              <span id="autoplay-icon" class="w-3.5 h-3.5 text-cyan-400">
                <svg fill="currentColor" viewBox="0 0 20 20"><path d="M4 4l12 6-12 6V4z"/></svg>
              </span>
              <span id="autoplay-text">Auto-play</span>
            </button>
            <button id="btn-toggle-speed" class="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-mono text-slate-300 transition cursor-pointer">
              1.0x
            </button>
          </div>

          <!-- Prev / Next Navigation Buttons -->
          <div class="flex items-center gap-1.5">
            <button id="btn-prev-move" class="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 disabled:pointer-events-none transition active:scale-95 cursor-pointer" title="Previous Move">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <button id="btn-next-move" class="py-2.5 px-4 rounded-xl bg-white text-slate-950 font-black text-xs shadow-lg hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition active:scale-95 flex items-center gap-1.5 cursor-pointer" title="Next Move">
              <span>Next</span>
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Holding & Orientation Guide Banner -->
        <div id="holding-guide-banner" class="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-200 shadow-sm">
          <div class="flex items-center gap-2">
            <span class="text-base">🧭</span>
            <div>
              <span class="text-[9px] uppercase font-bold text-amber-400 tracking-wider block">How to Hold in Your Hands</span>
              <span id="holding-guide-text" class="text-xs font-bold text-amber-100">
                ${this.moves[0]?.holdingInstruction || 'Hold GREEN in front, YELLOW at bottom'}
              </span>
            </div>
          </div>
          <div id="holding-guide-badges" class="flex items-center gap-1 shrink-0">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-400" title="Green in front"></span>
            <span class="w-2.5 h-2.5 rounded-full bg-amber-400" title="Yellow at bottom"></span>
          </div>
        </div>

        <!-- Main Display: 3D Cube Canvas (Left/Center) + Move Notation Card (Right/Bottom) -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 py-1">
          <!-- 3D Cube Canvas Container -->
          <div class="relative w-full sm:w-3/5 h-64 sm:h-72 flex items-center justify-center bg-black/50 rounded-2xl border border-white/10 overflow-hidden shadow-inner">
            <div id="three-canvas-slot" class="w-full h-full relative flex items-center justify-center"></div>
            <!-- Orbit Drag Hint & Reset View Button -->
            <button id="btn-reset-view" class="absolute bottom-2.5 right-2.5 p-2 rounded-xl bg-black/60 hover:bg-black/80 text-slate-300 hover:text-white border border-white/15 text-[11px] font-medium backdrop-blur-sm transition flex items-center gap-1 cursor-pointer z-10">
              <svg class="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              <span>Reset View</span>
            </button>
            <span class="absolute top-2.5 left-2.5 text-[10px] text-slate-400 bg-black/50 px-2 py-0.5 rounded-full pointer-events-none z-10">
              Drag to inspect 3D
            </span>
          </div>

          <!-- Move Notation & Instruction Label -->
          <div class="w-full sm:w-2/5 flex flex-col justify-center items-center sm:items-start text-center sm:text-left gap-2 p-3.5 bg-white/5 rounded-2xl border border-white/10">
            <div class="flex items-center justify-between w-full">
              <span class="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Step Action</span>
              <span id="turn-direction-pill" class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                120° Turn
              </span>
            </div>

            <!-- Large Bold Move Notation: e.g. TIP L' 120° or R2 180° -->
            <div id="move-notation-label" class="text-2xl sm:text-3xl font-black tracking-tight text-white font-mono drop-shadow-md">
              --
            </div>

            <!-- Plain English Subtitle -->
            <p id="move-desc-label" class="text-xs text-slate-200 font-medium leading-snug">
              Prepare to start
            </p>

            <!-- Vertex / Face Sticker Swatches Card -->
            <div id="vertex-swatches-card" class="w-full mt-1 p-2 rounded-xl bg-black/40 border border-white/10 flex flex-col gap-1">
              <div class="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Target Piece Colors:</div>
              <div id="vertex-swatches-list" class="flex items-center gap-1.5 flex-wrap"></div>
            </div>
          </div>
        </div>

        <!-- Move Sequence Timeline Strip -->
        <div class="flex flex-col gap-1.5 pt-1">
          <div class="flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span>Solution Timeline</span>
            <span id="timeline-progress-text">${this.currentIndex} of ${this.totalMoves} done</span>
          </div>
          <div id="move-timeline-strip" class="flex gap-1.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/20">
            ${this.moves.map((m, idx) => `
              <button class="timeline-step-btn px-2.5 py-1 rounded-lg text-xs font-mono font-bold shrink-0 transition-all cursor-pointer ${idx === 0 ? 'bg-cyan-500 text-slate-950 ring-2 ring-white' : 'bg-white/10 text-slate-300 hover:bg-white/20'}" data-move-idx="${idx}">
                ${m.timelineLabel || (m.isTip ? ('Tip ' + m.face + (m.modifier || '')) : m.raw)}
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    // Move Three.js renderer into the slot
    const slot = this.container.querySelector('#three-canvas-slot');
    if (slot && this.cubeScene) {
      this.cubeScene.mountTo(slot);
      this.cubeScene.resetView();
    }

    // Attach Event Handlers
    this.container.querySelector('#btn-prev-move').addEventListener('click', () => {
      this.handlePrev();
    });

    this.container.querySelector('#btn-next-move').addEventListener('click', () => {
      this.handleNext();
    });

    this.container.querySelector('#btn-toggle-autoplay').addEventListener('click', () => {
      this.toggleAutoPlay();
    });

    this.container.querySelector('#btn-toggle-speed').addEventListener('click', (e) => {
      this.cycleSpeed(e.currentTarget);
    });

    this.container.querySelector('#btn-reset-view').addEventListener('click', () => {
      this.cubeScene.resetView();
    });

    // Timeline step jumps
    this.container.querySelectorAll('.timeline-step-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetIdx = parseInt(btn.getAttribute('data-move-idx'), 10);
        this.jumpToMove(targetIdx);
      });
    });
  }

  updateCurrentMoveView() {
    if (this.currentIndex >= this.totalMoves) {
      // Completed all moves!
      this.stopAutoPlay();
      this.cubeScene.clearArrow();
      this.onCompleted();
      return;
    }

    const currentMove = this.moves[this.currentIndex];
    const prevBtn = this.container.querySelector('#btn-prev-move');
    const nextBtn = this.container.querySelector('#btn-next-move');
    const badge = this.container.querySelector('#move-counter-badge');
    const notationLabel = this.container.querySelector('#move-notation-label');
    const descLabel = this.container.querySelector('#move-desc-label');
    const dirPill = this.container.querySelector('#turn-direction-pill');
    const swatchesList = this.container.querySelector('#vertex-swatches-list');
    const holdingGuideText = this.container.querySelector('#holding-guide-text');
    const progressText = this.container.querySelector('#timeline-progress-text');

    if (badge) badge.innerText = `${this.currentIndex + 1}/${this.totalMoves}`;
    if (prevBtn) prevBtn.disabled = this.currentIndex <= 0;
    if (nextBtn) {
      nextBtn.innerHTML = this.currentIndex === this.totalMoves - 1
        ? `<span>Finish</span><svg class="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>`
        : `<span>Next</span><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>`;
    }

    if (currentMove) {
      if (holdingGuideText && currentMove.holdingInstruction) {
        holdingGuideText.innerText = currentMove.holdingInstruction;
      }
      if (notationLabel) notationLabel.innerText = currentMove.notation;
      if (descLabel) descLabel.innerText = currentMove.fullDesc;

      if (dirPill) {
        const isCounter = currentMove.modifier === "'";
        const isDouble = currentMove.modifier === '2';
        if (isDouble) {
          dirPill.innerText = '180° Half Turn';
          dirPill.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30';
        } else if (isCounter) {
          dirPill.innerText = '↺ Counter-Clockwise';
          dirPill.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30';
        } else {
          dirPill.innerText = '↻ Clockwise';
          dirPill.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30';
        }
      }

      if (swatchesList) {
        const swatches = currentMove.swatches || [];
        const labelText = currentMove.vertexColors || currentMove.face || '';
        swatchesList.innerHTML = `
          <div class="flex items-center gap-1.5">
            ${swatches.map(hex => `<span class="w-3.5 h-3.5 rounded-full border border-white/40 shadow-sm" style="background-color: ${hex}"></span>`).join('')}
          </div>
          <span class="text-[11px] font-bold text-slate-200">${labelText}</span>
        `;
      }

      // Display 3D curved directional arrow on the active face
      this.cubeScene.showMove(currentMove);
    }

    if (progressText) {
      progressText.innerText = `${this.currentIndex} of ${this.totalMoves} done`;
    }

    // Highlight active timeline pill and scroll into view
    this.container.querySelectorAll('.timeline-step-btn').forEach((btn, idx) => {
      if (idx === this.currentIndex) {
        btn.className = 'timeline-step-btn px-2.5 py-1 rounded-lg text-xs font-mono font-bold shrink-0 transition-all cursor-pointer bg-cyan-400 text-slate-950 ring-2 ring-white scale-105';
        btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      } else if (idx < this.currentIndex) {
        btn.className = 'timeline-step-btn px-2.5 py-1 rounded-lg text-xs font-mono font-bold shrink-0 transition-all cursor-pointer bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
      } else {
        btn.className = 'timeline-step-btn px-2.5 py-1 rounded-lg text-xs font-mono font-bold shrink-0 transition-all cursor-pointer bg-white/10 text-slate-300 hover:bg-white/20';
      }
    });
  }

  async handleNext() {
    if (this.isAnimating || this.currentIndex >= this.totalMoves) return;
    this.isAnimating = true;

    const currentMove = this.moves[this.currentIndex];
    this.appState.sounds.playClick();

    // Duration scales with speed
    const duration = Math.round(380 / this.autoPlaySpeed);
    await this.cubeScene.applyMove(currentMove, false, duration);

    this.currentIndex++;
    this.isAnimating = false;
    this.updateCurrentMoveView();
  }

  async handlePrev() {
    if (this.isAnimating || this.currentIndex <= 0) return;
    this.isAnimating = true;

    this.currentIndex--;
    const moveReversed = this.moves[this.currentIndex];
    this.appState.sounds.playClick();

    const duration = Math.round(380 / this.autoPlaySpeed);
    await this.cubeScene.applyMove(moveReversed, true, duration);

    this.isAnimating = false;
    this.updateCurrentMoveView();
  }

  async jumpToMove(targetIndex) {
    if (this.isAnimating || targetIndex === this.currentIndex) return;
    this.stopAutoPlay();

    // Replay moves sequentially
    if (targetIndex > this.currentIndex) {
      while (this.currentIndex < targetIndex) {
        const m = this.moves[this.currentIndex];
        await this.cubeScene.applyMove(m, false, 80);
        this.currentIndex++;
      }
    } else {
      while (this.currentIndex > targetIndex) {
        this.currentIndex--;
        const m = this.moves[this.currentIndex];
        await this.cubeScene.applyMove(m, true, 80);
      }
    }

    this.updateCurrentMoveView();
  }

  toggleAutoPlay() {
    if (this.isAutoPlaying) {
      this.stopAutoPlay();
    } else {
      this.startAutoPlay();
    }
  }

  startAutoPlay() {
    this.isAutoPlaying = true;
    const btn = this.container.querySelector('#btn-toggle-autoplay');
    const icon = this.container.querySelector('#autoplay-icon');
    const text = this.container.querySelector('#autoplay-text');

    if (btn) btn.classList.add('bg-cyan-500/30', 'border', 'border-cyan-400');
    if (icon) icon.innerHTML = `<svg fill="currentColor" viewBox="0 0 20 20"><path d="M5 4h3v12H5V4zm7 0h3v12h-3V4z"/></svg>`;
    if (text) text.innerText = 'Pause';

    this.runAutoPlayStep();
  }

  stopAutoPlay() {
    this.isAutoPlaying = false;
    if (this.autoPlayTimer) {
      clearTimeout(this.autoPlayTimer);
      this.autoPlayTimer = null;
    }

    const btn = this.container.querySelector('#btn-toggle-autoplay');
    const icon = this.container.querySelector('#autoplay-icon');
    const text = this.container.querySelector('#autoplay-text');

    if (btn) btn.classList.remove('bg-cyan-500/30', 'border', 'border-cyan-400');
    if (icon) icon.innerHTML = `<svg fill="currentColor" viewBox="0 0 20 20"><path d="M4 4l12 6-12 6V4z"/></svg>`;
    if (text) text.innerText = 'Auto-play';
  }

  runAutoPlayStep() {
    if (!this.isAutoPlaying) return;

    if (this.currentIndex >= this.totalMoves) {
      this.stopAutoPlay();
      return;
    }

    this.autoPlayTimer = setTimeout(async () => {
      if (!this.isAutoPlaying) return;
      await this.handleNext();
      if (this.isAutoPlaying && this.currentIndex < this.totalMoves) {
        this.runAutoPlayStep();
      }
    }, Math.round(1100 / this.autoPlaySpeed));
  }

  cycleSpeed(speedBtn) {
    const speeds = [1.0, 1.5, 0.75];
    const currIdx = speeds.indexOf(this.autoPlaySpeed);
    this.autoPlaySpeed = speeds[(currIdx + 1) % speeds.length];
    if (speedBtn) {
      speedBtn.innerText = `${this.autoPlaySpeed}x`;
    }
  }
}

