// algorythmo: stream-b — SidebarContactsItem spec (plan 0011).
// Asserts the Contacts sidebar entry always renders (including with zero
// segments/labels) and routes to contacts_dashboard_index.
//
// The regression: when all Contacts children are sub-group headers (Segments,
// Tagged With) with no direct 'to', hasAccessibleChildren=false and the
// Policy v-if='!hasChildren || hasAccessibleChildren' evaluates to false —
// the entire Contacts item becomes invisible on a fresh account (exactly the
// empty-state scenario this PR targets).
//
// Strategy: static source analysis of SidebarGroup.vue (v-if guard) and
// Sidebar.vue (Contacts item shape). No component mount needed — the fix is
// in the conditionals and the item definition.

import fs from 'node:fs';
import path from 'node:path';

const SIDEBAR_GROUP_PATH = path.resolve(__dirname, '..', 'SidebarGroup.vue');
// Sidebar.vue lives in the same directory as SidebarGroup.vue
const SIDEBAR_VUE_PATH = path.resolve(__dirname, '..', 'Sidebar.vue');

const groupSource = fs.readFileSync(SIDEBAR_GROUP_PATH, 'utf8');
const sidebarSource = fs.readFileSync(SIDEBAR_VUE_PATH, 'utf8');

// Extract the template block of SidebarGroup for v-if inspection.
const templateStart = groupSource.indexOf('<template>');
const templateSection =
  templateStart >= 0 ? groupSource.slice(templateStart) : groupSource;
const scriptSection = groupSource.slice(
  0,
  templateStart >= 0 ? templateStart : groupSource.length
);

describe('SidebarContactsItem — always-render with zero segments/labels (stream-b)', () => {
  it('SidebarGroup Policy v-if includes || !!to guard so navigable parents render even when all children are sub-group headers', () => {
    // The critical fix: a parent with 'to' must render regardless of
    // hasAccessibleChildren (which is false when all children have no direct 'to').
    const vIfMatch = templateSection.match(/<Policy[^>]+v-if="([^"]+)"/s);
    expect(vIfMatch).not.toBeNull();
    const condition = vIfMatch[1];
    // Must include the parent-to guard so Contacts (and any future expandable
    // item with a parent route) renders on fresh accounts.
    expect(condition).toContain('!!to');
    // Must not have regressed the original guard.
    expect(condition).toContain('!hasChildren');
    expect(condition).toContain('hasAccessibleChildren');
  });

  it('toggleTrigger navigates to props.to when no accessible children and parent has to', () => {
    // When Contacts is collapsed, clicking the header must navigate to
    // contacts_dashboard_index even though accessibleItems is empty.
    expect(scriptSection).toContain('!hasAccessibleChildren.value');
    expect(scriptSection).toContain('props.to');
    expect(scriptSection).toContain('router.push(props.to)');
  });

  it('handleCollapsedClick falls back to props.to when no accessible children', () => {
    // Same logic for the icon-only collapsed sidebar state.
    const collapsedClickIdx = scriptSection.indexOf('handleCollapsedClick');
    expect(collapsedClickIdx).toBeGreaterThan(-1);
    const snippet = scriptSection.slice(
      collapsedClickIdx,
      collapsedClickIdx + 400
    );
    expect(snippet).toContain('props.to');
  });

  it('Contacts item in Sidebar.vue has a parent-level to pointing to contacts_dashboard_index', () => {
    // The Contacts item must carry a 'to' resolved via accountScopedRoute so
    // the header is navigable even when Segments and Tagged With are empty.
    expect(sidebarSource).toContain("'contacts_dashboard_index'");
    // The Contacts group definition must include activeOn for contacts_dashboard_index
    // so isActive reflects correctly when the user is on the list page.
    const contactsIdx = sidebarSource.indexOf("name: 'Contacts'");
    expect(contactsIdx).toBeGreaterThan(-1);
    const contactsBlock = sidebarSource.slice(contactsIdx, contactsIdx + 800);
    expect(contactsBlock).toContain('contacts_dashboard_index');
    expect(contactsBlock).toContain('activeOn');
  });

  it('Contacts children contain Segments and Tagged With sub-groups (no direct leaf with contacts_dashboard_index)', () => {
    // Confirms the scenario that triggered the regression: Contacts children
    // are sub-groups without a direct 'to', making accessibleItems empty.
    const contactsIdx = sidebarSource.indexOf("name: 'Contacts'");
    const contactsBlock = sidebarSource.slice(contactsIdx, contactsIdx + 1200);
    expect(contactsBlock).toContain("name: 'Segments'");
    expect(contactsBlock).toContain("name: 'Tagged With'");
  });
});
