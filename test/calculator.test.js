import test from 'node:test';
import assert from 'node:assert/strict';
import { wallTotals, roomTotals, projectTotals } from '../js/calculator.js';

const prices = {
  profile_corner: { price: 250 }, profile_bumper: { price: 310 },
  socket: { price: 450 }, inner_corner: { price: 600 }, outer_corner: { price: 850 }, soundproof: { price: 1200 }
};
const wall = {
  width: 4200, height: 2700,
  profiles: { top: 'profile_corner', bottom: 'profile_bumper', left: 'profile_corner', right: 'profile_corner' },
  extras: { socket: 4, inner_corner: 1, outer_corner: 2 },
  soundproof: { enabled: true, custom: false, area: 0 }
};

test('calculates wall area and all cost groups', () => {
  const total = wallTotals(wall, prices);
  assert.equal(total.area, 11.34);
  assert.equal(total.profiles, 3702);
  assert.equal(total.extras, 4100);
  assert.equal(total.soundproof, 13608);
  assert.equal(total.total, 21410);
});
test('supports no profiles and custom soundproof area', () => {
  const total = wallTotals({ ...wall, profiles: {}, extras: {}, soundproof: { enabled: true, custom: true, area: 5.5 } }, prices);
  assert.equal(total.profiles, 0); assert.equal(total.extras, 0); assert.equal(total.soundproof, 6600);
});
test('ignores invalid and negative quantities', () => {
  const total = wallTotals({ width: -1, height: 'x', profiles: {}, extras: { socket: -3 }, soundproof: { enabled: false } }, prices);
  assert.deepEqual(total, { area: 0, profiles: 0, extras: 0, soundproof: 0, total: 0, soundArea: 0 });
});
test('aggregates room and project totals', () => {
  const room = { walls: [wall, wall] }; const roomTotal = roomTotals(room, prices);
  assert.equal(roomTotal.area, 22.68); assert.equal(roomTotal.total, 42820);
  assert.deepEqual(projectTotals({ rooms: [room, { walls: [] }] }, prices), { area: 22.68, total: 42820 });
});
