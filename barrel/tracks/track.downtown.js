// barrel/tracks/track.downtown.js
// NFS Underground-style night city track. Procedural — no GLTF dep.
// Builds: road spline, road mesh, barriers, buildings, streetlights, neon signs, start/finish line.

import * as THREE from 'three';

const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const tmpC = new THREE.Vector3();
const tmpD = new THREE.Vector3();

export function build(ctx, entry) {
  const group = new THREE.Group();
  group.name = 'track-downtown';
  const points = entry.spline.points.map(p => new THREE.Vector3(...p));
  const width = entry.spline.width;
  const curve = new THREE.CatmullRomCurve3(points, true);

  // --- ROAD MESH ---
  const segments = 240;
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = curve.getPoint(t);
    const tan = curve.getTangent(t);
    const side = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
    const left  = tmpA.copy(p).addScaledVector(side,  width / 2);
    const right = tmpB.copy(p).addScaledVector(side, -width / 2);
    positions.push(left.x, left.y, left.z);
    positions.push(right.x, right.y, right.z);
    uvs.push(0, t * 40);
    uvs.push(1, t * 40);
  }
  for (let i = 0; i < segments; i++) {
    const a = i * 2, b = i * 2 + 1, c = (i + 1) * 2, d = (i + 1) * 2 + 1;
    indices.push(a, c, b,  b, c, d);
  }
  const roadGeo = new THREE.BufferGeometry();
  roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  roadGeo.setIndex(indices);
  roadGeo.computeVertexNormals();
  const roadMat = new THREE.MeshStandardMaterial({
    color: '#0a0a0e', roughness: 0.85, metalness: 0.1
  });
  const road = new THREE.Mesh(roadGeo, roadMat);
  road.receiveShadow = true;
  group.add(road);

  // Lane markings (dashed center line)
  const dashMat = new THREE.MeshBasicMaterial({ color: '#ffd23f' });
  for (let i = 0; i < segments; i += 4) {
    const t = i / segments;
    const p = curve.getPoint(t);
    const dash = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, 1.5), dashMat);
    dash.position.copy(p); dash.position.y = 0.02;
    const tan = curve.getTangent(t);
    dash.lookAt(tmpC.copy(p).add(tan));
    group.add(dash);
  }

  // Barriers (both sides) - OPTIMIZED: Use InstancedMesh
  const barrierMat = new THREE.MeshStandardMaterial({
    color: '#1a1a2a', emissive: '#ff4d2e', emissiveIntensity: 0.5,
    metalness: 0.6, roughness: 0.4
  });
  const barrierGeo = new THREE.BoxGeometry(0.4, 0.8, 2);
  const barrierCount = Math.floor(segments / 2) + 1;
  const barriers = new THREE.InstancedMesh(barrierGeo, barrierMat, barrierCount * 2);
  const barrierMatrix = new THREE.Matrix4();
  
  let bIdx = 0;
  for (let i = 0; i <= segments; i += 2) {
    const t = i / segments;
    const p = curve.getPoint(t);
    const tan = curve.getTangent(t);
    const side = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
    for (const sign of [1, -1]) {
      const bPos = tmpC.copy(p).addScaledVector(side, sign * (width / 2 + 0.3));
      barrierMatrix.setPosition(bPos.x, 0.4, bPos.z);
      barrierMatrix.lookAt(bPos.x, 0.4, bPos.z + tan.x, bPos.z + tan.z);
      // Reset rotation then apply proper orientation
      const q = new THREE.Quaternion();
      q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tan.normalize());
      barrierMatrix.makeRotationFromQuaternion(q);
      barrierMatrix.setPosition(bPos.x, 0.4, bPos.z);
      barriers.setMatrixAt(bIdx++, barrierMatrix);
    }
  }
  group.add(barriers);

  // Start/finish line (checkered)
  const checkerTex = makeCheckerTexture();
  const finishMat = new THREE.MeshStandardMaterial({ map: checkerTex, roughness: 0.6 });
  const finish = new THREE.Mesh(new THREE.PlaneGeometry(width, 2), finishMat);
  finish.rotation.x = -Math.PI / 2;
  const startPos = curve.getPoint(0);
  const startTan = curve.getTangent(0);
  finish.position.copy(startPos); finish.position.y = 0.03;
  finish.lookAt(tmpC.copy(startPos).add(startTan));
  finish.rotateX(-Math.PI / 2);
  group.add(finish);

  // --- BUILDINGS ---
  const buildingMat = new THREE.MeshStandardMaterial({ color: '#0a0c14', metalness: 0.4, roughness: 0.7 });
  const windowMat = new THREE.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: 0.7 });
  for (let i = 0; i < 80; i++) {
    const t = Math.random();
    const p = curve.getPoint(t);
    const tan = curve.getTangent(t);
    const side = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
    const offset = (Math.random() > 0.5 ? 1 : -1) * (width / 2 + 8 + Math.random() * 40);
    const pos = tmpC.copy(p).addScaledVector(side, offset);
    const h = 20 + Math.random() * 60;
    const w = 8 + Math.random() * 12;
    const d = 8 + Math.random() * 12;
    const building = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), buildingMat);
    building.position.set(pos.x, h / 2, pos.z);
    building.castShadow = true;
    building.receiveShadow = true;
    group.add(building);
    // Window emissive strips
    if (Math.random() > 0.4) {
      const windows = new THREE.Mesh(new THREE.BoxGeometry(w * 1.01, h * 0.6, d * 1.01), windowMat);
      windows.position.set(pos.x, h * 0.55, pos.z);
      group.add(windows);
    }
  }

  // --- STREETLIGHTS (OPTIMIZED: Only 8 lights total instead of 80) ---
  const poleMat = new THREE.MeshStandardMaterial({ color: '#1a1a1a', metalness: 0.8, roughness: 0.4 });
  const lampMat = new THREE.MeshStandardMaterial({
    color: '#ffd23f', emissive: '#ffd23f', emissiveIntensity: 2.5
  });
  
  // Use instanced meshes for poles and lamps (performance)
  const poleGeo = new THREE.CylinderGeometry(0.1, 0.15, 6);
  const lampGeo = new THREE.SphereGeometry(0.3, 8, 8);
  const totalPoles = 40; // Keep visual poles
  const poles = new THREE.InstancedMesh(poleGeo, poleMat, totalPoles * 2);
  const lamps = new THREE.InstancedMesh(lampGeo, lampMat, totalPoles * 2);
  const poleMatrix = new THREE.Matrix4();
  
  // Only add actual lights at strategic positions (every 10th pole)
  const lightPositions = [];
  
  for (let i = 0; i < totalPoles; i++) {
    const t = i / totalPoles;
    const p = curve.getPoint(t);
    const tan = curve.getTangent(t);
    const side = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
    for (const sign of [1, -1]) {
      const pos = tmpC.copy(p).addScaledVector(side, sign * (width / 2 + 1.5));
      
      // Pole
      poleMatrix.setPosition(pos.x, 3, pos.z);
      poles.setMatrixAt(i * 2 + (sign === 1 ? 0 : 1), poleMatrix);
      
      // Lamp
      poleMatrix.setPosition(pos.x, 6, pos.z);
      lamps.setMatrixAt(i * 2 + (sign === 1 ? 0 : 1), poleMatrix);
      
      // Only create PointLight every 10th position (8 lights max)
      if (i % 10 === 0 && sign === 1) {
        lightPositions.push({ x: pos.x, y: 6, z: pos.z });
      }
    }
  }
  group.add(poles);
  group.add(lamps);
  
  // Add only 8 strategic point lights (was 80!)
  lightPositions.forEach((lp, idx) => {
    const colors = ['#ffd23f', '#ff4d2e', '#00e5ff', '#ff3d5a'];
    const light = new THREE.PointLight(colors[idx % colors.length], 1.5, 50);
    light.position.set(lp.x, lp.y, lp.z);
    group.add(light);
  });

  // --- NEON SIGNS ---
  const neonColors = ['#ff4d2e', '#00e5ff', '#ffd23f', '#ff3d5a'];
  for (let i = 0; i < 30; i++) {
    const t = Math.random();
    const p = curve.getPoint(t);
    const tan = curve.getTangent(t);
    const side = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
    const offset = (Math.random() > 0.5 ? 1 : -1) * (width / 2 + 15 + Math.random() * 30);
    const pos = tmpC.copy(p).addScaledVector(side, offset);
    const color = neonColors[Math.floor(Math.random() * neonColors.length)];
    const neonMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 });
    const h = 4 + Math.random() * 6;
    const w = 6 + Math.random() * 8;
    const sign = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.3), neonMat);
    sign.position.set(pos.x, 10 + Math.random() * 30, pos.z);
    sign.lookAt(0, sign.position.y, 0);
    group.add(sign);
  }

  // --- LIGHTING ---
  const ambient = new THREE.AmbientLight('#1a1a2e', 0.6);
  group.add(ambient);
  const moon = new THREE.DirectionalLight('#ff4d2e', 0.4);
  moon.position.set(-50, 80, -30);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  moon.shadow.camera.left = -150;
  moon.shadow.camera.right = 150;
  moon.shadow.camera.top = 150;
  moon.shadow.camera.bottom = -150;
  group.add(moon);

  // Skybox color set on scene via renderer; group handles everything else.
  ctx.renderer.addObject(group);
  return { group, curve, startPos: startPos.clone(), startTan: startTan.clone() };
}

function makeCheckerTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 32;
  const g = c.getContext('2d');
  for (let i = 0; i < 16; i++) {
    for (let j = 0; j < 2; j++) {
      g.fillStyle = (i + j) % 2 === 0 ? '#ffffff' : '#0a0a0a';
      g.fillRect(i * 16, j * 16, 16, 16);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 1);
  return tex;
}

export function getStartPosition(built) {
  return built.startPos;
}

export function getCheckpoints(built) {
  // Derive checkpoint positions along curve for lap detection
  const points = [];
  const segs = 16;
  for (let i = 0; i < segs; i++) {
    points.push(built.curve.getPoint(i / segs));
  }
  return points;
}

export default { build, getStartPosition, getCheckpoints };
