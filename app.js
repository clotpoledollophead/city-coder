// ═══════════════════════════════════════════════════════════════
//  app.js  —  CodeScape UI Logic (extracted from app.html)
// ═══════════════════════════════════════════════════════════════

const STARTER_CODE = `# CodeScape：未來程市 🏙️
# 撰寫 Python，按 ▶ 執行，即可在右側地圖建造城市！
# 點擊左下角函式庫的卡片可完成教學並解鎖對應函式。
#
# ── 使用規則 ──────────────────────────────────────────
# build_xxx(row, col)  →  row 是列，col 是欄（整數 0–79）
# 有效陸地約 row 25–55, col 25–55（懸停地圖格子可查座標）
# 可使用 for / while / if-else / def 等完整 Python 語法！
# Tab 鍵 → 自動縮排 4 格
# ──────────────────────────────────────────────────────

# 範例：用 for 迴圈蓋一排房子
for i in range(5):
    build_house(40, 40 + i, name="房子" + str(i + 1))
`;

const LIB_FUNCTIONS = [
    { name: 'build_house', emoji: '🏠', desc: '蓋一棟房子', sig: 'build_house(row, col, floors=1, name="")', snippet: 'build_house(10, 10, name="我的家")\n', params: [['row', '網格列 0-79'], ['col', '網格欄 0-79'], ['floors', '樓層數'], ['name', '標籤']] },
    { name: 'build_park', emoji: '🌳', desc: '建造公園', sig: 'build_park(row, col, name="")', snippet: 'build_park(9, 12, name="中央公園")\n', params: [['row', '列 (0-79)'], ['col', '欄 (0-79)'], ['name', '名稱']] },
    { name: 'build_library', emoji: '📖', desc: '建造圖書館', sig: 'build_library(row, col, name="")', snippet: 'build_library(10, 12, name="圖書館")\n', params: [['row', '列 (0-79)'], ['col', '欄 (0-79)'], ['name', '名稱']] },
    { name: 'build_school', emoji: '🏫', desc: '建造學校', sig: 'build_school(row, col, name="")', snippet: 'build_school(8, 12, name="未來中學")\n', params: [['row', '列 (0-79)'], ['col', '欄 (0-79)'], ['name', '名稱']] },
    { name: 'build_hospital', emoji: '🏥', desc: '建造醫院', sig: 'build_hospital(row, col, name="")', snippet: 'build_hospital(24, 20, name="市立醫院")\n', params: [['row', '列 (0-79)'], ['col', '欄 (0-79)'], ['name', '名稱']] },
    { name: 'build_shop', emoji: '🏪', desc: '建造商店', sig: 'build_shop(row, col, name="")', snippet: 'build_shop(7, 15, name="便利商店")\n', params: [['row', '列 (0-79)'], ['col', '欄 (0-79)'], ['name', '名稱']] },
    { name: 'build_fountain', emoji: '⛲', desc: '建造噴水池', sig: 'build_fountain(row, col, name="")', snippet: 'build_fountain(20, 20, name="噴水池")\n', params: [['row', '列 (0-79)'], ['col', '欄 (0-79)'], ['name', '名稱']] },
    { name: 'build_road', emoji: '🛣️', desc: '鋪設道路（附人行道）', sig: 'build_road(row, col, direction="h")', snippet: 'build_road(20, 20)\n', params: [['row', '列 (0-79)'], ['col', '欄 (0-79)'], ['direction', '"h"水平/"v"垂直']] },
    { name: 'build_power_tower', emoji: '⚡', desc: '建造電力塔', sig: 'build_power_tower(row, col)', snippet: 'build_power_tower(22, 20)\n', params: [['row', '列 (0-79)'], ['col', '欄 (0-79)']] },
    { name: 'build_streetlight', emoji: '💡', desc: '建造路燈（夜晚自動點亮）', sig: 'build_streetlight(row, col)', snippet: 'build_streetlight(20, 21)\n', params: [['row', '列 (0-79)，照亮周圍約 3 格'], ['col', '欄 (0-79)']] },
    { name: 'clear_all', emoji: '🗑️', desc: '清除所有建築', sig: 'clear_all()', snippet: 'clear_all()\n', params: [] },
];

window.LIB_FUNCTIONS = LIB_FUNCTIONS;

let editor;

function setupEditor() {
    const wrap = document.getElementById('editorWrap');
    const ta = document.createElement('textarea');
    const savedCode = window.LessonSystem ? window.LessonSystem.loadMapCode() : null;
    ta.value = savedCode || STARTER_CODE;
    wrap.appendChild(ta);
    editor = CodeMirror.fromTextArea(ta, {
        mode: 'python',
        theme: 'dracula',
        lineNumbers: true,
        indentUnit: 4,
        tabSize: 4,
        indentWithTabs: false,
        lineWrapping: false,
        autofocus: true,
        extraKeys: { 'Ctrl-Enter': runCode, 'Cmd-Enter': runCode },
    });
    editor.setSize('100%', '100%');
    window._mainEditor = editor;
}

function buildLibCards() {
    const body = document.getElementById('libBody');
    const tooltip = document.getElementById('fnTooltip');

    const LESSON_FN_ORDER = [
        'build_house', 'build_park', 'build_road', 'build_school', 'build_shop',
        'build_library', 'build_hospital', 'build_fountain', 'build_power_tower',
        'build_streetlight', 'clear_all'
    ];
    const sortedFns = [...LIB_FUNCTIONS].sort((a, b) => {
        const ai = LESSON_FN_ORDER.indexOf(a.name);
        const bi = LESSON_FN_ORDER.indexOf(b.name);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

    sortedFns.forEach(fn => {
        const card = document.createElement('div');
        card.className = 'lib-fn-card';
        card.dataset.fn = fn.name;
        card.innerHTML = `<span class="fn-emoji">${fn.emoji}</span><span class="fn-name">${fn.name}</span>`;

        card.addEventListener('click', () => {
            if (editor) { editor.replaceRange(fn.snippet, editor.getCursor()); editor.focus(); }
            tooltip.style.display = 'none';
        });
        card.addEventListener('mouseenter', () => {
            const paramHtml = fn.params.map(([p, d]) =>
                `<div class="tt-param"><span>${p}</span> — ${d}</div>`).join('');
            tooltip.innerHTML = `<div class="tt-name">${fn.emoji} ${fn.name}</div><div class="tt-sig">${fn.sig}</div><div class="tt-desc">${fn.desc}</div>${paramHtml}<div class="tt-hint">▸ 點擊插入程式碼</div>`;
            const rect = card.getBoundingClientRect();
            tooltip.style.left = Math.min(rect.right + 10, window.innerWidth - 285) + 'px';
            tooltip.style.top = Math.min(rect.top, window.innerHeight - 215) + 'px';
            tooltip.style.display = 'block';
        });
        card.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });
        body.appendChild(card);
    });
}

function log(msg, cls = 'log-info') {
    const body = document.getElementById('outputBody');
    const div = document.createElement('div');
    div.className = cls;
    div.textContent = msg;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
}
function clearLog() { document.getElementById('outputBody').innerHTML = ''; }

function setStatus(text, cls) {
    const el = document.getElementById('footerStatus');
    el.textContent = text;
    el.className = cls;
}

function runCode() {
    if (!window.PythonRunner || !window.CityLib) { log('⚠ 引擎尚未載入，請稍後再試', 'log-warn'); return; }
    const code = editor ? editor.getValue() : '';

    if (window.LessonSystem) {
        const ALL_LIB_FNS = LIB_FUNCTIONS.map(f => f.name).filter(n => n !== 'clear_all');
        const lockedCalls = ALL_LIB_FNS.filter(fn => {
            // Strip comments and strings, check for bare function name calls
            const stripped = code.replace(/#[^\n]*/g, '').replace(/(['"]).*?\1/g, '""');
            return new RegExp(`\\b${fn}\\s*\\(`).test(stripped) && !window.LessonSystem.isUnlocked(fn);
        });
        if (lockedCalls.length > 0) {
            clearLog();
            lockedCalls.forEach(fn => {
                log(`🔒 ${fn}() 尚未解鎖！點擊函式庫中的卡片完成教學後才能使用。`, 'log-warn');
            });
            log('▸ 請先解鎖所有使用到的函式。', 'log-err');
            setStatus('● 有函式未解鎖', 'error');
            const panel = document.getElementById('outputPanel');
            panel.classList.remove('collapsed');
            panel.classList.add('expanded');
            return;
        }
    }

    clearLog();
    document.getElementById('btnRun').classList.add('running');
    setStatus('● 執行中…', 'running');
    log('▸ 開始執行 Python 程式碼…', 'log-info');

    setTimeout(() => {
        try {
            const { parseErrors, execResults, printOutput, errors, totalBuilt } = window.PythonRunner.run(code);

            // Print output (from print() calls)
            if (printOutput && printOutput.length > 0) {
                printOutput.forEach(line => log(`📤 ${line}`, 'log-info'));
            }

            // Parse / runtime errors
            if (parseErrors) parseErrors.forEach(e => log(`⚠ ${e.line > 0 ? `第 ${e.line} 行：` : ''}${e.msg}`, 'log-warn'));
            if (errors) errors.forEach(e => log(`✗ ${e.msg}`, 'log-err'));

            // Build results
            execResults.forEach(r => {
                if (r.skipped) log(`↷ ${r.call.fn}() — 座標已有建築，跳過`, 'log-warn');
                else if (r.ok) log(`✓ ${r.call.fn}() → ${r.result ? r.result.type : '完成'}`, 'log-ok');
                else if (r.error) log(`✗ ${r.call.fn}() — ${r.error}`, 'log-err');
            });

            const hasErrors = (errors && errors.length > 0) || (parseErrors && parseErrors.length > 0);
            log(`▸ 完成！共建造 ${totalBuilt} 個設施${hasErrors ? '，有錯誤（見上方）' : ''}`,
                totalBuilt > 0 ? 'log-ok' : 'log-warn');

            const badge = document.getElementById('outputBadge');
            badge.textContent = totalBuilt > 0 ? `✓ ${totalBuilt} 個建造` : '0 個建造';
            badge.className = 'badge ' + (totalBuilt > 0 ? 'badge-ok' : 'badge-err');
            setStatus(totalBuilt > 0 ? `● ${totalBuilt} 個成功` : '● 無建造', totalBuilt > 0 ? 'ready' : 'error');
            if (window.LessonSystem) window.LessonSystem.saveMapCode(code);
        } catch (err) {
            log(`✗ 執行錯誤：${err.message}`, 'log-err');
            setStatus('● 執行錯誤', 'error');
        }
        document.getElementById('btnRun').classList.remove('running');
        const panel = document.getElementById('outputPanel');
        panel.classList.remove('collapsed');
        panel.classList.add('expanded');
    }, 50);
}

function clearMap() {
    if (!window.CityLib) return;
    window.CityLib.clear_all();
    clearLog();
    log('▸ 地圖已清除。', 'log-info');
    document.getElementById('outputBadge').textContent = '就緒';
    document.getElementById('outputBadge').className = 'badge badge-info';
    setStatus('● 就緒', 'ready');
}

// ── Confirm popups (code & map) ───────────────────────────
let ccOpen = false, cmOpen = false;
const ccPopup = document.getElementById('clearCodeConfirm');
const cmPopup = document.getElementById('clearMapConfirm');

function closeAllConfirms() {
    ccPopup.classList.remove('visible'); ccOpen = false;
    cmPopup.classList.remove('visible'); cmOpen = false;
}

document.getElementById('btnClearCode').addEventListener('click', (e) => {
    e.stopPropagation();
    if (cmOpen) { cmPopup.classList.remove('visible'); cmOpen = false; }
    ccOpen = !ccOpen;
    ccPopup.classList.toggle('visible', ccOpen);
});
document.getElementById('ccYes').addEventListener('click', () => {
    if (editor) editor.setValue('');
    clearLog();
    log('▸ 程式碼已清除。（地圖未受影響）', 'log-info');
    document.getElementById('outputBadge').textContent = '就緒';
    document.getElementById('outputBadge').className = 'badge badge-info';
    if (window.LessonSystem) window.LessonSystem.saveMapCode('');
    closeAllConfirms();
});
document.getElementById('ccNo').addEventListener('click', closeAllConfirms);

document.getElementById('btnClear').addEventListener('click', (e) => {
    e.stopPropagation();
    if (ccOpen) { ccPopup.classList.remove('visible'); ccOpen = false; }
    cmOpen = !cmOpen;
    cmPopup.classList.toggle('visible', cmOpen);
});
document.getElementById('cmYes').addEventListener('click', () => {
    clearMap();
    closeAllConfirms();
});
document.getElementById('cmNo').addEventListener('click', closeAllConfirms);

document.addEventListener('click', closeAllConfirms);

// ── Guide panel logic ─────────────────────────────────────
const GUIDE_KEY = 'codescape_guide_shown';

function showGuide() {
    document.getElementById('uiGuidePanel').classList.remove('hidden');
}
function hideGuide() {
    document.getElementById('uiGuidePanel').classList.add('hidden');
}

document.getElementById('guideStartBtn').addEventListener('click', hideGuide);
document.getElementById('guideNoShow').addEventListener('click', () => {
    try { localStorage.setItem(GUIDE_KEY, '1'); } catch (e) { }
    hideGuide();
});
document.getElementById('btnGuide').addEventListener('click', showGuide);

// ── Other button bindings ─────────────────────────────────
document.getElementById('btnRun').addEventListener('click', runCode);
document.getElementById('btnResetGame').addEventListener('click', () => {
    if (confirm('⚠️ 確定要重新遊玩嗎？\n\n這將清除：\n• 所有課程解鎖進度\n• 已儲存的地圖程式碼\n\n重新整理後將從第一課開始。')) {
        if (window.LessonSystem) window.LessonSystem.resetAll();
        location.reload();
    }
});
document.getElementById('outputHeader').addEventListener('click', () => {
    const p = document.getElementById('outputPanel');
    p.classList.toggle('expanded');
    p.classList.toggle('collapsed');
});
let libOpen = true;
document.getElementById('libHeader').addEventListener('click', () => {
    libOpen = !libOpen;
    document.getElementById('libBody').style.display = libOpen ? '' : 'none';
    document.getElementById('libToggleIcon').textContent = libOpen ? '▲' : '▼';
});
document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runCode(); }
});

// ── Init on DOMContentLoaded ──────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
    setupEditor();
    buildLibCards();

    const fromTutorial = new URLSearchParams(window.location.search).get('tutorial') === 'done';
    window.LessonSystem.init({ freshStart: fromTutorial });

    let suppressed = false;
    try { suppressed = localStorage.getItem(GUIDE_KEY) === '1'; } catch (e) { }
    if (!suppressed) {
        showGuide();
    }
});