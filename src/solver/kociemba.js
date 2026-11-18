import Cube from './cubeLib/index.js';
import { validateCubeState, COLOR_NAMES } from './cubeValidator.js';

let isSolverInitialized = false;
let solverInitPromise = null;

export function initSolver() {
  if (isSolverInitialized) return Promise.resolve();
  if (solverInitPromise) return solverInitPromise;

  solverInitPromise = new Promise((resolve) => {
    // Run initialization in a timeout so it doesn't block UI frame render
    setTimeout(() => {
      try {
        Cube.initSolver();
        isSolverInitialized = true;
        console.log('[Kociemba] Solver pruning tables initialized successfully.');
      } catch (err) {
        console.warn('[Kociemba] initSolver fallback/warning:', err);
      }
      resolve();
    }, 50);
  });

  return solverInitPromise;
}

// Convert standard move code into human readable and UI metadata
export function parseMove(rawMove) {
  const trimmed = rawMove.trim();
  if (!trimmed) return null;

  const face = trimmed[0];
  const modifier = trimmed.slice(1);

  let turns = 1;
  let degrees = '90°';
  let dirDesc = 'Clockwise';
  let arrowType = 'CW_90'; // 'CW_90', 'CCW_90', '180'

  if (modifier === '2') {
    turns = 2;
    degrees = '180°';
    dirDesc = '180°';
    arrowType = '180';
  } else if (modifier === "'") {
    turns = -1;
    degrees = '90°';
    dirDesc = 'Counter-Clockwise';
    arrowType = 'CCW_90';
  }

  const faceNames = {
    U: 'Top (White)',
    D: 'Bottom (Yellow)',
    F: 'Front (Green)',
    B: 'Back (Blue)',
    R: 'Right (Red)',
    L: 'Left (Orange)'
  };

  const simpleFaceNames = {
    U: 'Top',
    D: 'Bottom',
    F: 'Front',
    B: 'Back',
    R: 'Right',
    L: 'Left'
  };

  const faceSwatches = {
    U: '#FFFFFF',
    D: '#EAB308',
    F: '#22C55E',
    B: '#3B82F6',
    R: '#EF4444',
    L: '#F97316'
  };

  const notation = `${trimmed} ${degrees}`;
  const shortDesc = `Turn ${simpleFaceNames[face] || face} ${dirDesc} ${modifier !== '2' ? '(90°)' : ''}`.trim();
  const fullDesc = `Turn ${faceNames[face] || face} face ${dirDesc}`.trim();

  return {
    raw: trimmed,
    face,
    modifier,
    turns,
    degrees,
    notation,
    timelineLabel: trimmed,
    shortDesc,
    fullDesc,
    swatches: [faceSwatches[face] || '#38bdf8'],
    vertexColors: faceNames[face] || face,
    holdingInstruction: 'Hold WHITE on top, GREEN in front',
    arrowType
  };
}

export async function solveCube(faceletString) {
  await initSolver();

  // Validate state first
  const validation = validateCubeState(faceletString);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const cube = Cube.fromString(faceletString);
  if (cube.isSolved()) {
    return {
      solvedAlready: true,
      moves: [],
      rawSolution: '',
      totalMoves: 0
    };
  }

  const rawSolution = cube.solve();
  const rawMoveTokens = rawSolution.trim().split(/\s+/).filter(Boolean);
  const parsedMoves = rawMoveTokens.map(parseMove).filter(Boolean);

  return {
    solvedAlready: false,
    rawSolution,
    totalMoves: parsedMoves.length,
    moves: parsedMoves
  };
}

// Generate a valid scrambled demo cube
export function generateDemoCube(scrambleMoves = "R U R' F' U2 D B' R2 F D' L2 B") {
  const cube = new Cube();
  cube.move(scrambleMoves);
  const faceletString = cube.asString();

  // Split into 6 faces (each 9 facelets)
  // Order: U, R, F, D, L, B
  const faceKeys = ['U', 'R', 'F', 'D', 'L', 'B'];
  const faces = {};
  for (let i = 0; i < 6; i++) {
    const key = faceKeys[i];
    const slice = faceletString.slice(i * 9, (i + 1) * 9);
    faces[key] = slice.split('');
  }

  return {
    scrambleMoves,
    faceletString,
    faces
  };
}

