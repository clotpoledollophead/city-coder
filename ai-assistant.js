window.AIAssistant = (function () {

    const WORKER_URL = '/api/chat';

    const SYSTEM_PROMPT = `你是 CodeScape 未來程市的 AI 助手「科科」。
你的工作是幫助玩家學習 Python，並在這個城市建造遊戲中提供支援。

遊戲背景：
- 玩家用 Python 程式碼在 3D 島嶼地圖上建造城市
- 有效座標約 row 25–55, col 25–55（懸停地圖可查）
- 可用函式：build_house(row,col,floors,name), build_park, build_library, build_school, build_hospital, build_shop, build_road(row,col,direction), build_power_tower, build_fountain, build_streetlight, clear_all()
- build_road 的 direction 參數："h" 水平，"v" 垂直

回答規則：
- 用繁體中文回答
- 回答要簡短友善，像在跟學生聊天
- 如果是程式碼問題，提供可以直接複製貼上的範例
- 如果問題跟遊戲或 Python 無關，溫和地引導回主題
- 不要用 markdown 標題（##），可以用 emoji 讓回答更活潑`;

    let history = []; // conversation history

    // ── Inject HTML ───────────────────────────────────────────
    function injectHTML() {
        if (document.getElementById('aiBtn')) return;

        // Floating button
        const btn = document.createElement('button');
        btn.id = 'aiBtn';
        btn.title = '詢問 AI 助手科科';
        btn.innerHTML = '🤖';
        document.body.appendChild(btn);

        // Panel
        const panel = document.createElement('div');
        panel.id = 'aiPanel';
        panel.innerHTML = `
            <div id="aiPanelHeader">
                <span class="ai-avatar">🤖</span>
                <div class="ai-header-text">
                    <span class="ai-name">科科 AI 助手</span>
                    <span class="ai-status" id="aiStatus">● 線上</span>
                </div>
                <button id="aiCloseBtn">✕</button>
            </div>
            <div id="aiMessages"></div>
            <div id="aiSuggestions">
                <span class="ai-suggestion" data-q="怎麼蓋一排商店？">怎麼蓋一排商店？</span>
                <span class="ai-suggestion" data-q="for 迴圈怎麼用？">for 迴圈怎麼用？</span>
                <span class="ai-suggestion" data-q="座標要填多少？">座標要填多少？</span>
                <span class="ai-suggestion" data-q="蓋路要怎麼蓋？">蓋路要怎麼蓋？</span>
            </div>
            <div id="aiInputRow">
                <textarea id="aiInput" placeholder="問科科任何問題…" rows="1"></textarea>
                <button id="aiSendBtn">➤</button>
            </div>`;
        document.body.appendChild(panel);
    }

    // ── UI helpers ────────────────────────────────────────────
    let panelOpen = false;

    function togglePanel() {
        panelOpen = !panelOpen;
        document.getElementById('aiPanel').classList.toggle('open', panelOpen);
        document.getElementById('aiBtn').classList.toggle('open', panelOpen);
        if (panelOpen && document.getElementById('aiMessages').children.length === 0) {
            addBotMessage('嗨！我是科科 🏙️ 你的 CodeScape 助手！\n\n有任何 Python 或城市建造的問題都可以問我喔！');
        }
        if (panelOpen) setTimeout(() => document.getElementById('aiInput').focus(), 300);
    }

    function addBotMessage(text) {
        const msgs = document.getElementById('aiMessages');
        const div = document.createElement('div');
        div.className = 'ai-msg bot';
        div.innerHTML = `<span class="ai-msg-avatar">🤖</span><div class="ai-msg-bubble">${escapeHtml(text)}</div>`;
        msgs.appendChild(div);
        msgs.scrollTop = msgs.scrollHeight;
    }

    function addUserMessage(text) {
        const msgs = document.getElementById('aiMessages');
        const div = document.createElement('div');
        div.className = 'ai-msg user';
        div.innerHTML = `<div class="ai-msg-bubble">${escapeHtml(text)}</div><span class="ai-msg-avatar">👤</span>`;
        msgs.appendChild(div);
        msgs.scrollTop = msgs.scrollHeight;
    }

    function showTyping() {
        const msgs = document.getElementById('aiMessages');
        const div = document.createElement('div');
        div.className = 'ai-msg bot';
        div.id = 'aiTyping';
        div.innerHTML = `<span class="ai-msg-avatar">🤖</span>
            <div class="ai-msg-bubble ai-typing-indicator">
                <div class="ai-typing-dot"></div>
                <div class="ai-typing-dot"></div>
                <div class="ai-typing-dot"></div>
            </div>`;
        msgs.appendChild(div);
        msgs.scrollTop = msgs.scrollHeight;
        return div;
    }

    function removeTyping() {
        document.getElementById('aiTyping')?.remove();
    }

    function setStatus(text, thinking = false) {
        const el = document.getElementById('aiStatus');
        if (!el) return;
        el.textContent = text;
        el.className = 'ai-status' + (thinking ? ' thinking' : '');
    }

    function setInputEnabled(enabled) {
        document.getElementById('aiInput').disabled = !enabled;
        document.getElementById('aiSendBtn').disabled = !enabled;
    }

    function escapeHtml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br>');
    }

    // ── Gemini API call ───────────────────────────────────────
    async function askGemini(userMessage) {
        // Add to history
        history.push({ role: 'user', parts: [{ text: userMessage }] });

        const body = {
            system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: history,
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 512,
            }
        };

        const response = await fetch(WORKER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err?.error?.message || `API 錯誤 ${response.status}`);
        }

        const data = await response.json();
        const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || '（無回應）';

        // Save assistant reply to history
        history.push({ role: 'model', parts: [{ text: replyText }] });

        // Keep history from growing too large (last 20 turns)
        if (history.length > 20) history = history.slice(history.length - 20);

        return replyText;
    }

    // ── Send message ──────────────────────────────────────────
    async function sendMessage(text) {
        text = text.trim();
        if (!text) return;

        addUserMessage(text);
        document.getElementById('aiInput').value = '';
        document.getElementById('aiInput').style.height = '38px';
        document.getElementById('aiSuggestions').style.display = 'none';
        setInputEnabled(false);
        setStatus('● 思考中…', true);
        const typingEl = showTyping();

        try {
            const reply = await askGemini(text);
            removeTyping();
            addBotMessage(reply);
            setStatus('● 線上');
        } catch (err) {
            removeTyping();
            addBotMessage(`😅 糟糕，出了點問題：${err.message}\n\n請確認 API key 是否正確，或稍後再試！`);
            setStatus('● 線上');
            // Remove failed message from history
            history.pop();
        }

        setInputEnabled(true);
        document.getElementById('aiInput').focus();
    }

    // ── Event bindings ────────────────────────────────────────
    function bindEvents() {
        document.getElementById('aiBtn').addEventListener('click', togglePanel);
        document.getElementById('aiCloseBtn').addEventListener('click', togglePanel);

        const input = document.getElementById('aiInput');
        const sendBtn = document.getElementById('aiSendBtn');

        sendBtn.addEventListener('click', () => sendMessage(input.value));

        input.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input.value);
            }
        });

        // Auto-resize textarea
        input.addEventListener('input', () => {
            input.style.height = '38px';
            input.style.height = Math.min(input.scrollHeight, 100) + 'px';
        });

        // Quick suggestion chips
        document.querySelectorAll('.ai-suggestion').forEach(chip => {
            chip.addEventListener('click', () => sendMessage(chip.dataset.q));
        });
    }

    // ── Init ──────────────────────────────────────────────────
    function init() {
        injectHTML();
        bindEvents();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return { sendMessage, togglePanel };
})();