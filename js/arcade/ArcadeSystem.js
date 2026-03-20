
import * as THREE from 'three';
import { TimeEngine } from './TimeEngine.js';
import { EarthRenderer } from './EarthRenderer.js';
import { CameraDirector } from './CameraDirector.js';
import { OrbitalEarthSimulation } from './OrbitalEarthSimulation.js';
import { FlightOperationsSimulation } from './FlightOperationsSimulation.js';
import { SolarSystemSimulation } from './SolarSystemSimulation.js';

export class ArcadeSystem {
  constructor() {
    this.container = document.getElementById('sim-canvas');
    if (!this.container) {
        console.error("ArcadeSystem: #sim-canvas not found.");
        return;
    }

    // State
    this.activeSimKey = null;
    this.activeSim = null;

    // Core Systems
    this.timeEngine = new TimeEngine();
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 0, 40);

    // Loading Manager
    THREE.DefaultLoadingManager.onLoad = () => {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
            setTimeout(() => { overlay.style.display = 'none'; }, 500);
        }
    };

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);

    // Components
    this.earthRenderer = new EarthRenderer(this.scene);
    this.cameraDirector = new CameraDirector(this.camera, this.renderer.domElement);

    // Stars
    this.createStars();

    // Global Lighting
    this.initGlobalLighting();

    // Simulations
    this.simulations = {
        'orbital': new OrbitalEarthSimulation(this),
        'flight': new FlightOperationsSimulation(this),
        'solar': new SolarSystemSimulation(this)
    };

    // UI Elements
    this.uiHub = document.getElementById('arcade-hub-ui');
    this.uiSim = document.getElementById('simulation-ui');
    this.uiTitle = document.getElementById('sim-title');
    this.uiContent = document.getElementById('sim-content-layer');

    // Bind Methods
    this.animate = this.animate.bind(this);
    this.onResize = this.onResize.bind(this);

    this.init();
  }

  initGlobalLighting() {
    this.globalSunLight = new THREE.DirectionalLight(0xffffff, 2.0);
    this.scene.add(this.globalSunLight);
    this.globalAmbientLight = new THREE.AmbientLight(0x050505);
    this.scene.add(this.globalAmbientLight);
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

  init() {
    const debounce = (func, wait) => {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    };

    window.addEventListener('resize', debounce(this.onResize, 200));

    // Setup UI Listeners
    this.setupUI();

    // Check URL
    const params = new URLSearchParams(window.location.search);
    const simParam = params.get('sim');

    if (simParam && this.simulations[simParam]) {
        this.launchSimulation(simParam);
    } else {
        this.enterHub();
    }

    this.animate();
  }

  setupUI() {
    // Hub Launch Buttons
    document.querySelectorAll('.hub-card').forEach(card => {
        card.addEventListener('click', () => {
            const key = card.dataset.sim;
            this.launchSimulation(key);
        });
    });

    // Sim Top Bar Buttons
    const btnExit = document.getElementById('btn-exit-arcade');
    if (btnExit) {
        btnExit.addEventListener('click', () => this.enterHub());
    }

    const btnSwitch = document.getElementById('btn-switch-sim');
    if (btnSwitch) {
        btnSwitch.addEventListener('click', () => {
            // Toggle for now
            const next = this.activeSimKey === 'orbital' ? 'flight' : 'orbital';
            this.launchSimulation(next);
        });
    }
  }

  enterHub() {
    // Unmount active sim
    if (this.activeSim) {
        this.activeSim.unmount();
        this.activeSim = null;
        this.activeSimKey = null;
    }

    // UI State
    if (this.uiHub) this.uiHub.classList.remove('hidden');
    if (this.uiSim) this.uiSim.classList.add('hidden');

    // Camera Reset
    this.cameraDirector.setMode('FREE');
    // Optional: Fly to a nice overview
    // this.cameraDirector.flyTo(new THREE.Vector3(0, 10, 40));
  }

  launchSimulation(key) {
    if (!this.simulations[key]) return;

    // Unmount previous
    if (this.activeSim) {
        this.activeSim.unmount();
    }

    this.activeSimKey = key;
    this.activeSim = this.simulations[key];

    // UI State
    if (this.uiHub) this.uiHub.classList.add('hidden');
    if (this.uiSim) this.uiSim.classList.remove('hidden');

    // Update Title
    if (this.uiTitle) {
        if (key === 'orbital') this.uiTitle.textContent = 'ORBITAL EARTH';
        else if (key === 'flight') this.uiTitle.textContent = 'FLIGHT OPERATIONS';
        else if (key === 'solar') this.uiTitle.textContent = 'SOLAR SYSTEM EXPLORER';
        else this.uiTitle.textContent = 'SIMULATION';
    }

    // Mount New Sim
    this.activeSim.mount();
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(this.animate);

    const now = this.timeEngine.getUTCTime();
    const gmst = this.timeEngine.getGMST(now);
    const sunPos = this.timeEngine.getSunPosition(now);

    // Update global sunlight position
    if (sunPos) {
        this.globalSunLight.position.set(sunPos.x, sunPos.y, sunPos.z);
    }

    // Update Earth
    this.earthRenderer.update(sunPos, gmst);

    // Rotate slowly in Hub mode
    if (!this.activeSim) {
        this.earthRenderer.group.rotation.y += 0.0005;
    }

    // Update Active Sim
    if (this.activeSim) {
        this.activeSim.update(now);
    }

    // Update Camera
    // If active sim has a target, pass it?
    // CameraDirector handles its own modes, but we might need to pass data
    this.cameraDirector.update();

    this.renderer.render(this.scene, this.camera);
  }
}
