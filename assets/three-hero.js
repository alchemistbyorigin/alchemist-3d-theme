(() => {
  "use strict";

  const instances = new Map();
  let threePromise = null;

  function getConfig(sectionId) {
    return (window.AlchemistHeroConfig && window.AlchemistHeroConfig[sectionId]) || {};
  }

  function loadThree() {
    if (window.THREE) return Promise.resolve(window.THREE);
    if (threePromise) return threePromise;

    threePromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-alchemist-three]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.THREE), { once: true });
        existing.addEventListener('error', () => reject(new Error('Three.js failed to load.')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.min.js';
      script.async = true;
      script.dataset.alchemistThree = '';
      script.onload = () => window.THREE ? resolve(window.THREE) : reject(new Error('Three.js failed to initialize.'));
      script.onerror = () => reject(new Error('Three.js failed to load.'));
      document.head.appendChild(script);
    });

    return threePromise;
  }

  function isLowPowerDevice() {
    const cores = Number(navigator.hardwareConcurrency || 8);
    const memory = Number(navigator.deviceMemory || 8);
    const saveData = Boolean(navigator.connection && navigator.connection.saveData);
    return saveData || cores <= 4 || memory <= 4;
  }

  function qualityProfile(settings) {
    const isMobile = window.matchMedia('(max-width: 749px)').matches;
    if (!isMobile) return { pixelRatio: 1.5, particles: 1100, detail: 4 };

    switch (settings.mobileQuality) {
      case 'high': return { pixelRatio: 1.4, particles: 750, detail: 4 };
      case 'medium': return { pixelRatio: 1.2, particles: 500, detail: 3 };
      default: return { pixelRatio: 1, particles: 280, detail: 2 };
    }
  }

  function showFallback(hero) {
    const fallback = hero.querySelector('.alchemist-hero__fallback');
    const container = hero.querySelector('[data-three-container]');
    if (fallback) fallback.style.opacity = '1';
    if (container) container.setAttribute('hidden', '');
    hero.classList.add('alchemist-hero--fallback');
  }

  function createHero(THREE, hero) {
    if (!hero || instances.has(hero)) return;

    const container = hero.querySelector('[data-three-container]');
    if (!container) return;

    const sectionId = hero.dataset.sectionId;
    const settings = getConfig(sectionId);
    const reducedMotion = settings.motionEnabled === false || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (settings.enabled === false || reducedMotion || isLowPowerDevice()) {
      showFallback(hero);
      return;
    }

    const quality = qualityProfile(settings);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0, 5);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: quality.pixelRatio > 1, alpha: true, powerPreference: 'high-performance' });
    } catch (error) {
      showFallback(hero);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.setAttribute('role', 'presentation');
    container.removeAttribute('hidden');
    container.replaceChildren(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    const geometry = new THREE.IcosahedronGeometry(1.35, quality.detail);
    const material = new THREE.MeshPhysicalMaterial({ color: 0xb8b0a0, metalness: 0.85, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.12 });
    const object = new THREE.Mesh(geometry, material);
    group.add(object);

    const wireGeometry = new THREE.IcosahedronGeometry(1.39, Math.max(1, quality.detail - 2));
    const wireMaterial = new THREE.MeshBasicMaterial({ color: 0xeee9dd, wireframe: true, transparent: true, opacity: 0.08 });
    const wire = new THREE.Mesh(wireGeometry, wireMaterial);
    group.add(wire);

    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(quality.particles * 3);
    for (let i = 0; i < quality.particles; i += 1) {
      const radius = 3.5 + Math.random() * 4;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMaterial = new THREE.PointsMaterial({ color: 0xd8d0c2, size: 0.018, transparent: true, opacity: 0.5, depthWrite: false });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    scene.add(new THREE.AmbientLight(0xffffff, 1.1));
    const keyLight = new THREE.DirectionalLight(0xfff4df, 3.5);
    keyLight.position.set(3, 4, 5);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x9da9b8, 2.5);
    rimLight.position.set(-4, 1, -3);
    scene.add(rimLight);

    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    const interaction = Number(settings.interaction ?? 0.7);
    const speed = Number(settings.rotationSpeed ?? 0.4);
    const clock = new THREE.Clock();
    let frameId = 0;
    let visible = true;
    let destroyed = false;

    const pointerMove = (event) => {
      mouse.targetX = (event.clientX / window.innerWidth - 0.5) * interaction;
      mouse.targetY = (event.clientY / window.innerHeight - 0.5) * interaction;
    };

    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.pixelRatio));
      renderer.setSize(width, height, false);
    };

    const renderFrame = () => {
      if (destroyed) return;
      if (!visible || document.hidden) {
        frameId = requestAnimationFrame(renderFrame);
        return;
      }

      const elapsed = clock.getElapsedTime();
      mouse.x += (mouse.targetX - mouse.x) * 0.035;
      mouse.y += (mouse.targetY - mouse.y) * 0.035;
      group.rotation.y = elapsed * speed * 0.18 + mouse.x * 0.35;
      group.rotation.x = Math.sin(elapsed * 0.35) * 0.08 + mouse.y * 0.25;
      object.rotation.z = Math.sin(elapsed * 0.22) * 0.12;
      wire.rotation.copy(object.rotation);
      particles.rotation.y = elapsed * 0.015;
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(renderFrame);
    };

    const observer = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? true;
    }, { rootMargin: '100px' });
    observer.observe(hero);

    window.addEventListener('pointermove', pointerMove, { passive: true });
    window.addEventListener('resize', resize, { passive: true });
    resize();
    renderer.render(scene, camera);
    frameId = requestAnimationFrame(renderFrame);
    hero.classList.add('alchemist-hero--ready');

    const destroy = () => {
      if (destroyed) return;
      destroyed = true;
      cancelAnimationFrame(frameId);
      observer.disconnect();
      window.removeEventListener('pointermove', pointerMove);
      window.removeEventListener('resize', resize);
      geometry.dispose();
      material.dispose();
      wireGeometry.dispose();
      wireMaterial.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      scene.clear();
      renderer.dispose();
      renderer.forceContextLoss?.();
      renderer.domElement.remove();
      instances.delete(hero);
    };

    instances.set(hero, { destroy });
  }

  async function init(root = document) {
    const heroes = root.matches?.('[data-hero-3d]') ? [root] : [...root.querySelectorAll('[data-hero-3d]')];
    if (!heroes.length) return;

    const eligibleHeroes = heroes.filter((hero) => {
      const settings = getConfig(hero.dataset.sectionId);
      const reducedMotion = settings.motionEnabled === false || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (settings.enabled === false || reducedMotion || isLowPowerDevice()) {
        showFallback(hero);
        return false;
      }
      return true;
    });

    if (!eligibleHeroes.length) return;

    try {
      const THREE = await loadThree();
      eligibleHeroes.forEach((hero) => createHero(THREE, hero));
    } catch (error) {
      console.error('Alchemist 3D Hero:', error);
      eligibleHeroes.forEach(showFallback);
    }
  }

  function scheduleInit(root = document) {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => init(root), { timeout: 1200 });
    } else {
      window.setTimeout(() => init(root), 120);
    }
  }

  function unload(root) {
    const heroes = root.matches?.('[data-hero-3d]') ? [root] : [...root.querySelectorAll('[data-hero-3d]')];
    heroes.forEach((hero) => instances.get(hero)?.destroy());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => scheduleInit());
  } else {
    scheduleInit();
  }

  document.addEventListener('shopify:section:load', (event) => scheduleInit(event.target));
  document.addEventListener('shopify:section:unload', (event) => unload(event.target));
})();
