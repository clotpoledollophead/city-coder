window.AIAssistant = (function () {

    const WORKER_URL = 'api/chat';

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

    // ── Inject styles ─────────────────────────────────────────
    function injectStyles() {
        if (document.getElementById('ai-assistant-styles')) return;
        const s = document.createElement('style');
        s.id = 'ai-assistant-styles';
        s.textContent = `
#aiBtn {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 3000;
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: linear-gradient(135deg, #00ff88, #00ccff);
    border: none;
    cursor: pointer;
    box-shadow: 0 0 20px rgba(0,255,136,0.5), 0 4px 16px rgba(0,0,0,0.4);
    font-size: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s, box-shadow 0.2s;
    animation: aiBtnPulse 3s ease-in-out infinite;
}
@keyframes aiBtnPulse {
    0%, 100% { box-shadow: 0 0 20px rgba(0,255,136,0.5), 0 4px 16px rgba(0,0,0,0.4); }
    50%       { box-shadow: 0 0 35px rgba(0,255,136,0.8), 0 4px 20px rgba(0,0,0,0.5); }
}
#aiBtn:hover { transform: scale(1.1); }
#aiBtn.open  { animation: none; background: linear-gradient(135deg, #ff006e, #ff4090); }

#aiPanel {
    position: fixed;
    bottom: 88px;
    right: 24px;
    z-index: 3000;
    width: 340px;
    max-height: 520px;
    background: linear-gradient(145deg, #080d22 0%, #0f1530 100%);
    border: 1.5px solid rgba(0,255,136,0.35);
    border-radius: 16px;
    box-shadow: 0 0 50px rgba(0,255,136,0.12), 0 20px 60px rgba(0,0,0,0.7);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transform: scale(0.85) translateY(20px);
    opacity: 0;
    pointer-events: none;
    transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s ease;
    transform-origin: bottom right;
}
#aiPanel.open {
    transform: scale(1) translateY(0);
    opacity: 1;
    pointer-events: all;
}

#aiPanelHeader {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 16px 12px;
    border-bottom: 1px solid rgba(0,255,136,0.15);
    background: rgba(0,255,136,0.05);
    flex-shrink: 0;
}
#aiPanelHeader .ai-avatar {
    font-size: 1.6rem;
    line-height: 1;
    filter: drop-shadow(0 0 6px rgba(0,255,136,0.5));
}
.ai-header-text { flex: 1; }
.ai-header-text .ai-name {
    font-family: 'Jersey 15', sans-serif;
    font-size: 1.1rem;
    color: #00ffff;
    letter-spacing: 1px;
    text-shadow: 0 0 8px rgba(0,255,255,0.4);
    display: block;
}
.ai-header-text .ai-status {
    font-family: 'Oxanium', monospace;
    font-size: 0.65rem;
    color: rgba(0,255,136,0.5);
    letter-spacing: 1px;
}
.ai-header-text .ai-status.thinking {
    color: #f5a623;
    animation: aiThinkBlink 0.8s step-end infinite;
}
@keyframes aiThinkBlink { 50% { opacity: 0.3; } }

#aiCloseBtn {
    background: none;
    border: 1px solid rgba(0,255,136,0.2);
    color: rgba(0,255,136,0.4);
    width: 26px; height: 26px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.85rem;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s;
    flex-shrink: 0;
}
#aiCloseBtn:hover { color: #00ff88; border-color: #00ff88; background: rgba(0,255,136,0.08); }

#aiMessages {
    flex: 1;
    overflow-y: auto;
    padding: 14px 14px 6px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    scrollbar-width: thin;
    scrollbar-color: rgba(0,255,136,0.2) transparent;
}
#aiMessages::-webkit-scrollbar { width: 3px; }
#aiMessages::-webkit-scrollbar-thumb { background: rgba(0,255,136,0.2); border-radius: 2px; }

.ai-msg {
    display: flex;
    gap: 8px;
    animation: aiMsgIn 0.25s ease;
    max-width: 100%;
}
@keyframes aiMsgIn {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
}
.ai-msg.user { flex-direction: row-reverse; }

.ai-msg-bubble {
    max-width: 78%;
    padding: 9px 12px;
    border-radius: 12px;
    font-family: 'Oxanium', sans-serif;
    font-size: 0.82rem;
    line-height: 1.7;
    white-space: pre-wrap;
    word-break: break-word;
}
.ai-msg.bot .ai-msg-bubble {
    background: rgba(0,255,136,0.07);
    border: 1px solid rgba(0,255,136,0.18);
    color: rgba(200,240,255,0.88);
    border-radius: 4px 12px 12px 12px;
}
.ai-msg.user .ai-msg-bubble {
    background: rgba(0,200,255,0.1);
    border: 1px solid rgba(0,200,255,0.25);
    color: rgba(200,240,255,0.9);
    border-radius: 12px 4px 12px 12px;
}
.ai-msg-avatar {
    font-size: 1.2rem;
    flex-shrink: 0;
    margin-top: 2px;
    line-height: 1;
}

.ai-typing-indicator {
    display: flex;
    gap: 5px;
    align-items: center;
    padding: 10px 14px;
}
.ai-typing-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: rgba(0,255,136,0.5);
    animation: aiDotBounce 1.2s ease-in-out infinite;
}
.ai-typing-dot:nth-child(2) { animation-delay: 0.2s; }
.ai-typing-dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes aiDotBounce {
    0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
    40%           { transform: translateY(-6px); opacity: 1; }
}

#aiSuggestions {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    padding: 6px 14px 2px;
    flex-shrink: 0;
}
.ai-suggestion {
    font-family: 'Oxanium', monospace;
    font-size: 0.7rem;
    padding: 4px 10px;
    border-radius: 20px;
    background: rgba(0,255,136,0.05);
    border: 1px solid rgba(0,255,136,0.2);
    color: rgba(0,255,136,0.55);
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
}
.ai-suggestion:hover {
    background: rgba(0,255,136,0.12);
    border-color: rgba(0,255,136,0.5);
    color: #00ff88;
}

#aiInputRow {
    display: flex;
    gap: 7px;
    padding: 10px 12px 12px;
    border-top: 1px solid rgba(0,255,136,0.12);
    background: rgba(0,0,0,0.2);
    flex-shrink: 0;
}
#aiInput {
    flex: 1;
    background: rgba(0,0,0,0.35);
    border: 1px solid rgba(0,255,136,0.22);
    border-radius: 8px;
    color: rgba(200,240,255,0.9);
    font-family: 'Oxanium', monospace;
    font-size: 0.82rem;
    padding: 8px 11px;
    outline: none;
    resize: none;
    height: 38px;
    max-height: 100px;
    line-height: 1.5;
    transition: border-color 0.15s;
    overflow-y: hidden;
}
#aiInput:focus { border-color: rgba(0,255,136,0.5); }
#aiInput::placeholder { color: rgba(0,255,136,0.2); }
#aiSendBtn {
    background: #00ff88;
    color: #040e12;
    border: none;
    border-radius: 8px;
    width: 36px;
    height: 38px;
    cursor: pointer;
    font-size: 1rem;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    transition: all 0.15s;
    box-shadow: 0 0 10px rgba(0,255,136,0.3);
}
#aiSendBtn:hover { background: #33ffaa; box-shadow: 0 0 18px rgba(0,255,136,0.55); }
#aiSendBtn:disabled { opacity: 0.4; cursor: not-allowed; }
        `;
        document.head.appendChild(s);
    }

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
        injectStyles();
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