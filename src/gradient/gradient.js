import * as THREE from "three";
import { Pane } from "tweakpane";
import "../scss/gradient.scss";

const MAX_POINTS = 5;
const BASE_EXPORT_WIDTH = 1600;
const MAX_PIXEL_RATIO = 2;
const RENDER_MODES = ["Points", "Flow", "Voronoi", "Aurora"];

const ASPECT_RATIOS = {
  Landscape: 16 / 10,
  Square: 1,
  Poster: 4 / 5,
  Portrait: 9 / 16,
  Ultrawide: 21 / 9,
};

const PALETTES = [
  ["#f76f8e", "#ffb36b", "#ffe66d", "#7ae7c7", "#6366f1"],
  ["#201335", "#5f4bff", "#00c2ff", "#8ef6e4", "#f4f4ed"],
  ["#1b1b1b", "#ff5d8f", "#f7b267", "#fef3c7", "#7dd3fc"],
  ["#031926", "#468189", "#77aca2", "#9dbebb", "#f4e9cd"],
  ["#120c28", "#3b1c64", "#ff7a59", "#ffd166", "#f8ffe5"],
  ["#071013", "#23b5d3", "#75abbc", "#a2aebb", "#dfe0e2"],
];

const exportParams = {
  aspect: "Landscape",
  scale: 2,
};

const fieldParams = {
  mode: "Points",
  background: "#090909",
  softness: 1.55,
  blend: 2.1,
  warp: 0.18,
  warpScale: 1.75,
  flowScale: 2.2,
  flowStrength: 0.78,
  flowDetail: 0.55,
  flowBlur: 1.1,
  voronoiEdgeBlur: 1.75,
  voronoiGaussianBlur: 0.9,
  voronoiStrength: 0.92,
  auroraScale: 1.9,
  auroraIntensity: 0.82,
  auroraBands: 3.8,
  auroraBlur: 1.35,
};

const grainParams = {
  enabled: true,
  amount: 0.1,
  scale: 2.4,
  colored: false,
};

const pointParams = [
  { color: "#f76f8e", x: 0.11, y: 0.22 },
  { color: "#ffb36b", x: 0.82, y: 0.16 },
  { color: "#ffe66d", x: 0.66, y: 0.78 },
  { color: "#7ae7c7", x: 0.17, y: 0.8 },
  { color: "#6366f1", x: 0.48, y: 0.48 },
];

const previewShell = document.getElementById("gradient-preview-shell");
const canvas = document.getElementById("gradient-canvas");
const paneHost = document.getElementById("pane");
const imageDropZone = document.getElementById("image-dropzone");
const imageUpload = document.getElementById("image-upload");
const sourceImagePreview = document.getElementById("source-image-preview");
const imageStatus = document.getElementById("image-status");

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const geometry = new THREE.PlaneGeometry(2, 2);

const uniforms = {
  uResolution: { value: new THREE.Vector2(1, 1) },
  uBackground: { value: new THREE.Color(fieldParams.background) },
  uRenderMode: { value: 0 },
  uSoftness: { value: fieldParams.softness },
  uBlend: { value: fieldParams.blend },
  uWarp: { value: fieldParams.warp },
  uWarpScale: { value: fieldParams.warpScale },
  uFlowScale: { value: fieldParams.flowScale },
  uFlowStrength: { value: fieldParams.flowStrength },
  uFlowDetail: { value: fieldParams.flowDetail },
  uFlowBlur: { value: fieldParams.flowBlur },
  uVoronoiEdgeBlur: { value: fieldParams.voronoiEdgeBlur },
  uVoronoiGaussianBlur: { value: fieldParams.voronoiGaussianBlur },
  uVoronoiStrength: { value: fieldParams.voronoiStrength },
  uAuroraScale: { value: fieldParams.auroraScale },
  uAuroraIntensity: { value: fieldParams.auroraIntensity },
  uAuroraBands: { value: fieldParams.auroraBands },
  uAuroraBlur: { value: fieldParams.auroraBlur },
  uGrainEnabled: { value: grainParams.enabled ? 1 : 0 },
  uGrainAmount: { value: grainParams.amount },
  uGrainScale: { value: grainParams.scale },
  uGrainColored: { value: grainParams.colored ? 1 : 0 },
  uColors: {
    value: pointParams.map((point) => new THREE.Color(point.color)),
  },
  uPoints: {
    value: pointParams.map((point) => new THREE.Vector2(point.x, point.y)),
  },
};

const material = new THREE.ShaderMaterial({
  uniforms,
  vertexShader: `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `,
  fragmentShader: `
    precision highp float;

    #define POINT_COUNT ${MAX_POINTS}
    #define MIN_RADIUS 0.22
    #define MAX_RADIUS 1.05
    #define SOFTNESS_RANGE 2.8
    #define MIN_SHARPNESS 0.85
    #define MAX_SHARPNESS 8.0
    #define MIN_COVERAGE_GAIN 1.5
    #define MAX_COVERAGE_GAIN 2.5
    #define GRAIN_BASE_FREQUENCY 0.35
    #define GRAIN_R_FREQUENCY 0.21
    #define GRAIN_G_FREQUENCY 0.19
    #define GRAIN_B_FREQUENCY 0.23
    #define FLOW_OCTAVES 5
    #define CURL_EPSILON 0.01

    varying vec2 vUv;

    uniform vec2 uResolution;
    uniform vec3 uBackground;
    uniform float uRenderMode;
    uniform float uSoftness;
    uniform float uBlend;
    uniform float uWarp;
    uniform float uWarpScale;
    uniform float uFlowScale;
    uniform float uFlowStrength;
    uniform float uFlowDetail;
    uniform float uFlowBlur;
    uniform float uVoronoiEdgeBlur;
    uniform float uVoronoiGaussianBlur;
    uniform float uVoronoiStrength;
    uniform float uAuroraScale;
    uniform float uAuroraIntensity;
    uniform float uAuroraBands;
    uniform float uAuroraBlur;
    uniform float uGrainEnabled;
    uniform float uGrainAmount;
    uniform float uGrainScale;
    uniform float uGrainColored;
    uniform vec3 uColors[POINT_COUNT];
    uniform vec2 uPoints[POINT_COUNT];

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);

      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));

      return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
    }

    vec3 toLinear(vec3 color) {
      return pow(color, vec3(2.2));
    }

    vec3 toSrgb(vec3 color) {
      return pow(clamp(color, 0.0, 1.0), vec3(1.0 / 2.2));
    }

    vec2 warpUv(vec2 uv) {
      float x = noise(uv * uWarpScale + vec2(0.0, 3.7));
      float y = noise(uv * uWarpScale + vec2(5.2, 1.3));
      return uv + (vec2(x, y) - 0.5) * uWarp;
    }

    vec2 auroraWarpUv(vec2 uv) {
      float x1 = noise(uv * uWarpScale + vec2(0.0, 3.7));
      float y1 = noise(uv * uWarpScale + vec2(5.2, 1.3));
      vec2 warp1 = uv + (vec2(x1, y1) - 0.5) * uWarp;

      float x2 = noise(warp1 * uWarpScale * 2.1 + vec2(1.7, 9.2));
      float y2 = noise(warp1 * uWarpScale * 2.1 + vec2(8.3, 2.8));
      return warp1 + (vec2(x2, y2) - 0.5) * uWarp * 0.5;
    }

    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;

      for (int i = 0; i < FLOW_OCTAVES; i++) {
        value += amplitude * noise(p);
        p *= 2.0;
        amplitude *= 0.5;
      }

      return value;
    }

    vec2 curlNoise(vec2 p) {
      float n1 = noise(p + vec2(0.0, CURL_EPSILON));
      float n2 = noise(p - vec2(0.0, CURL_EPSILON));
      float n3 = noise(p + vec2(CURL_EPSILON, 0.0));
      float n4 = noise(p - vec2(CURL_EPSILON, 0.0));

      float dydx = (n1 - n2) / (2.0 * CURL_EPSILON);
      float dxdy = (n3 - n4) / (2.0 * CURL_EPSILON);
      return vec2(dydx, -dxdy);
    }

    vec3 samplePalette(float t) {
      float scaled = clamp(t, 0.0, 0.9999) * float(POINT_COUNT - 1);
      float index = floor(scaled);
      float mixAmount = fract(scaled);

      if (index < 1.0) {
        return mix(uColors[0], uColors[1], mixAmount);
      }
      if (index < 2.0) {
        return mix(uColors[1], uColors[2], mixAmount);
      }
      if (index < 3.0) {
        return mix(uColors[2], uColors[3], mixAmount);
      }
      return mix(uColors[3], uColors[4], mixAmount);
    }

    vec3 samplePaletteLinear(float t) {
      return toLinear(samplePalette(t));
    }

    vec3 renderPointField(vec2 uv) {
      vec3 colorSum = vec3(0.0);
      float totalWeight = 0.0;
      vec3 background = toLinear(uBackground);

      for (int i = 0; i < POINT_COUNT; i++) {
        vec2 delta = uv - uPoints[i];
        delta.x *= uResolution.x / max(uResolution.y, 1.0);

        float dist = length(delta);
        float radius = mix(
          MIN_RADIUS,
          MAX_RADIUS,
          clamp(uSoftness / SOFTNESS_RANGE, 0.0, 1.0)
        );
        float normalizedDist = dist / max(radius, 0.0001);
        float sharpness = mix(MAX_SHARPNESS, MIN_SHARPNESS, clamp(uSoftness / SOFTNESS_RANGE, 0.0, 1.0)) * max(0.35, uBlend);
        float weight = exp(-(normalizedDist * normalizedDist) * sharpness);

        colorSum += toLinear(uColors[i]) * weight;
        totalWeight += weight;
      }

      vec3 base = background;
      if (totalWeight > 0.0) {
        vec3 gradientColor = colorSum / totalWeight;
        float coverageGain = mix(MIN_COVERAGE_GAIN, MAX_COVERAGE_GAIN, clamp(uSoftness / SOFTNESS_RANGE, 0.0, 1.0));
        float presence = 1.0 - exp(-totalWeight * coverageGain);
        base = mix(background, gradientColor, presence);
      }

      return base;
    }

    vec3 renderFlowFieldBase(vec2 uv) {
      vec2 aspectUv = uv;
      aspectUv.x *= uResolution.x / max(uResolution.y, 1.0);

      vec2 flowDomain = aspectUv * uWarpScale;
      vec2 flowWarp = curlNoise(flowDomain) * uWarp * 1.35;
      aspectUv += flowWarp;

      vec2 flowUv = aspectUv * uFlowScale;
      float major = fbm(flowUv + vec2(0.0, 4.1));
      float secondary = fbm(flowUv * 1.7 + vec2(2.7, 9.2));
      float ridge = fbm(flowUv * 0.9 + vec2(8.3, 1.4));
      float turbulence = fbm(flowUv * 2.3 + vec2(4.5, 6.8));

      float palettePositionA = clamp(
        major * 0.45 + secondary * 0.35 + ridge * 0.2,
        0.0,
        1.0
      );
      float palettePositionB = clamp(
        ridge * 0.4 + turbulence * 0.4 + major * 0.2,
        0.0,
        1.0
      );
      float detailOffset = (turbulence - 0.5) * uFlowDetail;
      vec3 background = toLinear(uBackground);
      vec3 baseColor = samplePaletteLinear(palettePositionA);
      vec3 detailColor = samplePaletteLinear(clamp(palettePositionB + detailOffset, 0.0, 1.0));
      float veil = smoothstep(0.08, 0.92, major * 0.8 + secondary * 0.25 + ridge * 0.35);
      float highlight = smoothstep(0.3, 1.0, turbulence * 0.65 + ridge * 0.45);
      vec3 flowColor = mix(baseColor, detailColor, clamp(highlight * uFlowStrength, 0.0, 1.0));
      float presence = clamp(0.35 + veil * (0.7 + uFlowStrength * 0.25), 0.0, 1.0);

      return mix(background, flowColor, presence);
    }

    vec3 renderFlowField(vec2 uv) {
      vec2 blurStep = vec2(1.0 / max(uResolution.x, 1.0), 1.0 / max(uResolution.y, 1.0)) * uFlowBlur * 10.0;
      vec3 color = renderFlowFieldBase(uv) * 0.227027;
      color += renderFlowFieldBase(uv + vec2( blurStep.x, 0.0)) * 0.1945946;
      color += renderFlowFieldBase(uv + vec2(-blurStep.x, 0.0)) * 0.1945946;
      color += renderFlowFieldBase(uv + vec2(0.0,  blurStep.y)) * 0.1216216;
      color += renderFlowFieldBase(uv + vec2(0.0, -blurStep.y)) * 0.1216216;
      color += renderFlowFieldBase(uv + blurStep) * 0.0702703;
      color += renderFlowFieldBase(uv - blurStep) * 0.0702703;

      return color;
    }

    vec3 renderVoronoiFieldBase(vec2 uv) {
      float nearestDist = 9999.0;
      float secondDist = 9999.0;
      int nearestIndex = 0;
      int secondIndex = 1;

      for (int i = 0; i < POINT_COUNT; i++) {
        vec2 delta = uv - uPoints[i];
        delta.x *= uResolution.x / max(uResolution.y, 1.0);
        float dist = length(delta);

        if (dist < nearestDist) {
          secondDist = nearestDist;
          secondIndex = nearestIndex;
          nearestDist = dist;
          nearestIndex = i;
        } else if (dist < secondDist) {
          secondDist = dist;
          secondIndex = i;
        }
      }

      vec3 background = toLinear(uBackground);
      float blendWidth = mix(0.01, 0.75, clamp(uVoronoiEdgeBlur / 5.0, 0.0, 1.0));
      float boundary = (secondDist - nearestDist) / max(nearestDist + secondDist, 0.0001);
      float dominance = smoothstep(0.0, blendWidth, boundary);
      vec3 nearestColor = toLinear(uColors[nearestIndex]);
      vec3 secondColor = toLinear(uColors[secondIndex]);
      vec3 cellColor = mix(secondColor, nearestColor, dominance);

      return mix(background, cellColor, clamp(uVoronoiStrength, 0.0, 1.0));
    }

    vec3 renderVoronoiField(vec2 uv) {
      vec2 texel = vec2(1.0 / max(uResolution.x, 1.0), 1.0 / max(uResolution.y, 1.0));
      vec2 blurStep = texel * uVoronoiGaussianBlur * 4.0;
      vec3 color = vec3(0.0);

      // 5x5 separable Gaussian kernel. A denser kernel prevents the ghosted
      // boundary copies caused by large, sparse blur samples.
      for (int x = -2; x <= 2; x++) {
        for (int y = -2; y <= 2; y++) {
          float wx = x == 0 ? 0.38774 : (abs(x) == 1 ? 0.24477 : 0.06136);
          float wy = y == 0 ? 0.38774 : (abs(y) == 1 ? 0.24477 : 0.06136);
          vec2 offset = vec2(float(x), float(y)) * blurStep;
          color += renderVoronoiFieldBase(uv + offset) * wx * wy;
        }
      }

      return color;
    }

    vec3 renderAuroraFieldBase(vec2 uv) {
      vec2 aspectUv = auroraWarpUv(uv);
      aspectUv.x *= uResolution.x / max(uResolution.y, 1.0);

      vec2 auroraUv = aspectUv * uAuroraScale;
      float veil = fbm(auroraUv + vec2(0.0, 2.3));
      float drift = fbm(auroraUv * 1.6 + vec2(4.7, 1.9));
      float wave = sin((aspectUv.y + drift * 0.65) * uAuroraBands * 6.28318 + veil * 4.0);
      float curtain = smoothstep(-0.4, 0.9, wave * 0.5 + veil * 0.9);
      float accent = smoothstep(0.25, 1.0, fbm(auroraUv * 2.1 + vec2(8.1, 3.2)) + wave * 0.2);

      float palettePosition = clamp(0.15 + veil * 0.45 + drift * 0.25 + wave * 0.08, 0.0, 1.0);
      vec3 background = toLinear(uBackground);
      vec3 baseRibbon = samplePaletteLinear(palettePosition);
      vec3 accentRibbon = samplePaletteLinear(clamp(palettePosition + 0.18 + accent * 0.16, 0.0, 1.0));
      vec3 ribbonColor = mix(baseRibbon, accentRibbon, accent * 0.7);
      float presence = clamp(curtain * (0.45 + uAuroraIntensity * 0.8) + accent * 0.2, 0.0, 1.0);

      return mix(background, ribbonColor, presence);
    }

    vec3 renderAuroraField(vec2 uv) {
      vec2 blurStep = vec2(1.0 / max(uResolution.x, 1.0), 1.0 / max(uResolution.y, 1.0)) * uAuroraBlur * 12.0;
      vec3 color = renderAuroraFieldBase(uv) * 0.227027;
      color += renderAuroraFieldBase(uv + vec2( blurStep.x, 0.0)) * 0.1945946;
      color += renderAuroraFieldBase(uv + vec2(-blurStep.x, 0.0)) * 0.1945946;
      color += renderAuroraFieldBase(uv + vec2(0.0,  blurStep.y)) * 0.1216216;
      color += renderAuroraFieldBase(uv + vec2(0.0, -blurStep.y)) * 0.1216216;
      color += renderAuroraFieldBase(uv + blurStep) * 0.0702703;
      color += renderAuroraFieldBase(uv - blurStep) * 0.0702703;

      return color;
    }

    void main() {
      vec2 uv = warpUv(vUv);
      vec3 base = renderPointField(uv);

      if (uRenderMode > 2.5) {
        base = renderAuroraField(vUv);
      } else if (uRenderMode > 1.5) {
        base = renderVoronoiField(uv);
      } else if (uRenderMode > 0.5) {
        base = renderFlowField(vUv);
      }

      if (uGrainEnabled > 0.5) {
        float grain = noise(gl_FragCoord.xy * GRAIN_BASE_FREQUENCY * uGrainScale);
        vec3 grainTint = uGrainColored > 0.5
          ? vec3(
              noise(gl_FragCoord.xy * GRAIN_R_FREQUENCY * uGrainScale + vec2(17.0, 2.0)),
              noise(gl_FragCoord.xy * GRAIN_G_FREQUENCY * uGrainScale + vec2(4.0, 31.0)),
              noise(gl_FragCoord.xy * GRAIN_B_FREQUENCY * uGrainScale + vec2(23.0, 11.0))
            ) - 0.5
          : vec3(grain - 0.5);
        base += grainTint * uGrainAmount;
      }

      gl_FragColor = vec4(toSrgb(base), 1.0);
    }
  `,
});

const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

const renderer = createRenderer(canvas);

let needsRender = false;
let activePaletteAnimation = 0;
let currentThumbnailUrl = "";

function createRenderer(targetCanvas) {
  const nextRenderer = new THREE.WebGLRenderer({
    canvas: targetCanvas,
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true,
  });

  nextRenderer.outputColorSpace = THREE.SRGBColorSpace;
  nextRenderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
  return nextRenderer;
}

function getSelectedAspect() {
  return ASPECT_RATIOS[exportParams.aspect] || 1;
}

function setAspectRatio() {
  previewShell.style.setProperty("--gradient-aspect", `${getSelectedAspect()}`);
}

function syncFieldUniforms() {
  uniforms.uBackground.value.set(fieldParams.background);
  uniforms.uRenderMode.value =
    fieldParams.mode === "Aurora"
      ? 3
      : fieldParams.mode === "Voronoi"
        ? 2
        : fieldParams.mode === "Flow"
          ? 1
          : 0;
  uniforms.uSoftness.value = fieldParams.softness;
  uniforms.uBlend.value = fieldParams.blend;
  uniforms.uWarp.value = fieldParams.warp;
  uniforms.uWarpScale.value = fieldParams.warpScale;
  uniforms.uFlowScale.value = fieldParams.flowScale;
  uniforms.uFlowStrength.value = fieldParams.flowStrength;
  uniforms.uFlowDetail.value = fieldParams.flowDetail;
  uniforms.uFlowBlur.value = fieldParams.flowBlur;
  uniforms.uVoronoiEdgeBlur.value = fieldParams.voronoiEdgeBlur;
  uniforms.uVoronoiGaussianBlur.value = fieldParams.voronoiGaussianBlur;
  uniforms.uVoronoiStrength.value = fieldParams.voronoiStrength;
  uniforms.uAuroraScale.value = fieldParams.auroraScale;
  uniforms.uAuroraIntensity.value = fieldParams.auroraIntensity;
  uniforms.uAuroraBands.value = fieldParams.auroraBands;
  uniforms.uAuroraBlur.value = fieldParams.auroraBlur;
}

function syncGrainUniforms() {
  uniforms.uGrainEnabled.value = grainParams.enabled ? 1 : 0;
  uniforms.uGrainAmount.value = grainParams.amount;
  uniforms.uGrainScale.value = grainParams.scale;
  uniforms.uGrainColored.value = grainParams.colored ? 1 : 0;
}

function syncPointUniforms() {
  pointParams.forEach((point, index) => {
    uniforms.uColors.value[index].set(point.color);
    uniforms.uPoints.value[index].set(point.x, point.y);
  });
}

function syncUniforms() {
  syncFieldUniforms();
  syncGrainUniforms();
  syncPointUniforms();
}

function requestRender() {
  needsRender = true;
}

function applyState({ refreshPane = false, updateAspect = false, resize = false } = {}) {
  if (updateAspect) {
    setAspectRatio();
  }

  if (refreshPane) {
    pane.refresh();
  }

  if (resize) {
    resizeRenderer();
    return;
  }

  requestRender();
}

function renderScene(targetRenderer) {
  targetRenderer.render(scene, camera);
}

function tick() {
  if (needsRender) {
    syncUniforms();
    renderScene(renderer);
    needsRender = false;
  }

  window.requestAnimationFrame(tick);
}

function resizeRenderer() {
  const { clientWidth, clientHeight } = previewShell;
  if (!clientWidth || !clientHeight) return;

  renderer.setSize(clientWidth, clientHeight, false);
  uniforms.uResolution.value.set(clientWidth, clientHeight);
  requestRender();
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function randomizePalette() {
  const palette = PALETTES[Math.floor(Math.random() * PALETTES.length)];
  palette.forEach((color, index) => {
    pointParams[index].color = color;
  });
}

function randomizeField() {
  pointParams.forEach((point) => {
    point.x = randomBetween(0.08, 0.92);
    point.y = randomBetween(0.08, 0.92);
  });

  fieldParams.softness = randomBetween(1.15, 2.25);
  fieldParams.blend = randomBetween(0.75, 1.35);
  fieldParams.warp = randomBetween(0.04, 0.22);
  fieldParams.warpScale = randomBetween(1.1, 2.8);
  fieldParams.flowScale = randomBetween(1.1, 3.6);
  fieldParams.flowStrength = randomBetween(0.45, 1.0);
  fieldParams.flowDetail = randomBetween(0.2, 0.85);
  fieldParams.flowBlur = randomBetween(0.2, 4.2);
  fieldParams.voronoiEdgeBlur = randomBetween(0.7, 3.4);
  fieldParams.voronoiGaussianBlur = randomBetween(0, 3.2);
  fieldParams.voronoiStrength = randomBetween(0.82, 1.0);
  fieldParams.auroraScale = randomBetween(1.1, 3.2);
  fieldParams.auroraIntensity = randomBetween(0.45, 1.0);
  fieldParams.auroraBands = randomBetween(2.1, 6.2);
  fieldParams.auroraBlur = randomBetween(0.35, 4.4);
  grainParams.amount = randomBetween(0.04, 0.14);
  grainParams.scale = randomBetween(1.2, 3.4);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function componentToHex(value) {
  return Math.round(clamp(value, 0, 255)).toString(16).padStart(2, "0");
}

function rgbToHex({ r, g, b }) {
  return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`;
}

function hexToRgb(hex) {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return match
    ? {
        r: parseInt(match[1], 16),
        g: parseInt(match[2], 16),
        b: parseInt(match[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

function rgbToXyz({ r, g, b }) {
  const normalize = (value) => {
    const channel = value / 255;
    return channel > 0.04045
      ? Math.pow((channel + 0.055) / 1.055, 2.4)
      : channel / 12.92;
  };

  const nr = normalize(r);
  const ng = normalize(g);
  const nb = normalize(b);

  return {
    x: (nr * 0.4124 + ng * 0.3576 + nb * 0.1805) / 0.95047,
    y: nr * 0.2126 + ng * 0.7152 + nb * 0.0722,
    z: (nr * 0.0193 + ng * 0.1192 + nb * 0.9505) / 1.08883,
  };
}

function rgbToLab(rgb) {
  const xyz = rgbToXyz(rgb);
  const transform = (value) =>
    value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116;

  const x = transform(xyz.x);
  const y = transform(xyz.y);
  const z = transform(xyz.z);

  return {
    l: 116 * y - 16,
    a: 500 * (x - y),
    b: 200 * (y - z),
  };
}

function labDistance(a, b) {
  return Math.hypot(a.l - b.l, a.a - b.a, a.b - b.b);
}

function getChroma(lab) {
  return Math.hypot(lab.a, lab.b);
}

function pickInitialCentroids(samples, count) {
  const sorted = [...samples].sort(
    (a, b) => getChroma(b.lab) + b.lab.l * 0.05 - (getChroma(a.lab) + a.lab.l * 0.05),
  );

  return Array.from({ length: count }, (_, index) => {
    const sample = sorted[Math.floor((index / count) * Math.max(sorted.length - 1, 0))];
    return { ...sample.rgb, lab: { ...sample.lab } };
  });
}

function averagePairwiseDistance(colors) {
  let total = 0;
  let count = 0;

  for (let i = 0; i < colors.length; i += 1) {
    for (let j = i + 1; j < colors.length; j += 1) {
      total += labDistance(colors[i].lab, colors[j].lab);
      count += 1;
    }
  }

  return count ? total / count : 0;
}

function rotateHue({ r, g, b }, degrees) {
  const angle = (degrees * Math.PI) / 180;
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);

  return {
    r: clamp(
      (0.213 + cosA * 0.787 - sinA * 0.213) * r +
        (0.715 - cosA * 0.715 - sinA * 0.715) * g +
        (0.072 - cosA * 0.072 + sinA * 0.928) * b,
      0,
      255,
    ),
    g: clamp(
      (0.213 - cosA * 0.213 + sinA * 0.143) * r +
        (0.715 + cosA * 0.285 + sinA * 0.14) * g +
        (0.072 - cosA * 0.072 - sinA * 0.283) * b,
      0,
      255,
    ),
    b: clamp(
      (0.213 - cosA * 0.213 - sinA * 0.787) * r +
        (0.715 - cosA * 0.715 + sinA * 0.715) * g +
        (0.072 + cosA * 0.928 + sinA * 0.072) * b,
      0,
      255,
    ),
  };
}

function improveExtractedPalette(colors) {
  const vividBase = [...colors].sort(
    (a, b) => getChroma(b.lab) - getChroma(a.lab),
  )[0];
  const adjusted = colors.map((color, index) => {
    const tooDark = color.lab.l < 15;
    const tooNeutral = getChroma(color.lab) < 8;
    const rgb = tooDark && tooNeutral ? rotateHue(vividBase.rgb, index * 28) : color.rgb;
    return { rgb, lab: rgbToLab(rgb) };
  });

  if (averagePairwiseDistance(adjusted) >= 10) return adjusted;

  return adjusted.map((color, index) => {
    const rgb = rotateHue(vividBase.rgb, (index - 2) * 24);
    return { rgb, lab: rgbToLab(rgb) };
  });
}

function pickBackgroundColor(clusters, colors) {
  const scored = colors.map((color, index) => {
    const size = clusters[index]?.samples.length || 0;
    const chroma = getChroma(color.lab);
    const lightness = color.lab.l;
    const normalizedSize = size / Math.max(clusters.reduce((max, cluster) => Math.max(max, cluster.samples.length), 1), 1);
    const neutralityScore = 1 - clamp(chroma / 70, 0, 1);
    const darknessScore = 1 - clamp(Math.abs(lightness - 28) / 40, 0, 1);

    return {
      rgb: color.rgb,
      score: normalizedSize * 0.55 + neutralityScore * 0.25 + darknessScore * 0.2,
    };
  });

  const best = scored.sort((a, b) => b.score - a.score)[0]?.rgb || { r: 9, g: 9, b: 9 };

  return rgbToHex({
    r: best.r * 0.78,
    g: best.g * 0.78,
    b: best.b * 0.78,
  });
}

function kMeansImageSamples(samples, count = MAX_POINTS, iterations = 18) {
  let centroids = pickInitialCentroids(samples, count);
  let clusters = [];

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    clusters = Array.from({ length: count }, () => ({
      samples: [],
      r: 0,
      g: 0,
      b: 0,
      x: 0,
      y: 0,
    }));

    samples.forEach((sample) => {
      let nearest = 0;
      let nearestDistance = Infinity;

      centroids.forEach((centroid, index) => {
        const distance = labDistance(sample.lab, centroid.lab);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = index;
        }
      });

      const cluster = clusters[nearest];
      cluster.samples.push(sample);
      cluster.r += sample.rgb.r;
      cluster.g += sample.rgb.g;
      cluster.b += sample.rgb.b;
      cluster.x += sample.x;
      cluster.y += sample.y;
    });

    centroids = clusters.map((cluster, index) => {
      if (!cluster.samples.length) return centroids[index];

      const rgb = {
        r: cluster.r / cluster.samples.length,
        g: cluster.g / cluster.samples.length,
        b: cluster.b / cluster.samples.length,
      };
      return { ...rgb, lab: rgbToLab(rgb) };
    });
  }

  const palette = improveExtractedPalette(
    centroids.map((centroid) => ({
      rgb: { r: centroid.r, g: centroid.g, b: centroid.b },
      lab: centroid.lab,
    })),
  );

  return {
    background: pickBackgroundColor(clusters, palette),
    points: palette.map((color, index) => {
      const cluster = clusters[index];
      const count = cluster?.samples.length || 1;
      return {
        color: rgbToHex(color.rgb),
        x: clamp((cluster?.x ?? 0.5) / count, 0.02, 0.98),
        y: clamp((cluster?.y ?? 0.5) / count, 0.02, 0.98),
      };
    }),
  };
}

async function extractImageGradient(file) {
  const url = URL.createObjectURL(file);

  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });

    const longestSide = 150;
    const scale = longestSide / Math.max(image.width, image.height);
    const width = Math.max(1, Math.round(image.width * Math.min(1, scale)));
    const height = Math.max(1, Math.round(image.height * Math.min(1, scale)));
    const analysisCanvas = document.createElement("canvas");
    const context = analysisCanvas.getContext("2d", { willReadFrequently: true });

    analysisCanvas.width = width;
    analysisCanvas.height = height;
    context.drawImage(image, 0, 0, width, height);

    const { data } = context.getImageData(0, 0, width, height);
    const samples = [];

    for (let index = 0; index < data.length; index += 4) {
      const alpha = data[index + 3];
      if (alpha < 128) continue;

      const pixelIndex = index / 4;
      const rgb = {
        r: data[index],
        g: data[index + 1],
        b: data[index + 2],
      };

      samples.push({
        rgb,
        lab: rgbToLab(rgb),
        x: (pixelIndex % width) / Math.max(width - 1, 1),
        y: Math.floor(pixelIndex / width) / Math.max(height - 1, 1),
      });
    }

    if (samples.length < MAX_POINTS) {
      throw new Error("Image does not contain enough visible pixels.");
    }

    return kMeansImageSamples(samples);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function animateImagePalette({ points: targetPoints, background: targetBackground }) {
  activePaletteAnimation += 1;
  const animationId = activePaletteAnimation;
  const duration = 800;
  const start = performance.now();
  const initialBackground = hexToRgb(fieldParams.background);
  const targetBackgroundRgb = hexToRgb(targetBackground);
  const initialPoints = pointParams.map((point) => ({
    color: hexToRgb(point.color),
    x: point.x,
    y: point.y,
  }));

  function step(now) {
    if (animationId !== activePaletteAnimation) return;

    const progress = clamp((now - start) / duration, 0, 1);
    const eased = 1 - Math.pow(1 - progress, 3);

    fieldParams.background = rgbToHex({
      r:
        initialBackground.r +
        (targetBackgroundRgb.r - initialBackground.r) * eased,
      g:
        initialBackground.g +
        (targetBackgroundRgb.g - initialBackground.g) * eased,
      b:
        initialBackground.b +
        (targetBackgroundRgb.b - initialBackground.b) * eased,
    });

    pointParams.forEach((point, index) => {
      const targetColor = hexToRgb(targetPoints[index].color);
      const source = initialPoints[index];
      point.color = rgbToHex({
        r: source.color.r + (targetColor.r - source.color.r) * eased,
        g: source.color.g + (targetColor.g - source.color.g) * eased,
        b: source.color.b + (targetColor.b - source.color.b) * eased,
      });
      point.x = source.x + (targetPoints[index].x - source.x) * eased;
      point.y = source.y + (targetPoints[index].y - source.y) * eased;
    });

    pane.refresh();
    requestRender();

    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  }

  window.requestAnimationFrame(step);
}

async function handleImageUpload(file) {
  if (!file?.type.startsWith("image/")) return;

  imageStatus.textContent = "Analyzing image...";

  try {
    const extractedGradient = await extractImageGradient(file);

    if (currentThumbnailUrl) URL.revokeObjectURL(currentThumbnailUrl);
    currentThumbnailUrl = URL.createObjectURL(file);
    sourceImagePreview.src = currentThumbnailUrl;
    sourceImagePreview.hidden = false;
    imageDropZone.classList.add("has-preview");
    imageStatus.textContent = file.name;
    animateImagePalette(extractedGradient);
  } catch (error) {
    console.error("Error extracting image palette:", error);
    imageStatus.textContent = "Could not read image";
    alert("Could not extract a palette from that image. Try another file.");
  }
}

function updateModeVisibility() {
  const isPoints = fieldParams.mode === "Points";
  const isVoronoi = fieldParams.mode === "Voronoi";

  positionFolder.hidden = !isPoints && !isVoronoi;
  pointsFolder.hidden = !isPoints;
  flowFolder.hidden = fieldParams.mode !== "Flow";
  voronoiFolder.hidden = !isVoronoi;
  auroraFolder.hidden = fieldParams.mode !== "Aurora";
}

async function exportGradient() {
  const aspect = getSelectedAspect();
  const exportWidth = BASE_EXPORT_WIDTH * exportParams.scale;
  const exportHeight = Math.round(exportWidth / aspect);

  const exportCanvas = document.createElement("canvas");
  const exportRenderer = createRenderer(exportCanvas);

  try {
    exportRenderer.setPixelRatio(1);
    exportRenderer.setSize(exportWidth, exportHeight, false);

    const previousResolution = uniforms.uResolution.value.clone();
    uniforms.uResolution.value.set(exportWidth, exportHeight);
    syncUniforms();
    renderScene(exportRenderer);

    const link = document.createElement("a");
    link.download = `mesh-gradient-${exportParams.aspect.toLowerCase()}.png`;
    link.href = exportRenderer.domElement.toDataURL("image/png");
    link.click();

    uniforms.uResolution.value.copy(previousResolution);
    requestRender();
  } finally {
    exportRenderer.dispose();
  }
}

const pane = new Pane({
  container: paneHost,
  title: "Gradient Controls",
});

const aspectBinding = pane.addBinding(exportParams, "aspect", {
  options: Object.fromEntries(
    Object.keys(ASPECT_RATIOS).map((key) => [key, key]),
  ),
  label: "aspect",
});

pane.addBinding(exportParams, "scale", {
  min: 1,
  max: 4,
  step: 1,
  label: "export scale",
});

const fieldFolder = pane.addFolder({ title: "Field" });
const modeBinding = fieldFolder.addBinding(fieldParams, "mode", {
  options: {
    Points: "Points",
    Flow: "Flow",
    Voronoi: "Voronoi",
    Aurora: "Aurora",
  },
});
fieldFolder.addBinding(fieldParams, "background", { view: "color" });
const pointsFolder = pane.addFolder({ title: "Point Field" });
pointsFolder.addBinding(fieldParams, "softness", {
  min: 0.7,
  max: 2.8,
  step: 0.01,
});
pointsFolder.addBinding(fieldParams, "blend", {
  min: 0.35,
  max: 4,
  step: 0.01,
});
fieldFolder.addBinding(fieldParams, "warp", {
  min: 0,
  max: 0.35,
  step: 0.005,
});
fieldFolder.addBinding(fieldParams, "warpScale", {
  min: 0.5,
  max: 4,
  step: 0.05,
  label: "warp scale",
});
const flowFolder = pane.addFolder({ title: "Flow Field" });
flowFolder.addBinding(fieldParams, "flowScale", {
  min: 0.6,
  max: 5,
  step: 0.05,
  label: "flow scale",
});
flowFolder.addBinding(fieldParams, "flowStrength", {
  min: 0,
  max: 1,
  step: 0.01,
  label: "flow strength",
});
flowFolder.addBinding(fieldParams, "flowDetail", {
  min: 0,
  max: 1,
  step: 0.01,
  label: "flow detail",
});
flowFolder.addBinding(fieldParams, "flowBlur", {
  min: 0,
  max: 5,
  step: 0.05,
  label: "smooth blur",
});
const voronoiFolder = pane.addFolder({ title: "Voronoi Field" });
voronoiFolder.addBinding(fieldParams, "voronoiEdgeBlur", {
  min: 0,
  max: 5,
  step: 0.05,
  label: "edge blur",
});
voronoiFolder.addBinding(fieldParams, "voronoiGaussianBlur", {
  min: 0,
  max: 5,
  step: 0.05,
  label: "gaussian blur",
});
voronoiFolder.addBinding(fieldParams, "voronoiStrength", {
  min: 0,
  max: 1,
  step: 0.01,
  label: "voronoi strength",
});
const auroraFolder = pane.addFolder({ title: "Aurora Field" });
auroraFolder.addBinding(fieldParams, "auroraScale", {
  min: 0.6,
  max: 4,
  step: 0.05,
  label: "aurora scale",
});
auroraFolder.addBinding(fieldParams, "auroraIntensity", {
  min: 0,
  max: 1,
  step: 0.01,
  label: "intensity",
});
auroraFolder.addBinding(fieldParams, "auroraBands", {
  min: 1,
  max: 8,
  step: 0.05,
  label: "bands",
});
auroraFolder.addBinding(fieldParams, "auroraBlur", {
  min: 0,
  max: 5,
  step: 0.05,
  label: "smooth blur",
});

const grainFolder = pane.addFolder({ title: "Grain" });
grainFolder.addBinding(grainParams, "enabled", { label: "enabled" });
grainFolder.addBinding(grainParams, "amount", {
  min: 0,
  max: 0.25,
  step: 0.005,
  label: "amount",
});
grainFolder.addBinding(grainParams, "scale", {
  min: 0.4,
  max: 5,
  step: 0.05,
  label: "scale",
});
grainFolder.addBinding(grainParams, "colored", { label: "colored" });

const paletteFolder = pane.addFolder({ title: "Palette" });
pointParams.forEach((point, index) => {
  paletteFolder.addBinding(point, "color", {
    view: "color",
    label: `color ${index + 1}`,
  });
});

const positionFolder = pane.addFolder({ title: "Point Positions" });
pointParams.forEach((point, index) => {
  const singlePointFolder = positionFolder.addFolder({ title: `Point ${index + 1}` });
  singlePointFolder.addBinding(point, "x", {
    min: 0,
    max: 1,
    step: 0.01,
    label: "x",
  });
  singlePointFolder.addBinding(point, "y", {
    min: 0,
    max: 1,
    step: 0.01,
    label: "y",
  });
});

pane.addButton({ title: "Randomize Palette" }).on("click", () => {
  randomizePalette();
  applyState({ refreshPane: true });
});

pane.addButton({ title: "Randomize Field" }).on("click", () => {
  randomizeField();
  applyState({ refreshPane: true });
});

pane.addButton({ title: "Use Image Palette" }).on("click", () => {
  imageUpload.click();
});

pane.addButton({ title: "Export PNG" }).on("click", () => {
  exportGradient().catch((error) => {
    console.error("Error exporting gradient:", error);
    alert("Gradient export failed. Please try again.");
  });
});

aspectBinding.on("change", () => {
  applyState({ updateAspect: true, resize: true });
});

modeBinding.on("change", () => {
  updateModeVisibility();
  requestRender();
});

pane.on("change", () => {
  requestRender();
});

imageUpload.addEventListener("change", () => {
  const [file] = imageUpload.files;
  handleImageUpload(file).finally(() => {
    imageUpload.value = "";
  });
});

imageDropZone.addEventListener("click", () => {
  imageUpload.click();
});

imageDropZone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    imageUpload.click();
  }
});

imageDropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  imageDropZone.classList.add("drag-over");
});

imageDropZone.addEventListener("dragleave", () => {
  imageDropZone.classList.remove("drag-over");
});

imageDropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  imageDropZone.classList.remove("drag-over");

  const [file] = event.dataTransfer.files;
  handleImageUpload(file);
});

setAspectRatio();
randomizePalette();
randomizeField();
updateModeVisibility();
pane.refresh();

const resizeObserver = new ResizeObserver(() => {
  resizeRenderer();
});

resizeObserver.observe(previewShell);
resizeRenderer();
tick();
