// algorythmo: operador — OperatorSidebar contract.
//
// The operator (non-admin) renders OperatorSidebar: a FAITHFUL port of the
// upstream Chatwoot v4.14.0 sidebar (the "improved Chatwoot" rail) PLUS our two
// additions — CRM and Copiloto — and the Modeloja brand. This spec locks that
// contract via static source analysis (mirrors SidebarManagementOrder.spec.js;
// a real mount needs the full Vuex/i18n/router stack).

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

describe('OperatorSidebar = improved Chatwoot (upstream rail + CRM + Copiloto)', () => {
  it('keeps the upstream Chatwoot agent surfaces', () => {
    // Core upstream items the operator must have (the full Chatwoot experience).
    [
      "name: 'Inbox'",
      "name: 'Conversation'",
      "name: 'Contacts'",
      "name: 'Companies'",
    ].forEach(marker => expect(operatorSrc).toContain(marker));
    // Upstream conversation sub-views (static — render even with no inbox yet).
    expect(operatorSrc).toContain("name: 'All'");
    expect(operatorSrc).toContain("name: 'Mentions'");
  });

  it('adds CRM (flag-gated) and Copiloto (always visible)', () => {
    expect(operatorSrc).toContain("name: 'AlgorythmoCrm'");
    expect(operatorSrc).toContain('hasAlgorythmoCrm.value');
    expect(operatorSrc).toContain("name: 'AlgorythmoCopilot'");
    expect(operatorSrc).toContain(
      "to: accountScopedRoute('algorythmo_copilot')"
    );
  });

  it('keeps the Modeloja brand (AlgBrandLogo), not the Chatwoot Logo', () => {
    expect(operatorSrc).toContain('AlgBrandLogo');
    expect(operatorSrc).not.toContain("import Logo from 'next/icon/Logo.vue'");
  });

  it('does NOT carry the admin-only Algorythmo surfaces', () => {
    // No sectors / council / Início / Brain / section headers in the operator rail.
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
