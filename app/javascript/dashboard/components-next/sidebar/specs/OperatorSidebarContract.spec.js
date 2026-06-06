// algorythmo: operador — OperatorSidebar contract.
//
// Founder requirement (final, non-negotiable): the operator (non-admin) screen
// must be IDENTICAL to upstream Chatwoot — the build anyone self-hosting on their
// own VPS would have. OperatorSidebar.vue is therefore a VERBATIM copy of the
// upstream chatwoot/chatwoot v4.14.0 sidebar
// (app/javascript/dashboard/components-next/sidebar/Sidebar.vue): Chatwoot logo,
// built-in Captain, ZERO Algorythmo additions. CRM/Copiloto/Modeloja brand were
// removed from the operator rail (kept in the codebase, off) — the founder will
// decide their placement later. This spec locks that contract via static source
// analysis (a real mount needs the full Vuex/i18n/router stack).

import fs from 'node:fs';
import path from 'node:path';

const SIDEBAR_DIR = path.resolve(__dirname, '..');
const operatorSrc = fs.readFileSync(
  path.join(SIDEBAR_DIR, 'OperatorSidebar.vue'),
  'utf8'
);
const dashboardSrc = fs.readFileSync(
  path.resolve(
    __dirname,
    '..',
    '..',
    '..',
    'routes',
    'dashboard',
    'Dashboard.vue'
  ),
  'utf8'
);

describe('OperatorSidebar = pure upstream Chatwoot (zero Algorythmo additions)', () => {
  it('keeps the full upstream Chatwoot agent surfaces', () => {
    [
      "name: 'Inbox'",
      "name: 'Conversation'",
      "name: 'Captain'",
      "name: 'Contacts'",
      "name: 'Companies'",
      "name: 'Reports'",
      "name: 'Campaigns'",
      "name: 'Portals'",
      "name: 'Settings'",
    ].forEach(marker => expect(operatorSrc).toContain(marker));
    // Upstream conversation sub-views.
    expect(operatorSrc).toContain("name: 'All'");
    expect(operatorSrc).toContain("name: 'Mentions'");
  });

  it('uses the stock Chatwoot Logo, not the Modeloja brand', () => {
    expect(operatorSrc).toContain("import Logo from 'next/icon/Logo.vue'");
    expect(operatorSrc).not.toContain('AlgBrandLogo');
  });

  it('carries NO Algorythmo additions (no CRM, no Copiloto)', () => {
    [
      'AlgorythmoCrm',
      'AlgorythmoCopilot',
      'hasAlgorythmoCrm',
      'ALGORYTHMO_CRM',
      'ALGORYTHMO_COPILOT',
    ].forEach(marker => expect(operatorSrc).not.toContain(marker));
  });

  it('keeps the upstream built-in Captain ungated (it is stock)', () => {
    // Captain is a plain menu entry in upstream — not behind any Algorythmo flag.
    expect(operatorSrc).not.toContain('hasCaptain');
    expect(operatorSrc).not.toContain('ALGORYTHMO_SHOW_CAPTAIN');
  });

  it('does NOT carry the admin-only Algorythmo surfaces', () => {
    [
      'AlgorythmoInicio',
      'AdminCLevels',
      'AlgorythmoBrain',
      "type: 'section'",
    ].forEach(marker => expect(operatorSrc).not.toContain(marker));
  });
});

describe('Dashboard mounts the sidebar by role', () => {
  it('renders NextSidebar for admins and OperatorSidebar for everyone else', () => {
    expect(dashboardSrc).toContain('OperatorSidebar');
    expect(dashboardSrc).toMatch(/<NextSidebar\s+v-if="isAdmin"/);
    expect(dashboardSrc).toMatch(/<OperatorSidebar\s+v-else/);
  });
});
