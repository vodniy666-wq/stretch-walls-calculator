export const money = (value) => `${Number(value).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₽`;
export const square = (value) => `${Number(value).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} м²`;

export function wallTotals(wall, priceById) {
  const widthMillimetres = Math.max(0, Number(wall.width) || 0);
  const heightMillimetres = Math.max(0, Number(wall.height) || 0);
  const width = widthMillimetres / 1000;
  const height = heightMillimetres / 1000;
  const area = widthMillimetres * heightMillimetres / 1e6;
  const material = area * (priceById[wall.material]?.price || 0);
  const sideLengths = { top: width, bottom: width, left: height, right: height };
  const profiles = Object.entries(sideLengths).reduce((sum, [side, length]) => {
    return sum + length * (priceById[wall.profiles?.[side]]?.price || 0);
  }, 0);
  const extras = Object.entries(wall.extras || {}).reduce((sum, [id, quantity]) => {
    if (priceById[id]?.category !== 'extra') return sum;
    return sum + Math.max(0, Number(quantity) || 0) * (priceById[id]?.price || 0);
  }, 0);
  // The fallback keeps calculations made with the previous on/off control usable.
  const soundproofId = wall.soundproof?.id || (wall.soundproof?.enabled ? 'soundproof_heavy_felt' : '');
  const soundArea = soundproofId
    ? Math.max(0, wall.soundproof.custom ? Number(wall.soundproof.area) || 0 : area)
    : 0;
  const soundproof = soundArea * (priceById[soundproofId]?.price || 0);
  return { area, material, profiles, extras, soundproof, total: material + profiles + extras + soundproof, soundArea };
}

export function roomTotals(room, prices) {
  return room.walls.reduce((total, wall) => {
    const value = wallTotals(wall, prices);
    for (const key of ['area', 'material', 'profiles', 'extras', 'soundproof', 'total']) total[key] += value[key];
    return total;
  }, { area: 0, material: 0, profiles: 0, extras: 0, soundproof: 0, total: 0 });
}

export function projectTotals(project, prices) {
  const totals = project.rooms.reduce((total, room) => {
    const value = roomTotals(room, prices);
    total.area += value.area;
    return total;
  }, { area: 0, total: 0 });
  // The object total and the estimate use the same grouped, unrounded line values.
  totals.total = projectEstimate(project, prices).total;
  return totals;
}

const estimateGroups = [
  { id: 'material', name: 'Материал' },
  { id: 'profiles', name: 'Профили' },
  { id: 'sockets', name: 'Подрозетники / закладные' },
  { id: 'soundproof', name: 'Звукоизоляция' },
  { id: 'consumables', name: 'Дополнительные расходники' }
];

/** Collects every priced project item by its stable price-list id. */
export function projectEstimate(project, priceById) {
  const rowsByGroup = Object.fromEntries(estimateGroups.map(group => [group.id, new Map()]));
  const add = (groupId, itemId, quantity) => {
    const item = priceById[itemId];
    const safeQuantity = Math.max(0, Number(quantity) || 0);
    if (!item || !safeQuantity) return;
    const rows = rowsByGroup[groupId];
    rows.set(itemId, (rows.get(itemId) || 0) + safeQuantity);
  };

  for (const room of project.rooms || []) for (const wall of room.walls || []) {
    const width = Math.max(0, Number(wall.width) || 0) / 1000;
    const height = Math.max(0, Number(wall.height) || 0) / 1000;
    const totals = wallTotals(wall, priceById);
    if (priceById[wall.material]?.category === 'material') add('material', wall.material, totals.area);
    for (const [side, length] of Object.entries({ top: width, bottom: width, left: height, right: height })) {
      const id = wall.profiles?.[side];
      if (priceById[id]?.category === 'profile') add('profiles', id, length);
    }
    for (const [id, quantity] of Object.entries(wall.extras || {})) {
      if (priceById[id]?.category !== 'extra') continue;
      add(id.startsWith('socket_') ? 'sockets' : 'consumables', id, quantity);
    }
    const soundproofId = wall.soundproof?.id || (wall.soundproof?.enabled ? 'soundproof_heavy_felt' : '');
    if (priceById[soundproofId]?.category === 'soundproof') add('soundproof', soundproofId, totals.soundArea);
  }

  const groups = estimateGroups.map(group => ({
    ...group,
    rows: [...rowsByGroup[group.id]].map(([id, quantity]) => {
      const item = priceById[id];
      return { id, name: item.name, quantity, unit: item.unit, unitPrice: item.price, total: quantity * item.price };
    })
  }));
  const total = groups.reduce((sum, group) => sum + group.rows.reduce((groupSum, row) => groupSum + row.total, 0), 0);
  return { groups, total };
}
