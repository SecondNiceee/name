import test from 'node:test';
import assert from 'node:assert/strict';
import { extractName } from 'russian-name-extractor';
import { POST } from '../examples/next-app/app/api/extract-name/route.js';

const cases = [
  ['Наташа', 'Наташа', null, null],
  ['Хасим', 'Хасим', null, null],
  ['Аламбек', 'Аламбек', null, null],
  ['Наташа Иванова', 'Наташа', 'Иванова', null],
  ['Иванова Наташа', 'Наташа', 'Иванова', null],
  ['Хасим Магомедов', 'Хасим', 'Магомедов', null],
  ['Аламбек Хаджиев', 'Аламбек', 'Хаджиев', null],
  ['  нАТАША   иВАНОВА  ', 'Наташа', 'Иванова', null],
  ['СЕМЁН ФЁДОРОВ', 'Семён', 'Фёдоров', null],
  ['Семён'.normalize('NFD'), 'Семён', null, null],
  ['Анна-Мария Петрова-Сидорова', 'Анна-Мария', 'Петрова-Сидорова', null],
  ['Анна–Мария Петрова', 'Анна-Мария', 'Петрова', null],
  ["Анна О'Нил", 'Анна', "О'Нил", null],
  ['Наташа Ли', 'Наташа', 'Ли', null],
  ['Иванов Иван Иванович', 'Иван', 'Иванов', 'Иванович'],
  ['Иван Иванович Иванов', 'Иван', 'Иванов', 'Иванович'],
  ['Наталья Сергеевна', 'Наталья', null, 'Сергеевна'],
  ['Привет! Меня зовут Наташа Иванова.', 'Наташа', 'Иванова', null],
  ['Меня зовут Хасим Магомедов, я живу в Москве.', 'Хасим', 'Магомедов', null],
  ['Здравствуйте, я Аламбек Хаджиев.', 'Аламбек', 'Хаджиев', null],
  ['Меня зовут наташа иванова.', 'Наташа', 'Иванова', null],
  ['Это Иван Иванович Иванов.', 'Иван', 'Иванов', 'Иванович'],
  ['Это Иванов Иван Иванович.', 'Иван', 'Иванов', 'Иванович'],
  ['Привет, Наташа! Иванова — другая фамилия.', 'Наташа', null, null],
  ['Привет, Наташа, спасибо!', 'Наташа', null, null],
];
for (const [input, firstName, lastName, patronymic] of cases) {
  test(input, () => {
    const result = extractName(input);
    assert.deepEqual([result.firstName, result.lastName, result.patronymic], [firstName, lastName, patronymic]);
  });
}

test('empty, non-name prose and punctuation yield no name', () => {
  for (const input of ['', '   ', '123 !!!', 'Здравствуйте, хочу заказать доставку.']) {
    assert.equal(extractName(input).confidence, 'none');
  }
});
test('does not choose arbitrarily between people or ambiguous parts', () => {
  for (const input of ['Анна Мария', 'Наташа и Хасим', 'Наташа встретила Аламбека и Хасим пришёл.', 'Иван Петров Сидоров']) {
    assert.equal(extractName(input).firstName, null);
  }
});
test('unknown field names are permitted with a warning', () => {
  const result = extractName('Зарема Умарова');
  assert.equal(result.firstName, 'Зарема');
  assert.equal(result.lastName, 'Умарова');
  assert.equal(result.confidence, 'low');
  assert.ok(result.warnings.includes('unknown-given-name'));
});
test('custom names work in prose, without mutating the default dictionary', () => {
  const input = 'Меня зовут Зарема Умарова.';
  assert.equal(extractName(input, { additionalGivenNames: ['Зарема'] }).firstName, 'Зарема');
  assert.equal(extractName(input).firstName, null);
});
test('explicit order supports unfamiliar names and ambiguous given names', () => {
  assert.equal(extractName('Ли Зарема', { order: 'last-first' }).firstName, 'Зарема');
  assert.equal(extractName('Анна Мария', { order: 'first-last' }).lastName, 'Мария');
  assert.deepEqual(extractName('Умарова Зарема Руслановна', { order: 'last-first' }), {
    firstName: 'Зарема', lastName: 'Умарова', patronymic: 'Руслановна', confidence: 'low', warnings: ['unknown-given-name'],
  });
});
test('text mode does not assume arbitrary short text is a name', () => {
  assert.equal(extractName('Заказать доставку', { mode: 'text' }).firstName, null);
});
test('name mode rejects extra prose and invalid characters', () => {
  for (const input of ['Меня зовут Наташа Иванова', 'Наташа123', '<b>Наташа</b>', 'Иван И. Иванов']) {
    assert.ok(extractName(input, { mode: 'name' }).warnings.includes('invalid-name-field'));
  }
});
test('surname alone is not returned as a first name', () => {
  assert.equal(extractName('Иванов').firstName, null);
  assert.equal(extractName('Иванов').lastName, 'Иванов');
});
test('validates runtime arguments and length', () => {
  for (const input of [null, 12, {}, undefined]) assert.throws(() => extractName(input), TypeError);
  for (const options of [null, { mode: 'bad' }, { order: 'bad' }, { maxLength: 0 }, { additionalGivenNames: [12] }]) {
    assert.throws(() => extractName('Наташа', options), TypeError);
  }
  assert.throws(() => extractName('а'.repeat(10001)), RangeError);
  assert.throws(() => extractName('Наташа', { maxLength: 3 }), RangeError);
});
test('Next.js route returns parsed JSON and rejects malformed requests', async () => {
  const request = body => new Request('https://example.test/api/extract-name', { method: 'POST', body });
  const result = await POST(request(JSON.stringify({ input: 'Хасим Магомедов' })));
  assert.equal(result.status, 200);
  assert.equal((await result.json()).firstName, 'Хасим');
  for (const body of ['{', 'null', '{}', '{"input":42}', JSON.stringify({ input: 'а'.repeat(10001) })]) {
    assert.equal((await POST(request(body))).status, 400);
  }
});
