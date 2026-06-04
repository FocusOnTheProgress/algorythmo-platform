// algorythmo: PR7 — Copiloto sidebar menu entry spec.
//
// Mounting Sidebar.vue needs the full Vuex/i18n/router stack, so — like the
// existing sidebar specs (SidebarManagementOrder etc.) — this asserts the
// menu contract via static analysis of the source.
//
// The contract that matters for the Copiloto: it is the OPERATOR's tool, so its
// menu entry must appear for AGENTS as well as admins. Concretely:
//   · the entry exists, under INTELIGÊNCIA, routing to algorythmo_copilot
//   · it is NOT wrapped in an isAdmin gate (the Brain entry above it IS)
//   · the INTELIGÊNCIA section header is no longer admin-only (otherwise an
//     agent would see a headerless item)
import fs from 'node:fs';
import path from 'node:path';

const SIDEBAR_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'components-next',
  'sidebar',
  'Sidebar.vue'
);
const source = fs.readFileSync(SIDEBAR_PATH, 'utf8');

describe('Copiloto sidebar entry', () => {
  it('exists and routes to algorythmo_copilot', () => {
    expect(source).toContain("name: 'AlgorythmoCopilot'");
    expect(source).toContain("activeOn: ['algorythmo_copilot']");
    expect(source).toContain("accountScopedRoute('algorythmo_copilot')");
    expect(source).toContain('ALGORYTHMO_COPILOT.SIDEBAR.COPILOT');
  });

  it('uses a sparkles icon', () => {
    const idx = source.indexOf("name: 'AlgorythmoCopilot'");
    const block = source.slice(idx, idx + 300);
    expect(block).toContain('i-lucide-sparkles');
  });

  it('appears AFTER the Brain entry (sibling under INTELIGÊNCIA)', () => {
    const brainIdx = source.indexOf("name: 'AlgorythmoBrain'");
    const copilotIdx = source.indexOf("name: 'AlgorythmoCopilot'");
    const sectionIdx = source.indexOf("name: 'section-inteligencia'");
    expect(sectionIdx).toBeGreaterThan(-1);
    expect(brainIdx).toBeGreaterThan(sectionIdx);
    expect(copilotIdx).toBeGreaterThan(brainIdx);
  });

  it('is NOT gated by isAdmin (visible to agents — the operator tool)', () => {
    // The Copiloto entry must be a plain object literal in the menu array, not
    // spread behind `...(isAdmin.value ? [ … ] : [])`. We verify the nearest
    // `isAdmin.value` BEFORE the Copiloto entry belongs to the Brain block
    // (which closes with `: [])`) and not to a wrapper around the Copiloto.
    const copilotIdx = source.indexOf("name: 'AlgorythmoCopilot'");
    // Slice from the Brain entry to the Copiloto entry.
    const brainIdx = source.indexOf("name: 'AlgorythmoBrain'");
    const between = source.slice(brainIdx, copilotIdx);
    // The Brain's admin gate must CLOSE (`: [])`) before the Copiloto entry,
    // proving the Copiloto is outside any isAdmin spread.
    expect(between).toContain(': [])');
    // And there is no OPENING isAdmin spread re-introduced right before the
    // Copiloto object.
    const justBefore = source.slice(copilotIdx - 120, copilotIdx);
    expect(justBefore).not.toContain('isAdmin.value');
  });

  it('renders the INTELIGÊNCIA section header for any role (not admin-only)', () => {
    // The section header object must NOT sit inside an `isAdmin.value ? [...]`
    // spread — otherwise an agent sees the Copiloto with no header.
    const sectionIdx = source.indexOf("name: 'section-inteligencia'");
    const justBefore = source.slice(sectionIdx - 200, sectionIdx);
    expect(justBefore).not.toContain('isAdmin.value\n');
    // The brace just before should be a plain object literal `{`, not a spread.
    expect(justBefore).not.toMatch(/isAdmin\.value\s*\?\s*\[\s*\{\s*$/);
  });
});
