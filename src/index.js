import { givenNames } from './names.js';
export { givenNames } from './names.js';
export { parseFullName } from './parse-full-name.js';

const key = value => value.normalize('NFC').toLocaleLowerCase('ru').replace(/ё/gu, 'е');
const dictionary = new Set(givenNames.map(key));
const WORD = /\p{L}+(?:[-'’]\p{L}+)*/gu;
const NAME = /^(?:\p{L}{2,}|\p{L}+(?:[-'’]\p{L}+)+)$/u;
const STOP = new Set(`привет здравствуйте добрый день вечер утро меня зовут это я мое моё имя фамилия отчество и или а но из в на по с со у от для как хочу хотел хотела пожалуйста спасибо рад рада очень мне мой моя мы вы он она они живу работаю зовите можно зовут лет сегодня завтра вчера пишет написал сказала сказал`.split(' ').map(key));
const surnameLike = value => /(?:ов|ев|ёв|ин|ын|ова|ева|ёва|ина|ына|ский|ская|цкий|цкая|ко|енко|швили|дзе|ян|янц|оглы)$/iu.test(value);
const patronymicLike = value => /(?:ович|евич|ич|овна|евна|ична)$/iu.test(value);
const titleCase = value => value.toLocaleLowerCase('ru').replace(/(^|[-'’])\p{L}/gu, part => part.toLocaleUpperCase('ru'));
const empty = (warnings = []) => ({ firstName: null, lastName: null, patronymic: null, confidence: 'none', warnings });

/** Extract a single person's name. See index.d.ts for the public contract. */
export function extractName(input, options = {}) {
  if (typeof input !== 'string') throw new TypeError('input must be a string');
  if (!options || typeof options !== 'object') throw new TypeError('options must be an object');
  const { mode = 'auto', order = 'auto', additionalGivenNames = [], maxLength = 10000 } = options;
  if (!['auto', 'name', 'text'].includes(mode)) throw new TypeError('Invalid mode');
  if (!['auto', 'first-last', 'last-first'].includes(order)) throw new TypeError('Invalid order');
  if (!Number.isSafeInteger(maxLength) || maxLength < 1) throw new TypeError('maxLength must be a positive safe integer');
  if (input.length > maxLength) throw new RangeError('input exceeds maxLength');
  if (!Array.isArray(additionalGivenNames) || additionalGivenNames.some(n => typeof n !== 'string' || !NAME.test(n))) {
    throw new TypeError('additionalGivenNames must contain valid name strings');
  }
  const known = additionalGivenNames.length ? new Set([...dictionary, ...additionalGivenNames.map(key)]) : dictionary;
  const isGiven = value => known.has(key(value)) || (value.includes('-') && value.split('-').every(part => known.has(key(part))));
  const text = input.normalize('NFC').replace(/[‐‑–—]/gu, '-');
  if (!text.trim()) return empty();
  const tokens = [...text.matchAll(WORD)].map(match => ({ value: match[0], start: match.index, end: match.index + match[0].length }));
  const valid = token => token && NAME.test(token.value) && (!STOP.has(key(token.value)) || isGiven(token.value));
  const adjacent = (left, right) => left && right && /^\s+$/u.test(text.slice(left.end, right.start));
  const field = tokens.length > 0 && tokens.length <= 3 && tokens.every(valid)
    && /^[\s\p{L}'’\-]+$/u.test(text);
  const fieldMode = mode === 'name' || (mode === 'auto' && field);
  const format = (first, last, middle, confidence, warnings = []) => ({
    firstName: first ? titleCase(first.value) : null,
    lastName: last ? titleCase(last.value) : null,
    patronymic: middle ? titleCase(middle.value) : null,
    confidence, warnings,
  });

  if (fieldMode) {
    if (!field) return empty(['invalid-name-field']);
    const given = tokens.filter(token => isGiven(token.value));
    if (order === 'auto' && given.length > 1) return empty(['ambiguous-name']);
    let first;
    let last;
    let middle;
    const warnings = [];
    if (tokens.length === 1) {
      if (isGiven(tokens[0].value)) return format(tokens[0], null, null, 'high');
      if (surnameLike(tokens[0].value)) return format(null, tokens[0], null, 'low', ['surname-heuristic']);
      return format(tokens[0], null, null, 'low', ['unknown-given-name']);
    }
    if (order !== 'auto') {
      first = tokens[order === 'last-first' ? 1 : 0];
      last = tokens[order === 'last-first' ? 0 : tokens.length - 1];
      middle = tokens.length === 3 ? tokens[order === 'last-first' ? 2 : 1] : null;
    } else if (given.length === 1) {
      first = given[0];
      const rest = tokens.filter(token => token !== first);
      if (rest.length === 2) {
        const patronymics = rest.filter(token => patronymicLike(token.value));
        if (patronymics.length !== 1) return empty(['ambiguous-name']);
        middle = patronymics[0];
      } else if (patronymicLike(rest[0].value)) {
        middle = rest[0];
      }
      last = rest.find(token => token !== middle);
    } else {
      // With no dictionary evidence, require explicit order for three-part names.
      if (tokens.length === 3) return empty(['ambiguous-name']);
      const surnames = tokens.filter(token => surnameLike(token.value));
      last = surnames.length === 1 ? surnames[0] : tokens[1];
      first = tokens.find(token => token !== last);
      warnings.push('unknown-given-name', 'inferred-order');
    }
    if (!isGiven(first.value) && !warnings.includes('unknown-given-name')) warnings.push('unknown-given-name');
    return format(first, last, middle, warnings.length ? 'low' : 'medium', warnings);
  }

  // In prose only dictionary-backed given names anchor an extraction.
  const anchors = tokens.filter(token => valid(token) && isGiven(token.value)
    && (!STOP.has(key(token.value))
      || /(?:зовут|имя)\s*[:—-]?\s*$/iu.test(text.slice(0, token.start))));
  if (anchors.length === 0) return empty();
  if (anchors.length !== 1) return empty(['multiple-name-candidates']);
  const first = anchors[0];
  const position = tokens.indexOf(first);
  const before = tokens[position - 1];
  let after = tokens[position + 1];
  let middle;
  if (valid(after) && adjacent(first, after) && patronymicLike(after.value)) {
    middle = after;
    after = tokens[position + 2];
  }
  const plausibleSurname = token => valid(token) && !isGiven(token.value) && !patronymicLike(token.value)
    && surnameLike(token.value);
  const left = adjacent(before, first) && plausibleSurname(before) ? before : null;
  const right = adjacent(middle || first, after) && plausibleSurname(after) ? after : null;
  if (left && right) return empty(['ambiguous-name']);
  return format(first, left || right, middle, 'medium', ['text-heuristic']);
}
