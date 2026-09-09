import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { blankProject, blankRoom, blankWall } from '../src/store.js';
import { area, wallTotals, roomTotals } from '../src/calculations.js';

const prices = JSON.parse(await readFile(new URL('../public/prices.json', import.meta.url)));

test('complete object, room and wall calculation flow', () => {
  const project = blankProject();
  project.name = 'Квартира на Лесной';
  const room = blankRoom(1);
  room.name = 'Спальня';
  const wall = blankWall(1);

  wall.width = 5000;
  wall.height = 2800;
  wall.profiles = {
    top: 'profile_corner',
    bottom: 'profile_bumper',
    left: 'profile_shadow',
    right: ''
  };
  wall.sockets = 4;
  wall.innerCorners = 1;
  wall.outerCorners = 2;
  wall.soundproof = true;
  wall.soundproofArea = area(wall);
  room.walls.push(wall);
  project.rooms.push(room);

  const wallResult = wallTotals(wall, prices);
  assert.equal(wallResult.area, 14);
  assert.equal(wallResult.profiles, 3998);
  assert.equal(wallResult.extras, 4150);
  assert.equal(wallResult.soundproof, 10920);
  assert.equal(wallResult.canvas, 6860);
  assert.equal(wallResult.total, 25928);
  assert.equal(roomTotals(project.rooms[0], prices).total, wallResult.total);
});

test('soundproof defaults to the wall area', () => {
  const wall = blankWall(1);
  assert.equal(wall.soundproofArea, area(wall));
  assert.equal(wall.soundproofAreaManual, false);
});
