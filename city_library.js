// ═══════════════════════════════════════════════════════════════
//  city_library.js  —  CodeScape: 未來程市 建築函式庫
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
        library: [0xc8b08a, 0xb89a70, 0xd4bc96],
        lib_roof: 0x4a3020,
        school: 0xf0e080,
        sch_roof: 0x2060a0,
        hospital: 0xf5f5f5,
        hosp_roof: 0xcc2222,
        shop: [0xf08030, 0xe07020, 0xff9040],
        shop_sign: 0xff4444,
        road: 0x2e2e2e,   // 深灰瀝青
        road_mid: 0x3a3a3a,   // 路面中間色
        road_dark: 0x252525,   // 路口深色
        road_line: 0xffffff,   // 白色中心線
        road_line2: 0xffdd00,   // 黃色雙中心線
        sidewalk: 0xb0a898,   // 石磚人行道
        sidewalk_dark: 0x8a8078,   // 石磚深縫
        curb: 0x6a6058,   // 路緣石
        power: 0xffcc00,
        tower: 0x888888,
        fountain: 0x60b8e0,
        fountain_w: 0x90d0ff,
        pole: 0x888899,
    };

    function hex(h) { return new THREE.Color(h); }
    function pick(arr) { return Array.isArray(arr) ? arr[Math.floor(Math.random() * arr.length)] : arr; }

    // ── Scene / grid helpers ──────────────────────────────────────
    function getScene() { return window._cityScene; }
    function getGrid() { return window._cityGrid || {}; }
    function getTileW() { return getGrid().TILE_W || 10; }
    function getOffset() { return getGrid().OFFSET || 395; }
    function getGRID() { return getGrid().GRID || 80; }
    function getLandMask() { return window._cityLandMask || null; }

    function tilePos(row, col) {
        const TW = getTileW(), OFF = getOffset();
        return { x: col * TW - OFF, z: row * TW - OFF };
    }
    function tileElev(row, col) {
        const GRID = getGRID();
        const nx = (col / (GRID - 1)) * 2 - 1, nz = (row / (GRID - 1)) * 2 - 1;
        const dist = Math.sqrt(nx * nx + nz * nz);
        const h = Math.max(0, 1 - dist * 1.3);
        return h * h * 3.5;
    }
    function isLand(row, col) {
        const mask = getLandMask(), GRID = getGRID();
        if (!mask || row < 0 || row >= GRID || col < 0 || col >= GRID) return false;
        return mask[row][col];
    }

    // ── Occupied tiles ────────────────────────────────────────────
    const _occupied = new Set();
    function occupy(row, col) { _occupied.add(`${row},${col}`); }
    function isFree(row, col) { return isLand(row, col) && !_occupied.has(`${row},${col}`); }

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

    // ── Dynamic object registry ───────────────────────────────────
    const _dynamicObjs = [];
    const _streetLights = [];
    window._cityStreetLights = _streetLights;

    // ── Building registry for debug exclamation marks ─────────────
    // _buildingRegistry: Map< "r,c", { type, name, x, y, z, topY } >
    const _buildingRegistry = new Map();
    window._cityBuildingRegistry = _buildingRegistry;

    function registerBuilding(row, col, type, x, topY, z) {
        _buildingRegistry.set(`${row},${col}`, { type, row, col, x, topY, z });
        // Notify debug system if it exists
        if (window.DebugSystem) window.DebugSystem.onBuildingAdded(_buildingRegistry.size);
    }

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

    function addLabel(text, x, y, z) {
        const scene = getScene(); if (!scene) return;
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.roundRect(4, 4, 248, 56, 8); ctx.fill();
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

    function warnOffland(fn, row, col) {
        console.warn(`[CityLib] ${fn}(${row},${col}) — 座標不在陸地上！`);
        return null;
    }

    // ════════════════════════════════════════════════════════════
    //  ROAD SYSTEM — deferred-rebuild + seamless junction rendering
    //
    //  連接類型由四向 bitmask 自動判斷：
    //    N=1, E=2, S=4, W=8
    //    各種組合 → 十字、T型、L型、直路、端點
    //
    //  核心改進：
    //  1. 路面以一個完整的平面鋪滿連接區域，不再有格縫
    //  2. 人行道只在「外側邊緣」繪製（沒有道路連接的方向）
    //  3. 路口角落填滿，消除空洞
    // ════════════════════════════════════════════════════════════

    const _roadReg = new Map();
    const _roadMeshMap = new Map();

    function rk(r, c) { return `${r},${c}`; }
    function roadDirs(r, c) { return _roadReg.get(rk(r, c)) || new Set(); }
    function hasRoad(r, c) { return roadDirs(r, c).size > 0; }

    function purgeRoadMeshes(r, c) {
        const key = rk(r, c);
        const meshes = _roadMeshMap.get(key);
        if (!meshes) return;
        const scene = getScene();
        meshes.forEach(m => {
            if (scene) scene.remove(m);
            const i = _dynamicObjs.indexOf(m);
            if (i !== -1) _dynamicObjs.splice(i, 1);
        });
        _roadMeshMap.delete(key);
    }

    function rmesh(key, geo, color, x, y, z, rotY = 0) {
        const scene = getScene(); if (!scene) return;
        const mat = new THREE.MeshLambertMaterial({ color: hex(color) });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        if (rotY) mesh.rotation.y = rotY;
        mesh.castShadow = false;
        mesh.receiveShadow = true;
        scene.add(mesh);
        _dynamicObjs.push(mesh);
        if (!_roadMeshMap.has(key)) _roadMeshMap.set(key, []);
        _roadMeshMap.get(key).push(mesh);
    }

    // ── 道路尺寸常數 ──────────────────────────────────────────────
    const RW_R = 0.50;   // 路面寬占 tile 比例（剛好半格，方便對齊）
    const SW_R = 0.12;   // 人行道寬占 tile 比例
    const RH = 0.18;   // 路面高度（扁平，像瀝青貼地）
    const SWH = 0.38;   // 人行道高度（明顯高於路面）
    const CRB = 0.12;   // 路緣石高

    // ── 連接性 bitmask ────────────────────────────────────────────
    // 判斷此格的道路在四個方向是否有相鄰道路「連接」
    // 只有方向一致才算連接（H路左右連、V路上下連）
    function getConnectionMask(r, c) {
        const dirs = roadDirs(r, c);
        const isH = dirs.has('h'), isV = dirs.has('v');
        // 鄰格只要有路（任意方向）就算連接，這樣 H 路也能偵測到上下的 H 鄰居
        const N = hasRoad(r - 1, c) ? 1 : 0;
        const E = hasRoad(r, c + 1) ? 2 : 0;
        const S = hasRoad(r + 1, c) ? 4 : 0;
        const W = hasRoad(r, c - 1) ? 8 : 0;
        // 只回報與本格道路「方向相關」的連接：
        // H路關心左右(E/W)和上下是否有路（用於T型融合）
        // V路關心上下(N/S)和左右是否有路
        // 如果本格是十字，全部都有意義
        return N | E | S | W;
    }

    // ── 重新繪製單格道路（新版融合算法）────────────────────────────
    // ── 重新繪製單格道路（Minecraft 風格）───────────────────────────
    function rebuildRoadTile(r, c) {
        const dirs = roadDirs(r, c);
        if (dirs.size === 0) return;

        purgeRoadMeshes(r, c);

        const key = rk(r, c);
        const { x, z } = tilePos(r, c);
        const elev = tileElev(r, c);
        const TW = getTileW();
        const RW = TW * RW_R;
        const SW = TW * SW_R;
        const half = TW / 2;

        const RY = elev + RH / 2;
        const SWY = elev + SWH / 2;
        const CRBY = elev + SWH + CRB / 2;
        const LINEY = elev + RH + 0.03;

        const isH = dirs.has('h');
        const isV = dirs.has('v');
        const mask = getConnectionMask(r, c);
        const cN = !!(mask & 1), cE = !!(mask & 2);
        const cS = !!(mask & 4), cW = !!(mask & 8);
        const hasH = isH || cE || cW;
        const hasV = isV || cN || cS;

        // ── 人行道：石磚格紋輔助 ─────────────────────────────────
        function swBlock(bx, by, bz, bw, bh, bd) {
            rmesh(key, new THREE.BoxGeometry(bw, bh, bd),
                COLORS.sidewalk, bx, by, bz);
            // 表面暗縫（模擬石磚接縫）
            const nSX = Math.max(1, Math.round(bw / (TW * 0.13)));
            for (let i = 1; i < nSX; i++) {
                const ox = bx - bw / 2 + (bw / nSX) * i;
                rmesh(key, new THREE.BoxGeometry(0.07, 0.05, bd * 0.94),
                    COLORS.sidewalk_dark, ox, by + bh / 2 + 0.02, bz);
            }
            const nSZ = Math.max(1, Math.round(bd / (TW * 0.13)));
            for (let i = 1; i < nSZ; i++) {
                const oz = bz - bd / 2 + (bd / nSZ) * i;
                rmesh(key, new THREE.BoxGeometry(bw * 0.94, 0.05, 0.07),
                    COLORS.sidewalk_dark, bx, by + bh / 2 + 0.02, oz);
            }
        }

        function curbH(cx, cz, cw) {
            rmesh(key, new THREE.BoxGeometry(cw, CRB, SW * 0.55),
                COLORS.curb, cx, CRBY, cz);
        }
        function curbV(cx, cz, cd) {
            rmesh(key, new THREE.BoxGeometry(SW * 0.55, CRB, cd),
                COLORS.curb, cx, CRBY, cz);
        }

        // ════════════════════════════════════════════════════════
        //  1. 路面主體
        // ════════════════════════════════════════════════════════
        if (hasH && hasV) {
            rmesh(key, new THREE.BoxGeometry(TW, RH, TW),
                COLORS.road_dark, x, RY, z);
        } else if (hasH) {
            rmesh(key, new THREE.BoxGeometry(TW, RH, RW),
                COLORS.road, x, RY, z);
            rmesh(key, new THREE.BoxGeometry(TW, RH + 0.01, RW * 0.28),
                COLORS.road_mid, x, RY, z);
        } else {
            rmesh(key, new THREE.BoxGeometry(RW, RH, TW),
                COLORS.road, x, RY, z);
            rmesh(key, new THREE.BoxGeometry(RW * 0.28, RH + 0.01, TW),
                COLORS.road_mid, x, RY, z);
        }

        // ════════════════════════════════════════════════════════
        //  2. 道路標線
        // ════════════════════════════════════════════════════════
        if (hasH && !hasV) {
            // 白色虛線中心線
            [-0.32, 0, 0.32].forEach(t =>
                rmesh(key, new THREE.BoxGeometry(TW * 0.16, 0.05, 0.20),
                    COLORS.road_line, x + t * TW, LINEY, z));
        } else if (hasV && !hasH) {
            [-0.32, 0, 0.32].forEach(t =>
                rmesh(key, new THREE.BoxGeometry(0.20, 0.05, TW * 0.16),
                    COLORS.road_line, x, LINEY, z + t * TW));
        } else {
            // 路口斑馬線（在有連接的邊畫）
            const stripeW = RW * 0.13;
            const stripeGap = RW * 0.17;
            const stripeCount = 4;
            const stripeLen = SW * 1.5;
            function zebra(dir) {
                for (let i = 0; i < stripeCount; i++) {
                    const off = -((stripeCount - 1) * (stripeW + stripeGap)) / 2
                        + i * (stripeW + stripeGap);
                    if (dir === 'N')
                        rmesh(key, new THREE.BoxGeometry(stripeW, 0.05, stripeLen),
                            COLORS.road_line, x + off, LINEY, z - RW / 2 - stripeLen * 0.3);
                    else if (dir === 'S')
                        rmesh(key, new THREE.BoxGeometry(stripeW, 0.05, stripeLen),
                            COLORS.road_line, x + off, LINEY, z + RW / 2 + stripeLen * 0.3);
                    else if (dir === 'W')
                        rmesh(key, new THREE.BoxGeometry(stripeLen, 0.05, stripeW),
                            COLORS.road_line, x - RW / 2 - stripeLen * 0.3, LINEY, z + off);
                    else if (dir === 'E')
                        rmesh(key, new THREE.BoxGeometry(stripeLen, 0.05, stripeW),
                            COLORS.road_line, x + RW / 2 + stripeLen * 0.3, LINEY, z + off);
                }
            }
            if (cN) zebra('N');
            if (cS) zebra('S');
            if (cE) zebra('E');
            if (cW) zebra('W');
        }

        // ════════════════════════════════════════════════════════
        //  3. 人行道 + 路緣石（石磚格紋）
        // ════════════════════════════════════════════════════════
        if (hasH && hasV) {
            const sqHalf = RW / 2 + SW / 2;
            [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
                swBlock(x + sx * sqHalf, SWY, z + sz * sqHalf, SW, SWH, SW);
            });
            return;
        }

        if (hasH) {
            const sqHalf = RW / 2 + SW / 2;
            if (!cN) {
                swBlock(x, SWY, z - sqHalf, TW, SWH, SW);
                curbH(x, z - RW / 2 - CRB * 0.5, TW);
            } else {
                const sLen = half - RW / 2 - SW;
                if (sLen > 0.5) {
                    swBlock(x - half + sLen / 2, SWY, z - sqHalf, sLen, SWH, SW);
                    swBlock(x + half - sLen / 2, SWY, z - sqHalf, sLen, SWH, SW);
                }
            }
            if (!cS) {
                swBlock(x, SWY, z + sqHalf, TW, SWH, SW);
                curbH(x, z + RW / 2 + CRB * 0.5, TW);
            } else {
                const sLen = half - RW / 2 - SW;
                if (sLen > 0.5) {
                    swBlock(x - half + sLen / 2, SWY, z + sqHalf, sLen, SWH, SW);
                    swBlock(x + half - sLen / 2, SWY, z + sqHalf, sLen, SWH, SW);
                }
            }
            if (!cW) {
                if (!cN) swBlock(x - half + SW / 2, SWY, z - sqHalf, SW, SWH, SW);
                if (!cS) swBlock(x - half + SW / 2, SWY, z + sqHalf, SW, SWH, SW);
                swBlock(x - half + SW / 2, SWY, z, SW, SWH, RW + SW * 2);
                curbV(x - RW / 2 - CRB * 0.5, z, RW + SW * 2);
            }
            if (!cE) {
                if (!cN) swBlock(x + half - SW / 2, SWY, z - sqHalf, SW, SWH, SW);
                if (!cS) swBlock(x + half - SW / 2, SWY, z + sqHalf, SW, SWH, SW);
                swBlock(x + half - SW / 2, SWY, z, SW, SWH, RW + SW * 2);
                curbV(x + RW / 2 + CRB * 0.5, z, RW + SW * 2);
            }
        }

        if (hasV) {
            const sqHalf = RW / 2 + SW / 2;
            if (!cE) {
                swBlock(x + sqHalf, SWY, z, SW, SWH, TW);
                curbV(x + RW / 2 + CRB * 0.5, z, TW);
            } else {
                const sLen = half - RW / 2 - SW;
                if (sLen > 0.5) {
                    swBlock(x + sqHalf, SWY, z - half + sLen / 2, SW, SWH, sLen);
                    swBlock(x + sqHalf, SWY, z + half - sLen / 2, SW, SWH, sLen);
                }
            }
            if (!cW) {
                swBlock(x - sqHalf, SWY, z, SW, SWH, TW);
                curbV(x - RW / 2 - CRB * 0.5, z, TW);
            } else {
                const sLen = half - RW / 2 - SW;
                if (sLen > 0.5) {
                    swBlock(x - sqHalf, SWY, z - half + sLen / 2, SW, SWH, sLen);
                    swBlock(x - sqHalf, SWY, z + half - sLen / 2, SW, SWH, sLen);
                }
            }
            if (!cN) {
                if (!cE) swBlock(x + sqHalf, SWY, z - half + SW / 2, SW, SWH, SW);
                if (!cW) swBlock(x - sqHalf, SWY, z - half + SW / 2, SW, SWH, SW);
                swBlock(x, SWY, z - half + SW / 2, RW + SW * 2, SWH, SW);
                curbH(x, z - RW / 2 - CRB * 0.5, RW + SW * 2);
            }
            if (!cS) {
                if (!cE) swBlock(x + sqHalf, SWY, z + half - SW / 2, SW, SWH, SW);
                if (!cW) swBlock(x - sqHalf, SWY, z + half - SW / 2, SW, SWH, SW);
                swBlock(x, SWY, z + half - SW / 2, RW + SW * 2, SWH, SW);
                curbH(x, z + RW / 2 + CRB * 0.5, RW + SW * 2);
            }
        }
    }

    // ── 公開 build_road ───────────────────────────────────────────
    function build_road(row = 40, col = 40, direction = "auto") {
        if (!isLand(row, col)) return warnOffland('build_road', row, col);

        let dirsToAdd;
        if (direction === 'h' || direction === 'v') {
            dirsToAdd = [direction];
        } else {
            const adjH = hasRoad(row, col - 1) || hasRoad(row, col + 1);
            const adjV = hasRoad(row - 1, col) || hasRoad(row + 1, col);
            if (adjH && adjV) dirsToAdd = ['h', 'v'];
            else if (adjV) dirsToAdd = ['v'];
            else dirsToAdd = ['h'];
        }

        const key = rk(row, col);
        if (!_roadReg.has(key)) {
            occupy(row, col);
            _roadReg.set(key, new Set());
        }
        dirsToAdd.forEach(d => _roadReg.get(key).add(d));

        // 重建本格及四鄰（鄰格可能因連接狀態改變而需要更新人行道）
        [[row, col], [row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]]
            .forEach(([r, c]) => rebuildRoadTile(r, c));

        return { row, col, type: 'road' };
    }

    // ════════════════════════════════════════════════════════════
    //  非道路建築函式
    // ════════════════════════════════════════════════════════════

    function build_house(row = null, col = null, floors = 1, name = "") {
        if (row !== null && col !== null && !isLand(row, col))
            return warnOffland('build_house', row, col);
        const tile = (row !== null && col !== null && isFree(row, col))
            ? { r: row, c: col } : findFreeTile(row || 40, col || 40);
        if (!tile) return console.warn('[CityLib] No free tile for house');
        occupy(tile.r, tile.c);
        const { x, z } = tilePos(tile.r, tile.c);
        const elev = tileElev(tile.r, tile.c);
        const TW = getTileW();
        const W = TW * 0.7, H = 2.5 * Math.max(1, floors), D = TW * 0.65;
        addMesh(new THREE.BoxGeometry(W, H, D), pick(COLORS.house), x, elev + H / 2, z);
        const rm = addMesh(new THREE.ConeGeometry(((W + D) / 2) * 0.62, 2.0, 4),
            pick(COLORS.roof), x, elev + H + 1.0, z);
        if (rm) rm.rotation.y = Math.PI / 4;
        addMesh(new THREE.BoxGeometry(0.8, 1.6, 0.2), COLORS.door, x, elev + 0.8, z + D / 2 + 0.01);
        addMesh(new THREE.BoxGeometry(0.9, 0.9, 0.15), COLORS.window, x - W * 0.22, elev + H * 0.62, z + D / 2 + 0.01);
        addMesh(new THREE.BoxGeometry(0.9, 0.9, 0.15), COLORS.window, x + W * 0.22, elev + H * 0.62, z + D / 2 + 0.01);
        if (name) addLabel(name, x, elev + H + 3.5, z);
        registerBuilding(tile.r, tile.c, 'house', x, elev + H + 2, z);
        return { row: tile.r, col: tile.c, type: 'house' };
    }

    function build_park(row = null, col = null, name = "") {
        if (row !== null && col !== null && !isLand(row, col))
            return warnOffland('build_park', row, col);
        const tile = (row !== null && col !== null && isFree(row, col))
            ? { r: row, c: col } : findFreeTile(row || 40, col || 40);
        if (!tile) return console.warn('[CityLib] No free tile for park');
        occupy(tile.r, tile.c);
        const { x, z } = tilePos(tile.r, tile.c);
        const elev = tileElev(tile.r, tile.c);
        const TW = getTileW();
        addMesh(new THREE.BoxGeometry(TW * 0.92, 0.3, TW * 0.92), pick(COLORS.park), x, elev + 0.15, z, false);
        for (const { dx, dz } of [{ dx: -2.5, dz: -2.5 }, { dx: 2.5, dz: -2.0 }, { dx: 0, dz: 2.5 }]) {
            addMesh(new THREE.CylinderGeometry(0.22, 0.3, 1.8, 8), COLORS.tree_trunk, x + dx, elev + 0.9, z + dz);
            addMesh(new THREE.SphereGeometry(1.2, 8, 6), pick(COLORS.tree_top), x + dx, elev + 2.8, z + dz);
        }
        addMesh(new THREE.BoxGeometry(1.6, 0.2, 0.5), 0x8b6914, x - 1.0, elev + 0.6, z - 0.5);
        if (name) addLabel(name, x, elev + 5, z);
        registerBuilding(tile.r, tile.c, 'park', x, elev + 4, z);
        return { row: tile.r, col: tile.c, type: 'park' };
    }

    function build_library(row = null, col = null, name = "") {
        if (row !== null && col !== null && !isLand(row, col))
            return warnOffland('build_library', row, col);
        const tile = (row !== null && col !== null && isFree(row, col))
            ? { r: row, c: col } : findFreeTile(row || 40, col || 40);
        if (!tile) return console.warn('[CityLib] No free tile for library');
        occupy(tile.r, tile.c);
        const { x, z } = tilePos(tile.r, tile.c);
        const elev = tileElev(tile.r, tile.c);
        const TW = getTileW();
        addMesh(new THREE.BoxGeometry(TW * 0.8, 5.5, TW * 0.75), pick(COLORS.library), x, elev + 2.75, z);
        addMesh(new THREE.BoxGeometry(TW * 0.88, 0.6, TW * 0.83), COLORS.lib_roof, x, elev + 5.8, z);
        for (const ox of [-2.5, 2.5])
            addMesh(new THREE.CylinderGeometry(0.25, 0.28, 5.5, 8), 0xd8c8a0, x + ox, elev + 2.75, z + TW * 0.38);
        addMesh(new THREE.BoxGeometry(1.8, 3.0, 0.2), COLORS.door, x, elev + 1.5, z + TW * 0.375 + 0.05);
        for (const ox of [-2.8, 2.8])
            addMesh(new THREE.BoxGeometry(1.2, 1.8, 0.15), COLORS.window, x + ox, elev + 3.5, z + TW * 0.375);
        if (name) addLabel(name || "圖書館", x, elev + 8, z);
        registerBuilding(tile.r, tile.c, 'library', x, elev + 7, z);
        return { row: tile.r, col: tile.c, type: 'library' };
    }

    function build_school(row = null, col = null, name = "") {
        if (row !== null && col !== null && !isLand(row, col))
            return warnOffland('build_school', row, col);
        const tile = (row !== null && col !== null && isFree(row, col))
            ? { r: row, c: col } : findFreeTile(row || 40, col || 40);
        if (!tile) return console.warn('[CityLib] No free tile for school');
        occupy(tile.r, tile.c);
        const { x, z } = tilePos(tile.r, tile.c);
        const elev = tileElev(tile.r, tile.c);
        const TW = getTileW();
        addMesh(new THREE.BoxGeometry(TW * 0.85, 6, TW * 0.8), COLORS.school, x, elev + 3, z);
        addMesh(new THREE.BoxGeometry(TW * 0.9, 0.7, TW * 0.85), COLORS.sch_roof, x, elev + 6.35, z);
        addMesh(new THREE.CylinderGeometry(0.1, 0.1, 5, 6), 0xaaaaaa, x, elev + 5.5, z + TW * 0.35);
        addMesh(new THREE.BoxGeometry(1.5, 1.0, 0.05), 0xdd2222, x + 0.75, elev + 8, z + TW * 0.35);
        for (let i = -1; i <= 1; i++) for (let j = 0; j < 2; j++)
            addMesh(new THREE.BoxGeometry(1.0, 1.2, 0.15), COLORS.window, x + i * 2.8, elev + 2.5 + j * 2.5, z + TW * 0.4);
        if (name) addLabel(name || "學校", x, elev + 9, z);
        registerBuilding(tile.r, tile.c, 'school', x, elev + 8, z);
        return { row: tile.r, col: tile.c, type: 'school' };
    }

    function build_hospital(row = null, col = null, name = "") {
        if (row !== null && col !== null && !isLand(row, col))
            return warnOffland('build_hospital', row, col);
        const tile = (row !== null && col !== null && isFree(row, col))
            ? { r: row, c: col } : findFreeTile(row || 40, col || 40);
        if (!tile) return console.warn('[CityLib] No free tile for hospital');
        occupy(tile.r, tile.c);
        const { x, z } = tilePos(tile.r, tile.c);
        const elev = tileElev(tile.r, tile.c);
        const TW = getTileW();
        addMesh(new THREE.BoxGeometry(TW * 0.8, 7, TW * 0.75), COLORS.hospital, x, elev + 3.5, z);
        addMesh(new THREE.BoxGeometry(TW * 0.85, 0.6, TW * 0.8), COLORS.hosp_roof, x, elev + 7.3, z);
        addMesh(new THREE.BoxGeometry(0.6, 2.5, 0.2), 0xcc2222, x, elev + 8.5, z + TW * 0.375);
        addMesh(new THREE.BoxGeometry(2.5, 0.6, 0.2), 0xcc2222, x, elev + 8.5, z + TW * 0.375);
        for (let i = -1; i <= 1; i++) for (let j = 0; j < 3; j++)
            addMesh(new THREE.BoxGeometry(1.0, 1.2, 0.15), COLORS.window, x + i * 2.5, elev + 1.8 + j * 2, z + TW * 0.38);
        if (name) addLabel(name || "醫院", x, elev + 10.5, z);
        registerBuilding(tile.r, tile.c, 'hospital', x, elev + 9, z);
        return { row: tile.r, col: tile.c, type: 'hospital' };
    }

    function build_shop(row = null, col = null, name = "") {
        if (row !== null && col !== null && !isLand(row, col))
            return warnOffland('build_shop', row, col);
        const tile = (row !== null && col !== null && isFree(row, col))
            ? { r: row, c: col } : findFreeTile(row || 40, col || 40);
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
        registerBuilding(tile.r, tile.c, 'shop', x, elev + 5, z);
        return { row: tile.r, col: tile.c, type: 'shop' };
    }

    function build_power_tower(row = null, col = null) {
        if (row !== null && col !== null && !isLand(row, col))
            return warnOffland('build_power_tower', row, col);
        const tile = (row !== null && col !== null && isFree(row, col))
            ? { r: row, c: col } : findFreeTile(row || 40, col || 40);
        if (!tile) return console.warn('[CityLib] No free tile for power tower');
        occupy(tile.r, tile.c);
        const { x, z } = tilePos(tile.r, tile.c);
        const elev = tileElev(tile.r, tile.c);
        addMesh(new THREE.CylinderGeometry(0.25, 0.4, 10, 6), COLORS.tower, x, elev + 5, z);
        addMesh(new THREE.BoxGeometry(4, 0.2, 0.2), COLORS.tower, x, elev + 9.2, z);
        for (const ox of [-1.8, 0, 1.8])
            addMesh(new THREE.SphereGeometry(0.18, 6, 6), COLORS.power, x + ox, elev + 9.0, z);
        registerBuilding(tile.r, tile.c, 'power_tower', x, elev + 10, z);
        return { row: tile.r, col: tile.c, type: 'power_tower' };
    }

    function build_fountain(row = null, col = null, name = "") {
        if (row !== null && col !== null && !isLand(row, col))
            return warnOffland('build_fountain', row, col);
        const tile = (row !== null && col !== null && isFree(row, col))
            ? { r: row, c: col } : findFreeTile(row || 40, col || 40);
        if (!tile) return console.warn('[CityLib] No free tile for fountain');
        occupy(tile.r, tile.c);
        const { x, z } = tilePos(tile.r, tile.c);
        const elev = tileElev(tile.r, tile.c);
        addMesh(new THREE.CylinderGeometry(3.2, 3.5, 0.5, 16), COLORS.fountain, x, elev + 0.25, z, false);
        addMesh(new THREE.CylinderGeometry(2.9, 2.9, 0.1, 16), COLORS.fountain_w, x, elev + 0.55, z, false);
        addMesh(new THREE.CylinderGeometry(0.2, 0.3, 2.5, 8), 0xd0c0a0, x, elev + 1.25, z);
        addMesh(new THREE.SphereGeometry(0.35, 8, 8), COLORS.fountain_w, x, elev + 2.8, z);
        if (name) addLabel(name || "噴水池", x, elev + 5, z);
        registerBuilding(tile.r, tile.c, 'fountain', x, elev + 4, z);
        return { row: tile.r, col: tile.c, type: 'fountain' };
    }

    function build_streetlight(row = null, col = null) {
        if (row !== null && col !== null && !isLand(row, col))
            return warnOffland('build_streetlight', row, col);
        const tile = (row !== null && col !== null && isFree(row, col))
            ? { r: row, c: col } : findFreeTile(row || 40, col || 40);
        if (!tile) return console.warn('[CityLib] No free tile for streetlight');
        occupy(tile.r, tile.c);
        const { x, z } = tilePos(tile.r, tile.c);
        const elev = tileElev(tile.r, tile.c);
        const scene = getScene();
        addMesh(new THREE.CylinderGeometry(0.12, 0.18, 7.0, 8), COLORS.pole, x, elev + 3.5, z);
        const arm = addMesh(new THREE.CylinderGeometry(0.07, 0.07, 2.2, 6), COLORS.pole, x + 1.0, elev + 7.1, z);
        if (arm) arm.rotation.z = Math.PI / 2;
        addMesh(new THREE.CylinderGeometry(0.4, 0.28, 0.5, 12), COLORS.pole, x + 2.1, elev + 6.75, z);
        const bulbMat = new THREE.MeshBasicMaterial({ color: 0x221a00 });
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), bulbMat);
        bulb.position.set(x + 2.1, elev + 6.72, z);
        scene.add(bulb); _dynamicObjs.push(bulb);
        const pl = new THREE.PointLight(0xffe8a0, 0, 35, 1.6);
        pl.position.set(x + 2.1, elev + 6.72, z);
        scene.add(pl); _dynamicObjs.push(pl);
        _streetLights.push({ pl, bulbMat });
        return { row: tile.r, col: tile.c, type: 'streetlight' };
    }

    // ── clear_all ─────────────────────────────────────────────────
    function clear_all() {
        const scene = getScene(); if (!scene) return;
        _dynamicObjs.forEach(obj => scene.remove(obj));
        _dynamicObjs.length = 0;
        _streetLights.length = 0;
        _occupied.clear();
        _roadReg.clear();
        _roadMeshMap.clear();
        _buildingRegistry.clear();
        if (window.DebugSystem) window.DebugSystem.clearAllMarkers();
    }

    return {
        build_house, build_park, build_library, build_school, build_hospital,
        build_shop, build_road, build_power_tower, build_fountain, build_streetlight,
        clear_all,
        isLand,
        _dynamicObjs, _occupied,
    };
})();