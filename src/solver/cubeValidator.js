// Rubik's Cube State Validator
// Validates facelet string (54 chars: U1-U9, R1-R9, F1-F9, D1-D9, L1-L9, B1-B9)
// Standard order: U (0-8), R (9-17), F (18-26), D (27-35), L (36-44), B (45-53)

export const FACE_NAMES = ['U', 'R', 'F', 'D', 'L', 'B'];
export const COLOR_NAMES = {
  U: 'White',
  R: 'Red',
  F: 'Green',
  D: 'Yellow',
  L: 'Orange',
  B: 'Blue'
};

// Center indices in 54-char string
export const CENTERS = {
  U: 4,
  R: 13,
  F: 22,
  D: 31,
  L: 40,
  B: 49
};

// 12 Edges definitions [facelet1, facelet2]
// Indices 0-based:
// U: 0-8 (1-9), R: 9-17, F: 18-26, D: 27-35, L: 36-44, B: 45-53
// Based on Kociemba standard indexing:
// U: 0(ULB), 1(UB), 2(UBR), 3(UL), 4(center), 5(UR), 6(UFL), 7(UF), 8(URF)
// R: 9(UBR), 10(UR), 11(URF)... wait! Let's check exact indices from cubejs:
// _U(x) = x-1:
// Edges in cubejs:
// 0: UR: [5, 10] (_U(6)=5, _R(2)=10)
// 1: UF: [7, 19] (_U(8)=7, _F(2)=19)
// 2: UL: [3, 37] (_U(4)=3, _L(2)=37)
// 3: UB: [1, 46] (_U(2)=1, _B(2)=46)
// 4: DR: [32, 16] (_D(6)=32, _R(8)=16)
// 5: DF: [28, 25] (_D(2)=28, _F(8)=25)
// 6: DL: [30, 43] (_D(4)=30, _L(8)=43)
// 7: DB: [34, 52] (_D(8)=34, _B(8)=52)
// 8: FR: [23, 12] (_F(6)=23, _R(4)=12)
// 9: FL: [21, 41] (_F(4)=21, _L(6)=41)
// 10: BL: [48, 39] (_B(4)=48, _L(4)=39)
// 11: BR: [50, 14] (_B(6)=50, _R(6)=14)

export const EDGES = [
  { name: 'UR', facelets: [5, 10], colors: ['U', 'R'] },
  { name: 'UF', facelets: [7, 19], colors: ['U', 'F'] },
  { name: 'UL', facelets: [3, 37], colors: ['U', 'L'] },
  { name: 'UB', facelets: [1, 46], colors: ['U', 'B'] },
  { name: 'DR', facelets: [32, 16], colors: ['D', 'R'] },
  { name: 'DF', facelets: [28, 25], colors: ['D', 'F'] },
  { name: 'DL', facelets: [30, 43], colors: ['D', 'L'] },
  { name: 'DB', facelets: [34, 52], colors: ['D', 'B'] },
  { name: 'FR', facelets: [23, 12], colors: ['F', 'R'] },
  { name: 'FL', facelets: [21, 41], colors: ['F', 'L'] },
  { name: 'BL', facelets: [50, 39], colors: ['B', 'L'] },
  { name: 'BR', facelets: [48, 14], colors: ['B', 'R'] }
];

// Corners in cubejs:
// 0: URF: [_U(9)=8, _R(1)=9, _F(3)=20]
// 1: UFL: [_U(7)=6, _F(1)=18, _L(3)=38]
// 2: ULB: [_U(1)=0, _L(1)=36, _B(3)=47]
// 3: UBR: [_U(3)=2, _B(1)=45, _R(3)=11]
// 4: DFR: [_D(3)=29, _F(9)=26, _R(7)=15]
// 5: DLF: [_D(1)=27, _L(9)=44, _F(7)=24]
// 6: DBL: [_D(7)=33, _B(9)=53, _L(7)=42]
// 7: DRB: [_D(9)=35, _R(9)=17, _B(7)=51]

export const CORNERS = [
  { name: 'URF', facelets: [8, 9, 20], colors: ['U', 'R', 'F'] },
  { name: 'UFL', facelets: [6, 18, 38], colors: ['U', 'F', 'L'] },
  { name: 'ULB', facelets: [0, 36, 47], colors: ['U', 'L', 'B'] },
  { name: 'UBR', facelets: [2, 45, 11], colors: ['U', 'B', 'R'] },
  { name: 'DFR', facelets: [29, 26, 15], colors: ['D', 'F', 'R'] },
  { name: 'DLF', facelets: [27, 44, 24], colors: ['D', 'L', 'F'] },
  { name: 'DBL', facelets: [33, 53, 42], colors: ['D', 'B', 'L'] },
  { name: 'DRB', facelets: [35, 17, 51], colors: ['D', 'R', 'B'] }
];

// Auto-balance 3x3 cube facelets to 9 of each color
export function autoBalanceCubeFacelets(faceletString, details = null) {
  if (!faceletString || faceletString.length !== 54) return faceletString;
  const chars = faceletString.split('');
  const centerIndices = [4, 13, 22, 31, 40, 49]; // Fixed centers
  const counts = { U: 0, R: 0, F: 0, D: 0, L: 0, B: 0 };
  for (const c of chars) counts[c] = (counts[c] || 0) + 1;

  let maxIterations = 20;
  while (maxIterations-- > 0) {
    const surplusList = [];
    const deficitList = [];
    for (const f of FACE_NAMES) {
      const cur = counts[f] || 0;
      if (cur > 9) surplusList.push({ face: f, excess: cur - 9 });
      if (cur < 9) deficitList.push({ face: f, deficit: 9 - cur });
    }
    if (surplusList.length === 0 && deficitList.length === 0) break;

    surplusList.sort((a, b) => b.excess - a.excess);
    deficitList.sort((a, b) => b.deficit - a.deficit);

    const surplusColor = surplusList[0].face;
    const deficitColor = deficitList[0].face;

    let bestCandidateIdx = -1;
    let bestMargin = Infinity;

    for (let i = 0; i < 54; i++) {
      if (centerIndices.includes(i)) continue; // Don't flip fixed centers
      if (chars[i] !== surplusColor) continue;

      let margin = 50;
      if (details && details[i] && details[i].scores) {
        margin = (details[i].scores[deficitColor] || 100) - (details[i].scores[surplusColor] || 0);
      }
      if (margin < bestMargin) {
        bestMargin = margin;
        bestCandidateIdx = i;
      }
    }

    if (bestCandidateIdx >= 0) {
      chars[bestCandidateIdx] = deficitColor;
      counts[surplusColor]--;
      counts[deficitColor]++;
    } else {
      break;
    }
  }

  return chars.join('');
}

export function validateCubeState(faceletString) {
  if (!faceletString || faceletString.length !== 54) {
    return {
      valid: false,
      error: `Invalid facelet string length: expected 54, got ${faceletString ? faceletString.length : 0}`
    };
  }

  // 1. Check Color Counts
  const counts = { U: 0, R: 0, F: 0, D: 0, L: 0, B: 0 };
  for (let i = 0; i < 54; i++) {
    const char = faceletString[i];
    if (counts[char] !== undefined) {
      counts[char]++;
    } else {
      return {
        valid: false,
        error: `Unknown facelet color '${char}' at index ${i}`
      };
    }
  }

  const mismatchedColors = [];
  for (const face of FACE_NAMES) {
    if (counts[face] !== 9) {
      mismatchedColors.push({
        face,
        name: COLOR_NAMES[face],
        count: counts[face]
      });
    }
  }

  if (mismatchedColors.length > 0) {
    const details = mismatchedColors
      .map(m => `${m.name}: ${m.count}/9`)
      .join(', ');
    return {
      valid: false,
      code: 'COLOR_COUNT_MISMATCH',
      counts,
      error: `Sticker count mismatch (${details}). Tap thumbnails to review or fix tiles.`
    };
  }

  // 2. Check Centers
  for (const [face, idx] of Object.entries(CENTERS)) {
    if (faceletString[idx] !== face) {
      return {
        valid: false,
        code: 'CENTER_MISMATCH',
        error: `Center sticker on face ${COLOR_NAMES[face]} (${face}) is ${COLOR_NAMES[faceletString[idx]] || faceletString[idx]}. Expected ${COLOR_NAMES[face]}.`
      };
    }
  }

  // 3. Check Edges
  const standardEdges = EDGES.map(e => e.colors.slice().sort().join(''));
  const foundEdges = [];
  let edgeFlipSum = 0;

  for (let i = 0; i < EDGES.length; i++) {
    const eDef = EDGES[i];
    const c1 = faceletString[eDef.facelets[0]];
    const c2 = faceletString[eDef.facelets[1]];
    const edgeKey = [c1, c2].sort().join('');

    const matchedIdx = standardEdges.indexOf(edgeKey);
    if (matchedIdx === -1) {
      return {
        valid: false,
        code: 'INVALID_EDGE',
        error: `Invalid edge found with colors ${COLOR_NAMES[c1]} & ${COLOR_NAMES[c2]} at ${eDef.name}.`
      };
    }

    if (foundEdges.includes(edgeKey)) {
      return {
        valid: false,
        code: 'DUPLICATE_EDGE',
        error: `Duplicate edge found: two ${COLOR_NAMES[c1]}-${COLOR_NAMES[c2]} edges detected.`
      };
    }
    foundEdges.push(edgeKey);

    // Orientation check: U or D color is on facelet 0
    if (c1 === 'U' || c1 === 'D') {
      // oriented (flip = 0)
    } else if (c2 === 'U' || c2 === 'D') {
      edgeFlipSum += 1;
    } else if (c1 === 'F' || c1 === 'B') {
      // oriented (flip = 0)
    } else {
      edgeFlipSum += 1;
    }
  }

  // 4. Check Corners
  const standardCorners = CORNERS.map(c => c.colors.slice().sort().join(''));
  const foundCorners = [];
  let cornerTwistSum = 0;

  for (let i = 0; i < CORNERS.length; i++) {
    const cDef = CORNERS[i];
    const c1 = faceletString[cDef.facelets[0]];
    const c2 = faceletString[cDef.facelets[1]];
    const c3 = faceletString[cDef.facelets[2]];
    const cornerKey = [c1, c2, c3].sort().join('');

    const matchedIdx = standardCorners.indexOf(cornerKey);
    if (matchedIdx === -1) {
      return {
        valid: false,
        code: 'INVALID_CORNER',
        error: `Invalid corner found with colors ${COLOR_NAMES[c1]}, ${COLOR_NAMES[c2]}, ${COLOR_NAMES[c3]}.`
      };
    }

    if (foundCorners.includes(cornerKey)) {
      return {
        valid: false,
        code: 'DUPLICATE_CORNER',
        error: `Duplicate corner found: multiple ${cornerKey} corners detected.`
      };
    }
    foundCorners.push(cornerKey);

    // Corner twist orientation:
    // Which facelet has U or D?
    if (c1 === 'U' || c1 === 'D') {
      cornerTwistSum += 0;
    } else if (c2 === 'U' || c2 === 'D') {
      cornerTwistSum += 1;
    } else if (c3 === 'U' || c3 === 'D') {
      cornerTwistSum += 2;
    }
  }

  // Check Parity
  if (edgeFlipSum % 2 !== 0) {
    return {
      valid: false,
      code: 'EDGE_ORIENTATION_ERROR',
      error: 'Single flipped edge detected. Please check face colors.'
    };
  }

  if (cornerTwistSum % 3 !== 0) {
    return {
      valid: false,
      code: 'CORNER_TWIST_ERROR',
      error: 'Single twisted corner detected. Please check face colors.'
    };
  }

  return {
    valid: true,
    counts
  };
}

