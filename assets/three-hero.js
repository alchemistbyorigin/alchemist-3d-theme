(() => {
  "use strict";

  const CONFIG = window.AlchemistHeroConfig || {};

  function loadThree() {
    return new Promise((resolve, reject) => {
      if (window.THREE) {
        resolve(window.THREE);
        return;
      }

      const script = document.createElement("script");

      script.src =
        "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.min.js";

      script.async = true;

      script.onload = () => {
        if (window.THREE) {
          resolve(window.THREE);
        } else {
          reject(new Error("Three.js failed to initialize."));
        }
      };

      script.onerror = () => {
        reject(new Error("Three.js failed to load."));
      };

      document.head.appendChild(script);
    });
  }

  function createHero(THREE, hero) {
    const container = hero.querySelector("[data-three-container]");

    if (!container) return;

    const sectionId = hero.dataset.sectionId;
    const settings = CONFIG[sectionId] || {};

    if (settings.enabled === false) {
      return;
    }

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      42,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );

    camera.position.set(0, 0, 5);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });

    renderer.setPixelRatio(
      Math.min(
        window.devicePixelRatio || 1,
        window.innerWidth < 750 ? 1.25 : 1.75
      )
    );

    renderer.setSize(
      container.clientWidth,
      container.clientHeight,
      false
    );

    renderer.outputColorSpace = THREE.SRGBColorSpace;

    container.appendChild(renderer.domElement);

    const group = new THREE.Group();

    scene.add(group);

    /*
     * Main object
     */

    const geometry = new THREE.IcosahedronGeometry(1.35, 5);

    const material = new THREE.MeshPhysicalMaterial({
      color: 0xb8b0a0,
      metalness: 0.85,
      roughness: 0.22,
      clearcoat: 1,
      clearcoatRoughness: 0.12
    });

    const object = new THREE.Mesh(geometry, material);

    group.add(object);

    /*
     * Wireframe shell
     */

    const wireGeometry = new THREE.IcosahedronGeometry(1.39, 3);

    const wireMaterial = new THREE.MeshBasicMaterial({
      color: 0xeee9dd,
      wireframe: true,
      transparent: true,
      opacity: 0.08
    });

    const wire = new THREE.Mesh(wireGeometry, wireMaterial);

    group.add(wire);

    /*
     * Atmospheric particles
     */

    const particleCount =
      window.innerWidth < 750 ? 700 : 1400;

    const particleGeometry = new THREE.BufferGeometry();

    const positions = new Float32Array(
      particleCount * 3
    );

    for (let i = 0; i < particleCount; i++) {
      const radius = 3.5 + Math.random() * 4;

      const theta = Math.random() * Math.PI * 2;

      const phi =
        Math.acos(2 * Math.random() - 1);

      positions[i * 3] =
        radius *
        Math.sin(phi) *
        Math.cos(theta);

      positions[i * 3 + 1] =
        radius *
        Math.cos(phi);

      positions[i * 3 + 2] =
        radius *
        Math.sin(phi) *
        Math.sin(theta);
    }

    particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );

    const particleMaterial =
      new THREE.PointsMaterial({
        color: 0xd8d0c2,
        size: 0.018,
        transparent: true,
        opacity: 0.55,
        depthWrite: false
      });

    const particles = new THREE.Points(
      particleGeometry,
      particleMaterial
    );

    scene.add(particles);

    /*
     * Lights
     */

    const ambient = new THREE.AmbientLight(
      0xffffff,
      1.2
    );

    scene.add(ambient);

    const keyLight =
      new THREE.DirectionalLight(
        0xfff4df,
        4
      );

    keyLight.position.set(3, 4, 5);

    scene.add(keyLight);

    const rimLight =
      new THREE.DirectionalLight(
        0x9da9b8,
        3
      );

    rimLight.position.set(-4, 1, -3);

    scene.add(rimLight);

    const pointLight =
      new THREE.PointLight(
        0xffffff,
        18,
        8
      );

    pointLight.position.set(0, 1, 3);

    scene.add(pointLight);

    /*
     * Interaction
     */

    const mouse = {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0
    };

    const interaction =
      Number(settings.interaction ?? 0.7);

    window.addEventListener(
      "pointermove",
      (event) => {
        mouse.targetX =
          (event.clientX / window.innerWidth - 0.5) *
          interaction;

        mouse.targetY =
          (event.clientY / window.innerHeight - 0.5) *
          interaction;
      },
      { passive: true }
    );

    /*
     * Resize
     */

    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;

      if (!width || !height) return;

      camera.aspect = width / height;

      camera.updateProjectionMatrix();

      renderer.setPixelRatio(
        Math.min(
          window.devicePixelRatio || 1,
          window.innerWidth < 750 ? 1.25 : 1.75
        )
      );

      renderer.setSize(width, height, false);
    };

    window.addEventListener(
      "resize",
      resize,
      { passive: true }
    );

    resize();

    /*
     * Animation
     */

    const clock = new THREE.Clock();

    const speed =
      Number(settings.rotationSpeed ?? 0.4);

    function animate() {
      requestAnimationFrame(animate);

      const elapsed =
        clock.getElapsedTime();

      mouse.x +=
        (mouse.targetX - mouse.x) * 0.035;

      mouse.y +=
        (mouse.targetY - mouse.y) * 0.035;

      group.rotation.y =
        elapsed * speed * 0.18 +
        mouse.x * 0.35;

      group.rotation.x =
        Math.sin(elapsed * 0.35) * 0.08 +
        mouse.y * 0.25;

      object.rotation.z =
        Math.sin(elapsed * 0.22) * 0.12;

      wire.rotation.copy(object.rotation);

      particles.rotation.y =
        elapsed * 0.015;

      particles.rotation.x =
        Math.sin(elapsed * 0.08) * 0.08;

      renderer.render(scene, camera);
    }

    animate();

    hero.classList.add("alchemist-hero--ready");
  }

  async function init() {
    const heroes =
      document.querySelectorAll("[data-hero-3d]");

    if (!heroes.length) return;

    try {
      const THREE = await loadThree();

      heroes.forEach((hero) => {
        createHero(THREE, hero);
      });
    } catch (error) {
      console.error(
        "Alchemist 3D Hero:",
        error
      );

      heroes.forEach((hero) => {
        const fallback =
          hero.querySelector(
            ".alchemist-hero__fallback"
          );

        if (fallback) {
          fallback.style.opacity = "1";
        }
      });
    }
  }

  if (
    document.readyState === "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init
    );
  } else {
    init();
  }
})();