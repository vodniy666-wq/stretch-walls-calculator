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

test('main banner is included only on the home and top-level screens', async () => {
  const app = await readFile(new URL('../js/app.js', import.meta.url), 'utf8');
  const renderer = name => {
    const start = app.indexOf(`function ${name}`);
    const end = app.indexOf('\nfunction ', start + 1);
    return app.slice(start, end < 0 ? app.length : end);
  };
  const pageHelper = app.slice(app.indexOf('const page ='), app.indexOf('function renderHome'));

  assert.match(app, /const heroBanner = \(\) => `<section class="hero">/);
  assert.doesNotMatch(pageHelper, /heroBanner\(\)/);
  for (const name of ['renderHome', 'renderNew', 'renderSaved', 'renderPrice']) {
    assert.match(renderer(name), /heroBanner\(\)/, `${name} should render the banner`);
  }
  for (const name of ['renderProject', 'renderRoom', 'renderWall']) {
    assert.doesNotMatch(renderer(name), /heroBanner\(\)/, `${name} should not render the banner`);
  }
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

test('wall input events synchronize data without rebuilding the active form', async () => {
  const app = await readFile(new URL('../js/app.js', import.meta.url), 'utf8');
  const inputHandler = app.slice(app.indexOf('function syncWallInput'), app.indexOf('function commitWallInput'));

  assert.match(app, /addEventListener\('input', syncWallInput\)/);
  assert.match(app, /addEventListener\('change', commitWallInput\)/);
  assert.match(inputHandler, /syncWallForm\(wall\)/);
  assert.match(inputHandler, /persist\(\)/);
  assert.match(inputHandler, /updateWallDependents\(wall\)/);
  assert.doesNotMatch(inputHandler, /renderWall|app\.innerHTML|setSelectionRange|focus\(/);
  assert.doesNotMatch(inputHandler, /\.value\s*=/);
});

test('editable wall numbers use native text editing and suitable virtual keyboards', async () => {
  const app = await readFile(new URL('../js/app.js', import.meta.url), 'utf8');
  const wallEditor = app.slice(app.indexOf('function counter'), app.indexOf('function empty'));

  assert.doesNotMatch(wallEditor, /type="number"/);
  assert.match(wallEditor, /name="width" type="text" inputmode="numeric" data-numeric data-min="1"/);
  assert.match(wallEditor, /name="height" type="text" inputmode="numeric" data-numeric data-min="1"/);
  assert.match(wallEditor, /socket-position-[^"`]+" type="text" inputmode="numeric" data-numeric data-min="0"/);
  assert.match(wallEditor, /name="sound-area" type="text" inputmode="decimal" data-numeric data-min="0"/);
});

test('wall form fields explicitly use left-to-right input direction', async () => {
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

  assert.match(css, /input,textarea\{direction:ltr\}/);
});
