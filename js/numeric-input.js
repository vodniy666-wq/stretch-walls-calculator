export function parseNumericInput(value) {
  const normalized = String(value ?? '').trim().replace(',', '.');
  if (!normalized) return 0;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

export function normalizeNumericInput(input) {
  if (!input?.matches?.('input[data-numeric]')) return;
  const minimum = parseNumericInput(input.dataset.min);
  input.value = String(Math.max(minimum, parseNumericInput(input.value)));
}
