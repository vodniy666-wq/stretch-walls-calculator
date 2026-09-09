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
