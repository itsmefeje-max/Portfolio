
import * as THREE from 'three';
import { TimeEngine } from './TimeEngine.js';
import { GeoService } from './GeoService.js';
import { ISSService } from './ISSService.js';
import { EarthRenderer } from './EarthRenderer.js';
import { CameraDirector } from './CameraDirector.js';
import { HUDLayer } from './HUDLayer.js';

class ArcadeApp {
  constructor() {
    this.container = document.getElementById('sim-canvas');
    if (!this.container) {
        console.error("Canvas container #sim-canvas not found!");
        return;
    }

    this.width = window.innerWidth;
    this.height = window.innerHeight;

    // Services
    this.timeEngine = new TimeEngine();
    this.geoService = new GeoService();
    this.issService = new ISSService();
    this.hud = new HUDLayer();

    // Scene Setup
    this.scene = new THREE.Scene();

    // Starfield
    this.createStars();

    this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 0.1, 1000);
    this.camera.position.set(0, 0, 40);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.container.appendChild(this.renderer.domElement);

    // Components
    this.earthRenderer = new EarthRenderer(this.scene);
    this.cameraDirector = new CameraDirector(this.camera, this.renderer.domElement);

    // Markers
    this.issMarker = this.createMarker(0xff3333, 0.15); // Red
    this.userMarker = this.createMarker(0x33ff33, 0.1); // Green

    // Add markers to Earth Group so they rotate automatically
    this.earthRenderer.group.add(this.issMarker);
    this.earthRenderer.group.add(this.userMarker);

    // Create Orbit Lines
    this.createOrbitLines();

    this.init();
  }

  createStars() {
    const geometry = new THREE.BufferGeometry();
    const count = 3000;
    const posArray = new Float32Array(count * 3);
    for(let i=0; i<count*3; i++) {
        posArray[i] = (Math.random() - 0.5) * 800; // Spread far
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const material = new THREE.PointsMaterial({ size: 0.7, color: 0xffffff, transparent: true, opacity: 0.8 });
    const stars = new THREE.Points(geometry, material);
    this.scene.add(stars);
  }

  createMarker(color, size) {
    return new THREE.Mesh(
      new THREE.SphereGeometry(size, 16, 16),
      new THREE.MeshBasicMaterial({ color: color })
    );
  }

  createOrbitLines() {
    // Past Trail (Yellow/Gold)
    const trailMat = new THREE.LineBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.6 });
    const trailGeo = new THREE.BufferGeometry();
    this.trailLine = new THREE.Line(trailGeo, trailMat);
    this.earthRenderer.group.add(this.trailLine);

    // Future Prediction (Cyan/Blue)
    const predMat = new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.4 });
    const predGeo = new THREE.BufferGeometry();
    this.predLine = new THREE.Line(predGeo, predMat);
    this.earthRenderer.group.add(this.predLine);
  }

  async init() {
    this.hud.setStatus("Systems Online");

    // Start Services
    this.issService.start();

    try {
        await this.geoService.fetchLocation();
        this.hud.updateUser(this.geoService.getLocation());
    } catch (e) {
        console.warn("GeoService failed", e);
    }

    // Event Listeners
    window.addEventListener('resize', () => this.onResize());

    // UI Buttons
    const btnFree = document.getElementById('btn-mode-free');
    if (btnFree) btnFree.addEventListener('click', () => this.cameraDirector.setMode('FREE'));

    const btnISS = document.getElementById('btn-mode-iss');
    if (btnISS) btnISS.addEventListener('click', () => this.cameraDirector.setMode('ISS'));

    const btnUser = document.getElementById('btn-mode-user');
    if (btnUser) btnUser.addEventListener('click', () => {
        const loc = this.geoService.getLocation();
        if (loc) {
             const localPos = this.latLonToVector3(loc.lat, loc.lon, 10);
             const worldPos = localPos.clone().applyMatrix4(this.earthRenderer.group.matrixWorld);
             this.cameraDirector.setMode('USER', worldPos);
        }
    });

    this.animate();
  }

  onResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  updateOrbitPath() {
    const history = this.issService.getHistory();
    if (history.length < 2) return;

    // --- TRAIL ---
    const trailPoints = [];
    for (const h of history) {
        const r = 10 + (h.alt / 6371) * 10;
        trailPoints.push(this.latLonToVector3(h.lat, h.lon, r));
    }
    this.trailLine.geometry.setFromPoints(trailPoints);

    // --- PREDICTION ---
    // Use last 2 points to determine orbital plane and velocity vector
    const last = history[history.length - 1];
    const prev = history[history.length - 2];

    // Convert to vectors
    const rLast = 10 + (last.alt/6371)*10;
    const rPrev = 10 + (prev.alt/6371)*10;

    const vLast = this.latLonToVector3(last.lat, last.lon, rLast);
    const vPrev = this.latLonToVector3(prev.lat, prev.lon, rPrev);

    // Direction
    const velDir = vLast.clone().sub(vPrev).normalize();

    // Normal to orbital plane = Pos x Vel
    const normal = vLast.clone().cross(velDir).normalize();

    // Propagation parameters
    const predictDuration = 45 * 60; // 45 minutes
    const steps = 60;
    const dt = predictDuration / steps;

    // Orbital angular speed: 2PI / Period. Period ~ 93 mins = 5580s.
    const orbitalSpeed = (2 * Math.PI) / 5580;

    // Earth rotation speed: 2PI / 86164
    const earthSpeed = (2 * Math.PI) / 86164;

    const predPoints = [vLast];

    for(let i=1; i<=steps; i++) {
        const t = i * dt;
        const orbitAngle = orbitalSpeed * t;
        const earthAngle = earthSpeed * t;

        // 1. Orbital motion in Inertial Frame
        const pOrbital = vLast.clone().applyAxisAngle(normal, orbitAngle);

        // 2. Adjust for Earth Rotation (Ground Track)
        pOrbital.applyAxisAngle(new THREE.Vector3(0, 1, 0), -earthAngle);

        predPoints.push(pOrbital);
    }

    this.predLine.geometry.setFromPoints(predPoints);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const now = this.timeEngine.getUTCTime();
    const gmst = this.timeEngine.getGMST(now);
    const sunPos = this.timeEngine.getSunPosition(now);

    // Update Earth Rotation & Sun
    this.earthRenderer.update(sunPos, gmst);

    // Update Markers & Path
    const issData = this.issService.getPosition();
    if (issData) {
        const r = 10 + (issData.alt / 6371) * 10;
        const pos = this.latLonToVector3(issData.lat, issData.lon, r);
        this.issMarker.position.copy(pos);

        this.updateOrbitPath();
    }

    const userData = this.geoService.getLocation();
    if (userData && userData.lat) {
        const pos = this.latLonToVector3(userData.lat, userData.lon, 10);
        this.userMarker.position.copy(pos);
    }

    this.hud.updateTime(now);
    this.hud.updateISS(issData);

    // Camera Update
    const issWorldPos = new THREE.Vector3();
    this.issMarker.getWorldPosition(issWorldPos);
    this.cameraDirector.update(issWorldPos);

    this.renderer.render(this.scene, this.camera);
  }

  latLonToVector3(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);

    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = (radius * Math.sin(phi) * Math.sin(theta));
    const y = (radius * Math.cos(phi));

    return new THREE.Vector3(x, y, z);
  }
}

// Start App
new ArcadeApp();
