// Step 4: Completion Celebration View
import confetti from 'canvas-confetti';

export class CompletionUI {
  constructor(appState, container, onScanAgain) {
    this.appState = appState;
    this.container = container;
    this.onScanAgain = onScanAgain;
  }

  show(totalMoves = 19) {
    this.appState.sounds.playSuccess();
    this.fireConfettiCannon();

    this.container.classList.remove('hidden');
    this.container.innerHTML = `
      <div class="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
        <div class="glass-card completion-card p-6 sm:p-8 rounded-3xl max-w-sm w-full text-white text-center shadow-2xl border border-white/20 flex flex-col items-center gap-5">
          <!-- Trophy / Solved Glow Icon -->
          <div class="relative">
            <div class="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 flex items-center justify-center shadow-lg ring-8 ring-yellow-400/20 animate-bounce">
              <svg class="w-10 h-10 text-slate-950" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
            <div class="absolute -inset-2 rounded-full bg-yellow-400/30 blur-lg -z-10 animate-pulse"></div>
          </div>

          <!-- Bold Celebration Text -->
          <div class="flex flex-col gap-1">
            <h1 class="text-3xl sm:text-4xl font-black tracking-tight text-white drop-shadow">
              You made it!
            </h1>
            <p class="text-sm font-semibold text-emerald-400">
              Rubik's Cube Solved!
            </p>
            <p class="text-xs text-slate-300 mt-1">
              All moves executed successfully. Your physical cube is back in its solved state.
            </p>
          </div>

          <!-- Stats Badge Row -->
          <div class="grid grid-cols-2 gap-3 w-full bg-black/40 p-3 rounded-2xl border border-white/10">
            <div class="flex flex-col items-center">
              <span class="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Moves</span>
              <span class="text-xl font-black text-cyan-300 font-mono">${totalMoves}</span>
            </div>
            <div class="flex flex-col items-center">
              <span class="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Solution Quality</span>
              <span class="text-xl font-black text-emerald-300 font-mono">Optimal</span>
            </div>
          </div>

          <!-- Translucent "Scan again" Button -->
          <div class="w-full flex flex-col gap-2 pt-2">
            <button id="btn-scan-again" class="w-full py-4 px-6 rounded-2xl bg-white text-slate-950 font-black text-sm shadow-2xl hover:bg-slate-100 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              <span>Scan again</span>
            </button>
            <button id="btn-inspect-solved" class="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-semibold transition cursor-pointer">
              Inspect 3D Model
            </button>
          </div>
        </div>
      </div>
    `;

    this.container.querySelector('#btn-scan-again').addEventListener('click', () => {
      this.appState.sounds.playClick();
      this.hide();
      this.onScanAgain();
    });

    this.container.querySelector('#btn-inspect-solved').addEventListener('click', () => {
      this.appState.sounds.playClick();
      this.hide();
    });
  }

  hide() {
    this.container.classList.add('hidden');
    this.container.innerHTML = '';
  }

  fireConfettiCannon() {
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 9999
    };

    function fire(particleRatio, opts) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio)
      });
    }

    // High energy confetti explosions from sides and center
    fire(0.25, {
      spread: 26,
      startVelocity: 55,
      colors: ['#22c55e', '#3b82f6', '#ef4444', '#eab308', '#f97316', '#ffffff']
    });
    fire(0.2, {
      spread: 60,
      colors: ['#38bdf8', '#a855f7', '#ec4899', '#f59e0b']
    });
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 45
    });

    // Second celebratory blast after 400ms
    setTimeout(() => {
      confetti({
        particleCount: 80,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        zIndex: 9999
      });
      confetti({
        particleCount: 80,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        zIndex: 9999
      });
    }, 400);
  }
}

