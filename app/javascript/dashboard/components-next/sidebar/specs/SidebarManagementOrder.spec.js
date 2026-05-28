// algorythmo: M2-a — D1 Management block order spec.
// Verifies the rendered order of Management sector entries matches the D1 decision:
// Commercial → Marketing → Operations → Procurement → HR → Facilities (hidden) → Finance → Administration.
//
// Strategy: scan Sidebar.vue source as text and assert that the sector name
// constants appear in the required order. This is a static analysis approach —
// no need to mount the component (which would require the full Vuex/i18n/router stack).

import fs from 'node:fs';
import path from 'node:path';

const SIDEBAR_PATH = path.resolve(__dirname, '..', 'Sidebar.vue');

const source = fs.readFileSync(SIDEBAR_PATH, 'utf8');

// Extract position of each Management sector entry by looking for its
// unique `name:` identifier inside the menuItems computed.
const sectorNames = [
  'Reports', // 1. Commercial (was Reports block)
  'AdminMarketing', // 2. Marketing
  'AdminOperacao', // 3. Operations
  'AdminCompras', // 4. Procurement
  'AdminRh', // 5. HR
  'AdminFacilities', // 6. Facilities (behind cut-flag, position still matters)
  'AdminFinanceiro', // 7. Finance
  'AdminAdministracao', // 8. Administration
];

describe('Sidebar Management block order (D1)', () => {
  it('Management sectors appear in the source in D1 order', () => {
    const positions = sectorNames.map(name => {
      // Match `name: 'AdminMarketing'` or `name: 'Reports'` inside menuItems
      const idx = source.indexOf(`name: '${name}'`);
      expect(idx).toBeGreaterThan(-1); // sector entry must exist
      return { name, idx };
    });

    // Assert that each sector appears after the previous one in the source.
    for (let i = 1; i < positions.length; i += 1) {
      expect(positions[i].idx).toBeGreaterThan(positions[i - 1].idx);
    }
  });

  it('Facilities entry is gated by sector_facilities cut-flag', () => {
    // Facilities is the new sector (M2-a placeholder). Its presence in the source
    // must be conditional on `algorythmoCutHidden.value.sector_facilities`.
    const facilitiesIdx = source.indexOf("name: 'AdminFacilities'");
    expect(facilitiesIdx).toBeGreaterThan(-1);

    // The cut-flag check must appear BEFORE the Facilities entry in the source.
    const cutFlagIdx = source.indexOf('sector_facilities');
    expect(cutFlagIdx).toBeGreaterThan(-1);
    expect(cutFlagIdx).toBeLessThan(facilitiesIdx);
  });

  it('legacy Relatórios Comerciais i18n key is preserved as alias', () => {
    // Old key SIDEBAR.RELATORIOS_COMERCIAIS must still appear in the source
    // to preserve backward compat for consumers outside the sidebar.
    expect(source).toContain('SIDEBAR.RELATORIOS_COMERCIAIS_VISAO');
  });

  it('new English sector label keys are used in sidebar', () => {
    const englishKeys = [
      'SIDEBAR.ALG_SECTOR_COMMERCIAL',
      'SIDEBAR.ALG_SECTOR_MARKETING',
      'SIDEBAR.ALG_SECTOR_OPERATIONS',
      'SIDEBAR.ALG_SECTOR_PROCUREMENT',
      'SIDEBAR.ALG_SECTOR_HR',
      'SIDEBAR.ALG_SECTOR_FACILITIES',
      'SIDEBAR.ALG_SECTOR_FINANCE',
      'SIDEBAR.ALG_SECTOR_ADMINISTRATION',
    ];

    englishKeys.forEach(key => {
      expect(source).toContain(key);
    });
  });
});
