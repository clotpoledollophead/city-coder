// python-runner.js — 將 Python 語法轉譯成 JS 函式呼叫，並執行建築

window.PythonRunner = (function () {

    // ── 已支援的函式對照表 ────────────────────────────────────────
    const SUPPORTED_FUNCS = new Set([
        'build_house', 'build_park', 'build_pool', 'build_library',
        'build_school', 'build_hospital', 'build_shop', 'build_road',
        'build_power_tower', 'build_fountain', 'build_apartment', 'clear_all'
    ]);

    // ── 解析 Python 字串 ──────────────────────────────────────────
    function parsePyValue(s) {
        s = s.trim();
        if (s === 'None' || s === 'null') return null;
        if (s === 'True') return true;
        if (s === 'False') return false;
        if ((s.startsWith('"') && s.endsWith('"')) ||
            (s.startsWith("'") && s.endsWith("'"))) return s.slice(1, -1);
        if (!isNaN(Number(s))) return Number(s);
        return s;
    }

    // 解析函式引數 (支援 positional 和 keyword)
    function parseArgs(argsStr) {
        const positional = [];
        const keyword = {};
        if (!argsStr.trim()) return { positional, keyword };

        // 用逗號切割（注意字串內不切）
        const tokens = [];
        let depth = 0, current = '', inStr = false, strChar = '';
        for (const ch of argsStr) {
            if (!inStr && (ch === '"' || ch === "'")) { inStr = true; strChar = ch; current += ch; }
            else if (inStr && ch === strChar) { inStr = false; current += ch; }
            else if (!inStr && (ch === '(' || ch === '[')) { depth++; current += ch; }
            else if (!inStr && (ch === ')' || ch === ']')) { depth--; current += ch; }
            else if (!inStr && ch === ',' && depth === 0) { tokens.push(current.trim()); current = ''; }
            else current += ch;
        }
        if (current.trim()) tokens.push(current.trim());

        for (const tok of tokens) {
            const eqIdx = tok.indexOf('=');
            if (eqIdx > 0 && !/['"]/.test(tok.slice(0, eqIdx))) {
                const key = tok.slice(0, eqIdx).trim();
                const val = parsePyValue(tok.slice(eqIdx + 1));
                keyword[key] = val;
            } else {
                positional.push(parsePyValue(tok));
            }
        }
        return { positional, keyword };
    }

    // ── 把 Python 程式碼轉成 JS 函式呼叫清單 ─────────────────────
    function transpile(pyCode) {
        const lines = pyCode.split('\n');
        const calls = [];   // { fn, args, original, lineNum }
        const jsLines = [];
        const errors = [];

        for (let i = 0; i < lines.length; i++) {
            const raw = lines[i];
            const line = raw.split('#')[0].trim();  // 去除 Python 註解

            if (!line) {
                jsLines.push('// (空行)');
                continue;
            }

            // 匹配函式呼叫：可能有 variable = func(...) 或直接 func(...)
            const m = line.match(/^(?:\w+\s*=\s*)?(\w+)\s*\(([^]*)\)\s*$/);
            if (!m) {
                jsLines.push(`// ⚠ 無法解析: ${raw}`);
                errors.push({ line: i + 1, msg: `無法解析語法: "${raw.trim()}"` });
                continue;
            }

            const fnName = m[1];
            const argsStr = m[2];

            if (!SUPPORTED_FUNCS.has(fnName)) {
                jsLines.push(`// ⚠ 未知函式: ${fnName}`);
                errors.push({ line: i + 1, msg: `未知函式 "${fnName}"，請查閱函式庫說明` });
                continue;
            }

            const { positional, keyword } = parseArgs(argsStr);

            // 根據各函式的參數順序，組出引數陣列
            let finalArgs = buildFinalArgs(fnName, positional, keyword);
            const jsCall = `CityLib.${fnName}(${finalArgs.map(a => JSON.stringify(a)).join(', ')});`;
            jsLines.push(jsCall);
            calls.push({ fn: fnName, args: finalArgs, original: raw.trim(), lineNum: i + 1 });
        }

        return { calls, jsLines, errors };
    }

    // 根據每個函式的簽名組合最終引數
    const FUNC_PARAMS = {
        build_house: ['row', 'col', 'floors', 'name'],
        build_park: ['row', 'col', 'name'],
        build_pool: ['row', 'col', 'name'],
        build_library: ['row', 'col', 'name'],
        build_school: ['row', 'col', 'name'],
        build_hospital: ['row', 'col', 'name'],
        build_shop: ['row', 'col', 'name'],
        build_road: ['row', 'col', 'direction'],
        build_power_tower: ['row', 'col'],
        build_fountain: ['row', 'col', 'name'],
        build_apartment: ['row', 'col', 'floors', 'name'],
        clear_all: [],
    };
    const FUNC_DEFAULTS = {
        build_house: [null, null, 1, ''],
        build_park: [null, null, ''],
        build_pool: [null, null, ''],
        build_library: [null, null, ''],
        build_school: [null, null, ''],
        build_hospital: [null, null, ''],
        build_shop: [null, null, ''],
        build_road: [20, 20, 'h'],
        build_power_tower: [null, null],
        build_fountain: [null, null, ''],
        build_apartment: [null, null, 4, ''],
        clear_all: [],
    };

    function buildFinalArgs(fnName, positional, keyword) {
        const params = FUNC_PARAMS[fnName] || [];
        const defaults = FUNC_DEFAULTS[fnName] || [];
        const result = [...defaults];
        // 填入 positional
        positional.forEach((v, i) => { if (i < result.length) result[i] = v; });
        // 填入 keyword
        Object.entries(keyword).forEach(([k, v]) => {
            const idx = params.indexOf(k);
            if (idx >= 0) result[idx] = v;
        });
        return result;
    }

    // ── 執行轉譯結果 ──────────────────────────────────────────────
    function execute(calls) {
        const results = [];
        for (const call of calls) {
            try {
                const fn = window.CityLib[call.fn];
                if (!fn) throw new Error(`找不到函式 ${call.fn}`);
                const result = fn(...call.args);
                results.push({ ok: true, call, result });
            } catch (e) {
                results.push({ ok: false, call, error: e.message });
            }
        }
        return results;
    }

    // ── 主要入口 ──────────────────────────────────────────────────
    function run(pyCode) {
        const { calls, jsLines, errors: parseErrors } = transpile(pyCode);
        const execResults = execute(calls.filter(c => c));

        return {
            jsCode: jsLines.join('\n'),
            parseErrors,
            execResults,
            totalBuilt: execResults.filter(r => r.ok).length,
        };
    }

    return { run, transpile };
})();