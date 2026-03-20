import * as THREE from 'three';
import { CelestialBodyRenderer } from './CelestialBodyRenderer.js';

export class SolarSystemSimulation {
  constructor(system) {
    this.system = system;
    this.scene = system.scene;
    this.cameraDirector = system.cameraDirector;

    this.isMounted = false;
    this.bodies = [];

    this.baseGroup = new THREE.Group();
    this.scene.add(this.baseGroup);

    // Create central light representing the sun locally
    this.sunPointLight = new THREE.PointLight(0xffeedd, 5, 2000);
    this.baseGroup.add(this.sunPointLight);

    // Instantiate celestial bodies with "cinematic scale"
    // Distances are significantly compressed for easier viewing, but ordered correctly.
    const planetData = [
      { name: 'Sun',     radius: 20,  distance: 0,   color: 0xffcc00, orbitColor: null,    emissiveIntensity: 2,   orbitSpeed: 0,     rotationSpeed: 0.005, isSun: true },
      { name: 'Mercury', radius: 1.5, distance: 35,  color: 0x888888, orbitColor: 0x555555, emissiveIntensity: 0,   orbitSpeed: 0.04,  rotationSpeed: 0.01 },
      { name: 'Venus',   radius: 3,   distance: 55,  color: 0xe3bb76, orbitColor: 0x887755, emissiveIntensity: 0,   orbitSpeed: 0.015, rotationSpeed: 0.008 },
      { name: 'Earth',   radius: 3.5, distance: 80,  color: 0x2233ff, orbitColor: 0x334488, emissiveIntensity: 0,   orbitSpeed: 0.01,  rotationSpeed: 0.02, textureUrl: 'assets/textures/earth-blue-marble.jpg' },
      { name: 'Mars',    radius: 2,   distance: 110, color: 0xc1440e, orbitColor: 0x883311, emissiveIntensity: 0,   orbitSpeed: 0.008, rotationSpeed: 0.018 },
      { name: 'Jupiter', radius: 10,  distance: 170, color: 0xd39c7e, orbitColor: 0x775544, emissiveIntensity: 0,   orbitSpeed: 0.004, rotationSpeed: 0.04 },
      { name: 'Saturn',  radius: 8,   distance: 230, color: 0xead6b8, orbitColor: 0x887766, emissiveIntensity: 0,   orbitSpeed: 0.003, rotationSpeed: 0.038 },
      { name: 'Uranus',  radius: 5,   distance: 290, color: 0x4b70dd, orbitColor: 0x334477, emissiveIntensity: 0,   orbitSpeed: 0.002, rotationSpeed: 0.025 },
      { name: 'Neptune', radius: 4.8, distance: 350, color: 0x274687, orbitColor: 0x223366, emissiveIntensity: 0,   orbitSpeed: 0.001, rotationSpeed: 0.028 }
    ];

    planetData.forEach(data => {
      const body = new CelestialBodyRenderer(this.baseGroup, data);
      this.bodies.push({ name: data.name, renderer: body });
    });

    // Special case for Moon orbiting Earth
    const earthRenderer = this.bodies.find(b => b.name === 'Earth').renderer;
    this.moonRenderer = new CelestialBodyRenderer(earthRenderer.group, {
        name: 'Moon',
        radius: 0.8,
        distance: 7, // local to Earth
        color: 0xaaaaaa,
        orbitColor: 0x777777,
        orbitSpeed: 0.03,
        rotationSpeed: 0.005
    });

    // Hidden by default
    this.baseGroup.visible = false;
    // Keep EarthRenderer invisible by default since we provide our own Earth
    // We'll toggle it on mount
  }

  mount() {
    if (this.isMounted) return;
    this.isMounted = true;
    console.log("Mounting Solar System Explorer");

    // Hide original OrbitalEarth Simulation Earth
    if (this.system.earthRenderer) {
      this.system.earthRenderer.group.visible = false;
    }

    // Disable global sunlight so it doesn't interfere with our local sun
    if (this.system.globalSunLight) {
        this.system.globalSunLight.visible = false;
    }

    this.baseGroup.visible = true;

    // Initially fly out to view the solar system
    this.cameraDirector.setMode('FREE');
    this.cameraDirector.flyTo(new THREE.Vector3(0, 150, 450), new THREE.Vector3(0, 0, 0));

    // UI Injection
    const uiLayer = document.getElementById('sim-content-layer');
    if (uiLayer) {
        let planetButtons = this.bodies.map(b =>
            `<button class="btn-control planet-btn" data-target="${b.name}">${b.name.toUpperCase()}</button>`
        ).join('');

        uiLayer.innerHTML = `
          <div class="hud-panel hud-bottom-left" style="width: 100%; max-width: 600px; bottom: 20px; left: 50%; transform: translateX(-50%); text-align: center; display: flex; flex-wrap: wrap; justify-content: center; gap: 8px;">
            <div style="width:100%; margin-bottom:10px; color:#f472b6; font-weight:700; letter-spacing:0.05em; font-size:0.8rem;">SELECT CELESTIAL BODY</div>
            ${planetButtons}
            <button class="btn-control planet-btn" data-target="Moon">MOON</button>
            <button class="btn-control planet-btn" data-target="Overview">OVERVIEW</button>
          </div>
        `;
    }

    this.bindEvents();
  }

  bindEvents() {
    document.querySelectorAll('.planet-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetName = e.target.getAttribute('data-target');
            if (targetName === 'Overview') {
                this.cameraDirector.setMode('FREE');
                this.cameraDirector.flyTo(new THREE.Vector3(0, 150, 450), new THREE.Vector3(0, 0, 0));
                return;
            }

            let targetBody;
            if (targetName === 'Moon') {
                targetBody = this.moonRenderer;
            } else {
                targetBody = this.bodies.find(b => b.name === targetName)?.renderer;
            }

            if (targetBody) {
                // Determine target object for camera to track
                // We use the mesh so we track its world position accurately
                this.cameraDirector.setMode('FOCUS', targetBody);
            }
        });
    });
  }

  unmount() {
    if (!this.isMounted) return;
    this.isMounted = false;
    console.log("Unmounting Solar System Explorer");

    this.baseGroup.visible = false;

    // Restore original OrbitalEarth
    if (this.system.earthRenderer) {
      this.system.earthRenderer.group.visible = true;
    }

    // Restore global sunlight
    if (this.system.globalSunLight) {
        this.system.globalSunLight.visible = true;
    }

    const uiLayer = document.getElementById('sim-content-layer');
    if (uiLayer) uiLayer.innerHTML = '';
  }

  update(time) {
    if (!this.isMounted) return;

    // We don't use real time for the cinematic solar system,
    // we use a fixed delta for smooth continuous rotation.
    const delta = 1; // 60fps assumed or use a clock

    this.bodies.forEach(b => b.renderer.update(delta));
    this.moonRenderer.update(delta);
  }
}
