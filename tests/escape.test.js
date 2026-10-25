import {esc} from '../src/ui/escape.js';

const test = (name, fn) => {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (e) {
    console.error(`fail - ${name}: ${e.message}`);
    process.exitCode = 1;
  }
};

// Expected values using the actual HTML entities that esc() produces
// Using string concatenation to avoid HTML entity interpretation in JS string literals
const AMP = '&' + 'amp;';
const LT = '&' + 'lt;';
const GT = '&' + 'gt;';
const QUOT = '&' + 'quot;';
const APOS = '&' + '#39;';

test('esc: escapes & to &', () => {
  const out = esc('a & b');
  if (out !== 'a ' + AMP + ' b') throw new Error(`expected "a ${AMP} b", got "${out}"`);
});

test('esc: escapes < to <', () => {
  const out = esc('<script>');
  if (out !== LT + 'script' + GT) throw new Error(`expected "${LT}script${GT}", got "${out}"`);
});

test('esc: escapes > to >', () => {
  const out = esc('a > b');
  if (out !== 'a ' + GT + ' b') throw new Error(`expected "a ${GT} b", got "${out}"`);
});

test('esc: escapes " to "', () => {
  const out = esc('say "hi"');
  if (out !== 'say ' + QUOT + 'hi' + QUOT) throw new Error(`expected "say ${QUOT}hi${QUOT}", got "${out}"`);
});

test("esc: escapes ' to '", () => {
  const out = esc("don't");
  if (out !== "don" + APOS + "t") throw new Error(`expected "don${APOS}t", got "${out}"`);
});

test('esc: handles textarea closing tag injection', () => {
  const out = esc('</textarea><img src=x onerror=alert(1)>');
  if (out === '</textarea><img src=x onerror=alert(1)>') {
    throw new Error('unescaped dangerous string');
  }
  if (!out.includes(LT + '/textarea' + GT)) {
    throw new Error('did not escape </textarea>');
  }
});

test('esc: handles empty string', () => {
  const out = esc('');
  if (out !== '') throw new Error(`expected "", got "${out}"`);
});

test('esc: handles non-string input', () => {
  if (esc(null) !== '') throw new Error('null should return empty string');
  if (esc(undefined) !== '') throw new Error('undefined should return empty string');
  if (esc(123) !== '') throw new Error('number should return empty string');
});

test('esc: preserves safe text unchanged', () => {
  const out = esc('Hello world! 123');
  if (out !== 'Hello world! 123') throw new Error(`expected unchanged, got "${out}"`);
});

test('esc: handles multiple special chars', () => {
  const out = esc('<>&"\'');
  const expected = LT + GT + AMP + QUOT + APOS;
  if (out !== expected) throw new Error(`expected all escaped, got "${out}"`);
});