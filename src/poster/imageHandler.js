import * as THREE from "three";
import { WebGPURenderer, MeshBasicNodeMaterial } from "three/webgpu";
import { texture, uv, float, vec4, Fn } from "three/tsl";

/**
 * Image Handler with Three.js TSL Dithering
 * Creates a dithered black & white background for the poster
 */

// Bayer 4x4 dithering matrix
const BAYER_MATRIX = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

export class DitheredImageHandler {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.mesh = null;
    this.imageTexture = null;
    this.isInitialized = false;
  }

  async init() {
    if (this.isInitialized) return;

    // Create WebGPU renderer with fallback to WebGL
    this.renderer = new WebGPURenderer({
      canvas: this.canvas,
      antialias: true,
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);

    await this.renderer.init();

    // Create scene
    this.scene = new THREE.Scene();

    // Perspective camera for 3D paper-like rotation effect
    const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
    const fov = 50;
    this.fov = fov;
    this.cameraZ = 2;
    this.camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 100);
    this.camera.position.z = this.cameraZ;

    this.isInitialized = true;
  }

  // TSL dithering shader
  createDitherMaterial(
    imageTexture,
    ditherColor = { r: 0, g: 0, b: 0 },
    ditherScale = 2.0,
  ) {
    // Create a data texture for the Bayer matrix
    const bayerData = new Float32Array(16);
    for (let i = 0; i < 16; i++) {
      bayerData[i] = BAYER_MATRIX[i] / 16.0;
    }
    const bayerTexture = new THREE.DataTexture(
      bayerData,
      4,
      4,
      THREE.RedFormat,
      THREE.FloatType,
    );
    bayerTexture.needsUpdate = true;

    // Normalize color values to 0-1 range
    const colorR = float(ditherColor.r);
    const colorG = float(ditherColor.g);
    const colorB = float(ditherColor.b);

    // Dither pattern scale (larger = bigger dots)
    const patternScale = float(ditherScale);

    // TSL shader for ordered dithering
    const ditherShader = Fn(() => {
      const texColor = texture(imageTexture, uv());

      // Convert to grayscale using luminance weights
      const gray = texColor.r
        .mul(0.299)
        .add(texColor.g.mul(0.587))
        .add(texColor.b.mul(0.114));

      // Get pixel position for dithering pattern (scaled for dot size)
      const pixelX = uv()
        .x.mul(float(this.canvas.clientWidth))
        .div(patternScale);
      const pixelY = uv()
        .y.mul(float(this.canvas.clientHeight))
        .div(patternScale);

      // Calculate Bayer matrix index
      const ditherX = pixelX.mod(4.0).floor();
      const ditherY = pixelY.mod(4.0).floor();
      const ditherIndex = ditherY.mul(4.0).add(ditherX);

      // Sample Bayer threshold from texture
      const bayerUV = vec4(
        ditherX.add(0.5).div(4.0),
        ditherY.add(0.5).div(4.0),
        0,
        0,
      );
      const threshold = texture(bayerTexture, bayerUV.xy).r;

      // Apply dithering: compare gray value with threshold
      // Use heading color for dark pixels, transparent for light
      const isDark = gray.greaterThan(threshold);
      const outR = isDark.select(float(1.0), colorR);
      const outG = isDark.select(float(1.0), colorG);
      const outB = isDark.select(float(1.0), colorB);
      const outA = isDark.select(float(0.0), float(1.0));

      return vec4(outR, outG, outB, outA);
    });

    return new MeshBasicNodeMaterial({
      colorNode: ditherShader(),
      transparent: true,
    });
  }

  async loadImage(file, ditherColor = { r: 0, g: 0, b: 0 }) {
    this.currentColor = ditherColor;
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          await this.init();

          // Load texture
          const loader = new THREE.TextureLoader();
          this.imageTexture = await loader.loadAsync(e.target.result);
          this.imageTexture.colorSpace = THREE.SRGBColorSpace;

          // Calculate aspect ratio to fit within the canvas (contain)
          const imgAspect =
            this.imageTexture.image.width / this.imageTexture.image.height;
          const canvasAspect =
            this.canvas.clientWidth / this.canvas.clientHeight;

          // Calculate the visible height at the plane's position (z=0)
          // Using: visibleHeight = 2 * tan(fov/2) * distance
          const vFov = (this.fov * Math.PI) / 180;
          const visibleHeight = 2 * Math.tan(vFov / 2) * this.cameraZ;
          const visibleWidth = visibleHeight * canvasAspect;

          // Calculate plane dimensions to fit within visible area
          let planeWidth, planeHeight;

          if (imgAspect > canvasAspect) {
            // Image is wider - fit to width
            planeWidth = visibleWidth;
            planeHeight = visibleWidth / imgAspect;
          } else {
            // Image is taller - fit to height
            planeHeight = visibleHeight;
            planeWidth = visibleHeight * imgAspect;
          }

          // Scale factor to leave padding and account for rotation
          const scaleFactor = 0.6;

          // Create plane geometry
          const geometry = new THREE.PlaneGeometry(
            planeWidth * scaleFactor,
            planeHeight * scaleFactor,
          );

          // Random dither dot scale (between 1 and 4 for variety)
          this.currentDitherScale = 1 + Math.random() * 3;

          // Create dithered material
          const material = this.createDitherMaterial(
            this.imageTexture,
            this.currentColor,
            this.currentDitherScale,
          );

          // Remove existing mesh if any
          if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
          }

          this.mesh = new THREE.Mesh(geometry, material);

          // Add random rotation on all axes for dynamism
          this.mesh.rotation.x = (Math.random() - 0.5) * 0.3; // Random X rotation
          this.mesh.rotation.y = (Math.random() - 0.5) * 0.3; // Random Y rotation
          this.mesh.rotation.z = (Math.random() - 0.5) * 0.3; // Random Z rotation

          this.scene.add(this.mesh);

          // Render
          this.render();

          resolve();
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  render() {
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  // Update the dither color and re-render
  updateColor(ditherColor) {
    if (!this.mesh || !this.imageTexture) return;

    this.currentColor = ditherColor;

    // Dispose old material
    if (this.mesh.material) {
      this.mesh.material.dispose();
    }

    // Create new material with updated color (keep same dither scale)
    this.mesh.material = this.createDitherMaterial(
      this.imageTexture,
      ditherColor,
      this.currentDitherScale || 1.0,
    );
    this.render();
  }

  // Randomize rotation and dither scale
  randomize(ditherColor) {
    if (!this.mesh || !this.imageTexture) return;

    this.currentColor = ditherColor;

    // Randomize rotation on all axes
    this.mesh.rotation.x = (Math.random() - 0.5) * 0.3;
    this.mesh.rotation.y = (Math.random() - 0.5) * 0.3;
    this.mesh.rotation.z = (Math.random() - 0.5) * 0.3;

    // Randomize dither scale
    this.currentDitherScale = 1 + Math.random() * 3;

    // Dispose old material
    if (this.mesh.material) {
      this.mesh.material.dispose();
    }

    // Create new material with updated color and new dither scale
    this.mesh.material = this.createDitherMaterial(
      this.imageTexture,
      ditherColor,
      this.currentDitherScale,
    );
    this.render();
  }

  resize() {
    if (!this.renderer || !this.camera) return;

    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;

    // Update camera aspect ratio for perspective camera
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.render();
  }

  clear() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh = null;
    }

    if (this.imageTexture) {
      this.imageTexture.dispose();
      this.imageTexture = null;
    }

    if (this.renderer) {
      this.renderer.clear();
    }

    // Clear the canvas
    const ctx = this.canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  dispose() {
    this.clear();
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
    this.isInitialized = false;
  }
}
