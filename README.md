# Russian name extractor

A small, dependency-free JavaScript library with TypeScript declarations for Next.js server components, client components, and route handlers. No API keys, network requests, or Node-specific runtime imports. Input stays where you run the library.

## Install

From your Next.js project, install this local folder (this package has not been published to npm):

```sh
npm install /absolute/path/to/AI_NameLib
```

On Windows, for this checkout: `npm install C:/AI_NameLib`.

## Use

```ts
import { extractName } from 'russian-name-extractor';

extractName('Наташа Иванова');
// { firstName: 'Наташа', lastName: 'Иванова', patronymic: null,
//   confidence: 'medium', warnings: [] }

extractName('Меня зовут Хасим Магомедов.');
// firstName: 'Хасим', lastName: 'Магомедов'

extractName('Аламбек');
// firstName: 'Аламбек', lastName: null

extractName('Иванов Иван Иванович');
// firstName: 'Иван', lastName: 'Иванов', patronymic: 'Иванович'

extractName('Меня зовут Зарема Умарова.', {
  mode: 'text',
  additionalGivenNames: ['Зарема'],
});
```

Names are title-cased, Unicode-normalized, and matched without case sensitivity. `е` and `ё` are equivalent for dictionary lookup; the spelling supplied by the user is preserved in output. Наташа stays Наташа, rather than being expanded to Наталья. Hyphens and apostrophes are supported.

## Built-in names

See [the complete supported-name inventory](NAMES.md) for every built-in spelling, including formal names, rare and historical names, informal forms, and selected names used by Russian speakers from other naming traditions. These are given names, not a surname dictionary. The list is manually maintained and does not claim to contain every possible Russian name.

```ts
import { givenNames } from 'russian-name-extractor';

console.log(givenNames.length);
// Read-only alphabetically sorted list; also frozen at runtime.
```

Spelling variants such as Алёна / Алена are listed separately. Informal forms are preserved, not converted to formal names. For context on the distinction between formal and derived forms, see [Gramota's dictionary structure](https://gramota.ru/biblioteka/slovari/slovar-russkih-imyon/o-postroenii-slovarya). This reference is background; the library does not redistribute that dictionary.

## Options and results

| Option | Default | Meaning |
| --- | --- | --- |
| `mode` | `auto` | `name` expects a name-only field; `text` scans prose. `auto` treats 1–3 name-like words as a field, otherwise scans prose. |
| `order` | `auto` | For name fields: infer using dictionary evidence, or specify `first-last` / `last-first`. Three-part explicit orders are first/patronymic/last and last/first/patronymic. |
| `additionalGivenNames` | `[]` | Extend the seed dictionary for your users. |
| `maxLength` | `10000` | Maximum input length in UTF-16 code units. |

`firstName`, `lastName`, and `patronymic` are nullable. `confidence` is a qualitative label, not a probability: `high` for a known single given name in a name field, `medium` for inferred multi-part names or text matches, `low` for unknown field names or surname-only guesses, and `none` for no extraction. `warnings` explains uncertainty or rejected input. Invalid argument types/options throw `TypeError`; oversized input throws `RangeError`. An empty string returns an empty result.

## Next.js route

Copy `examples/next-app/app/api/extract-name/route.js` into your app at `app/api/extract-name/route.js`. It accepts `POST` JSON:

```json
{ "input": "Меня зовут Наташа Иванова" }
```

The example uses the standard Request/Response APIs supported by [Next.js route handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route). You can also import `extractName` directly inside a client component; no route is required.

## Limits

This is a deterministic heuristic parser, not a complete Russian linguistic model. The dictionary includes common Russian names, rare and historical names, informal forms, and a selection of names used by Russian speakers, including Хасим and Аламбек. It cannot enumerate every name or establish someone's identity. Expanding coverage also increases possible ordinary-word matches (for example, Роза, Муза, and Лев); dictionary membership alone does not prove that text refers to a person.

Use `mode: 'text'` for chat messages: automatic field detection can interpret arbitrary short phrases as unfamiliar names. In prose, only known given names anchor extraction and surnames require a recognizable suffix; unusual surnames such as Ли may be omitted. Suffixes can also match ordinary words. A name-only field permits unfamiliar surnames. Several recognized given names cause an ambiguous result instead of selecting a person. Names shared with ordinary words (Вера, Любовь) can be false positives. Inflected names (Наташе, Иванову), initials, multiword surname particles, and gender inference are not supported. For consequential uses, let users review or supply separate first/last-name fields.

## Development

```sh
node --test
node --check src/index.js
```

Tests include the requested names, informal forms, reverse order, patronymics, casing, Unicode, hyphens, apostrophes, unknown/custom names, ambiguity, validation, and HTTP handler behavior. The handler is tested with native Request/Response; this repository does not include a full Next.js application or framework build.
