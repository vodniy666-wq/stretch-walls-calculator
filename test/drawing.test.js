import test from 'node:test';
import assert from 'node:assert/strict';
import { syncSocketPositions, wallDrawing } from '../js/drawing.js';

test('gets profile names from the supplied price data', () => {
  const wall = {
    width: 4200,
    height: 2700,
    profiles: { top: 'future_profile', bottom: '', left: 'future_profile', right: '' }
  };
  const drawing = wallDrawing(wall, { future_profile: { name: 'Новый профиль из прайса' } });

  assert.match(drawing, /Верх · Новый профиль из прайса/);
  assert.match(drawing, /Слева · Новый профиль из прайса/);
  assert.match(drawing, /Низ · Без профиля/);
});

test('uses profile colors from the price data on the drawing and in its legend', () => {
  const wall = {
    width: 4200,
    height: 2700,
    profiles: { top: 'profile_blue', bottom: 'profile_orange', left: '', right: 'profile_blue' }
  };
  const drawing = wallDrawing(wall, {
    profile_blue: { name: 'Синий профиль', color: '#246BCE' },
    profile_orange: { name: 'Оранжевый профиль', color: '#D97706' }
  });

  assert.match(drawing, /class="line top" style="--profile-color:#246BCE"/);
  assert.match(drawing, /class="line bottom" style="--profile-color:#D97706"/);
  assert.match(drawing, /class="line none left" style="--profile-color:#cbd1ca"/);
  assert.equal((drawing.match(/--profile-color:#246BCE/g) || []).length, 4);
  assert.equal((drawing.match(/class="profile-swatch"/g) || []).length, 4);
});

test('shows each saved socket type using its price name', () => {
  const drawing = wallDrawing({
    width: 3000,
    height: 2500,
    profiles: {},
    extras: { socket_type_1: 2, socket_type_3: 1, adhesive_contact_5kg: 4 }
  }, {
    socket_type_1: { name: 'Закладная Тип 1' },
    socket_type_3: { name: 'Закладная Тип 3' },
    adhesive_contact_5kg: { name: 'Клей' }
  });

  assert.equal((drawing.match(/class="drawing-socket"/g) || []).length, 3);
  assert.match(drawing, /Закладная Тип 1 · 2 шт\./);
  assert.match(drawing, /Закладная Тип 3 · 1 шт\./);
  assert.doesNotMatch(drawing, /Клей/);
});

test('draws each socket at its own proportional wall coordinates', () => {
  const wall = { width: 4000, height: 2000, profiles: {}, extras: { socket_type_1: 1 }, socketPositions: { socket_type_1: [{ left: 1000, floor: 500 }] } };
  const drawing = wallDrawing(wall, { socket_type_1: { name: 'Закладная Тип 1' } });

  assert.match(drawing, /left:25%;bottom:25%/);
  assert.match(drawing, /слева 1000 мм, от пола 500 мм/);
  assert.match(drawing, /<small>Тип 1<\/small>/);
});

test('keeps existing coordinates and resizes separate arrays with quantities', () => {
  const wall = { width: 4200, height: 2700, extras: { socket_type_1: 2, socket_type_2: 1 }, socketPositions: { socket_type_1: [{ left: 700, floor: 300 }, { left: 900, floor: 300 }, { left: 1100, floor: 300 }] } };

  syncSocketPositions(wall, ['socket_type_1', 'socket_type_2']);
  assert.deepEqual(wall.socketPositions.socket_type_1, [{ left: 700, floor: 300 }, { left: 900, floor: 300 }]);
  assert.equal(wall.socketPositions.socket_type_2.length, 1);
  assert.ok(wall.socketPositions.socket_type_2[0].left > 0);

  wall.width = 3000;
  wall.height = 1800;
  syncSocketPositions(wall, ['socket_type_1', 'socket_type_2']);
  assert.deepEqual(wall.socketPositions.socket_type_1[0], { left: 700, floor: 300 });
});
