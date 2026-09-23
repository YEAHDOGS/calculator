// Calculator engine: tokenized expression evaluation, no eval().
// Display operators are pretty (× ÷ −); internal ops are canonical (+ - * /).

const DISPLAY_OP = { '+': '+', '-': '−', '*': '×', '/': '÷' };
const MAX_DIGITS = 12;
const MAX_HISTORY = 30;

/** Format a number for display: trims float noise, adds thousands separators. */
export function formatNumber(value) {
  if (typeof value !== 'number' || !isFinite(value)) return 'Error';
  if (Object.is(value, -0)) value = 0;
  // Trim IEEE-754 noise: 0.1 + 0.2 -> 0.3
  const rounded = parseFloat(value.toPrecision(10));
  let [int, frac] = String(rounded).split('.');
  let sign = '';
  if (int.startsWith('-')) { sign = '-'; int = int.slice(1); }
  int = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return sign + int + (frac !== undefined ? '.' + frac : '');
}

/** Parse a display-formatted number back to a float. */
export function parseNumber(str) {
  return parseFloat(String(str).replace(/,/g, ''));
}

function applyOp(a, op, b) {
  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '*': return a * b;
    case '/':
      if (b === 0) throw new Error('DIV0');
      return a / b;
    default: throw new Error('BADOP');
  }
}

const PRECEDENCE = { '+': 1, '-': 1, '*': 2, '/': 2 };

/** Evaluate a flat token list [num, op, num, op, ...] with precedence. */
export function evaluateTokens(tokens) {
  if (!tokens.length) return 0;
  const values = [];
  const ops = [];
  const flush = (minPrec) => {
    while (ops.length && PRECEDENCE[ops[ops.length - 1]] >= minPrec) {
      const op = ops.pop();
      const b = values.pop();
      const a = values.pop();
      values.push(applyOp(a, op, b));
    }
  };
  for (const t of tokens) {
    if (typeof t === 'number') values.push(t);
    else { flush(PRECEDENCE[t]); ops.push(t); }
  }
  flush(0);
  return values[0];
}

/** Live preview of an in-progress expression; null when nothing to show. */
export function previewTokens(tokens) {
  try {
    if (tokens.length < 3) return null;
    return formatNumber(evaluateTokens(tokens));
  } catch {
    return null;
  }
}

export class Calculator {
  constructor() {
    this.history = [];
    this.clear();
  }

  clear() {
    this.cur = '0';
    this.tokens = [];
    this.fresh = true;      // next digit starts a new entry
    this.justEval = false;  // last action was =
    this.lastOp = null;     // for repeat-equals
    this.lastOperand = null;
    this.error = null;
  }

  _resetAfterError() {
    if (this.error) this.clear();
  }

  inputDigit(d) {
    this._resetAfterError();
    if (this.justEval) this.clear();
    if (this.fresh || this.cur === '0') {
      this.cur = d;
      this.fresh = false;
    } else if (this.cur.replace(/[-.,]/g, '').length < MAX_DIGITS) {
      this.cur += d;
    }
    this.justEval = false;
  }

  inputDot() {
    this._resetAfterError();
    if (this.justEval) this.clear();
    if (this.fresh) { this.cur = '0.'; this.fresh = false; }
    else if (!this.cur.includes('.')) this.cur += '.';
    this.justEval = false;
  }

  inputOp(op) {
    this._resetAfterError();
    const value = parseNumber(this.cur);
    if (this.justEval) {
      this.tokens = [value];
      this.justEval = false;
    } else if (this.fresh && this.tokens.length) {
      // Operator pressed twice: swap it.
      this.tokens[this.tokens.length - 1] = op;
      return;
    } else {
      this.tokens.push(value);
      this.tokens.push(op);
    }
    this.fresh = true;
    this.cur = '0';
  }

  toggleSign() {
    this._resetAfterError();
    if (this.justEval) this.justEval = false;
    if (this.cur === '0') return;
    this.cur = this.cur.startsWith('-') ? this.cur.slice(1) : '-' + this.cur;
    this.fresh = false;
  }

  percent() {
    this._resetAfterError();
    const v = parseNumber(this.cur) / 100;
    this.cur = formatNumber(v);
    this.fresh = false;
    this.justEval = false;
  }

  backspace() {
    this._resetAfterError();
    if (this.justEval || this.fresh) return;
    this.cur = this.cur.length > 1 ? this.cur.slice(0, -1) : '0';
    if (this.cur === '-' || this.cur === '') this.cur = '0';
  }

  equals() {
    this._resetAfterError();
    let result;
    let exprTokens;
    if (!this.tokens.length) {
      // Repeat-equals: 5 = = = keeps applying the last op.
      if (this.lastOp === null) return;
      const value = parseNumber(this.cur);
      try {
        result = applyOp(value, this.lastOp, this.lastOperand);
      } catch { this._fail(); return; }
      exprTokens = [value, this.lastOp, this.lastOperand];
    } else {
      exprTokens = [...this.tokens, parseNumber(this.cur)];
      try {
        result = evaluateTokens(exprTokens);
      } catch { this._fail(); return; }
      const ops = exprTokens.filter((t) => typeof t === 'string');
      const nums = exprTokens.filter((t) => typeof t === 'number');
      this.lastOp = ops[ops.length - 1];
      this.lastOperand = nums[nums.length - 1];
    }
    const exprStr = this._displayExpr(exprTokens);
    this.history.unshift({ expr: exprStr + ' =', result: formatNumber(result) });
    if (this.history.length > MAX_HISTORY) this.history.pop();
    this.cur = formatNumber(result);
    this.tokens = [];
    this.fresh = true;
    this.justEval = true;
  }

  _fail() {
    this.error = "Can't divide by zero";
    this.cur = '0';
    this.tokens = [];
    this.fresh = true;
    this.justEval = false;
  }

  _displayExpr(tokens) {
    return tokens
      .map((t) => (typeof t === 'number' ? formatNumber(t) : DISPLAY_OP[t]))
      .join(' ');
  }

  /** Expression line shown above the current value. */
  get expression() {
    if (this.error) return '';
    const parts = this.tokens.map((t) =>
      typeof t === 'number' ? formatNumber(t) : DISPLAY_OP[t]
    );
    if (!this.justEval && !this.fresh) parts.push(formatNumber(parseNumber(this.cur)));
    return parts.join(' ');
  }

  /** Live result preview, or null. */
  get preview() {
    if (this.error || this.justEval || !this.tokens.length) return null;
    if (this.fresh) return previewTokens(this.tokens);
    return previewTokens([...this.tokens, parseNumber(this.cur)]);
  }

  get display() {
    if (this.error) return this.error;
    return formatNumber(parseNumber(this.cur));
  }

  get pendingOp() {
    if (this.fresh && this.tokens.length) {
      const last = this.tokens[this.tokens.length - 1];
      return typeof last === 'string' ? last : null;
    }
    return null;
  }

  recall(resultStr) {
    this.clear();
    this.cur = resultStr;
    this.fresh = true;
    this.justEval = true;
  }
}
