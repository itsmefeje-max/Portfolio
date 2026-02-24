
import * as THREE from 'three';
import { FlightService } from './FlightService.js';

export class FlightOperationsSimulation {
  constructor(system) {
    this.system = system;
    this.renderer = system.renderer;
    this.scene = system.scene;
    this.camera = system.camera;
    this.earthGroup = system.earthRenderer.group;
    this.cameraDirector = system.cameraDirector;

    this.service = new FlightService();
    this.mesh = null;
    this.dummy = new THREE.Object3D();

    this.isMounted = false;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.selectedFlightId = null;
    this.routeLine = null;

    // Bind events
    this.onClick = this.onClick.bind(this);
  }

  mount() {
    if (this.isMounted) return;
    this.isMounted = true;
    console.log("Mounting Flight Ops");

    // 1. Inject UI
    const uiLayer = document.getElementById('sim-content-layer');
    if (uiLayer) {
        uiLayer.innerHTML = `
          <!-- Top Right Stats -->
          <div class="hud-panel hud-top-right">
            <div class="data-row">
              <span class="data-label">ACTIVE FLIGHTS</span>
              <span class="data-value" id="flight-count">0</span>
            </div>
            <div class="data-row">
              <span class="data-label">NETWORK STATUS</span>
              <span class="data-value" style="color:#4ade80">LIVE</span>
            </div>
          </div>

          <!-- Bottom Left Flight Info (Hidden initially) -->
          <div id="flight-info-panel" class="hud-panel hud-bottom-left" style="display:none;">
            <div style="margin-bottom:8px; color:#38bdf8; font-weight:700; letter-spacing:0.05em; font-size:0.8rem;">FLIGHT DATA</div>
            <div class="data-row">
              <span class="data-label">FLIGHT ID</span>
              <span class="data-value" id="f-id">--</span>
            </div>
            <div class="data-row">
              <span class="data-label">AIRLINE</span>
              <span class="data-value" id="f-airline">--</span>
            </div>
            <div class="data-row">
              <span class="data-label">ALTITUDE</span>
              <span class="data-value" id="f-alt">--</span>
            </div>
            <div class="data-row">
              <span class="data-label">SPEED</span>
              <span class="data-value" id="f-speed">--</span>
            </div>
            <div class="data-row">
              <span class="data-label">HEADING</span>
              <span class="data-value" id="f-heading">--</span>
            </div>
             <button id="btn-close-flight" class="btn-control" style="width:100%; margin-top:15px; background:rgba(255,0,0,0.2); border-color:rgba(255,0,0,0.4);">CLOSE PANEL</button>
          </div>

           <!-- Bottom Right Camera -->
          <div class="hud-panel hud-bottom-right">
            <div class="data-label" style="width:100%; text-align:right; margin-bottom:5px; opacity:0.7;">CAMERA CONTROL</div>
            <button id="btn-mode-free" class="btn-control">FREE ORBIT</button>
          </div>
        `;
    }

    // 2. Initialize Mesh
    this.createMesh();
    this.earthGroup.add(this.mesh);
    this.earthGroup.add(this.routeLine);

    // 3. Bind Events
    this.renderer.domElement.addEventListener('pointerdown', this.onClick);

    // UI Events
    const btnFree = document.getElementById('btn-mode-free');
    if (btnFree) btnFree.addEventListener('click', () => {
        this.selectedFlightId = null;
        this.cameraDirector.setMode('FREE');
        this.updatePanelVisibility();
    });

    const btnClose = document.getElementById('btn-close-flight');
    if (btnClose) btnClose.addEventListener('click', () => {
        this.selectedFlightId = null;
        this.cameraDirector.setMode('FREE');
        this.updatePanelVisibility();
    });
  }

  unmount() {
    if (!this.isMounted) return;
    this.isMounted = false;

    this.earthGroup.remove(this.mesh);
    if (this.mesh) {
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
        this.mesh = null;
    }

    this.earthGroup.remove(this.routeLine);
    if (this.routeLine) {
        this.routeLine.geometry.dispose();
        this.routeLine.material.dispose();
        this.routeLine = null;
    }

    this.renderer.domElement.removeEventListener('pointerdown', this.onClick);

    const uiLayer = document.getElementById('sim-content-layer');
    if (uiLayer) uiLayer.innerHTML = '';
  }

  createMesh() {
    // Cone geometry pointing Y+
    // Rotate to point Z+
    const geometry = new THREE.ConeGeometry(0.06, 0.25, 6);
    geometry.rotateX(Math.PI / 2);

    const material = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    const count = 3500;
    this.mesh = new THREE.InstancedMesh(geometry, material, count);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    // Create Route Line
    const lineGeo = new THREE.BufferGeometry();
    const lineMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.5 });
    this.routeLine = new THREE.Line(lineGeo, lineMat);
    this.routeLine.frustumCulled = false; // Always render if in view
  }

  update(time) {
    if (!this.isMounted || !this.mesh) return;

    const flights = this.service.getFlights();

    // Update Count UI
    const countEl = document.getElementById('flight-count');
    if (countEl) countEl.innerText = flights.length;

    let selectedFlight = null;

    // Update Instances
    for (let i = 0; i < flights.length; i++) {
        const f = flights[i];

        // Position
        // f.alt is in meters. Earth Radius ~6371km. Simulation Radius 10.
        // We convert alt to km: f.alt / 1000
        // Ratio: (alt_km / earth_radius_km).
        // To make it visible, we exaggerate the height by 20x.
        const r = 10 + ((f.alt / 1000) / 6371) * 10 * 20;
        const pos = this.latLonToVector3(f.lat, f.lon, r);

        this.dummy.position.copy(pos);

        // Rotation (Look Ahead)
        const distDeg = 0.1 / 111;
        const rad = (90 - f.heading) * (Math.PI / 180);
        const dLat = distDeg * Math.sin(rad);
        const dLon = distDeg * Math.cos(rad);

        const nextPos = this.latLonToVector3(f.lat + dLat, f.lon + dLon, r);
        this.dummy.lookAt(nextPos);

        this.dummy.updateMatrix();
        this.mesh.setMatrixAt(i, this.dummy.matrix);

        // Check if selected
        if (this.selectedFlightId === f.id) {
            selectedFlight = f;
             // Camera Follow
             const worldPos = pos.clone().applyMatrix4(this.earthGroup.matrixWorld);
             this.cameraDirector.update(worldPos);
        }
    }

    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.count = flights.length; // Ensure we render correct amount

    // Update Panel Data if selected
    if (selectedFlight) {
        this.updatePanelData(selectedFlight);
        this.updateRouteLine(selectedFlight);
    } else {
        if (this.routeLine) this.routeLine.visible = false;
    }
  }

  updateRouteLine(f) {
      if (!this.routeLine) return;
      this.routeLine.visible = true;

      const points = [];
      const steps = 50;
      const duration = 1.0; // 1 hour projection
      const dt = duration / steps;

      // Starting State
      let lat = f.lat;
      let lon = f.lon;
      // Fixed altitude for line (same as plane)
      const r = 10 + ((f.alt / 1000) / 6371) * 10 * 20;

      // We need a quick way to project lat/lon based on heading
      // 1 deg lat ~ 111km
      // speed km/h
      // dist per step (km) = speed * dt
      const distPerStep = f.speed * dt;
      const distDeg = distPerStep / 111;

      // Radian conversion
      const toRad = Math.PI / 180;
      const headingRad = (90 - f.heading) * toRad; // Nav to Math

      for (let i = 0; i <= steps; i++) {
          points.push(this.latLonToVector3(lat, lon, r));

          // Move
          // This is a linear approximation, acceptable for short distances (1 hour flight)
          // For longer, great circle is better, but this suffices for visual "projected path"
          const dLat = distDeg * Math.sin(headingRad);
          const dLon = distDeg * Math.cos(headingRad);

          lat += dLat;
          lon += dLon;
      }

      this.routeLine.geometry.setFromPoints(points);
  }

  updatePanelVisibility() {
      const p = document.getElementById('flight-info-panel');
      if (p) {
          p.style.display = this.selectedFlightId ? 'block' : 'none';
          // Force reflow or animation if needed
      }
      if (!this.selectedFlightId && this.routeLine) {
          this.routeLine.visible = false;
      }
  }

  updatePanelData(f) {
      const set = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = val; };
      set('f-id', f.id);
      set('f-airline', f.airline);
      set('f-alt', `${(f.alt).toFixed(0)} m`);
      set('f-speed', `${f.speed.toFixed(0)} km/h`);
      set('f-heading', `${f.heading.toFixed(0)}°`);
  }

  onClick(event) {
      // Raycast
      this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);

      const intersects = this.raycaster.intersectObject(this.mesh);
      if (intersects.length > 0) {
          const instanceId = intersects[0].instanceId;
          const flights = this.service.flights;
          if (flights[instanceId]) {
              this.selectedFlightId = flights[instanceId].id;

              this.updatePanelVisibility();

              // Set Camera Mode to Follow (reusing ISS mode for generic follow)
              this.cameraDirector.setMode('ISS');
          }
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
}
