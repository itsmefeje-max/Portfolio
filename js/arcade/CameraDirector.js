
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class CameraDirector {
  constructor(camera, domElement) {
    this.camera = camera;
    this.controls = new OrbitControls(camera, domElement);

    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 12; // Earth radius 10
    this.controls.maxDistance = 80;
    this.controls.enablePan = false;
    this.controls.rotateSpeed = 0.5;

    this.mode = 'FREE'; // FREE, ISS, USER, SUN
    this.targetVec = new THREE.Vector3();
  }

  setTarget(vec) {
      if (vec) this.targetVec.copy(vec);
  }

  setMode(mode, data) {
    this.mode = mode;
    console.log(`Camera Mode: ${mode}`);

    if (mode === 'USER' && data) {
        // Data is user position vector
        // Position camera above user
        const camPos = data.clone().normalize().multiplyScalar(25);
        this.flyTo(camPos, new THREE.Vector3(0,0,0));
    } else if (mode === 'SUN' && data) {
        // Fly to sun view (camera between sun and earth)
        const sunPos = data.clone().normalize().multiplyScalar(30);
        this.flyTo(sunPos, new THREE.Vector3(0,0,0));
    } else if (mode === 'ISS') {
        // Reset target to earth center initially? No, let update handle it.
    } else if (mode === 'FREE') {
        this.flyTo(this.camera.position.clone(), new THREE.Vector3(0,0,0));
    }
  }

  flyTo(targetPos, lookAtPos) {
    // Check for GSAP
    if (window.gsap) {
      window.gsap.to(this.camera.position, {
        duration: 1.5,
        x: targetPos.x,
        y: targetPos.y,
        z: targetPos.z,
        ease: "power2.inOut"
      });

      if (lookAtPos) {
          window.gsap.to(this.controls.target, {
            duration: 1.5,
            x: lookAtPos.x,
            y: lookAtPos.y,
            z: lookAtPos.z,
            ease: "power2.inOut"
          });
      }
    } else {
       this.camera.position.copy(targetPos);
       if (lookAtPos) this.controls.target.copy(lookAtPos);
    }
  }

  update(optionalTarget) {
    // If a target is passed directly (legacy support or one-off), use it temporarily or update targetVec
    if (optionalTarget) this.targetVec.copy(optionalTarget);

    if (this.mode === 'ISS') {
        // Softly follow target using the internal targetVec which is updated by the simulation
        if (this.targetVec.lengthSq() > 0) {
            this.controls.target.lerp(this.targetVec, 0.1);
        }
    }

    this.controls.update();
  }
}
