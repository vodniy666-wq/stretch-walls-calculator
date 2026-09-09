export function wallDrawing(wall, priceById) {
  const width = Math.max(1, Number(wall.width));
  const height = Math.max(1, Number(wall.height));
  const ratio = Math.min(2.3, Math.max(.55, width / height));
  const boxWidth = ratio >= 1 ? 260 : 180 * ratio;
  const boxHeight = ratio >= 1 ? 260 / ratio : 180;
  const p = wall.profiles || {};
  const profile = (side) => priceById[p[side]]?.name || 'Без профиля';
  const cls = (side) => p[side] ? `line ${p[side]}` : 'line none';
  const socketCount = Math.max(0, Math.floor(Number(wall.extras?.socket) || 0));
  const socketName = priceById.socket?.name || 'Подрозетник / выключатель';
  // Keep the schematic readable for unusually large saved quantities; the legend
  // still displays the complete count.
  const visibleSocketCount = Math.min(socketCount, 24);
  const sockets = Array.from({ length: visibleSocketCount }, (_, index) =>
    `<span class="drawing-socket" title="${socketName} ${index + 1}" aria-hidden="true"></span>`
  ).join('');
  return `<section class="drawing-card" aria-label="Схема стены">
    <div class="drawing" style="--w:${boxWidth}px;--h:${boxHeight}px">
      <span class="dimension top-dim">${width.toLocaleString('ru-RU')} мм</span>
      <span class="dimension side-dim">${height.toLocaleString('ru-RU')} мм</span>
      <span class="${cls('top')} top" title="Верх: ${profile('top')}"></span>
      <span class="${cls('bottom')} bottom" title="Низ: ${profile('bottom')}"></span>
      <span class="${cls('left')} left" title="Слева: ${profile('left')}"></span>
      <span class="${cls('right')} right" title="Справа: ${profile('right')}"></span>
      ${socketCount ? `<div class="drawing-extras" aria-label="${socketName}: ${socketCount}">${sockets}</div>` : ''}
    </div>
    <div class="drawing-legend"><span>Верх · ${profile('top')}</span><span>Низ · ${profile('bottom')}</span><span>Слева · ${profile('left')}</span><span>Справа · ${profile('right')}</span></div>
    ${socketCount ? `<p class="drawing-extra-legend">${socketName} · ${socketCount} шт.</p>` : ''}
  </section>`;
}
