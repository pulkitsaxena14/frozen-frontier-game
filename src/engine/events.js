// Tiny pub/sub event bus. Systems emit, UI listens — no direct coupling.
export function createEventBus() {
  const listeners = new Map();

  return {
    on(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(fn);
      return () => listeners.get(type)?.delete(fn);
    },
    emit(type, payload) {
      const set = listeners.get(type);
      if (!set) return;
      for (const fn of set) {
        try {
          fn(payload);
        } catch (err) {
          console.error(`[events] listener for "${type}" failed`, err);
        }
      }
    },
  };
}
