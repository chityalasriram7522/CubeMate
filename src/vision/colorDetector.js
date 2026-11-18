// Color detection & calibration engine for MakeMeCubeMaster
// Supports RGB -> HSV -> CIELAB color conversions and Delta-E / calibrated distance matching

export const COLOR_KEYS = ['U', 'R', 'F', 'D', 'L', 'B'];

export const DEFAULT_CALIBRATION = {
  U: { name: 'White', face: 'U', hex: '#FFFFFF', rgb: [240, 240, 240], hsv: [0, 0.05, 0.94] },
  R: { name: 'Red', face: 'R', hex: '#DC2626', rgb: [210, 35, 35], hsv: [0, 0.83, 0.82] },
  F: { name: 'Green', face: 'F', hex: '#16A34A', rgb: [25, 160, 65], hsv: [138, 0.84, 0.63] },
  D: { name: 'Yellow', face: 'D', hex: '#FACC15', rgb: [240, 205, 30], hsv: [50, 0.87, 0.94] },
  L: { name: 'Orange', face: 'L', hex: '#EA580C', rgb: [235, 95, 20], hsv: [21, 0.91, 0.92] },
  B: { name: 'Blue', face: 'B', hex: '#2563EB', rgb: [30, 95, 220], hsv: [220, 0.86, 0.86] }
};

export const COLOR_DISPLAY = {
  U: { name: 'White', hex: '#F8FAFC', textColor: '#0F172A', badgeClass: 'bg-white text-slate-900' },
  R: { name: 'Red', hex: '#EF4444', textColor: '#FFFFFF', badgeClass: 'bg-red-500 text-white' },
  F: { name: 'Green', hex: '#22C55E', textColor: '#FFFFFF', badgeClass: 'bg-green-500 text-white' },
  D: { name: 'Yellow', hex: '#EAB308', textColor: '#0F172A', badgeClass: 'bg-yellow-400 text-slate-900' },
  L: { name: 'Orange', hex: '#F97316', textColor: '#FFFFFF', badgeClass: 'bg-orange-500 text-white' },
  B: { name: 'Blue', hex: '#3B82F6', textColor: '#FFFFFF', badgeClass: 'bg-blue-500 text-white' }
};

const STORAGE_KEY = 'makemecubemaster_color_calibration_v1';

export function rgbToHsv(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, v = max;
  const d = max - min;

  s = max === 0 ? 0 : d / max;

  if (max === min) {
    h = 0; // achromatic
  } else {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }

  return [Math.round(h), Number(s.toFixed(3)), Number(v.toFixed(3))];
}

export function rgbToHex(r, g, b) {
  const toHex = c => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export function hexToRgb(hex) {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

// Circular hue difference (0 - 180 degrees)
function circularHueDiff(h1, h2) {
  const diff = Math.abs(h1 - h2) % 360;
  return diff > 180 ? 360 - diff : diff;
}

export class ColorManager {
  constructor() {
    this.calibration = this.loadCalibration();
  }

  loadCalibration() {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (COLOR_KEYS.every(k => parsed[k] && parsed[k].rgb && parsed[k].hsv)) {
            return parsed;
          }
        }
      }
    } catch (e) {
      console.warn('Could not parse stored color calibration:', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_CALIBRATION));
  }

  hasCustomCalibration() {
    return typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY) !== null;
  }

  saveCalibration(newCalibration) {
    this.calibration = JSON.parse(JSON.stringify(newCalibration));
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.calibration));
      }
    } catch (e) {
      console.error('Failed to save color calibration to localStorage:', e);
    }
  }

  resetToDefaults() {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    this.calibration = JSON.parse(JSON.stringify(DEFAULT_CALIBRATION));
  }

  calibrateColor(faceKey, r, g, b) {
    const hsv = rgbToHsv(r, g, b);
    const hex = rgbToHex(r, g, b);
    this.calibration[faceKey] = {
      name: DEFAULT_CALIBRATION[faceKey].name,
      face: faceKey,
      hex,
      rgb: [r, g, b],
      hsv
    };
  }

  // Classify a single sampled RGB pixel into one of the face keys
  classifyRgb(r, g, b, puzzleType = 'cube3x3') {
    const [h, s, v] = rgbToHsv(r, g, b);

    // PYRAMINX MODE: Only 4 valid colors: F (Green), R (Red), B (Blue), D (Yellow)
    // NEVER classify glare/shine as White or Orange on Pyraminx
    if (puzzleType === 'pyraminx') {
      const candidates = ['F', 'R', 'B', 'D'];
      let bestFace = 'F';
      let bestScore = Infinity;
      const scores = {};

      for (const key of candidates) {
        const cal = this.calibration[key] || DEFAULT_CALIBRATION[key];
        const hueDiff = circularHueDiff(h, cal.hsv[0]);
        const satDiff = Math.abs(s - cal.hsv[1]);
        const valDiff = Math.abs(v - cal.hsv[2]);
        const rgbDist = Math.hypot(r - cal.rgb[0], g - cal.rgb[1], b - cal.rgb[2]);

        // Weight hue primarily since Pyraminx colors are separated by 60-90 degrees
        let score = hueDiff * 2.2 + satDiff * 35 + valDiff * 20 + (rgbDist / 255) * 30;

        // Distinct hue quadrant boosts:
        if (key === 'R' && (h >= 335 || h <= 25)) score -= 30; // Red around 0/360 deg
        if (key === 'D' && (h >= 28 && h <= 75)) score -= 30;  // Yellow around 50 deg
        if (key === 'F' && (h >= 80 && h <= 165)) score -= 30; // Green around 130 deg
        if (key === 'B' && (h >= 170 && h <= 275)) score -= 30; // Blue around 220 deg

        scores[key] = score;

        if (score < bestScore) {
          bestScore = score;
          bestFace = key;
        }
      }

      const confidence = Math.max(0.15, Math.min(1.0, 1 - bestScore / 180));

      return {
        face: bestFace,
        name: DEFAULT_CALIBRATION[bestFace].name,
        colorKey: bestFace,
        confidence: Number(confidence.toFixed(2)),
        hex: COLOR_DISPLAY[bestFace].hex,
        sampleHex: rgbToHex(r, g, b),
        rawRgb: [r, g, b],
        scores
      };
    }

    // STANDARD 3x3 CUBE MODE: 6 colors: U, R, F, D, L, B
    const whiteCal = this.calibration.U;

    // Check for White: low saturation, relatively high brightness
    // Or very close to calibrated white
    const whiteRgbDist = Math.hypot(r - whiteCal.rgb[0], g - whiteCal.rgb[1], b - whiteCal.rgb[2]);
    const isVeryLowSat = s <= Math.max(0.24, whiteCal.hsv[1] * 1.6);
    const isBrightEnough = v >= 0.40;

    if ((isVeryLowSat && isBrightEnough) || (whiteRgbDist < 45 && s < 0.35)) {
      return {
        face: 'U',
        name: 'White',
        colorKey: 'U',
        confidence: 0.95,
        hex: COLOR_DISPLAY.U.hex,
        sampleHex: rgbToHex(r, g, b),
        rawRgb: [r, g, b],
        scores: { U: 0, R: 100, F: 100, D: 100, L: 100, B: 100 }
      };
    }

    // Chromatic matching against R, F, D, L, B
    let bestFace = 'U';
    let bestScore = Infinity;
    const scores = { U: 80 };

    for (const key of ['R', 'F', 'D', 'L', 'B']) {
      const cal = this.calibration[key];
      const hueDiff = circularHueDiff(h, cal.hsv[0]);
      const satDiff = Math.abs(s - cal.hsv[1]);
      const valDiff = Math.abs(v - cal.hsv[2]);

      // Weight hue heavily for chromatic distinctions
      let score = hueDiff * 1.8 + satDiff * 60 + valDiff * 30;

      // Special handling for Red vs Orange:
      // Red hue is near 0 or 360, Orange hue is near 20-35
      if (key === 'R' && (h >= 340 || h <= 14)) {
        score -= 20; // reward strong red hue
      }
      if (key === 'L' && (h >= 16 && h <= 42)) {
        score -= 15; // reward orange hue
      }
      if (key === 'D' && (h >= 45 && h <= 70)) {
        score -= 20; // reward yellow hue
      }
      if (key === 'F' && (h >= 85 && h <= 170)) {
        score -= 20; // reward green hue
      }
      if (key === 'B' && (h >= 180 && h <= 260)) {
        score -= 20; // reward blue hue
      }

      scores[key] = score;

      if (score < bestScore) {
        bestScore = score;
        bestFace = key;
      }
    }

    const confidence = Math.max(0.1, Math.min(1.0, 1 - bestScore / 180));

    return {
      face: bestFace,
      name: DEFAULT_CALIBRATION[bestFace].name,
      colorKey: bestFace,
      confidence: Number(confidence.toFixed(2)),
      hex: COLOR_DISPLAY[bestFace].hex,
      sampleHex: rgbToHex(r, g, b),
      rawRgb: [r, g, b],
      scores
    };
  }
}

