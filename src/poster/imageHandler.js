import * as THREE from "three";
import { WebGPURenderer } from "three/webgpu";

/**
 * Image Handler with Floyd-Steinberg Dithering
 * Creates a dithered background for the poster using error diffusion
 */

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

  /**
   * Floyd-Steinberg dithering on CPU
   * Returns a canvas with the dithered image
   */
  applyFloydSteinberg(img, color = { r: 0, g: 0, b: 0 }, scale = 1) {
    // Create a smaller canvas for pixelated effect (scale controls dot size)
    const targetWidth = Math.ceil(img.width / scale);
    const targetHeight = Math.ceil(img.height / scale);

    // Work canvas at reduced size
    const workCanvas = document.createElement("canvas");
    workCanvas.width = targetWidth;
    workCanvas.height = targetHeight;
    const workCtx = workCanvas.getContext("2d", { willReadFrequently: true });

    // Draw image scaled down
    workCtx.drawImage(img, 0, 0, targetWidth, targetHeight);
    const imageData = workCtx.getImageData(0, 0, targetWidth, targetHeight);
    const data = imageData.data;

    // Floyd-Steinberg error diffusion
    for (let y = 0; y < targetHeight; y++) {
      for (let x = 0; x < targetWidth; x++) {
        const idx = (y * targetWidth + x) * 4;

        // Get grayscale value using luminance
        const oldGray =
          data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;

        // Quantize to black or white
        const newGray = oldGray > 127 ? 255 : 0;
        const error = oldGray - newGray;

        // Set pixel - use color for dark pixels, transparent for light
        if (newGray === 0) {
          // Dark pixel - use the dither color
          data[idx] = color.r * 255;
          data[idx + 1] = color.g * 255;
          data[idx + 2] = color.b * 255;
          data[idx + 3] = 255;
        } else {
          // Light pixel - make transparent
          data[idx] = 255;
          data[idx + 1] = 255;
          data[idx + 2] = 255;
          data[idx + 3] = 0;
        }

        // Distribute error to neighboring pixels (Floyd-Steinberg coefficients)
        // Right pixel: 7/16
        if (x + 1 < targetWidth) {
          const rightIdx = (y * targetWidth + x + 1) * 4;
          this.addError(data, rightIdx, error, 7 / 16);
        }

        // Bottom-left pixel: 3/16
        if (x - 1 >= 0 && y + 1 < targetHeight) {
          const blIdx = ((y + 1) * targetWidth + x - 1) * 4;
          this.addError(data, blIdx, error, 3 / 16);
        }

        // Bottom pixel: 5/16
        if (y + 1 < targetHeight) {
          const bottomIdx = ((y + 1) * targetWidth + x) * 4;
          this.addError(data, bottomIdx, error, 5 / 16);
        }

        // Bottom-right pixel: 1/16
        if (x + 1 < targetWidth && y + 1 < targetHeight) {
          const brIdx = ((y + 1) * targetWidth + x + 1) * 4;
          this.addError(data, brIdx, error, 1 / 16);
        }
      }
    }

    // Put processed data back
    workCtx.putImageData(imageData, 0, 0);

    // Create output canvas at original size with nearest-neighbor scaling
    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = img.width;
    outputCanvas.height = img.height;
    const outputCtx = outputCanvas.getContext("2d");

    // Use nearest-neighbor for crisp pixels
    outputCtx.imageSmoothingEnabled = false;
    outputCtx.drawImage(workCanvas, 0, 0, img.width, img.height);

    return outputCanvas;
  }

  // Helper to add error to a pixel's RGB values
  addError(data, idx, error, factor) {
    const adjustment = error * factor;
    // Add to all RGB channels (they should be same for grayscale input)
    data[idx] = Math.max(0, Math.min(255, data[idx] + adjustment));
    data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + adjustment));
    data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + adjustment));
  }

  /**
   * Create a Three.js texture from the dithered canvas
   */
  createDitheredTexture(img, color, scale) {
    const ditheredCanvas = this.applyFloydSteinberg(img, color, scale);
    const texture = new THREE.CanvasTexture(ditheredCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    return texture;
  }

  async loadImage(file, ditherColor = { r: 0, g: 0, b: 0 }) {
    this.currentColor = ditherColor;
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          await this.init();

          // Load original image (need to keep it for re-dithering)
          const img = new Image();
          img.onload = async () => {
            this.originalImage = img;

            // Calculate aspect ratio to fit within the canvas (contain)
            const imgAspect = img.width / img.height;
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

            // Create Floyd-Steinberg dithered texture
            const ditheredTexture = this.createDitheredTexture(
              img,
              this.currentColor,
              this.currentDitherScale,
            );

            // Simple material with dithered texture
            const material = new THREE.MeshBasicMaterial({
              map: ditheredTexture,
              transparent: true,
            });

            // Remove existing mesh if any
            if (this.mesh) {
              this.scene.remove(this.mesh);
              this.mesh.geometry.dispose();
              if (this.mesh.material.map) {
                this.mesh.material.map.dispose();
              }
              this.mesh.material.dispose();
            }

            this.mesh = new THREE.Mesh(geometry, material);

            // Add random rotation on all axes for dynamism
            this.mesh.rotation.x = (Math.random() - 0.5) * 0.3;
            this.mesh.rotation.y = (Math.random() - 0.5) * 0.3;
            this.mesh.rotation.z = (Math.random() - 0.5) * 0.3;

            this.scene.add(this.mesh);

            // Render
            this.render();

            resolve();
          };
          img.onerror = reject;
          img.src = e.target.result;
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
    if (!this.mesh || !this.originalImage) return;

    this.currentColor = ditherColor;

    // Dispose old texture and material
    if (this.mesh.material.map) {
      this.mesh.material.map.dispose();
    }
    if (this.mesh.material) {
      this.mesh.material.dispose();
    }

    // Create new dithered texture with updated color (keep same dither scale)
    const ditheredTexture = this.createDitheredTexture(
      this.originalImage,
      ditherColor,
      this.currentDitherScale || 1.0,
    );

    this.mesh.material = new THREE.MeshBasicMaterial({
      map: ditheredTexture,
      transparent: true,
    });
    this.render();
  }

  // Randomize rotation and dither scale
  randomize(ditherColor) {
    if (!this.mesh || !this.originalImage) return;

    this.currentColor = ditherColor;

    // Randomize rotation on all axes
    this.mesh.rotation.x = (Math.random() - 0.5) * 0.3;
    this.mesh.rotation.y = (Math.random() - 0.5) * 0.3;
    this.mesh.rotation.z = (Math.random() - 0.5) * 0.3;

    // Randomize dither scale
    this.currentDitherScale = 1 + Math.random() * 3;

    // Dispose old texture and material
    if (this.mesh.material.map) {
      this.mesh.material.map.dispose();
    }
    if (this.mesh.material) {
      this.mesh.material.dispose();
    }

    // Create new dithered texture with updated color and new dither scale
    const ditheredTexture = this.createDitheredTexture(
      this.originalImage,
      ditherColor,
      this.currentDitherScale,
    );

    this.mesh.material = new THREE.MeshBasicMaterial({
      map: ditheredTexture,
      transparent: true,
    });
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
      if (this.mesh.material.map) {
        this.mesh.material.map.dispose();
      }
      this.mesh.material.dispose();
      this.mesh = null;
    }

    // Clear original image reference
    this.originalImage = null;

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
