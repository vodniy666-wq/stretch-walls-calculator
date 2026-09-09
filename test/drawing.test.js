import test from 'node:test';
import assert from 'node:assert/strict';
import { wallDrawing } from '../js/drawing.js';

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

test('shows the saved number of sockets using the price name', () => {
  const drawing = wallDrawing({
    width: 3000,
    height: 2500,
    profiles: {},
    extras: { socket: 3 }
  }, { socket: { name: 'Элемент из прайса' } });

  assert.equal((drawing.match(/class="drawing-socket"/g) || []).length, 3);
  assert.match(drawing, /Элемент из прайса · 3 шт\./);
});
