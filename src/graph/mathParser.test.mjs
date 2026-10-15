// Run with:  node mathParser.test.mjs
import { compileExpression, tryCompile, parsePoints, parseVerticalLine } from './mathParser.js';

const near = (a, b) => Math.abs(a - b) < 1e-9;
let failed = 0;

function check(expr, x, expected, opts) {
  let got;
  try { got = compileExpression(expr, opts)(x); } catch (e) { got = `ERROR: ${e.message}`; }
  const ok = typeof got === 'number' && near(got, expected);
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${expr}  @x=${x}  ->  ${got}${ok ? '' : `   (expected ${expected})`}`);
}

function checkError(expr) {
  const { error } = tryCompile(expr);
  const ok = !!error;
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  "${expr}"  ->  ${error || 'no error (expected one)'}`);
}

check('x^2', 3, 9);
check('-x^2', 3, -9);
check('2x', 4, 8);
check('2(x+1)', 2, 6);
check('(x+1)(x-1)', 3, 8);
check('2x^2+3x-5', 2, 9);
check('y = x/2', 6, 3);
check('f(x) = x+1', 2, 3);
check('3x²', 2, 12);
check('1/x', 4, 0.25);
check('1/2x', 4, 2);
check('2^-x', 1, 0.5);
check('sqrt(x)', 16, 4);
check('√x', 9, 3);
check('abs(x)', -3, 3);
check('sin(x)', Math.PI / 2, 1);
check('sinx', Math.PI / 2, 1);
check('sin 2x', Math.PI / 4, 1);
check('x sin(x)', Math.PI / 2, Math.PI / 2);
check('sin^2(x)+cos^2(x)', 1.234, 1);
check('e^x', 0, 1);
check('ln(e)', 0, 1);
check('log(100)', 0, 2);
check('2pi', 0, 2 * Math.PI);
check('x^(1/3)', -8, -2);
check('x^(2/3)', -8, 4);
check('sin(x)', 90, 1, { degrees: true });
check('tan(x)', 45, 1, { degrees: true });
check('atan(1)', 0, 45, { degrees: true });

checkError('');
checkError('x+');
checkError('(x');
checkError('x)');
checkError('x $ 2');
checkError('sin');
checkError('abc');


// ---- points and vertical lines ----
function checkPoints(text, expected) {
  const { points, error } = parsePoints(text);
  const got = JSON.stringify(points.map((p) => [p.name, p.x, p.y]));
  const want = JSON.stringify(expected);
  const ok = !error && got === want;
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  points "${text}"  ->  ${got}${ok ? '' : `   (expected ${want})`}`);
}
checkPoints('A(-3,5), B(5,-2), C(5,6)', [['A', -3, 5], ['B', 5, -2], ['C', 5, 6]]);
checkPoints('A(−3, 5)', [['A', -3, 5]]);
checkPoints('(1, 2)', [['', 1, 2]]);
checkPoints("P(1/2, -3.5) Q'(0, 4)", [['P', 0.5, -3.5], ["Q'", 0, 4]]);
checkPoints('A (2,3) and B(4,5)', [['A', 2, 3], ['B', 4, 5]]);
{
  const bad = parsePoints('hello');
  const ok = !!bad.error && bad.points.length === 0;
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  points "hello"  ->  ${bad.error}`);
  const empty = parsePoints('   ');
  const ok2 = !empty.error && empty.points.length === 0;
  if (!ok2) failed++;
  console.log(`${ok2 ? 'ok  ' : 'FAIL'}  points empty text -> no error`);
}
for (const [t, want] of [['x = 3', 3], ['x=-2.5', -2.5], ['X = 1/2', 0.5], ['x = y', null], ['y = 3', null], ['x', null]]) {
  const got = parseVerticalLine(t);
  const ok = got === want;
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  vertical "${t}"  ->  ${got}`);
}

console.log(failed ? `\n${failed} FAILED` : '\nAll passed');
process.exit(failed ? 1 : 0);
