// algorythmo: operador-stock (Frente 2) — operator menu gating spec.
//
// Contract: the OPERATOR (role 'agent', isAdmin=false) sees a STOCK Chatwoot
// menu plus only CRM + Copiloto. Every Algorythmo admin surface must be gated by
// `isAdmin.value` in the sidebar source so it never renders for an agent:
//   - Início (reformulated admin landing)
//   - the 8 management sectors
//   - C-Levels (Sala de Conselho)  - Marketplace  - Brain
//   - the two CEO conversation sub-items (Operação ao Vivo, Caixa de Entrada)
// While CRM and Copiloto must remain UNGATED by isAdmin (visible to the agent).
//
// Strategy mirrors SidebarManagementOrder.spec.js — static source analysis, no
// mount (the menuItems computed lives inline in the SFC and a real mount needs
// the full Vuex/i18n/router stack).

import fs from 'node:fs';
import path from 'node:path';

const SIDEBAR_PATH = path.resolve(__dirname, '..', 'Sidebar.vue');
const source = fs.readFileSync(SIDEBAR_PATH, 'utf8');

// Matches `...(isAdmin.value ? [ { name: '<name>'` (whitespace/newline tolerant) —
// i.e. the entry is wrapped in an admin-only spread whose FIRST child is <name>.
const adminWrap = name =>
  new RegExp(
    `\\.\\.\\.\\(isAdmin\\.value\\s*\\?\\s*\\[\\s*\\{\\s*name: '${name}'`
  );

describe('operador-stock: sidebar admin surfaces are gated by isAdmin', () => {
  it('the 8 management sectors are role-gated (isAdmin) in addition to cut-flags', () => {
    const sectors = [
      'commercial',
      'marketing',
      'operations',
      'procurement',
      'hr',
      'facilities',
      'finance',
      'administration',
    ];
    sectors.forEach(s => {
      expect(source).toContain(
        `!isAdmin.value || algorythmoCutHidden.value.sector_${s}`
      );
    });
  });

  it('Início is admin-only (operator lands on stock conversations instead)', () => {
    expect(source).toMatch(adminWrap('AlgorythmoInicio'));
  });

  it('C-Levels (Sala de Conselho) is admin-only', () => {
    expect(source).toMatch(adminWrap('AdminCLevels'));
  });

  it('Marketplace is admin-only', () => {
    expect(source).toMatch(adminWrap('AdminMarketplace'));
  });

  it('Brain stays admin-only', () => {
    expect(source).toMatch(adminWrap('AlgorythmoBrain'));
  });

  it('the CEO conversation sub-items sit inside an admin-only spread before Folders', () => {
    const conversationIdx = source.indexOf("name: 'Conversation'");
    const childrenGateIdx = source.indexOf(
      '...(isAdmin.value',
      conversationIdx
    );
    const operacaoIdx = source.indexOf("name: 'OperacaoAoVivo'");
    const caixaIdx = source.indexOf("name: 'CaixaDeEntrada'");
    const foldersIdx = source.indexOf("name: 'Folders'");

    expect(conversationIdx).toBeGreaterThan(-1);
    expect(childrenGateIdx).toBeGreaterThan(conversationIdx);
    // Both CEO items live after the admin gate and before the stock Folders item.
    expect(operacaoIdx).toBeGreaterThan(childrenGateIdx);
    expect(caixaIdx).toBeGreaterThan(childrenGateIdx);
    expect(operacaoIdx).toBeLessThan(foldersIdx);
    expect(caixaIdx).toBeLessThan(foldersIdx);
  });
});

describe('operador-stock: the operator additions stay visible (NOT isAdmin-gated)', () => {
  it('Copiloto is not wrapped in an isAdmin spread', () => {
    expect(source).toContain("name: 'AlgorythmoCopilot'");
    expect(source).not.toMatch(adminWrap('AlgorythmoCopilot'));
  });

  it('CRM is gated by its feature flag, not by isAdmin', () => {
    expect(source).toContain('hasAlgorythmoCrm.value');
    expect(source).not.toMatch(adminWrap('AlgorythmoCrm'));
  });
});
