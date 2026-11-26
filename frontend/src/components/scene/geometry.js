/**
 * Geometry for the schematic classroom shown when no camera stream is
 * connected (demo mode, or a camera without a stream URL).
 *
 * World units are metres. X runs across the room (0 = left wall as seen from
 * the back), Z runs from the back wall (0) to the front wall (10), Y is up.
 * Row A is the front row, nearest the board; row C is at the back.
 * The two rigs follow the guide's placement: Camera 1 high in the back-left
 * corner, Camera 2 high on the front-right wall angled toward the desks.
 */

export const VIEW = { width: 640, height: 360 };

const ROOM = { width: 8, depth: 10, height: 3.2 };
const ROW_Z = { A: 7.2, B: 5.2, C: 3.2 };
const COLUMN_X = [1.6, 3.2, 4.8, 6.4];
const NEAR = 0.2;

const RIGS = {
  overview: { pos: [0.35, 2.8, 0.3], target: [4.4, 0.35, 5.6], focal: 430 },
  desk: { pos: [7.75, 2.6, 9.7], target: [3.8, 0.45, 4.9], focal: 430 },
};

function makeRig({ pos, target, focal }) {
  const dx = target[0] - pos[0];
  const dy = target[1] - pos[1];
  const dz = target[2] - pos[2];
  return {
    pos,
    focal,
    yaw: Math.atan2(dx, dz),
    pitch: Math.atan2(-dy, Math.hypot(dx, dz)),
    cx: VIEW.width / 2,
    cy: VIEW.height / 2,
  };
}

function toCamera(rig, [x, y, z]) {
  const dx = x - rig.pos[0];
  const dy = y - rig.pos[1];
  const dz = z - rig.pos[2];
  const cosYaw = Math.cos(rig.yaw);
  const sinYaw = Math.sin(rig.yaw);
  const rx = dx * cosYaw - dz * sinYaw;
  const rz = dx * sinYaw + dz * cosYaw;
  const cosPitch = Math.cos(rig.pitch);
  const sinPitch = Math.sin(rig.pitch);
  return [rx, dy * cosPitch + rz * sinPitch, -dy * sinPitch + rz * cosPitch];
}

function toScreen(rig, [x, y, z]) {
  return [rig.cx + (rig.focal * x) / z, rig.cy - (rig.focal * y) / z];
}

// Sutherland–Hodgman against the near plane, so walls and floor that pass
// behind the camera still render correctly.
function clipNear(points) {
  const out = [];
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const aIn = a[2] >= NEAR;
    const bIn = b[2] >= NEAR;
    if (aIn) out.push(a);
    if (aIn !== bIn) {
      const t = (NEAR - a[2]) / (b[2] - a[2]);
      out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]), NEAR]);
    }
  }
  return out;
}

function polygon(rig, worldPoints) {
  const clipped = clipNear(worldPoints.map((point) => toCamera(rig, point)));
  if (clipped.length < 3) return null;
  return clipped.map((point) => toScreen(rig, point));
}

function segment(rig, a, b) {
  let ca = toCamera(rig, a);
  let cb = toCamera(rig, b);
  if (ca[2] < NEAR && cb[2] < NEAR) return null;
  const cut = (p, q) => {
    const t = (NEAR - p[2]) / (q[2] - p[2]);
    return [p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1]), NEAR];
  };
  if (ca[2] < NEAR) ca = cut(ca, cb);
  if (cb[2] < NEAR) cb = cut(cb, ca);
  return [toScreen(rig, ca), toScreen(rig, cb)];
}

const pointsAttr = (points) => points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

/** Visible faces of an axis-aligned box, each with a shade class by orientation. */
function shadedBox(rig, min, max, tone) {
  const [px, py, pz] = rig.pos;
  const [x0, y0, z0] = min;
  const [x1, y1, z1] = max;
  const faces = [
    [py > y1, "top", [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]],
    [pz < z0, "front", [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]]],
    [pz > z1, "front", [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]],
    [px < x0, "side", [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]]],
    [px > x1, "side", [[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]]],
  ];
  const parts = [];
  for (const [visible, shade, pts] of faces) {
    if (!visible) continue;
    const projected = polygon(rig, pts);
    if (projected) parts.push({ type: "poly", points: projected, className: `${tone}-${shade}` });
  }
  return parts;
}

function boundsOf(parts) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const part of parts) {
    const pts = part.type === "poly" ? part.points : [[part.cx - part.r, part.cy - part.r], [part.cx + part.r, part.cy + part.r]];
    for (const [x, y] of pts) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  return [minX, minY, maxX, maxY];
}

function depthOf(rig, point) {
  return toCamera(rig, point)[2];
}

function buildScene(role, rows, columns) {
  const rig = makeRig(RIGS[role] ?? RIGS.overview);
  const { width: W, depth: D, height: H } = ROOM;

  const background = [
    ["wall-back", [[0, 0, 0], [W, 0, 0], [W, H, 0], [0, H, 0]]],
    ["wall-front", [[0, 0, D], [W, 0, D], [W, H, D], [0, H, D]]],
    ["wall-left", [[0, 0, 0], [0, 0, D], [0, H, D], [0, H, 0]]],
    ["wall-right", [[W, 0, 0], [W, 0, D], [W, H, D], [W, H, 0]]],
    ["ceiling", [[0, H, 0], [W, H, 0], [W, H, D], [0, H, D]]],
    ["floor", [[0, 0, 0], [W, 0, 0], [W, 0, D], [0, 0, D]]],
    ["board-frame", [[2.3, 0.95, D - 0.01], [5.7, 0.95, D - 0.01], [5.7, 2.3, D - 0.01], [2.3, 2.3, D - 0.01]]],
    ["board", [[2.4, 1.02, D - 0.02], [5.6, 1.02, D - 0.02], [5.6, 2.22, D - 0.02], [2.4, 2.22, D - 0.02]]],
    ["window", [[0.01, 1.0, 2.0], [0.01, 1.0, 4.2], [0.01, 2.4, 4.2], [0.01, 2.4, 2.0]]],
    ["window", [[0.01, 1.0, 5.4], [0.01, 1.0, 7.6], [0.01, 2.4, 7.6], [0.01, 2.4, 5.4]]],
    ["door", [[W - 0.01, 0, 1.0], [W - 0.01, 0, 2.0], [W - 0.01, 2.1, 2.0], [W - 0.01, 2.1, 1.0]]],
  ]
    .map(([className, pts]) => ({ className, points: polygon(rig, pts) }))
    .filter((item) => item.points)
    .map((item) => ({ ...item, points: pointsAttr(item.points) }));

  const lines = [];
  for (let z = 1; z < D; z += 1) lines.push(segment(rig, [0, 0.001, z], [W, 0.001, z]));
  for (let x = 1; x < W; x += 1) lines.push(segment(rig, [x, 0.001, 0], [x, 0.001, D]));
  const floorLines = lines.filter(Boolean);

  const items = [];
  const seats = {};

  // Supervisor desk at the front, beside the board.
  const teacher = shadedBox(rig, [0.9, 0, 8.7], [2.5, 0.72, 9.4], "tdesk");
  items.push({ key: "teacher", kind: "furniture", depth: depthOf(rig, [1.7, 0.4, 9.05]), parts: teacher });

  rows.forEach((row, rowIndex) => {
    const z = ROW_Z[row] ?? 3.2 + (rows.length - 1 - rowIndex) * 2;
    for (let column = 1; column <= columns; column += 1) {
      const x = COLUMN_X[column - 1] ?? 1.6 * column;
      const seat = `${row}${column}`;

      const desk = [
        ...shadedBox(rig, [x - 0.55, 0, z - 0.3], [x - 0.5, 0.68, z + 0.3], "desk"),
        ...shadedBox(rig, [x + 0.5, 0, z - 0.3], [x + 0.55, 0.68, z + 0.3], "desk"),
        ...shadedBox(rig, [x - 0.58, 0.68, z - 0.32], [x + 0.58, 0.75, z + 0.32], "desk"),
      ];
      items.push({ key: `desk-${seat}`, kind: "desk", seat, depth: depthOf(rig, [x, 0.4, z]), parts: desk });

      const sz = z - 0.6;
      const head = toCamera(rig, [x, 1.36, sz]);
      const student = shadedBox(rig, [x - 0.22, 0.48, sz - 0.13], [x + 0.22, 1.2, sz + 0.13], "person");
      if (head[2] > NEAR) {
        const [hx, hy] = toScreen(rig, head);
        student.push({ type: "circle", cx: hx, cy: hy, r: (rig.focal * 0.12) / head[2], className: "person-head" });
      }
      items.push({ key: `student-${seat}`, kind: "student", seat, depth: depthOf(rig, [x, 0.9, sz]), parts: student });

      const label = toScreen(rig, toCamera(rig, [x, 0.76, z + 0.05]));
      seats[seat] = { label, bounds: boundsOf([...desk, ...student]) };
    }
  });

  items.sort((a, b) => b.depth - a.depth);
  for (const item of items) {
    item.parts = item.parts.map((part) =>
      part.type === "poly" ? { ...part, points: pointsAttr(part.points) } : part,
    );
  }

  return { background, floorLines, items, seats };
}

const cache = new Map();

/** Memoised: geometry depends only on camera role and seat layout. */
export function getScene(role, layout) {
  const rows = layout?.rows ?? ["A", "B", "C"];
  const columns = layout?.columns ?? 4;
  const key = `${role}|${rows.join("")}|${columns}`;
  if (!cache.has(key)) cache.set(key, buildScene(role, rows, columns));
  return cache.get(key);
}

// Exported for tests.
export const _internal = { makeRig, toCamera, toScreen, clipNear };
