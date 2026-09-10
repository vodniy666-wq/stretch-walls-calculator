const socketQuantity = (value) => Math.max(0, Math.floor(Number(value) || 0));

const defaultSocketPosition = (wall, index) => ({
  left: Math.round(Math.max(1, Number(wall.width)) * ((index % 4) + 1) / 5),
  floor: Math.round(Math.max(1, Number(wall.height)) * Math.min(.25 + Math.floor(index / 4) * .2, .8))
});

export function syncSocketPositions(wall, socketIds) {
  const previous = wall.socketPositions && typeof wall.socketPositions === 'object' ? wall.socketPositions : {};
  const next = {};
  let ordinal = 0;
  for (const id of socketIds) {
    const quantity = socketQuantity(wall.extras?.[id]);
    if (!quantity) continue;
    const saved = Array.isArray(previous[id]) ? previous[id] : [];
    next[id] = Array.from({ length: quantity }, (_, index) => {
      const position = saved[index];
      const fallback = defaultSocketPosition(wall, ordinal++);
      return {
        left: Number.isFinite(Number(position?.left)) ? Math.max(0, Number(position.left)) : fallback.left,
        floor: Number.isFinite(Number(position?.floor)) ? Math.max(0, Number(position.floor)) : fallback.floor
      };
    });
  }
  wall.socketPositions = next;
  return next;
}

const shortSocketName = (name, id) => name?.match(/тип\s*\d+/i)?.[0] || name || id;

export function wallDrawing(wall, priceById) {
  const width = Math.max(1, Number(wall.width));
  const height = Math.max(1, Number(wall.height));
  const ratio = Math.min(2.3, Math.max(.55, width / height));
  const boxWidth = ratio >= 1 ? 260 : 180 * ratio;
  const boxHeight = ratio >= 1 ? 260 / ratio : 180;
  const p = wall.profiles || {};
  const profile = (side) => priceById[p[side]]?.name || 'Без профиля';
  const cls = (side) => p[side] ? `line ${p[side]}` : 'line none';
  const socketsByType = Object.entries(wall.extras || {}).filter(([id, quantity]) =>
    id.startsWith('socket_type_') && Math.max(0, Math.floor(Number(quantity) || 0)) > 0
  );
  const socketCount = socketsByType.reduce((sum, [, quantity]) => sum + socketQuantity(quantity), 0);
  const positions = syncSocketPositions(wall, socketsByType.map(([id]) => id));
  const sockets = socketsByType.flatMap(([id]) => positions[id].map((position, index) => {
    const name = priceById[id]?.name || id;
    const left = Math.min(100, position.left / width * 100);
    const bottom = Math.min(100, position.floor / height * 100);
    return `<span class="drawing-socket" style="left:${left}%;bottom:${bottom}%" title="${name} ${index + 1}: слева ${position.left} мм, от пола ${position.floor} мм"><small>${shortSocketName(name, id)}</small></span>`;
  })).join('');
  return `<section class="drawing-card" aria-label="Схема стены">
    <div class="drawing" style="--w:${boxWidth}px;--h:${boxHeight}px">
      <span class="dimension top-dim">${width.toLocaleString('ru-RU')} мм</span>
      <span class="dimension side-dim">${height.toLocaleString('ru-RU')} мм</span>
      <span class="${cls('top')} top" title="Верх: ${profile('top')}"></span>
      <span class="${cls('bottom')} bottom" title="Низ: ${profile('bottom')}"></span>
      <span class="${cls('left')} left" title="Слева: ${profile('left')}"></span>
      <span class="${cls('right')} right" title="Справа: ${profile('right')}"></span>
      ${socketCount ? `<div class="drawing-extras" aria-label="Подрозетники: ${socketCount}">${sockets}</div>` : ''}
    </div>
    <div class="drawing-legend"><span>Верх · ${profile('top')}</span><span>Низ · ${profile('bottom')}</span><span>Слева · ${profile('left')}</span><span>Справа · ${profile('right')}</span></div>
    ${socketsByType.map(([id, quantity]) => `<p class="drawing-extra-legend">${priceById[id]?.name || id} · ${Math.max(0, Math.floor(Number(quantity) || 0))} шт.</p>`).join('')}
  </section>`;
}
