// ═══════════════════════════════════════════════════════════════
//  city_library.js  —  CodeScape: 未來程市 建築函式庫
//  所有函式都會把建築物加到地圖場景 (window._cityScene)
// ═══════════════════════════════════════════════════════════════

window.CityLib = (function () {

    // ── 顏色 palette ──────────────────────────────────────────────
    const COLORS = {
        house: [0xe8d5b0, 0xd4b896, 0xf0e0c0, 0xc8a87a],
        roof: [0x8b2020, 0xa03030, 0x6b1515, 0xb04040],
        window: 0x88ccff,
        door: 0x5c3a1e,
        park: [0x4a9e4a, 0x3d8a3d, 0x56a856],
        tree_trunk: 0x6b4226,
        tree_top: [0x2d7a2d, 0x3a9a3a, 0x256025],
        pool: 0x1a90d0,
        pool_deck: 0xe0d0b0,
        library: [0xc8b08a, 0xb89a70, 0xd4bc96],
        lib_roof: 0x4a3020,
        school: 0xf0e080,
        sch_roof: 0x2060a0,
        hospital: 0xf5f5f5,
        hosp_roof: 0xcc2222,
        shop: [0xf08030, 0xe07020, 0xff9040],
        shop_sign: 0xff4444,
        road: 0x555555,
        road_line: 0xffff44,
        power: 0xffcc00,
        tower: 0x888888,
        fountain: 0x60b8e0,
        fountain_w: 0x90d0ff,
        pole: 0x888899,   // ── 新增：路燈柱顏色
    };

    function hex(h) { return new THREE.Color(h); }
    function pick(arr) { return Array.isArray(arr) ? arr[Math.floor(Math.random() * arr.length)] : arr; }

    // ── 取得場景與網格資訊 ────────────────────────────────────────
    function getScene() { return window._cityScene; }
    function getGrid() { return window._cityGrid || {}; }
    function getTileW() { return (getGrid().TILE_W || 10); }
    function getOffset() { return (getGrid().OFFSET || 395); }
    function getGRID() { return (getGrid().GRID || 80); }
    function getLandMask() { return window._cityLandMask || null; }

    // 把 (row, col) 轉成世界座標中心
    function tilePos(row, col) {
        const TW = getTileW(), OFF = getOffset();
        return { x: col * TW - OFF, z: row * TW - OFF };
    }

    // 取得 tile 的地形高度（同 map-script 的 tileElevation）
    function tileElev(row, col) {
        const GRID = getGRID();
        const nx = (col / (GRID - 1)) * 2 - 1, nz = (row / (GRID - 1)) * 2 - 1;
        const dist = Math.sqrt(nx * nx + nz * nz);
        const h = Math.max(0, 1 - dist * 1.3);
        return h * h * 3.5;
    }

    // 確認 tile 是否是陸地
    function isLand(row, col) {
        const mask = getLandMask();
        const GRID = getGRID();
        if (!mask || row < 0 || row >= GRID || col < 0 || col >= GRID) return false;
        return mask[row][col];
    }

    // 追蹤已佔用的 tiles
    const _occupied = new Set();
    function occupy(row, col) { _occupied.add(`${row},${col}`); }
    function isFree(row, col) { return isLand(row, col) && !_occupied.has(`${row},${col}`); }

    // 找一個空閒的陸地 tile（從中心往外搜尋）
    function findFreeTile(preferRow, preferCol, radius = 15) {
        for (let d = 0; d <= radius; d++) {
            for (let dr = -d; dr <= d; dr++) {
                for (let dc = -d; dc <= d; dc++) {
                    if (Math.abs(dr) !== d && Math.abs(dc) !== d) continue;
                    const r = (preferRow || 40) + dr, c = (preferCol || 40) + dc;
                    if (isFree(r, c)) return { r, c };
                }
            }
        }
        return null;
    }

    // ── 追蹤所有動態物件（mesh / sprite / PointLight） ────────────
    // clear_all 只需遍歷這個陣列，就能清除所有建築，包括路燈光源
    const _dynamicObjs = [];

    // ── 路燈控制表 —— map-script.js 的 updateDayNight 讀這裡 ─────
    // 每筆：{ pl: PointLight, bulbMat: MeshBasicMaterial }
    const _streetLights = [];
    window._cityStreetLights = _streetLights;   // 暴露給 map-script.js

    // ── 建立一個 mesh 並加入場景 ──────────────────────────────────
    function addMesh(geo, color, x, y, z, castShadow = true) {
        const scene = getScene(); if (!scene) return null;
        const mat = new THREE.MeshLambertMaterial({ color: hex(color) });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        mesh.castShadow = castShadow;
        mesh.receiveShadow = true;
        scene.add(mesh);
        _dynamicObjs.push(mesh);
        return mesh;
    }

    // 加入建築標籤
    function addLabel(text, x, y, z) {
        const scene = getScene(); if (!scene) return;
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.roundRect(4, 4, 248, 56, 8);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 22px Oxanium, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(text, 128, 38);
        const tex = new THREE.CanvasTexture(canvas);
        const smat = new THREE.SpriteMaterial({ map: tex, transparent: true });
        const sprite = new THREE.Sprite(smat);
        sprite.position.set(x, y, z);
        sprite.scale.set(8, 2, 1);
        scene.add(sprite);
        _dynamicObjs.push(sprite);
        return sprite;
    }

    // ════════════════════════════════════════════════════════════
    //  公開 API
    // ════════════════════════════════════════════════════════════

    // ── build_house(row, col, floors=1, name="") ──────────────────
    function build_house(row = null, col = null, floors = 1, name = "") {
        const tile = (row !== null && col !== null && isFree(row, col))
            ? { r: row, c: col }
            : findFreeTile(row || 40, col || 40);
        if (!tile) return console.warn('[CityLib] No free tile for house');
        occupy(tile.r, tile.c);
        const { x, z } = tilePos(tile.r, tile.c);
        const elev = tileElev(tile.r, tile.c);
        const baseY = elev;
        const TW = getTileW();
        const W = TW * 0.7, H = 2.5 * Math.max(1, floors), D = TW * 0.65;

        addMesh(new THREE.BoxGeometry(W, H, D), pick(COLORS.house), x, baseY + H / 2, z);
        const roofRadius = ((W + D) / 2) * 0.62;
        const roofGeo = new THREE.ConeGeometry(roofRadius, 2.0, 4);
        const roofMesh = addMesh(roofGeo, pick(COLORS.roof), x, baseY + H + 1.0, z);
        if (roofMesh) roofMesh.rotation.y = Math.PI / 4;
        addMesh(new THREE.BoxGeometry(0.8, 1.6, 0.2), COLORS.door, x, baseY + 0.8, z + D / 2 + 0.01);
        addMesh(new THREE.BoxGeometry(0.9, 0.9, 0.15), COLORS.window, x - W * 0.22, baseY + H * 0.62, z + D / 2 + 0.01);
        addMesh(new THREE.BoxGeometry(0.9, 0.9, 0.15), COLORS.window, x + W * 0.22, baseY + H * 0.62, z + D / 2 + 0.01);

        if (name) addLabel(name, x, baseY + H + 3.5, z);
        return { row: tile.r, col: tile.c, type: 'house' };
    }

    // ── build_park(row, col, name="") ─────────────────────────────
    function build_park(row = null, col = null, name = "") {
        const tile = (row !== null && col !== null && isFree(row, col))
            ? { r: row, c: col }
            : findFreeTile(row || 40, col || 40);
        if (!tile) return console.warn('[CityLib] No free tile for park');
        occupy(tile.r, tile.c);
        const { x, z } = tilePos(tile.r, tile.c);
        const elev = tileElev(tile.r, tile.c);
        const TW = getTileW();

        addMesh(new THREE.BoxGeometry(TW * 0.92, 0.3, TW * 0.92), pick(COLORS.park), x, elev + 0.15, z, false);
        const treePos = [{ dx: -2.5, dz: -2.5 }, { dx: 2.5, dz: -2.0 }, { dx: 0, dz: 2.5 }];
        for (const { dx, dz } of treePos) {
            addMesh(new THREE.CylinderGeometry(0.22, 0.3, 1.8, 8), COLORS.tree_trunk, x + dx, elev + 0.9, z + dz);
            addMesh(new THREE.SphereGeometry(1.2, 8, 6), pick(COLORS.tree_top), x + dx, elev + 2.8, z + dz);
        }
        addMesh(new THREE.BoxGeometry(1.6, 0.2, 0.5), 0x8b6914, x - 1.0, elev + 0.6, z - 0.5);

        if (name) addLabel(name, x, elev + 5, z);
        return { row: tile.r, col: tile.c, type: 'park' };
    }

    // ── build_library(row, col, name="") ─────────────────────────
    function build_library(row = null, col = null, name = "") {
        const tile = (row !== null && col !== null && isFree(row, col))
            ? { r: row, c: col }
            : findFreeTile(row || 40, col || 40);
        if (!tile) return console.warn('[CityLib] No free tile for library');
        occupy(tile.r, tile.c);
        const { x, z } = tilePos(tile.r, tile.c);
        const elev = tileElev(tile.r, tile.c);
        const TW = getTileW();

        addMesh(new THREE.BoxGeometry(TW * 0.8, 5.5, TW * 0.75), pick(COLORS.library), x, elev + 2.75, z);
        addMesh(new THREE.BoxGeometry(TW * 0.88, 0.6, TW * 0.83), COLORS.lib_roof, x, elev + 5.8, z);
        for (const ox of [-2.5, 2.5]) {
            addMesh(new THREE.CylinderGeometry(0.25, 0.28, 5.5, 8), 0xd8c8a0, x + ox, elev + 2.75, z + TW * 0.38);
        }
        addMesh(new THREE.BoxGeometry(1.8, 3.0, 0.2), COLORS.door, x, elev + 1.5, z + TW * 0.375 + 0.05);
        for (const ox of [-2.8, 2.8]) {
            addMesh(new THREE.BoxGeometry(1.2, 1.8, 0.15), COLORS.window, x + ox, elev + 3.5, z + TW * 0.375);
        }

        if (name) addLabel(name || "圖書館", x, elev + 8, z);
        return { row: tile.r, col: tile.c, type: 'library' };
    }

    // ── build_school(row, col, name="") ──────────────────────────
    function build_school(row = null, col = null, name = "") {
        const tile = (row !== null && col !== null && isFree(row, col))
            ? { r: row, c: col }
            : findFreeTile(row || 40, col || 40);
        if (!tile) return console.warn('[CityLib] No free tile for school');
        occupy(tile.r, tile.c);
        const { x, z } = tilePos(tile.r, tile.c);
        const elev = tileElev(tile.r, tile.c);
        const TW = getTileW();

        addMesh(new THREE.BoxGeometry(TW * 0.85, 6, TW * 0.8), COLORS.school, x, elev + 3, z);
        addMesh(new THREE.BoxGeometry(TW * 0.9, 0.7, TW * 0.85), COLORS.sch_roof, x, elev + 6.35, z);
        addMesh(new THREE.CylinderGeometry(0.1, 0.1, 5, 6), 0xaaaaaa, x, elev + 5.5, z + TW * 0.35);
        addMesh(new THREE.BoxGeometry(1.5, 1.0, 0.05), 0xdd2222, x + 0.75, elev + 8, z + TW * 0.35);
        for (let i = -1; i <= 1; i++) {
            for (let j = 0; j < 2; j++) {
                addMesh(new THREE.BoxGeometry(1.0, 1.2, 0.15), COLORS.window,
                    x + i * 2.8, elev + 2.5 + j * 2.5, z + TW * 0.4);
            }
        }
        if (name) addLabel(name || "學校", x, elev + 9, z);
        return { row: tile.r, col: tile.c, type: 'school' };
    }

    // ── build_hospital(row, col, name="") ────────────────────────
    function build_hospital(row = null, col = null, name = "") {
        const tile = (row !== null && col !== null && isFree(row, col))
            ? { r: row, c: col }
            : findFreeTile(row || 40, col || 40);
        if (!tile) return console.warn('[CityLib] No free tile for hospital');
        occupy(tile.r, tile.c);
        const { x, z } = tilePos(tile.r, tile.c);
        const elev = tileElev(tile.r, tile.c);
        const TW = getTileW();

        addMesh(new THREE.BoxGeometry(TW * 0.8, 7, TW * 0.75), COLORS.hospital, x, elev + 3.5, z);
        addMesh(new THREE.BoxGeometry(TW * 0.85, 0.6, TW * 0.8), COLORS.hosp_roof, x, elev + 7.3, z);
        addMesh(new THREE.BoxGeometry(0.6, 2.5, 0.2), 0xcc2222, x, elev + 8.5, z + TW * 0.375);
        addMesh(new THREE.BoxGeometry(2.5, 0.6, 0.2), 0xcc2222, x, elev + 8.5, z + TW * 0.375);
        for (let i = -1; i <= 1; i++) {
            for (let j = 0; j < 3; j++) {
                addMesh(new THREE.BoxGeometry(1.0, 1.2, 0.15), COLORS.window,
                    x + i * 2.5, elev + 1.8 + j * 2, z + TW * 0.38);
            }
        }
        if (name) addLabel(name || "醫院", x, elev + 10.5, z);
        return { row: tile.r, col: tile.c, type: 'hospital' };
    }

    // ── build_shop(row, col, name="") ────────────────────────────
    function build_shop(row = null, col = null, name = "") {
        const tile = (row !== null && col !== null && isFree(row, col))
            ? { r: row, c: col }
            : findFreeTile(row || 40, col || 40);
        if (!tile) return console.warn('[CityLib] No free tile for shop');
        occupy(tile.r, tile.c);
        const { x, z } = tilePos(tile.r, tile.c);
        const elev = tileElev(tile.r, tile.c);
        const TW = getTileW();

        addMesh(new THREE.BoxGeometry(TW * 0.75, 3.5, TW * 0.7), pick(COLORS.shop), x, elev + 1.75, z);
        addMesh(new THREE.BoxGeometry(TW * 0.72, 1.0, 0.2), COLORS.shop_sign, x, elev + 3.8, z + TW * 0.35);
        addMesh(new THREE.BoxGeometry(2.0, 2.2, 0.15), COLORS.window, x, elev + 1.1, z + TW * 0.35);
        addMesh(new THREE.BoxGeometry(TW * 0.78, 0.15, 1.2), pick(COLORS.shop), x, elev + 2.8, z + TW * 0.35 + 0.6);

        if (name) addLabel(name || "商店", x, elev + 6, z);
        return { row: tile.r, col: tile.c, type: 'shop' };
    }

    // ── build_road(row, col, direction="h") ──────────────────────
    function build_road(row = 40, col = 40, direction = "h") {
        const tile = { r: row, c: col };
        if (!isLand(tile.r, tile.c)) return console.warn('[CityLib] Tile is not land');
        const { x, z } = tilePos(tile.r, tile.c);
        const elev = tileElev(tile.r, tile.c);
        const TW = getTileW();

        addMesh(new THREE.BoxGeometry(TW, 0.3, TW), COLORS.road, x, elev + 0.15, z, false);
        if (direction === "h") {
            addMesh(new THREE.BoxGeometry(TW, 0.05, 0.3), COLORS.road_line, x, elev + 0.32, z, false);
        } else {
            addMesh(new THREE.BoxGeometry(0.3, 0.05, TW), COLORS.road_line, x, elev + 0.32, z, false);
        }
        occupy(tile.r, tile.c);
        return { row: tile.r, col: tile.c, type: 'road' };
    }

    // ── build_power_tower(row, col) ──────────────────────────────
    function build_power_tower(row = null, col = null) {
        const tile = (row !== null && col !== null && isFree(row, col))
            ? { r: row, c: col }
            : findFreeTile(row || 40, col || 40);
        if (!tile) return console.warn('[CityLib] No free tile for power tower');
        occupy(tile.r, tile.c);
        const { x, z } = tilePos(tile.r, tile.c);
        const elev = tileElev(tile.r, tile.c);

        addMesh(new THREE.CylinderGeometry(0.25, 0.4, 10, 6), COLORS.tower, x, elev + 5, z);
        addMesh(new THREE.BoxGeometry(4, 0.2, 0.2), COLORS.tower, x, elev + 9.2, z);
        for (const ox of [-1.8, 0, 1.8]) {
            addMesh(new THREE.SphereGeometry(0.18, 6, 6), COLORS.power, x + ox, elev + 9.0, z);
        }
        return { row: tile.r, col: tile.c, type: 'power_tower' };
    }

    // ── build_fountain(row, col, name="") ────────────────────────
    function build_fountain(row = null, col = null, name = "") {
        const tile = (row !== null && col !== null && isFree(row, col))
            ? { r: row, c: col }
            : findFreeTile(row || 40, col || 40);
        if (!tile) return console.warn('[CityLib] No free tile for fountain');
        occupy(tile.r, tile.c);
        const { x, z } = tilePos(tile.r, tile.c);
        const elev = tileElev(tile.r, tile.c);

        addMesh(new THREE.CylinderGeometry(3.2, 3.5, 0.5, 16), COLORS.fountain, x, elev + 0.25, z, false);
        addMesh(new THREE.CylinderGeometry(2.9, 2.9, 0.1, 16), COLORS.fountain_w, x, elev + 0.55, z, false);
        addMesh(new THREE.CylinderGeometry(0.2, 0.3, 2.5, 8), 0xd0c0a0, x, elev + 1.25, z);
        addMesh(new THREE.SphereGeometry(0.35, 8, 8), COLORS.fountain_w, x, elev + 2.8, z);

        if (name) addLabel(name || "噴水池", x, elev + 5, z);
        return { row: tile.r, col: tile.c, type: 'fountain' };
    }

    // ── build_streetlight(row, col) ──────────────────────────────
    // 白天燈泡熄滅，夜晚自動點亮（由 map-script.js 的 updateDayNight 驅動）
    function build_streetlight(row = null, col = null) {
        const tile = (row !== null && col !== null && isFree(row, col))
            ? { r: row, c: col }
            : findFreeTile(row || 40, col || 40);
        if (!tile) return console.warn('[CityLib] No free tile for streetlight');
        occupy(tile.r, tile.c);
        const { x, z } = tilePos(tile.r, tile.c);
        const elev = tileElev(tile.r, tile.c);
        const scene = getScene();

        // 燈柱
        addMesh(new THREE.CylinderGeometry(0.12, 0.18, 7.0, 8), COLORS.pole, x, elev + 3.5, z);
        // 橫臂
        const arm = addMesh(new THREE.CylinderGeometry(0.07, 0.07, 2.2, 6), COLORS.pole, x + 1.0, elev + 7.1, z);
        if (arm) arm.rotation.z = Math.PI / 2;
        // 燈罩外殼
        addMesh(new THREE.CylinderGeometry(0.4, 0.28, 0.5, 12), COLORS.pole, x + 2.1, elev + 6.75, z);

        // 燈泡：用 MeshBasicMaterial 讓顏色不受場景光源影響（純自發光效果）
        const bulbMat = new THREE.MeshBasicMaterial({ color: 0x221a00 }); // 熄燈時暗棕色
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), bulbMat);
        bulb.position.set(x + 2.1, elev + 6.72, z);
        scene.add(bulb);
        _dynamicObjs.push(bulb);   // 確保 clear_all 能清除

        // PointLight：初始 intensity=0（白天關閉），夜晚由 updateDayNight 調整
        // distance=35 照亮周圍約 3 個 tile，decay=1.6 使光線自然衰減
        const pl = new THREE.PointLight(0xffe8a0, 0, 35, 1.6);
        pl.position.set(x + 2.1, elev + 6.72, z);
        scene.add(pl);
        _dynamicObjs.push(pl);     // clear_all 時也一併從場景移除

        // 登記到 _streetLights：map-script.js 每幀讀取並更新 intensity 和燈泡顏色
        _streetLights.push({ pl, bulbMat });

        return { row: tile.r, col: tile.c, type: 'streetlight' };
    }

    // ── clear_all() — 清除所有動態建築物 ─────────────────────────
    function clear_all() {
        const scene = getScene(); if (!scene) return;
        _dynamicObjs.forEach(obj => scene.remove(obj));
        _dynamicObjs.length = 0;
        _streetLights.length = 0;  // 清空路燈登記（PointLight 已在上面被 remove）
        _occupied.clear();
    }

    // ── 公開介面 ──────────────────────────────────────────────────
    return {
        build_house,
        build_park,
        build_library,
        build_school,
        build_hospital,
        build_shop,
        build_road,
        build_power_tower,
        build_fountain,
        build_streetlight,   // ── 新增
        clear_all,
        _dynamicObjs,
        _occupied,
    };
})();