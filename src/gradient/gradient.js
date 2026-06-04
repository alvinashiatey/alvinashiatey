import * as THREE from "three";
import { Pane } from "tweakpane";
import "../scss/gradient.scss";

const MAX_POINTS = 5;
const BASE_EXPORT_WIDTH = 1600;
const PREVIEW_MAX_PIXEL_RATIO = 1.25;
const EXPORT_PIXEL_RATIO = 1;

const ASPECT_RATIOS = {
	Landscape: 16 / 10,
	Square: 1,
	Poster: 4 / 5,
	Portrait: 9 / 16,
	Ultrawide: 21 / 9,
};

const PALETTE_SOURCE_COLORS = [
	"#0001FF",
	"#0078FF",
	"#44ACFA",
	"#FF0101",
	"#FF9898",
	"#F5A601",
	"#FFDD64",
	"#FFFF01",
	"#C9C901",
	"#98FF98",
	"#64C964",
	"#C9FF4E",
	"#64FF4E",
	"#C901C9",
	"#4A4EB6",
	"#B3B3B3",
];

const DEFAULT_POINT_PALETTE = [
	"#0001FF",
	"#44ACFA",
	"#FF0101",
	"#FFFF01",
	"#64FF4E",
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
	animateNoise: false,
	speed: 0.22,
	noiseDensity: 1.6,
	noiseStrength: 0.8,
	loop: false,
	loopDuration: 8,
};

const grainParams = {
	enabled: true,
	amount: 0.1,
	scale: 2.4,
	colored: false,
};

const maskParams = {
	enabled: false,
	style: "Tafoni",
	amount: 0.52,
	scale: 2.2,
	edgeWear: 0.64,
	breakup: 0.58,
	streaks: 0.12,
};

const MASK_STYLE_PRESETS = {
	Sheltered: {
		coverageBias: 0.12,
		feather: 0.19,
		contrast: 1.02,
		warp: 0.08,
		chipStrength: 0.22,
		chipScale: 4.3,
		edgeWidth: 0.18,
		pitStrength: 0.05,
		pitScale: 12.5,
		streakBias: 0.08,
		featherVariance: 0.26,
	},
	Worn: {
		coverageBias: 0.04,
		feather: 0.13,
		contrast: 1.14,
		warp: 0.12,
		chipStrength: 0.32,
		chipScale: 5.1,
		edgeWidth: 0.145,
		pitStrength: 0.09,
		pitScale: 14.5,
		streakBias: 0.15,
		featherVariance: 0.4,
	},
	Tafoni: {
		coverageBias: -0.01,
		feather: 0.1,
		contrast: 1.3,
		warp: 0.18,
		chipStrength: 0.48,
		chipScale: 6.2,
		edgeWidth: 0.11,
		pitStrength: 0.14,
		pitScale: 17.5,
		streakBias: 0.24,
		featherVariance: 0.58,
	},
	WindCut: {
		coverageBias: -0.06,
		feather: 0.08,
		contrast: 1.46,
		warp: 0.22,
		chipStrength: 0.56,
		chipScale: 7.0,
		edgeWidth: 0.095,
		pitStrength: 0.2,
		pitScale: 19.5,
		streakBias: 0.34,
		featherVariance: 0.72,
	},
};

const pointParams = [
	{ color: DEFAULT_POINT_PALETTE[0], x: 0.11, y: 0.22 },
	{ color: DEFAULT_POINT_PALETTE[1], x: 0.82, y: 0.16 },
	{ color: DEFAULT_POINT_PALETTE[2], x: 0.66, y: 0.78 },
	{ color: DEFAULT_POINT_PALETTE[3], x: 0.17, y: 0.8 },
	{ color: DEFAULT_POINT_PALETTE[4], x: 0.48, y: 0.48 },
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
	uTime: { value: 0 },
	uPreviewQuality: { value: 0 },
	uAnimateNoise: { value: fieldParams.animateNoise ? 1 : 0 },
	uSpeed: { value: fieldParams.speed },
	uNoiseDensity: { value: fieldParams.noiseDensity },
	uNoiseStrength: { value: fieldParams.noiseStrength },
	uLoop: { value: fieldParams.loop ? 1 : 0 },
	uLoopDuration: { value: fieldParams.loopDuration },
	uGrainEnabled: { value: grainParams.enabled ? 1 : 0 },
	uGrainAmount: { value: grainParams.amount },
	uGrainScale: { value: grainParams.scale },
	uGrainColored: { value: grainParams.colored ? 1 : 0 },
	uMaskEnabled: { value: maskParams.enabled ? 1 : 0 },
	uMaskAmount: { value: maskParams.amount },
	uMaskScale: { value: maskParams.scale },
	uMaskFeather: { value: 0.09 },
	uMaskContrast: { value: 1.34 },
	uMaskWarp: { value: 0.18 },
	uMaskCoverageBias: { value: -0.02 },
	uMaskChipStrength: { value: 0.42 },
	uMaskChipScale: { value: 6.4 },
	uMaskEdgeWear: { value: maskParams.edgeWear },
	uMaskEdgeWidth: { value: 0.11 },
	uMaskPitStrength: { value: 0.12 },
	uMaskPitScale: { value: 18 },
	uMaskStreakStrength: { value: maskParams.streaks },
	uMaskFeatherVariance: { value: 0.58 },
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
    uniform float uTime;
    uniform float uPreviewQuality;
    uniform float uAnimateNoise;
    uniform float uSpeed;
    uniform float uNoiseDensity;
    uniform float uNoiseStrength;
    uniform float uLoop;
    uniform float uLoopDuration;
    uniform float uGrainEnabled;
    uniform float uGrainAmount;
    uniform float uGrainScale;
    uniform float uGrainColored;
    uniform float uMaskEnabled;
    uniform float uMaskAmount;
    uniform float uMaskScale;
    uniform float uMaskFeather;
    uniform float uMaskContrast;
    uniform float uMaskWarp;
    uniform float uMaskCoverageBias;
    uniform float uMaskChipStrength;
    uniform float uMaskChipScale;
    uniform float uMaskEdgeWear;
    uniform float uMaskEdgeWidth;
    uniform float uMaskPitStrength;
    uniform float uMaskPitScale;
    uniform float uMaskStreakStrength;
    uniform float uMaskFeatherVariance;
    uniform vec3 uColors[POINT_COUNT];
    uniform vec2 uPoints[POINT_COUNT];

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float grainHash(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    vec3 mod289(vec3 x) {
      return x - floor(x * (1.0 / 289.0)) * 289.0;
    }

    vec4 mod289(vec4 x) {
      return x - floor(x * (1.0 / 289.0)) * 289.0;
    }

    vec4 permute(vec4 x) {
      return mod289(((x * 34.0) + 1.0) * x);
    }

    vec4 taylorInvSqrt(vec4 r) {
      return 1.79284291400159 - 0.85373472095314 * r;
    }

    vec3 fade(vec3 t) {
      return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
    }

    float cnoise(vec3 P) {
      vec3 Pi0 = floor(P);
      vec3 Pi1 = Pi0 + vec3(1.0);
      Pi0 = mod289(Pi0);
      Pi1 = mod289(Pi1);
      vec3 Pf0 = fract(P);
      vec3 Pf1 = Pf0 - vec3(1.0);
      vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
      vec4 iy = vec4(Pi0.yy, Pi1.yy);
      vec4 iz0 = Pi0.zzzz;
      vec4 iz1 = Pi1.zzzz;

      vec4 ixy = permute(permute(ix) + iy);
      vec4 ixy0 = permute(ixy + iz0);
      vec4 ixy1 = permute(ixy + iz1);

      vec4 gx0 = ixy0 * (1.0 / 7.0);
      vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
      gx0 = fract(gx0);
      vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
      vec4 sz0 = step(gz0, vec4(0.0));
      gx0 -= sz0 * (step(0.0, gx0) - 0.5);
      gy0 -= sz0 * (step(0.0, gy0) - 0.5);

      vec4 gx1 = ixy1 * (1.0 / 7.0);
      vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
      gx1 = fract(gx1);
      vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
      vec4 sz1 = step(gz1, vec4(0.0));
      gx1 -= sz1 * (step(0.0, gx1) - 0.5);
      gy1 -= sz1 * (step(0.0, gy1) - 0.5);

      vec3 g000 = vec3(gx0.x, gy0.x, gz0.x);
      vec3 g100 = vec3(gx0.y, gy0.y, gz0.y);
      vec3 g010 = vec3(gx0.z, gy0.z, gz0.z);
      vec3 g110 = vec3(gx0.w, gy0.w, gz0.w);
      vec3 g001 = vec3(gx1.x, gy1.x, gz1.x);
      vec3 g101 = vec3(gx1.y, gy1.y, gz1.y);
      vec3 g011 = vec3(gx1.z, gy1.z, gz1.z);
      vec3 g111 = vec3(gx1.w, gy1.w, gz1.w);

      vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
      g000 *= norm0.x;
      g010 *= norm0.y;
      g100 *= norm0.z;
      g110 *= norm0.w;
      vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
      g001 *= norm1.x;
      g011 *= norm1.y;
      g101 *= norm1.z;
      g111 *= norm1.w;

      float n000 = dot(g000, Pf0);
      float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
      float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
      float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
      float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
      float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
      float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
      float n111 = dot(g111, Pf1);

      vec3 fade_xyz = fade(Pf0);
      vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
      vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
      float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
      return 2.2 * n_xyz;
    }

    float animatedNoise(vec2 p, vec2 offset) {
      vec2 domain = p * uNoiseDensity + offset;

      if (uAnimateNoise < 0.5) {
        return cnoise(vec3(domain, 0.0)) * 0.5 + 0.5;
      }

      if (uLoop > 0.5) {
        float loopProgress = uTime / max(uLoopDuration, 0.001);
        float angle = loopProgress * 6.28318530718;
        float radius = max(uSpeed, 0.001) * 2.5;
        vec3 noisePos = vec3(domain, 0.0);
        vec3 offset0 = vec3(cos(angle) * radius, sin(angle) * radius, 0.0);
        vec3 offset1 = vec3(cos(angle + 1.57079632679) * radius, sin(angle + 1.57079632679) * radius, 0.0);
        vec3 offset2 = vec3(cos(angle + 3.14159265359) * radius, sin(angle + 3.14159265359) * radius, 0.0);
        vec3 offset3 = vec3(cos(angle + 4.71238898038) * radius, sin(angle + 4.71238898038) * radius, 0.0);
        float n0 = cnoise(noisePos + offset0);
        float n1 = cnoise(noisePos + offset1);
        float n2 = cnoise(noisePos + offset2);
        float n3 = cnoise(noisePos + offset3);
        float w0 = (cos(angle) + 1.0) * 0.5;
        float w1 = (cos(angle + 1.57079632679) + 1.0) * 0.5;
        float w2 = (cos(angle + 3.14159265359) + 1.0) * 0.5;
        float w3 = (cos(angle + 4.71238898038) + 1.0) * 0.5;
        float totalWeight = w0 + w1 + w2 + w3;
        return ((n0 * w0 + n1 * w1 + n2 * w2 + n3 * w3) / totalWeight) * 0.75 + 0.5;
      }

      float time = uTime * uSpeed;
      return cnoise(vec3(domain, time)) * 0.5 + 0.5;
    }

    float noise(vec2 p) {
      return animatedNoise(p, vec2(0.0));
    }

    vec3 toLinear(vec3 color) {
      return pow(color, vec3(2.2));
    }

    vec3 toSrgb(vec3 color) {
      return pow(clamp(color, 0.0, 1.0), vec3(1.0 / 2.2));
    }

    vec2 warpUv(vec2 uv) {
      float warpAmount = uWarp * mix(0.65, 1.5, clamp(uNoiseStrength, 0.0, 1.0));
      float x = animatedNoise(uv * uWarpScale, vec2(0.0, 3.7));
      float y = animatedNoise(uv * uWarpScale, vec2(5.2, 1.3));
      return uv + (vec2(x, y) - 0.5) * warpAmount;
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
      int octaveLimit = uPreviewQuality > 0.5 ? FLOW_OCTAVES : 3;

      for (int i = 0; i < FLOW_OCTAVES; i++) {
        if (i >= octaveLimit) {
          break;
        }
        value += amplitude * noise(p);
        p *= 2.0;
        amplitude *= 0.5;
      }

      return value;
    }

    vec2 curlNoise(vec2 p) {
      float n1 = animatedNoise(p + vec2(0.0, CURL_EPSILON), vec2(12.4, 1.7));
      float n2 = animatedNoise(p - vec2(0.0, CURL_EPSILON), vec2(12.4, 1.7));
      float n3 = animatedNoise(p + vec2(CURL_EPSILON, 0.0), vec2(7.2, 6.8));
      float n4 = animatedNoise(p - vec2(CURL_EPSILON, 0.0), vec2(7.2, 6.8));

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

      if (uPreviewQuality > 0.5) {
        color += renderFlowFieldBase(uv + blurStep) * 0.0702703;
        color += renderFlowFieldBase(uv - blurStep) * 0.0702703;
      }

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

      if (uPreviewQuality > 0.5) {
        for (int x = -2; x <= 2; x++) {
          for (int y = -2; y <= 2; y++) {
            float wx = x == 0 ? 0.38774 : (abs(x) == 1 ? 0.24477 : 0.06136);
            float wy = y == 0 ? 0.38774 : (abs(y) == 1 ? 0.24477 : 0.06136);
            vec2 offset = vec2(float(x), float(y)) * blurStep;
            color += renderVoronoiFieldBase(uv + offset) * wx * wy;
          }
        }
      } else {
        for (int x = -1; x <= 1; x++) {
          for (int y = -1; y <= 1; y++) {
            float wx = x == 0 ? 0.5 : 0.25;
            float wy = y == 0 ? 0.5 : 0.25;
            vec2 offset = vec2(float(x), float(y)) * blurStep;
            color += renderVoronoiFieldBase(uv + offset) * wx * wy;
          }
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

      if (uPreviewQuality > 0.5) {
        color += renderAuroraFieldBase(uv + blurStep) * 0.0702703;
        color += renderAuroraFieldBase(uv - blurStep) * 0.0702703;
      }

      return color;
    }

    float grainLayer(vec2 fragCoord, float frequency, float seed) {
      vec2 cell = floor(fragCoord * frequency + vec2(seed, seed * 1.37));
      return grainHash(cell) - 0.5;
    }

    float fineGrain(vec2 fragCoord) {
      float jitterFrame = uAnimateNoise > 0.5 ? floor(uTime * 24.0) : 0.0;
      vec2 jitter = vec2(
        grainHash(vec2(jitterFrame, 1.7)),
        grainHash(vec2(2.3, jitterFrame + 11.0))
      ) - 0.5;

      float baseFrequency = mix(0.85, 3.25, clamp((uGrainScale - 0.8) / 3.0, 0.0, 1.0));
      vec2 shifted = fragCoord + jitter * 19.0;
      float coarse = grainLayer(shifted, baseFrequency, 13.1);
      float medium = grainLayer(shifted * 1.73 + 11.0, baseFrequency * 1.9, 31.7);
      float fine = grainLayer(fragCoord * 2.41 - jitter * 27.0, baseFrequency * 3.6, 57.3);
      return coarse * 0.2 + medium * 0.32 + fine * 0.48;
    }

    vec3 grainOverlay(vec3 base, vec2 fragCoord) {
      float mono = fineGrain(fragCoord);
      vec3 grain = vec3(mono);

      if (uGrainColored > 0.5) {
        grain = vec3(
          mono,
          fineGrain(fragCoord.yx + vec2(43.2, 17.1)) * 0.85,
          fineGrain(fragCoord + vec2(91.7, 63.4)) * 0.7
        );
      }

      float luminance = dot(base, vec3(0.2126, 0.7152, 0.0722));
      float visibility = mix(1.1, 0.72, smoothstep(0.15, 0.95, luminance));
      vec3 overlay = grain * uGrainAmount * visibility;
      return clamp(base + overlay, 0.0, 1.0);
    }

    float cellularNoise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      float minDistance = 1.0;

      for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
          vec2 offset = vec2(float(x), float(y));
          vec2 point = vec2(
            hash(i + offset + vec2(1.7, 9.2)),
            hash(i + offset + vec2(8.3, 2.8))
          );
          vec2 diff = offset + point - f;
          minDistance = min(minDistance, dot(diff, diff));
        }
      }

      return sqrt(minDistance);
    }

    vec2 cellularInfo(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      float nearest = 10.0;
      float second = 10.0;

      for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
          vec2 offset = vec2(float(x), float(y));
          vec2 point = vec2(
            hash(i + offset + vec2(1.7, 9.2)),
            hash(i + offset + vec2(8.3, 2.8))
          );
          vec2 diff = offset + point - f;
          float dist = sqrt(dot(diff, diff));

          if (dist < nearest) {
            second = nearest;
            nearest = dist;
          } else if (dist < second) {
            second = dist;
          }
        }
      }

      return vec2(nearest, second);
    }

    float organicMask(vec2 uv) {
      vec2 aspectUv = uv;
      aspectUv.x *= uResolution.x / max(uResolution.y, 1.0);

      vec2 warpSample = vec2(
        noise(aspectUv * uMaskScale + vec2(3.1, 7.2)),
        noise(aspectUv * uMaskScale + vec2(8.4, 1.9))
      );
      vec2 maskUv = aspectUv + (warpSample - 0.5) * uMaskWarp;

      float macro = fbm(maskUv * uMaskScale * 0.72 + vec2(0.0, 1.7));
      macro += (noise(maskUv * uMaskScale * 1.1 + vec2(6.4, 3.3)) - 0.5) * 0.22;
      macro = clamp((macro - 0.5) * max(uMaskContrast, 0.01) + 0.5 + uMaskCoverageBias, 0.0, 1.0);

      float localFeather = max(uMaskFeather, 0.0001);
      float featherNoise = noise(maskUv * uMaskChipScale * 0.55 + vec2(9.1, 0.6));
      localFeather *= mix(1.0, mix(0.65, 1.6, featherNoise), clamp(uMaskFeatherVariance, 0.0, 1.0));

      float threshold = 1.0 - clamp(uMaskAmount, 0.0, 1.0);
      float preservedCoverage = smoothstep(threshold - localFeather, threshold + localFeather, macro);

      vec2 streakDir = normalize(vec2(0.38, 0.92));
      vec2 streakUv = vec2(dot(maskUv, vec2(-streakDir.y, streakDir.x)), dot(maskUv, streakDir));
      streakUv.x *= mix(0.9, 0.5, clamp(uMaskStreakStrength, 0.0, 1.0));
      streakUv.y *= mix(1.2, 2.6, clamp(uMaskStreakStrength, 0.0, 1.0));

      vec2 cavityUv = maskUv * uMaskChipScale;
      cavityUv += (warpSample - 0.5) * (0.45 + uMaskWarp * 2.2);
      cavityUv += vec2(streakUv.y * 0.22, streakUv.y * 0.06) * uMaskStreakStrength;
      cavityUv += vec2(
        fbm(maskUv * uMaskScale * 1.15 + vec2(2.3, 5.1)) - 0.5,
        fbm(maskUv * uMaskScale * 1.15 + vec2(8.7, 1.4)) - 0.5
      ) * (0.35 + uMaskChipStrength * 0.3);

      vec2 cell = cellularInfo(cavityUv + vec2(2.4, 5.6));
      float f1 = cell.x;
      float f2 = cell.y;
      float ridgeGap = max(f2 - f1, 0.0001);

      float cavityCore = 1.0 - smoothstep(0.12, 0.52 + uMaskChipStrength * 0.16, f1);
      float ribMask = 1.0 - smoothstep(
        max(uMaskEdgeWidth * 0.5, 0.01),
        max(uMaskEdgeWidth * 1.9 + 0.03, 0.05),
        ridgeGap
      );

      float mergeNoise = fbm(maskUv * uMaskPitScale * 0.24 + vec2(4.2, 8.7));
      float mergeField = smoothstep(0.32, 0.82, mergeNoise + (uMaskChipStrength - 0.35) * 0.35);
      float irregularity = noise(cavityUv * 0.55 + vec2(1.7, 3.9));
      float coalescence = mix(0.65, 1.2, irregularity) * mix(0.85, 1.25, mergeField);

      float pits = noise(cavityUv * (uMaskPitScale / max(uMaskChipScale, 0.001)) + vec2(7.9, 2.6));
      float interiorPits = smoothstep(0.62, 0.96, pits) * uMaskPitStrength * cavityCore;

      float directionalWear = fbm(streakUv * uMaskScale * 1.05 + vec2(7.3, 1.1));
      directionalWear = smoothstep(0.38, 0.88, directionalWear) * uMaskStreakStrength;

      float edgeExposure = (1.0 - preservedCoverage) * mix(0.4, 1.15, clamp(uMaskEdgeWear, 0.0, 1.0));
      float cavityField = cavityCore * coalescence;
      cavityField *= mix(1.0, 0.18, ribMask);
      cavityField += directionalWear * cavityCore * 0.3;
      cavityField += edgeExposure * (0.35 + cavityCore * 0.4);
      cavityField += interiorPits * 0.7;
      cavityField = clamp(cavityField, 0.0, 1.0);

      float rimCollapse = smoothstep(0.2, 0.75, cavityField) * clamp(uMaskEdgeWear, 0.0, 1.0);
      float weathered = preservedCoverage - cavityField * uMaskChipStrength - rimCollapse * ribMask * 0.38;
      weathered += ribMask * 0.16 * (1.0 - clamp(uMaskEdgeWear, 0.0, 1.0));

      return clamp(weathered, 0.0, 1.0);
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

      if (uMaskEnabled > 0.5) {
        float maskAlpha = organicMask(vUv);
        base = mix(toLinear(uBackground), base, maskAlpha);
      }

      if (uGrainEnabled > 0.5) {
        base = grainOverlay(base, gl_FragCoord.xy);
      }

      gl_FragColor = vec4(toSrgb(base), 1.0);
    }
  `,
});

const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

const renderer = createRenderer(canvas, { quality: "preview" });

let activePaletteAnimation = 0;
let currentThumbnailUrl = "";
let paletteAnimationActive = false;
let previewFrameId = 0;
let previewRenderQueued = false;

function createRenderer(targetCanvas, { quality = "preview" } = {}) {
	const isExportQuality = quality === "export";
	const nextRenderer = new THREE.WebGLRenderer({
		canvas: targetCanvas,
		antialias: isExportQuality,
		alpha: false,
		preserveDrawingBuffer: isExportQuality,
	});

	nextRenderer.outputColorSpace = THREE.SRGBColorSpace;
	nextRenderer.setPixelRatio(
		Math.min(
			window.devicePixelRatio,
			isExportQuality ? EXPORT_PIXEL_RATIO : PREVIEW_MAX_PIXEL_RATIO,
		),
	);
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
	uniforms.uAnimateNoise.value = fieldParams.animateNoise ? 1 : 0;
	uniforms.uSpeed.value = fieldParams.speed;
	uniforms.uNoiseDensity.value = fieldParams.noiseDensity;
	uniforms.uNoiseStrength.value = fieldParams.noiseStrength;
	uniforms.uLoop.value = fieldParams.loop ? 1 : 0;
	uniforms.uLoopDuration.value = fieldParams.loopDuration;
}

function syncGrainUniforms() {
	uniforms.uGrainEnabled.value = grainParams.enabled ? 1 : 0;
	uniforms.uGrainAmount.value = grainParams.amount;
	uniforms.uGrainScale.value = grainParams.scale;
	uniforms.uGrainColored.value = grainParams.colored ? 1 : 0;
}

function getMaskStyleConfig() {
	return MASK_STYLE_PRESETS[maskParams.style] || MASK_STYLE_PRESETS.Tafoni;
}

function syncMaskUniforms() {
	const style = getMaskStyleConfig();
	const breakup = maskParams.breakup;
	const edgeWear = maskParams.edgeWear;

	uniforms.uMaskEnabled.value = maskParams.enabled ? 1 : 0;
	uniforms.uMaskAmount.value = maskParams.amount;
	uniforms.uMaskScale.value = maskParams.scale;
	uniforms.uMaskFeather.value = style.feather;
	uniforms.uMaskContrast.value = style.contrast + breakup * 0.22;
	uniforms.uMaskWarp.value = style.warp + breakup * 0.05;
	uniforms.uMaskCoverageBias.value =
		style.coverageBias - (maskParams.amount - 0.5) * 0.12;
	uniforms.uMaskChipStrength.value =
		style.chipStrength * (0.7 + breakup * 0.75);
	uniforms.uMaskChipScale.value =
		style.chipScale * (0.82 + breakup * 0.6) * (0.8 + maskParams.scale * 0.2);
	uniforms.uMaskEdgeWear.value = edgeWear;
	uniforms.uMaskEdgeWidth.value =
		style.edgeWidth * (1.2 - edgeWear * 0.4 + breakup * 0.08);
	uniforms.uMaskPitStrength.value =
		style.pitStrength * (0.65 + breakup * 0.8 + edgeWear * 0.2);
	uniforms.uMaskPitScale.value = style.pitScale * (0.9 + breakup * 0.4);
	uniforms.uMaskStreakStrength.value =
		maskParams.streaks * (0.45 + style.streakBias);
	uniforms.uMaskFeatherVariance.value = style.featherVariance;
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
	syncMaskUniforms();
	syncPointUniforms();
}

function syncPreviewUniforms() {
	syncUniforms();
	uniforms.uPreviewQuality.value = 0;
}

function syncTimeUniform(now = performance.now()) {
	uniforms.uTime.value = now / 1000;
}

function shouldAnimatePreview() {
	return fieldParams.animateNoise || paletteAnimationActive;
}

function stopPreviewLoop() {
	if (!previewFrameId) return;
	window.cancelAnimationFrame(previewFrameId);
	previewFrameId = 0;
}

function renderScene(targetRenderer) {
	targetRenderer.render(scene, camera);
}

function renderPreviewFrame(now = performance.now()) {
	previewFrameId = 0;
	previewRenderQueued = false;
	syncTimeUniform(now);
	renderScene(renderer);

	if (shouldAnimatePreview()) {
		previewFrameId = window.requestAnimationFrame(renderPreviewFrame);
	}
}

function ensurePreviewLoop() {
	if (!shouldAnimatePreview()) {
		stopPreviewLoop();
		return;
	}
	if (previewFrameId) return;
	previewFrameId = window.requestAnimationFrame(renderPreviewFrame);
}

function requestRender() {
	if (shouldAnimatePreview()) {
		ensurePreviewLoop();
		return;
	}
	if (previewRenderQueued || previewFrameId) return;
	previewRenderQueued = true;
	previewFrameId = window.requestAnimationFrame(renderPreviewFrame);
}

function applyState({
	refreshPane = false,
	updateAspect = false,
	resize = false,
	syncPreview = true,
} = {}) {
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

	if (syncPreview) {
		syncPreviewUniforms();
	}

	requestRender();
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

function buildSourceColorEntries() {
	return PALETTE_SOURCE_COLORS.map((hex) => {
		const rgb = hexToRgb(hex);
		return {
			hex,
			rgb,
			lab: rgbToLab(rgb),
			hsl: rgbToHsl(rgb),
		};
	});
}

function shuffleArray(items) {
	const shuffled = [...items];
	for (let i = shuffled.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}

function pickDistinctColor(candidates, selected, fallback = []) {
	const pool = [...candidates, ...fallback];
	const uniquePool = pool.filter(
		(candidate, index) =>
			pool.findIndex((entry) => entry.hex === candidate.hex) === index,
	);

	return (
		shuffleArray(uniquePool).find((candidate) => {
			if (selected.some((entry) => entry.hex === candidate.hex)) return false;
			return selected.every(
				(entry) => labDistance(entry.lab, candidate.lab) >= 18,
			);
		}) ||
		shuffleArray(uniquePool).find(
			(candidate) => !selected.some((entry) => entry.hex === candidate.hex),
		) ||
		uniquePool[0]
	);
}

function generatePaletteFromSourceBank() {
	const source = buildSourceColorEntries();
	const neutrals = source.filter((entry) => getChroma(entry.lab) < 12);
	const coolAnchors = source.filter(
		(entry) =>
			entry.hsl.h >= 220 &&
			entry.hsl.h <= 310 &&
			entry.hsl.l <= 0.55 &&
			getChroma(entry.lab) >= 20,
	);
	const coolBridges = source.filter(
		(entry) =>
			entry.hsl.h >= 190 &&
			entry.hsl.h <= 260 &&
			entry.hsl.l > 0.45 &&
			getChroma(entry.lab) >= 18,
	);
	const warmAnchors = source.filter(
		(entry) =>
			(entry.hsl.h <= 25 ||
				entry.hsl.h >= 330 ||
				(entry.hsl.h >= 25 && entry.hsl.h <= 55)) &&
			getChroma(entry.lab) >= 20,
	);
	const highlights = source.filter(
		(entry) =>
			(entry.hsl.h >= 55 && entry.hsl.h <= 110 && entry.hsl.l >= 0.42) ||
			(entry.hsl.l >= 0.72 && getChroma(entry.lab) >= 14),
	);
	const wildcards = source.filter((entry) => getChroma(entry.lab) >= 14);

	const selected = [];
	[
		pickDistinctColor(coolAnchors, selected, wildcards),
		pickDistinctColor(coolBridges, selected, wildcards),
		pickDistinctColor(warmAnchors, selected, wildcards),
		pickDistinctColor(highlights, selected, wildcards),
	].forEach((entry) => {
		if (entry) selected.push(entry);
	});

	const wildcardPool = Math.random() < 0.28 ? neutrals : wildcards;
	const wildcard = pickDistinctColor(wildcardPool, selected, source);
	if (wildcard && selected.length < MAX_POINTS) selected.push(wildcard);

	while (selected.length < MAX_POINTS) {
		const filler = pickDistinctColor(source, selected, source);
		if (!filler) break;
		selected.push(filler);
	}

	return selected.slice(0, MAX_POINTS).map((entry) => entry.hex);
}

function randomizePalette() {
	const palette = generatePaletteFromSourceBank();
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
	fieldParams.speed = randomBetween(0.08, 0.45);
	fieldParams.noiseDensity = randomBetween(0.9, 2.6);
	fieldParams.noiseStrength = randomBetween(0.45, 1.0);
	fieldParams.loopDuration = randomBetween(4, 12);
	grainParams.amount = randomBetween(0.04, 0.14);
	grainParams.scale = randomBetween(1.2, 3.4);
	const maskStyles = Object.keys(MASK_STYLE_PRESETS);
	maskParams.style =
		maskStyles[Math.floor(Math.random() * maskStyles.length)] || "Tafoni";
	maskParams.amount = randomBetween(0.38, 0.72);
	maskParams.scale = randomBetween(1.4, 3.2);
	maskParams.edgeWear = randomBetween(0.28, 0.84);
	maskParams.breakup = randomBetween(0.32, 0.88);
	maskParams.streaks = randomBetween(0.04, 0.36);
}

function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value));
}

function componentToHex(value) {
	return Math.round(clamp(value, 0, 255))
		.toString(16)
		.padStart(2, "0");
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

function rgbToHsl({ r, g, b }) {
	const nr = r / 255;
	const ng = g / 255;
	const nb = b / 255;
	const max = Math.max(nr, ng, nb);
	const min = Math.min(nr, ng, nb);
	const delta = max - min;
	let h = 0;
	const l = (max + min) / 2;
	const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

	if (delta !== 0) {
		switch (max) {
			case nr:
				h = 60 * (((ng - nb) / delta) % 6);
				break;
			case ng:
				h = 60 * ((nb - nr) / delta + 2);
				break;
			default:
				h = 60 * ((nr - ng) / delta + 4);
		}
	}

	return {
		h: h < 0 ? h + 360 : h,
		s,
		l,
	};
}

function rgbToXyz({ r, g, b }) {
	const normalize = (value) => {
		const channel = value / 255;
		return channel > 0.04045
			? ((channel + 0.055) / 1.055) ** 2.4
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
		(a, b) =>
			getChroma(b.lab) + b.lab.l * 0.05 - (getChroma(a.lab) + a.lab.l * 0.05),
	);

	return Array.from({ length: count }, (_, index) => {
		const sample =
			sorted[Math.floor((index / count) * Math.max(sorted.length - 1, 0))];
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
		const rgb =
			tooDark && tooNeutral ? rotateHue(vividBase.rgb, index * 28) : color.rgb;
		return { rgb, lab: rgbToLab(rgb) };
	});

	if (averagePairwiseDistance(adjusted) >= 10) return adjusted;

	return adjusted.map((_, index) => {
		const rgb = rotateHue(vividBase.rgb, (index - 2) * 24);
		return { rgb, lab: rgbToLab(rgb) };
	});
}

function pickBackgroundColor(clusters, colors) {
	const scored = colors.map((color, index) => {
		const size = clusters[index]?.samples.length || 0;
		const chroma = getChroma(color.lab);
		const lightness = color.lab.l;
		const normalizedSize =
			size /
			Math.max(
				clusters.reduce(
					(max, cluster) => Math.max(max, cluster.samples.length),
					1,
				),
				1,
			);
		const neutralityScore = 1 - clamp(chroma / 70, 0, 1);
		const darknessScore = 1 - clamp(Math.abs(lightness - 28) / 40, 0, 1);

		return {
			rgb: color.rgb,
			score:
				normalizedSize * 0.55 + neutralityScore * 0.25 + darknessScore * 0.2,
		};
	});

	const best = scored.sort((a, b) => b.score - a.score)[0]?.rgb || {
		r: 9,
		g: 9,
		b: 9,
	};

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
		const context = analysisCanvas.getContext("2d", {
			willReadFrequently: true,
		});

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

function animateImagePalette({
	points: targetPoints,
	background: targetBackground,
}) {
	activePaletteAnimation += 1;
	paletteAnimationActive = true;
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
		const eased = 1 - (1 - progress) ** 3;

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

		syncFieldUniforms();
		syncPointUniforms();
		pane.refresh();
		requestRender();

		if (progress < 1) {
			window.requestAnimationFrame(step);
		} else {
			paletteAnimationActive = false;
			requestRender();
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
	const isMaskEnabled = maskParams.enabled;
	const isGrainEnabled = grainParams.enabled;
	const isAnimateNoise = fieldParams.animateNoise;

	positionFolder.hidden = !isPoints && !isVoronoi;
	pointsFolder.hidden = !isPoints;
	flowFolder.hidden = fieldParams.mode !== "Flow";
	voronoiFolder.hidden = !isVoronoi;
	auroraFolder.hidden = fieldParams.mode !== "Aurora";

	maskStyleBinding.hidden = !isMaskEnabled;
	maskAmountBinding.hidden = !isMaskEnabled;
	maskScaleBinding.hidden = !isMaskEnabled;
	maskEdgeWearBinding.hidden = !isMaskEnabled;
	maskBreakupBinding.hidden = !isMaskEnabled;
	maskAdvancedFolder.hidden = !isMaskEnabled;

	grainAmountBinding.hidden = !isGrainEnabled;
	grainScaleBinding.hidden = !isGrainEnabled;
	grainColoredBinding.hidden = !isGrainEnabled;

	motionSpeedBinding.disabled = !isAnimateNoise;
	motionLoopBinding.disabled = !isAnimateNoise;
	motionLoopDurationBinding.hidden = !isAnimateNoise || !fieldParams.loop;
	motionLoopDurationBinding.disabled = !isAnimateNoise;
}

async function exportGradient() {
	const aspect = getSelectedAspect();
	const exportWidth = BASE_EXPORT_WIDTH * exportParams.scale;
	const exportHeight = Math.round(exportWidth / aspect);

	const exportCanvas = document.createElement("canvas");
	const exportRenderer = createRenderer(exportCanvas, { quality: "export" });

	try {
		exportRenderer.setPixelRatio(EXPORT_PIXEL_RATIO);
		exportRenderer.setSize(exportWidth, exportHeight, false);

		const previousResolution = uniforms.uResolution.value.clone();
		const previousQuality = uniforms.uPreviewQuality.value;
		uniforms.uResolution.value.set(exportWidth, exportHeight);
		syncUniforms();
		uniforms.uPreviewQuality.value = 1;
		renderScene(exportRenderer);

		const link = document.createElement("a");
		link.download = `mesh-gradient-${exportParams.aspect.toLowerCase()}.png`;
		link.href = exportRenderer.domElement.toDataURL("image/png");
		link.click();

		uniforms.uResolution.value.copy(previousResolution);
		uniforms.uPreviewQuality.value = previousQuality;
		syncPreviewUniforms();
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
const motionFolder = pane.addFolder({ title: "Motion Noise" });
const motionAnimateBinding = motionFolder.addBinding(
	fieldParams,
	"animateNoise",
	{
		label: "animate noise",
	},
);
const motionSpeedBinding = motionFolder.addBinding(fieldParams, "speed", {
	min: 0,
	max: 1,
	step: 0.01,
	label: "speed",
});
motionFolder.addBinding(fieldParams, "noiseDensity", {
	min: 0.4,
	max: 4,
	step: 0.05,
	label: "density",
});
motionFolder.addBinding(fieldParams, "noiseStrength", {
	min: 0,
	max: 1.5,
	step: 0.01,
	label: "strength",
});
const motionLoopBinding = motionFolder.addBinding(fieldParams, "loop", {
	label: "loop",
});
const motionLoopDurationBinding = motionFolder.addBinding(
	fieldParams,
	"loopDuration",
	{
		min: 2,
		max: 20,
		step: 0.5,
		label: "loop duration",
	},
);

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

const maskFolder = pane.addFolder({ title: "Mask" });
const maskEnabledBinding = maskFolder.addBinding(maskParams, "enabled", {
	label: "enabled",
});
const maskStyleBinding = maskFolder.addBinding(maskParams, "style", {
	options: {
		Sheltered: "Sheltered",
		Worn: "Worn",
		Tafoni: "Tafoni",
		"Wind-cut": "WindCut",
	},
	label: "style",
});
const maskAmountBinding = maskFolder.addBinding(maskParams, "amount", {
	min: 0,
	max: 1,
	step: 0.01,
	label: "amount",
});
const maskScaleBinding = maskFolder.addBinding(maskParams, "scale", {
	min: 0.5,
	max: 5,
	step: 0.05,
	label: "scale",
});
const maskEdgeWearBinding = maskFolder.addBinding(maskParams, "edgeWear", {
	min: 0,
	max: 1,
	step: 0.01,
	label: "edge wear",
});
const maskBreakupBinding = maskFolder.addBinding(maskParams, "breakup", {
	min: 0,
	max: 1,
	step: 0.01,
	label: "breakup",
});
const maskAdvancedFolder = maskFolder.addFolder({
	title: "Advanced",
	expanded: false,
});
maskAdvancedFolder.addBinding(maskParams, "streaks", {
	min: 0,
	max: 1,
	step: 0.01,
	label: "streaks",
});

const grainFolder = pane.addFolder({ title: "Grain" });
const grainEnabledBinding = grainFolder.addBinding(grainParams, "enabled", {
	label: "enabled",
});
const grainAmountBinding = grainFolder.addBinding(grainParams, "amount", {
	min: 0,
	max: 0.25,
	step: 0.005,
	label: "amount",
});
const grainScaleBinding = grainFolder.addBinding(grainParams, "scale", {
	min: 0.4,
	max: 5,
	step: 0.05,
	label: "scale",
});
const grainColoredBinding = grainFolder.addBinding(grainParams, "colored", {
	label: "colored",
});

const paletteFolder = pane.addFolder({ title: "Palette" });
pointParams.forEach((point, index) => {
	paletteFolder.addBinding(point, "color", {
		view: "color",
		label: `color ${index + 1}`,
	});
});

const positionFolder = pane.addFolder({ title: "Point Positions" });
pointParams.forEach((point, index) => {
	const singlePointFolder = positionFolder.addFolder({
		title: `Point ${index + 1}`,
	});
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

motionAnimateBinding.on("change", () => {
	updateModeVisibility();
	requestRender();
});

maskEnabledBinding.on("change", () => {
	updateModeVisibility();
	requestRender();
});

grainEnabledBinding.on("change", () => {
	updateModeVisibility();
	requestRender();
});

motionLoopBinding.on("change", () => {
	updateModeVisibility();
	requestRender();
});

pane.on("change", () => {
	syncPreviewUniforms();
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
randomizeField();
syncPreviewUniforms();
updateModeVisibility();
pane.refresh();

const resizeObserver = new ResizeObserver(() => {
	resizeRenderer();
});

resizeObserver.observe(previewShell);
resizeRenderer();
requestRender();
