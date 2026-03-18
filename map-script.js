// map-script.js — island map + CodeScape city builder integration

function createMapCanvas() {
    const container = document.getElementById('mapContainer');
    if (!container) return null;
    let canvas = container.querySelector('canvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'mapCanvas';
        canvas.style.display = 'block';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        container.appendChild(canvas);
    }
    return canvas;
}

// ── Day/night keyframes ────────────────────────────────────────────────────
const DAY_CYCLE = [
    { t: 0.00, sky: 0x060618, amb: 0x384270, aI: 0.22, sun: 0xff5522, sI: 0.0, elev: 0.0 },
    { t: 0.10, sky: 0x060618, amb: 0x384270, aI: 0.22, sun: 0xff5522, sI: 0.0, elev: 0.0 },
    { t: 0.15, sky: 0x1a0828, amb: 0x2a2060, aI: 0.18, sun: 0xff5522, sI: 0.05, elev: 0.02 },
    { t: 0.20, sky: 0xff5500, amb: 0xff8844, aI: 0.45, sun: 0xff7722, sI: 0.8, elev: 0.12 },
    { t: 0.25, sky: 0x87ceeb, amb: 0xfff0e0, aI: 0.65, sun: 0xffeebb, sI: 1.15, elev: 0.55 },
    { t: 0.50, sky: 0x6ec6f0, amb: 0xffffff, aI: 0.80, sun: 0xfff8e0, sI: 1.5, elev: 1.0 },
    { t: 0.75, sky: 0x87ceeb, amb: 0xfff0e0, aI: 0.65, sun: 0xffeebb, sI: 1.15, elev: 0.55 },
    { t: 0.80, sky: 0xff5500, amb: 0xff8844, aI: 0.45, sun: 0xff7722, sI: 0.8, elev: 0.12 },
    { t: 0.85, sky: 0x1a0828, amb: 0x2a2060, aI: 0.18, sun: 0xff4400, sI: 0.05, elev: 0.02 },
    { t: 0.90, sky: 0x060618, amb: 0x384270, aI: 0.22, sun: 0xff3300, sI: 0.0, elev: 0.0 },
    { t: 1.00, sky: 0x060618, amb: 0x384270, aI: 0.22, sun: 0xff5522, sI: 0.0, elev: 0.0 },
];

const SUN_SHADOW_ELEV_THRESHOLD = 0.08;
const LAMP_ON_ELEV_THRESHOLD    = 0.12;

// ── Pre-allocated scratch colours — zero heap allocations per frame ────────
const _scratchA   = new THREE.Color();
const _scratchB   = new THREE.Color();
const _scratchOut = new THREE.Color();

// Write lerp result into `out`; never allocates
function lerpColorInto(out, hexA, hexB, t) {
    _scratchA.setHex(hexA);
    _scratchB.setHex(hexB);
    out.r = _scratchA.r + (_scratchB.r - _scratchA.r) * t;
    out.g = _scratchA.g + (_scratchB.g - _scratchA.g) * t;
    out.b = _scratchA.b + (_scratchB.b - _scratchA.b) * t;
    return out;
}

function cycleLookup(t) {
    t = ((t % 1) + 1) % 1;
    let lo = DAY_CYCLE[DAY_CYCLE.length - 2], hi = DAY_CYCLE[DAY_CYCLE.length - 1];
    for (let i = 0; i < DAY_CYCLE.length - 1; i++) {
        if (t >= DAY_CYCLE[i].t && t < DAY_CYCLE[i + 1].t) {
            lo = DAY_CYCLE[i]; hi = DAY_CYCLE[i + 1]; break;
        }
    }
    return { lo, hi, f: (t - lo.t) / (hi.t - lo.t) };
}

function buildStars(scene) {
    const geo = new THREE.BufferGeometry();
    const N = 1200, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.random() * Math.PI * 0.48;
        const r     = 900;
        pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
        pos[i * 3 + 1] = r * Math.cos(phi);
        pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
        color: 0xffffff, size: 2.2, sizeAttenuation: true,
        transparent: true, opacity: 0,
    });
    scene.add(new THREE.Points(geo, mat));
    return mat;
}

function buildSkyDisc(scene, color, radius) {
    const geo  = new THREE.SphereGeometry(radius, 16, 16);
    const mat  = new THREE.MeshBasicMaterial({ color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.visible = false;
    scene.add(mesh);
    return { mesh, mat };
}

// ── Seeded pseudo-random ───────────────────────────────────────────────────
function seededRand(seed) {
    let s = seed;
    return () => {
        s = (s * 1664525 + 1013904223) & 0xffffffff;
        return (s >>> 0) / 0xffffffff;
    };
}

// ── Island mask ───────────────────────────────────────────────────────────
function buildIslandMask(GRID) {
    const rand = seededRand(42);
    const NS   = 8;
    const nGrid = [];
    for (let r = 0; r <= NS; r++) {
        nGrid[r] = [];
        for (let c = 0; c <= NS; c++) nGrid[r][c] = rand();
    }

    function bilinear(nr, nc) {
        const r0 = Math.floor(nr), r1 = Math.min(r0 + 1, NS);
        const c0 = Math.floor(nc), c1 = Math.min(c0 + 1, NS);
        const fr = nr - r0, fc = nc - c0;
        return nGrid[r0][c0] * (1 - fr) * (1 - fc)
             + nGrid[r0][c1] * (1 - fr) * fc
             + nGrid[r1][c0] * fr        * (1 - fc)
             + nGrid[r1][c1] * fr        * fc;
    }

    const mask = [];
    for (let r = 0; r < GRID; r++) {
        mask[r] = [];
        for (let c = 0; c < GRID; c++) {
            const nx   = (c / (GRID - 1)) * 2 - 1;
            const nz   = (r / (GRID - 1)) * 2 - 1;
            const dist = Math.sqrt(nx * nx + nz * nz);
            const gradient   = Math.max(0, 1 - (dist / 0.72));
            const gradSmooth = gradient * gradient * (3 - 2 * gradient);
            const nr1 = (r / (GRID - 1)) * NS, nc1 = (c / (GRID - 1)) * NS;
            const n1  = bilinear(nr1, nc1);
            const n2  = bilinear(nr1 * 2 % NS, nc1 * 2 % NS);
            const val = gradSmooth * 0.55 + (n1 * 0.65 + n2 * 0.35) * 0.45;
            mask[r][c] = val > 0.48;
        }
    }
    return { mask };
}

function isShore(row, col, mask, GRID) {
    if (!mask[row][col]) return false;
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            const r2 = row + dr, c2 = col + dc;
            if (r2 < 0 || r2 >= GRID || c2 < 0 || c2 >= GRID || !mask[r2][c2]) return true;
        }
    }
    return false;
}

function tileElevation(row, col, GRID) {
    const nx   = (col / (GRID - 1)) * 2 - 1;
    const nz   = (row / (GRID - 1)) * 2 - 1;
    const dist = Math.sqrt(nx * nx + nz * nz);
    const h    = Math.max(0, 1 - dist * 1.3);
    return h * h * 3.5;
}

// ── Grass: three-tone elevation shading ───────────────────────────────────
const GRASS_HIGH = new THREE.Color(0x7ad050);
const GRASS_MID  = new THREE.Color(0x5da836);
const GRASS_LOW  = new THREE.Color(0x4a8828);

// Writes result into `out`; never allocates
function grassColorForElevation(elev, out) {
    const t = Math.min(elev / 3.5, 1.0);
    if (t < 0.45) {
        const s = (t / 0.45); const ss = s * s * (3 - 2 * s);
        out.lerpColors(GRASS_LOW, GRASS_MID, ss);
    } else {
        const s = (t - 0.45) / 0.55; const ss = s * s * (3 - 2 * s);
        out.lerpColors(GRASS_MID, GRASS_HIGH, ss);
    }
}

// ── Water texture ─────────────────────────────────────────────────────────
function makeWaterTexture() {
    const size = 512;
    const cv   = document.createElement('canvas');
    cv.width   = cv.height = size;
    const ctx  = cv.getContext('2d');

    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 1.4);
    grad.addColorStop(0, '#1a5fa8');
    grad.addColorStop(1, '#0a3060');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 60; i++) {
        const y     = Math.random() * size;
        const alpha = Math.random() * 0.12 + 0.04;
        ctx.strokeStyle = `rgba(100,180,255,${alpha})`;
        ctx.lineWidth   = Math.random() * 3 + 1;
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x <= size; x += 32)
            ctx.lineTo(x, y + Math.sin(x * 0.04 + Math.random()) * 4);
        ctx.stroke();
    }
    for (let i = 0; i < 120; i++) {
        const x = Math.random() * size, y = Math.random() * size;
        ctx.beginPath();
        ctx.arc(x, y, Math.random() * 2 + 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,235,255,${Math.random() * 0.18 + 0.04})`;
        ctx.fill();
    }

    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(12, 12);
    return tex;
}

// ─────────────────────────────────────────────────────────────────────────
function init3DMap() {
    const container = document.getElementById('mapContainer');
    const canvas    = createMapCanvas();
    if (!container || !canvas) return;

    // ── Scene ──────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060618);
    scene.fog        = new THREE.FogExp2(new THREE.Color(0x060618), 0.00045);

    // ── Camera ─────────────────────────────────────────────────────────────
    const w = container.clientWidth, h = container.clientHeight;
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 3000);
    window._cityCamera = camera;

    let camDist = 400, polar = Math.PI / 4, azimuth = Math.PI / 4;
    let panX = 0, panZ = 0;
    const CAM_MIN = 80, CAM_MAX = 900;
    const POLAR_MIN = 0.15, POLAR_MAX = Math.PI / 2.1;

    const GRID   = 80, TILE_W = 10, GAP = 0.15;
    const TOTAL  = GRID * TILE_W;
    const OFFSET = TOTAL / 2 - TILE_W / 2;
    const HALF   = TOTAL / 2;
    const DEFAULT = { dist: 400, polar: Math.PI / 4, azimuth: Math.PI / 4, panX: 0, panZ: 0 };

    function clampPan() {
        panX = Math.max(-HALF, Math.min(HALF, panX));
        panZ = Math.max(-HALF, Math.min(HALF, panZ));
    }
    function updateCamera() {
        clampPan();
        const sinP = Math.sin(polar), cosP = Math.cos(polar);
        const sinA = Math.sin(azimuth), cosA = Math.cos(azimuth);
        camera.position.set(
            panX + camDist * sinP * sinA,
            camDist * cosP,
            panZ + camDist * sinP * cosA
        );
        camera.lookAt(panX, 0, panZ);
    }
    updateCamera();

    // ── Renderer ───────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(w, h, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type    = THREE.PCFSoftShadowMap;

    // ── Island mask ────────────────────────────────────────────────────────
    const { mask: landMask } = buildIslandMask(GRID);
    window._cityScene    = scene;
    window._cityLandMask = landMask;
    window._cityGrid     = { GRID, TILE_W, OFFSET };

    // ── Sand colours ───────────────────────────────────────────────────────
    const sandColors = [
        0xd4b483, 0xc8a96e, 0xdbc07a, 0xcfb87f, 0xc9a86c,
        0xe2c88a, 0xbfa060, 0xd6bc7a, 0xca9f58,
    ];

    // ─────────────────────────────────────────────────────────────────────
    //  INSTANCED MESHES
    //  One InstancedMesh per tile type → 4 draw calls total for the terrain
    //  instead of one draw call per tile (~700+).
    //  Per-instance colour is written via setColorAt().
    // ─────────────────────────────────────────────────────────────────────

    // First pass: count instances so buffers are exactly sized
    let nGrass = 0, nSand = 0, nCliff = 0;
    for (let row = 0; row < GRID; row++) {
        for (let col = 0; col < GRID; col++) {
            if (!landMask[row][col]) continue;
            if (isShore(row, col, landMask, GRID)) { nSand++; nCliff++; }
            else nGrass++;
        }
    }
    const nHit = nGrass + nSand;

    // Shared geometries
    const tileGeo      = new THREE.BoxGeometry(TILE_W - GAP, 1.0, TILE_W - GAP);
    const hitGeo       = new THREE.PlaneGeometry(TILE_W, TILE_W);
    const CLIFF_BASE_H = 6.0;
    const cliffBaseGeo = new THREE.BoxGeometry(TILE_W - GAP, CLIFF_BASE_H, TILE_W - GAP);

    // Shared materials — one per mesh type
    const grassMat = new THREE.MeshLambertMaterial();
    const sandMat  = new THREE.MeshLambertMaterial();
    const cliffMat = new THREE.MeshLambertMaterial({ color: 0xc8a882 });
    const hitMat   = new THREE.MeshBasicMaterial({ visible: false });

    const grassMesh = new THREE.InstancedMesh(tileGeo,      grassMat, nGrass);
    const sandMesh  = new THREE.InstancedMesh(tileGeo,      sandMat,  nSand);
    const hitMesh   = new THREE.InstancedMesh(hitGeo,       hitMat,   nHit);
    const cliffMesh = new THREE.InstancedMesh(cliffBaseGeo, cliffMat, nCliff);

    grassMesh.receiveShadow = sandMesh.receiveShadow = true;
    grassMesh.castShadow    = sandMesh.castShadow    = true;
    scene.add(grassMesh, sandMesh, hitMesh, cliffMesh);

    // hitData[i] maps hit-instance index → tile metadata
    // meshIdx = index into grassMesh or sandMesh for setColorAt
    const hitData = new Array(nHit);

    const _dummy = new THREE.Object3D();
    const _col   = new THREE.Color();
    let gi = 0, si = 0, ci = 0, hi = 0;

    for (let row = 0; row < GRID; row++) {
        for (let col = 0; col < GRID; col++) {
            if (!landMask[row][col]) continue;

            const x     = col * TILE_W - OFFSET;
            const z     = row * TILE_W - OFFSET;
            const elev  = tileElevation(row, col, GRID);
            const shore = isShore(row, col, landMask, GRID);

            // Tile mesh instance
            _dummy.position.set(x, elev - 0.5, z);
            _dummy.rotation.set(0, 0, 0);
            _dummy.scale.set(1, 1, 1);
            _dummy.updateMatrix();

            let originalColor;
            if (shore) {
                originalColor = sandColors[(row * 13 + col * 7 + (row ^ col) * 3) % sandColors.length];
                sandMesh.setMatrixAt(si, _dummy.matrix);
                sandMesh.setColorAt(si, _col.setHex(originalColor));
                hitData[hi] = { row, col, originalColor, elev, x, z, shore: true, meshIdx: si };
                si++;
            } else {
                grassColorForElevation(elev, _col);
                originalColor = _col.getHex();
                grassMesh.setMatrixAt(gi, _dummy.matrix);
                grassMesh.setColorAt(gi, _col);
                hitData[hi] = { row, col, originalColor, elev, x, z, shore: false, meshIdx: gi };
                gi++;
            }

            // Hit plane instance (invisible, for raycasting)
            _dummy.position.set(x, elev, z);
            _dummy.rotation.set(-Math.PI / 2, 0, 0);
            _dummy.scale.set(1, 1, 1);
            _dummy.updateMatrix();
            hitMesh.setMatrixAt(hi, _dummy.matrix);
            hi++;

            // Cliff instance (shore only) — scale Y to match actual cliff height
            if (shore) {
                const cliffH    = Math.max(2.5, elev + 2.5);
                const scaleY    = cliffH / CLIFF_BASE_H;
                const cliffCtrY = -(cliffH / 2) + 0.25;
                _dummy.position.set(x, cliffCtrY, z);
                _dummy.rotation.set(0, 0, 0);
                _dummy.scale.set(1, scaleY, 1);
                _dummy.updateMatrix();
                cliffMesh.setMatrixAt(ci, _dummy.matrix);
                ci++;
            }
        }
    }

    // Flush all instance buffers to GPU once
    grassMesh.instanceMatrix.needsUpdate = true;
    sandMesh.instanceMatrix.needsUpdate  = true;
    hitMesh.instanceMatrix.needsUpdate   = true;
    cliffMesh.instanceMatrix.needsUpdate = true;
    if (grassMesh.instanceColor) grassMesh.instanceColor.needsUpdate = true;
    if (sandMesh.instanceColor)  sandMesh.instanceColor.needsUpdate  = true;

    // ── Hover label sprite ─────────────────────────────────────────────────
    let hoverLabel = null;
    function makeHoverLabel() {
        const cv  = document.createElement('canvas');
        cv.width  = 512; cv.height = 128;
        const ctx = cv.getContext('2d');
        const tex  = new THREE.CanvasTexture(cv);
        const smat = new THREE.SpriteMaterial({ map: tex, transparent: true });
        const sprite = new THREE.Sprite(smat);
        sprite.scale.set(16, 4, 1);
        sprite.visible = false;
        scene.add(sprite);
        return { sprite, cv, ctx, tex };
    }

    function updateHoverLabel(row, col, x, z, height) {
        if (!hoverLabel) hoverLabel = makeHoverLabel();
        const { sprite, cv, ctx, tex } = hoverLabel;
        ctx.clearRect(0, 0, cv.width, cv.height);
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.beginPath();
        ctx.roundRect(4, 4, 504, 120, 12);
        ctx.fill();
        ctx.fillStyle    = '#fff';
        ctx.font         = 'bold 48px Oxanium, monospace';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${row},${col}`, cv.width / 2, cv.height / 2);
        tex.needsUpdate = true;
        sprite.position.set(x, height, z);
        sprite.visible = true;
    }

    // ── Selector outline ───────────────────────────────────────────────────
    const selectorGeom = new THREE.EdgesGeometry(new THREE.PlaneGeometry(TILE_W, TILE_W));
    const selectorMat  = new THREE.LineBasicMaterial({ color: 0xffff00, linewidth: 2 });
    const selector     = new THREE.LineSegments(selectorGeom, selectorMat);
    selector.rotation.x = -Math.PI / 2;
    selector.visible    = false;
    scene.add(selector);

    // ── Raycasting against the single instanced hit mesh ───────────────────
    const raycaster  = new THREE.Raycaster();
    const mouse      = new THREE.Vector2();
    let   lastHitIdx = -1;
    const _hoverCol  = new THREE.Color(); // scratch — no allocation per event

    canvas.addEventListener('mousemove', e => {
        const rect = canvas.getBoundingClientRect();
        mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
        mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);

        const hits = raycaster.intersectObject(hitMesh);
        if (hits.length > 0) {
            const idx = hits[0].instanceId;
            if (idx !== lastHitIdx) {
                // Restore previous tile
                if (lastHitIdx >= 0) {
                    const p    = hitData[lastHitIdx];
                    const pMesh = p.shore ? sandMesh : grassMesh;
                    pMesh.setColorAt(p.meshIdx, _hoverCol.setHex(p.originalColor));
                    pMesh.instanceColor.needsUpdate = true;
                }
                // Highlight new tile
                const d     = hitData[idx];
                const tMesh = d.shore ? sandMesh : grassMesh;
                tMesh.setColorAt(d.meshIdx, _hoverCol.setHex(0xffff00));
                tMesh.instanceColor.needsUpdate = true;

                selector.position.set(d.x, d.elev + 0.11, d.z);
                selector.visible = true;
                updateHoverLabel(d.row, d.col, d.x, d.z, d.elev + 2.5);
                lastHitIdx = idx;
            }
        } else {
            if (lastHitIdx >= 0) {
                const p     = hitData[lastHitIdx];
                const pMesh = p.shore ? sandMesh : grassMesh;
                pMesh.setColorAt(p.meshIdx, _hoverCol.setHex(p.originalColor));
                pMesh.instanceColor.needsUpdate = true;
                lastHitIdx = -1;
            }
            selector.visible = false;
            if (hoverLabel) hoverLabel.sprite.visible = false;
        }
    });

    // ── Ocean ──────────────────────────────────────────────────────────────
    const OCEAN_SIZE = 2600;
    const waterTex   = makeWaterTexture();
    const oceanMat   = new THREE.MeshStandardMaterial({
        map: waterTex, color: 0x1a6eb5,
        roughness: 0.55, metalness: 0.15,
        transparent: true, opacity: 0.92,
    });
    const oceanMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(OCEAN_SIZE, OCEAN_SIZE), oceanMat
    );
    oceanMesh.rotation.x = -Math.PI / 2;
    scene.add(oceanMesh);

    // ── Grid outline lines ─────────────────────────────────────────────────
    const lineMat    = new THREE.LineBasicMaterial({ color: 0x1a3d1a, transparent: true, opacity: 0.2 });
    const linePoints = [];
    function land(r, c) { return r >= 0 && r < GRID && c >= 0 && c < GRID && landMask[r][c]; }
    for (let row = 0; row <= GRID; row++) {
        for (let col = 0; col <= GRID; col++) {
            if (col < GRID && (land(row, col) || land(row - 1, col))) {
                const x1 = col * TILE_W - OFFSET - TILE_W / 2;
                const z0 = row * TILE_W - OFFSET - TILE_W / 2;
                linePoints.push(x1, 0.3, z0, x1 + TILE_W, 0.3, z0);
            }
            if (row < GRID && (land(row, col) || land(row, col - 1))) {
                const x0 = col * TILE_W - OFFSET - TILE_W / 2;
                const z1 = row * TILE_W - OFFSET - TILE_W / 2;
                linePoints.push(x0, 0.3, z1, x0, 0.3, z1 + TILE_W);
            }
        }
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePoints, 3));
    scene.add(new THREE.LineSegments(lineGeo, lineMat));

    // ── Lights ────────────────────────────────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0x10103a, 0.07);
    scene.add(ambientLight);

    const sun = new THREE.DirectionalLight(0xfff8e0, 0.0);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { near: 10, far: 1200, left: -300, right: 300, top: 300, bottom: -300 });
    scene.add(sun);

    const moonLight = new THREE.DirectionalLight(0x8899cc, 0.0);
    scene.add(moonLight);

    const starMat                          = buildStars(scene);
    const { mesh: sunDisc,  mat: sunMat  } = buildSkyDisc(scene, 0xfff8e0, 14);
    const { mesh: moonDisc              }  = buildSkyDisc(scene, 0xdde8ff, 9);
    const moonMesh = new THREE.Mesh(
        new THREE.SphereGeometry(12, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    moonMesh.visible = false;
    scene.add(moonMesh);

    // ── Day/night update ──────────────────────────────────────────────────
    const CYCLE_SECONDS  = 160;
    const clockEl        = document.getElementById('mapClock');
    let   dayT           = 0.22;
    let   _frozenAtNoon  = false;       // skip redundant work when frozen
    let   _prevShadow    = true;        // avoid unnecessary property writes

    function updateDayNight(dt) {
        const streetlightUnlocked = window.LessonSystem && window.LessonSystem.isUnlocked('build_streetlight');

        if (!streetlightUnlocked) {
            if (_frozenAtNoon) return;  // already set — nothing to do
            dayT = 0.50;
            _frozenAtNoon = true;
        } else {
            _frozenAtNoon = false;
            const { lo, hi, f } = cycleLookup(dayT);
            const curElev   = lo.elev + (hi.elev - lo.elev) * f;
            const speedMult = curElev < 0.05 ? 1.8 : 1.0;
            dayT = (dayT + (dt / CYCLE_SECONDS) * speedMult) % 1;
        }

        const { lo: l, hi: hh, f: ff } = cycleLookup(dayT);

        // Sky and fog — reuse _scratchOut, no allocation
        lerpColorInto(_scratchOut, l.sky, hh.sky, ff);
        scene.background.setRGB(_scratchOut.r, _scratchOut.g, _scratchOut.b);
        scene.fog.color.setRGB(_scratchOut.r, _scratchOut.g, _scratchOut.b);

        lerpColorInto(_scratchOut, l.amb, hh.amb, ff);
        ambientLight.color.setRGB(_scratchOut.r, _scratchOut.g, _scratchOut.b);
        ambientLight.intensity = l.aI + (hh.aI - l.aI) * ff;

        const elev     = l.elev + (hh.elev - l.elev) * ff;
        const sunAngle = dayT * Math.PI * 2 - Math.PI * 0.5;
        const SUN_R    = 800;
        const sunY     = elev <= 0.01 ? -SUN_R * 0.7 : Math.sin(elev * Math.PI) * SUN_R;
        const sunCosA  = Math.cos(sunAngle), sunSinA = Math.sin(sunAngle);

        sun.position.set(sunCosA * SUN_R * 0.7, sunY, sunSinA * SUN_R * 0.4);
        lerpColorInto(_scratchOut, l.sun, hh.sun, ff);
        sun.color.setRGB(_scratchOut.r, _scratchOut.g, _scratchOut.b);
        sun.intensity = l.sI + (hh.sI - l.sI) * ff;

        // Disc placement: normalise without allocating a new Vector3
        const sunLen = Math.sqrt(
            sun.position.x * sun.position.x +
            sun.position.y * sun.position.y +
            sun.position.z * sun.position.z
        );
        sunDisc.position.set(
            sun.position.x / sunLen * 860,
            sun.position.y / sunLen * 860,
            sun.position.z / sunLen * 860
        );
        sunMat.color.setRGB(_scratchOut.r, _scratchOut.g, _scratchOut.b);
        sunDisc.visible = elev > 0.01;

        // Shadow toggle — only write when state actually flips
        const wantShadow = elev > SUN_SHADOW_ELEV_THRESHOLD;
        if (_prevShadow !== wantShadow) {
            sun.castShadow = wantShadow;
            _prevShadow    = wantShadow;
        }

        const moonAngle = sunAngle + Math.PI;
        const moonElev  = 1.0 - elev;
        const moonY     = Math.sin(moonElev * Math.PI) * SUN_R;
        const moonCosA  = Math.cos(moonAngle), moonSinA = Math.sin(moonAngle);
        moonLight.position.set(moonCosA * SUN_R * 0.7, moonY, moonSinA * SUN_R * 0.4);
        moonLight.intensity = Math.max(0, (1 - elev * 2.5)) * 0.55;

        const moonLen = Math.sqrt(
            moonLight.position.x * moonLight.position.x +
            moonLight.position.y * moonLight.position.y +
            moonLight.position.z * moonLight.position.z
        );
        const moonDX = moonLight.position.x / moonLen * 860;
        const moonDY = moonLight.position.y / moonLen * 860;
        const moonDZ = moonLight.position.z / moonLen * 860;
        moonDisc.position.set(moonDX, moonDY, moonDZ);
        moonMesh.position.set(moonDX, moonDY, moonDZ);
        moonDisc.visible = moonElev > 0.1;
        moonMesh.visible = moonElev > 0.1;

        starMat.opacity  = Math.max(0, 1 - elev * 3.5);
        oceanMat.color.set(elev < 0.08 ? 0x081428 : 0x1a6eb5);
        oceanMat.opacity = elev < 0.08 ? 0.88 : 0.92;

        if (clockEl) {
            const totalHours = Math.floor(dayT * 24);
            const hour12     = totalHours % 12 === 0 ? 12 : totalHours % 12;
            const ampm       = totalHours < 12 ? 'am' : 'pm';
            clockEl.textContent = `${hour12}${ampm}`;
            clockEl.className   = elev > 0.05 ? 'day' : 'night';
        }

        // Streetlights
        const lights = window._cityStreetLights;
        if (lights && lights.length > 0) {
            const lampOn       = elev < LAMP_ON_ELEV_THRESHOLD;
            const tVal         = Math.max(0, 1 - elev / LAMP_ON_ELEV_THRESHOLD);
            const lampIntensity = lampOn ? tVal * tVal * 2.5 : 0;
            const bulbHex       = lampOn ? 0xffee88 : 0x221a00;
            for (let i = 0; i < lights.length; i++) {
                lights[i].pl.intensity = lampIntensity;
                lights[i].bulbMat.color.setHex(bulbHex);
            }
        }
    }

    // ── Wave animation ────────────────────────────────────────────────────
    let waveT = 0;
    let _lastWaveOffX = 0, _lastWaveOffY = 0;

    function updateWaves(dt) {
        waveT += dt;
        oceanMesh.position.y = Math.sin(waveT * 0.6) * 0.12;
        // Only upload texture when offset has moved more than ~1 texel
        const ox = (waveT * 0.004) % 1;
        const oy = (waveT * 0.002) % 1;
        if (Math.abs(ox - _lastWaveOffX) > 0.002 || Math.abs(oy - _lastWaveOffY) > 0.002) {
            waterTex.offset.x   = ox;
            waterTex.offset.y   = oy;
            waterTex.needsUpdate = true;
            _lastWaveOffX = ox;
            _lastWaveOffY = oy;
        }
    }

    // ── Camera controls ───────────────────────────────────────────────────
    let activeBtn = -1, lastMouse = { x: 0, y: 0 };
    function setCursor(btn) {
        canvas.style.cursor = btn === 0 ? 'grabbing' : btn === 2 ? 'alias' : 'grab';
    }

    canvas.addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('mousedown', e => {
        if (e.button === 0 || e.button === 2) {
            activeBtn = e.button;
            lastMouse = { x: e.clientX, y: e.clientY };
            setCursor(e.button);
            e.preventDefault();
        }
    });
    window.addEventListener('mousemove', e => {
        if (activeBtn === -1) return;
        const dx = e.clientX - lastMouse.x, dy = e.clientY - lastMouse.y;
        lastMouse = { x: e.clientX, y: e.clientY };
        if (activeBtn === 2) {
            azimuth -= dx * 0.005;
            polar    = Math.max(POLAR_MIN, Math.min(POLAR_MAX, polar + dy * 0.005));
        } else {
            const sens = camDist * 0.0012;
            const sinA = Math.sin(azimuth), cosA = Math.cos(azimuth), sinP = Math.sin(polar);
            panX -= (dx * cosA + dy * sinA * sinP) * sens;
            panZ -= (-dx * sinA + dy * cosA * sinP) * sens;
        }
        updateCamera();
    });
    window.addEventListener('mouseup', () => { activeBtn = -1; setCursor(-1); });
    canvas.addEventListener('wheel', e => {
        e.preventDefault();
        camDist *= 1 + (e.deltaY > 0 ? 0.1 : -0.1);
        camDist  = Math.max(CAM_MIN, Math.min(CAM_MAX, camDist));
        updateCamera();
    }, { passive: false });

    let lastTouch = null, lastTouchDist = null;
    canvas.addEventListener('touchstart', e => {
        e.preventDefault();
        if (e.touches.length === 1)
            lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        else if (e.touches.length === 2)
            lastTouchDist = Math.hypot(
                e.touches[1].clientX - e.touches[0].clientX,
                e.touches[1].clientY - e.touches[0].clientY
            );
    }, { passive: false });
    canvas.addEventListener('touchmove', e => {
        e.preventDefault();
        if (e.touches.length === 1 && lastTouch) {
            const dx = e.touches[0].clientX - lastTouch.x;
            const dy = e.touches[0].clientY - lastTouch.y;
            lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            const sens = camDist * 0.0012;
            const sinA = Math.sin(azimuth), cosA = Math.cos(azimuth), sinP = Math.sin(polar);
            panX -= (dx * cosA + dy * sinA * sinP) * sens;
            panZ -= (-dx * sinA + dy * cosA * sinP) * sens;
            updateCamera();
        } else if (e.touches.length === 2) {
            const dist = Math.hypot(
                e.touches[1].clientX - e.touches[0].clientX,
                e.touches[1].clientY - e.touches[0].clientY
            );
            if (lastTouchDist) {
                camDist = Math.max(CAM_MIN, Math.min(CAM_MAX, camDist * lastTouchDist / dist));
                updateCamera();
            }
            lastTouchDist = dist;
        }
    }, { passive: false });
    canvas.addEventListener('touchend', () => { lastTouch = null; lastTouchDist = null; });
    canvas.style.cursor = 'grab';

    const resetBtn = document.getElementById('mapResetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            ({ dist: camDist, polar, azimuth, panX, panZ } = DEFAULT);
            updateCamera();
            resetBtn.classList.add('active');
            setTimeout(() => resetBtn.classList.remove('active'), 200);
        });
    }

    function onResize() {
        const W = container.clientWidth, H = container.clientHeight;
        if (!W || !H) return;
        camera.aspect = W / H;
        camera.updateProjectionMatrix();
        renderer.setSize(W, H, false);
    }
    typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(onResize).observe(container)
        : window.addEventListener('resize', onResize);

    // ── Render loop ───────────────────────────────────────────────────────
    let lastTime  = performance.now();
    let _errCount = 0;
    (function animate() {
        requestAnimationFrame(animate);
        const now = performance.now();
        const dt  = Math.min((now - lastTime) / 1000, 0.1);
        lastTime  = now;
        try {
            updateDayNight(dt);
            updateWaves(dt);
        } catch (e) {
            if (_errCount++ < 5) console.error('[DayNight error]', e);
        }
        renderer.render(scene, camera);
    })();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init3DMap);
} else {
    init3DMap();
}