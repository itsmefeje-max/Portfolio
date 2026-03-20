import * as THREE from 'three';

export class CelestialBodyRenderer {
  constructor(scene, options) {
    this.scene = scene;
    this.options = Object.assign({
      name: 'Unknown',
      radius: 1,
      distance: 0,
      color: 0xffffff,
      orbitColor: 0x333333,
      emissive: 0x000000,
      emissiveIntensity: 0,
      textureUrl: null,
      orbitSpeed: 0.01,
      rotationSpeed: 0.02,
      isSun: false
    }, options);

    this.group = new THREE.Group();
    // Move the group out to the correct distance
    this.group.position.x = this.options.distance;

    // Parent group to handle orbital rotation easily
    this.orbitGroup = new THREE.Group();
    this.orbitGroup.add(this.group);
    this.scene.add(this.orbitGroup);

    this.initMesh();
    if (this.options.distance > 0) {
      this.initOrbitPath();
    }
  }

  initMesh() {
    const geometry = new THREE.SphereGeometry(this.options.radius, 64, 64);

    let material;
    if (this.options.isSun) {
      material = new THREE.MeshStandardMaterial({
        color: this.options.color,
        emissive: this.options.color,
        emissiveIntensity: this.options.emissiveIntensity,
        roughness: 0.4,
        metalness: 0.1
      });
      // Add a simple glow effect
      const glowGeo = new THREE.SphereGeometry(this.options.radius * 1.2, 32, 32);
      const glowMat = new THREE.MeshBasicMaterial({
        color: this.options.color,
        transparent: true,
        opacity: 0.15,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide
      });
      this.glowMesh = new THREE.Mesh(glowGeo, glowMat);
      this.group.add(this.glowMesh);
    } else {
      material = new THREE.MeshStandardMaterial({
        color: this.options.color,
        emissive: this.options.emissive,
        roughness: 0.7,
        metalness: 0.1
      });
    }

    if (this.options.textureUrl) {
      const loader = new THREE.TextureLoader();
      loader.load(this.options.textureUrl, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        material.map = texture;
        material.needsUpdate = true;
      });
    }

    this.mesh = new THREE.Mesh(geometry, material);

    // Slight tilt to planets for some realism (except the sun to keep its axis simple)
    if (!this.options.isSun) {
        this.mesh.rotation.z = Math.PI / 8 * (Math.random() * 0.5 + 0.5);
    }
    this.group.add(this.mesh);
  }

  initOrbitPath() {
    const segments = 128;
    const geometry = new THREE.BufferGeometry();
    const vertices = [];

    for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        vertices.push(
            Math.cos(theta) * this.options.distance,
            0,
            Math.sin(theta) * this.options.distance
        );
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    const material = new THREE.LineBasicMaterial({
        color: this.options.orbitColor,
        transparent: true,
        opacity: 0.3
    });

    this.orbitLine = new THREE.LineLoop(geometry, material);
    // Orbit line is centered at the parent (Sun)
    this.scene.add(this.orbitLine);
  }

  update(deltaTime) {
    // Orbital rotation around parent
    if (this.options.distance > 0) {
      this.orbitGroup.rotation.y += this.options.orbitSpeed * deltaTime;
    }
    // Axial rotation
    this.mesh.rotation.y += this.options.rotationSpeed * deltaTime;
  }
}
