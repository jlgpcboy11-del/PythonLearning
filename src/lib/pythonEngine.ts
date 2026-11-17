export type PyType =
  | 'int'
  | 'float'
  | 'str'
  | 'bool'
  | 'NoneType'
  | 'list'
  | 'tuple'
  | 'dict'
  | 'set'
  | 'function'
  | 'class'
  | 'instance';

export interface PyList {
  __kind: 'list';
  items: PyValue[];
}

export interface PyTuple {
  __kind: 'tuple';
  items: PyValue[];
}

export interface PyDict {
  __kind: 'dict';
  entries: Array<[PyValue, PyValue]>;
}

export interface PySet {
  __kind: 'set';
  items: PyValue[];
}

export interface PyFunction {
  __kind: 'function';
  name: string;
  params: Array<{ name: string; defaultExpr?: ExprNode }>;
  body: StmtNode[];
  closure: Scope;
  isNative?: false;
}

export interface PyNativeFunction {
  __kind: 'native_function';
  name: string;
  fn: (args: PyValue[], kwargs: Record<string, PyValue>, ctx: EvalContext) => PyValue;
}

export interface PyClass {
  __kind: 'class';
  name: string;
  methods: Record<string, PyFunction>;
}

export interface PyInstance {
  __kind: 'instance';
  cls: PyClass;
  attrs: Record<string, PyValue>;
}

export interface PyBoundMethod {
  __kind: 'bound_method';
  self: PyValue;
  fn: PyFunction | PyNativeFunction;
  isNativeMethod?: boolean;
}

export type PyValue =
  | number
  | string
  | boolean
  | null
  | PyList
  | PyTuple
  | PyDict
  | PySet
  | PyFunction
  | PyNativeFunction
  | PyClass
  | PyInstance
  | PyBoundMethod;

export interface SerializedVar {
  name: string;
  type: string;
  value: string;
}

export interface StackFrameSnapshot {
  functionName: string;
  line: number;
  locals: SerializedVar[];
}

export interface TraceStep {
  stepIndex: number;
  line: number;
  event: 'step' | 'call' | 'return' | 'output' | 'error';
  annotation: string;
  outputSoFar: string;
  globals: SerializedVar[];
  callStack: StackFrameSnapshot[];
}

export interface PythonErrorInfo {
  type: string;
  message: string;
  line: number;
}

export interface ExecutionResult {
  success: boolean;
  output: string;
  error: PythonErrorInfo | null;
  steps: TraceStep[];
  finalGlobals: Record<string, PyValue>;
  durationMs: number;
}

class PyRuntimeError extends Error {
  pyType: string;
  line: number;
  constructor(pyType: string, message: string, line = 1) {
    super(message);
    this.pyType = pyType;
    this.line = line;
  }
}

class ReturnSignal {
  value: PyValue;
  constructor(value: PyValue) {
    this.value = value;
  }
}

class BreakSignal {}
class ContinueSignal {}

// ==================== LEXER ====================

type TokenType =
  | 'NUMBER'
  | 'STRING'
  | 'FSTRING'
  | 'IDENT'
  | 'KEYWORD'
  | 'OP'
  | 'NEWLINE'
  | 'INDENT'
  | 'DEDENT'
  | 'EOF';

interface Token {
  type: TokenType;
  value: string;
  line: number;
}

const KEYWORDS = new Set([
  'False',
  'None',
  'True',
  'and',
  'as',
  'break',
  'class',
  'continue',
  'def',
  'elif',
  'else',
  'except',
  'finally',
  'for',
  'if',
  'in',
  'is',
  'lambda',
  'not',
  'or',
  'pass',
  'raise',
  'return',
  'try',
  'while',
]);

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  const rawLines = source.replace(/\r\n/g, '\n').split('\n');
  const indentStack: number[] = [0];
  let bracketDepth = 0;

  for (let lineIdx = 0; lineIdx < rawLines.length; lineIdx++) {
    let lineNum = lineIdx + 1;
    let rawLine = rawLines[lineIdx];

    // Skip empty or comment-only lines when not inside brackets
    let firstNonSpace = 0;
    while (firstNonSpace < rawLine.length && (rawLine[firstNonSpace] === ' ' || rawLine[firstNonSpace] === '\t')) {
      firstNonSpace++;
    }
    if (firstNonSpace === rawLine.length || rawLine[firstNonSpace] === '#') {
      continue;
    }

    if (bracketDepth === 0) {
      let indent = 0;
      for (let i = 0; i < firstNonSpace; i++) {
        indent += rawLine[i] === '\t' ? 4 : 1;
      }
      const currentIndent = indentStack[indentStack.length - 1];
      if (indent > currentIndent) {
        indentStack.push(indent);
        tokens.push({ type: 'INDENT', value: '', line: lineNum });
      } else if (indent < currentIndent) {
        while (indentStack.length > 1 && indentStack[indentStack.length - 1] > indent) {
          indentStack.pop();
          tokens.push({ type: 'DEDENT', value: '', line: lineNum });
        }
        if (indentStack[indentStack.length - 1] !== indent) {
          throw new PyRuntimeError('IndentationError', '縮排層級不一致，請檢查空白鍵對齊', lineNum);
        }
      }
    }

    let i = firstNonSpace;
    while (i < rawLine.length) {
      const ch = rawLine[i];

      if (ch === ' ' || ch === '\t') {
        i++;
        continue;
      }

      if (ch === '#') {
        break;
      }

      // F-string or String
      const isFString = (ch === 'f' || ch === 'F') && (rawLine[i + 1] === '"' || rawLine[i + 1] === "'");
      if (isFString || ch === '"' || ch === "'") {
        if (isFString) i++;
        const quote = rawLine[i];
        const isTriple = rawLine.slice(i, i + 3) === quote.repeat(3);
        const delimLen = isTriple ? 3 : 1;
        i += delimLen;
        let strVal = '';
        let closed = false;

        if (isTriple) {
          // Handle multiline triple-quoted string
          let currentLineIdx = lineIdx;
          let currentRaw = rawLine;
          while (currentLineIdx < rawLines.length) {
            while (i < currentRaw.length) {
              if (currentRaw.slice(i, i + 3) === quote.repeat(3)) {
                i += 3;
                closed = true;
                break;
              }
              if (currentRaw[i] === '\\' && i + 1 < currentRaw.length) {
                strVal += decodeEscape(currentRaw[i + 1]);
                i += 2;
              } else {
                strVal += currentRaw[i];
                i++;
              }
            }
            if (closed) {
              lineIdx = currentLineIdx;
              break;
            }
            strVal += '\n';
            currentLineIdx++;
            if (currentLineIdx < rawLines.length) {
              currentRaw = rawLines[currentLineIdx];
              i = 0;
            }
          }
          if (!closed) {
            throw new PyRuntimeError('SyntaxError', '多行字串缺少結尾引號', lineNum);
          }
          tokens.push({ type: isFString ? 'FSTRING' : 'STRING', value: strVal, line: lineNum });
          if (lineIdx !== lineNum - 1) {
            rawLine = rawLines[lineIdx];
            lineNum = lineIdx + 1;
          }
          continue;
        } else {
          while (i < rawLine.length) {
            if (rawLine[i] === quote) {
              i++;
              closed = true;
              break;
            }
            if (rawLine[i] === '\\' && i + 1 < rawLine.length) {
              if (isFString && (rawLine[i + 1] === '{' || rawLine[i + 1] === '}')) {
                strVal += '\\' + rawLine[i + 1];
              } else {
                strVal += decodeEscape(rawLine[i + 1]);
              }
              i += 2;
            } else {
              strVal += rawLine[i];
              i++;
            }
          }
          if (!closed) {
            throw new PyRuntimeError('SyntaxError', '字串缺少結尾引號', lineNum);
          }
          tokens.push({ type: isFString ? 'FSTRING' : 'STRING', value: strVal, line: lineNum });
          continue;
        }
      }

      // Numbers
      if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(rawLine[i + 1] || ''))) {
        let numStr = '';
        let hasDot = false;
        while (i < rawLine.length && (/[0-9_]/.test(rawLine[i]) || (rawLine[i] === '.' && !hasDot))) {
          if (rawLine[i] === '.') {
            if (rawLine[i + 1] === '.') break;
            hasDot = true;
          }
          if (rawLine[i] !== '_') numStr += rawLine[i];
          i++;
        }
        tokens.push({ type: 'NUMBER', value: numStr, line: lineNum });
        continue;
      }

      // Identifiers & Keywords
      if (/[A-Za-z_\u4e00-\u9fff]/.test(ch)) {
        let ident = '';
        while (i < rawLine.length && /[A-Za-z0-9_\u4e00-\u9fff]/.test(rawLine[i])) {
          ident += rawLine[i];
          i++;
        }
        tokens.push({
          type: KEYWORDS.has(ident) ? 'KEYWORD' : 'IDENT',
          value: ident,
          line: lineNum,
        });
        continue;
      }

      // Multi-char operators
      const twoChar = rawLine.slice(i, i + 2);
      const threeChar = rawLine.slice(i, i + 3);
      if (threeChar === '//=' || threeChar === '**=') {
        tokens.push({ type: 'OP', value: threeChar, line: lineNum });
        i += 3;
        continue;
      }
      if (
        twoChar === '==' ||
        twoChar === '!=' ||
        twoChar === '<=' ||
        twoChar === '>=' ||
        twoChar === '//' ||
        twoChar === '**' ||
        twoChar === '+=' ||
        twoChar === '-=' ||
        twoChar === '*=' ||
        twoChar === '/=' ||
        twoChar === '%=' ||
        twoChar === '->'
      ) {
        tokens.push({ type: 'OP', value: twoChar, line: lineNum });
        i += 2;
        continue;
      }

      // Single-char operators & punctuation
      if ('+-*/%<>=()[]{},.:@'.includes(ch)) {
        if ('([{'.includes(ch)) bracketDepth++;
        if (')]}'.includes(ch)) bracketDepth = Math.max(0, bracketDepth - 1);
        tokens.push({ type: 'OP', value: ch, line: lineNum });
        i++;
        continue;
      }

      throw new PyRuntimeError('SyntaxError', `無法辨識的字元「${ch}」`, lineNum);
    }

    if (bracketDepth === 0) {
      tokens.push({ type: 'NEWLINE', value: '\n', line: lineNum });
    }
  }

  while (indentStack.length > 1) {
    indentStack.pop();
    tokens.push({ type: 'DEDENT', value: '', line: rawLines.length });
  }
  tokens.push({ type: 'EOF', value: '', line: rawLines.length });
  return tokens;
}

function decodeEscape(ch: string): string {
  switch (ch) {
    case 'n':
      return '\n';
    case 't':
      return '\t';
    case 'r':
      return '\r';
    case '\\':
      return '\\';
    case "'":
      return "'";
    case '"':
      return '"';
    default:
      return '\\' + ch;
  }
}

// ==================== AST NODES ====================

type ExprNode =
  | { kind: 'literal'; value: number | string | boolean | null; line: number }
  | { kind: 'fstring'; template: string; line: number }
  | { kind: 'ident'; name: string; line: number }
  | { kind: 'list'; items: ExprNode[]; line: number }
  | { kind: 'tuple'; items: ExprNode[]; line: number }
  | { kind: 'set'; items: ExprNode[]; line: number }
  | { kind: 'dict'; entries: Array<{ key: ExprNode; val: ExprNode }>; line: number }
  | { kind: 'list_comp'; expr: ExprNode; targets: string[]; iter: ExprNode; cond?: ExprNode; line: number }
  | { kind: 'dict_comp'; keyExpr: ExprNode; valExpr: ExprNode; targets: string[]; iter: ExprNode; cond?: ExprNode; line: number }
  | { kind: 'unary'; op: string; expr: ExprNode; line: number }
  | { kind: 'binary'; op: string; left: ExprNode; right: ExprNode; line: number }
  | { kind: 'compare'; left: ExprNode; ops: Array<{ op: string; right: ExprNode }>; line: number }
  | { kind: 'ternary'; body: ExprNode; cond: ExprNode; elseBody: ExprNode; line: number }
  | { kind: 'lambda'; params: Array<{ name: string; defaultExpr?: ExprNode }>; body: ExprNode; line: number }
  | { kind: 'call'; callee: ExprNode; args: Array<{ name?: string; value: ExprNode }>; line: number }
  | { kind: 'index'; obj: ExprNode; index: ExprNode; line: number }
  | { kind: 'slice'; obj: ExprNode; start?: ExprNode; stop?: ExprNode; step?: ExprNode; line: number }
  | { kind: 'attr'; obj: ExprNode; attr: string; line: number };

type TargetNode =
  | { kind: 'ident'; name: string }
  | { kind: 'tuple'; targets: TargetNode[] }
  | { kind: 'index'; obj: ExprNode; index: ExprNode }
  | { kind: 'attr'; obj: ExprNode; attr: string };

type StmtNode =
  | { kind: 'assign'; target: TargetNode; op: string; value: ExprNode; line: number }
  | { kind: 'expr'; expr: ExprNode; line: number }
  | { kind: 'if'; branches: Array<{ cond: ExprNode; body: StmtNode[]; line: number }>; elseBody?: StmtNode[]; line: number }
  | { kind: 'for'; target: TargetNode; iter: ExprNode; body: StmtNode[]; line: number }
  | { kind: 'while'; cond: ExprNode; body: StmtNode[]; line: number }
  | { kind: 'def'; name: string; params: Array<{ name: string; defaultExpr?: ExprNode }>; body: StmtNode[]; line: number }
  | { kind: 'class'; name: string; body: StmtNode[]; line: number }
  | { kind: 'return'; value?: ExprNode; line: number }
  | { kind: 'break'; line: number }
  | { kind: 'continue'; line: number }
  | { kind: 'pass'; line: number }
  | { kind: 'raise'; expr?: ExprNode; line: number }
  | { kind: 'try'; body: StmtNode[]; handlers: Array<{ excType?: string; asName?: string; body: StmtNode[] }>; line: number };

// ==================== PARSER ====================

class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(offset = 0): Token {
    return this.tokens[Math.min(this.pos + offset, this.tokens.length - 1)];
  }

  private advance(): Token {
    const t = this.peek();
    if (t.type !== 'EOF') this.pos++;
    return t;
  }

  private match(type: TokenType, value?: string): boolean {
    const t = this.peek();
    if (t.type !== type) return false;
    if (value !== undefined && t.value !== value) return false;
    this.advance();
    return true;
  }

  private expect(type: TokenType, value?: string, msg?: string): Token {
    const t = this.peek();
    if (t.type !== type || (value !== undefined && t.value !== value)) {
      throw new PyRuntimeError('SyntaxError', msg || `預期「${value ?? type}」，但遇到「${t.value || t.type}」`, t.line);
    }
    return this.advance();
  }

  parseModule(): StmtNode[] {
    const stmts: StmtNode[] = [];
    while (this.peek().type !== 'EOF') {
      while (this.match('NEWLINE')) {}
      if (this.peek().type === 'EOF') break;
      stmts.push(this.parseStmt());
    }
    return stmts;
  }

  private parseBlock(): StmtNode[] {
    this.expect('NEWLINE', undefined, '預期換行並開始縮排區塊');
    this.expect('INDENT', undefined, '冒號下方需要縮排程式碼區塊');
    const stmts: StmtNode[] = [];
    while (this.peek().type !== 'DEDENT' && this.peek().type !== 'EOF') {
      while (this.match('NEWLINE')) {}
      if (this.peek().type === 'DEDENT' || this.peek().type === 'EOF') break;
      stmts.push(this.parseStmt());
    }
    this.match('DEDENT');
    return stmts;
  }

  private parseStmt(): StmtNode {
    const t = this.peek();
    if (t.type === 'KEYWORD') {
      switch (t.value) {
        case 'if':
          return this.parseIf();
        case 'for':
          return this.parseFor();
        case 'while':
          return this.parseWhile();
        case 'def':
          return this.parseDef();
        case 'class':
          return this.parseClass();
        case 'return':
          return this.parseReturn();
        case 'break':
          this.advance();
          this.consumeStatementEnd();
          return { kind: 'break', line: t.line };
        case 'continue':
          this.advance();
          this.consumeStatementEnd();
          return { kind: 'continue', line: t.line };
        case 'pass':
          this.advance();
          this.consumeStatementEnd();
          return { kind: 'pass', line: t.line };
        case 'raise': {
          this.advance();
          let expr: ExprNode | undefined;
          if (this.peek().type !== 'NEWLINE' && this.peek().type !== 'EOF') {
            expr = this.parseExpr();
          }
          this.consumeStatementEnd();
          return { kind: 'raise', expr, line: t.line };
        }
        case 'try':
          return this.parseTry();
      }
    }
    return this.parseSimpleStmt();
  }

  private consumeStatementEnd() {
    if (this.peek().type === 'NEWLINE') {
      this.advance();
    } else if (this.peek().type !== 'EOF' && this.peek().type !== 'DEDENT') {
      throw new PyRuntimeError('SyntaxError', `語法未預期結束於「${this.peek().value}」`, this.peek().line);
    }
  }

  private parseSimpleStmt(): StmtNode {
    const startLine = this.peek().line;
    const first = this.parseTupleOrExpr();

    const opTok = this.peek();
    if (
      opTok.type === 'OP' &&
      ['=', '+=', '-=', '*=', '/=', '//=', '%='].includes(opTok.value)
    ) {
      this.advance();
      const rhs = this.parseTupleOrExpr();
      this.consumeStatementEnd();
      const target = this.exprToTarget(first);
      return { kind: 'assign', target, op: opTok.value, value: rhs, line: startLine };
    }

    this.consumeStatementEnd();
    return { kind: 'expr', expr: first, line: startLine };
  }

  private exprToTarget(expr: ExprNode): TargetNode {
    if (expr.kind === 'ident') return { kind: 'ident', name: expr.name };
    if (expr.kind === 'tuple') return { kind: 'tuple', targets: expr.items.map((i) => this.exprToTarget(i)) };
    if (expr.kind === 'index') return { kind: 'index', obj: expr.obj, index: expr.index };
    if (expr.kind === 'attr') return { kind: 'attr', obj: expr.obj, attr: expr.attr };
    throw new PyRuntimeError('SyntaxError', '左側無法作為賦值目標', expr.line);
  }

  private parseIf(): StmtNode {
    const startTok = this.expect('KEYWORD', 'if');
    const branches: Array<{ cond: ExprNode; body: StmtNode[]; line: number }> = [];
    const cond = this.parseExpr();
    this.expect('OP', ':', 'if 條件後方缺少冒號「:」');
    branches.push({ cond, body: this.parseBlock(), line: startTok.line });

    while (this.peek().type === 'KEYWORD' && this.peek().value === 'elif') {
      const elifTok = this.advance();
      const elifCond = this.parseExpr();
      this.expect('OP', ':', 'elif 條件後方缺少冒號「:」');
      branches.push({ cond: elifCond, body: this.parseBlock(), line: elifTok.line });
    }

    let elseBody: StmtNode[] | undefined;
    if (this.peek().type === 'KEYWORD' && this.peek().value === 'else') {
      this.advance();
      this.expect('OP', ':', 'else 後方缺少冒號「:」');
      elseBody = this.parseBlock();
    }

    return { kind: 'if', branches, elseBody, line: startTok.line };
  }

  private parseFor(): StmtNode {
    const startTok = this.expect('KEYWORD', 'for');
    const target = this.parseForTarget();
    this.expect('KEYWORD', 'in', 'for 迴圈需要「in」關鍵字');
    const iter = this.parseTupleOrExpr();
    this.expect('OP', ':', 'for 迴圈後方缺少冒號「:」');
    const body = this.parseBlock();
    return { kind: 'for', target, iter, body, line: startTok.line };
  }

  private parseForTarget(): TargetNode {
    const names: TargetNode[] = [{ kind: 'ident', name: this.expect('IDENT', undefined, '預期迴圈變數名稱').value }];
    while (this.match('OP', ',')) {
      if (this.peek().type === 'KEYWORD' && this.peek().value === 'in') break;
      names.push({ kind: 'ident', name: this.expect('IDENT', undefined, '預期迴圈變數名稱').value });
    }
    return names.length === 1 ? names[0] : { kind: 'tuple', targets: names };
  }

  private parseWhile(): StmtNode {
    const startTok = this.expect('KEYWORD', 'while');
    const cond = this.parseExpr();
    this.expect('OP', ':', 'while 條件後方缺少冒號「:」');
    const body = this.parseBlock();
    return { kind: 'while', cond, body, line: startTok.line };
  }

  private parseDef(): StmtNode {
    const startTok = this.expect('KEYWORD', 'def');
    const name = this.expect('IDENT', undefined, '預期函式名稱').value;
    this.expect('OP', '(', '函式名稱後方缺少左括號「(」');
    const params: Array<{ name: string; defaultExpr?: ExprNode }> = [];
    while (!(this.peek().type === 'OP' && this.peek().value === ')')) {
      const pName = this.expect('IDENT', undefined, '預期參數名稱').value;
      // Optional type annotation `: int`
      if (this.match('OP', ':')) {
        this.parseExpr();
      }
      let defaultExpr: ExprNode | undefined;
      if (this.match('OP', '=')) {
        defaultExpr = this.parseExpr();
      }
      params.push({ name: pName, defaultExpr });
      if (!this.match('OP', ',')) break;
    }
    this.expect('OP', ')', '函式參數列表缺少右括號「)」');
    // Optional return annotation `-> int`
    if (this.match('OP', '->')) {
      this.parseExpr();
    }
    this.expect('OP', ':', 'def 定義後方缺少冒號「:」');
    const body = this.parseBlock();
    return { kind: 'def', name, params, body, line: startTok.line };
  }

  private parseClass(): StmtNode {
    const startTok = this.expect('KEYWORD', 'class');
    const name = this.expect('IDENT', undefined, '預期類別名稱').value;
    if (this.match('OP', '(')) {
      while (!(this.peek().type === 'OP' && this.peek().value === ')')) {
        this.advance();
      }
      this.expect('OP', ')');
    }
    this.expect('OP', ':', 'class 定義後方缺少冒號「:」');
    const body = this.parseBlock();
    return { kind: 'class', name, body, line: startTok.line };
  }

  private parseReturn(): StmtNode {
    const startTok = this.expect('KEYWORD', 'return');
    let value: ExprNode | undefined;
    if (this.peek().type !== 'NEWLINE' && this.peek().type !== 'EOF' && this.peek().type !== 'DEDENT') {
      value = this.parseTupleOrExpr();
    }
    this.consumeStatementEnd();
    return { kind: 'return', value, line: startTok.line };
  }

  private parseTry(): StmtNode {
    const startTok = this.expect('KEYWORD', 'try');
    this.expect('OP', ':', 'try 後方缺少冒號「:」');
    const body = this.parseBlock();
    const handlers: Array<{ excType?: string; asName?: string; body: StmtNode[] }> = [];

    while (this.peek().type === 'KEYWORD' && this.peek().value === 'except') {
      this.advance();
      let excType: string | undefined;
      let asName: string | undefined;
      if (this.peek().type === 'IDENT') {
        excType = this.advance().value;
        if (this.peek().type === 'KEYWORD' && this.peek().value === 'as') {
          this.advance();
          asName = this.expect('IDENT').value;
        }
      }
      this.expect('OP', ':', 'except 後方缺少冒號「:」');
      handlers.push({ excType, asName, body: this.parseBlock() });
    }

    if (handlers.length === 0) {
      throw new PyRuntimeError('SyntaxError', 'try 區塊必須搭配至少一個 except', startTok.line);
    }
    return { kind: 'try', body, handlers, line: startTok.line };
  }

  private parseTupleOrExpr(): ExprNode {
    const first = this.parseExpr();
    if (this.peek().type === 'OP' && this.peek().value === ',') {
      const items: ExprNode[] = [first];
      while (this.match('OP', ',')) {
        const next = this.peek();
        if (
          next.type === 'NEWLINE' ||
          next.type === 'EOF' ||
          next.type === 'DEDENT' ||
          (next.type === 'OP' && ['=', '+=', '-=', '*=', '/=', '//=', '%='].includes(next.value))
        ) {
          break;
        }
        items.push(this.parseExpr());
      }
      return { kind: 'tuple', items, line: first.line };
    }
    return first;
  }

  parseExpr(): ExprNode {
    if (this.peek().type === 'KEYWORD' && this.peek().value === 'lambda') {
      const lamTok = this.advance();
      const params: Array<{ name: string; defaultExpr?: ExprNode }> = [];
      if (!(this.peek().type === 'OP' && this.peek().value === ':')) {
        while (true) {
          const pName = this.expect('IDENT').value;
          params.push({ name: pName });
          if (!this.match('OP', ',')) break;
        }
      }
      this.expect('OP', ':', 'lambda 表達式缺少冒號「:」');
      const body = this.parseExpr();
      return { kind: 'lambda', params, body, line: lamTok.line };
    }

    const expr = this.parseOr();
    if (this.peek().type === 'KEYWORD' && this.peek().value === 'if') {
      this.advance();
      const cond = this.parseOr();
      this.expect('KEYWORD', 'else', '三元運算式缺少 else');
      const elseBody = this.parseExpr();
      return { kind: 'ternary', body: expr, cond, elseBody, line: expr.line };
    }
    return expr;
  }

  private parseOr(): ExprNode {
    let left = this.parseAnd();
    while (this.peek().type === 'KEYWORD' && this.peek().value === 'or') {
      const op = this.advance().value;
      const right = this.parseAnd();
      left = { kind: 'binary', op, left, right, line: left.line };
    }
    return left;
  }

  private parseAnd(): ExprNode {
    let left = this.parseNot();
    while (this.peek().type === 'KEYWORD' && this.peek().value === 'and') {
      const op = this.advance().value;
      const right = this.parseNot();
      left = { kind: 'binary', op, left, right, line: left.line };
    }
    return left;
  }

  private parseNot(): ExprNode {
    if (this.peek().type === 'KEYWORD' && this.peek().value === 'not') {
      const t = this.advance();
      return { kind: 'unary', op: 'not', expr: this.parseNot(), line: t.line };
    }
    return this.parseCompare();
  }

  private parseCompare(): ExprNode {
    const left = this.parseAdd();
    const ops: Array<{ op: string; right: ExprNode }> = [];

    while (true) {
      const t = this.peek();
      if (t.type === 'OP' && ['==', '!=', '<', '<=', '>', '>='].includes(t.value)) {
        this.advance();
        ops.push({ op: t.value, right: this.parseAdd() });
      } else if (t.type === 'KEYWORD' && t.value === 'in') {
        this.advance();
        ops.push({ op: 'in', right: this.parseAdd() });
      } else if (t.type === 'KEYWORD' && t.value === 'not' && this.peek(1).type === 'KEYWORD' && this.peek(1).value === 'in') {
        this.advance();
        this.advance();
        ops.push({ op: 'not in', right: this.parseAdd() });
      } else if (t.type === 'KEYWORD' && t.value === 'is') {
        this.advance();
        if (this.peek().type === 'KEYWORD' && this.peek().value === 'not') {
          this.advance();
          ops.push({ op: 'is not', right: this.parseAdd() });
        } else {
          ops.push({ op: 'is', right: this.parseAdd() });
        }
      } else {
        break;
      }
    }

    if (ops.length === 0) return left;
    return { kind: 'compare', left, ops, line: left.line };
  }

  private parseAdd(): ExprNode {
    let left = this.parseMul();
    while (this.peek().type === 'OP' && (this.peek().value === '+' || this.peek().value === '-')) {
      const op = this.advance().value;
      const right = this.parseMul();
      left = { kind: 'binary', op, left, right, line: left.line };
    }
    return left;
  }

  private parseMul(): ExprNode {
    let left = this.parseUnary();
    while (this.peek().type === 'OP' && ['*', '/', '//', '%'].includes(this.peek().value)) {
      const op = this.advance().value;
      const right = this.parseUnary();
      left = { kind: 'binary', op, left, right, line: left.line };
    }
    return left;
  }

  private parseUnary(): ExprNode {
    const t = this.peek();
    if (t.type === 'OP' && (t.value === '+' || t.value === '-')) {
      this.advance();
      return { kind: 'unary', op: t.value, expr: this.parseUnary(), line: t.line };
    }
    return this.parsePower();
  }

  private parsePower(): ExprNode {
    const left = this.parsePostfix();
    if (this.peek().type === 'OP' && this.peek().value === '**') {
      this.advance();
      const right = this.parseUnary();
      return { kind: 'binary', op: '**', left, right, line: left.line };
    }
    return left;
  }

  private parsePostfix(): ExprNode {
    let expr = this.parsePrimary();
    while (true) {
      const t = this.peek();
      if (t.type === 'OP' && t.value === '(') {
        this.advance();
        const args: Array<{ name?: string; value: ExprNode }> = [];
        while (!(this.peek().type === 'OP' && this.peek().value === ')')) {
          if (this.peek().type === 'IDENT' && this.peek(1).type === 'OP' && this.peek(1).value === '=') {
            const name = this.advance().value;
            this.advance();
            args.push({ name, value: this.parseExpr() });
          } else {
            args.push({ value: this.parseExpr() });
          }
          if (!this.match('OP', ',')) break;
        }
        this.expect('OP', ')', '函式呼叫缺少右括號「)」');
        expr = { kind: 'call', callee: expr, args, line: t.line };
      } else if (t.type === 'OP' && t.value === '[') {
        this.advance();
        if (this.peek().type === 'OP' && this.peek().value === ':') {
          // Slice starting with :
          this.advance();
          let stop: ExprNode | undefined;
          let step: ExprNode | undefined;
          if (!(this.peek().type === 'OP' && (this.peek().value === ':' || this.peek().value === ']'))) {
            stop = this.parseExpr();
          }
          if (this.match('OP', ':')) {
            if (!(this.peek().type === 'OP' && this.peek().value === ']')) {
              step = this.parseExpr();
            }
          }
          this.expect('OP', ']', '切片缺少右方括號「]」');
          expr = { kind: 'slice', obj: expr, stop, step, line: t.line };
        } else {
          const first = this.parseExpr();
          if (this.match('OP', ':')) {
            let stop: ExprNode | undefined;
            let step: ExprNode | undefined;
            if (!(this.peek().type === 'OP' && (this.peek().value === ':' || this.peek().value === ']'))) {
              stop = this.parseExpr();
            }
            if (this.match('OP', ':')) {
              if (!(this.peek().type === 'OP' && this.peek().value === ']')) {
                step = this.parseExpr();
              }
            }
            this.expect('OP', ']', '切片缺少右方括號「]」');
            expr = { kind: 'slice', obj: expr, start: first, stop, step, line: t.line };
          } else {
            this.expect('OP', ']', '索引存取缺少右方括號「]」');
            expr = { kind: 'index', obj: expr, index: first, line: t.line };
          }
        }
      } else if (t.type === 'OP' && t.value === '.') {
        this.advance();
        const attr = this.expect('IDENT', undefined, '預期屬性或方法名稱').value;
        expr = { kind: 'attr', obj: expr, attr, line: t.line };
      } else {
        break;
      }
    }
    return expr;
  }

  private parsePrimary(): ExprNode {
    const t = this.peek();

    if (t.type === 'NUMBER') {
      this.advance();
      const val = t.value.includes('.') ? parseFloat(t.value) : parseInt(t.value, 10);
      return { kind: 'literal', value: val, line: t.line };
    }

    if (t.type === 'STRING') {
      this.advance();
      return { kind: 'literal', value: t.value, line: t.line };
    }

    if (t.type === 'FSTRING') {
      this.advance();
      return { kind: 'fstring', template: t.value, line: t.line };
    }

    if (t.type === 'KEYWORD') {
      if (t.value === 'True') {
        this.advance();
        return { kind: 'literal', value: true, line: t.line };
      }
      if (t.value === 'False') {
        this.advance();
        return { kind: 'literal', value: false, line: t.line };
      }
      if (t.value === 'None') {
        this.advance();
        return { kind: 'literal', value: null, line: t.line };
      }
    }

    if (t.type === 'IDENT') {
      this.advance();
      return { kind: 'ident', name: t.value, line: t.line };
    }

    if (t.type === 'OP' && t.value === '(') {
      this.advance();
      if (this.match('OP', ')')) {
        return { kind: 'tuple', items: [], line: t.line };
      }
      const first = this.parseExpr();
      if (this.match('OP', ',')) {
        const items: ExprNode[] = [first];
        while (!(this.peek().type === 'OP' && this.peek().value === ')')) {
          items.push(this.parseExpr());
          if (!this.match('OP', ',')) break;
        }
        this.expect('OP', ')', '缺少右括號「)」');
        return { kind: 'tuple', items, line: t.line };
      }
      this.expect('OP', ')', '缺少右括號「)」');
      return first;
    }

    if (t.type === 'OP' && t.value === '[') {
      this.advance();
      if (this.match('OP', ']')) {
        return { kind: 'list', items: [], line: t.line };
      }
      const first = this.parseExpr();
      if (this.peek().type === 'KEYWORD' && this.peek().value === 'for') {
        this.advance();
        const targets: string[] = [this.expect('IDENT').value];
        while (this.match('OP', ',')) {
          targets.push(this.expect('IDENT').value);
        }
        this.expect('KEYWORD', 'in');
        const iter = this.parseOr();
        let cond: ExprNode | undefined;
        if (this.peek().type === 'KEYWORD' && this.peek().value === 'if') {
          this.advance();
          cond = this.parseExpr();
        }
        this.expect('OP', ']', '串列推導式缺少「]」');
        return { kind: 'list_comp', expr: first, targets, iter, cond, line: t.line };
      }
      const items: ExprNode[] = [first];
      while (this.match('OP', ',')) {
        if (this.peek().type === 'OP' && this.peek().value === ']') break;
        items.push(this.parseExpr());
      }
      this.expect('OP', ']', '串列缺少結尾「]」');
      return { kind: 'list', items, line: t.line };
    }

    if (t.type === 'OP' && t.value === '{') {
      this.advance();
      if (this.match('OP', '}')) {
        return { kind: 'dict', entries: [], line: t.line };
      }
      const first = this.parseExpr();
      if (this.match('OP', ':')) {
        const firstVal = this.parseExpr();
        if (this.peek().type === 'KEYWORD' && this.peek().value === 'for') {
          this.advance();
          const targets: string[] = [this.expect('IDENT').value];
          while (this.match('OP', ',')) {
            targets.push(this.expect('IDENT').value);
          }
          this.expect('KEYWORD', 'in');
          const iter = this.parseOr();
          let cond: ExprNode | undefined;
          if (this.peek().type === 'KEYWORD' && this.peek().value === 'if') {
            this.advance();
            cond = this.parseExpr();
          }
          this.expect('OP', '}');
          return { kind: 'dict_comp', keyExpr: first, valExpr: firstVal, targets, iter, cond, line: t.line };
        }
        const entries: Array<{ key: ExprNode; val: ExprNode }> = [{ key: first, val: firstVal }];
        while (this.match('OP', ',')) {
          if (this.peek().type === 'OP' && this.peek().value === '}') break;
          const k = this.parseExpr();
          this.expect('OP', ':', '字典鍵值之間缺少冒號「:」');
          const v = this.parseExpr();
          entries.push({ key: k, val: v });
        }
        this.expect('OP', '}', '字典缺少結尾「}」');
        return { kind: 'dict', entries, line: t.line };
      } else {
        // Set literal
        const items: ExprNode[] = [first];
        while (this.match('OP', ',')) {
          if (this.peek().type === 'OP' && this.peek().value === '}') break;
          items.push(this.parseExpr());
        }
        this.expect('OP', '}', '集合缺少結尾「}」');
        return { kind: 'set', items, line: t.line };
      }
    }

    throw new PyRuntimeError('SyntaxError', `語法錯誤，未預期的記號「${t.value || t.type}」`, t.line);
  }
}

// ==================== RUNTIME / EVALUATOR ====================

class Scope {
  vars: Record<string, PyValue> = {};
  parent: Scope | null;
  constructor(parent: Scope | null = null) {
    this.parent = parent;
  }
  get(name: string): PyValue | undefined {
    if (Object.prototype.hasOwnProperty.call(this.vars, name)) {
      return this.vars[name];
    }
    return this.parent ? this.parent.get(name) : undefined;
  }
  has(name: string): boolean {
    if (Object.prototype.hasOwnProperty.call(this.vars, name)) return true;
    return this.parent ? this.parent.has(name) : false;
  }
  set(name: string, val: PyValue) {
    this.vars[name] = val;
  }
}

interface EvalContext {
  globalScope: Scope;
  output: string;
  stdinLines: string[];
  stdinIdx: number;
  steps: TraceStep[];
  stepCount: number;
  maxSteps: number;
  callStack: Array<{ name: string; line: number; scope: Scope }>;
  recordStep: (line: number, event: TraceStep['event'], annotation: string) => void;
  callFunction: (fn: PyValue, args: PyValue[], kwargs: Record<string, PyValue>, line: number) => PyValue;
}

export function getPyType(v: PyValue): PyType {
  if (v === null) return 'NoneType';
  if (typeof v === 'boolean') return 'bool';
  if (typeof v === 'number') return Number.isInteger(v) ? 'int' : 'float';
  if (typeof v === 'string') return 'str';
  if (typeof v === 'object') {
    if (v.__kind === 'list') return 'list';
    if (v.__kind === 'tuple') return 'tuple';
    if (v.__kind === 'dict') return 'dict';
    if (v.__kind === 'set') return 'set';
    if (v.__kind === 'function' || v.__kind === 'native_function' || v.__kind === 'bound_method') return 'function';
    if (v.__kind === 'class') return 'class';
    if (v.__kind === 'instance') return 'instance';
  }
  return 'NoneType';
}

export function formatPyValue(v: PyValue, repr = false): string {
  if (v === null) return 'None';
  if (typeof v === 'boolean') return v ? 'True' : 'False';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return repr ? `'${v.replace(/'/g, "\\'")}'` : v;
  if (v.__kind === 'list') {
    return `[${v.items.map((x) => formatPyValue(x, true)).join(', ')}]`;
  }
  if (v.__kind === 'tuple') {
    if (v.items.length === 1) return `(${formatPyValue(v.items[0], true)},)`;
    return `(${v.items.map((x) => formatPyValue(x, true)).join(', ')})`;
  }
  if (v.__kind === 'dict') {
    return `{${v.entries.map(([k, val]) => `${formatPyValue(k, true)}: ${formatPyValue(val, true)}`).join(', ')}}`;
  }
  if (v.__kind === 'set') {
    if (v.items.length === 0) return 'set()';
    return `{${v.items.map((x) => formatPyValue(x, true)).join(', ')}}`;
  }
  if (v.__kind === 'function' || v.__kind === 'native_function') {
    return `<function ${v.name}>`;
  }
  if (v.__kind === 'bound_method') {
    return `<bound method ${v.fn.name}>`;
  }
  if (v.__kind === 'class') {
    return `<class '${v.name}'>`;
  }
  if (v.__kind === 'instance') {
    const attrsStr = Object.entries(v.attrs)
      .map(([k, val]) => `${k}=${formatPyValue(val, true)}`)
      .join(', ');
    return `<${v.cls.name}(${attrsStr})>`;
  }
  return String(v);
}

function isTruthy(v: PyValue): boolean {
  if (v === null || v === false) return false;
  if (v === true) return true;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') return v.length > 0;
  if (v.__kind === 'list' || v.__kind === 'tuple' || v.__kind === 'set') return v.items.length > 0;
  if (v.__kind === 'dict') return v.entries.length > 0;
  return true;
}

function pyEquals(a: PyValue, b: PyValue): boolean {
  if (a === b) return true;
  if (typeof a === 'number' && typeof b === 'number') return a === b;
  if (typeof a === 'boolean' && typeof b === 'number') return (a ? 1 : 0) === b;
  if (typeof a === 'number' && typeof b === 'boolean') return a === (b ? 1 : 0);
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
  if (a.__kind !== b.__kind) return false;
  if ((a.__kind === 'list' && b.__kind === 'list') || (a.__kind === 'tuple' && b.__kind === 'tuple')) {
    if (a.items.length !== b.items.length) return false;
    return a.items.every((item, idx) => pyEquals(item, b.items[idx]));
  }
  if (a.__kind === 'dict' && b.__kind === 'dict') {
    if (a.entries.length !== b.entries.length) return false;
    return a.entries.every(([k, v]) => {
      const found = b.entries.find(([bk]) => pyEquals(k, bk));
      return found ? pyEquals(v, found[1]) : false;
    });
  }
  if (a.__kind === 'set' && b.__kind === 'set') {
    if (a.items.length !== b.items.length) return false;
    return a.items.every((item) => b.items.some((bi) => pyEquals(item, bi)));
  }
  return false;
}

function toIterable(v: PyValue, line: number): PyValue[] {
  if (typeof v === 'string') return Array.from(v);
  if (v !== null && typeof v === 'object') {
    if (v.__kind === 'list' || v.__kind === 'tuple' || v.__kind === 'set') return [...v.items];
    if (v.__kind === 'dict') return v.entries.map(([k]) => k);
  }
  throw new PyRuntimeError('TypeError', `型別「${getPyType(v)}」無法進行迭代`, line);
}

function snapshotScope(scope: Scope, excludeBuiltins = true): SerializedVar[] {
  const result: SerializedVar[] = [];
  for (const [name, val] of Object.entries(scope.vars)) {
    if (excludeBuiltins && val !== null && typeof val === 'object' && val.__kind === 'native_function') {
      continue;
    }
    const type = val !== null && typeof val === 'object' && val.__kind === 'instance' ? val.cls.name : getPyType(val);
    result.push({
      name,
      type,
      value: formatPyValue(val, true),
    });
  }
  return result;
}

function createBuiltins(ctx: EvalContext): Record<string, PyValue> {
  const native = (name: string, fn: PyNativeFunction['fn']): PyNativeFunction => ({
    __kind: 'native_function',
    name,
    fn,
  });

  return {
    print: native('print', (args, kwargs) => {
      const sep = typeof kwargs.sep === 'string' ? kwargs.sep : ' ';
      const end = typeof kwargs.end === 'string' ? kwargs.end : '\n';
      const lineOut = args.map((a) => formatPyValue(a, false)).join(sep) + end;
      ctx.output += lineOut;
      return null;
    }),
    input: native('input', (args) => {
      if (args.length > 0) {
        ctx.output += formatPyValue(args[0], false);
      }
      const lineVal = ctx.stdinIdx < ctx.stdinLines.length ? ctx.stdinLines[ctx.stdinIdx++] : '';
      return lineVal;
    }),
    len: native('len', (args) => {
      const v = args[0];
      if (typeof v === 'string') return v.length;
      if (v && typeof v === 'object') {
        if (v.__kind === 'list' || v.__kind === 'tuple' || v.__kind === 'set') return v.items.length;
        if (v.__kind === 'dict') return v.entries.length;
      }
      throw new PyRuntimeError('TypeError', `型別「${getPyType(v)}」不支援 len()`);
    }),
    range: native('range', (args) => {
      let start = 0;
      let stop = 0;
      let step = 1;
      if (args.length === 1) {
        stop = Number(args[0]);
      } else if (args.length === 2) {
        start = Number(args[0]);
        stop = Number(args[1]);
      } else if (args.length === 3) {
        start = Number(args[0]);
        stop = Number(args[1]);
        step = Number(args[2]);
      } else {
        throw new PyRuntimeError('TypeError', 'range() 需要 1 到 3 個整數參數');
      }
      if (step === 0) throw new PyRuntimeError('ValueError', 'range() 的 step 不能為 0');
      const items: PyValue[] = [];
      if (step > 0) {
        for (let i = start; i < stop; i += step) {
          items.push(i);
          if (items.length > 5000) break;
        }
      } else {
        for (let i = start; i > stop; i += step) {
          items.push(i);
          if (items.length > 5000) break;
        }
      }
      return { __kind: 'list', items };
    }),
    type: native('type', (args) => {
      const v = args[0];
      const t = v && typeof v === 'object' && v.__kind === 'instance' ? v.cls.name : getPyType(v);
      return `<class '${t}'>`;
    }),
    int: native('int', (args) => {
      const v = args[0];
      if (typeof v === 'number') return Math.trunc(v);
      if (typeof v === 'boolean') return v ? 1 : 0;
      if (typeof v === 'string') {
        const n = parseInt(v.trim(), 10);
        if (Number.isNaN(n)) throw new PyRuntimeError('ValueError', `無法將 '${v}' 轉換為整數 int`);
        return n;
      }
      throw new PyRuntimeError('TypeError', `無法將 ${getPyType(v)} 轉換為 int`);
    }),
    float: native('float', (args) => {
      const v = args[0];
      if (typeof v === 'number') return v;
      if (typeof v === 'boolean') return v ? 1.0 : 0.0;
      if (typeof v === 'string') {
        const n = parseFloat(v.trim());
        if (Number.isNaN(n)) throw new PyRuntimeError('ValueError', `無法將 '${v}' 轉換為浮點數 float`);
        return n;
      }
      throw new PyRuntimeError('TypeError', `無法將 ${getPyType(v)} 轉換為 float`);
    }),
    str: native('str', (args) => (args.length === 0 ? '' : formatPyValue(args[0], false))),
    bool: native('bool', (args) => (args.length === 0 ? false : isTruthy(args[0]))),
    list: native('list', (args) => ({
      __kind: 'list',
      items: args.length === 0 ? [] : toIterable(args[0], 1),
    })),
    tuple: native('tuple', (args) => ({
      __kind: 'tuple',
      items: args.length === 0 ? [] : toIterable(args[0], 1),
    })),
    set: native('set', (args) => {
      const items: PyValue[] = [];
      if (args.length > 0) {
        for (const item of toIterable(args[0], 1)) {
          if (!items.some((x) => pyEquals(x, item))) items.push(item);
        }
      }
      return { __kind: 'set', items };
    }),
    dict: native('dict', (args) => {
      if (args.length === 0) return { __kind: 'dict', entries: [] };
      const entries: Array<[PyValue, PyValue]> = [];
      for (const item of toIterable(args[0], 1)) {
        if (item && typeof item === 'object' && (item.__kind === 'tuple' || item.__kind === 'list') && item.items.length === 2) {
          entries.push([item.items[0], item.items[1]]);
        }
      }
      return { __kind: 'dict', entries };
    }),
    abs: native('abs', (args) => Math.abs(Number(args[0]))),
    round: native('round', (args) => {
      const num = Number(args[0]);
      const digits = args.length > 1 ? Number(args[1]) : 0;
      const factor = Math.pow(10, digits);
      return Math.round(num * factor) / factor;
    }),
    sum: native('sum', (args) => {
      const items = toIterable(args[0], 1);
      let acc = args.length > 1 ? Number(args[1]) : 0;
      for (const item of items) acc += Number(item);
      return acc;
    }),
    min: native('min', (args) => {
      const items = args.length === 1 ? toIterable(args[0], 1) : args;
      if (items.length === 0) throw new PyRuntimeError('ValueError', 'min() 的參數不可為空');
      return items.reduce((a, b) => (compareValues(b, a, '<', 1) ? b : a));
    }),
    max: native('max', (args) => {
      const items = args.length === 1 ? toIterable(args[0], 1) : args;
      if (items.length === 0) throw new PyRuntimeError('ValueError', 'max() 的參數不可為空');
      return items.reduce((a, b) => (compareValues(b, a, '>', 1) ? b : a));
    }),
    sorted: native('sorted', (args, kwargs) => {
      const items = [...toIterable(args[0], 1)];
      const reverse = Boolean(kwargs.reverse);
      const keyFn = kwargs.key;
      items.sort((a, b) => {
        const ka = keyFn ? ctx.callFunction(keyFn, [a], {}, 1) : a;
        const kb = keyFn ? ctx.callFunction(keyFn, [b], {}, 1) : b;
        if (compareValues(ka, kb, '<', 1)) return reverse ? 1 : -1;
        if (compareValues(ka, kb, '>', 1)) return reverse ? -1 : 1;
        return 0;
      });
      return { __kind: 'list', items };
    }),
    reversed: native('reversed', (args) => ({
      __kind: 'list',
      items: [...toIterable(args[0], 1)].reverse(),
    })),
    enumerate: native('enumerate', (args) => {
      const start = args.length > 1 ? Number(args[1]) : 0;
      const items = toIterable(args[0], 1).map(
        (v, idx): PyTuple => ({ __kind: 'tuple', items: [start + idx, v] })
      );
      return { __kind: 'list', items };
    }),
    zip: native('zip', (args) => {
      if (args.length === 0) return { __kind: 'list', items: [] };
      const lists = args.map((a) => toIterable(a, 1));
      const minLen = Math.min(...lists.map((l) => l.length));
      const items: PyTuple[] = [];
      for (let i = 0; i < minLen; i++) {
        items.push({ __kind: 'tuple', items: lists.map((l) => l[i]) });
      }
      return { __kind: 'list', items };
    }),
    map: native('map', (args) => {
      const fn = args[0];
      const items = toIterable(args[1], 1).map((x) => ctx.callFunction(fn, [x], {}, 1));
      return { __kind: 'list', items };
    }),
    filter: native('filter', (args) => {
      const fn = args[0];
      const items = toIterable(args[1], 1).filter((x) => isTruthy(ctx.callFunction(fn, [x], {}, 1)));
      return { __kind: 'list', items };
    }),
    any: native('any', (args) => toIterable(args[0], 1).some((x) => isTruthy(x))),
    all: native('all', (args) => toIterable(args[0], 1).every((x) => isTruthy(x))),
    isinstance: native('isinstance', (args) => {
      const [obj, cls] = args;
      if (cls && typeof cls === 'object' && cls.__kind === 'class') {
        return obj !== null && typeof obj === 'object' && obj.__kind === 'instance' && obj.cls.name === cls.name;
      }
      return false;
    }),
  };
}

function compareValues(a: PyValue, b: PyValue, op: string, line: number): boolean {
  switch (op) {
    case '==':
      return pyEquals(a, b);
    case '!=':
      return !pyEquals(a, b);
    case 'is':
      return a === b;
    case 'is not':
      return a !== b;
    case 'in':
      return checkIn(a, b, line);
    case 'not in':
      return !checkIn(a, b, line);
    case '<':
    case '<=':
    case '>':
    case '>=': {
      if (typeof a === 'number' && typeof b === 'number') {
        if (op === '<') return a < b;
        if (op === '<=') return a <= b;
        if (op === '>') return a > b;
        return a >= b;
      }
      if (typeof a === 'string' && typeof b === 'string') {
        if (op === '<') return a < b;
        if (op === '<=') return a <= b;
        if (op === '>') return a > b;
        return a >= b;
      }
      throw new PyRuntimeError('TypeError', `型別 ${getPyType(a)} 與 ${getPyType(b)} 無法使用「${op}」比較`, line);
    }
    default:
      return false;
  }
}

function checkIn(needle: PyValue, haystack: PyValue, line: number): boolean {
  if (typeof haystack === 'string') {
    if (typeof needle !== 'string') throw new PyRuntimeError('TypeError', '字串成員檢查需要字串型別', line);
    return haystack.includes(needle);
  }
  if (haystack && typeof haystack === 'object') {
    if (haystack.__kind === 'list' || haystack.__kind === 'tuple' || haystack.__kind === 'set') {
      return haystack.items.some((x) => pyEquals(x, needle));
    }
    if (haystack.__kind === 'dict') {
      return haystack.entries.some(([k]) => pyEquals(k, needle));
    }
  }
  throw new PyRuntimeError('TypeError', `型別「${getPyType(haystack)}」不支援 in 運算子`, line);
}

export function executePython(
  source: string,
  options: { stdin?: string; maxSteps?: number } = {}
): ExecutionResult {
  const startTime = performance.now();
  const globalScope = new Scope(null);
  const ctx: EvalContext = {
    globalScope,
    output: '',
    stdinLines: (options.stdin || '').split('\n'),
    stdinIdx: 0,
    steps: [],
    stepCount: 0,
    maxSteps: options.maxSteps ?? 4000,
    callStack: [],
    recordStep(line, event, annotation) {
      if (this.steps.length < 400) {
        this.steps.push({
          stepIndex: this.steps.length + 1,
          line,
          event,
          annotation,
          outputSoFar: this.output,
          globals: snapshotScope(this.globalScope, true),
          callStack: this.callStack.map((f) => ({
            functionName: f.name,
            line: f.line,
            locals: snapshotScope(f.scope, false),
          })),
        });
      }
    },
    callFunction(fn, args, kwargs, line) {
      return invokeCallable(fn, args, kwargs, line, ctx);
    },
  };

  const builtins = createBuiltins(ctx);
  for (const [k, v] of Object.entries(builtins)) {
    globalScope.set(k, v);
  }

  try {
    const tokens = tokenize(source);
    const parser = new Parser(tokens);
    const ast = parser.parseModule();

    for (const stmt of ast) {
      execStmt(stmt, globalScope, ctx);
    }

    return {
      success: true,
      output: ctx.output,
      error: null,
      steps: ctx.steps,
      finalGlobals: Object.fromEntries(
        Object.entries(globalScope.vars).filter(
          ([, v]) => !(v && typeof v === 'object' && v.__kind === 'native_function')
        )
      ),
      durationMs: Math.round((performance.now() - startTime) * 100) / 100,
    };
  } catch (err) {
    let pyErr: PythonErrorInfo;
    if (err instanceof PyRuntimeError) {
      pyErr = { type: err.pyType, message: err.message, line: err.line };
    } else if (err instanceof ReturnSignal) {
      pyErr = { type: 'SyntaxError', message: 'return 只能出現在函式內部', line: 1 };
    } else if (err instanceof BreakSignal || err instanceof ContinueSignal) {
      pyErr = { type: 'SyntaxError', message: 'break / continue 只能出現在迴圈內部', line: 1 };
    } else {
      pyErr = { type: 'RuntimeError', message: String(err), line: 1 };
    }

    ctx.recordStep(pyErr.line, 'error', `${pyErr.type}: ${pyErr.message}`);

    return {
      success: false,
      output: ctx.output,
      error: pyErr,
      steps: ctx.steps,
      finalGlobals: Object.fromEntries(
        Object.entries(globalScope.vars).filter(
          ([, v]) => !(v && typeof v === 'object' && v.__kind === 'native_function')
        )
      ),
      durationMs: Math.round((performance.now() - startTime) * 100) / 100,
    };
  }
}

function tickStep(line: number, ctx: EvalContext) {
  ctx.stepCount++;
  if (ctx.stepCount > ctx.maxSteps) {
    throw new PyRuntimeError('ExecutionTimeoutError', '程式執行步數超過上限，請檢查是否發生無窮迴圈', line);
  }
}

function execStmt(stmt: StmtNode, scope: Scope, ctx: EvalContext): void {
  tickStep(stmt.line, ctx);

  switch (stmt.kind) {
    case 'pass':
      ctx.recordStep(stmt.line, 'step', '執行 pass（略過此步驟）');
      return;
    case 'break':
      ctx.recordStep(stmt.line, 'step', '執行 break，跳出迴圈');
      throw new BreakSignal();
    case 'continue':
      ctx.recordStep(stmt.line, 'step', '執行 continue，進入下一輪迴圈');
      throw new ContinueSignal();
    case 'return': {
      const val = stmt.value ? evalExpr(stmt.value, scope, ctx) : null;
      ctx.recordStep(stmt.line, 'return', `函式回傳 ${formatPyValue(val, true)}`);
      throw new ReturnSignal(val);
    }
    case 'raise': {
      const val = stmt.expr ? evalExpr(stmt.expr, scope, ctx) : null;
      throw new PyRuntimeError('Exception', val ? formatPyValue(val, false) : '主動拋出例外', stmt.line);
    }
    case 'expr': {
      const prevOutLen = ctx.output.length;
      evalExpr(stmt.expr, scope, ctx);
      if (ctx.output.length > prevOutLen) {
        const added = ctx.output.slice(prevOutLen).trimEnd();
        ctx.recordStep(stmt.line, 'output', `終端輸出：${added}`);
      } else {
        ctx.recordStep(stmt.line, 'step', '執行運算式');
      }
      return;
    }
    case 'assign': {
      const rhsVal = evalExpr(stmt.value, scope, ctx);
      if (stmt.op === '=') {
        assignTarget(stmt.target, rhsVal, scope, ctx, stmt.line);
        const targetLabel = describeTarget(stmt.target);
        ctx.recordStep(stmt.line, 'step', `${targetLabel} 設為 ${formatPyValue(rhsVal, true)}`);
      } else {
        const baseOp = stmt.op.slice(0, -1);
        const curVal = evalTargetValue(stmt.target, scope, ctx, stmt.line);
        const newVal = applyBinaryOp(baseOp, curVal, rhsVal, stmt.line);
        assignTarget(stmt.target, newVal, scope, ctx, stmt.line);
        const targetLabel = describeTarget(stmt.target);
        ctx.recordStep(stmt.line, 'step', `${targetLabel} 更新為 ${formatPyValue(newVal, true)}`);
      }
      return;
    }
    case 'if': {
      for (const br of stmt.branches) {
        const condVal = evalExpr(br.cond, scope, ctx);
        if (isTruthy(condVal)) {
          ctx.recordStep(br.line, 'step', '條件成立，進入對應區塊');
          for (const s of br.body) execStmt(s, scope, ctx);
          return;
        }
      }
      if (stmt.elseBody) {
        ctx.recordStep(stmt.line, 'step', '進入 else 區塊');
        for (const s of stmt.elseBody) execStmt(s, scope, ctx);
      } else {
        ctx.recordStep(stmt.line, 'step', '條件不成立，略過 if 區塊');
      }
      return;
    }
    case 'for': {
      const iterVal = evalExpr(stmt.iter, scope, ctx);
      const items = toIterable(iterVal, stmt.line);
      for (const item of items) {
        assignTarget(stmt.target, item, scope, ctx, stmt.line);
        ctx.recordStep(stmt.line, 'step', `迴圈迭代：${describeTarget(stmt.target)} = ${formatPyValue(item, true)}`);
        try {
          for (const s of stmt.body) execStmt(s, scope, ctx);
        } catch (sig) {
          if (sig instanceof ContinueSignal) continue;
          if (sig instanceof BreakSignal) break;
          throw sig;
        }
      }
      return;
    }
    case 'while': {
      while (true) {
        tickStep(stmt.line, ctx);
        const condVal = evalExpr(stmt.cond, scope, ctx);
        if (!isTruthy(condVal)) {
          ctx.recordStep(stmt.line, 'step', 'while 條件不成立，結束迴圈');
          break;
        }
        ctx.recordStep(stmt.line, 'step', 'while 條件成立，執行迴圈內容');
        try {
          for (const s of stmt.body) execStmt(s, scope, ctx);
        } catch (sig) {
          if (sig instanceof ContinueSignal) continue;
          if (sig instanceof BreakSignal) break;
          throw sig;
        }
      }
      return;
    }
    case 'def': {
      const fn: PyFunction = {
        __kind: 'function',
        name: stmt.name,
        params: stmt.params,
        body: stmt.body,
        closure: scope,
      };
      scope.set(stmt.name, fn);
      ctx.recordStep(stmt.line, 'step', `定義函式 ${stmt.name}()`);
      return;
    }
    case 'class': {
      const methods: Record<string, PyFunction> = {};
      for (const member of stmt.body) {
        if (member.kind === 'def') {
          methods[member.name] = {
            __kind: 'function',
            name: member.name,
            params: member.params,
            body: member.body,
            closure: scope,
          };
        }
      }
      const cls: PyClass = { __kind: 'class', name: stmt.name, methods };
      scope.set(stmt.name, cls);
      ctx.recordStep(stmt.line, 'step', `定義類別 ${stmt.name}`);
      return;
    }
    case 'try': {
      ctx.recordStep(stmt.line, 'step', '進入 try 例外監控區塊');
      try {
        for (const s of stmt.body) execStmt(s, scope, ctx);
      } catch (err) {
        if (err instanceof PyRuntimeError) {
          const handler = stmt.handlers.find(
            (h) => !h.excType || h.excType === 'Exception' || h.excType === err.pyType
          );
          if (handler) {
            if (handler.asName) {
              scope.set(handler.asName, err.message);
            }
            ctx.recordStep(stmt.line, 'step', `捕捉到 ${err.pyType}，執行 except 區塊`);
            for (const s of handler.body) execStmt(s, scope, ctx);
            return;
          }
        }
        throw err;
      }
    }
  }
}

function describeTarget(target: TargetNode): string {
  if (target.kind === 'ident') return target.name;
  if (target.kind === 'tuple') return target.targets.map(describeTarget).join(', ');
  if (target.kind === 'attr') return `物件屬性 .${target.attr}`;
  return '元素';
}

function evalTargetValue(target: TargetNode, scope: Scope, ctx: EvalContext, line: number): PyValue {
  if (target.kind === 'ident') {
    const v = scope.get(target.name);
    if (v === undefined) throw new PyRuntimeError('NameError', `找不到變數「${target.name}」`, line);
    return v;
  }
  if (target.kind === 'index') {
    const obj = evalExpr(target.obj, scope, ctx);
    const idx = evalExpr(target.index, scope, ctx);
    return evalIndexing(obj, idx, line);
  }
  if (target.kind === 'attr') {
    const obj = evalExpr(target.obj, scope, ctx);
    if (obj && typeof obj === 'object' && obj.__kind === 'instance') {
      return obj.attrs[target.attr] ?? null;
    }
  }
  throw new PyRuntimeError('SyntaxError', '無法讀取目標值', line);
}

function assignTarget(target: TargetNode, value: PyValue, scope: Scope, ctx: EvalContext, line: number) {
  if (target.kind === 'ident') {
    scope.set(target.name, value);
    return;
  }
  if (target.kind === 'tuple') {
    const items = toIterable(value, line);
    if (items.length !== target.targets.length) {
      throw new PyRuntimeError('ValueError', `解包數量不符：預期 ${target.targets.length} 個，得到 ${items.length} 個`, line);
    }
    target.targets.forEach((t, i) => assignTarget(t, items[i], scope, ctx, line));
    return;
  }
  if (target.kind === 'index') {
    const obj = evalExpr(target.obj, scope, ctx);
    const idx = evalExpr(target.index, scope, ctx);
    if (obj && typeof obj === 'object') {
      if (obj.__kind === 'list') {
        let i = Number(idx);
        if (i < 0) i += obj.items.length;
        if (i < 0 || i >= obj.items.length) throw new PyRuntimeError('IndexError', '串列索引超出範圍', line);
        obj.items[i] = value;
        return;
      }
      if (obj.__kind === 'dict') {
        const existing = obj.entries.find(([k]) => pyEquals(k, idx));
        if (existing) {
          existing[1] = value;
        } else {
          obj.entries.push([idx, value]);
        }
        return;
      }
    }
    throw new PyRuntimeError('TypeError', `型別「${getPyType(obj)}」不支援索引賦值`, line);
  }
  if (target.kind === 'attr') {
    const obj = evalExpr(target.obj, scope, ctx);
    if (obj && typeof obj === 'object' && obj.__kind === 'instance') {
      obj.attrs[target.attr] = value;
      return;
    }
    throw new PyRuntimeError('AttributeError', '物件不支援屬性賦值', line);
  }
}

function evalExpr(expr: ExprNode, scope: Scope, ctx: EvalContext): PyValue {
  switch (expr.kind) {
    case 'literal':
      return expr.value;
    case 'ident': {
      const v = scope.get(expr.name);
      if (v === undefined) {
        throw new PyRuntimeError('NameError', `名稱「${expr.name}」尚未定義`, expr.line);
      }
      return v;
    }
    case 'fstring':
      return evalFString(expr.template, scope, ctx, expr.line);
    case 'list':
      return { __kind: 'list', items: expr.items.map((i) => evalExpr(i, scope, ctx)) };
    case 'tuple':
      return { __kind: 'tuple', items: expr.items.map((i) => evalExpr(i, scope, ctx)) };
    case 'set': {
      const items: PyValue[] = [];
      for (const node of expr.items) {
        const v = evalExpr(node, scope, ctx);
        if (!items.some((x) => pyEquals(x, v))) items.push(v);
      }
      return { __kind: 'set', items };
    }
    case 'dict': {
      const entries: Array<[PyValue, PyValue]> = [];
      for (const e of expr.entries) {
        const k = evalExpr(e.key, scope, ctx);
        const v = evalExpr(e.val, scope, ctx);
        const existing = entries.find(([ek]) => pyEquals(ek, k));
        if (existing) existing[1] = v;
        else entries.push([k, v]);
      }
      return { __kind: 'dict', entries };
    }
    case 'list_comp': {
      const iterItems = toIterable(evalExpr(expr.iter, scope, ctx), expr.line);
      const result: PyValue[] = [];
      const compScope = new Scope(scope);
      for (const item of iterItems) {
        if (expr.targets.length === 1) {
          compScope.set(expr.targets[0], item);
        } else {
          const unpacked = toIterable(item, expr.line);
          expr.targets.forEach((t, idx) => compScope.set(t, unpacked[idx] ?? null));
        }
        if (!expr.cond || isTruthy(evalExpr(expr.cond, compScope, ctx))) {
          result.push(evalExpr(expr.expr, compScope, ctx));
        }
      }
      return { __kind: 'list', items: result };
    }
    case 'dict_comp': {
      const iterItems = toIterable(evalExpr(expr.iter, scope, ctx), expr.line);
      const entries: Array<[PyValue, PyValue]> = [];
      const compScope = new Scope(scope);
      for (const item of iterItems) {
        if (expr.targets.length === 1) {
          compScope.set(expr.targets[0], item);
        } else {
          const unpacked = toIterable(item, expr.line);
          expr.targets.forEach((t, idx) => compScope.set(t, unpacked[idx] ?? null));
        }
        if (!expr.cond || isTruthy(evalExpr(expr.cond, compScope, ctx))) {
          const k = evalExpr(expr.keyExpr, compScope, ctx);
          const v = evalExpr(expr.valExpr, compScope, ctx);
          entries.push([k, v]);
        }
      }
      return { __kind: 'dict', entries };
    }
    case 'unary': {
      const val = evalExpr(expr.expr, scope, ctx);
      if (expr.op === 'not') return !isTruthy(val);
      if (typeof val === 'number') return expr.op === '-' ? -val : +val;
      throw new PyRuntimeError('TypeError', `型別「${getPyType(val)}」不支援一元運算子 ${expr.op}`, expr.line);
    }
    case 'binary': {
      if (expr.op === 'and') {
        const l = evalExpr(expr.left, scope, ctx);
        return isTruthy(l) ? evalExpr(expr.right, scope, ctx) : l;
      }
      if (expr.op === 'or') {
        const l = evalExpr(expr.left, scope, ctx);
        return isTruthy(l) ? l : evalExpr(expr.right, scope, ctx);
      }
      const l = evalExpr(expr.left, scope, ctx);
      const r = evalExpr(expr.right, scope, ctx);
      return applyBinaryOp(expr.op, l, r, expr.line);
    }
    case 'compare': {
      let cur = evalExpr(expr.left, scope, ctx);
      for (const part of expr.ops) {
        const right = evalExpr(part.right, scope, ctx);
        if (!compareValues(cur, right, part.op, expr.line)) return false;
        cur = right;
      }
      return true;
    }
    case 'ternary': {
      return isTruthy(evalExpr(expr.cond, scope, ctx))
        ? evalExpr(expr.body, scope, ctx)
        : evalExpr(expr.elseBody, scope, ctx);
    }
    case 'lambda':
      return {
        __kind: 'function',
        name: '<lambda>',
        params: expr.params,
        body: [{ kind: 'return', value: expr.body, line: expr.line }],
        closure: scope,
      };
    case 'call': {
      const callee = evalExpr(expr.callee, scope, ctx);
      const posArgs: PyValue[] = [];
      const kwargs: Record<string, PyValue> = {};
      for (const a of expr.args) {
        const val = evalExpr(a.value, scope, ctx);
        if (a.name) kwargs[a.name] = val;
        else posArgs.push(val);
      }
      return invokeCallable(callee, posArgs, kwargs, expr.line, ctx);
    }
    case 'index': {
      const obj = evalExpr(expr.obj, scope, ctx);
      const idx = evalExpr(expr.index, scope, ctx);
      return evalIndexing(obj, idx, expr.line);
    }
    case 'slice': {
      const obj = evalExpr(expr.obj, scope, ctx);
      const start = expr.start ? Number(evalExpr(expr.start, scope, ctx)) : undefined;
      const stop = expr.stop ? Number(evalExpr(expr.stop, scope, ctx)) : undefined;
      const step = expr.step ? Number(evalExpr(expr.step, scope, ctx)) : 1;
      return evalSlice(obj, start, stop, step, expr.line);
    }
    case 'attr': {
      const obj = evalExpr(expr.obj, scope, ctx);
      return evalAttribute(obj, expr.attr, expr.line, ctx);
    }
  }
}

function evalFString(template: string, scope: Scope, ctx: EvalContext, line: number): string {
  let out = '';
  let i = 0;
  while (i < template.length) {
    if (template[i] === '\\' && (template[i + 1] === '{' || template[i + 1] === '}')) {
      out += template[i + 1];
      i += 2;
      continue;
    }
    if (template[i] === '{') {
      if (template[i + 1] === '{') {
        out += '{';
        i += 2;
        continue;
      }
      let depth = 1;
      let j = i + 1;
      while (j < template.length && depth > 0) {
        if (template[j] === '{') depth++;
        else if (template[j] === '}') depth--;
        j++;
      }
      if (depth !== 0) throw new PyRuntimeError('SyntaxError', 'f-string 缺少結尾大括號「}」', line);
      const inner = template.slice(i + 1, j - 1);
      // Split optional format specifier at top-level ':'
      let colonIdx = -1;
      let parenDepth = 0;
      let inQuote: string | null = null;
      for (let k = 0; k < inner.length; k++) {
        const c = inner[k];
        if (inQuote) {
          if (c === inQuote && inner[k - 1] !== '\\') inQuote = null;
        } else {
          if (c === "'" || c === '"') inQuote = c;
          else if ('([{'.includes(c)) parenDepth++;
          else if (')]}'.includes(c)) parenDepth--;
          else if (c === ':' && parenDepth === 0) {
            colonIdx = k;
            break;
          }
        }
      }
      const exprCode = colonIdx >= 0 ? inner.slice(0, colonIdx) : inner;
      const fmtSpec = colonIdx >= 0 ? inner.slice(colonIdx + 1) : '';
      const toks = tokenize(exprCode.trim());
      const parser = new Parser(toks);
      const val = evalExpr(parser.parseExpr(), scope, ctx);
      out += applyFormatSpec(val, fmtSpec);
      i = j;
      continue;
    }
    if (template[i] === '}' && template[i + 1] === '}') {
      out += '}';
      i += 2;
      continue;
    }
    out += template[i];
    i++;
  }
  return out;
}

function applyFormatSpec(val: PyValue, spec: string): string {
  if (!spec) return formatPyValue(val, false);
  const floatMatch = spec.match(/^\.(\d+)f$/);
  if (floatMatch && typeof val === 'number') {
    return val.toFixed(parseInt(floatMatch[1], 10));
  }
  if (spec === ',' && typeof val === 'number') {
    return val.toLocaleString('en-US');
  }
  const padMatch = spec.match(/^([<>^])?(\d+)$/);
  if (padMatch) {
    const align = padMatch[1] || (typeof val === 'number' ? '>' : '<');
    const width = parseInt(padMatch[2], 10);
    const s = formatPyValue(val, false);
    if (s.length >= width) return s;
    const pad = ' '.repeat(width - s.length);
    return align === '>' ? pad + s : s + pad;
  }
  return formatPyValue(val, false);
}

function applyBinaryOp(op: string, l: PyValue, r: PyValue, line: number): PyValue {
  if (op === '+') {
    if (typeof l === 'number' && typeof r === 'number') return l + r;
    if (typeof l === 'string' && typeof r === 'string') return l + r;
    if (l && r && typeof l === 'object' && typeof r === 'object' && l.__kind === 'list' && r.__kind === 'list') {
      return { __kind: 'list', items: [...l.items, ...r.items] };
    }
  }
  if (op === '*') {
    if (typeof l === 'number' && typeof r === 'number') return l * r;
    if (typeof l === 'string' && typeof r === 'number') return l.repeat(Math.max(0, Math.trunc(r)));
    if (typeof l === 'number' && typeof r === 'string') return r.repeat(Math.max(0, Math.trunc(l)));
    if (l && typeof l === 'object' && l.__kind === 'list' && typeof r === 'number') {
      const items: PyValue[] = [];
      for (let i = 0; i < Math.trunc(r); i++) items.push(...l.items);
      return { __kind: 'list', items };
    }
  }
  if (typeof l === 'number' && typeof r === 'number') {
    if (op === '-') return l - r;
    if (op === '/') {
      if (r === 0) throw new PyRuntimeError('ZeroDivisionError', '除數不可為 0', line);
      return l / r;
    }
    if (op === '//') {
      if (r === 0) throw new PyRuntimeError('ZeroDivisionError', '除數不可為 0', line);
      return Math.floor(l / r);
    }
    if (op === '%') {
      if (r === 0) throw new PyRuntimeError('ZeroDivisionError', '除數不可為 0', line);
      return ((l % r) + r) % r;
    }
    if (op === '**') return Math.pow(l, r);
  }
  throw new PyRuntimeError('TypeError', `型別 ${getPyType(l)} 與 ${getPyType(r)} 不支援運算子「${op}」`, line);
}

function evalIndexing(obj: PyValue, idx: PyValue, line: number): PyValue {
  if (typeof obj === 'string') {
    let i = Number(idx);
    if (i < 0) i += obj.length;
    if (i < 0 || i >= obj.length) throw new PyRuntimeError('IndexError', '字串索引超出範圍', line);
    return obj[i];
  }
  if (obj && typeof obj === 'object') {
    if (obj.__kind === 'list' || obj.__kind === 'tuple') {
      let i = Number(idx);
      if (i < 0) i += obj.items.length;
      if (i < 0 || i >= obj.items.length) throw new PyRuntimeError('IndexError', '索引超出範圍', line);
      return obj.items[i];
    }
    if (obj.__kind === 'dict') {
      const found = obj.entries.find(([k]) => pyEquals(k, idx));
      if (!found) throw new PyRuntimeError('KeyError', `字典中找不到鍵 ${formatPyValue(idx, true)}`, line);
      return found[1];
    }
  }
  throw new PyRuntimeError('TypeError', `型別「${getPyType(obj)}」不支援索引存取`, line);
}

function evalSlice(obj: PyValue, start: number | undefined, stop: number | undefined, step: number, line: number): PyValue {
  if (step === 0) throw new PyRuntimeError('ValueError', '切片 step 不可為 0', line);
  const seq = typeof obj === 'string' ? Array.from(obj) : obj && typeof obj === 'object' && (obj.__kind === 'list' || obj.__kind === 'tuple') ? obj.items : null;
  if (!seq) throw new PyRuntimeError('TypeError', `型別「${getPyType(obj)}」不支援切片`, line);

  const len = seq.length;
  let s = start === undefined ? (step > 0 ? 0 : len - 1) : start < 0 ? Math.max(len + start, step > 0 ? 0 : -1) : Math.min(start, step > 0 ? len : len - 1);
  let e = stop === undefined ? (step > 0 ? len : -1) : stop < 0 ? Math.max(len + stop, -1) : Math.min(stop, len);

  const out: PyValue[] = [];
  if (step > 0) {
    for (let i = s; i < e; i += step) out.push(seq[i]);
  } else {
    for (let i = s; i > e; i += step) out.push(seq[i]);
  }
  if (typeof obj === 'string') return out.join('');
  if (obj && typeof obj === 'object' && obj.__kind === 'tuple') return { __kind: 'tuple', items: out };
  return { __kind: 'list', items: out };
}

function evalAttribute(obj: PyValue, attr: string, line: number, ctx: EvalContext): PyValue {
  if (obj && typeof obj === 'object' && obj.__kind === 'instance') {
    if (Object.prototype.hasOwnProperty.call(obj.attrs, attr)) {
      return obj.attrs[attr];
    }
    if (obj.cls.methods[attr]) {
      return { __kind: 'bound_method', self: obj, fn: obj.cls.methods[attr] };
    }
    throw new PyRuntimeError('AttributeError', `'${obj.cls.name}' 物件沒有屬性 '${attr}'`, line);
  }

  const nativeMethod = (fn: PyNativeFunction['fn']): PyBoundMethod => ({
    __kind: 'bound_method',
    self: obj,
    fn: { __kind: 'native_function', name: attr, fn },
    isNativeMethod: true,
  });

  if (typeof obj === 'string') {
    switch (attr) {
      case 'upper': return nativeMethod(() => obj.toUpperCase());
      case 'lower': return nativeMethod(() => obj.toLowerCase());
      case 'title': return nativeMethod(() => obj.replace(/\b\w/g, (c) => c.toUpperCase()));
      case 'strip': return nativeMethod(() => obj.trim());
      case 'lstrip': return nativeMethod(() => obj.trimStart());
      case 'rstrip': return nativeMethod(() => obj.trimEnd());
      case 'split': return nativeMethod((args) => {
        const sep = args.length > 0 && args[0] !== null ? String(args[0]) : undefined;
        const parts = sep === undefined ? obj.trim().split(/\s+/).filter(Boolean) : obj.split(sep);
        return { __kind: 'list', items: parts };
      });
      case 'join': return nativeMethod((args) => {
        const items = toIterable(args[0], line).map((x) => formatPyValue(x, false));
        return items.join(obj);
      });
      case 'replace': return nativeMethod((args) => obj.split(String(args[0])).join(String(args[1])));
      case 'find': return nativeMethod((args) => obj.indexOf(String(args[0])));
      case 'count': return nativeMethod((args) => obj.split(String(args[0])).length - 1);
      case 'startswith': return nativeMethod((args) => obj.startsWith(String(args[0])));
      case 'endswith': return nativeMethod((args) => obj.endsWith(String(args[0])));
      case 'isdigit': return nativeMethod(() => /^\d+$/.test(obj));
      case 'isalpha': return nativeMethod(() => /^[A-Za-z]+$/.test(obj));
    }
  }

  if (obj && typeof obj === 'object' && obj.__kind === 'list') {
    switch (attr) {
      case 'append': return nativeMethod((args) => { obj.items.push(args[0]); return null; });
      case 'extend': return nativeMethod((args) => { obj.items.push(...toIterable(args[0], line)); return null; });
      case 'insert': return nativeMethod((args) => {
        const idx = Math.max(0, Number(args[0]));
        obj.items.splice(idx, 0, args[1]);
        return null;
      });
      case 'pop': return nativeMethod((args) => {
        if (obj.items.length === 0) throw new PyRuntimeError('IndexError', '無法從空串列 pop()', line);
        if (args.length === 0) return obj.items.pop()!;
        let idx = Number(args[0]);
        if (idx < 0) idx += obj.items.length;
        return obj.items.splice(idx, 1)[0];
      });
      case 'remove': return nativeMethod((args) => {
        const idx = obj.items.findIndex((x) => pyEquals(x, args[0]));
        if (idx === -1) throw new PyRuntimeError('ValueError', '串列中找不到指定元素', line);
        obj.items.splice(idx, 1);
        return null;
      });
      case 'clear': return nativeMethod(() => { obj.items.length = 0; return null; });
      case 'index': return nativeMethod((args) => {
        const idx = obj.items.findIndex((x) => pyEquals(x, args[0]));
        if (idx === -1) throw new PyRuntimeError('ValueError', '串列中找不到指定元素', line);
        return idx;
      });
      case 'count': return nativeMethod((args) => obj.items.filter((x) => pyEquals(x, args[0])).length);
      case 'sort': return nativeMethod((_args, kwargs) => {
        const reverse = Boolean(kwargs.reverse);
        const keyFn = kwargs.key;
        obj.items.sort((a, b) => {
          const ka = keyFn ? ctx.callFunction(keyFn, [a], {}, line) : a;
          const kb = keyFn ? ctx.callFunction(keyFn, [b], {}, line) : b;
          if (compareValues(ka, kb, '<', line)) return reverse ? 1 : -1;
          if (compareValues(ka, kb, '>', line)) return reverse ? -1 : 1;
          return 0;
        });
        return null;
      });
      case 'reverse': return nativeMethod(() => { obj.items.reverse(); return null; });
      case 'copy': return nativeMethod(() => ({ __kind: 'list', items: [...obj.items] }));
    }
  }

  if (obj && typeof obj === 'object' && obj.__kind === 'dict') {
    switch (attr) {
      case 'keys': return nativeMethod(() => ({ __kind: 'list', items: obj.entries.map(([k]) => k) }));
      case 'values': return nativeMethod(() => ({ __kind: 'list', items: obj.entries.map(([, v]) => v) }));
      case 'items': return nativeMethod(() => ({
        __kind: 'list',
        items: obj.entries.map(([k, v]): PyTuple => ({ __kind: 'tuple', items: [k, v] })),
      }));
      case 'get': return nativeMethod((args) => {
        const found = obj.entries.find(([k]) => pyEquals(k, args[0]));
        return found ? found[1] : args.length > 1 ? args[1] : null;
      });
      case 'pop': return nativeMethod((args) => {
        const idx = obj.entries.findIndex(([k]) => pyEquals(k, args[0]));
        if (idx === -1) {
          if (args.length > 1) return args[1];
          throw new PyRuntimeError('KeyError', `字典中找不到鍵 ${formatPyValue(args[0], true)}`, line);
        }
        return obj.entries.splice(idx, 1)[0][1];
      });
      case 'update': return nativeMethod((args) => {
        const other = args[0];
        if (other && typeof other === 'object' && other.__kind === 'dict') {
          for (const [k, v] of other.entries) {
            const ex = obj.entries.find(([ek]) => pyEquals(ek, k));
            if (ex) ex[1] = v;
            else obj.entries.push([k, v]);
          }
        }
        return null;
      });
      case 'clear': return nativeMethod(() => { obj.entries.length = 0; return null; });
    }
  }

  if (obj && typeof obj === 'object' && obj.__kind === 'set') {
    switch (attr) {
      case 'add': return nativeMethod((args) => {
        if (!obj.items.some((x) => pyEquals(x, args[0]))) obj.items.push(args[0]);
        return null;
      });
      case 'remove': return nativeMethod((args) => {
        const idx = obj.items.findIndex((x) => pyEquals(x, args[0]));
        if (idx === -1) throw new PyRuntimeError('KeyError', '集合中找不到指定元素', line);
        obj.items.splice(idx, 1);
        return null;
      });
      case 'discard': return nativeMethod((args) => {
        const idx = obj.items.findIndex((x) => pyEquals(x, args[0]));
        if (idx !== -1) obj.items.splice(idx, 1);
        return null;
      });
      case 'union': return nativeMethod((args) => {
        const items = [...obj.items];
        for (const x of toIterable(args[0], line)) {
          if (!items.some((i) => pyEquals(i, x))) items.push(x);
        }
        return { __kind: 'set', items };
      });
      case 'intersection': return nativeMethod((args) => {
        const other = toIterable(args[0], line);
        return {
          __kind: 'set',
          items: obj.items.filter((x) => other.some((y) => pyEquals(x, y))),
        };
      });
    }
  }

  throw new PyRuntimeError('AttributeError', `型別「${getPyType(obj)}」沒有屬性或方法 '${attr}'`, line);
}

function invokeCallable(
  callee: PyValue,
  posArgs: PyValue[],
  kwargs: Record<string, PyValue>,
  line: number,
  ctx: EvalContext
): PyValue {
  if (!callee || typeof callee !== 'object') {
    throw new PyRuntimeError('TypeError', `型別「${getPyType(callee)}」無法作為函式呼叫`, line);
  }

  if (callee.__kind === 'native_function') {
    return callee.fn(posArgs, kwargs, ctx);
  }

  if (callee.__kind === 'bound_method') {
    if (callee.isNativeMethod && callee.fn.__kind === 'native_function') {
      return callee.fn.fn(posArgs, kwargs, ctx);
    }
    return invokeCallable(callee.fn, [callee.self, ...posArgs], kwargs, line, ctx);
  }

  if (callee.__kind === 'class') {
    const inst: PyInstance = { __kind: 'instance', cls: callee, attrs: {} };
    if (callee.methods.__init__) {
      invokeCallable(callee.methods.__init__, [inst, ...posArgs], kwargs, line, ctx);
    }
    return inst;
  }

  if (callee.__kind === 'function') {
    if (ctx.callStack.length > 60) {
      throw new PyRuntimeError('RecursionError', '遞迴呼叫深度超過上限', line);
    }
    const fnScope = new Scope(callee.closure);
    callee.params.forEach((p, idx) => {
      if (idx < posArgs.length) {
        fnScope.set(p.name, posArgs[idx]);
      } else if (Object.prototype.hasOwnProperty.call(kwargs, p.name)) {
        fnScope.set(p.name, kwargs[p.name]);
      } else if (p.defaultExpr) {
        fnScope.set(p.name, evalExpr(p.defaultExpr, callee.closure, ctx));
      } else {
        throw new PyRuntimeError('TypeError', `函式 ${callee.name}() 缺少必要參數 '${p.name}'`, line);
      }
    });

    ctx.callStack.push({ name: callee.name, line, scope: fnScope });
    if (callee.name !== '<lambda>') {
      ctx.recordStep(line, 'call', `進入函式 ${callee.name}()`);
    }

    try {
      for (const s of callee.body) {
        execStmt(s, fnScope, ctx);
      }
      ctx.callStack.pop();
      return null;
    } catch (sig) {
      ctx.callStack.pop();
      if (sig instanceof ReturnSignal) {
        return sig.value;
      }
      throw sig;
    }
  }

  throw new PyRuntimeError('TypeError', '目標不可呼叫', line);
}
