/** All built-in given-name spellings, sorted alphabetically and frozen at runtime. */
export const givenNames: readonly string[];

export interface ExtractNameOptions {
  /** auto treats 1–3 name-like words as a name field; text scans prose. Default: auto. */
  mode?: 'auto' | 'name' | 'text';
  /** Field order. Three parts: first/patronymic/last or last/first/patronymic. */
  order?: 'auto' | 'first-last' | 'last-first';
  /** Extend the seed dictionary without changing the library. */
  additionalGivenNames?: readonly string[];
  /** Maximum input length in UTF-16 code units. Default: 10000. */
  maxLength?: number;
}
export type NameWarning = 'invalid-name-field' | 'ambiguous-name' | 'surname-heuristic'
  | 'unknown-given-name' | 'inferred-order' | 'multiple-name-candidates' | 'text-heuristic';
export interface ExtractedName {
  firstName: string | null;
  lastName: string | null;
  patronymic: string | null;
  /** Qualitative evidence strength, not a calibrated probability. */
  confidence: 'none' | 'low' | 'medium' | 'high';
  warnings: NameWarning[];
}
/** Throws TypeError for invalid arguments and RangeError for oversized input. */
export function extractName(input: string, options?: ExtractNameOptions): ExtractedName;

export interface ParsedFullName {
  title: string;
  first: string;
  /** Russian patronymic or other middle names/initials. */
  middle: string;
  last: string;
  nick: string;
  suffix: string;
  error: string[];
}
export type FullNamePart = keyof ParsedFullName | 'all';
export type ParsedPart<P extends FullNamePart> = P extends 'all' ? ParsedFullName
  : P extends 'error' ? string[] : string;
export interface ParseFullNameOptions<P extends FullNamePart = 'all'> {
  partToReturn?: P;
  /** -1: fix only all-upper/all-lower input; false/0: preserve; true/1: always fix. */
  fixCase?: -1 | 0 | 1 | boolean;
  stopOnError?: 0 | 1 | boolean;
  /** Enable additional Russian titles, suffixes and surname particles. */
  useLongLists?: 0 | 1 | boolean;
  order?: 'auto' | 'first-last' | 'last-first';
  additionalGivenNames?: readonly string[];
  maxLength?: number;
}
/** Parse a full-name field. Malformed input produces error messages unless stopOnError is enabled. */
export function parseFullName<P extends FullNamePart = 'all'>(
  input: unknown, partToReturn?: P, fixCase?: -1 | 0 | 1 | boolean,
  stopOnError?: 0 | 1 | boolean, useLongLists?: 0 | 1 | boolean,
): ParsedPart<P>;
export function parseFullName<P extends FullNamePart = 'all'>(
  input: unknown, options: ParseFullNameOptions<P>,
): ParsedPart<P>;
