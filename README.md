# CubeMate 🧊🔺

**CubeMate** is a modern, responsive, mobile-first web application that scans and solves both the **3×3 Rubik's Cube** and the **Pyraminx (Tetrahedron)** using live camera computer vision, optimal solving algorithms, and interactive 3D step-by-step guidance.

---

## 🌟 Key Features

### 🧩 Dual Puzzle Support
* **3×3 Rubik's Cube:** Solved with **Kociemba's Two-Phase Algorithm** (guaranteed optimal moves $\le 22$).
* **Pyraminx (Tetrahedron):** Solved with an **optimal IDA\* heuristic search engine** ($\le 11$ moves).

### 📷 Smart Camera Scanner & Computer Vision
* **Real-time Color Sampling & Classification:** Evaluates colors in RGB, HSV, and CIELAB spaces.
* **Puzzle-Aware Color Guard:** In Pyraminx mode, room glare is prevented from producing invalid "White" or "Orange" stickers.
* **Room Lighting Calibration:** Adapts to variable ambient light with persistent profile storage in `localStorage`.
* **Automatic Stability Capture:** Snaps automatically when holding steady or tap for manual instant shutter.
* **Auto-Balancing:** Automatically resolves minor lighting ambiguities without blocking the user.
* **Dual Viewfinders:**
  * Square 3×3 grid with corner brackets for Rubik's Cube.
  * True regular equilateral triangle with 9 facet centroids for Pyraminx.
  * Quick Viewfinder Size Switcher (`M` | `Big` | `XL`).

### 🎮 Interactive 3D Step-by-Step Solver
* **Realistic Three.js 3D Models:** Renders your exact scanned puzzle. Freely touch-drag to rotate and inspect from any angle.
* **Curved 3D Directional Arrows:** Visualizes clockwise, counter-clockwise, and 180° rotations directly on the puzzle.
* **Step Controls:** Auto-play with adjustable speed (0.75x, 1.0x, 1.5x), Next / Previous navigation, and an interactive Solution Timeline Strip.
* **Clear Notation & Plain English:** Clear, unambiguous labels (e.g., `TIP L' 120°`, `R2 180°`, `Turn Right face 180°`).

### 🎉 Celebration & Demo Mode
* **Victory Celebration:** Multi-cannon confetti explosion (`canvas-confetti`) with audio fanfare upon completion.
* **One-Click Demo Mode:** Instantly loads pre-scrambled 3×3 Cube or Pyraminx to test and explore solutions without physical puzzles.

---

## 🛠️ Tech Stack

* **Frontend:** HTML5, CSS3, JavaScript (ES Modules), Tailwind CSS
* **3D Engine:** Three.js
* **Vision & Audio:** WebRTC (`getUserMedia`), HTML5 Canvas, Web Audio API
* **Solvers:** Kociemba Two-Phase Algorithm + Custom IDA\* Pyraminx Engine
* **Bundler & Dev Server:** Vite

---

## 🚀 Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (v18 or higher recommended)
* npm or pnpm

### Installation
```bash
# Clone the repository
git clone https://github.com/chityalasriram7522/CubeMate.git
cd CubeMate

# Install dependencies
npm install

# Start local development server
npm run dev
```

### Accessing on Mobile (Wi-Fi)
When running `npm run dev -- --host`, Vite will display a Network URL (e.g. `http://192.168.x.x:5173`). Open that URL in your mobile browser on the same Wi-Fi network to use your phone's camera!

### Production Build
```bash
npm run build
npm run preview
```

---

## 📄 License
MIT License. Free to use and customize.
