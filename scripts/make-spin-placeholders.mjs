#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Generates placeholder frames for the 360° viewer.
 *
 * These exist so the interaction can be judged — the weight of the drag, how it
 * behaves on a phone, whether it feels worth building — before anybody spends
 * an afternoon photographing a car twenty-four times. They are deliberately
 * abstract and say PLACEHOLDER on every frame; nothing here is meant to look
 * like a real vehicle.
 *
 * The shape is a genuine three-dimensional projection rather than a trick, so
 * the rotation reads as rotation: a car-proportioned body and cabin, four
 * wheels, rotated about the vertical axis and drawn from a slightly raised
 * camera, with faces shaded by how they catch a fixed light.
 *
 * There is one shared set, under `_placeholder`, used by every car that has
 * no photographs of its own — including a car added a minute ago.
 *
 *   node scripts/make-spin-placeholders.mjs _placeholder 24
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const slug = process.argv[2] ?? 'jetour-x70-plus-2024';
const FRAMES = Number(process.argv[3] ?? 24);

const WIDTH = 1128;
const HEIGHT = 640;
const SCALE = 118; // pixels per metre
const ELEVATION = (14 * Math.PI) / 180; // camera raised slightly above the roof line

/** Rotate about the vertical axis, then project from a raised camera. */
function project([x, y, z], theta) {
  const xr = x * Math.cos(theta) - z * Math.sin(theta);
  const zr = x * Math.sin(theta) + z * Math.cos(theta);

  /*
   * A point further from a raised camera sits HIGHER on the screen, so the
   * depth term is added, not subtracted. With the sign the other way the car
   * came apart: the cabin floated off behind the body and the wheels scattered.
   */
  return {
    x: WIDTH / 2 + xr * SCALE,
    y: HEIGHT / 2 + 96 - (y * Math.cos(ELEVATION) + zr * Math.sin(ELEVATION)) * SCALE,
    // Larger `zr` is further from the camera, and the painter's sort below
    // draws furthest first — so this is the distance, not its negation.
    depth: zr,
  };
}

/** The six faces of a box, as corner indices into its eight vertices. */
const BOX_FACES = [
  [0, 1, 2, 3], // bottom
  [4, 5, 6, 7], // top
  [0, 1, 5, 4], // front
  [3, 2, 6, 7], // back
  [1, 2, 6, 5], // right
  [0, 3, 7, 4], // left
];

function box(cx, cy, cz, length, height, width) {
  const [hx, hz] = [length / 2, width / 2];
  const [y0, y1] = [cy, cy + height];
  return [
    [cx - hx, y0, cz - hz], [cx + hx, y0, cz - hz], [cx + hx, y0, cz + hz], [cx - hx, y0, cz + hz],
    [cx - hx, y1, cz - hz], [cx + hx, y1, cz - hz], [cx + hx, y1, cz + hz], [cx - hx, y1, cz + hz],
  ];
}

/** Surface normal of a projected face, used only for shading. */
function shade(points3d, theta) {
  const [a, b, c] = points3d;
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];

  // Into world space, then against a fixed light over the front-left shoulder.
  const nx = n[0] * Math.cos(theta) - n[2] * Math.sin(theta);
  const nz = n[0] * Math.sin(theta) + n[2] * Math.cos(theta);
  const len = Math.hypot(nx, n[1], nz) || 1;
  const light = [-0.4, 0.78, -0.48];
  const dot = (nx / len) * light[0] + (n[1] / len) * light[1] + (nz / len) * light[2];

  // Downward-facing surfaces stay dark; `abs` used to light the underside as
  // brightly as the roof, which read as a car lying on its back.
  const facingUp = n[1] > 0;
  return facingUp ? 0.34 + 0.66 * Math.max(0, dot) : 0.14 + 0.2 * Math.abs(dot);
}

/** Warm champagne-to-charcoal body, matching the site's palette. */
function bodyColour(intensity) {
  const from = [46, 43, 38];
  const to = [176, 138, 74];
  const mix = intensity ** 1.5;
  const channel = (i) => Math.round(from[i] + (to[i] - from[i]) * mix);
  return `rgb(${channel(0)},${channel(1)},${channel(2)})`;
}

function frame(index) {
  const theta = (index / FRAMES) * Math.PI * 2;
  const degrees = Math.round((index / FRAMES) * 360);

  const shapes = [];

  for (const [vertices, tint] of [
    [box(0, 0.42, 0, 4.42, 0.62, 1.88), 1], // body
    [box(-0.18, 1.04, 0, 2.52, 0.56, 1.72), 0.82], // cabin
  ]) {
    for (const face of BOX_FACES) {
      const corners3d = face.map((i) => vertices[i]);
      const projected = corners3d.map((p) => project(p, theta));
      const depth = projected.reduce((sum, p) => sum + p.depth, 0) / projected.length;
      shapes.push({
        depth,
        svg: `<polygon points="${projected.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}" fill="${bodyColour(shade(corners3d, theta) * tint)}" stroke="#0f0e0c" stroke-opacity="0.35" stroke-width="1.2"/>`,
      });
    }
  }

  // Wheels: an ellipse each, squashed as the axle turns away from the camera.
  for (const [wx, wz] of [[1.42, 0.96], [1.42, -0.96], [-1.5, 0.96], [-1.5, -0.96]]) {
    const hub = project([wx, 0.34, wz], theta);
    const across = Math.abs(Math.cos(theta + (wz > 0 ? 0 : Math.PI)));
    const contact = project([wx, 0, wz], theta);
    const rx = (0.34 * SCALE * (0.3 + 0.7 * (1 - across))).toFixed(1);
    shapes.push({
      depth: hub.depth,
      svg:
        `<ellipse cx="${contact.x.toFixed(1)}" cy="${contact.y.toFixed(1)}" rx="${(0.4 * SCALE).toFixed(1)}" ry="${(0.1 * SCALE).toFixed(1)}" fill="#000000" fill-opacity="0.35"/>` +
        `<ellipse cx="${hub.x.toFixed(1)}" cy="${hub.y.toFixed(1)}" rx="${rx}" ry="${(0.34 * SCALE).toFixed(1)}" fill="#14130f" stroke="#4a4238" stroke-width="2"/>` +
        `<ellipse cx="${hub.x.toFixed(1)}" cy="${hub.y.toFixed(1)}" rx="${(Number(rx) * 0.42).toFixed(1)}" ry="${(0.14 * SCALE).toFixed(1)}" fill="#2b2721"/>`,
    });
  }

  shapes.sort((a, b) => b.depth - a.depth);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}" role="img" aria-label="Placeholder frame at ${degrees} degrees">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0%" stop-color="#26231d"/><stop offset="60%" stop-color="#1c1a16"/><stop offset="100%" stop-color="#100f0d"/>
    </linearGradient>
    <radialGradient id="pool" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.55"/><stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <ellipse cx="${WIDTH / 2}" cy="${HEIGHT / 2 + 108}" rx="300" ry="54" fill="url(#pool)"/>
  ${shapes.map((s) => s.svg).join('\n  ')}
  <text x="${WIDTH / 2}" y="${HEIGHT - 34}" text-anchor="middle" font-family="ui-sans-serif, system-ui, sans-serif" font-size="19" letter-spacing="5" fill="#b08a4a" fill-opacity="0.75">PLACEHOLDER · ${String(degrees).padStart(3, '0')}°</text>
</svg>
`;
}

const directory = join('frontend', 'public', 'images', 'spin', slug);
mkdirSync(directory, { recursive: true });

for (let index = 0; index < FRAMES; index += 1) {
  writeFileSync(join(directory, `frame-${String(index + 1).padStart(2, '0')}.svg`), frame(index));
}

console.log(`${FRAMES} placeholder frames written to ${directory}`);
