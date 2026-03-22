import * as THREE from 'three';

export class CelestialBodyRenderer {
  constructor(scene, options, loadingManager) {
    this.scene = scene;
    this.loadingManager = loadingManager;
    this.options = Object.assign({
      name: 'Unknown',
      radius: 1,
      distance: 0,
      color: 0xffffff,
      emissive: 0x000000,
      emissiveIntensity: 0,
      textureUrl: null,
      orbitColor: 0x334155,
      orbitSpeed: 0.01,
      rotationSpeed: 0.01,
      tilt: 0.14,
      ring: null,
      isSun: false
    }, options);

    this.angle = Math.random() * Math.PI * 2;
    this.orbitGroup = new THREE.Group();
    this.group = new THREE.Group();

    // Explicit planetary revolution tracking
    this.group.position.x = Math.cos(this.angle) * this.options.distance;
    this.group.position.z = Math.sin(this.angle) * this.options.distance;

    this.orbitGroup.add(this.group);
    this.scene.add(this.orbitGroup);

    this.buildMesh();
    if (this.options.distance > 0) {
      this.buildOrbitPath();
    }
    if (this.options.ring) {
      this.buildRing();
    }
  }

  buildMesh() {
    const geometry = new THREE.SphereGeometry(this.options.radius, 64, 64);
    const material = new THREE.MeshStandardMaterial({
      color: this.options.color,
      emissive: this.options.isSun ? this.options.color : this.options.emissive,
      emissiveIntensity: this.options.emissiveIntensity,
      roughness: this.options.isSun ? 0.6 : 0.92,
      metalness: 0.02
    });

    if (this.options.textureUrl) {
      const loader = new THREE.TextureLoader(this.loadingManager);
      loader.load(this.options.textureUrl, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        material.map = texture;
        material.needsUpdate = true;
      });
    }

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.rotation.z = this.options.tilt;
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.group.add(this.mesh);

    if (this.options.isSun) {
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: this.options.color,
        transparent: true,
        opacity: 0.16,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide
      });
      this.glowMesh = new THREE.Mesh(new THREE.SphereGeometry(this.options.radius * 1.25, 32, 32), glowMaterial);
      this.group.add(this.glowMesh);
    }
  }

  buildOrbitPath() {
    const curve = new THREE.EllipseCurve(0, 0, this.options.distance, this.options.distance, 0, Math.PI * 2, false, 0);
    const points = curve.getPoints(180).map((point) => new THREE.Vector3(point.x, 0, point.y));
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: this.options.orbitColor,
      transparent: true,
      opacity: 0.22
    });
    this.orbitLine = new THREE.LineLoop(geometry, material);
    this.scene.add(this.orbitLine);
  }

  buildRing() {
    const { innerRadius, outerRadius, color } = this.options.ring;
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.32,
      side: THREE.DoubleSide
    });
    this.ringMesh = new THREE.Mesh(new THREE.RingGeometry(innerRadius, outerRadius, 96), material);
    this.ringMesh.rotation.x = Math.PI / 2.35;
    this.group.add(this.ringMesh);
  }

  update(now, deltaTime = 1, timeEngine = null) {
    if (this.options.distance > 0) {
      if (timeEngine && !this.options.isSun) {
        // Real-time data will look static because planets take months/years to orbit.
        // The user wants a "serious upgrade" and a visually pleasing simulation that moves.
        // We calculate real-time relative angles so they form the correct heliocentric alignment,
        // but we add an animated offset to keep the dynamic feel of the simulation while maintaining accurate relative distances.
        // We use a simulation speed multiplier based on the real relative speeds.

        // Actually, we can just use the timeEngine to get the true real-time longitude, and optionally
        // offset the "now" date based on the elapsed time of the simulation if we want time-lapse.
        // For this requirement: "The planets should revolve around the sun in real time... Motion should feel smooth, continuous, and realistic."
        // We need to keep some motion. We'll use the true initial angle + a scaled speed so it moves smoothly.
        if (this.baseAngle === undefined) {
           this.baseAngle = timeEngine.getPlanetMeanLongitude(this.options.name, now);
        }

        // Add smooth continuous motion. Earth takes 1 year. Mercury takes 88 days.
        // orbitSpeed in the options is roughly relative. We will apply the delta.
        this.baseAngle += this.options.orbitSpeed * deltaTime * 0.005;
        this.angle = this.baseAngle;
      } else {
        this.angle -= this.options.orbitSpeed * deltaTime * 0.05;
      }

      this.group.position.x = Math.cos(this.angle) * this.options.distance;
      this.group.position.z = Math.sin(this.angle) * this.options.distance;
    }

    this.mesh.rotation.y += this.options.rotationSpeed * deltaTime;

    if (this.glowMesh) {
      this.glowMesh.rotation.y -= this.options.rotationSpeed * 0.3 * deltaTime;
    }
  }
}
