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

test('main banner is included on every application screen through the shared template', async () => {
  const app = await readFile(new URL('../js/app.js', import.meta.url), 'utf8');
  const renderer = name => {
    const start = app.indexOf(`function ${name}`);
    const end = app.indexOf('\nfunction ', start + 1);
    return app.slice(start, end < 0 ? app.length : end);
  };
  const pageHelper = app.slice(app.indexOf('const page ='), app.indexOf('function renderHome'));

  assert.match(app, /const heroBanner = \(\) => `<section class="hero">/);
  assert.match(pageHelper, /const page = .*heroBanner\(\)/s);
  assert.match(renderer('renderHome'), /heroBanner\(\)/, 'renderHome should render the banner');
  for (const name of ['renderNew', 'renderSaved', 'renderPrice', 'renderProject', 'renderRoom', 'renderWall']) {
    assert.match(renderer(name), /app\.innerHTML = page\(/, `${name} should render the shared page with its banner`);
  }
});

test('main banner has a compact mobile layout', async () => {
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
  const mobileTheme = css.slice(css.lastIndexOf('@media(max-width:700px)'));

  assert.match(mobileTheme, /\.hero\{height:210px;min-height:0;padding:20px 22px;/);
  assert.match(mobileTheme, /flex-direction:row;align-items:center;justify-content:flex-start;text-align:left/);
  assert.match(mobileTheme, /\.hero>div\{width:68%;max-height:170px;margin:0;text-align:left\}/);
  assert.match(mobileTheme, /\.hero h1\{font-size:28px;/);
  assert.match(mobileTheme, /\.hero\+\.page,\.hero\+\.home-grid\{margin-top:18px\}/);
  assert.match(mobileTheme, /\.lead\{margin-top:11px;font-size:12px;/);
});

test('price rows reserve a non-wrapping price column on mobile only', async () => {
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
  const desktopPriceRow = css.slice(css.indexOf('.price-row{'), css.indexOf('@media(max-width:700px)'));
  const mobilePriceRow = css.slice(css.lastIndexOf('@media(max-width:700px)'), css.indexOf('@media(max-width:360px)'));
  const narrowPriceRow = css.slice(css.indexOf('@media(max-width:360px)'));

  assert.doesNotMatch(desktopPriceRow, /grid-template-columns/);
  assert.match(mobilePriceRow, /\.price-row\{display:grid;grid-template-columns:minmax\(0,1fr\) max-content;align-items:start;gap:14px\}/);
  assert.match(mobilePriceRow, /\.price-row span\{min-width:0;overflow-wrap:break-word\}/);
  assert.match(mobilePriceRow, /\.price-row>b\{justify-self:end;white-space:nowrap\}/);
  assert.match(narrowPriceRow, /\.price-row\{grid-template-columns:minmax\(0,1fr\)\}/);
  assert.match(narrowPriceRow, /\.price-row>b\{grid-column:1;justify-self:end\}/);
});

test('room and wall counts use neutral labels without declension', async () => {
  const app = await readFile(new URL('../js/app.js', import.meta.url), 'utf8');

  assert.match(app, /Количество комнат: \$\{project\.rooms\.length\}/);
  assert.match(app, /Количество стен: \$\{room\.walls\.length\} · \$\{square\(totals\.area\)\}/);
  assert.doesNotMatch(app, /\$\{room\.walls\.length\} стен/);
  assert.doesNotMatch(app, /\$\{project\.rooms\.length\} комн\./);
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
