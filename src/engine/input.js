// Normalizes keyboard, mouse and touch into: a movement axis, a held "action"
// flag, tap events and zoom deltas. Systems never read raw DOM events.
import { clamp } from '../utils/math.js';

const MOVE_KEYS = {
  KeyW: [0, -1], ArrowUp: [0, -1],
  KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0],
  KeyD: [1, 0], ArrowRight: [1, 0],
};

export function createInput(canvas, events) {
  const keys = new Set();
  const joy = { active: false, id: null, x: 0, y: 0 };
  let actionKey = false;
  let actionBtn = false;
  let mouseHeld = false;
  let pinchDist = 0;

  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    keys.add(e.code);
    if (e.code === 'Space' || e.code === 'KeyE') { actionKey = true; e.preventDefault(); }
    if (e.code === 'Escape') events.emit('input.escape');
    if (e.code === 'KeyF') events.emit('input.interact');
    if (e.code === 'KeyM') events.emit('input.map');
  });
  window.addEventListener('keyup', (e) => {
    keys.delete(e.code);
    if (e.code === 'Space' || e.code === 'KeyE') actionKey = false;
  });
  window.addEventListener('blur', () => { keys.clear(); actionKey = false; mouseHeld = false; });

  // --- mouse / single-pointer on canvas: hold to harvest, quick tap to interact
  let downAt = 0, downX = 0, downY = 0;
  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') return; // touch uses joystick + tap handling below
    mouseHeld = true;
    downAt = performance.now(); downX = e.clientX; downY = e.clientY;
  });
  window.addEventListener('pointerup', (e) => {
    if (e.pointerType === 'touch') return;
    if (mouseHeld && performance.now() - downAt < 300 && Math.hypot(e.clientX - downX, e.clientY - downY) < 8) {
      events.emit('input.tap', { x: e.clientX, y: e.clientY });
    }
    mouseHeld = false;
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    events.emit('input.zoom', { factor: e.deltaY > 0 ? 0.92 : 1.08 });
  }, { passive: false });

  // --- touch: taps and pinch zoom on the canvas
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      pinchDist = touchDist(e);
    } else if (e.touches.length === 1) {
      downAt = performance.now(); downX = e.touches[0].clientX; downY = e.touches[0].clientY;
    }
  }, { passive: true });
  canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2 && pinchDist > 0) {
      const d = touchDist(e);
      events.emit('input.zoom', { factor: d / pinchDist });
      pinchDist = d;
    }
  }, { passive: true });
  canvas.addEventListener('touchend', (e) => {
    pinchDist = 0;
    if (e.changedTouches.length === 1 && performance.now() - downAt < 300) {
      const t = e.changedTouches[0];
      if (Math.hypot(t.clientX - downX, t.clientY - downY) < 12) {
        events.emit('input.tap', { x: t.clientX, y: t.clientY });
      }
    }
  }, { passive: true });

  // --- virtual joystick + action button (touch only)
  const joyEl = document.getElementById('joystick');
  const knob = document.getElementById('joy-knob');
  const actionEl = document.getElementById('btn-action');
  if (isTouchDevice) {
    joyEl.classList.remove('hidden');
    actionEl.classList.remove('hidden');

    joyEl.addEventListener('touchstart', (e) => {
      joy.active = true;
      joy.id = e.changedTouches[0].identifier;
      updateJoy(e);
    }, { passive: true });
    joyEl.addEventListener('touchmove', (e) => updateJoy(e), { passive: true });
    const endJoy = () => { joy.active = false; joy.x = 0; joy.y = 0; knob.style.transform = 'translate(-50%,-50%)'; };
    joyEl.addEventListener('touchend', endJoy);
    joyEl.addEventListener('touchcancel', endJoy);

    actionEl.addEventListener('touchstart', (e) => { e.preventDefault(); actionBtn = true; }, { passive: false });
    actionEl.addEventListener('touchend', () => { actionBtn = false; });
    actionEl.addEventListener('touchcancel', () => { actionBtn = false; });
  }

  function updateJoy(e) {
    const t = [...e.touches].find((x) => x.identifier === joy.id);
    if (!t) return;
    const r = joyEl.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const max = r.width / 2;
    let dx = (t.clientX - cx) / max;
    let dy = (t.clientY - cy) / max;
    const len = Math.hypot(dx, dy);
    if (len > 1) { dx /= len; dy /= len; }
    joy.x = dx; joy.y = dy;
    knob.style.transform = `translate(calc(-50% + ${dx * max * 0.55}px), calc(-50% + ${dy * max * 0.55}px))`;
  }

  function touchDist(e) {
    const [a, b] = e.touches;
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  }

  return {
    axis() {
      let x = 0, y = 0;
      for (const code of keys) {
        const v = MOVE_KEYS[code];
        if (v) { x += v[0]; y += v[1]; }
      }
      x += joy.x; y += joy.y;
      const len = Math.hypot(x, y);
      if (len > 1) { x /= len; y /= len; }
      return { x: clamp(x, -1, 1), y: clamp(y, -1, 1) };
    },
    actionHeld() {
      return actionKey || actionBtn || mouseHeld;
    },
  };
}
