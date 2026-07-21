// Shared drawing helpers. Sprite convention: caller translates the context to
// the tile center; 1 unit = 1 tile = s pixels. Ground line sits near y=0.3.
export const OUTLINE = '#122036';

export function circle(g, x, y, r, fill, stroke = null, lw = 0) {
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fillStyle = fill;
  g.fill();
  if (stroke) { g.lineWidth = lw; g.strokeStyle = stroke; g.stroke(); }
}

export function ellipse(g, x, y, rx, ry, fill) {
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  g.fillStyle = fill;
  g.fill();
}

export function rrect(g, x, y, w, h, r, fill, stroke = null, lw = 0) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  g.fillStyle = fill;
  g.fill();
  if (stroke) { g.lineWidth = lw; g.strokeStyle = stroke; g.stroke(); }
}

export function tri(g, x1, y1, x2, y2, x3, y3, fill) {
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.lineTo(x3, y3);
  g.closePath();
  g.fillStyle = fill;
  g.fill();
}

export function shadow(g, s, rx = 0.32, ry = 0.1, y = 0.3) {
  ellipse(g, 0, y * s, rx * s, ry * s, 'rgba(15, 30, 55, 0.22)');
}

// Cheap deterministic phase from tile coords so idle animations desync.
export function phaseOf(x, y) {
  return ((x * 7919 + y * 104729) % 628) / 100;
}
