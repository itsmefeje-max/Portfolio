
import * as THREE from 'three';
import { ISSService } from './ISSService.js';
import { GeoService } from './GeoService.js';
import { HUDLayer } from './HUDLayer.js';

export class OrbitalEarthSimulation {
  constructor(system) {
    this.system = system;
    this.renderer = system.renderer;
    this.scene = system.scene;
    this.camera = system.camera;
    this.earthGroup = system.earthRenderer.group;
    this.cameraDirector = system.cameraDirector;

    // Services
    this.issService = new ISSService();
    this.geoService = new GeoService();
    this.hud = null; // Initialize on mount

    // State
    this.isMounted = false;

    // Objects
    this.issMarker = null;
    this.userMarker = null;
    this.trailLine = null;
    this.predLine = null;

    // Create objects once
    this.createObjects();
  }

  createObjects() {
    // ISS Marker (Red)
    this.issMarker = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xff3333 })
    );

    // User Marker (Green)
    this.userMarker = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x33ff33 })
    );

    // Orbit Lines
    const trailMat = new THREE.LineBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.6 });
    const trailGeo = new THREE.BufferGeometry();
    this.trailLine = new THREE.Line(trailGeo, trailMat);

    const predMat = new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.4 });
    const predGeo = new THREE.BufferGeometry();
    this.predLine = new THREE.Line(predGeo, predMat);
  }

  mount() {
    if (this.isMounted) return;
    this.isMounted = true;
    console.log("Mounting Orbital Earth Simulation");

    // 1. Inject UI
    const uiLayer = document.getElementById('sim-content-layer');
    if (uiLayer) {
        uiLayer.innerHTML = `
          <!-- Top Right -->
          <div class="hud-panel hud-top-right">
            <div class="data-row">
              <span class="data-label">OPERATOR</span>
              <span class="data-value">GUEST</span>
            </div>
            <div class="data-row">
              <span class="data-label">LOCATION</span>
              <span class="data-value" id="user-loc">SCANNING...</span>
            </div>
            <div class="data-row">
                <span class="data-label">UTC TIME</span>
                <span class="data-value" id="utc-time">--:--:--</span>
            </div>
          </div>

          <!-- Bottom Group (Unified Sheet on Mobile) -->
          <div class="hud-bottom-group">
            <!-- Bottom Left -->
            <div class="hud-panel hud-bottom-left">
              <div style="margin-bottom:8px; color:#f472b6; font-weight:700; letter-spacing:0.05em; font-size:0.8rem;">ISS TELEMETRY</div>
              <div class="data-row">
                <span class="data-label">LATITUDE</span>
                <span class="data-value" id="iss-lat">0.0000</span>
              </div>
              <div class="data-row">
                <span class="data-label">LONGITUDE</span>
                <span class="data-value" id="iss-lon">0.0000</span>
              </div>
              <div class="data-row">
                <span class="data-label">ALTITUDE</span>
                <span class="data-value" id="iss-alt">0.00 km</span>
              </div>
              <div class="data-row">
                <span class="data-label">VELOCITY</span>
                <span class="data-value" id="iss-vel">0 km/h</span>
              </div>
               <div class="status-bar" id="status-msg">SYSTEM ONLINE</div>
            </div>

            <!-- Bottom Right -->
            <div class="hud-panel hud-bottom-right">
              <div class="data-label" style="width:100%; text-align:right; margin-bottom:5px; opacity:0.7;">CAMERA CONTROL</div>
              <button id="btn-mode-free" class="btn-control">FREE ORBIT</button>
              <button id="btn-mode-iss" class="btn-control">TRACK ISS</button>
              <button id="btn-mode-user" class="btn-control">LOCATE USER</button>
            </div>
          </div>
        `;
    }

    // 2. Initialize HUD (now that elements exist)
    this.hud = new HUDLayer();

    // 3. Add Objects to Earth Group
    this.earthGroup.add(this.issMarker);
    this.earthGroup.add(this.userMarker);
    this.earthGroup.add(this.trailLine);
    this.earthGroup.add(this.predLine);

    // 4. Start Services
    this.issService.start();
    this.geoService.fetchLocation().then(() => {
        // Just triggers internal state update, we poll it in update()
    });

    // 5. Setup Camera
    this.cameraDirector.setMode('ISS');

    // 6. Bind UI Buttons
    this.bindEvents();
  }

  bindEvents() {
    const btnFree = document.getElementById('btn-mode-free');
    if (btnFree) btnFree.addEventListener('click', () => this.cameraDirector.setMode('FREE'));

    const btnISS = document.getElementById('btn-mode-iss');
    if (btnISS) btnISS.addEventListener('click', () => this.cameraDirector.setMode('ISS'));

    const btnUser = document.getElementById('btn-mode-user');
    if (btnUser) btnUser.addEventListener('click', () => {
        const loc = this.geoService.getLocation();
        if (loc) {
             const localPos = this.latLonToVector3(loc.lat, loc.lon, 10);
             const worldPos = localPos.clone().applyMatrix4(this.earthGroup.matrixWorld);
             this.cameraDirector.setMode('USER', worldPos);
        }
    });
  }

  unmount() {
    if (!this.isMounted) return;
    this.isMounted = false;
    console.log("Unmounting Orbital Earth Simulation");

    // 1. Remove Objects
    this.earthGroup.remove(this.issMarker);
    this.earthGroup.remove(this.userMarker);
    this.earthGroup.remove(this.trailLine);
    this.earthGroup.remove(this.predLine);

    // 2. Stop Services
    // ISSService doesn't have stop(), but we stop calling update()
    // Ideally we should stop the interval inside ISSService if exists
    // But for now, just letting it run in background is fine, or add stop() later.

    // 3. Clear UI
    const uiLayer = document.getElementById('sim-content-layer');
    if (uiLayer) uiLayer.innerHTML = '';

    this.hud = null;
  }

  update(time) {
    if (!this.isMounted) return;

    // HUD Updates
    if (this.hud) {
        this.hud.updateTime(time);

        const loc = this.geoService.getLocation();
        this.hud.updateUser(loc);
    }

    // ISS Position
    const issData = this.issService.getPosition();
    if (issData) {
        const r = 10 + (issData.alt / 6371) * 10;
        const pos = this.latLonToVector3(issData.lat, issData.lon, r);
        this.issMarker.position.copy(pos);

        this.updateOrbitPath();

        if (this.hud) this.hud.updateISS(issData);
    }

    // User Position
    const userData = this.geoService.getLocation();
    if (userData && userData.lat) {
        const pos = this.latLonToVector3(userData.lat, userData.lon, 10);
        this.userMarker.position.copy(pos);
    }

    // Camera Tracking
    if (this.cameraDirector.mode === 'ISS') {
        const issWorldPos = new THREE.Vector3();
        this.issMarker.getWorldPosition(issWorldPos);
        this.cameraDirector.setTarget(issWorldPos);
    }
  }

  latLonToVector3(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);

    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = (radius * Math.sin(phi) * Math.sin(theta));
    const y = (radius * Math.cos(phi));

    return new THREE.Vector3(x, y, z);
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
}
