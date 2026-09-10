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

const fallbackProfileColor = (id) => {
  let hash = 0;
  for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return `hsl(${hash % 360} 62% 42%)`;
};

const profileColor = (id, priceById) => {
  if (!id) return '#cbd1ca';
  const priceColor = priceById[id]?.color;
  return /^#[\da-f]{6}$/i.test(priceColor || '') ? priceColor : fallbackProfileColor(id);
};
const sideLabels = { top: 'Верх', bottom: 'Низ', left: 'Слева', right: 'Справа' };

export function wallDrawing(wall, priceById) {
  const width = Math.max(1, Number(wall.width));
  const height = Math.max(1, Number(wall.height));
  const ratio = Math.min(2.3, Math.max(.55, width / height));
  const boxWidth = ratio >= 1 ? 260 : 180 * ratio;
  const boxHeight = ratio >= 1 ? 260 / ratio : 180;
  const p = wall.profiles || {};
  const profile = (side) => priceById[p[side]]?.name || 'Без профиля';
  const profileLine = (side) => `<span class="line ${p[side] ? '' : 'none '}${side}" style="--profile-color:${profileColor(p[side], priceById)}" title="${sideLabels[side]}: ${profile(side)}"></span>`;
  const profileLegend = (side) => `<span><i class="profile-swatch" style="--profile-color:${profileColor(p[side], priceById)}"></i>${sideLabels[side]} · ${profile(side)}</span>`;
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
      ${profileLine('top')}
      ${profileLine('bottom')}
      ${profileLine('left')}
      ${profileLine('right')}
      ${socketCount ? `<div class="drawing-extras" aria-label="Подрозетники: ${socketCount}">${sockets}</div>` : ''}
    </div>
    <div class="drawing-legend">${['top', 'bottom', 'left', 'right'].map(profileLegend).join('')}</div>
    ${socketsByType.map(([id, quantity]) => `<p class="drawing-extra-legend">${priceById[id]?.name || id} · ${Math.max(0, Math.floor(Number(quantity) || 0))} шт.</p>`).join('')}
  </section>`;
}
