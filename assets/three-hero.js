(() => {
  "use strict";

  const instances = new Map();

  function getConfig(sectionId) {
    return (window.AlchemistHeroConfig && window.AlchemistHeroConfig[sectionId]) || {};
  }

  function prefersStaticExperience(settings) {
    const reducedMotion = settings.motionEnabled === false || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const saveData = Boolean(navigator.connection && navigator.connection.saveData);
    return reducedMotion || saveData;
  }

  function qualityProfile(settings) {
    const isMobile = window.matchMedia('(max-width: 749px)').matches;
    const cores = Number(navigator.hardwareConcurrency || 8);
    const memory = Number(navigator.deviceMemory || 8);
    const constrained = cores <= 4 || memory <= 4;

    if (!isMobile) {
      return constrained
        ? { pixelRatio: 1, particles: 90, spherePoints: 34 }
        : { pixelRatio: 1.35, particles: 150, spherePoints: 46 };
    }

    switch (settings.mobileQuality) {
      case 'high':
        return constrained
          ? { pixelRatio: 1, particles: 70, spherePoints: 30 }
          : { pixelRatio: 1.2, particles: 105, spherePoints: 38 };
      case 'medium':
        return { pixelRatio: 1, particles: 70, spherePoints: 30 };
      default:
        return { pixelRatio: 1, particles: 45, spherePoints: 24 };
    }
  }

  function showFallback(hero) {
    const fallback = hero.querySelector('.alchemist-hero__fallback');
    const container = hero.querySelector('[data-three-container]');
    if (fallback) fallback.style.opacity = '1';
    if (container) container.setAttribute('hidden', '');
    hero.classList.remove('alchemist-hero--ready');
    hero.classList.add('alchemist-hero--fallback');
  }

  function hideFallback(hero) {
    const fallback = hero.querySelector('.alchemist-hero__fallback');
    if (fallback) fallback.style.opacity = '0';
    hero.classList.remove('alchemist-hero--fallback');
  }

  function fibonacciSphere(count) {
    const points = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < count; i += 1) {
      const y = 1 - (i / Math.max(1, count - 1)) * 2;
      const radius = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = golden * i;
      points.push({ x: Math.cos(theta) * radius, y, z: Math.sin(theta) * radius });
    }
    return points;
  }

  function nearestEdges(points, neighbors = 3) {
    const edges = new Set();
    for (let i = 0; i < points.length; i += 1) {
      const distances = [];
      for (let j = 0; j < points.length; j += 1) {
        if (i === j) continue;
        const dx = points[i].x - points[j].x;
        const dy = points[i].y - points[j].y;
        const dz = points[i].z - points[j].z;
        distances.push({ j, d: dx * dx + dy * dy + dz * dz });
      }
      distances.sort((a, b) => a.d - b.d);
      for (let n = 0; n < Math.min(neighbors, distances.length); n += 1) {
        const j = distances[n].j;
        const a = Math.min(i, j);
        const b = Math.max(i, j);
        edges.add(`${a}:${b}`);
      }
    }
    return [...edges].map((edge) => edge.split(':').map(Number));
  }

  function rotatePoint(point, rotX, rotY, rotZ) {
    let { x, y, z } = point;

    let cos = Math.cos(rotX);
    let sin = Math.sin(rotX);
    let nextY = y * cos - z * sin;
    let nextZ = y * sin + z * cos;
    y = nextY;
    z = nextZ;

    cos = Math.cos(rotY);
    sin = Math.sin(rotY);
    const nextX = x * cos + z * sin;
    nextZ = -x * sin + z * cos;
    x = nextX;
    z = nextZ;

    cos = Math.cos(rotZ);
    sin = Math.sin(rotZ);
    const finalX = x * cos - y * sin;
    const finalY = x * sin + y * cos;

    return { x: finalX, y: finalY, z };
  }

  function createParticles(count) {
    return Array.from({ length: count }, () => ({
      x: Math.random() * 2 - 1,
      y: Math.random() * 2 - 1,
      z: Math.random(),
      size: 0.45 + Math.random() * 1.35,
      alpha: 0.18 + Math.random() * 0.55,
      drift: 0.08 + Math.random() * 0.22,
    }));
  }

  function createHero(hero) {
    if (!hero || instances.has(hero)) return;

    const container = hero.querySelector('[data-three-container]');
    if (!container) return;

    const sectionId = hero.dataset.sectionId;
    const settings = getConfig(sectionId);
    if (settings.enabled === false || prefersStaticExperience(settings)) {
      showFallback(hero);
      return;
    }

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { alpha: true, desynchronized: true });
    if (!context) {
      showFallback(hero);
      return;
    }

    canvas.setAttribute('aria-hidden', 'true');
    canvas.setAttribute('role', 'presentation');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';

    container.removeAttribute('hidden');
    container.replaceChildren(canvas);

    const quality = qualityProfile(settings);
    const sphere = fibonacciSphere(quality.spherePoints);
    const edges = nearestEdges(sphere, 3);
    const particles = createParticles(quality.particles);
    const interaction = Number(settings.interaction ?? 0.7);
    const rotationSpeed = Number(settings.rotationSpeed ?? 0.4);
    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };

    let cssWidth = 1;
    let cssHeight = 1;
    let frameId = 0;
    let visible = true;
    let destroyed = false;
    let startTime = performance.now();

    const resize = () => {
      cssWidth = Math.max(1, container.clientWidth);
      cssHeight = Math.max(1, container.clientHeight);
      const ratio = Math.min(window.devicePixelRatio || 1, quality.pixelRatio);
      canvas.width = Math.max(1, Math.round(cssWidth * ratio));
      canvas.height = Math.max(1, Math.round(cssHeight * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const pointerMove = (event) => {
      pointer.targetX = (event.clientX / Math.max(1, window.innerWidth) - 0.5) * interaction;
      pointer.targetY = (event.clientY / Math.max(1, window.innerHeight) - 0.5) * interaction;
    };

    const drawBackgroundParticles = (elapsed) => {
      const maxRadius = Math.min(cssWidth, cssHeight) * 0.54;
      const centerX = cssWidth * 0.5;
      const centerY = cssHeight * 0.49;

      for (const particle of particles) {
        const angle = elapsed * particle.drift * 0.08 + particle.z * Math.PI * 2;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const px = particle.x * cos - particle.y * sin;
        const py = particle.x * sin + particle.y * cos;
        const depth = 0.45 + particle.z * 0.7;
        const x = centerX + px * maxRadius * depth;
        const y = centerY + py * maxRadius * 0.72 * depth;
        const pulse = 0.72 + Math.sin(elapsed * 0.7 + particle.z * 11) * 0.28;

        context.beginPath();
        context.fillStyle = `rgba(216,208,194,${particle.alpha * pulse})`;
        context.arc(x, y, particle.size * depth, 0, Math.PI * 2);
        context.fill();
      }
    };

    const drawOrb = (elapsed) => {
      pointer.x += (pointer.targetX - pointer.x) * 0.045;
      pointer.y += (pointer.targetY - pointer.y) * 0.045;

      const centerX = cssWidth * 0.5;
      const centerY = cssHeight * 0.49;
      const radius = Math.min(cssWidth, cssHeight) * (cssWidth < 750 ? 0.215 : 0.235);
      const rotX = Math.sin(elapsed * 0.28) * 0.12 + pointer.y * 0.32;
      const rotY = elapsed * rotationSpeed * 0.32 + pointer.x * 0.55;
      const rotZ = Math.sin(elapsed * 0.19) * 0.08;

      const halo = context.createRadialGradient(centerX, centerY, radius * 0.2, centerX, centerY, radius * 1.7);
      halo.addColorStop(0, 'rgba(102,252,241,0.10)');
      halo.addColorStop(0.45, 'rgba(184,176,160,0.06)');
      halo.addColorStop(1, 'rgba(7,8,10,0)');
      context.fillStyle = halo;
      context.beginPath();
      context.arc(centerX, centerY, radius * 1.7, 0, Math.PI * 2);
      context.fill();

      const orb = context.createRadialGradient(
        centerX - radius * 0.34,
        centerY - radius * 0.42,
        radius * 0.06,
        centerX,
        centerY,
        radius
      );
      orb.addColorStop(0, 'rgba(244,241,234,0.95)');
      orb.addColorStop(0.18, 'rgba(190,184,173,0.72)');
      orb.addColorStop(0.56, 'rgba(73,76,78,0.52)');
      orb.addColorStop(0.86, 'rgba(13,15,18,0.35)');
      orb.addColorStop(1, 'rgba(7,8,10,0.08)');
      context.fillStyle = orb;
      context.beginPath();
      context.arc(centerX, centerY, radius, 0, Math.PI * 2);
      context.fill();

      const projected = sphere.map((point) => {
        const rotated = rotatePoint(point, rotX, rotY, rotZ);
        const perspective = 1 + rotated.z * 0.12;
        return {
          x: centerX + rotated.x * radius * perspective,
          y: centerY + rotated.y * radius * perspective,
          z: rotated.z,
        };
      });

      context.lineWidth = 0.75;
      for (const [a, b] of edges) {
        const first = projected[a];
        const second = projected[b];
        const depth = Math.max(-1, Math.min(1, (first.z + second.z) * 0.5));
        const alpha = 0.035 + ((depth + 1) * 0.5) * 0.16;
        context.strokeStyle = `rgba(238,233,221,${alpha})`;
        context.beginPath();
        context.moveTo(first.x, first.y);
        context.lineTo(second.x, second.y);
        context.stroke();
      }

      for (const point of projected) {
        if (point.z < -0.25) continue;
        const alpha = 0.08 + Math.max(0, point.z) * 0.24;
        context.fillStyle = `rgba(102,252,241,${alpha})`;
        context.beginPath();
        context.arc(point.x, point.y, 0.65 + Math.max(0, point.z) * 0.75, 0, Math.PI * 2);
        context.fill();
      }

      const glintX = centerX - radius * 0.34 + Math.sin(elapsed * 0.21) * radius * 0.05;
      const glintY = centerY - radius * 0.4;
      const glint = context.createRadialGradient(glintX, glintY, 0, glintX, glintY, radius * 0.42);
      glint.addColorStop(0, 'rgba(255,255,255,0.28)');
      glint.addColorStop(1, 'rgba(255,255,255,0)');
      context.fillStyle = glint;
      context.beginPath();
      context.arc(glintX, glintY, radius * 0.42, 0, Math.PI * 2);
      context.fill();
    };

    const render = (now) => {
      if (destroyed) return;
      if (!visible || document.hidden) {
        frameId = requestAnimationFrame(render);
        return;
      }

      const elapsed = Math.max(0, (now - startTime) / 1000);
      context.clearRect(0, 0, cssWidth, cssHeight);
      drawBackgroundParticles(elapsed);
      drawOrb(elapsed);
      frameId = requestAnimationFrame(render);
    };

    const observer = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? true;
    }, { rootMargin: '100px' });

    observer.observe(hero);
    if (interaction > 0) window.addEventListener('pointermove', pointerMove, { passive: true });
    window.addEventListener('resize', resize, { passive: true });

    resize();
    hideFallback(hero);
    hero.classList.add('alchemist-hero--ready');
    startTime = performance.now();
    frameId = requestAnimationFrame(render);

    const destroy = () => {
      if (destroyed) return;
      destroyed = true;
      cancelAnimationFrame(frameId);
      observer.disconnect();
      window.removeEventListener('pointermove', pointerMove);
      window.removeEventListener('resize', resize);
      context.clearRect(0, 0, cssWidth, cssHeight);
      canvas.remove();
      instances.delete(hero);
    };

    instances.set(hero, { destroy });
  }

  function init(root = document) {
    const heroes = root.matches?.('[data-hero-3d]') ? [root] : [...root.querySelectorAll('[data-hero-3d]')];
    heroes.forEach((hero) => createHero(hero));
  }

  function scheduleInit(root = document) {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => init(root), { timeout: 1000 });
    } else {
      window.setTimeout(() => init(root), 100);
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
