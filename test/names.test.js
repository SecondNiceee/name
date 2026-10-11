import test from 'node:test';
import assert from 'node:assert/strict';
import { extractName, givenNames } from 'russian-name-extractor';
import { readFileSync } from 'node:fs';

test('dictionary has unique, normalized Cyrillic entries and is immutable', () => {
  assert.ok(givenNames.length > 800);
  assert.equal(new Set(givenNames).size, givenNames.length);
  assert.ok(Object.isFrozen(givenNames));
  for (const name of givenNames) {
    assert.match(name, /^[А-ЯЁ][а-яё]+$/u);
    assert.equal(name, name.normalize('NFC'));
  }
});

test('every listed spelling works alone and in an introduction', () => {
  for (const name of givenNames) {
    const single = extractName(name, { mode: 'name' });
    assert.equal(single.firstName, name, name);
    assert.equal(single.confidence, 'high', name);
    const prose = extractName(`Меня зовут ${name}.`, { mode: 'text' });
    assert.equal(prose.firstName, name, name);
    assert.equal(prose.lastName, null, name);
  }
});

test('expanded names support surname extraction and lowercase input', () => {
  for (const name of ['Вероника', 'Артемий', 'Елисей', 'Савелий', 'Агния', 'Серафима', 'Таисия', 'Света', 'Алёша', 'Ия']) {
    const result = extractName(`Меня зовут ${name.toLowerCase()} Петрова.`, { mode: 'text' });
    assert.equal(result.firstName, name);
    assert.equal(result.lastName, 'Петрова');
  }
});

test('published name inventory matches the runtime dictionary', () => {
  const inventory = readFileSync(new URL('../NAMES.md', import.meta.url), 'utf8');
  assert.deepEqual(inventory.split('\n').filter(line => line.startsWith('- ')).map(line => line.slice(2)), [...givenNames]);
});

test('Рада works as a name without matching the ordinary word in prose', () => {
  assert.equal(extractName('рада иванова', { mode: 'name' }).firstName, 'Рада');
  assert.equal(extractName('Меня зовут рада иванова.', { mode: 'text' }).firstName, 'Рада');
  assert.equal(extractName('Я рада знакомству.', { mode: 'text' }).firstName, null);
  assert.equal(extractName('Я рада знакомству, Наташа.', { mode: 'text' }).firstName, 'Наташа');
});
