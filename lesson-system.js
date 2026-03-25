// lesson-system.js — 鎖定/解鎖 Library 教學系統
// 在 app.html 頁面使用，依序解鎖各建築函式

window.LessonSystem = (function () {

    // ══════════════════════════════════════════════════════════════════════
    //  課程定義（從基礎到進階）
    // ══════════════════════════════════════════════════════════════════════
    const LESSONS = [
        // ── 第 1 課：build_house ──────────────────────────────────────────
        {
            fnName: 'build_house',
            emoji: '🏠',
            title: '第 1 課：print 與函式呼叫',
            concept: 'print() · 函式（Function）',
            conceptDesc:
                '<b>print()</b> 是 Python 最常用的函式，把括號裡的內容顯示出來：<br>' +
                '<code>print("Hello!")</code> → 顯示 Hello!<br>' +
                '<code>print(3 + 5)</code> → 顯示 8<br><br>' +
                '函式的格式：<code>函式名稱(參數)</code>。括號不能省略！',
            pythonLesson: [
                { label: 'print 基本用法', content: '<code>print("Hello, World!")</code> — 輸出文字，字串用引號包住。' },
                { label: '印出數字與計算', content: '<code>print(10 + 3)</code> → 13。數字不需要引號，可以直接做運算。' },
                { label: '印出多個值', content: '<code>print("答案是", 42)</code> → 答案是 42。用逗號分隔，自動加空格。' },
            ],
            quizzes: [
                {
                    q: '以下哪行程式可以印出 Hello?',
                    opts: ['print Hello', 'print("Hello")', 'echo("Hello")', 'show Hello'],
                    ans: 1,
                    explain: 'Python 用 print() 輸出，字串要放在引號裡面，括號不能省略。',
                },
                {
                    q: 'print(2 + 3) 會印出什麼？',
                    opts: ['"2 + 3"', '2 + 3', '5', '錯誤'],
                    ans: 2,
                    explain: '括號裡沒有引號，所以 2+3 是數學運算，結果是 5。',
                },
            ],
            steps: [
                { label: '呼叫 build_house', content: '<code>build_house(row, col)</code> — row 是列，col 是欄，都是 0~79 的整數。' },
                { label: '加上名稱', content: '<code>name="我的家"</code> 是具名參數，讓建築顯示標籤。' },
            ],
            challenges: [
                {
                    q: '【熱身】在程式中印出你的名字，例如：我叫小明',
                    hint: '使用 print() 函式，字串放在引號裡：print("我叫小明")',
                    check: (code) => /print\s*\(/.test(code),
                    errMsg: '需要至少一行 print() 哦！',
                },
                {
                    q: '【練習】印出兩個數字相加的結果，例如印出 10 + 25 的答案',
                    hint: '數字不需要引號，直接寫運算式：print(10 + 25)',
                    check: (code) => /print\s*\(\s*\d+\s*\+\s*\d+/.test(code),
                    errMsg: '試試 print(數字 + 數字) 的格式！',
                },
                {
                    q: '【挑戰】呼叫 build_house，在地圖座標 (40, 40) 蓋一棟有名字的房子',
                    hint: null,
                    check: (code) => /build_house\s*\(\s*\d+\s*,\s*\d+/.test(code),
                    errMsg: '記得填入 row, col 兩個座標，並加上 name 參數！',
                },
            ],
            successMsg: '🎉 print 和函式呼叫都掌握了！build_house 解鎖！',
        },

        // ── 第 2 課：build_streetlight ────────────────────────────────────
        {
            fnName: 'build_streetlight',
            emoji: '💡',
            title: '第 2 課：變數與資料型別',
            concept: '變數（Variable）· int · str',
            conceptDesc:
                '<b>變數</b>就像有名字的箱子，用 <code>=</code> 存東西：<br>' +
                '<code>age = 15</code>　　→ 整數（int）<br>' +
                '<code>city = "台北"</code> → 字串（str）<br><br>' +
                '之後直接用變數名稱，電腦自動換成裡面的值。',
            pythonLesson: [
                { label: '建立變數', content: '<code>x = 10</code> — 把 10 存進 x 這個箱子。之後寫 <code>x</code>，電腦就當作 10。' },
                { label: '字串 vs 數字', content: '<code>40</code> 是整數；<code>"40"</code> 是字串。座標要用整數，名稱要用字串（引號）。' },
                { label: '變數做運算', content: '<code>r = 40</code>，之後 <code>r + 1</code> 得到 41。改 r 就等於改所有用到 r 的地方！' },
            ],
            quizzes: [
                {
                    q: '執行 x = 5 後，print(x + 2) 結果是？',
                    opts: ['x + 2', '"7"', '7', '錯誤'],
                    ans: 2,
                    explain: 'x 是 5，5 + 2 = 7，print 會印出數字 7。',
                },
                {
                    q: '以下哪個是字串（str）？',
                    opts: ['42', '3.14', '"hello"', 'True'],
                    ans: 2,
                    explain: '字串用引號包住。42 是整數，3.14 是浮點數，True 是布林值。',
                },
            ],
            steps: [
                { label: '路燈夜晚發光', content: '路燈在夜晚自動點亮！沿著道路每隔 2 格放一盞，城市夜景更漂亮。' },
                { label: '用變數存座標', content: '把位置存進變數，方便之後調整路燈位置。' },
            ],
            challenges: [
                {
                    q: '【熱身】建立兩個變數 x = 10 和 y = 20，印出它們的總和',
                    hint: '先寫 x = 10，再寫 y = 20，最後 print(x + y)',
                    check: (code) => /\w+\s*=\s*\d+/.test(code) && /print\s*\(/.test(code),
                    errMsg: '建立變數後，用 print() 印出計算結果！',
                },
                {
                    q: '【練習】建立變數 city = "未來城"，印出 "歡迎來到未來城"（用字串拼接或直接印）',
                    hint: 'city = "未來城"，然後 print("歡迎來到" + city)',
                    check: (code) => /\w+\s*=\s*["']/.test(code) && /print\s*\(/.test(code),
                    errMsg: '建立字串變數，再用 print 印出來！',
                },
                {
                    q: '【挑戰】用變數 r = 40, c = 41，呼叫 build_streetlight(r, c)，在地圖上蓋一盞路燈',
                    hint: null,
                    check: (code) => /\w+\s*=\s*\d+/.test(code) && /build_streetlight\s*\(/.test(code),
                    errMsg: '先用變數存座標，再用 build_streetlight(r, c) 蓋路燈！',
                },
            ],
            successMsg: '💡 變數掌握了！build_streetlight 解鎖！',
        },

        // ── 第 3 課：build_road ───────────────────────────────────────────
        {
            fnName: 'build_road',
            emoji: '🛣️',
            title: '第 3 課：input 與字串操作',
            concept: 'input() · 字串拼接',
            conceptDesc:
                '<b>input()</b> 讓使用者輸入文字：<br>' +
                '<code>name = input("你叫什麼名字？")</code><br>' +
                '<code>print("你好，" + name)</code><br><br>' +
                '字串用 <code>+</code> 拼接，數字要先 <code>str(數字)</code> 轉換才能拼。',
            pythonLesson: [
                { label: 'input 基本用法', content: '<code>x = input("請輸入：")</code> — 程式暫停等待輸入，拿到的一定是字串。' },
                { label: '字串拼接', content: '<code>"Hello" + " " + "World"</code> → Hello World。注意數字要先 <code>str(42)</code> 再拼。' },
                { label: 'int() 轉換', content: 'input 拿到的是字串，要做數學要先轉：<code>n = int(input("輸入數字："))</code>。' },
            ],
            quizzes: [
                {
                    q: 'name = input("名字？") 後，name 的資料型別是？',
                    opts: ['int', 'float', 'str', '看使用者輸入什麼'],
                    ans: 2,
                    explain: 'input() 永遠回傳字串（str），就算使用者輸入數字也一樣。要做數學要先 int() 轉換。',
                },
                {
                    q: '想印出 "分數:95"，以下哪個正確？',
                    opts: ['print("分數:" + 95)', 'print("分數:" + str(95))', 'print("分數: " 95)', 'print(分數:95)'],
                    ans: 1,
                    explain: '數字 95 要先用 str() 轉字串才能用 + 拼接，或改用逗號：print("分數:", 95)。',
                },
            ],
            steps: [
                { label: 'direction 參數', content: '<code>"h"</code> 是水平路，<code>"v"</code> 是垂直路。' },
                { label: '鋪一排路', content: '改變 col 的值鋪水平路，改變 row 的值鋪垂直路。' },
            ],
            challenges: [
                {
                    q: '【熱身】用字串拼接（+）印出 "Hello, Python!"（兩個字串合在一起）',
                    hint: 'print("Hello, " + "Python!")',
                    check: (code) => /["']\s*\+\s*["']/.test(code) && /print\s*\(/.test(code),
                    errMsg: '用 + 把兩個字串連起來再 print！',
                },
                {
                    q: '【練習】變數 num = 42，印出 "答案是42"（需要 str() 轉換才能拼接數字）',
                    hint: 'num = 42，然後 print("答案是" + str(num))',
                    check: (code) => /str\s*\(/.test(code) && /print\s*\(/.test(code),
                    errMsg: '數字要先 str() 轉成字串才能用 + 拼接！',
                },
                {
                    q: '【挑戰】在地圖上鋪設一段水平道路，呼叫 build_road(40, 41, "h")，並用字串變數給這條路取名（印出路名）',
                    hint: null,
                    check: (code) => /build_road\s*\(/.test(code) && /["']\s*\+\s*\w+|\w+\s*\+\s*["']|str\s*\(/.test(code),
                    errMsg: '呼叫 build_road，並確保有字串拼接的練習！',
                },
            ],
            successMsg: '🛣️ 字串操作學會了！build_road 解鎖！',
        },

        // ── 第 4 課：build_school ─────────────────────────────────────────
        {
            fnName: 'build_school',
            emoji: '🏫',
            title: '第 4 課：if / elif / else',
            concept: 'if · elif · else 條件判斷',
            conceptDesc:
                '程式可以根據條件做不同的事！<br>' +
                '<code>if 條件:</code> — 成立時執行<br>' +
                '<code>elif 另一個條件:</code> — 前面不符合再檢查<br>' +
                '<code>else:</code> — 全都不符合時執行<br><br>' +
                '冒號 <code>:</code> 不能省，底下的程式碼要縮排 4 格！',
            pythonLesson: [
                { label: '比較運算子', content: '<code>==</code> 等於、<code>!=</code> 不等於、<code>></code> 大於、<code><</code> 小於。注意：比較用 <code>==</code>，賦值只有一個 <code>=</code>！' },
                { label: 'if / else 結構', content: '<code>if x > 10:</code><br>　<code>print("大")</code><br><code>else:</code><br>　<code>print("小")</code><br>冒號和縮排缺一不可！' },
                { label: 'elif 多條件', content: 'if → elif → elif → else，依序檢查，符合哪個就執行哪個，其餘跳過。' },
            ],
            quizzes: [
                {
                    q: 'x=7，執行 if x>10: print("A") elif x>5: print("B") else: print("C")，結果？',
                    opts: ['A', 'B', 'C', 'AB'],
                    ans: 1,
                    explain: 'x=7 不大於 10，但大於 5，所以進入 elif，印出 B。',
                },
                {
                    q: 'Python 的 if 後面一定要有什麼符號？',
                    opts: ['分號 ;', '冒號 :', '括號 ()', '無需符號'],
                    ans: 1,
                    explain: 'if、elif、else、for、while、def 後面都要加冒號 :，底下程式碼要縮排。',
                },
                {
                    q: '== 和 = 有什麼差？',
                    opts: ['沒有差，都是賦值', '== 比較相不相等，= 是賦值', '= 是比較，== 是賦值', '都是比較大小'],
                    ans: 1,
                    explain: '= 是「把右邊的值存進左邊的變數」；== 是「比較左右是否相等」，回傳 True 或 False。',
                },
            ],
            steps: [
                { label: '條件決定建築', content: '用 if 判斷當前位置要蓋什麼設施，讓城市更有規劃感。' },
                { label: '搭配迴圈', content: '在 for 迴圈裡面用 if，根據索引 i 決定每格的建築種類。' },
            ],
            challenges: [
                {
                    q: '【熱身】寫一個 if/else：若 score = 85，score >= 60 印出"及格"，否則印出"不及格"',
                    hint: 'if score >= 60:\n    print("及格")\nelse:\n    print("不及格")',
                    check: (code) => /\bif\b.+:/.test(code) && /\belse\b/.test(code) && /print\s*\(/.test(code),
                    errMsg: '需要 if 和 else，記得冒號和縮排！',
                },
                {
                    q: '【練習】用 if/elif/else 判斷成績等級：>=90 → A，>=70 → B，其他 → C，印出等級',
                    hint: 'score = 75\nif score >= 90:\n    print("A")\nelif score >= 70:\n    print("B")\nelse:\n    print("C")',
                    check: (code) => /\bif\b/.test(code) && /\belif\b/.test(code) && /\belse\b/.test(code),
                    errMsg: '需要 if、elif、else 三個分支！',
                },
                {
                    q: '【挑戰】在地圖上呼叫 build_school，並在程式中用 if/else 根據某個條件決定學校名稱',
                    hint: null,
                    check: (code) => /\bif\b/.test(code) && /build_school\s*\(/.test(code),
                    errMsg: '程式要有 if 判斷，且要呼叫 build_school！',
                },
            ],
            successMsg: '🏫 條件判斷掌握了！build_school 解鎖！',
        },

        // ── 第 5 課：build_shop ───────────────────────────────────────────
        {
            fnName: 'build_shop',
            emoji: '🏪',
            title: '第 5 課：for 迴圈',
            concept: 'for 迴圈 · range()',
            conceptDesc:
                '需要重複做同一件事？用 <b>for 迴圈</b>！<br>' +
                '<code>for i in range(5):</code><br>' +
                '　　<code>print(i)</code><br>' +
                '→ 印出 0, 1, 2, 3, 4<br><br>' +
                '<code>range(start, stop)</code> 可以指定起始值。',
            pythonLesson: [
                { label: 'range(n) 基礎', content: '<code>range(3)</code> 產生 0, 1, 2。<code>range(5)</code> 是 0~4。注意：不包含結尾數字！' },
                { label: 'range(start, stop)', content: '<code>range(2, 6)</code> 產生 2, 3, 4, 5。從 start 開始，到 stop 前停（不含 stop）。' },
                { label: '縮排規則', content: 'for 底下要執行的程式碼要縮排 4 格。縮排不對會出錯！' },
            ],
            quizzes: [
                {
                    q: 'for i in range(4): print(i) 會印出幾個數字？',
                    opts: ['3 個（1,2,3）', '4 個（0,1,2,3）', '5 個（0,1,2,3,4）', '4 個（1,2,3,4）'],
                    ans: 1,
                    explain: 'range(4) 產生 0, 1, 2, 3，共 4 個數字，從 0 開始！',
                },
                {
                    q: 'range(3, 7) 包含哪些數字？',
                    opts: ['3, 4, 5, 6, 7', '3, 4, 5, 6', '4, 5, 6', '3, 4, 5'],
                    ans: 1,
                    explain: 'range(start, stop) 從 start 開始，到 stop 前停（不含 stop）。所以是 3, 4, 5, 6。',
                },
            ],
            steps: [
                { label: '一次蓋多棟', content: '<code>for i in range(4): build_shop(40+i, 45)</code> 蓋出連排商店。' },
                { label: '搭配字串', content: '<code>name="商店" + str(i+1)</code> 讓每間商店自動編號。' },
            ],
            challenges: [
                {
                    q: '【熱身】用 for 迴圈印出 1 到 5（不含 6），每行印一個數字',
                    hint: 'for i in range(1, 6):\n    print(i)',
                    check: (code) => /for\s+\w+\s+in\s+range\s*\(/.test(code) && /print\s*\(/.test(code),
                    errMsg: '使用 for i in range(...)，記得縮排！',
                },
                {
                    q: '【練習】用 for 迴圈印出九九乘法表的第 3 排（3x1 到 3x9）',
                    hint: 'for i in range(1, 10):\n    print("3 x", i, "=", 3 * i)',
                    check: (code) => /for\s+\w+\s+in\s+range\s*\(1\s*,\s*10\)/.test(code) || /for\s+\w+\s+in\s+range\s*\(9\)/.test(code),
                    errMsg: '迴圈要跑 9 次（1 到 9），印出 3 乘以 i 的結果！',
                },
                {
                    q: '【挑戰】用 for 迴圈在地圖上蓋至少 3 間連續的商店，每間商店要有不同的名字（用 str(i) 編號）',
                    hint: null,
                    check: (code) => /for\s+\w+\s+in\s+range/.test(code) && /build_shop/.test(code) && /str\s*\(/.test(code),
                    errMsg: '要有 for 迴圈、build_shop，且商店名字要用 str() 加編號！',
                },
            ],
            successMsg: '🏪 for 迴圈超強！build_shop 解鎖！',
        },

        // ── 第 6 課：build_library ────────────────────────────────────────
        {
            fnName: 'build_library',
            emoji: '📖',
            title: '第 6 課：while 迴圈',
            concept: 'while 迴圈 · break',
            conceptDesc:
                '<b>while</b> 在條件成立時一直執行，適合「不知道要跑幾次」的情況：<br>' +
                '<code>count = 0</code><br>' +
                '<code>while count < 5:</code><br>' +
                '　　<code>print(count)</code><br>' +
                '　　<code>count += 1</code>　← 一定要更新條件，否則無限迴圈！',
            pythonLesson: [
                { label: 'while 結構', content: 'while 後面是條件，True 就繼續，False 才停。冒號不能省，底下要縮排。' },
                { label: '+= 更新變數', content: '<code>count += 1</code> 等同 <code>count = count + 1</code>，讓計數每次加一。' },
                { label: 'break 提前跳出', content: '迴圈裡寫 <code>break</code> 可以立刻跳出，不管條件是否還成立。' },
            ],
            quizzes: [
                {
                    q: 'count = 0，while count < 3: count += 1，迴圈跑幾次？',
                    opts: ['2 次', '3 次', '4 次', '無限次'],
                    ans: 1,
                    explain: 'count 從 0：0<3 執行，1<3 執行，2<3 執行，3<3 不成立停止，共 3 次。',
                },
                {
                    q: 'while 迴圈如果忘記更新條件變數，會發生什麼事？',
                    opts: ['只跑一次', '直接跳過', '無限迴圈（程式卡死）', '自動停止'],
                    ans: 2,
                    explain: '條件永遠為 True，迴圈不會停，程式就卡住了。一定要記得更新變數！',
                },
            ],
            steps: [
                { label: '用 while 延伸建設', content: '用 while 一格一格鋪路，直到達到某個邊界為止。' },
                { label: '搭配 break', content: '在 while 裡用 if 判斷，到達目標後 break 跳出。' },
            ],
            challenges: [
                {
                    q: '【熱身】用 while 迴圈印出 1, 2, 3, 4, 5（從 1 開始，條件是 <= 5）',
                    hint: 'n = 1\nwhile n <= 5:\n    print(n)\n    n += 1',
                    check: (code) => /while\s+.+:/.test(code) && /print\s*\(/.test(code) && /\+=/.test(code),
                    errMsg: '需要 while 迴圈，記得更新計數變數（+= 1）！',
                },
                {
                    q: '【練習】用 while 迴圈計算 1 + 2 + 3 + ... + 10 的總和，印出結果',
                    hint: 'total = 0\ni = 1\nwhile i <= 10:\n    total += i\n    i += 1\nprint(total)',
                    check: (code) => /while\s+.+:/.test(code) && /\+=/.test(code),
                    errMsg: '累加時要用 total += i 的方式！',
                },
                {
                    q: '【挑戰】用 while 迴圈在地圖上鋪一段路，直到某個座標為止，然後在終點蓋 build_library',
                    hint: null,
                    check: (code) => /while\s+.+:/.test(code) && /build_library\s*\(/.test(code),
                    errMsg: '需要 while 迴圈鋪路，並在結束後呼叫 build_library！',
                },
            ],
            successMsg: '📖 while 迴圈學會了！build_library 解鎖！',
        },

        // ── 第 7 課：build_hospital ───────────────────────────────────────
        {
            fnName: 'build_hospital',
            emoji: '🏥',
            title: '第 7 課：串列（List）',
            concept: 'list · append · len · enumerate',
            conceptDesc:
                '<b>串列</b>用方括號 <code>[]</code> 存放多個資料：<br>' +
                '<code>fruits = ["蘋果", "香蕉", "橘子"]</code><br>' +
                '<code>fruits[0]</code> → "蘋果"　（索引從 0 開始！）<br>' +
                '<code>len(fruits)</code> → 3<br>' +
                '<code>fruits.append("葡萄")</code> 在末尾新增。',
            pythonLesson: [
                { label: '建立與存取', content: '<code>nums = [10, 20, 30]</code>，<code>nums[0]</code> 是 10，<code>nums[2]</code> 是 30。索引從 0 開始！' },
                { label: 'for 遍歷串列', content: '<code>for item in fruits:</code> 依序把每個元素放進 item，不需要知道長度。' },
                { label: 'len 與 append', content: '<code>len(fruits)</code> 回傳串列長度；<code>fruits.append("新水果")</code> 新增到最後。' },
            ],
            quizzes: [
                {
                    q: 'data = [5, 10, 15]，data[1] 是什麼？',
                    opts: ['5', '10', '15', '錯誤'],
                    ans: 1,
                    explain: '串列索引從 0 開始：data[0]=5, data[1]=10, data[2]=15。',
                },
                {
                    q: 'names = ["A", "B", "C"]，len(names) 是？',
                    opts: ['2', '3', '4', '0'],
                    ans: 1,
                    explain: '串列有 3 個元素，len() 回傳元素數量 3。',
                },
            ],
            steps: [
                { label: '串列存設施資料', content: '把多家醫院的名稱存進串列，再用 for 迴圈依序蓋出來。' },
                { label: 'enumerate 取索引', content: '<code>for i, name in enumerate(hospitals):</code> 同時拿到索引和值，方便計算座標偏移。' },
            ],
            challenges: [
                {
                    q: '【熱身】建立一個包含 3 種顏色的串列，用 for 迴圈印出每個顏色',
                    hint: 'colors = ["紅", "綠", "藍"]\nfor c in colors:\n    print(c)',
                    check: (code) => /\[.+\]/.test(code) && /for\s+\w+\s+in\s+\w+/.test(code),
                    errMsg: '建立串列 [...]，再用 for 迴圈遍歷它！',
                },
                {
                    q: '【練習】有個串列 nums = [10, 20, 30, 40]，印出所有元素的總和（用迴圈累加）',
                    hint: 'nums = [10, 20, 30, 40]\ntotal = 0\nfor n in nums:\n    total += n\nprint(total)',
                    check: (code) => /\[.*\d.*\]/.test(code) && /\+=/.test(code),
                    errMsg: '建立數字串列，用迴圈把每個數字加進 total！',
                },
                {
                    q: '【挑戰】建立一個醫院名稱的串列，用 enumerate 取得索引，用 build_hospital(44 + i, 40) 蓋出每家醫院',
                    hint: null,
                    check: (code) => /\[.+\]/.test(code) && /enumerate/.test(code) && /build_hospital/.test(code),
                    errMsg: '需要串列、enumerate，以及 build_hospital！',
                },
            ],
            successMsg: '🏥 串列掌握！build_hospital 解鎖！',
        },

        // ── 第 8 課：build_fountain ───────────────────────────────────────
        {
            fnName: 'build_fountain',
            emoji: '⛲',
            title: '第 8 課：def 自訂函式',
            concept: 'def · return · 預設參數',
            conceptDesc:
                '你可以自己定義函式，把常用的程式碼打包起來：<br>' +
                '<code>def greet(name):</code><br>' +
                '　　<code>print("你好，" + name)</code><br>' +
                '<code>greet("小明")</code> → 你好，小明<br><br>' +
                '<code>return</code> 可以把結果傳回給呼叫者。',
            pythonLesson: [
                { label: 'def 語法', content: '<code>def 函式名稱(參數1, 參數2):</code> 後面加冒號，函式主體縮排。' },
                { label: 'return 回傳值', content: '<code>def add(a, b): return a + b</code>，之後 <code>result = add(3, 4)</code> 讓 result 得到 7。' },
                { label: '預設參數', content: '<code>def greet(name="朋友"):</code> 讓 name 有預設值，呼叫時可以不傳這個參數。' },
            ],
            quizzes: [
                {
                    q: 'def add(a, b): return a + b，執行 print(add(3, 4)) 結果？',
                    opts: ['a + b', '"7"', '7', '錯誤'],
                    ans: 2,
                    explain: 'add(3, 4) 把 3 和 4 代入，計算 3+4=7，return 7，print 印出 7。',
                },
                {
                    q: '以下哪行正確定義了叫 hello 的函式？',
                    opts: ['function hello():', 'def hello()', 'def hello():', 'define hello():'],
                    ans: 2,
                    explain: 'Python 用 def 定義函式，後面要有括號和冒號，不需要 function 關鍵字。',
                },
            ],
            steps: [
                { label: '打包城市建設', content: '把「蓋一個社區」的程式碼包進函式，可以在不同座標蓋出一樣的社區。' },
                { label: '呼叫多次', content: '函式定義好後可以呼叫很多次，傳不同座標就蓋在不同地方。' },
            ],
            challenges: [
                {
                    q: '【熱身】定義函式 greet(name)，呼叫時印出 "你好，name！"，呼叫 greet("小明")',
                    hint: 'def greet(name):\n    print("你好，" + name + "！")\ngreet("小明")',
                    check: (code) => /def\s+\w+\s*\(/.test(code) && /print\s*\(/.test(code),
                    errMsg: '用 def 定義函式，記得縮排，然後呼叫它！',
                },
                {
                    q: '【練習】定義函式 add(a, b) 用 return 回傳 a + b 的結果，然後印出 add(3, 7)',
                    hint: 'def add(a, b):\n    return a + b\nprint(add(3, 7))',
                    check: (code) => /def\s+\w+\s*\(/.test(code) && /\breturn\b/.test(code),
                    errMsg: '函式需要用 return 回傳結果！',
                },
                {
                    q: '【挑戰】定義函式 build_community(r, c)，在函式裡呼叫 build_fountain，然後呼叫 build_community 函式至少兩次',
                    hint: null,
                    check: (code) => {
                        if (!/def\s+\w+\s*\(/.test(code)) return false;
                        if (!/build_fountain/.test(code)) return false;
                        const userFnMatch = code.match(/def\s+(\w+)\s*\(/);
                        if (!userFnMatch) return false;
                        const fnName = userFnMatch[1];
                        const callCount = (code.match(new RegExp(fnName + '\\s*\\(', 'g')) || []).length;
                        return callCount >= 3;
                    },
                    errMsg: '定義函式，在函式裡呼叫 build_fountain，再呼叫你的函式兩次以上！',
                },
            ],
            successMsg: '⛲ 自訂函式是程式設計的精髓！build_fountain 解鎖！',
        },

        // ── 第 9 課：build_power_tower ────────────────────────────────────
        {
            fnName: 'build_power_tower',
            emoji: '⚡',
            title: '第 9 課：字典（Dictionary）',
            concept: 'dict · key · value · items()',
            conceptDesc:
                '<b>字典</b>用大括號 <code>{}</code> 存「鍵值對」，用鍵（key）查值（value）：<br>' +
                '<code>person = {"name": "小明", "age": 15}</code><br>' +
                '<code>person["name"]</code> → "小明"<br>' +
                '<code>person["age"]</code> → 15',
            pythonLesson: [
                { label: '建立字典', content: '<code>d = {"a": 1, "b": 2}</code>，用字串當鍵，值可以是任何型別。' },
                { label: '讀寫值', content: '<code>d["a"]</code> 讀取；<code>d["c"] = 3</code> 新增/修改。' },
                { label: '遍歷字典', content: '<code>for k, v in d.items():</code> 同時取得每個鍵和值。' },
            ],
            quizzes: [
                {
                    q: 'info = {"name": "小華", "score": 90}，info["score"] 是什麼？',
                    opts: ['"score"', '"90"', '90', '錯誤'],
                    ans: 2,
                    explain: 'info["score"] 用 "score" 這個鍵來查值，得到整數 90。',
                },
                {
                    q: '要在字典 d 裡新增鍵 "city" 值為 "台北"，怎麼寫？',
                    opts: ['d.add("city", "台北")', 'd["city"] = "台北"', 'd.city = "台北"', 'append(d, "city", "台北")'],
                    ans: 1,
                    explain: '字典用 d["鍵"] = 值 來新增或修改，不用 append 也不用點記法。',
                },
            ],
            steps: [
                { label: '字典存建築資料', content: '每座電塔用一個字典描述 row、col，放進串列統一管理。' },
                { label: '遍歷建造', content: '<code>for t in towers: build_power_tower(t["row"], t["col"])</code>。' },
            ],
            challenges: [
                {
                    q: '【熱身】建立字典 student = {"name": "小明", "score": 95}，分別印出姓名和分數',
                    hint: 'student = {"name": "小明", "score": 95}\nprint(student["name"])\nprint(student["score"])',
                    check: (code) => /\{[^}]*:/.test(code) && /\[["'].+["']\]/.test(code),
                    errMsg: '建立字典 {}，用 dict["key"] 存取值！',
                },
                {
                    q: '【練習】建立字典串列（2個字典），用 for 迴圈印出每個字典的全部內容',
                    hint: 'people = [{"name": "A", "age": 15}, {"name": "B", "age": 16}]\nfor p in people:\n    print(p["name"], p["age"])',
                    check: (code) => /\[\s*\{/.test(code) && /for\s+\w+\s+in\s+\w+/.test(code),
                    errMsg: '需要包含字典的串列 [{...}, {...}]，再用 for 迴圈遍歷！',
                },
                {
                    q: '【挑戰】建立電力塔的字典串列，每個字典有 "row" 和 "col" 鍵，用迴圈呼叫 build_power_tower(t["row"], t["col"])',
                    hint: null,
                    check: (code) => /\[\s*\{[^}]*"row"/.test(code) && /build_power_tower/.test(code),
                    errMsg: '字典需要有 "row" 和 "col" 鍵，並呼叫 build_power_tower！',
                },
            ],
            successMsg: '⚡ 字典超實用！build_power_tower 解鎖！',
        },

        // ── 第 10 課：build_park ──────────────────────────────────────────
        {
            fnName: 'build_park',
            emoji: '🌳',
            title: '第 10 課：綜合挑戰',
            concept: '綜合應用 · 程式設計思維',
            conceptDesc:
                '你已經學會了：<b>print、input、變數、if/elif/else、for、while、list、def、dict</b>！<br><br>' +
                '真正的程式設計是把語法<b>組合起來解決問題</b>。<br>' +
                '這一關的挑戰：設計一座有規劃的城市，程式碼要有結構和註解！',
            pythonLesson: [
                { label: '程式碼可讀性', content: '好的程式碼讓人一看就懂：用 <code>#</code> 寫說明，用函式分模組，用有意義的變數名稱。' },
                { label: '模組化設計', content: '把「蓋住宅區」「鋪道路」「蓋公共設施」分別包成 def，主程式只負責呼叫。' },
                { label: '除錯技巧', content: '遇到錯誤先看錯誤訊息在哪一行，用 print 印出中間值，一步一步縮小問題範圍。' },
            ],
            quizzes: [
                {
                    q: '以下哪個是好的變數命名習慣（Python 風格）？',
                    opts: ['x = 40', 'a1b2c3 = 40', 'center_row = 40', 'CenterRow = 40'],
                    ans: 2,
                    explain: 'Python 慣例用小寫加底線（snake_case），名稱要有意義。center_row 比 x 更清楚。',
                },
                {
                    q: '為什麼要把程式碼包成 def 函式？',
                    opts: ['讓程式執行更快', '可以重複使用，不用複製貼上', '強制要求，Python 規定', '讓程式碼看起來更長'],
                    ans: 1,
                    explain: '函式讓你定義一次隨時呼叫，修改只需改一個地方，大大降低維護成本。',
                },
            ],
            steps: [
                { label: '公園裝點城市', content: '在城市各處種植公園，為居民提供休憩空間。' },
                { label: '完整城市', content: '結合所有學過的語法，用函式包裝各個區域，用字典管理設施清單。' },
            ],
            challenges: [
                {
                    q: '【整合①】寫一個函式 build_road_with_lights(r, c, length)，在同一列鋪 length 格水平路，並每隔 2 格放一盞路燈',
                    hint: 'def build_road_with_lights(r, c, length):\n    for i in range(length):\n        build_road(r, c + i, "h")\n        if i % 2 == 0:\n            build_streetlight(r - 1, c + i)\nbuild_road_with_lights(40, 40, 5)',
                    check: (code) => /def\s+\w+/.test(code) && /build_road/.test(code) && /build_streetlight/.test(code) && /for\s+\w+/.test(code),
                    errMsg: '需要用 def 定義函式，裡面有 for 迴圈，呼叫 build_road 和 build_streetlight！',
                },
                {
                    q: '【整合②】用字典串列定義至少 3 個區域（每個有 row, col, type），用 if/elif 根據 type 決定蓋房子、公園或商店',
                    hint: null,
                    check: (code) => /\[\s*\{/.test(code) && /\bif\b/.test(code) && /\belif\b/.test(code) &&
                        (/build_house/.test(code) || /build_park/.test(code) || /build_shop/.test(code)),
                    errMsg: '字典串列 + if/elif 判斷 type + 呼叫對應建築函式！',
                },
                {
                    q: '【終極挑戰】結合所有語法（def、for、while 或 if、list、dict）設計一座完整城市，必須包含 build_park',
                    hint: null,
                    check: (code) => {
                        const hasStructure = /def\s+\w+/.test(code) && /for\s+\w+/.test(code) && /\bif\b/.test(code);
                        const hasData = /\[/.test(code);
                        const hasPark = /build_park/.test(code);
                        const lineCount = code.split('\n').filter(l => l.trim() && !l.trim().startsWith('#')).length;
                        return hasStructure && hasData && hasPark && lineCount >= 8;
                    },
                    errMsg: '需要 def 函式、for 迴圈、if 判斷、串列或字典，加上 build_park，且至少 8 行有效程式碼！',
                },
            ],
            successMsg: '🌳 恭喜完成所有課程！你是真正的城市工程師！🏆',
        },
    ];

    // ── 卡片順序 ──────────────────────────────────────────────────
    const LESSON_ORDER = [...LESSONS.map(l => l.fnName), 'clear_all'];

    // ══════════════════════════════════════════════════════════════════════
    //  State — cookie-based persistence
    // ══════════════════════════════════════════════════════════════════════
    const STORAGE_KEY = 'codescape_unlocked';
    const MAP_KEY = 'codescape_map';
    let unlockedSet = new Set();

    function setCookie(name, value, days = 365) {
        const exp = new Date(Date.now() + days * 864e5).toUTCString();
        document.cookie = `${name}=${encodeURIComponent(value)};expires=${exp};path=/;SameSite=Lax`;
    }
    function getCookie(name) {
        const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
        return m ? decodeURIComponent(m[1]) : null;
    }
    function deleteCookie(name) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    }

    function loadUnlocked() {
        try {
            const saved = getCookie(STORAGE_KEY);
            if (saved) unlockedSet = new Set(JSON.parse(saved));
        } catch (e) { /* ignore */ }
    }
    function saveUnlocked() {
        try { setCookie(STORAGE_KEY, JSON.stringify([...unlockedSet])); } catch (e) { /* ignore */ }
    }

    function saveMapCode(code) {
        try { setCookie(MAP_KEY, code); } catch (e) { /* ignore */ }
    }
    function loadMapCode() {
        try { return getCookie(MAP_KEY) || null; } catch (e) { return null; }
    }

    function resetAll() {
        deleteCookie(STORAGE_KEY);
        deleteCookie(MAP_KEY);
        try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
    }

    function isUnlocked(fn) { return fn === 'clear_all' || unlockedSet.has(fn); }
    function unlock(fn) { unlockedSet.add(fn); saveUnlocked(); }

    // ══════════════════════════════════════════════════════════════════════
    //  Reorder lib cards
    // ══════════════════════════════════════════════════════════════════════
    function reorderLibCards() {
        const body = document.getElementById('libBody');
        if (!body) return;
        LESSON_ORDER.forEach(fn => {
            const card = body.querySelector(`.lib-fn-card[data-fn="${fn}"]`);
            if (card) body.appendChild(card);
        });
    }

    // ══════════════════════════════════════════════════════════════════════
    //  Leave Confirmation Dialog  ← 新增
    // ══════════════════════════════════════════════════════════════════════
    function showConfirmLeave(onConfirm) {
        let confirmBox = document.getElementById('lsLeaveConfirm');
        if (!confirmBox) {
            confirmBox = document.createElement('div');
            confirmBox.id = 'lsLeaveConfirm';
            confirmBox.style.cssText =
                'position:fixed;inset:0;z-index:3000;display:flex;align-items:center;justify-content:center;' +
                'background:rgba(0,0,0,0.65);backdrop-filter:blur(3px);';
            confirmBox.innerHTML = `
                <div style="background:#0d1629;border:1px solid rgba(245,166,35,0.5);border-radius:14px;
                            padding:2rem 2.5rem;max-width:360px;width:90%;text-align:center;
                            font-family:'Oxanium',monospace;box-shadow:0 8px 32px rgba(0,0,0,0.7);">
                    <div style="font-size:2rem;margin-bottom:0.8rem;">⚠️</div>
                    <div style="color:#f5a623;font-size:1rem;font-weight:600;margin-bottom:0.5rem;">確定要離開課程？</div>
                    <div style="color:rgba(255,255,255,0.6);font-size:0.82rem;margin-bottom:1.5rem;line-height:1.6;">
                        你的學習進度將不會被儲存，<br>下次需要重新開始此課程。
                    </div>
                    <div style="display:flex;gap:0.8rem;justify-content:center;">
                        <button id="lsLeaveCancel"
                            style="padding:0.5rem 1.4rem;border-radius:8px;border:1px solid rgba(255,255,255,0.2);
                                   background:transparent;color:#fff;font-family:'Oxanium',monospace;
                                   cursor:pointer;font-size:0.88rem;transition:background 0.15s;">
                            繼續學習
                        </button>
                        <button id="lsLeaveConfirmBtn"
                            style="padding:0.5rem 1.4rem;border-radius:8px;border:none;
                                   background:#f5a623;color:#000;font-family:'Oxanium',monospace;
                                   cursor:pointer;font-size:0.88rem;font-weight:600;transition:opacity 0.15s;">
                            確定離開
                        </button>
                    </div>
                </div>`;
            document.body.appendChild(confirmBox);
        }

        confirmBox.style.display = 'flex';

        const cancelBtn = document.getElementById('lsLeaveCancel');
        const confirmBtn = document.getElementById('lsLeaveConfirmBtn');

        // Clone nodes to remove any old event listeners
        const newCancel = cancelBtn.cloneNode(true);
        const newConfirm = confirmBtn.cloneNode(true);
        cancelBtn.replaceWith(newCancel);
        confirmBtn.replaceWith(newConfirm);

        const cleanup = () => { confirmBox.style.display = 'none'; };
        newCancel.addEventListener('click', cleanup);
        newConfirm.addEventListener('click', () => { cleanup(); onConfirm(); });
    }

    // ══════════════════════════════════════════════════════════════════════
    //  Inject Modal HTML (3-phase: learn → quiz → practice)
    // ══════════════════════════════════════════════════════════════════════
    function injectModal() {
        if (document.getElementById('lessonOverlay')) return;
        const overlay = document.createElement('div');
        overlay.id = 'lessonOverlay';
        overlay.innerHTML = `
            <div id="lessonModal">
                <div class="ls-header">
                    <span class="ls-header-emoji" id="lsEmoji">🏠</span>
                    <div class="ls-header-text">
                        <h2 id="lsTitle">課程標題</h2>
                        <span class="ls-concept-tag" id="lsConceptTag">概念</span>
                    </div>
                    <button class="ls-close" id="lsClose">✕</button>
                </div>
                <div class="ls-tabs">
                    <div class="ls-tab active" id="lsTab0" data-phase="0">① 學習語法</div>
                    <div class="ls-tab" id="lsTab1" data-phase="1">② 小測驗</div>
                    <div class="ls-tab locked-tab" id="lsTab2" data-phase="2">③ 實作練習</div>
                </div>
                <div class="ls-body">
                    <div class="ls-phase active" id="lsPhase0">
                        <div class="ls-concept-box" id="lsConceptBox"></div>
                        <div class="ls-steps" id="lsLearnSteps"></div>
                        <div class="ls-btn-row">
                            <button class="ls-btn ls-btn-run" id="lsToQuizBtn">前往小測驗 →</button>
                        </div>
                    </div>
                    <div class="ls-phase" id="lsPhase1">
                        <div class="ls-quiz-progress" id="lsQuizProgress"></div>
                        <div id="lsQuizArea"></div>
                        <div class="ls-btn-row" style="margin-top:14px;">
                            <button class="ls-btn ls-btn-secondary" id="lsBackLearnBtn">← 回去複習</button>
                            <button class="ls-btn ls-btn-run" id="lsQuizNextBtn" style="display:none;">下一題 →</button>
                            <button class="ls-btn ls-btn-run" id="lsQuizDoneBtn" style="display:none;">前往實作 →</button>
                            <button class="ls-btn ls-btn-retry" id="lsQuizRetryBtn" style="display:none;">🔄 有答錯，重新作答</button>
                        </div>
                    </div>
                    <div class="ls-phase" id="lsPhase2">
                        <div class="ls-chal-progress" id="lsChalProgress"></div>
                        <div class="ls-chal-header" id="lsChalHeader"></div>
                        <div class="ls-hint-box" id="lsHintBox" style="display:none;"></div>
                        <div class="ls-editor-wrap">
                            <div class="ls-editor-bar">
                                <span class="dot-r"></span><span class="dot-y"></span><span class="dot-g"></span>
                                <span style="margin-left:4px;">city_builder.py — 練習區</span>
                                <button class="ls-hint-toggle" id="lsHintToggle" style="margin-left:auto;">💡 提示</button>
                            </div>
                            <textarea id="lessonCodeArea" spellcheck="false" placeholder="# 在這裡撰寫你的 Python 程式碼…"></textarea>
                        </div>
                        <div class="ls-btn-row">
                            <button class="ls-btn ls-btn-run" id="lsRunBtn">▶ 執行並測試</button>
                            <button class="ls-btn ls-btn-secondary" id="lsSkipBtn">略過此課程</button>
                        </div>
                        <div class="ls-feedback" id="lsFeedback"></div>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(overlay);

        // ✕ 按鈕 → 觸發離開確認
        document.getElementById('lsClose').addEventListener('click', () => closeModal(false));

        // 點擊 overlay 背景 → 觸發離開確認
        overlay.addEventListener('click', e => {
            if (e.target === overlay) closeModal(false);
        });

        overlay.querySelectorAll('.ls-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const phase = parseInt(tab.dataset.phase);
                gotoPhase(phase);
            });
        });

        document.getElementById('lsToQuizBtn').addEventListener('click', () => gotoPhase(1));
        document.getElementById('lsBackLearnBtn').addEventListener('click', () => gotoPhase(0));
        document.getElementById('lsQuizNextBtn').addEventListener('click', advanceQuiz);
        document.getElementById('lsQuizDoneBtn').addEventListener('click', () => gotoPhase(2));
        document.getElementById('lsQuizRetryBtn').addEventListener('click', () => {
            _state.quizIdx = 0;
            _state.quizAnswers = [];
            document.getElementById('lsQuizRetryBtn').style.display = 'none';
            renderQuiz();
        });

        document.getElementById('lessonCodeArea').addEventListener('keydown', e => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const ta = e.target, s = ta.selectionStart, end = ta.selectionEnd;
                ta.value = ta.value.substring(0, s) + '    ' + ta.value.substring(end);
                ta.selectionStart = ta.selectionEnd = s + 4;
            }
        });

        document.getElementById('lsRunBtn').addEventListener('click', runLessonCode);
        document.getElementById('lsSkipBtn').addEventListener('click', () => {
            if (confirm('確定要略過此課程並直接解鎖？（建議完成課程，學習效果更好）')) {
                doUnlock(LESSONS[_state.lessonIdx].fnName);
                closeModal(true);
            }
        });
    }

    // ══════════════════════════════════════════════════════════════════════
    //  Phase management
    // ══════════════════════════════════════════════════════════════════════
    const _state = {
        lessonIdx: 0, quizIdx: 0, quizAnswers: [], quizPassed: false,
        chalIdx: 0, chalPassed: []
    };

    function gotoPhase(phase) {
        if (phase === 2 && !_state.quizPassed) { showToast('請先完成小測驗！'); return; }
        [0, 1, 2].forEach(i => {
            document.getElementById(`lsPhase${i}`).classList.toggle('active', i === phase);
            const tab = document.getElementById(`lsTab${i}`);
            tab.classList.toggle('active', i === phase);
        });
        if (phase === 1) renderQuiz();
        if (phase === 2) renderChallenge();
        document.getElementById('lessonModal').scrollTop = 0;
    }

    // ══════════════════════════════════════════════════════════════════════
    //  Quiz rendering
    // ══════════════════════════════════════════════════════════════════════
    function renderQuiz() {
        const lesson = LESSONS[_state.lessonIdx];
        const qi = _state.quizIdx;
        const q = lesson.quizzes[qi];
        const letters = ['A', 'B', 'C', 'D'];
        const answered = _state.quizAnswers[qi];
        const isAnswered = answered !== undefined;

        document.getElementById('lsQuizProgress').textContent =
            `題目 ${qi + 1} / ${lesson.quizzes.length}`;

        document.getElementById('lsQuizArea').innerHTML = `
            <div class="ls-quiz-block">
                <div class="ls-quiz-q"><span class="ls-q-num">Q${qi + 1}.</span>${q.q}</div>
                <div class="ls-quiz-opts">
                    ${q.opts.map((opt, i) => `
                        <div class="ls-quiz-opt ${isAnswered ? 'answered ' + (i === q.ans ? 'correct' : (i === answered ? 'wrong' : '')) : ''}"
                             data-qi="${qi}" data-i="${i}">
                            <span class="ls-quiz-opt-letter">${letters[i]}</span>
                            <span>${opt}</span>
                        </div>`).join('')}
                </div>
                <div class="ls-quiz-explain ${isAnswered ? (answered === q.ans ? 'ok' : 'bad') : ''}">
                    ${isAnswered ? (answered === q.ans ? '✓ 正確！' : '✗ 答錯了。') + ' ' + q.explain : ''}
                </div>
            </div>`;

        if (!isAnswered) {
            document.querySelectorAll('#lsQuizArea .ls-quiz-opt').forEach(opt => {
                opt.addEventListener('click', () => answerQuiz(parseInt(opt.dataset.qi), parseInt(opt.dataset.i)));
            });
        }

        const isLast = qi === lesson.quizzes.length - 1;
        document.getElementById('lsQuizNextBtn').style.display =
            (isAnswered && !isLast) ? 'inline-flex' : 'none';
        document.getElementById('lsQuizDoneBtn').style.display =
            (_state.quizPassed) ? 'inline-flex' : 'none';
    }

    function answerQuiz(qi, chosen) {
        if (_state.quizAnswers[qi] !== undefined) return;
        _state.quizAnswers[qi] = chosen;
        const lesson = LESSONS[_state.lessonIdx];
        renderQuiz();

        if (_state.quizAnswers.filter(x => x !== undefined).length < lesson.quizzes.length) return;

        const allRight = lesson.quizzes.every((q, i) => _state.quizAnswers[i] === q.ans);
        if (allRight) {
            _state.quizPassed = true;
            document.getElementById('lsTab2').classList.remove('locked-tab');
            document.getElementById('lsTab2').classList.add('done');
            document.getElementById('lsQuizDoneBtn').style.display = 'inline-flex';
            document.getElementById('lsQuizRetryBtn').style.display = 'none';
        } else {
            setTimeout(() => {
                document.getElementById('lsQuizRetryBtn').style.display = 'inline-flex';
            }, 400);
        }
    }

    function advanceQuiz() {
        _state.quizIdx = Math.min(_state.quizIdx + 1, LESSONS[_state.lessonIdx].quizzes.length - 1);
        renderQuiz();
    }

    // ══════════════════════════════════════════════════════════════════════
    //  Challenge rendering (Phase 2)
    // ══════════════════════════════════════════════════════════════════════
    function renderChallenge() {
        const lesson = LESSONS[_state.lessonIdx];
        const chals = lesson.challenges;
        const ci = _state.chalIdx;
        const chal = chals[ci];
        const hasHint = !!chal.hint;

        const progEl = document.getElementById('lsChalProgress');
        progEl.innerHTML = chals.map((c, i) => {
            const isDone = _state.chalPassed[i];
            const isActive = i === ci;
            const connector = i > 0 ? `<div class="ls-chal-connector ${_state.chalPassed[i - 1] ? 'done' : ''}"></div>` : '';
            return `${connector}<div class="ls-chal-dot ${isDone ? 'done' : isActive ? 'active' : 'locked-dot'}" data-ci="${i}">${isDone ? '✓' : i + 1}</div>`;
        }).join('');
        progEl.querySelectorAll('.ls-chal-dot.done').forEach(dot => {
            dot.addEventListener('click', () => {
                _state.chalIdx = parseInt(dot.dataset.ci);
                renderChallenge();
            });
        });

        document.getElementById('lsChalHeader').textContent = chal.q;

        const hintToggle = document.getElementById('lsHintToggle');
        const hintBox = document.getElementById('lsHintBox');
        hintBox.style.display = 'none';
        if (hasHint) {
            hintToggle.className = 'ls-hint-toggle';
            hintToggle.textContent = '💡 提示';
            hintToggle.onclick = () => {
                const visible = hintBox.style.display !== 'none';
                hintBox.style.display = visible ? 'none' : 'block';
                hintBox.textContent = chal.hint;
                hintToggle.textContent = visible ? '💡 提示' : '🙈 隱藏提示';
            };
        } else {
            hintToggle.className = 'ls-hint-toggle no-hint';
            hintToggle.textContent = '🔒 無提示';
            hintToggle.onclick = () => showToast('這題沒有提示，靠你自己！💪');
        }

        document.getElementById('lessonCodeArea').value = '';
        document.getElementById('lsFeedback').className = 'ls-feedback';
    }

    // ══════════════════════════════════════════════════════════════════════
    //  Open lesson
    // ══════════════════════════════════════════════════════════════════════
    function openLesson(fnName) {
        const idx = LESSONS.findIndex(l => l.fnName === fnName);
        if (idx === -1) return;
        Object.assign(_state, {
            lessonIdx: idx, quizIdx: 0, quizAnswers: [], quizPassed: false,
            chalIdx: 0, chalPassed: []
        });

        const lesson = LESSONS[idx];
        document.getElementById('lsEmoji').textContent = lesson.emoji;
        document.getElementById('lsTitle').textContent = lesson.title;
        document.getElementById('lsConceptTag').textContent = lesson.concept;
        document.getElementById('lsConceptBox').innerHTML = lesson.conceptDesc;

        document.getElementById('lsLearnSteps').innerHTML = lesson.pythonLesson.map((s, i) => `
            <div class="ls-step">
                <span class="ls-step-num">${i + 1}</span>
                <div class="ls-step-content"><span class="ls-step-label">${s.label}：</span>${s.content}</div>
            </div>`).join('');

        document.getElementById('lsFeedback').className = 'ls-feedback';

        [0, 1, 2].forEach(i => {
            const tab = document.getElementById(`lsTab${i}`);
            tab.className = 'ls-tab' + (i === 0 ? ' active' : i === 2 ? ' locked-tab' : '');
            document.getElementById(`lsPhase${i}`).classList.toggle('active', i === 0);
        });
        document.getElementById('lsQuizNextBtn').style.display = 'none';
        document.getElementById('lsQuizDoneBtn').style.display = 'none';
        document.getElementById('lsQuizRetryBtn').style.display = 'none';

        document.getElementById('lessonOverlay').classList.add('open');
        document.body.style.overflow = 'hidden';
        document.getElementById('lessonModal').scrollTop = 0;
    }

    // ══════════════════════════════════════════════════════════════════════
    //  closeModal  ← 修改：加入 force 參數控制是否跳過確認
    // ══════════════════════════════════════════════════════════════════════
    function closeModal(force = false) {
        if (!force) {
            showConfirmLeave(() => {
                document.getElementById('lessonOverlay').classList.remove('open');
                document.body.style.overflow = '';
            });
            return;
        }
        document.getElementById('lessonOverlay').classList.remove('open');
        document.body.style.overflow = '';
    }

    // ══════════════════════════════════════════════════════════════════════
    //  Run practice code
    // ══════════════════════════════════════════════════════════════════════
    function runLessonCode() {
        const lesson = LESSONS[_state.lessonIdx];
        const chals = lesson.challenges;
        const ci = _state.chalIdx;
        const chal = chals[ci];
        const code = document.getElementById('lessonCodeArea').value.trim();
        const fb = document.getElementById('lsFeedback');

        if (window.PythonRunner && window.CityLib) {
            try {
                const result = window.PythonRunner.run(code);
                // Show print output inside lesson feedback area briefly
                if (result.printOutput && result.printOutput.length > 0) {
                    const preview = result.printOutput.slice(0, 5).map(l => `📤 ${l}`).join('\n');
                    fb.className = 'ls-feedback ok';
                    fb.textContent = preview;
                }
            } catch (e) { /* ignore runtime errors during lesson check */ }
        }

        if (!code) {
            fb.className = 'ls-feedback err';
            fb.textContent = '✏️ 請先輸入你的程式碼！';
            return;
        }

        if (chal.check(code)) {
            _state.chalPassed[ci] = true;
            renderChallenge();

            const isLast = ci === chals.length - 1;
            if (isLast) {
                fb.className = 'ls-feedback ok';
                fb.innerHTML = `${lesson.successMsg}<br><br>
                    <button class="ls-btn ls-btn-run" id="lsConfirmBtn" style="margin-top:6px;">✓ 完成並解鎖！</button>`;
                document.getElementById('lsConfirmBtn').addEventListener('click', () => {
                    doUnlock(lesson.fnName);
                    closeModal(true); // 解鎖完成，直接關閉不需確認
                });
                setTimeout(() => {
                    const modal = document.getElementById('lessonModal');
                    modal.scrollTop = modal.scrollHeight;
                }, 100);
            } else {
                fb.className = 'ls-feedback ok';
                fb.textContent = `✓ 第 ${ci + 1} 題通過！繼續下一題 →`;
                setTimeout(() => {
                    _state.chalIdx = ci + 1;
                    renderChallenge();
                    fb.className = 'ls-feedback';
                    document.getElementById('lessonModal').scrollTop = 0;
                }, 1200);
            }
        } else {
            fb.className = 'ls-feedback err';
            fb.textContent = `😅 ${chal.errMsg}`;
            setTimeout(() => {
                const modal = document.getElementById('lessonModal');
                modal.scrollTop = modal.scrollHeight;
            }, 100);
        }
    }

    // ══════════════════════════════════════════════════════════════════════
    //  Unlock animation
    // ══════════════════════════════════════════════════════════════════════
    function doUnlock(fnName) {
        unlock(fnName);
        const card = document.querySelector(`.lib-fn-card[data-fn="${fnName}"]`);
        if (card) {
            card.classList.remove('locked');
            card.classList.add('unlocking');
            card.querySelector('.fn-lock-icon')?.remove();
            setTimeout(() => card.classList.remove('unlocking'), 700);
        }
        updateLibProgress();
    }

    function applyLockStates() {
        document.querySelectorAll('.lib-fn-card[data-fn]').forEach(card => {
            const fn = card.dataset.fn;
            if (isUnlocked(fn)) {
                card.classList.remove('locked');
            } else {
                card.classList.add('locked');
                if (!card.querySelector('.fn-lock-icon')) {
                    const icon = document.createElement('span');
                    icon.className = 'fn-lock-icon';
                    icon.textContent = '🔒';
                    card.appendChild(icon);
                }
            }
        });
        updateLibProgress();
    }

    function updateLibProgress() {
        const done = LESSONS.filter(l => isUnlocked(l.fnName)).length;
        const el = document.getElementById('libProgressText');
        if (el) el.textContent = `${done}/${LESSONS.length}`;
    }

    // ══════════════════════════════════════════════════════════════════════
    //  Patch lib card clicks
    // ══════════════════════════════════════════════════════════════════════
    function patchLibCards() {
        document.querySelectorAll('.lib-fn-card[data-fn]').forEach(card => {
            const newCard = card.cloneNode(true);
            card.parentNode.replaceChild(newCard, card);

            newCard.addEventListener('click', () => {
                const fn = newCard.dataset.fn;
                if (newCard.classList.contains('locked')) {
                    const idx = LESSONS.findIndex(l => l.fnName === fn);
                    if (idx === -1) return;
                    if (idx > 0 && !isUnlocked(LESSONS[idx - 1].fnName)) {
                        showToast(`先完成「${LESSONS[idx - 1].title}」！`);
                        return;
                    }
                    openLesson(fn);
                    return;
                }
                const libFn = (window.LIB_FUNCTIONS || []).find(f => f.name === fn);
                if (window._mainEditor && libFn) {
                    window._mainEditor.replaceRange(libFn.snippet, window._mainEditor.getCursor());
                    window._mainEditor.focus();
                }
            });

            newCard.addEventListener('mouseenter', () => {
                const tooltip = document.getElementById('fnTooltip');
                if (!tooltip || !newCard.classList.contains('locked')) return;
                const idx = LESSONS.findIndex(l => l.fnName === newCard.dataset.fn);
                const lesson = LESSONS[idx] || {};
                tooltip.innerHTML =
                    `<div class="tt-name">${lesson.emoji || '🔒'} ${newCard.dataset.fn}</div>` +
                    `<div class="tt-sig" style="color:#f5a623">🔒 尚未解鎖</div>` +
                    `<div class="tt-desc">點擊開啟教學課程</div>` +
                    `<div class="tt-hint">▸ ${lesson.concept || ''}</div>`;
                const rect = newCard.getBoundingClientRect();
                tooltip.style.left = Math.min(rect.right + 10, window.innerWidth - 285) + 'px';
                tooltip.style.top = Math.min(rect.top, window.innerHeight - 215) + 'px';
                tooltip.style.display = 'block';
            });
            newCard.addEventListener('mouseleave', () => {
                const t = document.getElementById('fnTooltip');
                if (t) t.style.display = 'none';
            });
        });
    }

    // ══════════════════════════════════════════════════════════════════════
    //  Toast
    // ══════════════════════════════════════════════════════════════════════
    function showToast(msg) {
        let toast = document.getElementById('lsToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'lsToast';
            toast.style.cssText =
                'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);' +
                'z-index:2000;background:rgba(4,8,28,0.95);border:1px solid rgba(245,166,35,0.5);' +
                'color:#f5a623;font-family:"Oxanium",monospace;font-size:0.82rem;' +
                'padding:10px 22px;border-radius:8px;letter-spacing:0.5px;' +
                'box-shadow:0 4px 20px rgba(0,0,0,0.6);transition:opacity 0.3s;pointer-events:none;';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.style.opacity = '1';
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 2500);
    }

    // ══════════════════════════════════════════════════════════════════════
    //  Sequential reveal animation
    // ══════════════════════════════════════════════════════════════════════
    function revealCardsSequentially() {
        const cards = document.querySelectorAll('.lib-fn-card[data-fn]');
        cards.forEach((card, i) => {
            card.style.opacity = '0';
            card.style.transform = 'scale(0.7)';
            card.style.transition = 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.34,1.56,0.64,1)';
            setTimeout(() => {
                card.style.opacity = '';
                card.style.transform = '';
                setTimeout(() => applyLockStates(), 100);
            }, 100 + i * 120);
        });
    }

    // ══════════════════════════════════════════════════════════════════════
    //  Init
    // ══════════════════════════════════════════════════════════════════════
    function init(opts = {}) {
        loadUnlocked();
        injectModal();

        const libLabel = document.querySelector('#libHeader .label');
        if (libLabel && !document.getElementById('libProgressText')) {
            const prog = document.createElement('span');
            prog.id = 'libProgressText';
            libLabel.after(prog);
        }

        reorderLibCards();

        const fromTutorial = new URLSearchParams(window.location.search).get('tutorial') === 'done';
        if (fromTutorial && opts.freshStart) {
            setTimeout(() => revealCardsSequentially(), 600);
        } else {
            applyLockStates();
        }
        patchLibCards();
    }

    return {
        init, openLesson, isUnlocked, unlock: doUnlock, LESSONS,
        resetAll, saveMapCode, loadMapCode
    };
})();