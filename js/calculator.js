export const money = (value) => `${Math.round(value).toLocaleString('ru-RU')} ₽`;
export const square = (value) => `${Number(value).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} м²`;

export function wallTotals(wall, priceById) {
  const width = Math.max(0, Number(wall.width) || 0) / 1000;
  const height = Math.max(0, Number(wall.height) || 0) / 1000;
  // Millimetre input can create floating-point tails (11.340000000002).
  // Six decimals retain sub-cm precision while keeping totals deterministic.
  const area = Math.round(width * height * 1e6) / 1e6;
  const material = area * (priceById[wall.material]?.price || 0);
  const sideLengths = { top: width, bottom: width, left: height, right: height };
  const profiles = Object.entries(sideLengths).reduce((sum, [side, length]) => {
    return sum + length * (priceById[wall.profiles?.[side]]?.price || 0);
  }, 0);
  const extras = ['socket', 'inner_corner', 'outer_corner'].reduce((sum, id) => {
    return sum + Math.max(0, Number(wall.extras?.[id]) || 0) * (priceById[id]?.price || 0);
  }, 0);
  const soundArea = wall.soundproof?.enabled
    ? Math.max(0, wall.soundproof.custom ? Number(wall.soundproof.area) || 0 : area)
    : 0;
  const soundproof = soundArea * (priceById.soundproof?.price || 0);
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
  return project.rooms.reduce((total, room) => {
    const value = roomTotals(room, prices);
    total.area += value.area;
    total.total += value.total;
    return total;
  }, { area: 0, total: 0 });
}
