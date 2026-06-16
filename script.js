(function() {
  const wrap = document.getElementById('canvas-wrap');
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(45, wrap.clientWidth / wrap.clientHeight, 0.1, 1000);
  camera.position.set(0, 6, 14);
  camera.lookAt(0, 3, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(wrap.clientWidth, wrap.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  wrap.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const dir1 = new THREE.DirectionalLight(0xffffff, 0.8);
  dir1.position.set(5, 10, 7);
  scene.add(dir1);
  const dir2 = new THREE.DirectionalLight(0xfff0f5, 0.4);
  dir2.position.set(-6, 4, -4);
  scene.add(dir2);

  // Ground
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(14, 48),
    new THREE.MeshStandardMaterial({ color: 0xbfe6c4, roughness: 0.9 })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // Grass blades
  const grassGeo = new THREE.ConeGeometry(0.04, 0.5, 4);
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x7bbf6a, roughness: 0.9 });
  const grassGroup = new THREE.Group();
  for (let i = 0; i < 150; i++) {
    const blade = new THREE.Mesh(grassGeo, grassMat);
    const angle = Math.random() * Math.PI * 2;
    const radius = 2 + Math.random() * 11;
    blade.position.set(Math.cos(angle) * radius, 0.25, Math.sin(angle) * radius);
    blade.rotation.x = (Math.random() - 0.5) * 0.3;
    blade.rotation.z = (Math.random() - 0.5) * 0.3;
    blade.scale.setScalar(0.6 + Math.random() * 0.8);
    grassGroup.add(blade);
  }
  scene.add(grassGroup);

  let hue = 330;

  function petalColor(offset) {
    return new THREE.Color(`hsl(${(hue + offset) % 360}, 70%, 65%)`);
  }

  function makePetalShape() {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.bezierCurveTo(0.45, 0.3, 0.55, 1.0, 0, 1.5);
    shape.bezierCurveTo(-0.55, 1.0, -0.45, 0.3, 0, 0);
    return shape;
  }

  function createFlower(x, z, baseScale) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.scale.setScalar(baseScale);

    // Stem
    const stemHeight = 3.4 + Math.random() * 0.8;
    const stemGeo = new THREE.CylinderGeometry(0.06, 0.09, stemHeight, 8);
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x4a8c3f, roughness: 0.7 });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.y = stemHeight / 2;
    group.add(stem);

    // Leaves
    const leafGeo = new THREE.SphereGeometry(0.5, 8, 8);
    leafGeo.scale(1, 0.15, 0.5);
    for (let i = 0; i < 2; i++) {
      const leaf = new THREE.Mesh(leafGeo, stemMat);
      leaf.position.set((i === 0 ? 0.25 : -0.25), stemHeight * 0.4, 0);
      leaf.rotation.z = i === 0 ? -0.6 : 0.6;
      leaf.scale.setScalar(0.9);
      group.add(leaf);
    }

    const head = new THREE.Group();
    head.position.y = stemHeight;
    group.add(head);

    // Center
    const centerGeo = new THREE.SphereGeometry(0.45, 16, 16);
    const centerMat = new THREE.MeshStandardMaterial({ color: 0xffd166, roughness: 0.6 });
    const center = new THREE.Mesh(centerGeo, centerMat);
    center.position.y = 0.05;
    head.add(center);

    // Petals — each wrapped in its own pivot group so X-rotation opens outward
    const petalShape = makePetalShape();
    const petalGeo = new THREE.ExtrudeGeometry(petalShape, { depth: 0.05, bevelEnabled: false });
    petalGeo.translate(0, 0, -0.025);

    const petals = [];

    // Outer ring — opens wider (near horizontal)
    const outerCount = 7;
    for (let i = 0; i < outerCount; i++) {
      const fanGroup = new THREE.Group();
      fanGroup.rotation.y = (i / outerCount) * Math.PI * 2;
      head.add(fanGroup);

      const mat = new THREE.MeshStandardMaterial({
        color: petalColor(i * 8),
        roughness: 0.55,
        side: THREE.DoubleSide
      });
      const petal = new THREE.Mesh(petalGeo, mat);
      petal.rotation.x = 0;
      petal.userData.ring = 'outer';
      petal.userData.randOffset = (Math.random() - 0.5) * 0.15; // slight variation
      fanGroup.add(petal);
      petals.push(petal);
    }

    // Inner ring — stays more upright (cup shape)
    const innerCount = 7;
    for (let i = 0; i < innerCount; i++) {
      const fanGroup = new THREE.Group();
      fanGroup.rotation.y = ((i + 0.5) / innerCount) * Math.PI * 2;
      head.add(fanGroup);

      const mat = new THREE.MeshStandardMaterial({
        color: petalColor(i * 8 + 15),
        roughness: 0.55,
        side: THREE.DoubleSide
      });
      const petal = new THREE.Mesh(petalGeo, mat);
      petal.scale.setScalar(0.7);
      petal.rotation.x = 0;
      petal.userData.ring = 'inner';
      petal.userData.randOffset = (Math.random() - 0.5) * 0.1;
      fanGroup.add(petal);
      petals.push(petal);
    }

    return { group, head, petals, stem, bloomT: 0, bloomTarget: 0, sway: Math.random() * Math.PI * 2 };
  }

  const flowers = [];
  const positions = [
    [0, 0, 1.4], [-2.6, -1.2, 1.0], [2.6, -1.0, 1.05],
    [-1.4, 2.4, 0.85], [1.6, 2.6, 0.9], [-3.4, 1.4, 0.8], [3.2, 1.6, 0.85]
  ];
  positions.forEach(p => {
    const f = createFlower(p[0], p[1], p[2]);
    scene.add(f.group);
    flowers.push(f);
  });

  function updateFlowerColors() {
    flowers.forEach(f => {
      f.petals.forEach((petal, i) => {
        petal.material.color.copy(petalColor(i * 6));
      });
    });
  }

  let windOn = false;
  let dragging = false;
  let prevX = 0, prevY = 0;
  let targetRotY = 0.3, targetRotX = 0;
  let currentRotY = 0.3, currentRotX = 0;
  const pivot = new THREE.Group();
  scene.add(ground.parent === scene ? new THREE.Object3D() : new THREE.Object3D()); // no-op safeguard

  // Reparent scene content under a pivot for rotation control
  const pivotGroup = new THREE.Group();
  while (scene.children.length) {
    pivotGroup.add(scene.children[0]);
  }
  scene.add(pivotGroup);

  renderer.domElement.style.cursor = 'grab';
  renderer.domElement.addEventListener('pointerdown', (e) => {
    dragging = true;
    prevX = e.clientX; prevY = e.clientY;
    renderer.domElement.style.cursor = 'grabbing';
  });
  window.addEventListener('pointerup', () => {
    dragging = false;
    renderer.domElement.style.cursor = 'grab';
  });
  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - prevX;
    const dy = e.clientY - prevY;
    targetRotY += dx * 0.008;
    targetRotX += dy * 0.005;
    targetRotX = Math.max(-0.4, Math.min(0.6, targetRotX));
    prevX = e.clientX; prevY = e.clientY;
  });

  const bloomBtn = document.getElementById('bloom-btn');
  let bloomed = false;
  bloomBtn.addEventListener('click', () => {
    bloomed = !bloomed;
    flowers.forEach(f => { f.bloomTarget = bloomed ? 1 : 0; });
    if (bloomed) {
      bloomBtn.classList.add('active');
    } else {
      bloomBtn.classList.remove('active');
    }
  });
  document.getElementById('wind-btn').addEventListener('click', () => {
    windOn = !windOn;
    const btn = document.getElementById('wind-btn');
    if (windOn) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  document.getElementById('add-btn').addEventListener('click', () => {
    if (flowers.length >= 14) return;
    const angle = Math.random() * Math.PI * 2;
    const radius = 1 + Math.random() * 3.5;
    const f = createFlower(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.75 + Math.random() * 0.3);
    f.bloomTarget = 1;
    pivotGroup.add(f.group);
    flowers.push(f);
  });

  const hueSlider = document.getElementById('hue');
  const hueOut = document.getElementById('hue-out');
  hueSlider.addEventListener('input', (e) => {
    hue = Number(e.target.value);
    hueOut.textContent = hue;
    updateFlowerColors();
  });

  // Flowers start as closed buds — click 'Mekarkan' to bloom

  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    const dt = clock.getDelta();

    currentRotY += (targetRotY - currentRotY) * 0.08;
    currentRotX += (targetRotX - currentRotX) * 0.08;
    pivotGroup.rotation.y = currentRotY + (dragging ? 0 : Math.sin(t * 0.05) * 0.05);
    pivotGroup.rotation.x = currentRotX;

    flowers.forEach(f => {
      const target = (f.bloomTarget !== undefined) ? f.bloomTarget : 0;
      f.bloomT += (target - f.bloomT) * 0.05;

      f.petals.forEach((petal, i) => {
        const closedAngle = 0; // pointing up
        // Outer petals open wider (~80°), inner petals less (~50°) = cup shape
        const isOuter = petal.userData.ring === 'outer';
        const openAngle = isOuter ? -Math.PI / 2.3 : -Math.PI / 3.5;
        const rand = petal.userData.randOffset || 0;
        petal.rotation.x = closedAngle + (openAngle + rand - closedAngle) * f.bloomT;
      });

      const scale = 0.5 + 0.5 * f.bloomT;
      f.head.scale.setScalar(scale);

      if (windOn) {
        const sway = Math.sin(t * 1.6 + f.sway) * 0.08 + Math.sin(t * 0.7 + f.sway) * 0.04;
        f.group.rotation.z = sway;
        f.group.rotation.x = Math.sin(t * 1.2 + f.sway) * 0.03;
      } else {
        f.group.rotation.z += (0 - f.group.rotation.z) * 0.05;
        f.group.rotation.x += (0 - f.group.rotation.x) * 0.05;
      }

      f.head.rotation.y += dt * 0.15;
    });

    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', () => {
    const w = wrap.clientWidth, h = wrap.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });

  // Pastikan audio berjalan (mengatasi browser autoplay block)
  const bgMusic = document.getElementById('bg-music');
  if (bgMusic) {
    // Coba play saat interaksi pertama
    const playAudio = () => {
      bgMusic.play().catch(() => {}); // Abaikan error jika masih terblokir
      window.removeEventListener('pointerdown', playAudio);
      window.removeEventListener('keydown', playAudio);
    };
    window.addEventListener('pointerdown', playAudio);
    window.addEventListener('keydown', playAudio);
  }
})();
