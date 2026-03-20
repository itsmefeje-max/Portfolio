import * as THREE from 'three';

const EARTH_RADIUS = 10;

export class EarthRenderer {
  constructor(scene) {
    this.scene = scene;
    this.radius = EARTH_RADIUS;
    this.group = new THREE.Group();
    this.group.name = 'OrbitalEarthGroup';
    this.scene.add(this.group);

    this.loader = new THREE.TextureLoader();
    this.quality = window.matchMedia('(max-width: 767px)').matches ? 'compact' : 'full';
    this.textures = {
      day: this.loader.load('assets/textures/earth-blue-marble.jpg'),
      night: this.loader.load('assets/textures/earth_lights_2048.png'),
      clouds: this.loader.load('assets/textures/earth_clouds_1024.png'),
      normal: this.quality === 'full' ? this.loader.load('assets/textures/earth_normal_2048.jpg') : null,
      roughness: this.quality === 'full' ? this.loader.load('assets/textures/earth_specular_2048.jpg') : null
    };

    Object.values(this.textures).forEach((texture) => {
      if (texture) texture.colorSpace = THREE.SRGBColorSpace;
    });

    this.buildCore();
    this.buildNightLayer();
    this.buildCloudLayer();
    this.buildAtmosphere();
    this.buildHalo();
  }

  buildCore() {
    const geometry = new THREE.SphereGeometry(this.radius, 96, 96);
    this.earthMaterial = new THREE.MeshStandardMaterial({
      map: this.textures.day,
      normalMap: this.textures.normal,
      roughnessMap: this.textures.roughness,
      roughness: 0.88,
      metalness: 0.04,
      emissive: new THREE.Color(0x071221),
      emissiveIntensity: 0.18
    });

    this.earthMesh = new THREE.Mesh(geometry, this.earthMaterial);
    this.group.add(this.earthMesh);
  }

  buildNightLayer() {
    const uniforms = {
      nightTexture: { value: this.textures.night },
      sunDirection: { value: new THREE.Vector3(1, 0, 0) }
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        void main() {
          vUv = uv;
          vNormal = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D nightTexture;
        uniform vec3 sunDirection;
        varying vec2 vUv;
        varying vec3 vNormal;
        void main() {
          float horizon = dot(normalize(vNormal), normalize(sunDirection));
          float mask = smoothstep(0.2, -0.35, horizon);
          vec3 color = texture2D(nightTexture, vUv).rgb;
          gl_FragColor = vec4(color * 1.15, mask * 0.92);
        }
      `
    });

    this.nightMesh = new THREE.Mesh(new THREE.SphereGeometry(this.radius * 1.0025, 96, 96), material);
    this.group.add(this.nightMesh);
  }

  buildCloudLayer() {
    this.cloudMaterial = new THREE.MeshStandardMaterial({
      map: this.textures.clouds,
      alphaMap: this.textures.clouds,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.cloudMesh = new THREE.Mesh(new THREE.SphereGeometry(this.radius * 1.015, 96, 96), this.cloudMaterial);
    this.group.add(this.cloudMesh);
  }

  buildAtmosphere() {
    const material = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        sunDirection: { value: new THREE.Vector3(1, 0, 0) }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 sunDirection;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        void main() {
          vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
          float fresnel = pow(0.8 - dot(vNormal, viewDirection), 3.0);
          float sunlight = smoothstep(-0.4, 0.8, dot(normalize(vNormal), normalize(sunDirection)));
          vec3 color = mix(vec3(0.12, 0.26, 0.6), vec3(0.4, 0.72, 1.0), sunlight);
          gl_FragColor = vec4(color, fresnel * 0.72);
        }
      `
    });

    this.atmosphereMesh = new THREE.Mesh(new THREE.SphereGeometry(this.radius * 1.16, 96, 96), material);
    this.group.add(this.atmosphereMesh);
  }

  buildHalo() {
    const material = new THREE.SpriteMaterial({
      color: 0x3b82f6,
      opacity: 0.18,
      transparent: true,
      blending: THREE.AdditiveBlending
    });

    this.halo = new THREE.Sprite(material);
    this.halo.scale.set(36, 36, 1);
    this.group.add(this.halo);
  }

  update({ sunPos, gmst, delta = 1 } = {}) {
    this.group.rotation.y = gmst;

    if (sunPos) {
      const direction = new THREE.Vector3(sunPos.x, sunPos.y, sunPos.z).normalize();
      this.nightMesh.material.uniforms.sunDirection.value.copy(direction);
      this.atmosphereMesh.material.uniforms.sunDirection.value.copy(direction);
    }

    this.cloudMesh.rotation.y += 0.00018 * delta;
    this.halo.material.opacity = 0.14 + Math.sin(performance.now() * 0.0014) * 0.02;
  }
}
