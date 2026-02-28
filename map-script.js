// SimCity-style map: left-drag pan, right-drag rotate, scroll zoom, reset button.

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

function init3DMap() {
    const container = document.getElementById('mapContainer');
    const canvas    = createMapCanvas();
    if (!container || !canvas) return;

    // ── Scene ──────────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e27);
    scene.fog = new THREE.Fog(0x0a0e27, 350, 650);

    // ── Camera ─────────────────────────────────────────────────────────────────
    const w = container.clientWidth;
    const h = container.clientHeight;
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);

    // Spherical camera state
    let camDist  = 220;
    let polar    = Math.PI / 4;           // tilt: 0 = top-down, PI/2 = horizon
    let azimuth  = Math.PI / 4;           // spin around Y axis
    let panX     = 0, panZ = 0;           // look-at offset

    const CAM_MIN_DIST  = 60;
    const CAM_MAX_DIST  = 380;
    const POLAR_MIN     = 0.15;           // ~9° — nearly top-down
    const POLAR_MAX     = Math.PI / 2.1;  // ~85° — just above horizon, never flips

    const DEFAULT = { dist: 220, polar: Math.PI / 4, azimuth: Math.PI / 4, panX: 0, panZ: 0 };

    function updateCamera() {
        const sinP = Math.sin(polar);
        const cosP = Math.cos(polar);
        const sinA = Math.sin(azimuth);
        const cosA = Math.cos(azimuth);

        camera.position.set(
            panX + camDist * sinP * sinA,
            camDist * cosP,
            panZ + camDist * sinP * cosA
        );
        camera.lookAt(panX, 0, panZ);
    }
    updateCamera();

    // ── Renderer ───────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(w, h, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // ── Grass grid (20×20) ─────────────────────────────────────────────────────
    const GRID   = 20;
    const TILE_W = 10;
    const GAP    = 0.18;
    const TOTAL  = GRID * TILE_W;
    const OFFSET = TOTAL / 2 - TILE_W / 2;

    const grassColors = [
        0x2d6a2d, 0x317531, 0x2a6128, 0x348034,
        0x276025, 0x3a8a38, 0x2f7030, 0x307832,
    ];
    const tileGeo = new THREE.BoxGeometry(TILE_W - GAP, 0.5, TILE_W - GAP);

    for (let row = 0; row < GRID; row++) {
        for (let col = 0; col < GRID; col++) {
            const color = grassColors[(row * 3 + col * 7) % grassColors.length];
            const tile  = new THREE.Mesh(tileGeo, new THREE.MeshLambertMaterial({ color }));
            tile.position.set(col * TILE_W - OFFSET, 0, row * TILE_W - OFFSET);
            tile.receiveShadow = true;
            scene.add(tile);
        }
    }

    const gridHelper = new THREE.GridHelper(TOTAL, GRID, 0x1a3d1a, 0x1a3d1a);
    gridHelper.position.y = 0.26;
    gridHelper.material.opacity = 0.4;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);

    const border = new THREE.Mesh(
        new THREE.PlaneGeometry(TOTAL + 6, TOTAL + 6),
        new THREE.MeshLambertMaterial({ color: 0x1e1e1e, side: THREE.DoubleSide })
    );
    border.rotation.x = -Math.PI / 2;
    border.position.y = -0.26;
    scene.add(border);

    // ── Lighting ───────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));

    const sun = new THREE.DirectionalLight(0xfff8e0, 1.2);
    sun.position.set(80, 140, 80);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near   = 10;
    sun.shadow.camera.far    = 500;
    sun.shadow.camera.left   = -160;
    sun.shadow.camera.right  = 160;
    sun.shadow.camera.top    = 160;
    sun.shadow.camera.bottom = -160;
    scene.add(sun);

    const rimLight = new THREE.DirectionalLight(0xff006e, 0.25);
    rimLight.position.set(-100, 60, -100);
    scene.add(rimLight);

    // ── Input state ────────────────────────────────────────────────────────────
    let activeBtn  = -1;               // which mouse button is held
    let lastMouse  = { x: 0, y: 0 };

    function setCursor(btn) {
        if      (btn === 0) canvas.style.cursor = 'grabbing';     // pan
        else if (btn === 2) canvas.style.cursor = 'alias';        // rotate
        else                canvas.style.cursor = 'grab';
    }

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    canvas.addEventListener('mousedown', (e) => {
        if (e.button === 0 || e.button === 2) {
            activeBtn = e.button;
            lastMouse = { x: e.clientX, y: e.clientY };
            setCursor(e.button);
            e.preventDefault();
        }
    });

    window.addEventListener('mousemove', (e) => {
        if (activeBtn === -1) return;

        const dx = e.clientX - lastMouse.x;
        const dy = e.clientY - lastMouse.y;
        lastMouse = { x: e.clientX, y: e.clientY };

        if (activeBtn === 2) {
            // ── Rotate ──────────────────────────────────────────────────────
            azimuth -= dx * 0.005;
            polar    = Math.max(POLAR_MIN, Math.min(POLAR_MAX, polar + dy * 0.005));

        } else if (activeBtn === 0) {
            // ── Pan (screen-space → world-space, respects current azimuth) ──
            const sens = camDist * 0.0012;
            const sinA = Math.sin(azimuth);
            const cosA = Math.cos(azimuth);
            const sinP = Math.sin(polar);

            // Right vector on ground plane
            panX -= ( dx * cosA + dy * sinA * sinP) * sens;
            panZ -= (-dx * sinA + dy * cosA * sinP) * sens;
        }

        updateCamera();
    });

    window.addEventListener('mouseup', () => {
        activeBtn = -1;
        setCursor(-1);
    });

    // ── Scroll to zoom ─────────────────────────────────────────────────────────
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        camDist *= 1 + (e.deltaY > 0 ? 0.12 : -0.12);
        camDist  = Math.max(CAM_MIN_DIST, Math.min(CAM_MAX_DIST, camDist));
        updateCamera();
    }, { passive: false });

    // ── Touch (1-finger pan, 2-finger pinch-zoom) ──────────────────────────────
    let lastTouch     = null;
    let lastTouchDist = null;

    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (e.touches.length === 1) {
            lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 2) {
            lastTouchDist = Math.hypot(
                e.touches[1].clientX - e.touches[0].clientX,
                e.touches[1].clientY - e.touches[0].clientY
            );
        }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (e.touches.length === 1 && lastTouch) {
            const dx = e.touches[0].clientX - lastTouch.x;
            const dy = e.touches[0].clientY - lastTouch.y;
            lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };

            const sens = camDist * 0.0012;
            const sinA = Math.sin(azimuth);
            const cosA = Math.cos(azimuth);
            const sinP = Math.sin(polar);

            panX -= ( dx * cosA + dy * sinA * sinP) * sens;
            panZ -= (-dx * sinA + dy * cosA * sinP) * sens;
            updateCamera();
        } else if (e.touches.length === 2) {
            const dist = Math.hypot(
                e.touches[1].clientX - e.touches[0].clientX,
                e.touches[1].clientY - e.touches[0].clientY
            );
            if (lastTouchDist) {
                camDist *= lastTouchDist / dist;
                camDist  = Math.max(CAM_MIN_DIST, Math.min(CAM_MAX_DIST, camDist));
                updateCamera();
            }
            lastTouchDist = dist;
        }
    }, { passive: false });

    canvas.addEventListener('touchend', () => {
        lastTouch = null; lastTouchDist = null;
    });

    canvas.style.cursor = 'grab';

    // ── Reset button ───────────────────────────────────────────────────────────
    const resetBtn = document.getElementById('mapResetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            camDist = DEFAULT.dist;
            polar   = DEFAULT.polar;
            azimuth = DEFAULT.azimuth;
            panX    = DEFAULT.panX;
            panZ    = DEFAULT.panZ;
            updateCamera();
            resetBtn.classList.add('active');
            setTimeout(() => resetBtn.classList.remove('active'), 200);
        });
    }

    // ── Resize ─────────────────────────────────────────────────────────────────
    function onResize() {
        const W = container.clientWidth;
        const H = container.clientHeight;
        if (!W || !H) return;
        camera.aspect = W / H;
        camera.updateProjectionMatrix();
        renderer.setSize(W, H, false);
    }
    (typeof ResizeObserver !== 'undefined')
        ? new ResizeObserver(onResize).observe(container)
        : window.addEventListener('resize', onResize);

    // ── Animate ────────────────────────────────────────────────────────────────
    (function animate() {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
    })();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init3DMap);
} else {
    init3DMap();
}