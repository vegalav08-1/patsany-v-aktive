type Actions = { active: () => boolean; lane: () => number; move: (lane: number) => void; pause: () => void };
export function installInput(canvas: HTMLCanvasElement, actions: Actions) {
  let gesture: { id: number; x: number; y: number } | null = null;
  canvas.addEventListener('pointerdown', e => {
    if (!actions.active() || !e.isPrimary || e.button !== 0) return;
    gesture = { id: e.pointerId, x: e.clientX, y: e.clientY };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointerup', e => {
    if (!gesture || gesture.id !== e.pointerId) return;
    const { x, y } = gesture; gesture = null;
    if (!actions.active()) return;
    const dx = e.clientX - x, dy = e.clientY - y;
    if (Math.abs(dx) >= 25 && Math.abs(dx) > Math.abs(dy) * 1.15) {
      actions.move(actions.lane() + Math.sign(dx));
    } else if (Math.hypot(dx, dy) < 20) {
      const rect = canvas.getBoundingClientRect();
      // Road spans the middle 78% of the Canvas, matching the renderer.
      actions.move(Math.max(0, Math.min(2, Math.floor(((e.clientX - rect.left) / rect.width - .11) / .26))));
    }
  });
  const cancel = () => { gesture = null; };
  canvas.addEventListener('pointercancel', cancel);
  canvas.addEventListener('lostpointercapture', cancel);
  window.addEventListener('keydown', e => {
    if ((e.target as HTMLElement).closest('input,textarea,select,button')) return;
    if (['ArrowLeft', 'ArrowRight', 'a', 'A', 'd', 'D', 'ф', 'Ф', 'в', 'В'].includes(e.key) && actions.active()) {
      e.preventDefault(); if (e.repeat) return;
      actions.move(actions.lane() + (['ArrowLeft', 'a', 'A', 'ф', 'Ф'].includes(e.key) ? -1 : 1));
    }
    if (e.key === 'Escape' || e.key.toLowerCase() === 'p') { e.preventDefault(); actions.pause(); }
  });
}
