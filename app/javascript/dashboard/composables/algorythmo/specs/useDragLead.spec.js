// algorythmo: feature-gate algorythmo_crm
import { describe, it, expect, vi } from 'vitest';
import { useDragLead } from '../useDragLead.js';

function evt(extra = {}) {
  return {
    preventDefault: vi.fn(),
    currentTarget: 'col',
    target: 'col',
    dataTransfer: {
      effectAllowed: '',
      dropEffect: '',
      setData: vi.fn(),
    },
    ...extra,
  };
}

describe('useDragLead', () => {
  it('captures dragging payload on start and clears on end', () => {
    const drag = useDragLead({
      onMove: vi.fn(),
      announceMoved: vi.fn(),
      announceFailed: vi.fn(),
    });
    drag.start(evt(), { leadId: 42, fromStageId: 1, leadName: 'Maria' });
    expect(drag.dragging.value).toEqual({
      leadId: 42,
      fromStageId: 1,
      leadName: 'Maria',
    });
    drag.end();
    expect(drag.dragging.value).toBeNull();
  });

  it('calls onMove with from→to and announces the move on drop', async () => {
    const onMove = vi.fn().mockResolvedValue();
    const announceMoved = vi.fn();
    const drag = useDragLead({
      onMove,
      announceMoved,
      announceFailed: vi.fn(),
    });

    drag.start(evt(), { leadId: 42, fromStageId: 1, leadName: 'Maria' });
    await drag.drop(evt(), { stageId: 2, stageName: 'Qualificado' });

    expect(onMove).toHaveBeenCalledWith({
      leadId: 42,
      fromStageId: 1,
      toStageId: 2,
    });
    expect(announceMoved).toHaveBeenCalledWith({
      leadName: 'Maria',
      stageName: 'Qualificado',
    });
  });

  it('skips onMove on intra-stage drop (Q-B3)', async () => {
    const onMove = vi.fn();
    const drag = useDragLead({
      onMove,
      announceMoved: vi.fn(),
      announceFailed: vi.fn(),
    });
    drag.start(evt(), { leadId: 42, fromStageId: 1, leadName: 'M' });
    await drag.drop(evt(), { stageId: 1, stageName: 'Novo' });
    expect(onMove).not.toHaveBeenCalled();
  });

  it('announces failure when onMove rejects', async () => {
    const onMove = vi.fn().mockRejectedValue(new Error('boom'));
    const announceFailed = vi.fn();
    const drag = useDragLead({
      onMove,
      announceMoved: vi.fn(),
      announceFailed,
    });
    drag.start(evt(), { leadId: 42, fromStageId: 1, leadName: 'Maria' });
    await drag.drop(evt(), { stageId: 2, stageName: 'Qualificado' });
    expect(announceFailed).toHaveBeenCalledWith({ leadName: 'Maria' });
  });

  it('tracks hovered stage between enter/leave', () => {
    const drag = useDragLead({
      onMove: vi.fn(),
      announceMoved: vi.fn(),
      announceFailed: vi.fn(),
    });
    drag.start(evt(), { leadId: 42, fromStageId: 1, leadName: 'M' });
    drag.enter(evt(), 2);
    expect(drag.hoveredStageId.value).toBe(2);
    drag.leave(evt(), 2);
    expect(drag.hoveredStageId.value).toBeNull();
  });
});
