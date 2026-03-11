// ═══════════════════════════════════════════════════════════════
//  city_library.js  —  CodeScape: 未來程市 建築函式庫
// ═══════════════════════════════════════════════════════════════

window.CityLib = (function () {

    // ── 顏色 palette ──────────────────────────────────────────────
    const COLORS = {
        house:         [0xe8d5b0, 0xd4b896, 0xf0e0c0, 0xc8a87a],
        roof:          [0x8b2020, 0xa03030, 0x6b1515, 0xb04040],
        window:        0x88ccff,
        door:          0x5c3a1e,
        park:          [0x4a9e4a, 0x3d8a3d, 0x56a856],
        tree_trunk:    0x6b4226,
        tree_top:      [0x2d7a2d, 0x3a9a3a, 0x256025],
        library:       [0xc8b08a, 0xb89a70, 0xd4bc96],
        lib_roof:      0x4a3020,
        school:        0xf0e080,
        sch_roof:      0x2060a0,
        hospital:      0xf5f5f5,
        hosp_roof:     0xcc2222,
        shop:          [0xf08030, 0xe07020, 0xff9040],
        shop_sign:     0xff4444,
        road:          0x3a3a3a,
        road_dark:     0x282828,
        road_line:     0xeedd44,
        sidewalk:      0xc4b8a8,
        curb:          0x8a7e74,
        power:         0xffcc00,
        tower:         0x888888,
        fountain:      0x60b8e0,
        fountain_w:    0x90d0ff,
        pole:          0x888899,
    };

    function hex(h) { return new THREE.Color(h); }
    function pick(arr) { return Array.isArray(arr) ? arr[Math.floor(Math.random() * arr.length)] : arr; }

    // ── Scene / grid helpers ──────────────────────────────────────
    function getScene()    { return window._cityScene; }
    function getGrid()     { return window._cityGrid || {}; }
    function getTileW()    { return getGrid().TILE_W || 10; }
    function getOffset()   { return getGrid().OFFSET || 395; }
    function getGRID()     { return getGrid().GRID  || 80; }
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
    function isFree(row, col)  { return isLand(row, col) && !_occupied.has(`${row},${col}`); }

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

    function addMesh(geo, color, x, y, z, castShadow = true) {
        const scene = getScene(); if (!scene) return null;
        const mat  = new THREE.MeshLambertMaterial({ color: hex(color) });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        mesh.castShadow    = castShadow;
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
        const tex    = new THREE.CanvasTexture(canvas);
        const smat   = new THREE.SpriteMaterial({ map: tex, transparent: true });
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
    //  ROAD SYSTEM — deferred-rebuild architecture
    //
    //  每次 build_road 呼叫後：
    //    1. 把 (row,col,dir) 寫入 _roadReg
    //    2. 對本格及四鄰格執行 rebuildRoadTile()
    //       → 先清除舊 mesh，再依最新鄰居狀態重新生成
    //
    //  路口類型由「四向連接性」自動判斷：
    //    直路 / 轉角 / T 型 / 十字  →  人行道形狀動態調整
    // ════════════════════════════════════════════════════════════

    // _roadReg: Map< "r,c", Set<'h'|'v'> >
    const _roadReg = new Map();
    // _roadMeshMap: Map< "r,c", mesh[] >  — 只存道路 mesh，方便選擇性清除
    const _roadMeshMap = new Map();

    function rk(r, c) { return `${r},${c}`; }

    function roadDirs(r, c) {
        return _roadReg.get(rk(r, c)) || new Set();
    }
    function hasRoad(r, c) { return roadDirs(r, c).size > 0; }

    // 清除某格的道路 mesh（不動 _roadReg）
    function purgeRoadMeshes(r, c) {
        const key    = rk(r, c);
        const meshes = _roadMeshMap.get(key);
        if (!meshes) return;
        const scene  = getScene();
        meshes.forEach(m => {
            if (scene) scene.remove(m);
            const i = _dynamicObjs.indexOf(m);
            if (i !== -1) _dynamicObjs.splice(i, 1);
        });
        _roadMeshMap.delete(key);
    }

    // 建立 road-only mesh（登記到 _roadMeshMap 和 _dynamicObjs）
    function rmesh(key, geo, color, x, y, z) {
        const scene = getScene(); if (!scene) return;
        const mat  = new THREE.MeshLambertMaterial({ color: hex(color) });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        mesh.castShadow    = false;
        mesh.receiveShadow = true;
        scene.add(mesh);
        _dynamicObjs.push(mesh);
        if (!_roadMeshMap.has(key)) _roadMeshMap.set(key, []);
        _roadMeshMap.get(key).push(mesh);
    }

    // ── 道路尺寸常數 ──────────────────────────────────────────────
    // TW = 10 單位/tile
    const RW_R  = 0.42;   // 路面寬占 tile 比例
    const SW_R  = 0.115;  // 人行道寬占 tile 比例（每側）
    const RH    = 0.26;   // 路面高度
    const SWH   = 0.34;   // 人行道高度
    const CRB   = 0.08;   // 路緣石突出高

    // ── 重新繪製單格道路 ──────────────────────────────────────────
    function rebuildRoadTile(r, c) {
        const dirs = roadDirs(r, c);
        if (dirs.size === 0) return;   // 此格不是道路，略過

        purgeRoadMeshes(r, c);

        const key         = rk(r, c);
        const { x, z }   = tilePos(r, c);
        const elev        = tileElev(r, c);
        const TW          = getTileW();
        const RW          = TW * RW_R;
        const SW          = TW * SW_R;
        const half        = TW / 2;

        // 高度基準
        const RY   = elev + RH  / 2;
        const SWY  = elev + SWH / 2;
        const CRBY = elev + SWH + CRB / 2;

        const isH = dirs.has('h');
        const isV = dirs.has('v');

        // ── 四向連接偵測 ────────────────────────────────────────
        // 連接定義：本格有 H 且東/西鄰格有任何道路 → 東/西連接
        //           本格有 V 且北/南鄰格有任何道路 → 北/南連接
        const cN = isV && hasRoad(r - 1, c);   // 往上（-z）連接
        const cS = isV && hasRoad(r + 1, c);   // 往下（+z）連接
        const cE = isH && hasRoad(r, c + 1);   // 往右（+x）連接
        const cW = isH && hasRoad(r, c - 1);   // 往左（-x）連接

        // 同向連接：H 方向端點是否延伸
        const endE = !cE;   // H 路的右端（無右鄰則是端點）
        const endW = !cW;   // H 路的左端
        const endN = !cN;   // V 路的上端
        const endS = !cS;   // V 路的下端

        // ── 1. 路面主板 ─────────────────────────────────────────
        if (isH && isV) {
            // 十字路口：填滿整格
            rmesh(key, new THREE.BoxGeometry(TW, RH, TW),
                COLORS.road_dark, x, RY, z);
        } else if (isH) {
            rmesh(key, new THREE.BoxGeometry(TW, RH, RW),
                COLORS.road, x, RY, z);
        } else {
            rmesh(key, new THREE.BoxGeometry(RW, RH, TW),
                COLORS.road, x, RY, z);
        }

        // ── 2. 路面擴展：處理 T 型和轉角的路面銜接 ──────────────
        // 當 H 路有 N 或 S 連接時（有垂直道路銜接），路面需往那側延伸
        if (isH) {
            if (cN) rmesh(key, new THREE.BoxGeometry(RW, RH, SW),
                COLORS.road_dark, x, RY, z - (RW / 2 + SW / 2));
            if (cS) rmesh(key, new THREE.BoxGeometry(RW, RH, SW),
                COLORS.road_dark, x, RY, z + (RW / 2 + SW / 2));
        }
        if (isV) {
            if (cE) rmesh(key, new THREE.BoxGeometry(SW, RH, RW),
                COLORS.road_dark, x + (RW / 2 + SW / 2), RY, z);
            if (cW) rmesh(key, new THREE.BoxGeometry(SW, RH, RW),
                COLORS.road_dark, x - (RW / 2 + SW / 2), RY, z);
        }

        // ── 3. 中心線（只在非路口格畫） ────────────────────────
        if (isH && !isV) {
            // 虛線三段
            [-0.3, 0, 0.3].forEach(t => rmesh(key,
                new THREE.BoxGeometry(TW * 0.14, 0.03, 0.2),
                COLORS.road_line, x + t * TW, elev + RH + 0.01, z));
        } else if (isV && !isH) {
            [-0.3, 0, 0.3].forEach(t => rmesh(key,
                new THREE.BoxGeometry(0.2, 0.03, TW * 0.14),
                COLORS.road_line, x, elev + RH + 0.01, z + t * TW));
        }

        // ── 4. 人行道系統 ───────────────────────────────────────
        //
        //  策略：把人行道分為「邊條帶」和「角落塊」分別處理。
        //
        //  邊條帶：
        //    H 路有 N/S 兩側人行道；V 路有 E/W 兩側人行道。
        //    有連接的那側（路面已延伸）→ 只畫缺口外側的人行道。
        //    無連接的那側 → 畫完整人行道條帶。
        //    十字路口（isH && isV）→ 無任何邊條帶（路面覆蓋整格）。
        //
        //  角落塊：
        //    每個角落有人行道，iff 兩條毗鄰邊中至少一條有人行道且另一條不是路面連接方向。

        if (!isH && !isV) return; // 不可能，但防呆

        // 判斷哪些邊需要人行道條帶
        // H 路：N 側 = !cN（N 方向沒連接），S 側 = !cS
        // V 路：E 側 = !cE，W 側 = !cW
        // 十字路口全部不畫邊條帶（路面整格覆蓋）
        const swN = isH && !isV && !cN;
        const swS = isH && !isV && !cS;
        const swE = isV && !isH && !cE;
        const swW = isV && !isH && !cW;

        // ── 邊條帶 ──────────────────────────────────────────────
        function stripH(zOff, curbSide) {
            // 水平條帶（沿 x 延伸）
            rmesh(key, new THREE.BoxGeometry(TW, SWH, SW),
                COLORS.sidewalk, x, SWY, z + zOff);
            // 路緣石（面向路面的那條邊）
            const cz = zOff + (curbSide > 0 ? -SW / 2 : SW / 2);
            rmesh(key, new THREE.BoxGeometry(TW, CRB, 0.12),
                COLORS.curb, x, CRBY, z + cz);
        }
        function stripV(xOff, curbSide) {
            rmesh(key, new THREE.BoxGeometry(SW, SWH, TW),
                COLORS.sidewalk, x + xOff, SWY, z);
            const cx = xOff + (curbSide > 0 ? -SW / 2 : SW / 2);
            rmesh(key, new THREE.BoxGeometry(0.12, CRB, TW),
                COLORS.curb, x + cx, CRBY, z);
        }

        if (swN) stripH(-(RW / 2 + SW / 2), -1);
        if (swS) stripH( (RW / 2 + SW / 2),  1);
        if (swE) stripV( (RW / 2 + SW / 2),  1);
        if (swW) stripV(-(RW / 2 + SW / 2), -1);

        // ── 角落塊 ──────────────────────────────────────────────
        // 每個角落：兩條邊中「需要人行道」的邊有幾條？
        //   0條 → 不需要角落
        //   1條 → 只填在「有人行道的邊」對應側（另一側是路面或連接）
        //   2條 → 填角落
        //
        // 角落位置（xo, zo）以 RW/2 + SW/2 為距離
        const sqHalf = RW / 2 + SW / 2;
        const corners = [
            // NW
            { xo: -sqHalf, zo: -sqHalf, edgeA: swN, edgeB: swW },
            // NE
            { xo:  sqHalf, zo: -sqHalf, edgeA: swN, edgeB: swE },
            // SW
            { xo: -sqHalf, zo:  sqHalf, edgeA: swS, edgeB: swW },
            // SE
            { xo:  sqHalf, zo:  sqHalf, edgeA: swS, edgeB: swE },
        ];

        corners.forEach(({ xo, zo, edgeA, edgeB }) => {
            // 有至少一個鄰邊是人行道 → 填角落
            if (edgeA || edgeB) {
                rmesh(key, new THREE.BoxGeometry(SW, SWH, SW),
                    COLORS.sidewalk, x + xo, SWY, z + zo);
            }
        });

        // ── 5. T 型 / 轉角：連接側的「縮短人行道」 ──────────────
        //  當 H 路的 N 側有連接（cN），需要在 N 側路面延伸區的外側
        //  補一小段人行道（從路面邊緣到 tile 邊），形成 T 型或轉角的
        //  正確人行道缺口。
        //
        //  缺口邏輯：連接側沒有完整條帶，但路面延伸後兩旁空出的
        //  「袖珍人行道」需要填補，讓人行道看起來有缺口而非突然中斷。
        //
        //  縮短人行道從 tile 邊到路面延伸區外緣：
        //    H 路 N 連接 → 在 x 的兩端補兩小塊（只在 tile 邊到路口邊）
        if (isH && !isV) {
            // N 側有連接：N 側人行道有缺口，在缺口兩側補袖珍塊
            if (cN) {
                const zOff = -(RW / 2 + SW / 2);
                // 左袖珍（x 負端）
                const lLen = half - RW / 2 - SW;
                if (lLen > 0.1) rmesh(key, new THREE.BoxGeometry(lLen, SWH, SW),
                    COLORS.sidewalk, x - half + lLen / 2, SWY, z + zOff);
                // 右袖珍
                if (lLen > 0.1) rmesh(key, new THREE.BoxGeometry(lLen, SWH, SW),
                    COLORS.sidewalk, x + half - lLen / 2, SWY, z + zOff);
            }
            if (cS) {
                const zOff = RW / 2 + SW / 2;
                const lLen = half - RW / 2 - SW;
                if (lLen > 0.1) rmesh(key, new THREE.BoxGeometry(lLen, SWH, SW),
                    COLORS.sidewalk, x - half + lLen / 2, SWY, z + zOff);
                if (lLen > 0.1) rmesh(key, new THREE.BoxGeometry(lLen, SWH, SW),
                    COLORS.sidewalk, x + half - lLen / 2, SWY, z + zOff);
            }
        }
        if (isV && !isH) {
            if (cE) {
                const xOff = RW / 2 + SW / 2;
                const lLen = half - RW / 2 - SW;
                if (lLen > 0.1) rmesh(key, new THREE.BoxGeometry(SW, SWH, lLen),
                    COLORS.sidewalk, x + xOff, SWY, z - half + lLen / 2);
                if (lLen > 0.1) rmesh(key, new THREE.BoxGeometry(SW, SWH, lLen),
                    COLORS.sidewalk, x + xOff, SWY, z + half - lLen / 2);
            }
            if (cW) {
                const xOff = -(RW / 2 + SW / 2);
                const lLen = half - RW / 2 - SW;
                if (lLen > 0.1) rmesh(key, new THREE.BoxGeometry(SW, SWH, lLen),
                    COLORS.sidewalk, x + xOff, SWY, z - half + lLen / 2);
                if (lLen > 0.1) rmesh(key, new THREE.BoxGeometry(SW, SWH, lLen),
                    COLORS.sidewalk, x + xOff, SWY, z + half - lLen / 2);
            }
        }
    }

    // ── 公開 build_road ───────────────────────────────────────────
    //
    //  direction: "h" / "v" / "auto"（預設）
    //  "auto" 自動根據鄰格判斷方向：
    //    左右有路 → h    上下有路 → v
    //    四向皆有 → h+v  四向皆空 → h（預設水平）
    //
    function build_road(row = 40, col = 40, direction = "auto") {
        if (!isLand(row, col)) return warnOffland('build_road', row, col);

        let dirsToAdd;
        if (direction === 'h' || direction === 'v') {
            dirsToAdd = [direction];
        } else {
            // auto-detect from neighbors
            const adjH = hasRoad(row, col - 1) || hasRoad(row, col + 1);
            const adjV = hasRoad(row - 1, col) || hasRoad(row + 1, col);
            if (adjH && adjV)     dirsToAdd = ['h', 'v'];
            else if (adjV)        dirsToAdd = ['v'];
            else                  dirsToAdd = ['h'];   // adjH or isolated
        }

        const key = rk(row, col);
        if (!_roadReg.has(key)) {
            occupy(row, col);
            _roadReg.set(key, new Set());
        }
        dirsToAdd.forEach(d => _roadReg.get(key).add(d));

        [[row, col], [row-1,col], [row+1,col], [row,col-1], [row,col+1]]
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
        addMesh(new THREE.BoxGeometry(0.8, 1.6, 0.2),  COLORS.door,   x,            elev + 0.8,       z + D / 2 + 0.01);
        addMesh(new THREE.BoxGeometry(0.9, 0.9, 0.15), COLORS.window, x - W * 0.22, elev + H * 0.62, z + D / 2 + 0.01);
        addMesh(new THREE.BoxGeometry(0.9, 0.9, 0.15), COLORS.window, x + W * 0.22, elev + H * 0.62, z + D / 2 + 0.01);
        if (name) addLabel(name, x, elev + H + 3.5, z);
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
        for (const { dx, dz } of [{dx:-2.5,dz:-2.5},{dx:2.5,dz:-2.0},{dx:0,dz:2.5}]) {
            addMesh(new THREE.CylinderGeometry(0.22, 0.3, 1.8, 8), COLORS.tree_trunk,     x+dx, elev+0.9, z+dz);
            addMesh(new THREE.SphereGeometry(1.2, 8, 6),            pick(COLORS.tree_top), x+dx, elev+2.8, z+dz);
        }
        addMesh(new THREE.BoxGeometry(1.6, 0.2, 0.5), 0x8b6914, x - 1.0, elev + 0.6, z - 0.5);
        if (name) addLabel(name, x, elev + 5, z);
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
        addMesh(new THREE.BoxGeometry(TW*0.8, 5.5, TW*0.75),  pick(COLORS.library), x, elev+2.75, z);
        addMesh(new THREE.BoxGeometry(TW*0.88, 0.6, TW*0.83), COLORS.lib_roof,      x, elev+5.8,  z);
        for (const ox of [-2.5, 2.5])
            addMesh(new THREE.CylinderGeometry(0.25, 0.28, 5.5, 8), 0xd8c8a0, x+ox, elev+2.75, z+TW*0.38);
        addMesh(new THREE.BoxGeometry(1.8, 3.0, 0.2), COLORS.door, x, elev+1.5, z+TW*0.375+0.05);
        for (const ox of [-2.8, 2.8])
            addMesh(new THREE.BoxGeometry(1.2, 1.8, 0.15), COLORS.window, x+ox, elev+3.5, z+TW*0.375);
        if (name) addLabel(name || "圖書館", x, elev+8, z);
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
        addMesh(new THREE.BoxGeometry(TW*0.85, 6, TW*0.8),   COLORS.school,   x, elev+3,    z);
        addMesh(new THREE.BoxGeometry(TW*0.9, 0.7, TW*0.85), COLORS.sch_roof, x, elev+6.35, z);
        addMesh(new THREE.CylinderGeometry(0.1,0.1,5,6), 0xaaaaaa, x, elev+5.5, z+TW*0.35);
        addMesh(new THREE.BoxGeometry(1.5,1.0,0.05), 0xdd2222, x+0.75, elev+8, z+TW*0.35);
        for (let i=-1;i<=1;i++) for (let j=0;j<2;j++)
            addMesh(new THREE.BoxGeometry(1.0,1.2,0.15), COLORS.window, x+i*2.8, elev+2.5+j*2.5, z+TW*0.4);
        if (name) addLabel(name || "學校", x, elev+9, z);
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
        addMesh(new THREE.BoxGeometry(TW*0.8, 7, TW*0.75),   COLORS.hospital,  x, elev+3.5, z);
        addMesh(new THREE.BoxGeometry(TW*0.85,0.6,TW*0.8),   COLORS.hosp_roof, x, elev+7.3, z);
        addMesh(new THREE.BoxGeometry(0.6,2.5,0.2), 0xcc2222, x, elev+8.5, z+TW*0.375);
        addMesh(new THREE.BoxGeometry(2.5,0.6,0.2), 0xcc2222, x, elev+8.5, z+TW*0.375);
        for (let i=-1;i<=1;i++) for (let j=0;j<3;j++)
            addMesh(new THREE.BoxGeometry(1.0,1.2,0.15), COLORS.window, x+i*2.5, elev+1.8+j*2, z+TW*0.38);
        if (name) addLabel(name || "醫院", x, elev+10.5, z);
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
        addMesh(new THREE.BoxGeometry(TW*0.75,3.5,TW*0.7),  pick(COLORS.shop), x, elev+1.75, z);
        addMesh(new THREE.BoxGeometry(TW*0.72,1.0,0.2),      COLORS.shop_sign,  x, elev+3.8,  z+TW*0.35);
        addMesh(new THREE.BoxGeometry(2.0,2.2,0.15),         COLORS.window,     x, elev+1.1,  z+TW*0.35);
        addMesh(new THREE.BoxGeometry(TW*0.78,0.15,1.2),     pick(COLORS.shop), x, elev+2.8,  z+TW*0.35+0.6);
        if (name) addLabel(name || "商店", x, elev+6, z);
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
        addMesh(new THREE.CylinderGeometry(0.25,0.4,10,6), COLORS.tower, x, elev+5,   z);
        addMesh(new THREE.BoxGeometry(4,0.2,0.2),          COLORS.tower, x, elev+9.2, z);
        for (const ox of [-1.8,0,1.8])
            addMesh(new THREE.SphereGeometry(0.18,6,6), COLORS.power, x+ox, elev+9.0, z);
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
        addMesh(new THREE.CylinderGeometry(3.2,3.5,0.5,16), COLORS.fountain,   x, elev+0.25, z, false);
        addMesh(new THREE.CylinderGeometry(2.9,2.9,0.1,16), COLORS.fountain_w, x, elev+0.55, z, false);
        addMesh(new THREE.CylinderGeometry(0.2,0.3,2.5,8),  0xd0c0a0,          x, elev+1.25, z);
        addMesh(new THREE.SphereGeometry(0.35,8,8),          COLORS.fountain_w, x, elev+2.8,  z);
        if (name) addLabel(name || "噴水池", x, elev+5, z);
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
        const elev  = tileElev(tile.r, tile.c);
        const scene = getScene();
        addMesh(new THREE.CylinderGeometry(0.12,0.18,7.0,8), COLORS.pole, x, elev+3.5, z);
        const arm = addMesh(new THREE.CylinderGeometry(0.07,0.07,2.2,6), COLORS.pole, x+1.0, elev+7.1, z);
        if (arm) arm.rotation.z = Math.PI / 2;
        addMesh(new THREE.CylinderGeometry(0.4,0.28,0.5,12), COLORS.pole, x+2.1, elev+6.75, z);
        const bulbMat = new THREE.MeshBasicMaterial({ color: 0x221a00 });
        const bulb    = new THREE.Mesh(new THREE.SphereGeometry(0.22,8,8), bulbMat);
        bulb.position.set(x+2.1, elev+6.72, z);
        scene.add(bulb); _dynamicObjs.push(bulb);
        const pl = new THREE.PointLight(0xffe8a0, 0, 35, 1.6);
        pl.position.set(x+2.1, elev+6.72, z);
        scene.add(pl); _dynamicObjs.push(pl);
        _streetLights.push({ pl, bulbMat });
        return { row: tile.r, col: tile.c, type: 'streetlight' };
    }

    // ── clear_all ─────────────────────────────────────────────────
    function clear_all() {
        const scene = getScene(); if (!scene) return;
        _dynamicObjs.forEach(obj => scene.remove(obj));
        _dynamicObjs.length  = 0;
        _streetLights.length = 0;
        _occupied.clear();
        _roadReg.clear();
        _roadMeshMap.clear();
    }

    return {
        build_house, build_park, build_library, build_school, build_hospital,
        build_shop, build_road, build_power_tower, build_fountain, build_streetlight,
        clear_all,
        isLand,
        _dynamicObjs, _occupied,
    };
})();