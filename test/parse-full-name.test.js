import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFullName, givenNames } from 'russian-name-extractor';

const blank = { title: '', first: '', middle: '', last: '', nick: '', suffix: '', error: [] };
const cases = [
  ['Наташа Иванова', { first: 'Наташа', last: 'Иванова' }],
  ['Хасим Магомедов', { first: 'Хасим', last: 'Магомедов' }],
  ['Аламбек Хаджиев', { first: 'Аламбек', last: 'Хаджиев' }],
  ['Иванов Иван Иванович', { first: 'Иван', middle: 'Иванович', last: 'Иванов' }],
  ['Иван Иванович Иванов', { first: 'Иван', middle: 'Иванович', last: 'Иванов' }],
  ['Иван Иванов Иванович', { first: 'Иван', middle: 'Иванович', last: 'Иванов' }],
  ['Иванов, Иван Иванович', { first: 'Иван', middle: 'Иванович', last: 'Иванов' }],
  ['Иванов И.И.', { first: 'И.', middle: 'И.', last: 'Иванов' }],
  ['И.И. Иванов', { first: 'И.', middle: 'И.', last: 'Иванов' }],
  ['А. С. Пушкин', { first: 'А.', middle: 'С.', last: 'Пушкин' }],
  ['Пушкин А С', { first: 'А', middle: 'С', last: 'Пушкин' }],
  ['Иванов, И.И.', { first: 'И.', middle: 'И.', last: 'Иванов' }],
  ['Наталья Сергеевна', { first: 'Наталья', middle: 'Сергеевна' }],
  ['Илья Ильич Обломов', { first: 'Илья', middle: 'Ильич', last: 'Обломов' }],
  ['Иван И.', { first: 'Иван', middle: 'И.' }],
  ['Иванов', { last: 'Иванов' }],
  ['Иванович', { middle: 'Иванович' }],
  ['Наташа', { first: 'Наташа' }],
  ['Рада Иванова', { first: 'Рада', last: 'Иванова' }],
  ['Зарема Умаровна Хаджиева', { first: 'Зарема', middle: 'Умаровна', last: 'Хаджиева' }],
  ['Хаджиева Зарема Умаровна', { first: 'Зарема', middle: 'Умаровна', last: 'Хаджиева' }],
  ['Мамедов Али Гасан оглы', { first: 'Али', middle: 'Гасан оглы', last: 'Мамедов' }],
  ['Али Гасан-оглы Мамедов', { first: 'Али', middle: 'Гасан-оглы', last: 'Мамедов' }],
  ['Анна-Мария Петрова-Сидорова', { first: 'Анна-Мария', last: 'Петрова-Сидорова' }],
  ["Анна О'Нил", { first: 'Анна', last: "О'Нил" }],
  ['Наташа Ли', { first: 'Наташа', last: 'Ли' }],
  ['Ли, Наташа', { first: 'Наташа', last: 'Ли' }],
  ['Денис фон Визин', { first: 'Денис', last: 'фон Визин' }],
  ['фон Визин, Денис Иванович', { first: 'Денис', middle: 'Иванович', last: 'фон Визин' }],
  ['г-н Иванов Иван Иванович', { title: 'г-н', first: 'Иван', middle: 'Иванович', last: 'Иванов' }],
  ['Иванов, д-р Иван Иванович', { title: 'д-р', first: 'Иван', middle: 'Иванович', last: 'Иванов' }],
  ['проф. д-р Иван Иванович Иванов', { title: 'проф. д-р', first: 'Иван', middle: 'Иванович', last: 'Иванов' }],
  ['Иван Иванов мл.', { first: 'Иван', last: 'Иванов', suffix: 'мл.' }],
  ['Иванов, Иван, мл.', { first: 'Иван', last: 'Иванов', suffix: 'мл.' }],
  ['Пётр II', { first: 'Пётр', suffix: 'II' }],
  ['Александр (Саша) Петров', { first: 'Александр', last: 'Петров', nick: 'Саша' }],
  ['Александр «Саша» Петров', { first: 'Александр', last: 'Петров', nick: 'Саша' }],
  ['Александр "Саша" Петров', { first: 'Александр', last: 'Петров', nick: 'Саша' }],
  ["Александр 'Саша' Петров", { first: 'Александр', last: 'Петров', nick: 'Саша' }],
  ['Александр [Саша] Петров', { first: 'Александр', last: 'Петров', nick: 'Саша' }],
  ['ИВАНОВ, Д-Р ИВАН ИВАНОВИЧ (ВАНЯ) МЛ.', {
    title: 'Д-Р', first: 'Иван', middle: 'Иванович', last: 'Иванов', nick: 'Ваня', suffix: 'мл.',
  }],
  ['  наташа\tиванова\n', { first: 'Наташа', last: 'Иванова' }],
  ['СЕМЁН ФЁДОРОВ', { first: 'Семён', last: 'Фёдоров' }],
];
for (const [input, expected] of cases) {
  test(`parseFullName: ${input}`, () => assert.deepEqual(parseFullName(input), { ...blank, ...expected }));
}

test('all 885 dictionary spellings remain recognised by the full-name API', () => {
  for (const name of givenNames) assert.equal(parseFullName(name).first, name, name);
});
test('positional part selector returns each part, including errors', () => {
  const input = 'д-р Иван Иванович (Ваня) Иванов мл.';
  const result = parseFullName(input);
  for (const part of Object.keys(result)) assert.deepEqual(parseFullName(input, part), result[part]);
  assert.equal(parseFullName(input, 'FIRST'), 'Иван');
  assert.deepEqual(parseFullName(input, 'invalid'), result);
});
test('auto, preserved and forced casing match the positional interface', () => {
  assert.equal(parseFullName('нАТАША Иванова').first, 'нАТАША');
  assert.equal(parseFullName('НАТАША ИВАНОВА', 'first', false), 'НАТАША');
  assert.equal(parseFullName('нАТАША Иванова', 'first', true), 'Наташа');
  assert.equal(parseFullName('денис фон визин').last, 'фон Визин');
  assert.equal(parseFullName('иван иванов iii').suffix, 'III');
});
test('extended Russian title lists are opt-in', () => {
  assert.equal(parseFullName('академик Иван Павлов', 'title', -1, false, true), 'академик');
  assert.equal(parseFullName('академик Иван Павлов').title, '');
  assert.equal(parseFullName('Пётр VI', { useLongLists: true }).suffix, 'VI');
});
test('unknown names, collisions and missing parts produce reviewable output', () => {
  const result = parseFullName('Зарема Ли');
  assert.equal(result.first, 'Зарема');
  assert.equal(result.last, 'Ли');
  assert.ok(result.error.length);
  const collision = parseFullName('Анна Мария');
  assert.equal(collision.first, 'Анна');
  assert.equal(collision.last, 'Мария');
  assert.ok(collision.error.length);
  assert.ok(parseFullName('И.И.').error.length);
});
test('options support explicit order, custom dictionary, and part selection', () => {
  assert.deepEqual(parseFullName('Ли Зарема', { order: 'last-first' }), { ...blank, first: 'Зарема', last: 'Ли' });
  assert.deepEqual(parseFullName('Анна Мария', { order: 'first-last' }), { ...blank, first: 'Анна', last: 'Мария' });
  assert.equal(parseFullName('Ли Зарема', { additionalGivenNames: ['Зарема'], partToReturn: 'first' }), 'Зарема');
  assert.equal(parseFullName('Зарема Руслановна Ли', { order: 'first-last' }).middle, 'Руслановна');
  assert.equal(parseFullName('Ли Зарема Руслановна', { order: 'last-first' }).middle, 'Руслановна');
});
test('malformed batch inputs return errors by default and throw only in strict mode', () => {
  for (const input of [null, undefined, 123, {}, [], Symbol('name'), '', '   ', '123 !!!', 'Иван@Иванов', 'Иванов,,Иван', 'Иван (Ваня', 'а'.repeat(10001)]) {
    assert.ok(parseFullName(input).error.length, String(input));
    assert.throws(() => parseFullName(input, 'all', -1, true), Error);
  }
  assert.ok(parseFullName('Иван', { maxLength: 2 }).error.length);
  assert.ok(parseFullName('Иван', { order: 'invalid' }).error.length);
  assert.ok(parseFullName('Иван', { additionalGivenNames: [12] }).error.length);
  assert.throws(() => parseFullName(null, { stopOnError: 1 }), Error);
});
test('multiple nicknames are preserved and flagged', () => {
  const result = parseFullName('Александр (Саша) «Саня» Петров');
  assert.equal(result.nick, 'Саша, Саня');
  assert.ok(result.error.length);
});
