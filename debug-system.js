// ═══════════════════════════════════════════════════════════════
//  debug-system.js — CodeScape 驚嘆號 Debug 教學系統
//
//  當玩家在地圖上蓋了一定數量的建築後，
//  隨機在幾棟建築物上方出現閃爍的「！」提示，
//  點擊後彈出 debug 教學視窗。
// ═══════════════════════════════════════════════════════════════

window.DebugSystem = (function () {

    // ── 觸發門檻（蓋了幾棟建築後才開始出現驚嘆號）──────────────
    const THRESHOLDS = [3, 6, 10];  // 第一波、第二波、第三波
    const MAX_PER_WAVE = [1, 2, 2]; // 每波最多幾個驚嘆號同時存在
    let _waveIndex = 0;             // 目前解鎖到第幾波
    let _activeMarkers = new Map(); // key→r,c  value→{ sprite, data }
    let _shownKeys = new Set();     // 已經出現過的建築（避免重複）
    let _dismissed = new Set();     // 已經完成的 debug 課題
    let _markerObjs = [];           // THREE.js sprites for cleanup

    // ── Debug 題庫 ──────────────────────────────────────────────
    // 每題包含：type（選擇/實作）、bugCode（有 bug 的程式碼）、
    // explanation、hint、check（實作題用）
    const DEBUG_CHALLENGES = [
        // ── 波次 1：基礎語法 bug ──────────────────────────────
        {
            id: 'db_parenthesis',
            wave: 0,
            requiresLesson: 'build_house',
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
            requiresLesson: 'build_park',
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
            requiresLesson: 'build_shop',
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
            requiresLesson: 'build_shop',
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
            requiresLesson: 'build_shop',
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
            requiresLesson: 'build_park',
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

    // ── 找一個合適的建築來顯示驚嘆號 ────────────────────────────
    function pickBuilding(wave) {
        const maxCount = MAX_PER_WAVE[wave] || 1;
        if (_activeMarkers.size >= maxCount) return null;

        // ★ 修改：移除課程解鎖限制，讓題目總是可以出現
        const challenges = DEBUG_CHALLENGES.filter(c => c.wave === wave);
        if (challenges.length === 0) return null;

        const registry = window._cityBuildingRegistry;
        if (!registry || registry.size === 0) return null;

        const eligible = [];
        registry.forEach((data, key) => {
            if (!_shownKeys.has(key) && !_activeMarkers.has(key)) {
                const matchingChals = challenges.filter(c => c.buildingTypes.includes(data.type));
                if (matchingChals.length > 0) eligible.push({ key, data, matchingChals });
            }
        });

        if (eligible.length === 0) {
            // 若無類型匹配，隨機選任何未使用建築
            const allEligible = [];
            registry.forEach((data, key) => {
                if (!_shownKeys.has(key) && !_activeMarkers.has(key)) {
                    allEligible.push({ key, data, matchingChals: challenges });
                }
            });
            if (allEligible.length === 0) return null;
            return allEligible[Math.floor(Math.random() * allEligible.length)];
        }

        return eligible[Math.floor(Math.random() * eligible.length)];
    }

    // ── 顯示驚嘆號 ───────────────────────────────────────────────
    function spawnMarker(wave) {
        const scene = window._cityScene;
        if (!scene) return;

        const picked = pickBuilding(wave);
        if (!picked) return;

        const { key, data, matchingChals } = picked;

        const available = matchingChals.filter(c => !_dismissed.has(c.id));
        if (available.length === 0) return;
        const challenge = available[Math.floor(Math.random() * available.length)];

        const sprite = makeExclSprite(scene, data.x, data.topY + 3, data.z);

        let blinkT = 0;
        const blinkInterval = setInterval(() => {
            blinkT += 0.08;
            const scale = 6.5 + Math.sin(blinkT * 2.5) * 0.8;
            sprite.scale.set(scale, scale, 1);
            sprite.material.opacity = 0.75 + Math.sin(blinkT * 3) * 0.25;
        }, 50);

        _shownKeys.add(key);
        _activeMarkers.set(key, { sprite, challenge, blinkInterval, data });

        _pendingClick = { key };
    }

    // ── 點擊偵測 ─────────────────────────────────────────────────
    let _pendingClick = null;
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
        // ★ 修改：從最高波次往下找，確保 _waveIndex 正確更新
        for (let w = THRESHOLDS.length - 1; w >= 0; w--) {
            if (count >= THRESHOLDS[w]) {
                _waveIndex = w;
                break;
            }
        }
        setTimeout(() => {
            trySpawnForWave(_waveIndex);
        }, 800);
    }

    function trySpawnForWave(wave) {
        const maxCount = MAX_PER_WAVE[wave] || 1;
        if (_activeMarkers.size >= maxCount) return;

        // ★ 修改：第一波 100%，後續波次 80%，大幅提高出現頻率
        const roll = wave === 0 ? 0 : Math.random();
        if (roll > 0.80) return;

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
        _markerObjs = [];
    }

    // ── 注入 CSS ──────────────────────────────────────────────────
    function injectStyles() {
        if (document.getElementById('debug-styles')) return;
        const s = document.createElement('style');
        s.id = 'debug-styles';
        s.textContent = `
#debugOverlay {
    display: none;
    position: fixed;
    inset: 0;
    z-index: 2000;
    background: rgba(4, 8, 28, 0.9);
    backdrop-filter: blur(8px);
    justify-content: center;
    align-items: center;
}
#debugOverlay.open { display: flex; }

#debugModal {
    background: linear-gradient(145deg, #080d22 0%, #0f1530 100%);
    border: 1.5px solid rgba(255, 200, 0, 0.4);
    border-radius: 16px;
    width: min(680px, 94vw);
    max-height: 88vh;
    overflow-y: auto;
    box-shadow: 0 0 60px rgba(255,200,0,0.15), 0 20px 60px rgba(0,0,0,0.7);
    animation: dbIn 0.3s cubic-bezier(0.34,1.56,0.64,1);
    scrollbar-width: thin;
    scrollbar-color: rgba(255,200,0,0.3) transparent;
}
@keyframes dbIn {
    from { opacity:0; transform:scale(0.88) translateY(20px); }
    to   { opacity:1; transform:scale(1) translateY(0); }
}
#debugModal::-webkit-scrollbar { width: 4px; }
#debugModal::-webkit-scrollbar-thumb { background: rgba(255,200,0,0.3); border-radius: 2px; }

.db-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 18px 22px 14px;
    border-bottom: 1px solid rgba(255,200,0,0.2);
    position: sticky;
    top: 0;
    z-index: 2;
    background: linear-gradient(145deg, #080d22, #0f1530);
}
.db-header-icon { font-size: 2rem; }
#dbTitle {
    font-family: 'Jersey 15', sans-serif;
    font-size: 1.4rem;
    color: #ffd700;
    letter-spacing: 1px;
    text-shadow: 0 0 12px rgba(255,215,0,0.4);
    flex: 1;
}
.db-close {
    background: none;
    border: 1px solid rgba(255,200,0,0.25);
    color: rgba(255,200,0,0.5);
    font-size: 1rem;
    width: 30px; height: 30px;
    border-radius: 7px;
    cursor: pointer;
    transition: all 0.15s;
    display: flex; align-items: center; justify-content: center;
}
.db-close:hover { color: #ffd700; border-color: #ffd700; background: rgba(255,200,0,0.08); }

.db-body { padding: 18px 22px; }

.db-intro {
    font-family: 'Oxanium', sans-serif;
    font-size: 0.9rem;
    color: rgba(200,240,255,0.8);
    line-height: 1.75;
    margin-bottom: 14px;
}

.db-label {
    font-family: 'Oxanium', monospace;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: rgba(255,200,0,0.6);
    margin-bottom: 7px;
    display: block;
}

.db-code-block {
    background: #06080f;
    border: 1px solid rgba(255,200,0,0.2);
    border-radius: 8px;
    padding: 12px 16px;
    font-family: 'Oxanium', monospace;
    font-size: 0.88rem;
    color: #f0e68c;
    white-space: pre;
    line-height: 1.9;
    margin-bottom: 16px;
    overflow-x: auto;
}

.db-question {
    font-family: 'Oxanium', sans-serif;
    font-size: 0.92rem;
    font-weight: 700;
    color: #fff;
    line-height: 1.5;
    margin-bottom: 12px;
}

.db-opts { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
.db-opt {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px 14px;
    border-radius: 8px;
    border: 1px solid rgba(255,200,0,0.18);
    background: rgba(0,0,0,0.3);
    color: rgba(200,240,255,0.75);
    font-family: 'Oxanium', sans-serif;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.15s;
    user-select: none;
    line-height: 1.55;
}
.db-opt:hover:not(.answered) { border-color: #ffd700; color: #fff; background: rgba(255,200,0,0.06); }
.db-opt.correct { border-color: #00ff88; background: rgba(0,255,136,0.1); color: #00ff88; }
.db-opt.wrong   { border-color: #ff6050; background: rgba(255,96,80,0.08); color: #ff8070; }
.db-opt-letter {
    font-family: 'Jersey 15', monospace;
    font-size: 1rem;
    min-width: 20px;
    text-align: center;
    color: #ffd700;
    flex-shrink: 0;
}

.db-editor-wrap {
    border: 1px solid rgba(255,200,0,0.22);
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 12px;
}
.db-editor-bar {
    display: flex; align-items: center; gap: 7px;
    padding: 5px 12px;
    background: rgba(255,200,0,0.07);
    border-bottom: 1px solid rgba(255,200,0,0.12);
    font-family: 'Oxanium', monospace;
    font-size: 10px; letter-spacing: 1px; color: rgba(255,200,0,0.4);
}
#dbCodeArea {
    width: 100%;
    min-height: 130px;
    background: #08080f;
    color: #ffd700;
    font-family: 'Oxanium', monospace;
    font-size: 13px;
    line-height: 1.75;
    padding: 12px 16px;
    border: none;
    outline: none;
    resize: vertical;
    tab-size: 4;
}
#dbCodeArea::placeholder { color: rgba(255,200,0,0.2); }

.db-hint-box {
    background: rgba(78,168,212,0.07);
    border: 1px solid rgba(78,168,212,0.28);
    border-radius: 7px;
    padding: 9px 14px;
    margin-bottom: 10px;
    font-family: 'Oxanium', monospace;
    font-size: 0.82rem;
    color: #4ea8d4;
    line-height: 1.75;
    white-space: pre-wrap;
}

.db-feedback {
    margin-top: 10px;
    padding: 11px 15px;
    border-radius: 8px;
    font-family: 'Oxanium', monospace;
    font-size: 0.83rem;
    line-height: 1.7;
    display: none;
}
.db-feedback.ok  { display: block; background: rgba(0,255,136,0.08); border: 1px solid rgba(0,255,136,0.3); color: #00ff88; }
.db-feedback.err { display: block; background: rgba(255,96,80,0.08); border: 1px solid rgba(255,96,80,0.3); color: #ff8070; }

.db-btn-row { display: flex; gap: 10px; align-items: center; margin-top: 12px; flex-wrap: wrap; }
.db-btn {
    font-family: 'Oxanium', monospace;
    font-size: 0.82rem;
    font-weight: 700;
    padding: 8px 18px;
    border-radius: 7px;
    border: none;
    cursor: pointer;
    transition: all 0.15s;
}
.db-btn-run { background: #ffd700; color: #1a1000; box-shadow: 0 0 12px rgba(255,215,0,0.35); }
.db-btn-run:hover { background: #ffe44d; box-shadow: 0 0 22px rgba(255,215,0,0.6); transform: translateY(-1px); }
.db-btn-hint { background: transparent; color: rgba(78,168,212,0.6); border: 1px solid rgba(78,168,212,0.35); }
.db-btn-hint:hover { color: #4ea8d4; border-color: #4ea8d4; }
.db-btn-done { background: #00ff88; color: #040e12; box-shadow: 0 0 14px rgba(0,255,136,0.4); margin-top: 8px; }
.db-btn-done:hover { background: #33ffaa; box-shadow: 0 0 26px rgba(0,255,136,0.65); transform: translateY(-1px); }

#debugWaveBadge {
    position: fixed;
    top: 70px;
    right: 16px;
    z-index: 1500;
    background: rgba(4,8,28,0.92);
    border: 1.5px solid rgba(255,200,0,0.5);
    border-radius: 8px;
    padding: 7px 14px;
    font-family: 'Oxanium', monospace;
    font-size: 0.78rem;
    color: #ffd700;
    box-shadow: 0 0 18px rgba(255,200,0,0.25);
    display: none;
    animation: badgeIn 0.4s cubic-bezier(0.34,1.56,0.64,1);
    pointer-events: none;
}
@keyframes badgeIn {
    from { opacity:0; transform: translateX(20px) scale(0.9); }
    to   { opacity:1; transform: translateX(0)    scale(1); }
}
        `;
        document.head.appendChild(s);
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
        injectStyles();
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