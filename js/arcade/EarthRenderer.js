
import * as THREE from 'three';

export class EarthRenderer {
  constructor(scene) {
    this.scene = scene;
    this.radius = 10;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    const loader = new THREE.TextureLoader();
    this.loader = loader;

    // Assets
    const isMobile = window.innerWidth < 768;
    this.urls = {
      day: 'assets/textures/earth-blue-marble.jpg',
      night: 'assets/textures/earth_lights_2048.png',
      clouds: 'assets/textures/earth_clouds_1024.png',
      normal: isMobile ? null : 'assets/textures/earth_normal_2048.jpg',
      specular: isMobile ? null : 'assets/textures/earth_specular_2048.jpg'
    };

    this.initEarth();
    this.initClouds();
    this.initNightLights();
    this.initAtmosphere();
    this.initSun();
  }

  initEarth() {
    const geometry = new THREE.SphereGeometry(this.radius, 64, 64);
    const material = new THREE.MeshStandardMaterial({
      map: this.loader.load(this.urls.day),
      normalMap: this.urls.normal ? this.loader.load(this.urls.normal) : null,
      roughnessMap: this.urls.specular ? this.loader.load(this.urls.specular) : null,
      roughness: 0.8,
      metalness: 0.1
    });

    this.earthMesh = new THREE.Mesh(geometry, material);
    this.group.add(this.earthMesh);
  }

  initClouds() {
    const geometry = new THREE.SphereGeometry(this.radius * 1.01, 64, 64);
    const material = new THREE.MeshStandardMaterial({
      map: this.loader.load(this.urls.clouds),
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      alphaMap: this.loader.load(this.urls.clouds),
    });

    this.cloudMesh = new THREE.Mesh(geometry, material);
    this.group.add(this.cloudMesh);
  }

  initNightLights() {
    const geometry = new THREE.SphereGeometry(this.radius * 1.005, 64, 64);

    const uniforms = {
      sunDirection: { value: new THREE.Vector3(1, 0, 0) },
      nightTexture: { value: this.loader.load(this.urls.night) }
    };

    const material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;

        void main() {
          vUv = uv;
          vNormal = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D nightTexture;
        uniform vec3 sunDirection;
        varying vec2 vUv;
        varying vec3 vNormal;

        void main() {
          vec3 nightColor = texture2D(nightTexture, vUv).rgb;

          float sunDot = dot(vNormal, normalize(sunDirection));

          // Mask: show on night side (dot < 0)
          float mask = smoothstep(0.1, -0.1, sunDot);

          gl_FragColor = vec4(nightColor, mask);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
    });

    this.nightMesh = new THREE.Mesh(geometry, material);
    this.nightMesh.material = material;
    this.group.add(this.nightMesh);
  }

  initAtmosphere() {
    const geometry = new THREE.SphereGeometry(this.radius * 1.2, 64, 64);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        sunDirection: { value: new THREE.Vector3(1,0,0) }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        void main() {
          vNormal = normalize(mat3(modelMatrix) * normal);
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        uniform vec3 sunDirection;

        void main() {
          vec3 viewDir = normalize(cameraPosition - vWorldPosition);
          float intensity = pow(0.5 - dot(vNormal, viewDir), 3.0);

          vec3 atmosphereColor = vec3(0.3, 0.6, 1.0) * intensity;

          // Fade on night side slightly, but keep rim
          float sunDot = dot(vNormal, normalize(sunDirection));
          float dayIntensity = smoothstep(-0.5, 0.5, sunDot);

          gl_FragColor = vec4(atmosphereColor, intensity * 0.8);
        }
      `,
      side: THREE.BackSide,
      transparent: true,
      blending: THREE.AdditiveBlending
    });

    this.atmosphereMesh = new THREE.Mesh(geometry, material);
    this.group.add(this.atmosphereMesh);
  }

  initSun() {
    this.sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
    this.scene.add(this.sunLight);
    this.ambientLight = new THREE.AmbientLight(0x050505);
    this.scene.add(this.ambientLight);
  }

  update(sunPos, gmst) {
    this.group.rotation.y = gmst;

    if (sunPos) {
        this.sunLight.position.set(sunPos.x, sunPos.y, sunPos.z);

        if (this.nightMesh.material.uniforms) {
            this.nightMesh.material.uniforms.sunDirection.value.copy(this.sunLight.position);
        }
        if (this.atmosphereMesh.material.uniforms) {
            this.atmosphereMesh.material.uniforms.sunDirection.value.copy(this.sunLight.position);
        }
    }

    this.cloudMesh.rotation.y += 0.0002;
  }
}
