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
