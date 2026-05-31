import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tokens = readFileSync(resolve(__dirname, '..', '_tokens.scss'), 'utf8');
const components = readFileSync(
  resolve(__dirname, '..', '_components.scss'),
  'utf8'
);

describe('aurora beam tokens', () => {
  it('keeps the beam exception in the reduced-motion block', () => {
    expect(tokens).toMatch(/alg-aurora-border__beam/);
  });

  it('beam travels the full perimeter via an animated angle', () => {
    expect(components).toMatch(/--alg-aurora-angle/);
  });

  it('beam uses the ICE register, not magenta', () => {
    expect(components).toMatch(/--alg-beam-h/);
  });

  // algorythmo: Stream E (plan 0011) — paper-mode beam treatment.
  // A white/ice comet is INVISIBLE on the paper canvas. The lightness ladder is
  // lifted to --alg-beam-l-* tokens so [data-theme='white'] can flip it to ink.
  // These guards stop a refactor from silently re-hardcoding the white comet and
  // re-breaking the beam in light mode.
  it('the conic gradient reads the beam lightness from tokens (not hardcoded)', () => {
    expect(components).toMatch(/--alg-beam-l-peak/);
    expect(components).toMatch(/--alg-beam-l-edge/);
  });

  it('defines the dark beam ladder (white comet) on the default root', () => {
    expect(tokens).toMatch(/--alg-beam-l-peak:\s*1\b/);
  });

  it('flips the beam ladder to ink under the paper theme', () => {
    // The paper block must redefine the beam peak to a low (ink) lightness so
    // the comet reads as dark on the light canvas.
    const whiteBlock = tokens.slice(tokens.indexOf("[data-theme='white']"));
    expect(whiteBlock).toMatch(/--alg-beam-l-peak:\s*0\.\d/);
  });

  it('re-tones the ICE ring + glow to ink under the paper theme', () => {
    const whiteBlock = tokens.slice(tokens.indexOf("[data-theme='white']"));
    expect(whiteBlock).toMatch(/--alg-ice-1:/);
    expect(whiteBlock).toMatch(/--alg-aurora-border-base:/);
    expect(whiteBlock).toMatch(/--alg-aurora-border-glow:/);
  });
});
