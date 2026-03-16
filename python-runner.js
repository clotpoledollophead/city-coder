// ═══════════════════════════════════════════════════════════════
//  python-runner.js  —  CodeScape Python Interpreter
//
//  A proper recursive interpreter supporting:
//    • Variables, arithmetic, string ops, comparisons, boolean logic
//    • if / elif / else
//    • for i in range(...) and for x in list
//    • while loops with break / continue
//    • def / return (including nested calls)
//    • Lists, dicts, len(), str(), int(), float(), print()
//    • enumerate(), range(), append(), items()
//    • All city build_xxx() functions
//    • Safety: max-step watchdog to prevent infinite loops
// ═══════════════════════════════════════════════════════════════

window.PythonRunner = (function () {

    const BUILD_FNS = new Set([
        'build_house', 'build_park', 'build_library', 'build_school',
        'build_hospital', 'build_shop', 'build_road', 'build_power_tower',
        'build_fountain', 'build_streetlight', 'clear_all'
    ]);

    const MAX_STEPS = 5000; // guard against infinite loops

    // ═══════════════════════════════════════════════════════
    //  TOKENISER
    // ═══════════════════════════════════════════════════════
    function tokenise(src) {
        const tokens = [];
        let i = 0;
        const len = src.length;

        while (i < len) {
            // Newline
            if (src[i] === '\n') { tokens.push({ type: 'NL' }); i++; continue; }
            // Carriage return
            if (src[i] === '\r') { i++; continue; }
            // Spaces / tabs — count for INDENT on first non-blank of line
            if (src[i] === ' ' || src[i] === '\t') { i++; continue; }
            // Comment
            if (src[i] === '#') { while (i < len && src[i] !== '\n') i++; continue; }

            // String literals
            if (src[i] === '"' || src[i] === "'") {
                const q = src[i];
                // Triple-quote check
                if (src.slice(i, i + 3) === q + q + q) {
                    i += 3;
                    let s = '';
                    while (i < len && src.slice(i, i + 3) !== q + q + q) {
                        if (src[i] === '\\') { s += unescapeChar(src[i + 1]); i += 2; }
                        else s += src[i++];
                    }
                    i += 3;
                    tokens.push({ type: 'STR', value: s }); continue;
                }
                i++;
                let s = '';
                while (i < len && src[i] !== q && src[i] !== '\n') {
                    if (src[i] === '\\') { s += unescapeChar(src[i + 1]); i += 2; }
                    else s += src[i++];
                }
                if (src[i] === q) i++;
                tokens.push({ type: 'STR', value: s }); continue;
            }

            // Numbers
            if (/[0-9]/.test(src[i]) || (src[i] === '-' && /[0-9]/.test(src[i + 1]) && (tokens.length === 0 || ['OP', 'NL', 'COLON', 'COMMA', 'LPAREN', 'LBRACKET', 'LBRACE'].includes(tokens[tokens.length - 1]?.type)))) {
                let n = '';
                if (src[i] === '-') n += src[i++];
                while (i < len && /[0-9.]/.test(src[i])) n += src[i++];
                tokens.push({ type: 'NUM', value: parseFloat(n) }); continue;
            }

            // Identifiers / keywords
            if (/[a-zA-Z_]/.test(src[i])) {
                let id = '';
                while (i < len && /[a-zA-Z0-9_]/.test(src[i])) id += src[i++];
                const KW = new Set(['if', 'elif', 'else', 'for', 'while', 'in', 'not', 'and', 'or',
                    'def', 'return', 'break', 'continue', 'pass', 'True', 'False', 'None', 'is']);
                if (KW.has(id)) tokens.push({ type: 'KW', value: id });
                else tokens.push({ type: 'ID', value: id });
                continue;
            }

            // Two-char operators
            const two = src.slice(i, i + 2);
            if (['==', '!=', '<=', '>=', '**', '//', '+=', '-=', '*=', '/=', '%='].includes(two)) {
                tokens.push({ type: 'OP', value: two }); i += 2; continue;
            }

            // Single-char
            const ch = src[i++];
            if ('+-*/%<>=!'.includes(ch)) { tokens.push({ type: 'OP', value: ch }); continue; }
            if (ch === '(') { tokens.push({ type: 'LPAREN' }); continue; }
            if (ch === ')') { tokens.push({ type: 'RPAREN' }); continue; }
            if (ch === '[') { tokens.push({ type: 'LBRACKET' }); continue; }
            if (ch === ']') { tokens.push({ type: 'RBRACKET' }); continue; }
            if (ch === '{') { tokens.push({ type: 'LBRACE' }); continue; }
            if (ch === '}') { tokens.push({ type: 'RBRACE' }); continue; }
            if (ch === ':') { tokens.push({ type: 'COLON' }); continue; }
            if (ch === ',') { tokens.push({ type: 'COMMA' }); continue; }
            if (ch === '.') { tokens.push({ type: 'DOT' }); continue; }
            // Unknown — skip
        }
        tokens.push({ type: 'EOF' });
        return tokens;
    }

    function unescapeChar(c) {
        const map = { n: '\n', t: '\t', r: '\r', '\\': '\\', "'": "'", '"': '"' };
        return map[c] ?? c;
    }

    // ═══════════════════════════════════════════════════════
    //  PARSER  →  AST
    // ═══════════════════════════════════════════════════════
    // We parse line-by-line with indentation tracking.
    // Returns an array of statement nodes.

    function parse(src) {
        // Pre-process: add INDENT / DEDENT tokens
        const lines = src.split('\n');
        const stmts = parseLines(lines, 0, lines.length, 0);
        return stmts;
    }

    function getIndent(line) {
        let n = 0;
        for (const c of line) {
            if (c === ' ') n++;
            else if (c === '\t') n += 4;
            else break;
        }
        return n;
    }

    function isBlankOrComment(line) {
        return /^\s*(#.*)?$/.test(line);
    }

    // Parse a block of lines from startLine to endLine (exclusive)
    // at expectedIndent level. Returns array of AST nodes.
    function parseLines(lines, startLine, endLine, baseIndent) {
        const stmts = [];
        let i = startLine;

        while (i < endLine) {
            if (isBlankOrComment(lines[i])) { i++; continue; }
            const indent = getIndent(lines[i]);
            if (indent < baseIndent) break; // dedent out of block
            if (indent > baseIndent) { i++; continue; } // unexpected indent — skip

            const line = lines[i].trim();
            const lineNum = i + 1;

            // ── if / elif / else ──────────────────────────────
            if (/^if\s+/.test(line) || /^elif\s+/.test(line)) {
                const chains = [];
                let j = i;
                while (j < endLine) {
                    if (isBlankOrComment(lines[j])) { j++; continue; }
                    const jIndent = getIndent(lines[j]);
                    if (jIndent !== baseIndent) break;
                    const jLine = lines[j].trim();
                    if (/^if\s+/.test(jLine) || (/^elif\s+/.test(jLine) && chains.length > 0)) {
                        const condStr = jLine.replace(/^(if|elif)\s+/, '').replace(/:$/, '').trim();
                        const condTokens = tokenise(condStr);
                        const cond = parseExpr(condTokens, { pos: 0 });
                        // find the body block
                        j++;
                        const blockStart = j;
                        while (j < endLine && (isBlankOrComment(lines[j]) || getIndent(lines[j]) > baseIndent)) j++;
                        const body = parseLines(lines, blockStart, j, baseIndent + 1 === baseIndent ? baseIndent + 4 : findBodyIndent(lines, blockStart, endLine, baseIndent));
                        chains.push({ cond, body });
                    } else if (/^else\s*:/.test(jLine) && chains.length > 0) {
                        j++;
                        const blockStart = j;
                        while (j < endLine && (isBlankOrComment(lines[j]) || getIndent(lines[j]) > baseIndent)) j++;
                        const body = parseLines(lines, blockStart, j, findBodyIndent(lines, blockStart, endLine, baseIndent));
                        chains.push({ cond: null, body }); // else
                        break;
                    } else {
                        break;
                    }
                }
                stmts.push({ type: 'IfChain', chains, lineNum });
                i = j;
                continue;
            }

            if (/^else\s*:/.test(line)) { i++; continue; } // orphan else — skip

            // ── for ──────────────────────────────────────────
            if (/^for\s+/.test(line)) {
                // for VAR in EXPR: or for VAR, VAR in EXPR:
                const m = line.match(/^for\s+(.+?)\s+in\s+(.+?)\s*:$/);
                if (m) {
                    const varPart = m[1].trim();
                    const iterStr = m[2].trim();
                    const iterTokens = tokenise(iterStr);
                    const iter = parseExpr(iterTokens, { pos: 0 });
                    const vars = varPart.split(',').map(v => v.trim());
                    i++;
                    const blockStart = i;
                    const bi = findBodyIndent(lines, i, endLine, baseIndent);
                    while (i < endLine && (isBlankOrComment(lines[i]) || getIndent(lines[i]) >= bi)) i++;
                    const body = parseLines(lines, blockStart, i, bi);
                    stmts.push({ type: 'For', vars, iter, body, lineNum });
                } else {
                    stmts.push({ type: 'Error', msg: `語法錯誤：for 語句格式不正確 — "${line}"`, lineNum });
                    i++;
                }
                continue;
            }

            // ── while ─────────────────────────────────────────
            if (/^while\s+/.test(line)) {
                const condStr = line.replace(/^while\s+/, '').replace(/:$/, '').trim();
                const condTokens = tokenise(condStr);
                const cond = parseExpr(condTokens, { pos: 0 });
                i++;
                const blockStart = i;
                const bi = findBodyIndent(lines, i, endLine, baseIndent);
                while (i < endLine && (isBlankOrComment(lines[i]) || getIndent(lines[i]) >= bi)) i++;
                const body = parseLines(lines, blockStart, i, bi);
                stmts.push({ type: 'While', cond, body, lineNum });
                continue;
            }

            // ── def ───────────────────────────────────────────
            if (/^def\s+/.test(line)) {
                const m = line.match(/^def\s+(\w+)\s*\(([^)]*)\)\s*:$/);
                if (m) {
                    const name = m[1];
                    const paramStr = m[2].trim();
                    const params = paramStr ? paramStr.split(',').map(p => {
                        const parts = p.trim().split('=');
                        return { name: parts[0].trim(), default: parts[1] ? tokenise(parts[1].trim()) : null };
                    }) : [];
                    i++;
                    const blockStart = i;
                    const bi = findBodyIndent(lines, i, endLine, baseIndent);
                    while (i < endLine && (isBlankOrComment(lines[i]) || getIndent(lines[i]) >= bi)) i++;
                    const body = parseLines(lines, blockStart, i, bi);
                    stmts.push({ type: 'FuncDef', name, params, body, lineNum });
                } else {
                    stmts.push({ type: 'Error', msg: `語法錯誤：def 格式不正確 — "${line}"`, lineNum });
                    i++;
                }
                continue;
            }

            // ── return ────────────────────────────────────────
            if (/^return(\s|$)/.test(line)) {
                const expr = line.replace(/^return\s*/, '').trim();
                if (expr) {
                    const t = tokenise(expr);
                    stmts.push({ type: 'Return', value: parseExpr(t, { pos: 0 }), lineNum });
                } else {
                    stmts.push({ type: 'Return', value: null, lineNum });
                }
                i++; continue;
            }

            // ── break / continue / pass ───────────────────────
            if (line === 'break') { stmts.push({ type: 'Break', lineNum }); i++; continue; }
            if (line === 'continue') { stmts.push({ type: 'Continue', lineNum }); i++; continue; }
            if (line === 'pass') { i++; continue; }

            // ── Assignment or expression statement ────────────
            // Augmented assignment: x += expr
            const augMatch = line.match(/^(\w+(?:\[.+?\])?)\s*(\+=|-=|\*=|\/=|%=)\s*(.+)$/);
            if (augMatch) {
                const [, lhsStr, op, rhsStr] = augMatch;
                const lhsT = tokenise(lhsStr); const rhsT = tokenise(rhsStr);
                stmts.push({ type: 'AugAssign', lhs: parseExpr(lhsT, { pos: 0 }), op: op[0], rhs: parseExpr(rhsT, { pos: 0 }), lineNum });
                i++; continue;
            }

            // Regular assignment: target = expr (handle a, b = expr too)
            // Find = not preceded by <>=!
            const eqIdx = findAssignmentEq(line);
            if (eqIdx !== -1) {
                const lhsStr = line.slice(0, eqIdx).trim();
                const rhsStr = line.slice(eqIdx + 1).trim();
                const rhsT = tokenise(rhsStr);
                const rhs = parseExpr(rhsT, { pos: 0 });
                // Tuple unpack: a, b = ...
                if (lhsStr.includes(',')) {
                    const names = lhsStr.split(',').map(s => s.trim());
                    stmts.push({ type: 'TupleAssign', names, rhs, lineNum });
                } else {
                    const lhsT = tokenise(lhsStr);
                    stmts.push({ type: 'Assign', lhs: parseExpr(lhsT, { pos: 0 }), rhs, lineNum });
                }
                i++; continue;
            }

            // Expression statement (function call, etc.)
            const t = tokenise(line);
            stmts.push({ type: 'ExprStmt', expr: parseExpr(t, { pos: 0 }), lineNum });
            i++;
        }
        return stmts;
    }

    function findBodyIndent(lines, start, end, baseIndent) {
        for (let i = start; i < end; i++) {
            if (!isBlankOrComment(lines[i])) {
                const ind = getIndent(lines[i]);
                if (ind > baseIndent) return ind;
            }
        }
        return baseIndent + 4;
    }

    function findAssignmentEq(line) {
        // Find standalone = (not ==, !=, <=, >=)
        let depth = 0;
        for (let i = 0; i < line.length; i++) {
            const c = line[i];
            if ('([{'.includes(c)) depth++;
            else if (')]}'.includes(c)) depth--;
            else if (depth === 0 && c === '=') {
                const prev = line[i - 1] || '';
                const next = line[i + 1] || '';
                if (!'<>=!+-*/'.includes(prev) && next !== '=') return i;
            }
        }
        return -1;
    }

    // ─── Expression parser (recursive descent / Pratt) ────────
    function parseExpr(tokens, state) {
        return parseOr(tokens, state);
    }

    function parseOr(tokens, state) {
        let left = parseAnd(tokens, state);
        while (peek(tokens, state)?.type === 'KW' && peek(tokens, state)?.value === 'or') {
            advance(tokens, state);
            const right = parseAnd(tokens, state);
            left = { type: 'BinOp', op: 'or', left, right };
        }
        return left;
    }

    function parseAnd(tokens, state) {
        let left = parseNot(tokens, state);
        while (peek(tokens, state)?.type === 'KW' && peek(tokens, state)?.value === 'and') {
            advance(tokens, state);
            const right = parseNot(tokens, state);
            left = { type: 'BinOp', op: 'and', left, right };
        }
        return left;
    }

    function parseNot(tokens, state) {
        if (peek(tokens, state)?.type === 'KW' && peek(tokens, state)?.value === 'not') {
            advance(tokens, state);
            return { type: 'UnaryOp', op: 'not', operand: parseNot(tokens, state) };
        }
        return parseComparison(tokens, state);
    }

    function parseComparison(tokens, state) {
        let left = parseAddSub(tokens, state);
        const cmpOps = new Set(['==', '!=', '<', '>', '<=', '>=', 'in', 'not in', 'is', 'is not']);
        while (true) {
            const t = peek(tokens, state);
            let op = null;
            if (t?.type === 'OP' && cmpOps.has(t.value)) {
                op = t.value; advance(tokens, state);
            } else if (t?.type === 'KW' && t.value === 'in') {
                op = 'in'; advance(tokens, state);
            } else if (t?.type === 'KW' && t.value === 'not') {
                const t2 = tokens[state.pos + 1];
                if (t2?.type === 'KW' && t2.value === 'in') {
                    advance(tokens, state); advance(tokens, state); op = 'not in';
                } else break;
            } else if (t?.type === 'KW' && t.value === 'is') {
                advance(tokens, state);
                const t2 = peek(tokens, state);
                if (t2?.type === 'KW' && t2.value === 'not') { advance(tokens, state); op = 'is not'; }
                else op = 'is';
            } else break;
            const right = parseAddSub(tokens, state);
            left = { type: 'BinOp', op, left, right };
        }
        return left;
    }

    function parseAddSub(tokens, state) {
        let left = parseMulDiv(tokens, state);
        while (peek(tokens, state)?.type === 'OP' && '+-'.includes(peek(tokens, state).value) && peek(tokens, state).value.length === 1) {
            const op = advance(tokens, state).value;
            const right = parseMulDiv(tokens, state);
            left = { type: 'BinOp', op, left, right };
        }
        return left;
    }

    function parseMulDiv(tokens, state) {
        let left = parseUnary(tokens, state);
        while (peek(tokens, state)?.type === 'OP' && ['*', '/', '//', '%', '**'].includes(peek(tokens, state).value)) {
            const op = advance(tokens, state).value;
            const right = parseUnary(tokens, state);
            left = { type: 'BinOp', op, left, right };
        }
        return left;
    }

    function parseUnary(tokens, state) {
        const t = peek(tokens, state);
        if (t?.type === 'OP' && t.value === '-') {
            advance(tokens, state);
            return { type: 'UnaryOp', op: '-', operand: parseUnary(tokens, state) };
        }
        if (t?.type === 'OP' && t.value === '+') {
            advance(tokens, state);
            return parseUnary(tokens, state);
        }
        return parsePostfix(tokens, state);
    }

    function parsePostfix(tokens, state) {
        let node = parsePrimary(tokens, state);
        while (true) {
            const t = peek(tokens, state);
            if (t?.type === 'LBRACKET') {
                advance(tokens, state);
                const idx = parseExpr(tokens, state);
                expect(tokens, state, 'RBRACKET');
                node = { type: 'Index', obj: node, idx };
            } else if (t?.type === 'DOT') {
                advance(tokens, state);
                const attr = advance(tokens, state).value;
                if (peek(tokens, state)?.type === 'LPAREN') {
                    advance(tokens, state);
                    const args = parseArgList(tokens, state);
                    expect(tokens, state, 'RPAREN');
                    node = { type: 'MethodCall', obj: node, method: attr, args };
                } else {
                    node = { type: 'Attr', obj: node, attr };
                }
            } else if (t?.type === 'LPAREN') {
                advance(tokens, state);
                const args = parseArgList(tokens, state);
                expect(tokens, state, 'RPAREN');
                node = { type: 'Call', callee: node, args };
            } else break;
        }
        return node;
    }

    function parseArgList(tokens, state) {
        const args = [];
        while (peek(tokens, state)?.type !== 'RPAREN' && peek(tokens, state)?.type !== 'EOF') {
            // keyword arg
            if (peek(tokens, state)?.type === 'ID' && tokens[state.pos + 1]?.type === 'OP' && tokens[state.pos + 1]?.value === '=') {
                const key = advance(tokens, state).value;
                advance(tokens, state); // =
                const val = parseExpr(tokens, state);
                args.push({ type: 'KwArg', key, value: val });
            } else {
                args.push(parseExpr(tokens, state));
            }
            if (peek(tokens, state)?.type === 'COMMA') advance(tokens, state);
            else break;
        }
        return args;
    }

    function parsePrimary(tokens, state) {
        const t = peek(tokens, state);
        if (!t || t.type === 'EOF') return { type: 'Literal', value: null };

        if (t.type === 'NUM') { advance(tokens, state); return { type: 'Literal', value: t.value }; }
        if (t.type === 'STR') { advance(tokens, state); return { type: 'Literal', value: t.value }; }
        if (t.type === 'KW' && t.value === 'True') { advance(tokens, state); return { type: 'Literal', value: true }; }
        if (t.type === 'KW' && t.value === 'False') { advance(tokens, state); return { type: 'Literal', value: false }; }
        if (t.type === 'KW' && t.value === 'None') { advance(tokens, state); return { type: 'Literal', value: null }; }

        if (t.type === 'ID') {
            advance(tokens, state);
            return { type: 'Name', name: t.value };
        }

        if (t.type === 'LPAREN') {
            advance(tokens, state);
            if (peek(tokens, state)?.type === 'RPAREN') { advance(tokens, state); return { type: 'Literal', value: [] }; }
            const expr = parseExpr(tokens, state);
            // Tuple check
            if (peek(tokens, state)?.type === 'COMMA') {
                const items = [expr];
                while (peek(tokens, state)?.type === 'COMMA') {
                    advance(tokens, state);
                    if (peek(tokens, state)?.type === 'RPAREN') break;
                    items.push(parseExpr(tokens, state));
                }
                expect(tokens, state, 'RPAREN');
                return { type: 'Tuple', items };
            }
            expect(tokens, state, 'RPAREN');
            return expr;
        }

        if (t.type === 'LBRACKET') {
            advance(tokens, state);
            const items = [];
            while (peek(tokens, state)?.type !== 'RBRACKET' && peek(tokens, state)?.type !== 'EOF') {
                items.push(parseExpr(tokens, state));
                if (peek(tokens, state)?.type === 'COMMA') advance(tokens, state);
                else break;
            }
            expect(tokens, state, 'RBRACKET');
            return { type: 'List', items };
        }

        if (t.type === 'LBRACE') {
            advance(tokens, state);
            const pairs = [];
            while (peek(tokens, state)?.type !== 'RBRACE' && peek(tokens, state)?.type !== 'EOF') {
                const key = parseExpr(tokens, state);
                expect(tokens, state, 'COLON');
                const val = parseExpr(tokens, state);
                pairs.push({ key, val });
                if (peek(tokens, state)?.type === 'COMMA') advance(tokens, state);
                else break;
            }
            expect(tokens, state, 'RBRACE');
            return { type: 'Dict', pairs };
        }

        advance(tokens, state);
        return { type: 'Literal', value: null };
    }

    function peek(tokens, state) { return tokens[state.pos]; }
    function advance(tokens, state) { return tokens[state.pos++]; }
    function expect(tokens, state, type) {
        if (tokens[state.pos]?.type === type) return tokens[state.pos++];
    }

    // ═══════════════════════════════════════════════════════
    //  INTERPRETER
    // ═══════════════════════════════════════════════════════

    const BREAK = Symbol('break');
    const CONTINUE = Symbol('continue');
    class ReturnValue { constructor(v) { this.value = v; } }

    function makeEnv(parent = null) {
        return { vars: Object.create(null), parent };
    }

    function envGet(env, name) {
        let e = env;
        while (e) {
            if (name in e.vars) return e.vars[name];
            e = e.parent;
        }
        throw new Error(`NameError: 變數 '${name}' 未定義`);
    }

    function envSet(env, name, value) {
        // Always set in the innermost scope that already has it, or current scope
        let e = env;
        while (e.parent) {
            if (name in e.vars) { e.vars[name] = value; return; }
            e = e.parent;
        }
        env.vars[name] = value;
    }

    function envSetLocal(env, name, value) {
        env.vars[name] = value;
    }

    function interpret(stmts, env, ctx) {
        for (const stmt of stmts) {
            const result = execStmt(stmt, env, ctx);
            if (result === BREAK || result === CONTINUE || result instanceof ReturnValue) return result;
        }
        return null;
    }

    function execStmt(stmt, env, ctx) {
        ctx.steps++;
        if (ctx.steps > MAX_STEPS) throw new Error(`執行超過 ${MAX_STEPS} 步驟，可能有無限迴圈！`);

        switch (stmt.type) {
            case 'ExprStmt': {
                evalExpr(stmt.expr, env, ctx);
                return null;
            }
            case 'Assign': {
                const val = evalExpr(stmt.rhs, env, ctx);
                assignTarget(stmt.lhs, val, env, ctx);
                return null;
            }
            case 'TupleAssign': {
                const val = evalExpr(stmt.rhs, env, ctx);
                const iterable = toIterable(val);
                stmt.names.forEach((name, i) => envSet(env, name, iterable[i] ?? null));
                return null;
            }
            case 'AugAssign': {
                const cur = evalExpr(stmt.lhs, env, ctx);
                const delta = evalExpr(stmt.rhs, env, ctx);
                let result;
                switch (stmt.op) {
                    case '+': result = typeof cur === 'string' || typeof delta === 'string' ? String(cur) + String(delta) : cur + delta; break;
                    case '-': result = cur - delta; break;
                    case '*': result = cur * delta; break;
                    case '/': result = cur / delta; break;
                    case '%': result = cur % delta; break;
                    default: result = cur + delta;
                }
                assignTarget(stmt.lhs, result, env, ctx);
                return null;
            }
            case 'IfChain': {
                for (const branch of stmt.chains) {
                    if (branch.cond === null || isTruthy(evalExpr(branch.cond, env, ctx))) {
                        return interpret(branch.body, env, ctx);
                    }
                }
                return null;
            }
            case 'For': {
                const iterVal = evalExpr(stmt.iter, env, ctx);
                const items = toIterable(iterVal);
                for (const item of items) {
                    ctx.steps++;
                    if (ctx.steps > MAX_STEPS) throw new Error(`執行超過 ${MAX_STEPS} 步驟，可能有無限迴圈！`);
                    if (stmt.vars.length === 1) {
                        envSet(env, stmt.vars[0], item);
                    } else {
                        const unpacked = toIterable(item);
                        stmt.vars.forEach((v, i) => envSet(env, v, unpacked[i] ?? null));
                    }
                    const res = interpret(stmt.body, env, ctx);
                    if (res === BREAK) break;
                    if (res instanceof ReturnValue) return res;
                    // CONTINUE just continues
                }
                return null;
            }
            case 'While': {
                let iterations = 0;
                while (isTruthy(evalExpr(stmt.cond, env, ctx))) {
                    ctx.steps++;
                    iterations++;
                    if (ctx.steps > MAX_STEPS || iterations > MAX_STEPS) throw new Error(`執行超過 ${MAX_STEPS} 步驟，可能有無限迴圈！`);
                    const res = interpret(stmt.body, env, ctx);
                    if (res === BREAK) break;
                    if (res instanceof ReturnValue) return res;
                }
                return null;
            }
            case 'FuncDef': {
                const fn = {
                    type: 'PythonFunc',
                    name: stmt.name,
                    params: stmt.params,
                    body: stmt.body,
                    closure: env,
                };
                envSet(env, stmt.name, fn);
                return null;
            }
            case 'Return': {
                const val = stmt.value ? evalExpr(stmt.value, env, ctx) : null;
                return new ReturnValue(val);
            }
            case 'Break': return BREAK;
            case 'Continue': return CONTINUE;
            case 'Error': {
                ctx.errors.push({ line: stmt.lineNum, msg: stmt.msg });
                return null;
            }
        }
        return null;
    }

    function assignTarget(lhs, val, env, ctx) {
        if (lhs.type === 'Name') {
            envSet(env, lhs.name, val);
        } else if (lhs.type === 'Index') {
            const obj = evalExpr(lhs.obj, env, ctx);
            const idx = evalExpr(lhs.idx, env, ctx);
            if (Array.isArray(obj)) {
                const i = idx < 0 ? obj.length + idx : idx;
                obj[i] = val;
            } else if (obj && typeof obj === 'object') {
                obj[idx] = val;
            }
        }
    }

    function toIterable(val) {
        if (Array.isArray(val)) return val;
        if (val && typeof val === 'object' && !Array.isArray(val)) {
            // dict keys
            return Object.keys(val);
        }
        if (typeof val === 'string') return val.split('');
        return [];
    }

    function isTruthy(val) {
        if (val === null || val === false || val === 0 || val === '' || val === undefined) return false;
        if (Array.isArray(val) && val.length === 0) return false;
        if (typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length === 0) return false;
        return true;
    }

    function evalExpr(node, env, ctx) {
        if (!node) return null;
        switch (node.type) {
            case 'Literal': return node.value;
            case 'Name': return envGet(env, node.name);
            case 'Tuple': return node.items.map(i => evalExpr(i, env, ctx));
            case 'List': return node.items.map(i => evalExpr(i, env, ctx));
            case 'Dict': {
                const obj = {};
                for (const { key, val } of node.pairs) {
                    const k = evalExpr(key, env, ctx);
                    obj[k] = evalExpr(val, env, ctx);
                }
                return obj;
            }
            case 'Index': {
                const obj = evalExpr(node.obj, env, ctx);
                const idx = evalExpr(node.idx, env, ctx);
                if (Array.isArray(obj)) {
                    const i = typeof idx === 'number' && idx < 0 ? obj.length + idx : idx;
                    return obj[i] ?? null;
                }
                if (typeof obj === 'string') return obj[idx < 0 ? obj.length + idx : idx] ?? null;
                if (obj && typeof obj === 'object') return obj[idx] ?? null;
                return null;
            }
            case 'Attr': {
                const obj = evalExpr(node.obj, env, ctx);
                return (obj != null) ? obj[node.attr] : null;
            }
            case 'UnaryOp': {
                const v = evalExpr(node.operand, env, ctx);
                if (node.op === '-') return -v;
                if (node.op === 'not') return !isTruthy(v);
                return v;
            }
            case 'BinOp': {
                // Short-circuit for and/or
                if (node.op === 'and') {
                    const l = evalExpr(node.left, env, ctx);
                    return isTruthy(l) ? evalExpr(node.right, env, ctx) : l;
                }
                if (node.op === 'or') {
                    const l = evalExpr(node.left, env, ctx);
                    return isTruthy(l) ? l : evalExpr(node.right, env, ctx);
                }
                const left = evalExpr(node.left, env, ctx);
                const right = evalExpr(node.right, env, ctx);
                switch (node.op) {
                    case '+':
                        if (typeof left === 'string' || typeof right === 'string') return String(left) + String(right);
                        if (Array.isArray(left) && Array.isArray(right)) return [...left, ...right];
                        return left + right;
                    case '-': return left - right;
                    case '*':
                        if (typeof left === 'string' && typeof right === 'number') return left.repeat(Math.max(0, right));
                        if (typeof right === 'string' && typeof left === 'number') return right.repeat(Math.max(0, left));
                        return left * right;
                    case '/': return left / right;
                    case '//': return Math.trunc(left / right);
                    case '%': return ((left % right) + right) % right;  // Python modulo
                    case '**': return Math.pow(left, right);
                    case '==': return left === right || (left == right && typeof left === typeof right);
                    case '!=': return !(left === right || (left == right && typeof left === typeof right));
                    case '<': return left < right;
                    case '>': return left > right;
                    case '<=': return left <= right;
                    case '>=': return left >= right;
                    case 'in':
                        if (typeof right === 'string') return right.includes(String(left));
                        if (Array.isArray(right)) return right.includes(left);
                        if (right && typeof right === 'object') return left in right;
                        return false;
                    case 'not in':
                        if (typeof right === 'string') return !right.includes(String(left));
                        if (Array.isArray(right)) return !right.includes(left);
                        if (right && typeof right === 'object') return !(left in right);
                        return true;
                    case 'is': return left === right;
                    case 'is not': return left !== right;
                }
                return null;
            }
            case 'Call': return evalCall(node, env, ctx);
            case 'MethodCall': return evalMethodCall(node, env, ctx);
        }
        return null;
    }

    function resolveArgs(argNodes, env, ctx) {
        const positional = [];
        const keyword = {};
        for (const a of argNodes) {
            if (a.type === 'KwArg') keyword[a.key] = evalExpr(a.value, env, ctx);
            else positional.push(evalExpr(a, env, ctx));
        }
        return { positional, keyword };
    }

    function evalCall(node, env, ctx) {
        // Extract the name BEFORE evaluating the callee so built-ins and city
        // functions never go through envGet (which would throw NameError).
        const calleeName = node.callee.type === 'Name' ? node.callee.name : null;

        // Resolve args first (works for both built-ins and user functions)
        const { positional, keyword } = resolveArgs(node.args, env, ctx);

        // ── Built-in functions ────────────────────────────────
        if (calleeName === 'print') {
            const parts = positional.map(v => pyStr(v));
            const sep = keyword.sep ?? ' ';
            ctx.printOutput.push(parts.join(sep));
            return null;
        }
        if (calleeName === 'range') {
            const args = positional;
            let start = 0, stop, step = 1;
            if (args.length === 1) stop = args[0];
            else if (args.length === 2) { start = args[0]; stop = args[1]; }
            else { start = args[0]; stop = args[1]; step = args[2]; }
            const arr = [];
            if (step > 0) for (let i = start; i < stop; i += step) arr.push(i);
            else if (step < 0) for (let i = start; i > stop; i += step) arr.push(i);
            return arr;
        }
        if (calleeName === 'len') return toLength(positional[0]);
        if (calleeName === 'str') return pyStr(positional[0]);
        if (calleeName === 'int') return parseInt(positional[0]) || 0;
        if (calleeName === 'float') return parseFloat(positional[0]) || 0;
        if (calleeName === 'abs') return Math.abs(positional[0]);
        if (calleeName === 'max') return positional.length === 1 ? Math.max(...toIterable(positional[0])) : Math.max(...positional);
        if (calleeName === 'min') return positional.length === 1 ? Math.min(...toIterable(positional[0])) : Math.min(...positional);
        if (calleeName === 'sum') return toIterable(positional[0]).reduce((a, b) => a + b, 0);
        if (calleeName === 'list') return [...toIterable(positional[0] ?? [])];
        if (calleeName === 'enumerate') {
            const items = toIterable(positional[0] ?? []);
            const start = positional[1] ?? 0;
            return items.map((item, i) => [i + start, item]);
        }
        if (calleeName === 'zip') {
            const iters = positional.map(toIterable);
            const minLen = Math.min(...iters.map(a => a.length));
            return Array.from({ length: minLen }, (_, i) => iters.map(a => a[i]));
        }
        if (calleeName === 'reversed') return [...toIterable(positional[0])].reverse();
        if (calleeName === 'sorted') {
            const arr = [...toIterable(positional[0])];
            arr.sort((a, b) => (a > b ? 1 : a < b ? -1 : 0));
            if (keyword.reverse) arr.reverse();
            return arr;
        }
        if (calleeName === 'dict') return {};
        if (calleeName === 'bool') return isTruthy(positional[0]);
        if (calleeName === 'round') return Math.round(positional[0] * Math.pow(10, positional[1] ?? 0)) / Math.pow(10, positional[1] ?? 0);
        if (calleeName === 'input') return ''; // no-op in city context

        // City build functions
        if (calleeName && BUILD_FNS.has(calleeName)) {
            const fn = window.CityLib[calleeName];
            if (!fn) throw new Error(`找不到城市函式 ${calleeName}`);

            // Check unlock
            if (window.LessonSystem && calleeName !== 'clear_all' && !window.LessonSystem.isUnlocked(calleeName)) {
                ctx.errors.push({ line: ctx.currentLine, msg: `🔒 ${calleeName}() 尚未解鎖！` });
                return null;
            }

            // Build args array
            const PARAM_MAP = {
                build_house: ['row', 'col', 'floors', 'name'],
                build_park: ['row', 'col', 'name'],
                build_library: ['row', 'col', 'name'],
                build_school: ['row', 'col', 'name'],
                build_hospital: ['row', 'col', 'name'],
                build_shop: ['row', 'col', 'name'],
                build_road: ['row', 'col', 'direction'],
                build_power_tower: ['row', 'col'],
                build_fountain: ['row', 'col', 'name'],
                build_streetlight: ['row', 'col'],
                clear_all: [],
            };
            const DEFAULTS = {
                build_house: [null, null, 1, ''],
                build_park: [null, null, ''],
                build_library: [null, null, ''],
                build_school: [null, null, ''],
                build_hospital: [null, null, ''],
                build_shop: [null, null, ''],
                build_road: [null, null, 'h'],
                build_power_tower: [null, null],
                build_fountain: [null, null, ''],
                build_streetlight: [null, null],
                clear_all: [],
            };
            const params = PARAM_MAP[calleeName] || [];
            const defaults = [...(DEFAULTS[calleeName] || [])];
            positional.forEach((v, i) => { if (i < defaults.length) defaults[i] = v; });
            Object.entries(keyword).forEach(([k, v]) => {
                const idx = params.indexOf(k);
                if (idx >= 0) defaults[idx] = v;
            });

            const finalArgs = defaults;

            // Validation
            if (calleeName !== 'clear_all') {
                const row = finalArgs[0], col = finalArgs[1];
                if (row === null || col === null) {
                    ctx.errors.push({ line: ctx.currentLine, msg: `${calleeName}() 需要指定 row 和 col` });
                    return null;
                }
                const r = Math.round(row), c = Math.round(col);
                if (r < 0 || r > 79 || c < 0 || c > 79) {
                    ctx.errors.push({ line: ctx.currentLine, msg: `座標 (${r}, ${c}) 超出地圖範圍 (0–79)` });
                    return null;
                }
                if (window.CityLib.isLand && !window.CityLib.isLand(r, c)) {
                    ctx.errors.push({ line: ctx.currentLine, msg: `座標 (${r}, ${c}) 不在島嶼陸地上！` });
                    return null;
                }
                finalArgs[0] = r; finalArgs[1] = c;
            }

            try {
                const result = fn(...finalArgs);
                const skipped = result === null && calleeName !== 'clear_all';
                ctx.buildResults.push({ fn: calleeName, args: finalArgs, result, skipped, ok: true });
                if (!skipped) ctx.totalBuilt++;
                return result;
            } catch (e) {
                ctx.errors.push({ line: ctx.currentLine, msg: `${calleeName}() 執行錯誤：${e.message}` });
                return null;
            }
        }

        // User-defined function — evaluate the callee only now (avoids NameError for built-ins above)
        const callee = evalExpr(node.callee, env, ctx);
        if (callee && callee.type === 'PythonFunc') {
            const fnEnv = makeEnv(callee.closure);
            callee.params.forEach((p, i) => {
                if (i < positional.length) envSetLocal(fnEnv, p.name, positional[i]);
                else if (p.name in keyword) envSetLocal(fnEnv, p.name, keyword[p.name]);
                else if (p.default) {
                    const t = p.default;
                    envSetLocal(fnEnv, p.name, evalExpr(parseExpr(t, { pos: 0 }), fnEnv, ctx));
                } else envSetLocal(fnEnv, p.name, null);
            });
            const res = interpret(callee.body, fnEnv, ctx);
            if (res instanceof ReturnValue) return res.value;
            return null;
        }

        if (typeof callee === 'function') return callee(...positional);
        return null;
    }

    function evalMethodCall(node, env, ctx) {
        const obj = evalExpr(node.obj, env, ctx);
        const { positional, keyword } = resolveArgs(node.args, env, ctx);
        const method = node.method;

        if (Array.isArray(obj)) {
            if (method === 'append') { obj.push(positional[0]); return null; }
            if (method === 'extend') { for (const v of toIterable(positional[0])) obj.push(v); return null; }
            if (method === 'pop') { return obj.length > 0 ? obj.pop() : null; }
            if (method === 'insert') { obj.splice(positional[0], 0, positional[1]); return null; }
            if (method === 'remove') { const i = obj.indexOf(positional[0]); if (i >= 0) obj.splice(i, 1); return null; }
            if (method === 'index') { return obj.indexOf(positional[0]); }
            if (method === 'count') { return obj.filter(x => x === positional[0]).length; }
            if (method === 'sort') { obj.sort((a, b) => a > b ? 1 : -1); if (keyword.reverse) obj.reverse(); return null; }
            if (method === 'reverse') { obj.reverse(); return null; }
            if (method === 'copy') { return [...obj]; }
            if (method === 'clear') { obj.length = 0; return null; }
        }

        if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
            if (method === 'keys') return Object.keys(obj);
            if (method === 'values') return Object.values(obj);
            if (method === 'items') return Object.entries(obj).map(([k, v]) => [k, v]);
            if (method === 'get') return obj[positional[0]] ?? (positional[1] ?? null);
            if (method === 'update') { if (positional[0]) Object.assign(obj, positional[0]); return null; }
            if (method === 'pop') { const v = obj[positional[0]]; delete obj[positional[0]]; return v ?? null; }
            if (method === 'copy') { return { ...obj }; }
        }

        if (typeof obj === 'string') {
            if (method === 'upper') return obj.toUpperCase();
            if (method === 'lower') return obj.toLowerCase();
            if (method === 'strip') return obj.trim();
            if (method === 'split') return obj.split(positional[0] ?? /\s+/).filter(Boolean);
            if (method === 'join') return obj.split('').length ? toIterable(positional[0]).join(obj) : '';
            if (method === 'replace') return obj.replaceAll(positional[0], positional[1]);
            if (method === 'startswith') return obj.startsWith(positional[0]);
            if (method === 'endswith') return obj.endsWith(positional[0]);
            if (method === 'find') return obj.indexOf(positional[0]);
            if (method === 'count') { let n = 0, i = 0, s = positional[0]; while ((i = obj.indexOf(s, i)) !== -1) { n++; i += s.length; } return n; }
            if (method === 'format') {
                let s = obj; positional.forEach((v, i) => { s = s.replace(`{${i}}`, pyStr(v)).replace('{}', pyStr(v)); });
                Object.entries(keyword).forEach(([k, v]) => { s = s.replace(`{${k}}`, pyStr(v)); });
                return s;
            }
            if (method === 'zfill') return obj.padStart(positional[0], '0');
            if (method === 'center') return obj.padStart(Math.floor((positional[0] + obj.length) / 2)).padEnd(positional[0]);
            if (method === 'ljust') return obj.padEnd(positional[0]);
            if (method === 'rjust') return obj.padStart(positional[0]);
            if (method === 'isdigit') return /^\d+$/.test(obj);
            if (method === 'isalpha') return /^[a-zA-Z]+$/.test(obj);
        }

        return null;
    }

    function pyStr(v) {
        if (v === null || v === undefined) return 'None';
        if (v === true) return 'True';
        if (v === false) return 'False';
        if (Array.isArray(v)) return '[' + v.map(pyStr).join(', ') + ']';
        if (typeof v === 'object') return '{' + Object.entries(v).map(([k, val]) => `'${k}': ${pyStr(val)}`).join(', ') + '}';
        return String(v);
    }

    function toLength(v) {
        if (v === null || v === undefined) return 0;
        if (typeof v === 'string' || Array.isArray(v)) return v.length;
        if (typeof v === 'object') return Object.keys(v).length;
        return 0;
    }

    // ═══════════════════════════════════════════════════════
    //  PUBLIC API  — run(code)
    // ═══════════════════════════════════════════════════════
    function run(code) {
        const ctx = {
            steps: 0,
            currentLine: 0,
            errors: [],
            buildResults: [],
            printOutput: [],
            totalBuilt: 0,
        };

        let stmts;
        try {
            stmts = parse(code);
        } catch (e) {
            return {
                parseErrors: [{ line: 0, msg: `解析錯誤：${e.message}` }],
                execResults: [],
                printOutput: [],
                totalBuilt: 0,
            };
        }

        const globalEnv = makeEnv(null);

        try {
            interpret(stmts, globalEnv, ctx);
        } catch (e) {
            ctx.errors.push({ line: ctx.currentLine, msg: e.message });
        }

        return {
            parseErrors: [],
            execResults: ctx.buildResults.map(r => ({
                ok: r.ok,
                skipped: r.skipped,
                call: { fn: r.fn, lineNum: ctx.currentLine },
                result: r.result,
                error: null,
            })),
            printOutput: ctx.printOutput,
            errors: ctx.errors,
            totalBuilt: ctx.totalBuilt,
        };
    }

    return { run, parse, tokenise };
})();