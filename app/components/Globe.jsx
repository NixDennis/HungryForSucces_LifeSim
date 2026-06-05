'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// ─── Conversie coordonate geografice → vector 3D pe sferă ────────────────────
// Formula standard pentru texturile Pământului echirectangulare (lon -180..180).
// Garantează că pinul cade exact pe coordonatele reale.
function latLonToVector3(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

// ─── Funcții de easing pentru animații cinematice ────────────────────────────
const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

function easeOutBounce(t) {
  const n1 = 7.5625, d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
  if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
  return n1 * (t -= 2.625 / d1) * t + 0.984375;
}

const GLOBE_R = 1.6;
const FOCUS_DUR = 1.8; // secunde — rotația spre oraș
const DROP_DUR = 1.1;  // secunde — căderea pinului

// target: null (rotație liberă) | { lat, lon } (focus pe oraș)
// onArrived: callback când pinul a aterizat
export default function Globe({ target, onArrived }) {
  const mountRef = useRef(null);
  const R = useRef({});     // referințe three.js (scene, globe, etc.)
  const ctrl = useRef({ phase: 'auto', arrivedFired: false });

  // ── Setup scenă (o singură dată) ──────────────────────────────────────────
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const W = mount.clientWidth || window.innerWidth;
    const H = mount.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 1000);
    camera.position.set(0, 0, 4.4);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000008, 1); // spațiu aproape negru
    mount.appendChild(renderer.domElement);

    // ── Stele (câmp de puncte în jurul scenei) ──
    const starGeo = new THREE.BufferGeometry();
    const starCount = 6000;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      // distribuție pe o sferă mare
      const r = 60 + Math.random() * 40;
      const t = Math.random() * Math.PI * 2;
      const p = Math.acos(2 * Math.random() - 1);
      starPos[i * 3]     = r * Math.sin(p) * Math.cos(t);
      starPos[i * 3 + 1] = r * Math.sin(p) * Math.sin(t);
      starPos[i * 3 + 2] = r * Math.cos(p);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, sizeAttenuation: true })
    );
    scene.add(stars);

    // ── Iluminare: soare (zi/noapte) + ambianță slabă (noaptea albăstruie) ──
    // Soarele bate dinspre dreapta-față → emisfera spre cameră e clar luminată,
    // partea opusă rămâne în umbră (efect zi/noapte).
    const sun = new THREE.DirectionalLight(0xfff4e6, 1.7);
    sun.position.set(3, 1.5, 5);
    scene.add(sun);
    // Ambianță albăstruie slabă: partea de noapte e vizibilă, nu complet neagră
    scene.add(new THREE.AmbientLight(0x3a4d75, 0.5));

    // ── Grupul globului (se rotește) ──
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    const loader = new THREE.TextureLoader();
    const tex  = loader.load('/textures/earth_atmos_2048.jpg');
    const spec = loader.load('/textures/earth_specular_2048.jpg');
    const norm = loader.load('/textures/earth_normal_2048.jpg');
    if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;

    const earthMat = new THREE.MeshPhongMaterial({
      map: tex,
      specularMap: spec,
      normalMap: norm,
      specular: new THREE.Color(0x333333),
      shininess: 15,
    });
    const earth = new THREE.Mesh(new THREE.SphereGeometry(GLOBE_R, 64, 64), earthMat);
    globeGroup.add(earth);

    // ── Nori (strat transparent, ușor mai mare) ──
    const cloudTex = loader.load('/textures/earth_clouds_1024.png');
    const clouds = new THREE.Mesh(
      new THREE.SphereGeometry(GLOBE_R * 1.012, 64, 64),
      new THREE.MeshPhongMaterial({ map: cloudTex, transparent: true, opacity: 0.4, depthWrite: false })
    );
    globeGroup.add(clouds);

    // ── Atmosferă (halou albăstrui în jurul globului) ──
    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(GLOBE_R * 1.06, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0x3a7bd5, transparent: true, opacity: 0.12, side: THREE.BackSide })
    );
    globeGroup.add(atmosphere);

    // orientare inițială: un unghi plăcut
    globeGroup.rotation.y = -0.5;

    R.current = { scene, camera, renderer, globeGroup, earth, clouds, mount };

    // ── Bucla de animație (timing manual, fără THREE.Clock deprecat) ──
    let raf;
    let lastT = performance.now();
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = Math.min((now - lastT) / 1000, 0.05); // clamp la lag
      lastT = now;
      const c = ctrl.current;

      // rotație liberă (până la focus)
      if (c.phase === 'auto') {
        globeGroup.rotation.y += dt * 0.12;
        clouds.rotation.y += dt * 0.02;
      }

      // rotație lină spre oraș
      if (c.phase === 'focusing') {
        c.elapsed = (c.elapsed || 0) + dt;
        const k = Math.min(c.elapsed / FOCUS_DUR, 1);
        const e = easeInOutCubic(k);
        globeGroup.quaternion.slerpQuaternions(c.startQuat, c.targetQuat, e);
        if (k >= 1) {
          c.phase = 'dropping';
          c.elapsed = 0;
          if (c.pin) c.pin.visible = true;
        }
      }

      // căderea pinului cu bounce
      if (c.phase === 'dropping' && c.pin) {
        c.elapsed = (c.elapsed || 0) + dt;
        const k = Math.min(c.elapsed / DROP_DUR, 1);
        const drop = easeOutBounce(k);                 // 0 → 1 cu bounce
        const extra = (1 - drop) * 0.9;                // înălțime suplimentară
        c.pin.position.copy(c.normal).multiplyScalar(GLOBE_R + extra);
        const s = 0.4 + 0.6 * Math.min(k * 1.4, 1);
        c.pin.scale.setScalar(s);
        if (k >= 1) {
          c.phase = 'arrived';
          c.elapsed = 0;
          if (!c.arrivedFired) { c.arrivedFired = true; onArrived && onArrived(); }
        }
      }

      // puls continuu al pinului după aterizare
      if (c.phase === 'arrived' && c.pinHead) {
        c.elapsed = (c.elapsed || 0) + dt;
        const pulse = 1 + Math.sin(c.elapsed * 4) * 0.18;
        c.pinHead.scale.setScalar(pulse);
        if (c.pinGlow) c.pinGlow.material.opacity = 0.35 + Math.sin(c.elapsed * 4) * 0.2;
      }

      renderer.render(scene, camera);
    };
    animate();

    // ── Resize ──
    const onResize = () => {
      const w = mount.clientWidth || window.innerWidth;
      const h = mount.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // ── Cleanup ──
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, [onArrived]);

  // ── Reacție la selectarea orașului (target) ───────────────────────────────
  useEffect(() => {
    if (!target) return;
    const r = R.current;
    if (!r.globeGroup) return;
    const c = ctrl.current;

    // vectorul local al orașului pe sferă (normalizat)
    const normal = latLonToVector3(target.lat, target.lon, 1).normalize();

    // orientarea țintă: aducem punctul orașului spre cameră (+Z)
    const targetQuat = new THREE.Quaternion().setFromUnitVectors(
      normal, new THREE.Vector3(0, 0, 1)
    );

    // ── Construiește pinul (ascuns până la aterizare) ──
    const pin = new THREE.Group();
    const pinColor = 0xff3b6b;

    // corp conic (vârful spre suprafață)
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.05, 0.16, 24),
      new THREE.MeshPhongMaterial({ color: pinColor, emissive: 0x661122, shininess: 40 })
    );
    cone.rotation.x = Math.PI;      // vârful în jos (spre suprafață)
    cone.position.y = 0.08;         // vârful atinge suprafața (y=0 local)
    pin.add(cone);

    // capul sferic (pulsează)
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 20, 20),
      new THREE.MeshPhongMaterial({ color: pinColor, emissive: 0x882233, shininess: 60 })
    );
    head.position.y = 0.17;
    pin.add(head);

    // halou luminos în jurul capului
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 20, 20),
      new THREE.MeshBasicMaterial({ color: pinColor, transparent: true, opacity: 0.35 })
    );
    glow.position.y = 0.17;
    pin.add(glow);

    // orientează pinul de-a lungul normalei (stă „în picioare" pe glob)
    pin.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    pin.position.copy(normal).multiplyScalar(GLOBE_R + 0.9);
    pin.visible = false;
    r.globeGroup.add(pin);

    // pornește secvența de focus
    c.startQuat = r.globeGroup.quaternion.clone();
    c.targetQuat = targetQuat;
    c.normal = normal;
    c.pin = pin;
    c.pinHead = head;
    c.pinGlow = glow;
    c.elapsed = 0;
    c.arrivedFired = false;
    c.phase = 'focusing';
  }, [target]);

  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />;
}
