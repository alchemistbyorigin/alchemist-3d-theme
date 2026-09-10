(() => {
  if (window.OriginHeroBound) return;
  window.OriginHeroBound = true;
  const instances = new Map();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let library;
  async function init(hero) {
    if (instances.has(hero)) return;
    let settings;
    try {settings=JSON.parse(hero.querySelector('[data-hero-settings]').textContent);}catch{return;}
    const container=hero.querySelector('[data-three-container]');
    if(!settings.enabled || reduced.matches || !container)return;
    const state={dead:false};instances.set(hero,state);
    try {
      library ||= import(window.OriginThreeModule);
      const THREE=await library;
      if(state.dead || !hero.isConnected)return;
      const scene=new THREE.Scene();
      const camera=new THREE.PerspectiveCamera(40,1,.1,50);camera.position.z=5;
      const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
      const geometry=new THREE.TorusGeometry(1,.27,20,64);
      const material=new THREE.MeshStandardMaterial({color:0xc7bdad,metalness:.7,roughness:.3});
      const mesh=new THREE.Mesh(geometry,material);mesh.rotation.x=.3;scene.add(mesh);
      scene.add(new THREE.HemisphereLight(0xfff5df,0x333333,3));
      const light=new THREE.DirectionalLight(0xffffff,4);light.position.set(2,4,5);scene.add(light);
      container.append(renderer.domElement);hero.classList.add('is-3d');
      let frame=0,visible=true;
      const resize=()=>{const width=container.clientWidth,height=container.clientHeight;if(!width||!height)return;renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<750?(settings.mobileQuality==='medium'?1.25:1):1.5));renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();};
      const sizeObserver=new ResizeObserver(resize);sizeObserver.observe(container);
      const visibility=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();});visibility.observe(hero);
      const render=time=>{frame=0;if(state.dead || !visible || document.hidden)return;mesh.rotation.y=time*.00005*Number(settings.rotationSpeed ?? .4);renderer.render(scene,camera);frame=requestAnimationFrame(render);};
      const sync=()=>{cancelAnimationFrame(frame);frame=0;if(!state.dead && visible && !document.hidden)frame=requestAnimationFrame(render);};
      document.addEventListener('visibilitychange',sync);
      state.cleanup=()=>{cancelAnimationFrame(frame);sizeObserver.disconnect();visibility.disconnect();document.removeEventListener('visibilitychange',sync);geometry.dispose();material.dispose();renderer.dispose();renderer.domElement.remove();hero.classList.remove('is-3d');};
      resize();sync();
    }catch(error){state.cleanup?.();instances.delete(hero);console.warn('3D enhancement unavailable; displaying campaign image.',error);}
  }
  const scan=(root=document)=>root.querySelectorAll('[data-hero-3d]').forEach(init);
  const dispose=hero=>{const state=instances.get(hero);if(state){state.dead=true;state.cleanup?.();instances.delete(hero);}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>scan());else scan();
  document.addEventListener('shopify:section:load',e=>scan(e.target));
  document.addEventListener('shopify:section:unload',e=>e.target.querySelectorAll('[data-hero-3d]').forEach(dispose));
  reduced.addEventListener('change',()=>{if(reduced.matches)[...instances.keys()].forEach(dispose);else scan();});
})();
