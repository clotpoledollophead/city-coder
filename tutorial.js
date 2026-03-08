// ── Starfield background ─────────────────────────────────────
(function () {
    const canvas = document.getElementById('stars-canvas');
    const ctx = canvas.getContext('2d');
    let W, H, stars = [];

    function resize() {
        W = canvas.width = window.innerWidth;
        H = canvas.height = window.innerHeight;
    }

    function init() {
        stars = [];
        for (let i = 0; i < 180; i++) {
            stars.push({
                x: Math.random() * W,
                y: Math.random() * H,
                r: Math.random() * 1.4 + 0.3,
                o: Math.random() * 0.5 + 0.1,
                s: Math.random() * 0.006 + 0.002,
                t: Math.random() * Math.PI * 2,
            });
        }
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);
        stars.forEach(s => {
            s.t += s.s;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(200,230,255,${s.o * (0.5 + 0.5 * Math.sin(s.t))})`;
            ctx.fill();
        });
        requestAnimationFrame(draw);
    }

    window.addEventListener('resize', () => { resize(); init(); });
    resize();
    init();
    draw();
})();


// ── Slide navigation ─────────────────────────────────────────
const TOTAL = 5;
let current = 0;

function buildProgress() {
    const bar = document.getElementById('progressBar');
    bar.innerHTML = '';
    for (let i = 0; i < TOTAL; i++) {
        if (i > 0) {
            const conn = document.createElement('div');
            conn.className = 'prog-connector' + (i <= current ? ' done' : '');
            bar.appendChild(conn);
        }
        const dot = document.createElement('div');
        dot.className = 'prog-dot' + (i === current ? ' active' : i < current ? ' done' : '');
        dot.title = '第 ' + (i + 1) + ' 頁';
        dot.addEventListener('click', (function (n) {
            return function () { goTo(n); };
        }(i)));
        bar.appendChild(dot);
    }
}

function goTo(n) {
    document.getElementById('slide-' + current).classList.remove('active');
    current = n;
    document.getElementById('slide-' + current).classList.add('active');

    document.getElementById('btnPrev').disabled = (current === 0);

    const nextBtn = document.getElementById('btnNext');
    if (current === TOTAL - 1) {
        nextBtn.textContent = '🚀 開始蓋城市！';
        nextBtn.className = 'nav-btn finish';
        // ── 修改：加上 ?tutorial=done 觸發解鎖動畫 ──
        nextBtn.onclick = function () { window.location.href = 'app.html?tutorial=done'; };
    } else {
        nextBtn.textContent = '下一頁 →';
        nextBtn.className = 'nav-btn next';
        nextBtn.onclick = function () { changeSlide(1); };
    }

    buildProgress();

    // Trigger animated run-steps on slide 3 (index 3)
    if (current === 3) animateRunSteps();

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function changeSlide(dir) {
    goTo(Math.max(0, Math.min(TOTAL - 1, current + dir)));
}

// Expose for inline onclick handlers in HTML
window.changeSlide = changeSlide;


// ── Animated run-steps (slide 3) ─────────────────────────────
function animateRunSteps() {
    const ids = ['rs0', 'rs1', 'rs2', 'rs3'];
    ids.forEach(function (id, i) {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.remove('visible');
        setTimeout(function () { el.classList.add('visible'); }, (i + 1) * 350);
    });
}


// ── Quiz handler ─────────────────────────────────────────────
function checkQuiz(id, el, correct) {
    const wrap = document.getElementById(id);
    const fb = document.getElementById(id + '-fb');
    if (wrap.dataset.answered) return;

    wrap.dataset.answered = '1';
    wrap.querySelectorAll('.qopt').forEach(function (o) {
        o.style.pointerEvents = 'none';
    });

    if (correct) {
        el.classList.add('correct');
        fb.textContent = '🎉 答對了！變數名稱不能以數字開頭，也不能有空格。用底線 _ 連接單字就對了！';
        fb.className = 'quiz-feedback ok show';
    } else {
        el.classList.add('wrong');
        fb.textContent = '😅 差一點！答案是 B：my_city = 40。變數名稱不能以數字開頭，空格也不行喔！';
        fb.className = 'quiz-feedback bad show';
        // Also highlight the correct answer
        wrap.querySelectorAll('.qopt')[1].classList.add('correct');
    }
}

// Expose for inline onclick handlers in HTML
window.checkQuiz = checkQuiz;


// ── Initialise on DOM ready ───────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
    buildProgress();
});