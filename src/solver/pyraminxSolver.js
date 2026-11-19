// Pyraminx (Tetrahedron) State representation, Validator, Scrambler & Optimal IDA* Solver

export const PYRAMINX_COLORS = {
  F: { name: 'Green', hex: '#22C55E', face: 'Front' },
  R: { name: 'Red', hex: '#EF4444', face: 'Left' },
  B: { name: 'Blue', hex: '#3B82F6', face: 'Right' },
  D: { name: 'Yellow', hex: '#EAB308', face: 'Bottom' }
};

export const PYRAMINX_FACE_SEQUENCE = [
  { key: 'F', name: 'Front', colorName: 'Green', colorKey: 'F', center: 'F', instruction: 'Hold GREEN face to camera, YELLOW at bottom, RED on left, BLUE on right.' },
  { key: 'L', name: 'Left', colorName: 'Red', colorKey: 'R', center: 'R', instruction: 'Rotate Pyraminx to show RED face, YELLOW at bottom, BLUE at back.' },
  { key: 'R', name: 'Right', colorName: 'Blue', colorKey: 'B', center: 'B', instruction: 'Rotate Pyraminx to show BLUE face, YELLOW at bottom, RED at back.' },
  { key: 'D', name: 'Bottom', colorName: 'Yellow', colorKey: 'D', center: 'D', instruction: 'Tilt Pyraminx to show YELLOW face, BACK vertex pointing UP, GREEN face at bottom.' }
];

export function normalizePyraminxColor(c, faceKey = null) {
  if (c === 'G' || c === 'F') return 'F'; // Green
  if (c === 'R' || (c === 'L' && faceKey !== 'L')) return 'R'; // Red
  if (c === 'B') return 'B';              // Blue
  if (c === 'Y' || c === 'D') return 'D'; // Yellow
  if (c === 'U' || c === 'White' || c === 'L' || c === 'Orange') {
    // Pyraminx has no White or Orange - specular glare or camera white-balance shift
    const faceColorMap = { F: 'F', L: 'R', R: 'B', D: 'D' };
    return (faceKey && faceColorMap[faceKey]) ? faceColorMap[faceKey] : 'F';
  }
  return c;
}

// Pyraminx piece indexing:
// 6 Edges:
// 0: FL (F[1], L[3]), 1: FR (F[3], R[1]), 2: FD (F[6], D[6]),
// 3: BL (L[6], D[1]), 4: BR (R[6], D[3]), 5: UB (L[1], R[3])
// 4 Centers:
// 0: U (F[2], R[2], L[2])
// 1: L (F[5], L[7], D[5])
// 2: R (F[7], D[7], R[5])
// 3: B (D[2], L[5], R[7])
// 4 Tips:
// 0: u (F[0], R[0], L[0])
// 1: l (F[4], L[8], D[4])
// 2: r (F[8], D[8], R[4])
// 3: b (D[0], L[4], R[8])

export class PyraminxState {
  constructor() {
    this.edges = [0, 1, 2, 3, 4, 5];
    this.edgeOri = [0, 0, 0, 0, 0, 0];
    this.centers = [0, 0, 0, 0];
    this.tips = [0, 0, 0, 0];
  }

  clone() {
    const s = new PyraminxState();
    s.edges = this.edges.slice();
    s.edgeOri = this.edgeOri.slice();
    s.centers = this.centers.slice();
    s.tips = this.tips.slice();
    return s;
  }

  isSolved() {
    for (let i = 0; i < 6; i++) {
      if (this.edges[i] !== i || this.edgeOri[i] !== 0) return false;
    }
    for (let i = 0; i < 4; i++) {
      if (this.centers[i] !== 0 || this.tips[i] !== 0) return false;
    }
    return true;
  }

  isBodySolved() {
    for (let i = 0; i < 6; i++) {
      if (this.edges[i] !== i || this.edgeOri[i] !== 0) return false;
    }
    for (let i = 0; i < 4; i++) {
      if (this.centers[i] !== 0) return false;
    }
    return true;
  }

  // Apply basic move: U, U', L, L', R, R', B, B', u, u', l, l', r, r', b, b'
  applyMove(move) {
    switch (move) {
      case 'U':
        this.centers[0] = (this.centers[0] + 1) % 3;
        this.tips[0] = (this.tips[0] + 1) % 3;
        {
          const e0 = this.edges[0], o0 = this.edgeOri[0];
          const e1 = this.edges[1], o1 = this.edgeOri[1];
          const e5 = this.edges[5], o5 = this.edgeOri[5];
          this.edges[0] = e1; this.edgeOri[0] = 1 - o1;
          this.edges[1] = e5; this.edgeOri[1] = 1 - o5;
          this.edges[5] = e0; this.edgeOri[5] = o0;
        }
        break;

      case "U'":
        this.applyMove('U');
        this.applyMove('U');
        break;

      case 'L':
        this.centers[1] = (this.centers[1] + 1) % 3;
        this.tips[1] = (this.tips[1] + 1) % 3;
        {
          const e0 = this.edges[0], o0 = this.edgeOri[0];
          const e2 = this.edges[2], o2 = this.edgeOri[2];
          const e3 = this.edges[3], o3 = this.edgeOri[3];
          this.edges[0] = e3; this.edgeOri[0] = o3;
          this.edges[2] = e0; this.edgeOri[2] = 1 - o0;
          this.edges[3] = e2; this.edgeOri[3] = 1 - o2;
        }
        break;

      case "L'":
        this.applyMove('L');
        this.applyMove('L');
        break;

      case 'R':
        this.centers[2] = (this.centers[2] + 1) % 3;
        this.tips[2] = (this.tips[2] + 1) % 3;
        {
          const e1 = this.edges[1], o1 = this.edgeOri[1];
          const e2 = this.edges[2], o2 = this.edgeOri[2];
          const e4 = this.edges[4], o4 = this.edgeOri[4];
          this.edges[1] = e2; this.edgeOri[1] = 1 - o2;
          this.edges[2] = e4; this.edgeOri[2] = 1 - o4;
          this.edges[4] = e1; this.edgeOri[4] = o1;
        }
        break;

      case "R'":
        this.applyMove('R');
        this.applyMove('R');
        break;

      case 'B':
        this.centers[3] = (this.centers[3] + 1) % 3;
        this.tips[3] = (this.tips[3] + 1) % 3;
        {
          const e3 = this.edges[3], o3 = this.edgeOri[3];
          const e4 = this.edges[4], o4 = this.edgeOri[4];
          const e5 = this.edges[5], o5 = this.edgeOri[5];
          this.edges[3] = e5; this.edgeOri[3] = 1 - o5;
          this.edges[4] = e3; this.edgeOri[4] = 1 - o3;
          this.edges[5] = e4; this.edgeOri[5] = o4;
        }
        break;

      case "B'":
        this.applyMove('B');
        this.applyMove('B');
        break;

      // Tip moves
      case 'u':  this.tips[0] = (this.tips[0] + 1) % 3; break;
      case "u'": this.tips[0] = (this.tips[0] + 2) % 3; break;
      case 'l':  this.tips[1] = (this.tips[1] + 1) % 3; break;
      case "l'": this.tips[1] = (this.tips[1] + 2) % 3; break;
      case 'r':  this.tips[2] = (this.tips[2] + 1) % 3; break;
      case "r'": this.tips[2] = (this.tips[2] + 2) % 3; break;
      case 'b':  this.tips[3] = (this.tips[3] + 1) % 3; break;
      case "b'": this.tips[3] = (this.tips[3] + 2) % 3; break;
    }
  }

  // Convert internal state to 36 facelets (9 per face: F, L, R, D)
  toFacelets() {
    const faces = {
      F: Array(9).fill('F'),
      L: Array(9).fill('R'),
      R: Array(9).fill('B'),
      D: Array(9).fill('D')
    };

    // Tips
    const uColors = ['F', 'B', 'R'];
    faces.F[0] = uColors[(0 + this.tips[0]) % 3];
    faces.R[0] = uColors[(1 + this.tips[0]) % 3];
    faces.L[0] = uColors[(2 + this.tips[0]) % 3];

    const lColors = ['F', 'R', 'D'];
    faces.F[4] = lColors[(0 + this.tips[1]) % 3];
    faces.L[8] = lColors[(1 + this.tips[1]) % 3];
    faces.D[4] = lColors[(2 + this.tips[1]) % 3];

    const rColors = ['F', 'D', 'B'];
    faces.F[8] = rColors[(0 + this.tips[2]) % 3];
    faces.D[8] = rColors[(1 + this.tips[2]) % 3];
    faces.R[4] = rColors[(2 + this.tips[2]) % 3];

    const bColors = ['D', 'R', 'B'];
    faces.D[0] = bColors[(0 + this.tips[3]) % 3];
    faces.L[4] = bColors[(1 + this.tips[3]) % 3];
    faces.R[8] = bColors[(2 + this.tips[3]) % 3];

    // Centers
    faces.F[2] = uColors[(0 + this.centers[0]) % 3];
    faces.R[2] = uColors[(1 + this.centers[0]) % 3];
    faces.L[2] = uColors[(2 + this.centers[0]) % 3];

    faces.F[5] = lColors[(0 + this.centers[1]) % 3];
    faces.L[7] = lColors[(1 + this.centers[1]) % 3];
    faces.D[5] = lColors[(2 + this.centers[1]) % 3];

    faces.F[7] = rColors[(0 + this.centers[2]) % 3];
    faces.D[7] = rColors[(1 + this.centers[2]) % 3];
    faces.R[5] = rColors[(2 + this.centers[2]) % 3];

    faces.D[2] = bColors[(0 + this.centers[3]) % 3];
    faces.L[5] = bColors[(1 + this.centers[3]) % 3];
    faces.R[7] = bColors[(2 + this.centers[3]) % 3];

    // 6 Edges
    const edgeDefs = [
      { p1: ['F', 1], p2: ['L', 3], colors: ['F', 'R'] }, // 0: FL
      { p1: ['F', 3], p2: ['R', 1], colors: ['F', 'B'] }, // 1: FR
      { p1: ['F', 6], p2: ['D', 6], colors: ['F', 'D'] }, // 2: FD
      { p1: ['L', 6], p2: ['D', 1], colors: ['R', 'D'] }, // 3: BL
      { p1: ['R', 6], p2: ['D', 3], colors: ['B', 'D'] }, // 4: BR
      { p1: ['L', 1], p2: ['R', 3], colors: ['R', 'B'] }  // 5: UB
    ];

    for (let slot = 0; slot < 6; slot++) {
      const pieceIdx = this.edges[slot];
      const ori = this.edgeOri[slot];
      const standardColors = edgeDefs[pieceIdx].colors;
      const c1 = ori === 0 ? standardColors[0] : standardColors[1];
      const c2 = ori === 0 ? standardColors[1] : standardColors[0];
      const curSlot = edgeDefs[slot];
      faces[curSlot.p1[0]][curSlot.p1[1]] = c1;
      faces[curSlot.p2[0]][curSlot.p2[1]] = c2;
    }

    return faces;
  }
}

// Moves list for IDA* search
const MAIN_MOVES = ['U', "U'", 'L', "L'", 'R', "R'", 'B', "B'"];

// Admissible heuristic estimate for IDA*
function heuristic(state) {
  let misplacedEdges = 0;
  for (let i = 0; i < 6; i++) {
    if (state.edges[i] !== i || state.edgeOri[i] !== 0) {
      misplacedEdges++;
    }
  }
  let misorientedCenters = 0;
  for (let i = 0; i < 4; i++) {
    if (state.centers[i] !== 0) {
      misorientedCenters++;
    }
  }
  // Each move can reposition at most 3 edges and 1 center
  return Math.max(Math.ceil(misplacedEdges / 3), Math.ceil(misorientedCenters / 1));
}

// Auto-balance Pyraminx facelets to exactly 9 of each color (F, R, B, D)
export function autoBalancePyraminxFaces(faces, details = null) {
  if (!faces) return faces;
  const requiredFaces = ['F', 'L', 'R', 'D'];
  const canonicalColors = ['F', 'R', 'B', 'D'];

  // 1. Ensure all facelets are normalized
  for (const k of requiredFaces) {
    if (!faces[k]) return faces;
    for (let i = 0; i < 9; i++) {
      faces[k][i] = normalizePyraminxColor(faces[k][i], k);
    }
  }

  // 2. Count current occurrences
  const counts = { F: 0, R: 0, B: 0, D: 0 };
  for (const k of requiredFaces) {
    for (let i = 0; i < 9; i++) {
      counts[faces[k][i]] = (counts[faces[k][i]] || 0) + 1;
    }
  }

  // 3. Balance surplus and deficit facelets iteratively
  let maxIterations = 20;
  while (maxIterations-- > 0) {
    const surplusList = [];
    const deficitList = [];

    for (const c of canonicalColors) {
      const cur = counts[c] || 0;
      if (cur > 9) surplusList.push({ color: c, excess: cur - 9 });
      if (cur < 9) deficitList.push({ color: c, deficit: 9 - cur });
    }

    if (surplusList.length === 0 && deficitList.length === 0) {
      break; // Balanced!
    }

    surplusList.sort((a, b) => b.excess - a.excess);
    deficitList.sort((a, b) => b.deficit - a.deficit);

    const surplusColor = surplusList[0].color;
    const deficitColor = deficitList[0].color;

    // Find best candidate tile to flip (prefer edge tiles, or tiles with low confidence)
    let bestCandidate = null;
    let bestMargin = Infinity;

    for (const faceKey of requiredFaces) {
      for (let i = 0; i < 9; i++) {
        if (faces[faceKey][i] !== surplusColor) continue;

        let margin = 50;
        if (details && details[faceKey] && details[faceKey][i] && details[faceKey][i].scores) {
          const s = details[faceKey][i].scores;
          margin = (s[deficitColor] || 100) - (s[surplusColor] || 0);
        } else {
          // Slight preference to flip if on face matching deficit color
          const faceColorMap = { F: 'F', L: 'R', R: 'B', D: 'D' };
          if (faceColorMap[faceKey] === deficitColor) margin -= 20;
        }

        if (margin < bestMargin) {
          bestMargin = margin;
          bestCandidate = { faceKey, i };
        }
      }
    }

    if (!bestCandidate) {
      for (const faceKey of requiredFaces) {
        for (let i = 0; i < 9; i++) {
          if (faces[faceKey][i] === surplusColor) {
            bestCandidate = { faceKey, i };
            break;
          }
        }
        if (bestCandidate) break;
      }
    }

    if (bestCandidate) {
      faces[bestCandidate.faceKey][bestCandidate.i] = deficitColor;
      counts[surplusColor]--;
      counts[deficitColor]++;
    } else {
      break;
    }
  }

  return faces;
}

// Validation for Pyraminx face colors
export function validatePyraminxFaces(faces, details = null) {
  if (!faces) {
    return { valid: false, error: 'No Pyraminx faces scanned yet.' };
  }
  const requiredFaces = ['F', 'L', 'R', 'D'];
  for (const k of requiredFaces) {
    if (!faces[k] || faces[k].length !== 9) {
      return { valid: false, error: `Face ${k} is incomplete (needs 9 stickers).` };
    }
  }

  // Canonical counts: F (Green), R (Red), B (Blue), D (Yellow)
  const counts = { F: 0, R: 0, B: 0, D: 0 };
  for (const k of requiredFaces) {
    for (let i = 0; i < 9; i++) {
      const normalized = normalizePyraminxColor(faces[k][i], k);
      faces[k][i] = normalized;

      if (counts[normalized] !== undefined) {
        counts[normalized]++;
      } else {
        const colorName = normalized === 'U' ? 'White' : normalized;
        return {
          valid: false,
          error: `Invalid color '${colorName}' detected on face ${k}. A Pyraminx only has Green, Red, Blue, and Yellow.`
        };
      }
    }
  }

  const colorNames = { F: 'Green', R: 'Red', B: 'Blue', D: 'Yellow' };
  const mismatches = [];
  for (const [k, name] of Object.entries(colorNames)) {
    if (counts[k] !== 9) {
      mismatches.push(`${name}: ${counts[k]}/9`);
    }
  }

  if (mismatches.length > 0) {
    return {
      valid: false,
      canAutoBalance: true,
      error: `Sticker count mismatch (${mismatches.join(', ')}). Tap thumbnails to review or fix tiles.`,
      counts
    };
  }

  return { valid: true };
}

// Convert 4 scanned faces (each with 9 stickers in F, R, B, D) into PyraminxState
export function buildPyraminxStateFromFaces(faces) {
  const state = new PyraminxState();
  if (!faces || !faces.F || !faces.L || !faces.R || !faces.D) {
    return state;
  }

  const clean = {};
  for (const k of ['F', 'L', 'R', 'D']) {
    clean[k] = faces[k].map(c => normalizePyraminxColor(c, k));
  }

  const uColors = ['F', 'B', 'R'];
  const lColors = ['F', 'R', 'D'];
  const rColors = ['F', 'D', 'B'];
  const bColors = ['D', 'R', 'B'];

  // Tips orientation (0, 1, 2)
  state.tips[0] = (uColors.indexOf(clean.F[0]) + 3) % 3;
  state.tips[1] = (lColors.indexOf(clean.F[4]) + 3) % 3;
  state.tips[2] = (rColors.indexOf(clean.F[8]) + 3) % 3;
  state.tips[3] = (bColors.indexOf(clean.D[0]) + 3) % 3;

  // Centers orientation (0, 1, 2)
  state.centers[0] = (uColors.indexOf(clean.F[2]) + 3) % 3;
  state.centers[1] = (lColors.indexOf(clean.F[5]) + 3) % 3;
  state.centers[2] = (rColors.indexOf(clean.F[7]) + 3) % 3;
  state.centers[3] = (bColors.indexOf(clean.D[2]) + 3) % 3;

  // 6 Edges
  const edgeDefs = [
    { p1: ['F', 1], p2: ['L', 3], colors: ['F', 'R'] }, // 0: FL
    { p1: ['F', 3], p2: ['R', 1], colors: ['F', 'B'] }, // 1: FR
    { p1: ['F', 6], p2: ['D', 6], colors: ['F', 'D'] }, // 2: FD
    { p1: ['L', 6], p2: ['D', 1], colors: ['R', 'D'] }, // 3: BL
    { p1: ['R', 6], p2: ['D', 3], colors: ['B', 'D'] }, // 4: BR
    { p1: ['L', 1], p2: ['R', 3], colors: ['R', 'B'] }  // 5: UB
  ];

  for (let slot = 0; slot < 6; slot++) {
    const curSlot = edgeDefs[slot];
    const c1 = clean[curSlot.p1[0]][curSlot.p1[1]];
    const c2 = clean[curSlot.p2[0]][curSlot.p2[1]];

    let foundPiece = -1, ori = 0;
    for (let p = 0; p < 6; p++) {
      const def = edgeDefs[p].colors;
      if (c1 === def[0] && c2 === def[1]) {
        foundPiece = p; ori = 0; break;
      } else if (c1 === def[1] && c2 === def[0]) {
        foundPiece = p; ori = 1; break;
      }
    }
    if (foundPiece === -1) {
      throw new Error(`Invalid Pyraminx edge detected between faces ${curSlot.p1[0]} and ${curSlot.p2[0]} (colors: ${c1}, ${c2}). Please check face orientations.`);
    }
    state.edges[slot] = foundPiece;
    state.edgeOri[slot] = ori;
  }

  return state;
}

// IDA* Pyraminx Main Body Solver (finds shortest move sequence <= 11 moves)
export function solvePyraminx(initialState) {
  const state = initialState.clone();

  // If already solved:
  if (state.isSolved()) {
    return {
      solvedAlready: true,
      rawSolution: '',
      totalMoves: 0,
      moves: []
    };
  }

  const path = [];
  if (!state.isBodySolved()) {
    let bound = heuristic(state);

    function search(currState, g, lastFace) {
      const h = heuristic(currState);
      const f = g + h;
      if (f > bound) return f;
      if (currState.isBodySolved()) return 'FOUND';

      let min = Infinity;
      for (const move of MAIN_MOVES) {
        const face = move[0];
        if (face === lastFace) continue;

        const nextState = currState.clone();
        nextState.applyMove(move);
        path.push(move);

        const res = search(nextState, g + 1, face);
        if (res === 'FOUND') return 'FOUND';
        if (res < min) min = res;

        path.pop();
      }
      return min;
    }

    const maxSearchLimit = 11;
    while (bound <= maxSearchLimit) {
      const res = search(state.clone(), 0, null);
      if (res === 'FOUND') break;
      if (res === Infinity) break;
      bound = res;
    }
  }

  // Apply body moves to calculate final tips orientation
  for (const m of path) {
    state.applyMove(m);
  }

  // Align tips
  const tipMoves = [];
  const tipNames = ['u', 'l', 'r', 'b'];
  for (let i = 0; i < 4; i++) {
    const ori = state.tips[i];
    if (ori === 1) {
      tipMoves.push(tipNames[i] + "'");
    } else if (ori === 2) {
      tipMoves.push(tipNames[i]);
    }
  }

  const allMoveStrings = [...path, ...tipMoves];
  const parsedMoves = allMoveStrings.map(parsePyraminxMove);

  return {
    solvedAlready: parsedMoves.length === 0,
    rawSolution: allMoveStrings.join(' '),
    totalMoves: parsedMoves.length,
    moves: parsedMoves
  };
}

// Convert Pyraminx move into crystal-clear human readable metadata
export function parsePyraminxMove(rawMove) {
  const isTip = rawMove.toLowerCase() === rawMove;
  const upper = rawMove.toUpperCase();
  const face = upper[0];
  const isCounter = rawMove.includes("'");

  const vertexDetails = {
    U: {
      name: 'TOP Vertex',
      tipName: 'TOP Tip',
      faces: 'Green, Red, Blue',
      swatches: ['#22C55E', '#EF4444', '#3B82F6'],
      locationDesc: 'at the top apex'
    },
    L: {
      name: 'LEFT Vertex',
      tipName: 'LEFT Tip',
      faces: 'Green, Red, Yellow',
      swatches: ['#22C55E', '#EF4444', '#EAB308'],
      locationDesc: 'at the bottom-left'
    },
    R: {
      name: 'RIGHT Vertex',
      tipName: 'RIGHT Tip',
      faces: 'Green, Blue, Yellow',
      swatches: ['#22C55E', '#3B82F6', '#EAB308'],
      locationDesc: 'at the bottom-right'
    },
    B: {
      name: 'BACK Vertex',
      tipName: 'BACK Tip',
      faces: 'Red, Blue, Yellow',
      swatches: ['#EF4444', '#3B82F6', '#EAB308'],
      locationDesc: 'behind the bottom'
    }
  };

  const v = vertexDetails[face] || vertexDetails.U;
  const dirSymbol = isCounter ? '↺' : '↻';
  const dirDesc = isCounter ? 'Counter-Clockwise ↺' : 'Clockwise ↻';

  // Capitalize and make unambiguous so 'l' is never confused with '1'
  const notation = isTip ? `TIP ${face}${isCounter ? "'" : ''} 120°` : `${face}${isCounter ? "'" : ''} 120°`;
  const timelineLabel = isTip ? `Tip ${face}${isCounter ? "'" : ''}` : `${face}${isCounter ? "'" : ''}`;

  const fullDesc = isTip
    ? `Twist the ${v.tipName} (${v.locationDesc}) ${dirDesc} by 120° (one click)`
    : `Turn the ${v.name} (top 2 layers) ${dirDesc} by 120°`;

  return {
    raw: rawMove,
    face,
    isTip,
    modifier: isCounter ? "'" : '',
    turns: isCounter ? -1 : 1,
    degrees: '120°',
    dirSymbol,
    notation,
    timelineLabel,
    shortDesc: `${notation} ${dirSymbol}`,
    fullDesc,
    vertexName: isTip ? v.tipName : v.name,
    vertexColors: v.faces,
    swatches: v.swatches,
    holdingInstruction: 'Hold GREEN in front, YELLOW at bottom',
    arrowType: isCounter ? 'CCW_120' : 'CW_120'
  };
}

// Generate a valid scrambled Pyraminx demo state
export function generatePyraminxDemo(scramble = "U L R' B U' L' u r'") {
  const state = new PyraminxState();
  const tokens = scramble.split(/\s+/).filter(Boolean);
  for (const m of tokens) {
    state.applyMove(m);
  }

  const faces = state.toFacelets();

  return {
    scramble,
    state,
    faces
  };
}
