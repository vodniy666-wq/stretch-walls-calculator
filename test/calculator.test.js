import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { wallTotals, roomTotals, projectTotals, projectEstimate, money } from '../js/calculator.js';

const priceList = JSON.parse(await readFile(new URL('../data/prices.json', import.meta.url), 'utf8'));
const prices = Object.fromEntries(priceList.map(item => [item.id, item]));
const wall = {
  width: 4200, height: 2700,
  material: 'material_stretch_wall',
  profiles: { top: 'profile_basic', bottom: 'profile_divider', left: 'profile_inner_corner', right: 'profile_outer_corner' },
  extras: {
    socket_type_1: 1, socket_type_2: 2, socket_type_3: 3,
    adhesive_contact_5kg: 2, adhesive_spray_650ml: 1, washer_pack_50: 3, hf_band: 1
  },
  soundproof: { id: 'soundproof_acoustic_felt', custom: false, area: 0 }
};

test('calculates wall area and all cost groups from the real price data', () => {
  const total = wallTotals(wall, prices);
  assert.equal(total.area, 11.34);
  assert.equal(total.material, 4093.74);
  assert.equal(total.profiles, 4605.3);
  assert.equal(total.extras, 11746);
  assert.equal(total.soundproof, 11612.16);
  assert.equal(total.total, 32057.2);
});

test('supports each soundproof choice and a custom area', () => {
  for (const [id, price] of [
    ['soundproof_heavy_felt', 2200], ['soundproof_acoustic_felt', 1024], ['soundproof_softlight_15', 153]
  ]) {
    const total = wallTotals({ ...wall, profiles: {}, extras: {}, soundproof: { id, custom: true, area: 5.5 } }, prices);
    assert.equal(total.soundArea, 5.5);
    assert.equal(total.soundproof, 5.5 * price);
  }
  assert.equal(wallTotals({ ...wall, soundproof: { id: '' } }, prices).soundproof, 0);
});

test('uses the wall area by default for soundproofing', () => {
  const total = wallTotals({ ...wall, soundproof: { id: 'soundproof_softlight_15', custom: false, area: 1 } }, prices);
  assert.equal(total.soundArea, 11.34);
  assert.equal(total.soundproof, 11.34 * 153);
});

test('ignores invalid quantities, removed extras, and non-extra price items', () => {
  const total = wallTotals({
    width: -1, height: 'x', profiles: {},
    extras: { socket_type_1: -3, inner_corner: 5, profile_basic: 10 }, soundproof: { id: '' }
  }, prices);
  assert.deepEqual(total, { area: 0, material: 0, profiles: 0, extras: 0, soundproof: 0, total: 0, soundArea: 0 });
});

test('aggregates room and project totals', () => {
  const room = { walls: [wall, wall] }; const roomTotal = roomTotals(room, prices);
  assert.equal(roomTotal.area, 22.68); assert.equal(roomTotal.extras, 23492); assert.equal(roomTotal.total, 64114.4);
  assert.deepEqual(projectTotals({ rooms: [room, { walls: [] }] }, prices), { area: 22.68, total: 64114.4 });
});

test('keeps the legacy enabled soundproof setting calculable', () => {
  const total = wallTotals({ ...wall, soundproof: { enabled: true, custom: true, area: 2 } }, prices);
  assert.equal(total.soundproof, 4400);
});

test('formats fractional prices without rounding them to whole rubles', () => {
  assert.equal(money(262.5), '262,5 ₽');
  assert.equal(money(371.55), '371,55 ₽');
});

test('groups estimate positions by id across rooms and walls in the required order', () => {
  const secondWall = structuredClone(wall);
  secondWall.width = 3000;
  secondWall.height = 2000;
  secondWall.profiles = { top: 'profile_basic', bottom: 'profile_basic', left: '', right: '' };
  secondWall.extras = { socket_type_1: 2, adhesive_contact_5kg: 1 };
  secondWall.soundproof = { id: 'soundproof_acoustic_felt', custom: true, area: 2.75 };
  const estimate = projectEstimate({ rooms: [{ walls: [wall] }, { walls: [secondWall] }] }, prices);

  assert.deepEqual(estimate.groups.map(group => group.name), [
    'Материал', 'Профили', 'Подрозетники / закладные', 'Звукоизоляция', 'Дополнительные расходники'
  ]);
  const rows = Object.fromEntries(estimate.groups.flatMap(group => group.rows).map(row => [row.id, row]));
  assert.equal(rows.material_stretch_wall.quantity, 17.34);
  assert.equal(rows.profile_basic.quantity, 10.2);
  assert.equal(rows.socket_type_1.quantity, 3);
  assert.equal(rows.soundproof_acoustic_felt.quantity, 14.09);
  assert.equal(rows.adhesive_contact_5kg.quantity, 3);
  assert.equal(estimate.groups.flatMap(group => group.rows).filter(row => row.id === 'profile_basic').length, 1);
});

test('estimate row totals add up to the project total', () => {
  const project = { rooms: [{ walls: [wall, structuredClone(wall)] }, { walls: [structuredClone(wall)] }] };
  const estimate = projectEstimate(project, prices);
  const rowTotal = estimate.groups.flatMap(group => group.rows).reduce((sum, row) => sum + row.total, 0);
  assert.equal(estimate.total, rowTotal);
  assert.equal(estimate.total, projectTotals(project, prices).total);
});
