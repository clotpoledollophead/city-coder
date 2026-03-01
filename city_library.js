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
    };

    function hex(h) { return new THREE.Color(h); }
    function pick(arr) { return Array.isArray(arr) ? arr[Math.floor(Math.random() * arr.length)] : arr; }

    // ── 取得場景與網格資訊 ────────────────────────────────────────
    function getScene() { return window._cityScene; }
    function getGrid() { return window._cityGrid || {}; }
    function getTileW() { return (getGrid().TILE_W || 10); }
    function getOffset() { return (getGrid().OFFSET || 195); }
    function getGRID() { return (getGrid().GRID || 40); }
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
                    const r = (preferRow || 20) + dr, c = (preferCol || 20) + dc;
                    if (isFree(r, c)) return { r, c };
                }
            }
        }
        return null;
    }

    // ── 建立一個 mesh 並加入場景 ──────────────────────────────────
    function addMesh(geo, color, x, y, z, castShadow = true) {
        const scene = getScene(); if (!scene) return null;
        const mat = new THREE.MeshLambertMaterial({ color: hex(color) });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        mesh.castShadow = castShadow;
        mesh.receiveShadow = true;
        scene.add(mesh);
        return mesh;
    }

    // 加入建築標籤
    function addLabel(text, x, y, z) {
        // 用 CSS2D 模擬 — 這裡改用 canvas sprite
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
        return sprite;
    }

    // ════════════════════════════════════════════════════════════
    //  公開 API
    // ════════════════════════════════════════════════════════════

    // ── build_house(row=None, col=None, floors=1, name="") ────────
    function build_house(row = null, col = null, floors = 1, name = "") {
        const tile = (row !== null && col !== null && isFree(row, col))
            ? { r: row, c: col }
            : findFreeTile(row || 20, col || 20);
        if (!tile) return console.warn('[CityLib] No free tile for house');
        occupy(tile.r, tile.c);
        const { x, z } = tilePos(tile.r, tile.c);
        const elev = tileElev(tile.r, tile.c);
        const baseY = elev;
        const TW = getTileW();
        const W = TW * 0.7, H = 2.5 * Math.max(1, floors), D = TW * 0.65;

        // 牆壁
        addMesh(new THREE.BoxGeometry(W, H, D), pick(COLORS.house), x, baseY + H / 2, z);
        // 屋頂
        const roofGeo = new THREE.ConeGeometry(W * 0.62, 2.0, 4);
        addMesh(roofGeo, pick(COLORS.roof), x, baseY + H + 1.0, z);
        // 門
        addMesh(new THREE.BoxGeometry(0.8, 1.6, 0.2), COLORS.door, x, baseY + 0.8, z + D / 2 + 0.01);
        // 窗
        addMesh(new THREE.BoxGeometry(0.9, 0.9, 0.15), COLORS.window, x - W * 0.22, baseY + H * 0.62, z + D / 2 + 0.01);
        addMesh(new THREE.BoxGeometry(0.9, 0.9, 0.15), COLORS.window, x + W * 0.22, baseY + H * 0.62, z + D / 2 + 0.01);

        if (name) addLabel(name, x, baseY + H + 3.5, z);
        return { row: tile.r, col: tile.c, type: 'house' };
    }

    // ── build_park(row=None, col=None, name="") ───────────────────
    function build_park(row = null, col = null, name = "") {
        const tile = (row !== null && col !== null && isFree(row, col))
            ? { r: row, c: col }
            : findFreeTile(row || 20, col || 20);
        if (!tile) return console.warn('[CityLib] No free tile for park');
        occupy(tile.r, tile.c);
        const { x, z } = tilePos(tile.r, tile.c);
        const elev = tileElev(tile.r, tile.c);
        const TW = getTileW();

        // 草地
        addMesh(new THREE.BoxGeometry(TW * 0.92, 0.3, TW * 0.92), pick(COLORS.park), x, elev + 0.15, z, false);
        // 3 棵樹
        const treePos = [{ dx: -2.5, dz: -2.5 }, { dx: 2.5, dz: -2.0 }, { dx: 0, dz: 2.5 }];
        for (const { dx, dz } of treePos) {
            addMesh(new THREE.CylinderGeometry(0.22, 0.3, 1.8, 8), COLORS.tree_trunk, x + dx, elev + 0.9, z + dz);
            addMesh(new THREE.SphereGeometry(1.2, 8, 6), pick(COLORS.tree_top), x + dx, elev + 2.8, z + dz);
        }
        // 長椅
        addMesh(new THREE.BoxGeometry(1.6, 0.2, 0.5), 0x8b6914, x - 1.0, elev + 0.6, z - 0.5);

        if (name) addLabel(name, x, elev + 5, z);
        return { row: tile.r, col: tile.c, type: 'park' };
    }

    // ── build_pool(row=None, col=None, name="") ───────────────────
    function build_pool(row = null, col = null, name = "") {
        const tile = (row !== null && col !== null && isFree(row, col))
            ? { r: row, c: col }
            : findFreeTile(row || 20, col || 20);
        if (!tile) return console.warn('[CityLib] No free tile for pool');
        occupy(tile.r, tile.c);
        const { x, z } = tilePos(tile.r, tile.c);
        const elev = tileElev(tile.r, tile.c);
        const TW = getTileW();

        // 泳池甲板
        addMesh(new THREE.BoxGeometry(TW * 0.9, 0.3, TW * 0.9), COLORS.pool_deck, x, elev + 0.15, z, false);
        // 水
        addMesh(new THREE.BoxGeometry(TW * 0.6, 0.2, TW * 0.65), COLORS.pool, x, elev + 0.28, z, false);
        // 圍欄四邊
        for (const [ox, oz, sw, sd] of [
            [0, TW * 0.47, TW * 0.9, 0.15],
            [0, -TW * 0.47, TW * 0.9, 0.15],
            [TW * 0.47, 0, 0.15, TW * 0.9],
            [-TW * 0.47, 0, 0.15, TW * 0.9],
        ]) addMesh(new THREE.BoxGeometry(sw, 0.8, sd), 0xcccccc, x + ox, elev + 0.7, z + oz);

        if (name) addLabel(name, x, elev + 3, z);
        return { row: tile.r, col: tile.c, type: 'pool' };
    }

    // ── build_library(row=None, col=None, name="") ────────────────
    function build_library(row = null, col = null, name = "") {
        const tile = (row !== null && col !== null && isFree(row, col))
            ? { r: row, c: col }
            : findFreeTile(row || 20, col || 20);
        if (!tile) return console.warn('[CityLib] No free tile for library');
        occupy(tile.r, tile.c);
        const { x, z } = tilePos(tile.r, tile.c);
        const elev = tileElev(tile.r, tile.c);
        const TW = getTileW();

        addMesh(new THREE.BoxGeometry(TW * 0.8, 5.5, TW * 0.75), pick(COLORS.library), x, elev + 2.75, z);
        // 平屋頂
        addMesh(new THREE.BoxGeometry(TW * 0.88, 0.6, TW * 0.83), COLORS.lib_roof, x, elev + 5.8, z);
        // 柱子
        for (const ox of [-2.5, 2.5]) {
            addMesh(new THREE.CylinderGeometry(0.25, 0.28, 5.5, 8), 0xd8c8a0, x + ox, elev + 2.75, z + TW * 0.38);
        }
        // 大門
        addMesh(new THREE.BoxGeometry(1.8, 3.0, 0.2), COLORS.door, x, elev + 1.5, z + TW * 0.375 + 0.05);
        // 窗
        for (const ox of [-2.8, 2.8]) {
            addMesh(new THREE.BoxGeometry(1.2, 1.8, 0.15), COLORS.window, x + ox, elev + 3.5, z + TW * 0.375);
        }

        if (name) addLabel(name || "圖書館", x, elev + 8, z);
        return { row: tile.r, col: tile.c, type: 'library' };
    }

    // ── build_school(row=None, col=None, name="") ─────────────────
    function build_school(row = null, col = null, name = "") {
        const tile = (row !== null && col !== null && isFree(row, col))
            ? { r: row, c: col }
            : findFreeTile(row || 20, col || 20);
        if (!tile) return console.warn('[CityLib] No free tile for school');
        occupy(tile.r, tile.c);
        const { x, z } = tilePos(tile.r, tile.c);
        const elev = tileElev(tile.r, tile.c);
        const TW = getTileW();

        addMesh(new THREE.BoxGeometry(TW * 0.85, 6, TW * 0.8), COLORS.school, x, elev + 3, z);
        addMesh(new THREE.BoxGeometry(TW * 0.9, 0.7, TW * 0.85), COLORS.sch_roof, x, elev + 6.35, z);
        // 旗桿
        addMesh(new THREE.CylinderGeometry(0.1, 0.1, 5, 6), 0xaaaaaa, x, elev + 5.5, z + TW * 0.35);
        addMesh(new THREE.BoxGeometry(1.5, 1.0, 0.05), 0xdd2222, x + 0.75, elev + 8, z + TW * 0.35);
        // 窗格
        for (let i = -1; i <= 1; i++) {
            for (let j = 0; j < 2; j++) {
                addMesh(new THREE.BoxGeometry(1.0, 1.2, 0.15), COLORS.window,
                    x + i * 2.8, elev + 2.5 + j * 2.5, z + TW * 0.4);
            }
        }
        if (name) addLabel(name || "學校", x, elev + 9, z);
        return { row: tile.r, col: tile.c, type: 'school' };
    }

    // ── build_hospital(row=None, col=None, name="") ───────────────
    function build_hospital(row = null, col = null, name = "") {
        const tile = (row !== null && col !== null && isFree(row, col))
            ? { r: row, c: col }
            : findFreeTile(row || 20, col || 20);
        if (!tile) return console.warn('[CityLib] No free tile for hospital');
        occupy(tile.r, tile.c);
        const { x, z } = tilePos(tile.r, tile.c);
        const elev = tileElev(tile.r, tile.c);
        const TW = getTileW();

        addMesh(new THREE.BoxGeometry(TW * 0.8, 7, TW * 0.75), COLORS.hospital, x, elev + 3.5, z);
        addMesh(new THREE.BoxGeometry(TW * 0.85, 0.6, TW * 0.8), COLORS.hosp_roof, x, elev + 7.3, z);
        // 十字標誌
        addMesh(new THREE.BoxGeometry(0.6, 2.5, 0.2), 0xcc2222, x, elev + 8.5, z + TW * 0.375);
        addMesh(new THREE.BoxGeometry(2.5, 0.6, 0.2), 0xcc2222, x, elev + 8.5, z + TW * 0.375);
        // 窗
        for (let i = -1; i <= 1; i++) {
            for (let j = 0; j < 3; j++) {
                addMesh(new THREE.BoxGeometry(1.0, 1.2, 0.15), COLORS.window,
                    x + i * 2.5, elev + 1.8 + j * 2, z + TW * 0.38);
            }
        }
        if (name) addLabel(name || "醫院", x, elev + 10.5, z);
        return { row: tile.r, col: tile.c, type: 'hospital' };
    }

    // ── build_shop(row=None, col=None, name="") ───────────────────
    function build_shop(row = null, col = null, name = "") {
        const tile = (row !== null && col !== null && isFree(row, col))
            ? { r: row, c: col }
            : findFreeTile(row || 20, col || 20);
        if (!tile) return console.warn('[CityLib] No free tile for shop');
        occupy(tile.r, tile.c);
        const { x, z } = tilePos(tile.r, tile.c);
        const elev = tileElev(tile.r, tile.c);
        const TW = getTileW();

        addMesh(new THREE.BoxGeometry(TW * 0.75, 3.5, TW * 0.7), pick(COLORS.shop), x, elev + 1.75, z);
        // 招牌
        addMesh(new THREE.BoxGeometry(TW * 0.72, 1.0, 0.2), COLORS.shop_sign, x, elev + 3.8, z + TW * 0.35);
        // 玻璃門
        addMesh(new THREE.BoxGeometry(2.0, 2.2, 0.15), COLORS.window, x, elev + 1.1, z + TW * 0.35);
        // 遮雨棚
        addMesh(new THREE.BoxGeometry(TW * 0.78, 0.15, 1.2), pick(COLORS.shop), x, elev + 2.8, z + TW * 0.35 + 0.6);

        if (name) addLabel(name || "商店", x, elev + 6, z);
        return { row: tile.r, col: tile.c, type: 'shop' };
    }

    // ── build_road(row, col, direction="h") ──────────────────────
    function build_road(row = 20, col = 20, direction = "h") {
        const tile = { r: row, c: col };
        if (!isLand(tile.r, tile.c)) return console.warn('[CityLib] Tile is not land');
        const { x, z } = tilePos(tile.r, tile.c);
        const elev = tileElev(tile.r, tile.c);
        const TW = getTileW();

        addMesh(new THREE.BoxGeometry(TW, 0.3, TW), COLORS.road, x, elev + 0.15, z, false);
        // 中心線
        if (direction === "h") {
            addMesh(new THREE.BoxGeometry(TW, 0.05, 0.3), COLORS.road_line, x, elev + 0.32, z, false);
        } else {
            addMesh(new THREE.BoxGeometry(0.3, 0.05, TW), COLORS.road_line, x, elev + 0.32, z, false);
        }
        occupy(tile.r, tile.c);
        return { row: tile.r, col: tile.c, type: 'road' };
    }

    // ── build_power_tower(row=None, col=None) ─────────────────────
    function build_power_tower(row = null, col = null) {
        const tile = (row !== null && col !== null && isFree(row, col))
            ? { r: row, c: col }
            : findFreeTile(row || 20, col || 20);
        if (!tile) return console.warn('[CityLib] No free tile for power tower');
        occupy(tile.r, tile.c);
        const { x, z } = tilePos(tile.r, tile.c);
        const elev = tileElev(tile.r, tile.c);

        // 塔身
        addMesh(new THREE.CylinderGeometry(0.25, 0.4, 10, 6), COLORS.tower, x, elev + 5, z);
        // 橫臂
        addMesh(new THREE.BoxGeometry(4, 0.2, 0.2), COLORS.tower, x, elev + 9.2, z);
        // 電線（發光點）
        for (const ox of [-1.8, 0, 1.8]) {
            addMesh(new THREE.SphereGeometry(0.18, 6, 6), COLORS.power, x + ox, elev + 9.0, z);
        }
        return { row: tile.r, col: tile.c, type: 'power_tower' };
    }

    // ── build_fountain(row=None, col=None, name="") ───────────────
    function build_fountain(row = null, col = null, name = "") {
        const tile = (row !== null && col !== null && isFree(row, col))
            ? { r: row, c: col }
            : findFreeTile(row || 20, col || 20);
        if (!tile) return console.warn('[CityLib] No free tile for fountain');
        occupy(tile.r, tile.c);
        const { x, z } = tilePos(tile.r, tile.c);
        const elev = tileElev(tile.r, tile.c);

        // 池子
        addMesh(new THREE.CylinderGeometry(3.2, 3.5, 0.5, 16), COLORS.fountain, x, elev + 0.25, z, false);
        // 水面
        addMesh(new THREE.CylinderGeometry(2.9, 2.9, 0.1, 16), COLORS.fountain_w, x, elev + 0.55, z, false);
        // 中心柱
        addMesh(new THREE.CylinderGeometry(0.2, 0.3, 2.5, 8), 0xd0c0a0, x, elev + 1.25, z);
        // 噴水頭
        addMesh(new THREE.SphereGeometry(0.35, 8, 8), COLORS.fountain_w, x, elev + 2.8, z);

        if (name) addLabel(name || "噴水池", x, elev + 5, z);
        return { row: tile.r, col: tile.c, type: 'fountain' };
    }

    // ── build_apartment(row=None, col=None, floors=4, name="") ────
    function build_apartment(row = null, col = null, floors = 4, name = "") {
        const tile = (row !== null && col !== null && isFree(row, col))
            ? { r: row, c: col }
            : findFreeTile(row || 20, col || 20);
        if (!tile) return console.warn('[CityLib] No free tile for apartment');
        occupy(tile.r, tile.c);
        const { x, z } = tilePos(tile.r, tile.c);
        const elev = tileElev(tile.r, tile.c);
        const TW = getTileW();
        const H = 3.0 * Math.max(2, Math.min(floors, 10));

        addMesh(new THREE.BoxGeometry(TW * 0.75, H, TW * 0.7), 0xd4c8b8, x, elev + H / 2, z);
        addMesh(new THREE.BoxGeometry(TW * 0.78, 0.5, TW * 0.73), 0x888888, x, elev + H + 0.25, z);
        // 每層窗戶
        for (let f = 0; f < floors && f < 8; f++) {
            for (let i = -1; i <= 1; i++) {
                addMesh(new THREE.BoxGeometry(0.9, 1.1, 0.15), COLORS.window,
                    x + i * 2.2, elev + 1.5 + f * 3.0, z + TW * 0.35 + 0.01);
            }
        }
        // 底層大門
        addMesh(new THREE.BoxGeometry(1.2, 2.0, 0.15), COLORS.door, x, elev + 1.0, z + TW * 0.35 + 0.01);

        if (name) addLabel(name || "公寓", x, elev + H + 3, z);
        return { row: tile.r, col: tile.c, type: 'apartment' };
    }

    // ── clear_all() — 清除所有動態建築物 ─────────────────────────
    function clear_all() {
        const scene = getScene(); if (!scene) return;
        const toRemove = [];
        scene.traverse(obj => {
            if (obj.userData && obj.userData.dynamic) toRemove.push(obj);
        });
        toRemove.forEach(obj => scene.remove(obj));
        _occupied.clear();
        // 重新標記動態物件 — 這個版本我們用另一個追蹤陣列
        _dynamicObjs.forEach(obj => scene.remove(obj));
        _dynamicObjs.length = 0;
    }

    // 追蹤動態物件（讓 clear_all 可以清除）
    const _dynamicObjs = [];
    const _origAddMesh = addMesh;
    // Monkey-patch addMesh 以追蹤
    function addMeshTracked(geo, color, x, y, z, castShadow = true) {
        const m = _origAddMesh(geo, color, x, y, z, castShadow);
        if (m) _dynamicObjs.push(m);
        return m;
    }
    // 替換 addMesh
    // (直接讓所有函式都用這個)

    // ── 公開介面 ──────────────────────────────────────────────────
    return {
        build_house,
        build_park,
        build_pool,
        build_library,
        build_school,
        build_hospital,
        build_shop,
        build_road,
        build_power_tower,
        build_fountain,
        build_apartment,
        clear_all,
        _dynamicObjs,
        _occupied,
    };
})();