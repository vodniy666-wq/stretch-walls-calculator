import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeNumericInput, parseNumericInput } from '../js/numeric-input.js';

const numericInput = (value, minimum = '0') => ({
  value,
  dataset: { min: minimum },
  matches: selector => selector === 'input[data-numeric]'
});

test('parses empty edits as zero without changing the entered text', () => {
  const input = numericInput('');

  assert.equal(parseNumericInput(input.value), 0);
  assert.equal(input.value, '');

  input.value += '1';
  assert.equal(input.value, '1');
  input.value += '2';
  assert.equal(input.value, '12');
  input.value += '5';
  assert.equal(input.value, '125');
});

test('ordinary text editing can replace and delete digits without normalization', () => {
  let value = '125';
  value = `${value.slice(0, 1)}8${value.slice(2)}`;
  assert.equal(value, '185');

  value = `${value.slice(0, 1)}${value.slice(2)}`;
  assert.equal(value, '15');
  value = value.slice(0, -1);
  assert.equal(value, '1');
});

test('accepts comma and dot decimal separators', () => {
  assert.equal(parseNumericInput('2,5'), 2.5);
  assert.equal(parseNumericInput('2.5'), 2.5);
});

test('applies a field minimum only when editing is finalized', () => {
  for (const value of ['', '0', '-12']) {
    const input = numericInput(value, '1');
    normalizeNumericInput(input);
    assert.equal(input.value, '1');
  }

  const completed = numericInput('125', '1');
  normalizeNumericInput(completed);
  assert.equal(completed.value, '125');
});
