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
    { t: 0.00, sky: 0x060618, amb: 0x1a2050, aI: 0.22, sun: 0xff5522, sI: 0.0, elev: 0.0 },
    { t: 0.22, sky: 0x060618, amb: 0x1a2050, aI: 0.22, sun: 0xff5522, sI: 0.0, elev: 0.0 },
    { t: 0.26, sky: 0x1a0828, amb: 0x2a2060, aI: 0.18, sun: 0xff5522, sI: 0.05, elev: 0.02 },
    { t: 0.29, sky: 0xff5500, amb: 0xff8844, aI: 0.45, sun: 0xff7722, sI: 0.8, elev: 0.12 },
    { t: 0.33, sky: 0x87ceeb, amb: 0xfff0e0, aI: 0.65, sun: 0xffeebb, sI: 1.15, elev: 0.55 },
    { t: 0.50, sky: 0x6ec6f0, amb: 0xffffff, aI: 0.80, sun: 0xfff8e0, sI: 1.5, elev: 1.0 },
    { t: 0.67, sky: 0x87ceeb, amb: 0xfff0e0, aI: 0.65, sun: 0xffeebb, sI: 1.15, elev: 0.55 },
    { t: 0.71, sky: 0xff5500, amb: 0xff8844, aI: 0.45, sun: 0xff7722, sI: 0.8, elev: 0.12 },
    { t: 0.75, sky: 0x1a0828, amb: 0x2a2060, aI: 0.18, sun: 0xff4400, sI: 0.05, elev: 0.02 },
    { t: 0.78, sky: 0x060618, amb: 0x1a2050, aI: 0.22, sun: 0xff3300, sI: 0.0, elev: 0.0 },
    { t: 1.00, sky: 0x060618, amb: 0x1a2050, aI: 0.22, sun: 0xff5522, sI: 0.0, elev: 0.0 },
];

function lerpColor(hexA, hexB, t) {
    const a = new THREE.Color(hexA), b = new THREE.Color(hexB);
    return new THREE.Color(
        a.r + (b.r - a.r) * t,
        a.g + (b.g - a.g) * t,
        a.b + (b.b - a.b) * t
    );
}

function cycleLookup(t) {
    t = ((t % 1) + 1) % 1;
    let lo = DAY_CYCLE[DAY_CYCLE.length - 2], hi = DAY_CYCLE[DAY_CYCLE.length - 1];
    for (let i = 0; i < DAY_CYCLE.length - 1; i++) {
        if (t >= DAY_CYCLE[i].t && t < DAY_CYCLE[i + 1].t) { lo = DAY_CYCLE[i]; hi = DAY_CYCLE[i + 1]; break; }
    }
    return { lo, hi, f: (t - lo.t) / (hi.t - lo.t) };
}

function buildStars(scene) {
    const geo = new THREE.BufferGeometry();
    const N = 1200, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
        const theta = Math.random() * Math.PI * 2, phi = Math.random() * Math.PI * 0.48, r = 900;
        pos[i * 3] = r * Math.sin(phi) * Math.cos(theta); pos[i * 3 + 1] = r * Math.cos(phi); pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: true, transparent: true, opacity: 0 });
    scene.add(new THREE.Points(geo, mat));
    return mat;
}

function buildSkyDisc(scene, color, radius) {
    const geo = new THREE.SphereGeometry(radius, 16, 16);
    const mat = new THREE.MeshBasicMaterial({ color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.visible = false;
    scene.add(mesh);
    return { mesh, mat };
}

// ── Seeded pseudo-random ───────────────────────────────────────────────────
function seededRand(seed) {
    let s = seed;
    return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}

// ── Island mask ───────────────────────────────────────────────────────────
function buildIslandMask(GRID) {
    const rand = seededRand(42);
    const NS = 8;
    const nGrid = [];
    for (let r = 0; r <= NS; r++) { nGrid[r] = []; for (let c = 0; c <= NS; c++) nGrid[r][c] = rand(); }

    function bilinear(nr, nc) {
        const r0 = Math.floor(nr), r1 = Math.min(r0 + 1, NS), c0 = Math.floor(nc), c1 = Math.min(c0 + 1, NS);
        const fr = nr - r0, fc = nc - c0;
        return nGrid[r0][c0] * (1 - fr) * (1 - fc) + nGrid[r0][c1] * (1 - fr) * fc + nGrid[r1][c0] * fr * (1 - fc) + nGrid[r1][c1] * fr * fc;
    }

    const mask = []; let landCount = 0;
    for (let r = 0; r < GRID; r++) {
        mask[r] = [];
        for (let c = 0; c < GRID; c++) {
            const nx = (c / (GRID - 1)) * 2 - 1, nz = (r / (GRID - 1)) * 2 - 1;
            const dist = Math.sqrt(nx * nx + nz * nz);
            const gradient = Math.max(0, 1 - (dist / 0.72));
            const gradSmooth = gradient * gradient * (3 - 2 * gradient);
            const nr1 = (r / (GRID - 1)) * NS, nc1 = (c / (GRID - 1)) * NS;
            const n1 = bilinear(nr1, nc1), n2 = bilinear(nr1 * 2 % NS, nc1 * 2 % NS);
            const val = gradSmooth * 0.55 + (n1 * 0.65 + n2 * 0.35) * 0.45;
            mask[r][c] = val > 0.48;
            if (mask[r][c]) landCount++;
        }
    }
    return { mask, landCount };
}

function isShore(row, col, mask, GRID) {
    if (!mask[row][col]) return false;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const r2 = row + dr, c2 = col + dc;
        if (r2 < 0 || r2 >= GRID || c2 < 0 || c2 >= GRID || !mask[r2][c2]) return true;
    }
    return false;
}

function tileElevation(row, col, GRID) {
    const nx = (col / (GRID - 1)) * 2 - 1, nz = (row / (GRID - 1)) * 2 - 1;
    const dist = Math.sqrt(nx * nx + nz * nz);
    const h = Math.max(0, 1 - dist * 1.3);
    return h * h * 3.5;
}

function init3DMap() {
    const container = document.getElementById('mapContainer');
    const canvas = createMapCanvas();
    if (!container || !canvas) return;

    // ── Scene ──────────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060618);
    scene.fog = new THREE.FogExp2(new THREE.Color(0x060618), 0.00045);

    // ── Camera ─────────────────────────────────────────────────────────────────
    const w = container.clientWidth, h = container.clientHeight;
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 3000);

    let camDist = 400, polar = Math.PI / 4, azimuth = Math.PI / 4;
    let panX = 0, panZ = 0;

    const CAM_MIN = 80, CAM_MAX = 900;
    const POLAR_MIN = 0.15, POLAR_MAX = Math.PI / 2.1;

    const GRID = 40, TILE_W = 10, GAP = 0.15;
    const TOTAL = GRID * TILE_W;
    const OFFSET = TOTAL / 2 - TILE_W / 2;
    const HALF = TOTAL / 2;

    const DEFAULT = { dist: 400, polar: Math.PI / 4, azimuth: Math.PI / 4, panX: 0, panZ: 0 };

    function clampPan() {
        panX = Math.max(-HALF, Math.min(HALF, panX));
        panZ = Math.max(-HALF, Math.min(HALF, panZ));
    }

    function updateCamera() {
        clampPan();
        const sinP = Math.sin(polar), cosP = Math.cos(polar);
        const sinA = Math.sin(azimuth), cosA = Math.cos(azimuth);
        camera.position.set(panX + camDist * sinP * sinA, camDist * cosP, panZ + camDist * sinP * cosA);
        camera.lookAt(panX, 0, panZ);
    }
    updateCamera();

    // ── Renderer ───────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(w, h, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // ── Island mask ────────────────────────────────────────────────────────────
    const { mask: landMask } = buildIslandMask(GRID);

    // ─── 暴露給 city_library.js 使用 ────────────────────────────────────────
    window._cityScene = scene;
    window._cityLandMask = landMask;
    window._cityGrid = { GRID, TILE_W, OFFSET };

    const grassColors = [0x2d6a2d, 0x317531, 0x2a6128, 0x348034, 0x276025, 0x3a8a38, 0x2f7030, 0x307832];
    const sandColors = [0xd4b483, 0xc8a96e, 0xdbc07a, 0xcfb87f, 0xc9a86c];
    const tileGeo = new THREE.BoxGeometry(TILE_W - GAP, 1.0, TILE_W - GAP);

    for (let row = 0; row < GRID; row++) {
        for (let col = 0; col < GRID; col++) {
            if (!landMask[row][col]) continue;
            const x = col * TILE_W - OFFSET;
            const z = row * TILE_W - OFFSET;
            const shore = isShore(row, col, landMask, GRID);
            const elev = tileElevation(row, col, GRID);
            const palette = shore ? sandColors : grassColors;
            const color = palette[(row * 3 + col * 7) % palette.length];
            const tile = new THREE.Mesh(tileGeo, new THREE.MeshLambertMaterial({ color }));
            tile.position.set(x, elev - 0.5, z);
            tile.receiveShadow = true;
            tile.castShadow = true;
            scene.add(tile);
            if (shore) {
                const cliffH = Math.max(2.5, elev + 2.5);
                const cliffGeo = new THREE.BoxGeometry(TILE_W - GAP, cliffH, TILE_W - GAP);
                const cliff = new THREE.Mesh(cliffGeo, new THREE.MeshLambertMaterial({ color: 0x9a7040 }));
                cliff.position.set(x, -(cliffH / 2) + 0.25, z);
                scene.add(cliff);
            }
        }
    }

    const OCEAN_SIZE = 2600;
    const oceanMat = new THREE.MeshLambertMaterial({ color: 0x1a6eb5 });
    const oceanMesh = new THREE.Mesh(new THREE.PlaneGeometry(OCEAN_SIZE, OCEAN_SIZE), oceanMat);
    oceanMesh.rotation.x = -Math.PI / 2;
    oceanMesh.position.y = 0;
    scene.add(oceanMesh);

    const lineMat = new THREE.LineBasicMaterial({ color: 0x1a3d1a, transparent: true, opacity: 0.2 });
    const linePoints = [];
    function land(r, c) {
        return r >= 0 && r < GRID && c >= 0 && c < GRID && landMask[r][c];
    }
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

    const ambientLight = new THREE.AmbientLight(0x10103a, 0.07);
    scene.add(ambientLight);

    const sun = new THREE.DirectionalLight(0xfff8e0, 0.0);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { near: 10, far: 1200, left: -300, right: 300, top: 300, bottom: -300 });
    scene.add(sun);

    const moonLight = new THREE.DirectionalLight(0x8899cc, 0.0);
    scene.add(moonLight);

    const starMat = buildStars(scene);
    const { mesh: sunDisc, mat: sunMat } = buildSkyDisc(scene, 0xfff8e0, 14);
    const { mesh: moonDisc, mat: moonMat } = buildSkyDisc(scene, 0xdde8ff, 9);

    const CYCLE_SECONDS = 80;
    const clockEl = document.getElementById('mapClock');
    let dayT = 0.38;

    function updateDayNight(dt) {
        dayT = (dayT + dt / CYCLE_SECONDS) % 1;
        const { lo, hi, f } = cycleLookup(dayT);

        const skyCol = lerpColor(lo.sky, hi.sky, f);
        scene.background.setRGB(skyCol.r, skyCol.g, skyCol.b);
        scene.fog.color.setRGB(skyCol.r, skyCol.g, skyCol.b);

        ambientLight.color.copy(lerpColor(lo.amb, hi.amb, f));
        ambientLight.intensity = lo.aI + (hi.aI - lo.aI) * f;

        const elev = lo.elev + (hi.elev - lo.elev) * f;
        const sunAngle = dayT * Math.PI * 2 - Math.PI * 0.5;
        const SUN_R = 800;

        sun.position.set(Math.cos(sunAngle) * SUN_R * 0.7, Math.sin(elev * Math.PI) * SUN_R, Math.sin(sunAngle) * SUN_R * 0.4);
        sun.color.copy(lerpColor(lo.sun, hi.sun, f));
        sun.intensity = lo.sI + (hi.sI - lo.sI) * f;
        sunDisc.position.copy(sun.position).normalize().multiplyScalar(860);
        sunMat.color.copy(sun.color);
        sunDisc.visible = elev > 0.01;

        const moonAngle = sunAngle + Math.PI, moonElev = 1.0 - elev;
        moonLight.position.set(Math.cos(moonAngle) * SUN_R * 0.7, Math.sin(moonElev * Math.PI) * SUN_R, Math.sin(moonAngle) * SUN_R * 0.4);
        moonLight.intensity = Math.max(0, (1 - elev * 2.5)) * 0.55;
        moonDisc.position.copy(moonLight.position).normalize().multiplyScalar(860);
        moonDisc.visible = moonElev > 0.1;

        starMat.opacity = Math.max(0, 1 - elev * 3.5);
        oceanMat.color.set(elev < 0.08 ? 0x061830 : 0x1a6eb5);

        if (clockEl) {
            const mins = Math.floor(dayT * 24 * 60);
            clockEl.textContent = `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
            clockEl.className = elev > 0.05 ? 'day' : 'night';
        }
    }

    let waveT = 0;
    function updateWaves(dt) {
        waveT += dt;
        oceanMesh.position.y = Math.sin(waveT * 0.6) * 0.12;
    }

    let activeBtn = -1, lastMouse = { x: 0, y: 0 };
    function setCursor(btn) { canvas.style.cursor = btn === 0 ? 'grabbing' : btn === 2 ? 'alias' : 'grab'; }

    canvas.addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('mousedown', e => {
        if (e.button === 0 || e.button === 2) {
            activeBtn = e.button; lastMouse = { x: e.clientX, y: e.clientY };
            setCursor(e.button); e.preventDefault();
        }
    });
    window.addEventListener('mousemove', e => {
        if (activeBtn === -1) return;
        const dx = e.clientX - lastMouse.x, dy = e.clientY - lastMouse.y;
        lastMouse = { x: e.clientX, y: e.clientY };
        if (activeBtn === 2) {
            azimuth -= dx * 0.005;
            polar = Math.max(POLAR_MIN, Math.min(POLAR_MAX, polar + dy * 0.005));
        } else {
            const sens = camDist * 0.0012, sinA = Math.sin(azimuth), cosA = Math.cos(azimuth), sinP = Math.sin(polar);
            panX -= (dx * cosA + dy * sinA * sinP) * sens;
            panZ -= (-dx * sinA + dy * cosA * sinP) * sens;
        }
        updateCamera();
    });
    window.addEventListener('mouseup', () => { activeBtn = -1; setCursor(-1); });
    canvas.addEventListener('wheel', e => {
        e.preventDefault();
        camDist *= 1 + (e.deltaY > 0 ? 0.1 : -0.1);
        camDist = Math.max(CAM_MIN, Math.min(CAM_MAX, camDist));
        updateCamera();
    }, { passive: false });

    let lastTouch = null, lastTouchDist = null;
    canvas.addEventListener('touchstart', e => {
        e.preventDefault();
        if (e.touches.length === 1) lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        else if (e.touches.length === 2) lastTouchDist = Math.hypot(e.touches[1].clientX - e.touches[0].clientX, e.touches[1].clientY - e.touches[0].clientY);
    }, { passive: false });
    canvas.addEventListener('touchmove', e => {
        e.preventDefault();
        if (e.touches.length === 1 && lastTouch) {
            const dx = e.touches[0].clientX - lastTouch.x, dy = e.touches[0].clientY - lastTouch.y;
            lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            const sens = camDist * 0.0012, sinA = Math.sin(azimuth), cosA = Math.cos(azimuth), sinP = Math.sin(polar);
            panX -= (dx * cosA + dy * sinA * sinP) * sens; panZ -= (-dx * sinA + dy * cosA * sinP) * sens;
            updateCamera();
        } else if (e.touches.length === 2) {
            const dist = Math.hypot(e.touches[1].clientX - e.touches[0].clientX, e.touches[1].clientY - e.touches[0].clientY);
            if (lastTouchDist) { camDist = Math.max(CAM_MIN, Math.min(CAM_MAX, camDist * lastTouchDist / dist)); updateCamera(); }
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
        camera.aspect = W / H; camera.updateProjectionMatrix();
        renderer.setSize(W, H, false);
    }
    typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(onResize).observe(container)
        : window.addEventListener('resize', onResize);

    let lastTime = performance.now();
    let _errCount = 0;
    (function animate() {
        requestAnimationFrame(animate);
        const now = performance.now(), dt = Math.min((now - lastTime) / 1000, 0.1);
        lastTime = now;
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