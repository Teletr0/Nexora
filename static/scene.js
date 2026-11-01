// Three.js — feedback visual real (não decorativo).
// Sucesso: partículas convergem. Erro: onda vermelha.
let scene, camera, renderer, particles, bursts = [];
let THREE = null;

export async function initScene() {
  try {
    THREE = await import("three");
  } catch {
    console.warn("Three.js não carregou — seguindo sem 3D (progressive enhancement)");
    return;
  }
  const canvas = document.getElementById("scene");
  if (!canvas) return;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, .1, 1000);
  camera.position.z = 30;
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  const count = innerWidth < 700 ? 250 : 700;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count*3; i++) pos[i] = (Math.random() - .5) * 80;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    size: .4, color: 0x70f0c1, transparent: true, opacity: .4
  });
  particles = new THREE.Points(geo, mat);
  scene.add(particles);

  addEventListener("resize", () => {
    camera.aspect = innerWidth/innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  animate();
}

function animate() {
  requestAnimationFrame(animate);
  if (!particles) return;
  particles.rotation.y += .0004;

  // Anima explosões em andamento
  bursts = bursts.filter(b => {
    b.t += .03;
    b.points.scale.setScalar(1 + b.t * 4);
    b.points.material.opacity = Math.max(0, .8 - b.t);
    if (b.t > 1) { scene.remove(b.points); b.points.geometry.dispose(); return false; }
    return true;
  });

  renderer.render(scene, camera);
}

export function celebrate() {
  if (!scene || !THREE) return;
  const count = 100;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count*3; i++) pos[i] = (Math.random() - .5) * 4;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    size: .6, color: 0x70f0c1, transparent: true, opacity: .8
  });
  const points = new THREE.Points(geo, mat);
  scene.add(points);
  bursts.push({ points, t: 0 });
}

export function fail() {
  if (!particles) return;
  const orig = particles.material.color.getHex();
  particles.material.color.setHex(0xff8585);
  setTimeout(() => particles.material.color.setHex(orig), 500);
}
