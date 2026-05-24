// algorythmo: feature-gate algorythmo_crm
// Drag-and-drop coordinator for the Kanban surface.
//
// Why HTML5 drag (and not Sortable/pointer events): the upstream Chatwoot
// codebase already ships SortableJS via vuedraggable for ConversationList.
// We deliberately use the native HTML5 drag API here because:
//   1. Native drag events fire on the DROP TARGET (dragenter/dragover/drop),
//      which is exactly the StageColumn → drop semantic we need.
//   2. The keyboard fallback (MoveLeadModal triggered by `Mover` action) is
//      tested via Playwright and does NOT depend on this composable —
//      keyboard users never enter the HTML5 drag pathway.
//   3. SortableJS forces a list-based DOM structure that conflicts with
//      stage-empty-state rendering inside the same column.
//
// Accessibility:
//   - `announce(text)` writes to the parent's aria-live region (CONTRACT §8).
//   - Cards keep `draggable="true"`, but the activate keystroke (Enter/Space)
//     opens the drawer, not drag. Drag is mouse-only by design.

import { ref, readonly } from 'vue';

export function useDragLead({ onMove, announceMoved, announceFailed }) {
  const dragging = ref(null); // { leadId, fromStageId, leadName }
  const hoveredStageId = ref(null);

  function start(event, { leadId, fromStageId, leadName }) {
    if (!event.dataTransfer) return;
    dragging.value = { leadId, fromStageId, leadName };
    event.dataTransfer.effectAllowed = 'move';
    // Some browsers require a payload to start the drag; the value itself
    // is not consumed (the composable holds the truth in `dragging`).
    event.dataTransfer.setData('text/plain', String(leadId));
  }

  function enter(event, stageId) {
    if (!dragging.value) return;
    event.preventDefault();
    hoveredStageId.value = stageId;
  }

  function over(event) {
    if (!dragging.value) return;
    // preventDefault is mandatory for drop to fire on this target.
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  }

  function leave(event, stageId) {
    if (!dragging.value) return;
    // dragleave fires on every child; only clear when leaving the column
    // itself, not its descendants.
    if (
      event.currentTarget === event.target &&
      hoveredStageId.value === stageId
    ) {
      hoveredStageId.value = null;
    }
  }

  async function drop(event, { stageId, stageName }) {
    event.preventDefault();
    const payload = dragging.value;
    dragging.value = null;
    hoveredStageId.value = null;
    if (!payload) return;
    if (payload.fromStageId === stageId) return; // Q-B3: intra-stage reorder disabled.

    try {
      await onMove({
        leadId: payload.leadId,
        fromStageId: payload.fromStageId,
        toStageId: stageId,
      });
      announceMoved?.({ leadName: payload.leadName, stageName });
    } catch (err) {
      announceFailed?.({ leadName: payload.leadName });
      // eslint-disable-next-line no-console
      console.error('algorythmo:drag-drop-move-failed', err);
    }
  }

  function end() {
    dragging.value = null;
    hoveredStageId.value = null;
  }

  return {
    dragging: readonly(dragging),
    hoveredStageId: readonly(hoveredStageId),
    start,
    enter,
    over,
    leave,
    drop,
    end,
  };
}
