import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('browser assets use repository-relative URLs', async () => {
  const [html, app] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../js/app.js', import.meta.url), 'utf8')
  ]);

  assert.match(html, /href="\.\/styles\.css"/);
  assert.match(html, /src="\.\/js\/app\.js"/);
  assert.match(app, /new URL\('\.\.\/data\/prices\.json', import\.meta\.url\)/);
  assert.doesNotMatch(html, /(?:href|src)="\//);
});

test('wall drawing follows the socket section in the editor', async () => {
  const app = await readFile(new URL('../js/app.js', import.meta.url), 'utf8');
  const sockets = app.indexOf("sectionTitle('04', 'Подрозетники / закладные'");
  const drawing = app.indexOf("sectionTitle('05', 'Чертёж'");
  const soundproof = app.indexOf("sectionTitle('06', 'Звукоизоляция'");

  assert.ok(sockets >= 0);
  assert.ok(drawing > sockets);
  assert.ok(soundproof > drawing);
});

test('every priced profile has its own valid drawing color', async () => {
  const prices = JSON.parse(await readFile(new URL('../data/prices.json', import.meta.url), 'utf8'));
  const profileColors = prices.filter(item => item.category === 'profile').map(item => item.color);

  assert.ok(profileColors.length > 0);
  assert.ok(profileColors.every(color => /^#[\da-f]{6}$/i.test(color)));
  assert.equal(new Set(profileColors).size, profileColors.length);
});
