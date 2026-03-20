import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const CAMERA_MODE_LABELS = {
  FREE: 'Free Orbit',
  ISS: 'ISS Track',
  USER: 'Ground Lock',
  FOCUS: 'Body Focus'
};

export class CameraDirector {
  constructor(camera, domElement) {
    this.camera = camera;
    this.controls = new OrbitControls(camera, domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.enablePan = false;
    this.controls.rotateSpeed = 0.55;
    this.controls.minDistance = 12;
    this.controls.maxDistance = 140;

    this.mode = 'FREE';
    this.modeLabel = CAMERA_MODE_LABELS.FREE;
    this.targetVec = new THREE.Vector3();
    this.followVelocity = new THREE.Vector3();
    this.focusObject = null;
    this.focusOffset = new THREE.Vector3(16, 8, 16);
    this.lastStableTarget = new THREE.Vector3();
    this.transitionTween = null;
  }

  setTarget(vector) {
    if (!vector) return;
    this.targetVec.copy(vector);
    this.lastStableTarget.copy(vector);
  }

  setMode(mode, data) {
    this.mode = mode;
    this.modeLabel = CAMERA_MODE_LABELS[mode] || 'Simulation Camera';
    this.focusObject = null;

    if (mode === 'FREE') {
      this.controls.minDistance = 12;
      this.controls.maxDistance = 800;
      return;
    }

    if (mode === 'ISS') {
      this.controls.minDistance = 12;
      this.controls.maxDistance = 120;
      return;
    }

    if (mode === 'USER' && data) {
      const target = data.clone();
      const position = target.clone().normalize().multiplyScalar(28);
      this.flyTo(position, new THREE.Vector3(0, 0, 0));
      this.setTarget(target);
      return;
    }

    if (mode === 'FOCUS' && data?.mesh) {
      this.controls.minDistance = Math.max(2, data.options.radius * 1.5);
      this.controls.maxDistance = 800;
      this.focusObject = data;
      const worldPosition = new THREE.Vector3();
      data.mesh.getWorldPosition(worldPosition);
      const offsetDistance = Math.max(8, data.options.radius * 3.25);
      this.focusOffset.set(offsetDistance, offsetDistance * 0.5, offsetDistance);
      this.flyTo(worldPosition.clone().add(this.focusOffset), worldPosition);
    }
  }

  flyTo(targetPosition, lookAtPosition) {
    if (this.transitionTween?.kill) {
      this.transitionTween.kill();
      this.transitionTween = null;
    }

    if (window.gsap) {
      const timeline = window.gsap.timeline();
      timeline.to(this.camera.position, {
        duration: 1.25,
        x: targetPosition.x,
        y: targetPosition.y,
        z: targetPosition.z,
        ease: 'power2.inOut'
      }, 0);

      if (lookAtPosition) {
        timeline.to(this.controls.target, {
          duration: 1.25,
          x: lookAtPosition.x,
          y: lookAtPosition.y,
          z: lookAtPosition.z,
          ease: 'power2.inOut'
        }, 0);
      }

      this.transitionTween = timeline;
      return;
    }

    this.camera.position.copy(targetPosition);
    if (lookAtPosition) {
      this.controls.target.copy(lookAtPosition);
    }
  }

  update() {
    if (this.mode === 'ISS') {
      this.controls.target.lerp(this.lastStableTarget, 0.08);
    }

    if (this.mode === 'USER') {
      this.controls.target.lerp(this.lastStableTarget, 0.08);
    }

    if (this.mode === 'FOCUS' && this.focusObject?.mesh) {
      const worldPosition = new THREE.Vector3();
      this.focusObject.mesh.getWorldPosition(worldPosition);
      this.controls.target.lerp(worldPosition, 0.08);

      const desiredPosition = worldPosition.clone().add(this.focusOffset);
      this.camera.position.lerp(desiredPosition, 0.05);
      this.focusOffset.copy(this.camera.position).sub(this.controls.target);
    }

    this.controls.update();
  }
}
