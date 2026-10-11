import { givenNames } from './names.js';

const key = value => value.normalize('NFC').toLocaleLowerCase('ru').replace(/ё/gu, 'е');
const names = new Set(givenNames.map(key));
const parts = ['title', 'first', 'middle', 'last', 'nick', 'suffix', 'error'];
const titles = ['г-н', 'г-жа', 'господин', 'госпожа', 'д-р', 'доктор', 'проф', 'профессор'];
const longTitles = ['академик', 'доцент', 'тов', 'товарищ', 'граф', 'графиня', 'князь',
  'княгиня', 'барон', 'баронесса', 'генерал', 'полковник', 'майор', 'капитан', 'лейтенант'];
const suffixes = ['мл', 'ст', 'младший', 'старший', 'младшая', 'старшая', 'II', 'III', 'IV'];
const longSuffixes = ['V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const particles = new Set(['де', 'дель', 'ла', 'ле', 'фон', 'ван', 'дер', 'ден', 'да', 'ди', 'дю']);
const longParticles = new Set([...particles, 'аль', 'эль', 'ибн', 'бин']);
const marker = value => /^(?:оглы|улы|кызы|кизи|уулу)$/iu.test(value);
const initial = value => /^\p{L}\.?$/u.test(value);
const surname = value => /(?:ов|ев|ёв|ин|ын|ова|ева|ёва|ина|ына|ский|ская|цкий|цкая|енко|ко|швили|дзе|ян|янц)$/iu.test(value);
// The broad -ич ending is intentionally weaker: it also occurs in surnames.
const patronymic = value => /(?:ович|евич|овна|евна|ична|инична)$/iu.test(value)
  || /^(?:Ильич|Кузьмич|Лукич|Фомич|Саввич|Никитич)$/iu.test(value)
  || /(?:[-\s](?:оглы|улы|кызы|кизи|уулу))$/iu.test(value);
const capitalise = value => value.toLocaleLowerCase('ru')
  .replace(/(^|[\s\-'’])\p{L}/gu, match => match.toLocaleUpperCase('ru'));

/** Russian full-name field parser with a parse-full-name-style public interface. */
export function parseFullName(input, partOrOptions = 'all', fixCase = -1, stopOnError = false, useLongLists = false) {
  const result = { title: '', first: '', middle: '', last: '', nick: '', suffix: '', error: [] };
  const options = partOrOptions && typeof partOrOptions === 'object' && !Array.isArray(partOrOptions)
    ? partOrOptions : { partToReturn: partOrOptions, fixCase, stopOnError, useLongLists };
  const selected = typeof options.partToReturn === 'string' ? options.partToReturn.toLowerCase() : 'all';
  const part = parts.includes(selected) ? selected : 'all';
  const strict = options.stopOnError === true || options.stopOnError === 1;
  const extended = options.useLongLists === true || options.useLongLists === 1;
  const casing = options.fixCase === true || options.fixCase === 1 ? 1
    : options.fixCase === false || options.fixCase === 0 ? 0 : -1;
  const order = options.order ?? 'auto';
  const limit = options.maxLength ?? 10000;
  const warn = message => {
    if (strict) throw new Error(message);
    result.error.push(message);
  };
  let shouldFix = false;
  const finish = () => {
    if (shouldFix) {
      for (const field of parts.filter(field => field !== 'error')) {
        result[field] = result[field].split(' ').map(word => {
          if (particles.has(key(word)) || longParticles.has(key(word)) || marker(word)) return word.toLocaleLowerCase('ru');
          if (field === 'suffix' && /^[ivx]+$/iu.test(word)) return word.toUpperCase();
          if (field === 'suffix') return word.toLocaleLowerCase('ru');
          return capitalise(word);
        }).join(' ');
      }
    }
    return part === 'all' ? result : result[part];
  };
  if (!['auto', 'first-last', 'last-first'].includes(order)
    || !Number.isSafeInteger(limit) || limit < 1) {
    warn('Invalid parser options');
    return finish();
  }
  const additional = options.additionalGivenNames ?? [];
  if (!Array.isArray(additional) || additional.some(value => typeof value !== 'string'
    || !/^\p{L}+(?:[-'’]\p{L}+)*$/u.test(value))) {
    warn('Invalid additionalGivenNames');
    return finish();
  }
  if (typeof input !== 'string' || !input.trim()) {
    warn('No name supplied');
    return finish();
  }
  if (input.length > limit) {
    warn('Input exceeds maxLength');
    return finish();
  }
  shouldFix = casing === 1 || (casing === -1
    && (input === input.toLocaleUpperCase('ru') || input === input.toLocaleLowerCase('ru')));
  const known = additional.length ? new Set([...names, ...additional.map(key)]) : names;
  const given = value => known.has(key(value))
    || (value.includes('-') && value.split('-').every(word => known.has(key(word))));
  let text = input.normalize('NFC').replace(/[‐‑–—]/gu, '-').trim();
  const nicknames = [];
  // Standalone quoted spans only: apostrophes inside surnames stay intact.
  text = text.replace(/(^|\s)(?:\(([^()]*)\)|\[([^\[\]]*)\]|«([^«»]*)»|“([^“”]*)”|"([^"\n]*)"|'([^'\n]*)')(?=\s|,|$)/gu,
    (_match, space, ...captures) => {
      const nick = captures.slice(0, 6).find(value => value !== undefined).trim();
      if (nick) nicknames.push(nick);
      else warn('Empty nickname');
      return space;
    });
  result.nick = nicknames.join(', ');
  if (nicknames.length > 1) warn('Multiple nicknames found');

  const titleSet = new Set([...titles, ...(extended ? longTitles : [])].map(key));
  const suffixSet = new Set([...suffixes, ...(extended ? longSuffixes : [])].map(key));
  const foundTitles = [];
  const stripTitles = source => {
    let rest = source.trim();
    while (rest) {
      const match = rest.match(/^(\S+)(?:\s+|$)/u);
      if (!match || !titleSet.has(key(match[1].replace(/\.$/u, '')))) break;
      foundTitles.push(match[1]);
      rest = rest.slice(match[0].length).trim();
    }
    return rest;
  };
  const foundSuffixes = [];
  while (text) {
    const match = text.match(/(?:^|[\s,]+)([^\s,]+)\s*$/u);
    if (!match || !suffixSet.has(key(match[1].replace(/\.$/u, '')))) break;
    foundSuffixes.unshift(match[1]);
    text = text.slice(0, match.index).trim();
  }
  result.suffix = foundSuffixes.join(' ');
  const chunks = text.split(',').map(stripTitles);
  result.title = foundTitles.join(' ');
  if (chunks.length > 2 || (chunks.length === 2 && chunks.some(chunk => !chunk))) {
    warn('Invalid comma-separated name');
    return finish();
  }
  const tokenise = source => {
    const words = source.match(/\p{L}+(?:[-'’]\p{L}+)*\.?/gu) || [];
    if (/\S/u.test(source.replace(/\p{L}+(?:[-'’]\p{L}+)*\.?/gu, ''))
      || words.some(word => word.endsWith('.') && !initial(word))) {
      warn('Unexpected characters in name');
    }
    const allowedParticles = extended ? longParticles : particles;
    const grouped = [];
    for (let i = 0; i < words.length; i++) {
      let word = words[i];
      if (allowedParticles.has(key(word))) {
        while (i + 1 < words.length && allowedParticles.has(key(words[i]))) word += ' ' + words[++i];
      }
      if (i + 1 < words.length && marker(words[i + 1])) word += ' ' + words[++i];
      grouped.push(word);
    }
    return grouped;
  };
  let tokens;
  let commaLast = '';
  if (chunks.length === 2) {
    const left = tokenise(chunks[0]);
    if (!left.length) {
      warn('Missing surname before comma');
      return finish();
    }
    commaLast = left.join(' ');
    tokens = tokenise(chunks[1]);
  } else tokens = tokenise(chunks[0]);
  if (!tokens.length || tokens.length > 6) {
    warn(tokens.length ? 'Too many name parts' : 'No name parts found');
    return finish();
  }
  if (commaLast) {
    result.last = commaLast;
    result.first = tokens[0];
    result.middle = tokens.slice(1).join(' ');
    return finish();
  }
  if (tokens.length === 1) {
    const word = tokens[0];
    if (given(word) || initial(word)) result.first = word;
    else if (patronymic(word)) result.middle = word;
    else if (surname(word) || word.includes(' ')) result.last = word;
    else result.first = word;
    return finish();
  }
  if (order !== 'auto') {
    const lastFirst = order === 'last-first';
    result.first = tokens[lastFirst ? 1 : 0];
    result.last = tokens[lastFirst ? 0 : tokens.length - 1];
    result.middle = tokens.slice(lastFirst ? 2 : 1, lastFirst ? undefined : -1).join(' ');
    return finish();
  }

  const givenIndices = tokens.flatMap((word, index) => given(word) ? [index] : []);
  const middleIndices = tokens.flatMap((word, index) => !given(word) && patronymic(word) ? [index] : []);
  if (givenIndices.length === 1) {
    const firstIndex = givenIndices[0];
    result.first = tokens[firstIndex];
    const remaining = tokens.filter((_word, index) => index !== firstIndex);
    if (remaining.length === 1) {
      if (patronymic(remaining[0]) || initial(remaining[0])) result.middle = remaining[0];
      else result.last = remaining[0];
    } else {
      // Russian surname-first fields place the given name second.
      const lastIndex = firstIndex === 1 ? 0 : tokens.length - 1;
      if (lastIndex === firstIndex) {
        result.last = remaining[0];
        result.middle = remaining.slice(1).join(' ');
        warn('Unusual name order');
      } else {
        result.last = tokens[lastIndex];
        result.middle = tokens.filter((_word, index) => index !== firstIndex && index !== lastIndex).join(' ');
        if (patronymic(result.last) && remaining.length === 2 && middleIndices.length === 1) {
          // Also recognise given/surname/patronymic.
          [result.middle, result.last] = [result.last, result.middle];
        }
      }
    }
  } else if (initial(tokens[0])) {
    result.first = tokens[0];
    const last = tokens.at(-1);
    if (tokens.every(initial)) {
      result.middle = tokens.slice(1).join(' ');
      warn('Only initials supplied; surname is unknown');
    } else {
      result.last = last;
      result.middle = tokens.slice(1, -1).join(' ');
    }
  } else if (initial(tokens[1])) {
    result.last = tokens[0];
    result.first = tokens[1];
    result.middle = tokens.slice(2).join(' ');
  } else if (middleIndices.length === 1) {
    const middleIndex = middleIndices[0];
    result.middle = tokens[middleIndex];
    const rest = tokens.filter((_word, index) => index !== middleIndex);
    if (rest.length === 1) result.first = rest[0];
    else {
      // A patronymic at the end suggests surname/given/patronymic.
      const lastFirst = middleIndex === tokens.length - 1;
      result.first = rest[lastFirst ? 1 : 0];
      result.last = rest[lastFirst ? 0 : rest.length - 1];
      if (rest.length > 2) warn('Ambiguous extra name parts');
    }
  } else {
    const lastFirst = !given(tokens[0]) && surname(tokens[0]) && !surname(tokens.at(-1));
    result.first = tokens[lastFirst ? 1 : 0];
    result.last = tokens[lastFirst ? 0 : tokens.length - 1];
    result.middle = tokens.slice(lastFirst ? 2 : 1, lastFirst ? undefined : -1).join(' ');
    warn(givenIndices.length > 1 ? 'Ambiguous given names; assumed positional order' : 'Unknown name order; assumed positional order');
  }
  return finish();
}
