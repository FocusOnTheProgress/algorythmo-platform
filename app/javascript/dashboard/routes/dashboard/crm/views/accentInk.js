// algorythmo: feature-gate algorythmo_crm
//
// Picks the readable header ink (light vs dark) for a stage accent COLOUR by
// COMPUTING WCAG contrast, never by a hand-set flag. Adversarial review #111:
// tagging only the yellow stage left the orange stage (oklch L≈0.68) with
// near-white ink at borderline/below-AA contrast. This derives the ink from the
// accent itself, so any future stage colour can't silently fail AA.
//
// Pipeline: parse `oklch(L C H)` → OKLab → linear sRGB → WCAG relative luminance
// → contrast ratio of white-ink and black-ink against the fill → pick the
// higher. The OKLab→linear-sRGB matrices are the canonical Björn Ottosson
// constants. Only the `oklch(...)` form is supported (the only form the stage
// accents use); anything else falls back to 'light' (near-white) so a
// mis-parsed value degrades to the previous default rather than throwing.

// Parse "oklch(0.62 0.16 300)" / "oklch(62% 0.16 300)" → { L, C, H } in [0..1],
// chroma, degrees. Returns null when the string is not an oklch() triple.
export function parseOklch(input) {
  if (typeof input !== 'string') return null;
  const m = input.trim().match(/^oklch\(\s*([^)]+)\)$/i);
  if (!m) return null;
  const parts = m[1].split(/[\s,/]+/).filter(Boolean);
  if (parts.length < 3) return null;
  const num = (raw, isL) => {
    const v = parseFloat(raw);
    if (!Number.isFinite(v)) return NaN;
    return isL && raw.includes('%') ? v / 100 : v;
  };
  const L = num(parts[0], true);
  const C = num(parts[1], false);
  const H = num(parts[2], false);
  if (![L, C, H].every(Number.isFinite)) return null;
  return { L, C, H };
}

// OKLCH → linear sRGB (r,g,b in [0..1], may slightly exceed the gamut).
function oklchToLinearSrgb({ L, C, H }) {
  const hRad = (H * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);

  // l'/m'/s' (cube-root LMS) from the OKLab→LMS matrix; cubed to get LMS.
  const lp = L + 0.3963377774 * a + 0.2158037573 * b;
  const mp = L - 0.1055613458 * a - 0.0638541728 * b;
  const sp = L - 0.0894841775 * a - 1.291485548 * b;

  const l = lp * lp * lp;
  const m = mp * mp * mp;
  const s = sp * sp * sp;

  return {
    r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  };
}

// WCAG relative luminance from linear-sRGB (channels clamped into gamut).
function relativeLuminance({ r, g, b }) {
  const clamp = v => Math.min(1, Math.max(0, v));
  return 0.2126 * clamp(r) + 0.7152 * clamp(g) + 0.0722 * clamp(b);
}

function contrast(lumA, lumB) {
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

// WCAG AA threshold for normal text. The header name is small text, so this is
// the bar the chosen ink must clear.
const AA_NORMAL = 4.5;

/**
 * The readable header ink for an accent fill, computed from WCAG contrast.
 *
 * Policy: PREFER the near-white ink the reference uses, and keep it as long as
 * it clears AA against the fill. Only fall back to dark ink when white would
 * fail (a bright hue such as yellow) — and if even dark can't clear AA, take
 * whichever of the two has the higher contrast. This both honours the ref look
 * (white on blue/purple/orange) and guarantees a bright future hue can never
 * silently ship sub-AA white ink. Unparseable input → 'light' (historical
 * default).
 *
 * @param {string} accent  an `oklch(L C H)` colour string
 * @returns {'light'|'dark'}
 */
export function inkForAccent(accent) {
  const oklch = parseOklch(accent);
  if (!oklch) return 'light';
  const fillLum = relativeLuminance(oklchToLinearSrgb(oklch));
  const whiteContrast = contrast(1, fillLum); // white ink (lum 1)
  const blackContrast = contrast(0, fillLum); // black ink (lum 0)

  if (whiteContrast >= AA_NORMAL) return 'light'; // ref look, AA-safe
  if (blackContrast >= AA_NORMAL) return 'dark'; // white failed, dark is safe
  // Neither clears AA (a poorly-chosen accent) — take the best available so the
  // failure is as mild as possible. The colour itself should be fixed.
  return blackContrast > whiteContrast ? 'dark' : 'light';
}

export default inkForAccent;
