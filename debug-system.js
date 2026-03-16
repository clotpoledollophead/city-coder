// ═══════════════════════════════════════════════════════════════
//  debug-system.js — CodeScape 驚嘆號 Debug 教學系統
//
//  當玩家在地圖上蓋了一定數量的建築後，
//  隨機在幾棟建築物上方出現閃爍的「！」提示，
//  點擊後彈出 debug 教學視窗。
// ═══════════════════════════════════════════════════════════════

window.DebugSystem = (function () {

    const MAX_ACTIVE = 2;
    let _activeMarkers = new Map();
    let _shownKeys = new Set();
    let _dismissed = new Set();
    let _activeChallengIds = new Set();
    let _markerObjs = [];

    // ── Debug 題庫 ──────────────────────────────────────────────
    const DEBUG_CHALLENGES = [
        // ── 波次 1：基礎語法 bug ──────────────────────────────
        {
            id: 'db_parenthesis',
            wave: 0,
            buildingTypes: ['house', 'park', 'shop'],
            title: '🔍 Debug：括號不見了！',
            intro: '這棟建築的施工紀錄出了問題！幫我找出程式碼裡的 bug。',
            bugCode: `# 想在地圖上蓋一棟房子
build_house 40, 40, name="測試屋"`,
            type: 'choice',
            question: '以下哪裡有 bug？',
            options: [
                { text: '函式名稱拼錯了', correct: false, explain: '函式名稱 build_house 是正確的！' },
                { text: '函式呼叫缺少括號 ( )', correct: true, explain: '對！Python 呼叫函式時一定要有括號，正確寫法是 build_house(40, 40, name="測試屋")。' },
                { text: '座標 40, 40 不合法', correct: false, explain: '座標在有效範圍內，問題不在這裡。' },
                { text: '沒有問題', correct: false, explain: '仔細看看，有個重要的符號不見了！' },
            ],
            successMsg: '✓ 找到了！括號是函式呼叫的必要符號，不能省略。',
        },
        {
            id: 'db_string_quote',
            wave: 0,
            buildingTypes: ['school', 'library', 'hospital'],
            title: '🔍 Debug：引號不對稱！',
            intro: '工程師寫完程式碼後，建築沒有出現在地圖上。幫他找出原因！',
            bugCode: `# 蓋一間學校
build_school(40, 42, name="未來中學')`,
            type: 'choice',
            question: '這段程式碼的錯誤是什麼？',
            options: [
                { text: '行尾多餘的括號', correct: false, explain: '行尾的 ) 是函式呼叫的結尾，是需要的。' },
                { text: '字串引號不對稱（開頭是 " 結尾是 \'）', correct: true, explain: '完全正確！Python 字串的開頭和結尾引號必須一致，要嘛都用雙引號 ""，要嘛都用單引號 \'\'。' },
                { text: 'name= 不需要等號', correct: false, explain: '具名參數需要等號，這裡是正確的。' },
                { text: '座標不在陸地上', correct: false, explain: '這是語法錯誤，和座標無關。' },
            ],
            successMsg: '✓ 引號要成對！開頭用什麼結尾就用什麼。',
        },

        // ── 波次 2：邏輯 bug ──────────────────────────────────
        {
            id: 'db_indent',
            wave: 1,
            buildingTypes: ['house', 'shop', 'hospital'],
            title: '🔍 Debug：縮排錯誤！',
            intro: '這個 for 迴圈只蓋了一棟房子，但應該要蓋三棟。問題在哪？',
            bugCode: `for i in range(3):
    r = 40 + i
build_house(r, 40, name="房子" + str(i))`,
            type: 'choice',
            question: '為什麼只蓋了一棟房子？',
            options: [
                { text: 'range(3) 應該改成 range(4)', correct: false, explain: 'range(3) 會產生 0, 1, 2 共三個數字，這是正確的。' },
                { text: 'build_house 那行缺少縮排，跑在迴圈外面', correct: true, explain: '對了！build_house 那行沒有縮排，所以不在 for 迴圈裡面，迴圈只改了 r 的值，建築只蓋一次。需要縮排 4 個空格！' },
                { text: 'str(i) 用法錯誤', correct: false, explain: 'str(i) 可以把數字轉字串，語法是正確的。' },
                { text: 'r = 40 + i 應該在迴圈外', correct: false, explain: '如果 r 在迴圈外，每次迴圈 r 就不會改變了，這樣更不對！' },
            ],
            successMsg: '✓ 縮排決定了程式碼的「層次」，迴圈內的程式碼要縮排 4 格！',
        },
        {
            id: 'db_offbyone',
            wave: 1,
            buildingTypes: ['park', 'fountain', 'library'],
            title: '🔍 Debug：差一的錯誤！',
            intro: '工程師想蓋 5 間連排商店，但執行後只出現了 4 間。找出 bug！',
            bugCode: `# 蓋 5 間連排商店
for i in range(1, 5):
    build_shop(40, 40 + i, name="商店" + str(i))`,
            type: 'choice',
            question: '為什麼只出現 4 間商店？',
            options: [
                { text: 'range(1, 5) 只產生 1, 2, 3, 4，共 4 個數字', correct: true, explain: '完全正確！range(start, stop) 不包含 stop，所以 range(1,5) 是 1, 2, 3, 4 共 4 次。要 5 間要改成 range(1, 6) 或 range(5)。' },
                { text: '40 + i 座標計算錯誤', correct: false, explain: '座標計算本身沒問題，問題在迴圈執行幾次。' },
                { text: 'build_shop 的 name 參數格式不對', correct: false, explain: 'str(i) 轉換是正確的。' },
                { text: '沒有 bug，就是 4 間', correct: false, explain: '注意題目說要蓋 5 間，仔細看 range 的參數！' },
            ],
            successMsg: '✓ range(1, n) 執行 n-1 次！要記得 Python 的 range 不包含終止值。',
        },

        // ── 波次 3：實作 debug ────────────────────────────────
        {
            id: 'db_fix_code_1',
            wave: 2,
            buildingTypes: ['school', 'hospital', 'power_tower'],
            title: '🔧 實作 Debug：修正程式碼！',
            intro: '這段程式碼應該蓋 3 棟房子，但有 bug 無法執行。請修正它！',
            bugCode: `r = 40
for i in range(3)
    build_house(r + i, 40, name="房子" + str(i+1))`,
            type: 'practice',
            question: '修正上面的程式碼，讓它能蓋出 3 棟連續的房子：',
            starterCode: `r = 40
for i in range(3)
    build_house(r + i, 40, name="房子" + str(i+1))`,
            hint: 'for 迴圈那行後面缺少了一個符號。Python 中 if、for、while、def 後面都必須有「:」冒號！',
            check: (code) => {
                return /for\s+\w+\s+in\s+range\s*\(\s*3\s*\)\s*:/.test(code) &&
                    /build_house\s*\(/.test(code);
            },
            errMsg: '還沒修好！提示：for 那行後面缺少了一個符號。',
            successMsg: '✓ 完美！for 迴圈後面要加冒號 :，這是 Python 的規定。',
        },
        {
            id: 'db_fix_code_2',
            wave: 2,
            buildingTypes: ['library', 'fountain', 'shop'],
            title: '🔧 實作 Debug：變數計算 bug！',
            intro: '工程師想在城市中心蓋公園，但公園出現在錯誤的位置。找出並修正 bug！',
            bugCode: `center = 40
# 想在中心右邊 3 格蓋公園
build_park(center, center + "3", name="中央公園")`,
            type: 'practice',
            question: '修正這段程式碼，讓公園蓋在正確的位置（center+3）：',
            starterCode: `center = 40
# 想在中心右邊 3 格蓋公園
build_park(center, center + "3", name="中央公園")`,
            hint: '"3" 是字串，不能和數字 center 相加。去掉引號讓 3 變成整數！',
            check: (code) => {
                return /build_park\s*\(/.test(code) &&
                    !/center\s*\+\s*["']/.test(code) &&
                    /center\s*\+\s*3/.test(code);
            },
            errMsg: '還有問題！數字不需要引號，"3" 是字串，3 才是整數。',
            successMsg: '✓ 對了！數字運算要用整數，不能加引號變成字串。',
        },
    ];

    // ── 三維驚嘆號 Sprite（用 canvas 繪製） ──────────────────────
    function makeExclSprite(scene, x, y, z) {
        const canvas = document.createElement('canvas');
        canvas.width = 128; canvas.height = 128;
        const ctx = canvas.getContext('2d');

        ctx.beginPath();
        ctx.arc(64, 64, 56, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 200, 0, 0.92)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 5;
        ctx.stroke();

        ctx.fillStyle = '#1a1100';
        ctx.font = 'bold 72px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('!', 64, 68);

        const tex = new THREE.CanvasTexture(canvas);
        const smat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
        const sprite = new THREE.Sprite(smat);
        sprite.position.set(x, y, z);
        sprite.scale.set(7, 7, 1);
        sprite.renderOrder = 999;
        scene.add(sprite);
        _markerObjs.push(sprite);
        return sprite;
    }

    // ── 找一個合適的建築和題目來顯示驚嘆號 ──────────────────────
    function pickBuildingAndChallenge(_wave) {
        if (_activeMarkers.size >= MAX_ACTIVE) return null;

        const registry = window._cityBuildingRegistry;
        if (!registry || registry.size === 0) return null;

        const availableChallenges = DEBUG_CHALLENGES.filter(c =>
            !_dismissed.has(c.id) &&
            !_activeChallengIds.has(c.id)
        );
        if (availableChallenges.length === 0) return null;

        let eligibleBuildings = [];
        registry.forEach((data, key) => {
            if (!_shownKeys.has(key) && !_activeMarkers.has(key)) {
                eligibleBuildings.push({ key, data });
            }
        });

        if (eligibleBuildings.length === 0) {
            _shownKeys.clear();
            registry.forEach((data, key) => {
                if (!_activeMarkers.has(key)) {
                    eligibleBuildings.push({ key, data });
                }
            });
        }
        if (eligibleBuildings.length === 0) return null;

        let bestPairs = [];
        for (const bld of eligibleBuildings) {
            for (const chal of availableChallenges) {
                if (chal.buildingTypes.includes(bld.data.type)) {
                    bestPairs.push({ building: bld, challenge: chal });
                }
            }
        }

        if (bestPairs.length === 0) {
            for (const bld of eligibleBuildings) {
                for (const chal of availableChallenges) {
                    bestPairs.push({ building: bld, challenge: chal });
                }
            }
        }
        if (bestPairs.length === 0) return null;

        return bestPairs[Math.floor(Math.random() * bestPairs.length)];
    }

    // ── 顯示驚嘆號 ───────────────────────────────────────────────
    function spawnMarker(wave) {
        const scene = window._cityScene;
        if (!scene) return;

        const picked = pickBuildingAndChallenge(wave);
        if (!picked) return;

        const { building: { key, data }, challenge } = picked;

        const sprite = makeExclSprite(scene, data.x, data.topY + 3, data.z);

        let blinkT = 0;
        const blinkInterval = setInterval(() => {
            blinkT += 0.08;
            const scale = 6.5 + Math.sin(blinkT * 2.5) * 0.8;
            sprite.scale.set(scale, scale, 1);
            sprite.material.opacity = 0.75 + Math.sin(blinkT * 3) * 0.25;
        }, 50);

        _shownKeys.add(key);
        _activeChallengIds.add(challenge.id);
        _activeMarkers.set(key, { sprite, challenge, blinkInterval, data });
    }

    // ── 點擊偵測 ─────────────────────────────────────────────────
    let _raycaster = null;
    let _mouse = new THREE.Vector2();

    function initClickDetect() {
        const container = document.getElementById('mapContainer');
        if (!container) return;

        container.addEventListener('click', (e) => {
            if (!window._cityScene || !window._cityCamera) return;
            const rect = container.getBoundingClientRect();
            _mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            _mouse.y = ((e.clientY - rect.top) / rect.height) * -2 + 1;

            if (!_raycaster) _raycaster = new THREE.Raycaster();
            _raycaster.setFromCamera(_mouse, window._cityCamera);

            const sprites = [..._activeMarkers.values()].map(m => m.sprite);
            const hits = _raycaster.intersectObjects(sprites);
            if (hits.length > 0) {
                _activeMarkers.forEach((markerData, key) => {
                    if (markerData.sprite === hits[0].object) {
                        openDebugModal(key);
                    }
                });
            }
        });
    }

    // ── 彈出 Debug 視窗 ──────────────────────────────────────────
    function openDebugModal(key) {
        const markerData = _activeMarkers.get(key);
        if (!markerData) return;
        const { challenge } = markerData;

        const overlay = document.getElementById('debugOverlay');
        if (!overlay) return;

        document.getElementById('dbTitle').textContent = challenge.title;
        document.getElementById('dbIntro').textContent = challenge.intro;
        document.getElementById('dbBugCode').textContent = challenge.bugCode;
        document.getElementById('dbQuestion').textContent = challenge.question;

        document.getElementById('dbChoiceSection').style.display = challenge.type === 'choice' ? 'block' : 'none';
        document.getElementById('dbPracticeSection').style.display = challenge.type === 'practice' ? 'block' : 'none';

        if (challenge.type === 'choice') {
            const optsEl = document.getElementById('dbOptions');
            optsEl.innerHTML = '';
            delete optsEl.dataset.answered;

            challenge.options.forEach((opt, i) => {
                const letters = ['A', 'B', 'C', 'D'];
                const div = document.createElement('div');
                div.className = 'db-opt';
                div.innerHTML = `<span class="db-opt-letter">${letters[i]}</span><span>${opt.text}</span>`;
                div.addEventListener('click', () => handleChoiceAnswer(div, opt, challenge, key, optsEl));
                optsEl.appendChild(div);
            });
        } else {
            const ta = document.getElementById('dbCodeArea');
            ta.value = challenge.starterCode || '';
            document.getElementById('dbHintBox').style.display = 'none';
            document.getElementById('dbHintBox').textContent = challenge.hint || '';
            document.getElementById('dbFeedback').className = 'db-feedback';
        }

        document.getElementById('dbFeedback').className = 'db-feedback';

        const oldBtn = document.getElementById('dbCompleteBtn');
        if (oldBtn) oldBtn.remove();

        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';

        overlay.dataset.currentKey = key;
        overlay.dataset.challengeId = challenge.id;
    }

    function handleChoiceAnswer(div, opt, challenge, key, optsEl) {
        if (optsEl.dataset.answered) return;
        optsEl.dataset.answered = '1';
        optsEl.querySelectorAll('.db-opt').forEach(o => { o.style.pointerEvents = 'none'; });

        const fb = document.getElementById('dbFeedback');
        if (opt.correct) {
            div.classList.add('correct');
            fb.className = 'db-feedback ok';
            fb.innerHTML = `✓ ${opt.explain}<br><br>${challenge.successMsg}`;
            setTimeout(() => showCompleteBtn(key, challenge.id), 600);
        } else {
            div.classList.add('wrong');
            fb.className = 'db-feedback err';
            fb.textContent = `✗ ${opt.explain}`;
            optsEl.querySelectorAll('.db-opt').forEach((o, i) => {
                if (challenge.options[i].correct) o.classList.add('correct');
            });
            setTimeout(() => showCompleteBtn(key, challenge.id), 1200);
        }
    }

    function showCompleteBtn(key, challengeId) {
        const existingBtn = document.getElementById('dbCompleteBtn');
        if (existingBtn) existingBtn.remove();
        const fb = document.getElementById('dbFeedback');
        const btn = document.createElement('button');
        btn.id = 'dbCompleteBtn';
        btn.className = 'db-btn db-btn-done';
        btn.textContent = '✓ 完成，移除驚嘆號';
        btn.addEventListener('click', () => {
            dismissMarker(key, challengeId);
            closeDebugModal();
        });
        fb.parentNode.insertBefore(btn, fb.nextSibling);
    }

    function dismissMarker(key, challengeId) {
        const markerData = _activeMarkers.get(key);
        if (markerData) {
            clearInterval(markerData.blinkInterval);
            const scene = window._cityScene;
            if (scene) scene.remove(markerData.sprite);
            const idx = _markerObjs.indexOf(markerData.sprite);
            if (idx !== -1) _markerObjs.splice(idx, 1);
            _activeMarkers.delete(key);
        }
        _dismissed.add(challengeId);
        _activeChallengIds.delete(challengeId);
    }

    function closeDebugModal() {
        const overlay = document.getElementById('debugOverlay');
        if (overlay) overlay.classList.remove('open');
        document.body.style.overflow = '';
        const btn = document.getElementById('dbCompleteBtn');
        if (btn) btn.remove();
    }

    // ── 建築增加時的回呼 ─────────────────────────────────────────
    function onBuildingAdded(count) {
        if (!window.LessonSystem || !window.LessonSystem.isUnlocked('build_park')) return;
        setTimeout(() => {
            trySpawnForWave(0);
        }, 800);
    }

    function trySpawnForWave(wave) {
        if (_activeMarkers.size >= MAX_ACTIVE) return;

        const hasAvailable = DEBUG_CHALLENGES.some(c =>
            !_dismissed.has(c.id) &&
            !_activeChallengIds.has(c.id)
        );
        if (!hasAvailable) {
            _dismissed.clear();
            _activeChallengIds.clear();
        }

        spawnMarker(wave);
    }

    // ── 清除所有 markers ──────────────────────────────────────────
    function clearAllMarkers() {
        _activeMarkers.forEach(({ sprite, blinkInterval }) => {
            clearInterval(blinkInterval);
            const scene = window._cityScene;
            if (scene) scene.remove(sprite);
        });
        _activeMarkers.clear();
        _activeChallengIds.clear();
        _markerObjs = [];
    }

    // ── 注入 Modal HTML ───────────────────────────────────────────
    function injectModal() {
        if (document.getElementById('debugOverlay')) return;

        const badge = document.createElement('div');
        badge.id = 'debugWaveBadge';
        document.body.appendChild(badge);

        const overlay = document.createElement('div');
        overlay.id = 'debugOverlay';
        overlay.innerHTML = `
            <div id="debugModal">
                <div class="db-header">
                    <span class="db-header-icon">⚠️</span>
                    <span id="dbTitle">Debug 挑戰</span>
                    <button class="db-close" id="dbClose">✕</button>
                </div>
                <div class="db-body">
                    <p class="db-intro" id="dbIntro"></p>

                    <span class="db-label">🐛 有問題的程式碼</span>
                    <pre class="db-code-block" id="dbBugCode"></pre>

                    <p class="db-question" id="dbQuestion"></p>

                    <!-- 選擇題 -->
                    <div id="dbChoiceSection">
                        <div class="db-opts" id="dbOptions"></div>
                    </div>

                    <!-- 實作題 -->
                    <div id="dbPracticeSection" style="display:none;">
                        <div id="dbHintBox" class="db-hint-box" style="display:none;"></div>
                        <div class="db-editor-wrap">
                            <div class="db-editor-bar">
                                <span style="width:8px;height:8px;border-radius:50%;background:#ff5f57;display:inline-block;"></span>
                                <span style="width:8px;height:8px;border-radius:50%;background:#ffbd2e;display:inline-block;"></span>
                                <span style="width:8px;height:8px;border-radius:50%;background:#28ca41;display:inline-block;"></span>
                                <span style="margin-left:6px;">debug_practice.py</span>
                            </div>
                            <textarea id="dbCodeArea" spellcheck="false" placeholder="在這裡修正程式碼…"></textarea>
                        </div>
                        <div class="db-btn-row">
                            <button class="db-btn db-btn-run" id="dbRunBtn">▶ 測試修正</button>
                            <button class="db-btn db-btn-hint" id="dbHintBtn">💡 顯示提示</button>
                        </div>
                    </div>

                    <div class="db-feedback" id="dbFeedback"></div>
                </div>
            </div>`;
        document.body.appendChild(overlay);

        document.getElementById('dbClose').addEventListener('click', closeDebugModal);
        overlay.addEventListener('click', e => { if (e.target === overlay) closeDebugModal(); });

        document.getElementById('dbCodeArea').addEventListener('keydown', e => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const ta = e.target, s = ta.selectionStart;
                ta.value = ta.value.substring(0, s) + '    ' + ta.value.substring(ta.selectionEnd);
                ta.selectionStart = ta.selectionEnd = s + 4;
            }
        });

        document.getElementById('dbRunBtn').addEventListener('click', () => {
            const overlay = document.getElementById('debugOverlay');
            const challengeId = overlay.dataset.challengeId;
            const key = overlay.dataset.currentKey;
            const challenge = DEBUG_CHALLENGES.find(c => c.id === challengeId);
            if (!challenge || challenge.type !== 'practice') return;

            const code = document.getElementById('dbCodeArea').value;
            const fb = document.getElementById('dbFeedback');

            if (!code.trim()) {
                fb.className = 'db-feedback err';
                fb.textContent = '請輸入修正後的程式碼！';
                return;
            }

            if (challenge.check(code)) {
                fb.className = 'db-feedback ok';
                fb.textContent = challenge.successMsg;
                setTimeout(() => showCompleteBtn(key, challengeId), 500);
            } else {
                fb.className = 'db-feedback err';
                fb.textContent = challenge.errMsg;
            }
        });

        document.getElementById('dbHintBtn').addEventListener('click', () => {
            const hintBox = document.getElementById('dbHintBox');
            const overlay = document.getElementById('debugOverlay');
            const challengeId = overlay.dataset.challengeId;
            const challenge = DEBUG_CHALLENGES.find(c => c.id === challengeId);
            if (!challenge) return;
            hintBox.textContent = challenge.hint || '沒有額外提示，仔細看程式碼！';
            hintBox.style.display = hintBox.style.display === 'none' ? 'block' : 'none';
        });
    }

    // ── 顯示波次提示 badge ────────────────────────────────────────
    function showWaveBadge(msg) {
        const badge = document.getElementById('debugWaveBadge');
        if (!badge) return;
        badge.textContent = msg;
        badge.style.display = 'block';
        clearTimeout(badge._timer);
        badge._timer = setTimeout(() => { badge.style.display = 'none'; }, 3500);
    }

    // ── init ──────────────────────────────────────────────────────
    function init() {
        injectModal();
        initClickDetect();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 500);
    }

    return {
        onBuildingAdded,
        clearAllMarkers,
        openDebugModal,
        showWaveBadge,
    };
})();