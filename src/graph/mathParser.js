// Safe maths-expression parser for the function plotter.
// No eval() and no libraries: text -> tokens -> syntax tree -> JS function of x.
//
// Supports: + - * / ^  ( )  the variable x  constants pi, e
// Functions: sin cos tan sec csc cot asin acos atan sinh cosh tanh
//            sqrt cbrt abs ln log(base 10) exp floor ceil
// Friendly input: "y = 2x^2", "3(x+1)", "sin 2x", "sin^2(x)", "x²", "√x", "π"

export class ParseError extends Error {}

const FUNCS = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  sec: (x) => 1 / Math.cos(x), csc: (x) => 1 / Math.sin(x), cot: (x) => 1 / Math.tan(x),
  asin: Math.asin, acos: Math.acos, atan: Math.atan,
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
  sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs,
  ln: Math.log, log: Math.log10, exp: Math.exp,
  floor: Math.floor, ceil: Math.ceil,
};
const TRIG_IN = new Set(['sin', 'cos', 'tan', 'sec', 'csc', 'cot']);
const TRIG_OUT = new Set(['asin', 'acos', 'atan']);

// longest names first so "sinh" wins over "sin" and "exp" wins over "e"
const NAMES = [...Object.keys(FUNCS), 'pi', 'e', 'x'].sort((a, b) => b.length - a.length);

function normalize(src) {
  return String(src)
    .toLowerCase()
    .replace(/^\s*(y|f\s*\(\s*x\s*\))\s*=\s*/, '') // drop "y =" / "f(x) ="
    .replace(/\*\*/g, '^')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/[−–]/g, '-')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/π/g, 'pi')
    .replace(/√/g, 'sqrt');
}

function tokenize(src) {
  const s = normalize(src);
  const tokens = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) { i++; continue; }
    const num = /^(\d+\.?\d*|\.\d+)/.exec(s.slice(i));
    if (num) { tokens.push({ t: 'num', v: parseFloat(num[0]) }); i += num[0].length; continue; }
    if ('+-*/^()'.includes(ch)) { tokens.push({ t: ch }); i++; continue; }
    const name = NAMES.find((n) => s.startsWith(n, i));
    if (name) { tokens.push({ t: 'id', v: name }); i += name.length; continue; }
    throw new ParseError(`Unknown symbol "${ch}"`);
  }
  return tokens;
}

const describe = (tok) => (tok.t === 'num' ? String(tok.v) : tok.t === 'id' ? tok.v : tok.t);

class Parser {
  constructor(tokens) { this.tokens = tokens; this.pos = 0; }
  peek() { return this.tokens[this.pos]; }
  next() { return this.tokens[this.pos++]; }
  startsFactor(tok) { return !!tok && (tok.t === 'num' || tok.t === 'id' || tok.t === '('); }

  parse() {
    const node = this.expr();
    if (this.pos < this.tokens.length) {
      const tok = this.peek();
      throw new ParseError(tok.t === ')' ? 'Extra ")"' : `Unexpected "${describe(tok)}"`);
    }
    return node;
  }

  expr() {
    let n = this.term();
    while (this.peek() && (this.peek().t === '+' || this.peek().t === '-')) {
      const op = this.next().t;
      n = { type: 'bin', op, l: n, r: this.term() };
    }
    return n;
  }

  term() {
    let n = this.unary();
    for (;;) {
      const p = this.peek();
      if (p && (p.t === '*' || p.t === '/')) {
        this.next();
        n = { type: 'bin', op: p.t, l: n, r: this.unary() };
      } else if (this.startsFactor(p)) {
        n = { type: 'bin', op: '*', l: n, r: this.unary() }; // implicit: 2x, 3(x+1), x sin(x)
      } else break;
    }
    return n;
  }

  unary() {
    const p = this.peek();
    if (p && p.t === '-') { this.next(); return { type: 'neg', v: this.unary() }; }
    if (p && p.t === '+') { this.next(); return this.unary(); }
    return this.power();
  }

  power() {
    const base = this.atom();
    const p = this.peek();
    if (p && p.t === '^') {
      this.next();
      return { type: 'pow', l: base, r: this.unary() }; // right-associative, allows x^-1
    }
    return base;
  }

  atom() {
    const tok = this.next();
    if (!tok) throw new ParseError('The equation ends too early');
    if (tok.t === 'num') return { type: 'num', v: tok.v };
    if (tok.t === '(') {
      const n = this.expr();
      if (!this.peek() || this.peek().t !== ')') throw new ParseError('Missing ")"');
      this.next();
      return n;
    }
    if (tok.t === 'id') {
      if (tok.v === 'x') return { type: 'x' };
      if (tok.v === 'pi') return { type: 'num', v: Math.PI };
      if (tok.v === 'e') return { type: 'num', v: Math.E };
      // function name; allow sin^2(x) meaning (sin(x))^2
      let power = null;
      if (this.peek() && this.peek().t === '^') { this.next(); power = this.funcPower(); }
      const arg = this.peek() && this.peek().t === '(' ? this.atom() : this.funcArg();
      let node = { type: 'fn', name: tok.v, arg };
      if (power) node = { type: 'pow', l: node, r: power };
      return node;
    }
    throw new ParseError(`Unexpected "${describe(tok)}"`);
  }

  funcPower() {
    const p = this.peek();
    if (p && p.t === '-') { this.next(); return { type: 'neg', v: this.funcPower() }; }
    if (p && (p.t === 'num' || p.t === '(')) return this.atom();
    throw new ParseError('Missing power after "^"');
  }

  // function without brackets: "sin x", "sin 2x", "ln x^2"
  funcArg() {
    if (!this.peek()) throw new ParseError('Function needs a value, e.g. sin(x)');
    let n = this.unary();
    for (;;) {
      const q = this.peek();
      if (q && (q.t === 'num' || (q.t === 'id' && !FUNCS[q.v]))) {
        n = { type: 'bin', op: '*', l: n, r: this.power() };
      } else break;
    }
    return n;
  }
}

// a^b that also handles real odd roots of negatives, e.g. (-8)^(1/3) = -2
function powReal(a, b) {
  if (a < 0 && !Number.isInteger(b)) {
    for (const q of [3, 5, 7, 9]) {
      const p = b * q;
      if (Math.abs(p - Math.round(p)) < 1e-9) {
        return (Math.round(p) % 2 === 0 ? 1 : -1) * Math.pow(-a, b);
      }
    }
  }
  return Math.pow(a, b);
}

function build(node, degrees) {
  switch (node.type) {
    case 'num': { const v = node.v; return () => v; }
    case 'x': return (x) => x;
    case 'neg': { const f = build(node.v, degrees); return (x) => -f(x); }
    case 'bin': {
      const l = build(node.l, degrees);
      const r = build(node.r, degrees);
      if (node.op === '+') return (x) => l(x) + r(x);
      if (node.op === '-') return (x) => l(x) - r(x);
      if (node.op === '*') return (x) => l(x) * r(x);
      return (x) => l(x) / r(x);
    }
    case 'pow': {
      const l = build(node.l, degrees);
      const r = build(node.r, degrees);
      return (x) => powReal(l(x), r(x));
    }
    case 'fn': {
      const g = FUNCS[node.name];
      const a = build(node.arg, degrees);
      if (degrees && TRIG_IN.has(node.name)) return (x) => g((a(x) * Math.PI) / 180);
      if (degrees && TRIG_OUT.has(node.name)) return (x) => (g(a(x)) * 180) / Math.PI;
      return (x) => g(a(x));
    }
    default:
      throw new ParseError('Could not understand the equation');
  }
}

/** Returns a function f(x). Throws ParseError with a readable message. */
export function compileExpression(text, { degrees = false } = {}) {
  const tokens = tokenize(text);
  if (!tokens.length) throw new ParseError('Type an equation, e.g. x^2 or sin(x)');
  const fn = build(new Parser(tokens).parse(), degrees);
  return (x) => {
    const y = fn(x);
    return typeof y === 'number' ? y : NaN;
  };
}

/** Never throws for bad input: returns { fn, error }. */
export function tryCompile(text, opts) {
  try {
    return { fn: compileExpression(text, opts), error: null };
  } catch (e) {
    if (e instanceof ParseError) return { fn: null, error: e.message };
    throw e;
  }
}

/* ---------- points (A(-3, 5)) and vertical lines (x = 3) ---------- */

// a number such as 5, -3, 2.5, .5 or a simple fraction like 1/2
const NUM = String.raw`[-+]?(?:\d+\.?\d*|\.\d+)(?:\s*\/\s*\d+\.?\d*)?`;

function toNumber(t) {
  const [a, b] = t.replace(/\s+/g, '').split('/');
  return parseFloat(a) / (b === undefined ? 1 : parseFloat(b));
}

/**
 * Reads "A(-3, 5), B(5, -2), C(5, 6)" into [{ name, x, y }].
 * Names are optional: "(1, 2)" works too. Never throws.
 */
export function parsePoints(text) {
  const s = String(text).replace(/[−–]/g, '-');
  if (!s.trim()) return { points: [], error: null };
  const re = new RegExp(`([A-Za-z][A-Za-z0-9']{0,3})?\\s*\\(\\s*(${NUM})\\s*,\\s*(${NUM})\\s*\\)`, 'g');
  const points = [];
  let m;
  while ((m = re.exec(s)) !== null) {
    const x = toNumber(m[2]);
    const y = toNumber(m[3]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return { points: [], error: 'A point has a number that cannot be used' };
    }
    points.push({ name: m[1] || '', x, y });
  }
  if (!points.length) return { points: [], error: 'Write points like A(-3, 5), B(5, 6)' };
  return { points, error: null };
}

/** "x = 3" -> 3 (a vertical line). Anything else -> null. */
export function parseVerticalLine(text) {
  const s = String(text).replace(/[−–]/g, '-');
  const m = new RegExp(`^\\s*x\\s*=\\s*(${NUM})\\s*$`, 'i').exec(s);
  if (!m) return null;
  const v = toNumber(m[1]);
  return Number.isFinite(v) ? v : null;
}
