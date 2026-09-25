import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { editorialClaim, outputClaim } from './customer-claims.mjs';

const prohibitedName = ['CJ', 'Bemanning'].join(' ');
test('bygget stoppar förbjudna namn och rubriker även efter kodning', () => {
  for (const text of [prohibitedName, 'Vad våra kunder säger', 'Vad v\\u00e5ra kunder s\\u00e4ger', 'Vad v&aring;ra <b>kunder</b> s&auml;ger']) {
    assert.ok(outputClaim(text), text);
  }
});
test('artiklar stoppar kundbevis i löptext, citat och strukturerad data', () => {
  for (const text of [prohibitedName, 'De flesta av våra kunder är igång.', '100 nöjda kunder', 'De flesta kunder är igång samma dag.', 'Aurora Transport används av svenska åkerier.', 'Exempel AB kör Aurora Transport.', 'Aurora Transport har sparat tio timmar åt Exempel AB.', '”Vi sparar timmar varje vecka”, säger Anders.', '<blockquote>Vi sparar timmar.</blockquote>', '"aggregateRating": {}', '"review": {}', 'Trusted by 50 companies']) {
    assert.ok(editorialClaim(text), text);
  }
});
test('produkttext och åkeriets kundportal är tillåtna', () => {
  for (const text of ['Vi bygger Aurora Transport för små svenska åkerier.', 'Med självbetjäningen kan du vara igång samma dag.', 'Era kunder kan boka förare i kundportalen.', 'Ge dina kunder leveransstatus och nöjdhetsbetyg.', 'Obegränsat antal kunder i kundregistret.', 'AI-assisterad guide utan påstådda kundresultat.']) {
    assert.equal(editorialClaim(text), undefined, text);
  }
});
test('output-kontrollen misslyckas vid förbjuden text i en nästlad JS-fil', () => {
  const directory = mkdtempSync(join(tmpdir(), 'aurora-claims-'));
  const run = () => spawnSync(process.execPath, ['scripts/check-customer-claims-output.mjs', directory], { encoding: 'utf8' });
  try {
    assert.notEqual(run().status, 0, 'Tom output får inte godkännas');
    mkdirSync(join(directory, 'assets'));
    const path = join(directory, 'assets', 'app.js');
    writeFileSync(path, 'Kundportalen samlar era kunder.');
    assert.equal(run().status, 0);
    for (const text of [prohibitedName, 'Vad våra kunder säger']) {
      writeFileSync(path, text);
      assert.notEqual(run().status, 0);
      assert.match(run().stderr, /app\.js/);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('redaktionskontrollen stoppar påståenden i JSON, äldre blogg och utkast', () => {
  const directory = mkdtempSync(join(tmpdir(), 'aurora-editorial-'));
  const run = () => spawnSync(process.execPath, [join(directory, 'scripts/editorial-check.mjs')], { encoding: 'utf8' });
  try {
    for (const path of ['scripts', 'src/content/editorial', 'src/pages/blog', 'src/lib', 'content/editorial']) {
      mkdirSync(join(directory, path), { recursive: true });
    }
    for (const name of ['editorial-check.mjs', 'customer-claims.mjs']) {
      copyFileSync(`scripts/${name}`, join(directory, 'scripts', name));
    }
    const articles = JSON.parse(readFileSync('src/content/editorial/articles.json', 'utf8'));
    const articlePath = join(directory, 'src/content/editorial/articles.json');
    const saveArticles = () => writeFileSync(articlePath, JSON.stringify(articles));
    saveArticles();
    writeFileSync(join(directory, 'src/lib/blog-data.ts'), '');
    assert.equal(run().status, 0);
    const title = articles[0].title;
    articles[0].title = 'De flesta av våra kunder är igång samma dag.';
    saveArticles();
    assert.notEqual(run().status, 0);
    articles[0].title = title;
    saveArticles();
    for (const path of ['src/pages/blog/Example.tsx', 'content/editorial/draft.md', 'src/lib/blog-data.ts']) {
      writeFileSync(join(directory, path), 'Exempel AB använder Aurora Transport.');
      assert.notEqual(run().status, 0, path);
      writeFileSync(join(directory, path), 'Era kunder kan följa leveranser i kundportalen.');
      assert.equal(run().status, 0, path);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
