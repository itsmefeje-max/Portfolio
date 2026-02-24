
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

  update(issPosVec) {
    if (this.mode === 'ISS' && issPosVec) {
        // Softly follow ISS
        this.controls.target.lerp(issPosVec, 0.1);

        // Optional: Move camera to maintain relative offset?
        // For now, just tracking the target allows the user to rotate around the ISS.
    }

    this.controls.update();
  }
}
