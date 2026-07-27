import * as THREE from "three";
import { Pane } from "tweakpane";
import "../scss/tafoni.scss";

const BASE_EXPORT_WIDTH = 1600;
const EXPORT_PIXEL_RATIO = 1;
const RUNTIME_PROFILES = {
	editor: {
		previewPixelRatio: 1,
		previewQuality: 0,
		targetFps: 36,
		allowMaskByDefault: true,
	},
	web: {
		previewPixelRatio: 0.9,
		previewQuality: 0,
		targetFps: 28,
		allowMaskByDefault: false,
	},
	mobile: {
		previewPixelRatio: 0.72,
		previewQuality: 0,
		targetFps: 20,
		allowMaskByDefault: false,
	},
};

const ASPECT_RATIOS = {
	Landscape: 16 / 10,
	Square: 1,
	Poster: 4 / 5,
	Portrait: 9 / 16,
	Ultrawide: 21 / 9,
};

const TAFONI_COLOR_BANK = [
	"#c96a2a",
	"#d88945",
	"#b95d34",
	"#8c4f2f",
	"#d2b48c",
	"#8e8b6f",
	"#9a6a4a",
	"#ad7f56",
	"#6c7b5b",
	"#596f82",
	"#7e5f86",
	"#b06a7a",
];

const exportParams = {
	aspect: "Landscape",
	scale: 2,
};

const ditherParams = {
	enabled: false,
	levels: 5,
	strength: 0.42,
	scale: 2,
};

const tafoniParams = {
	background: "#0a0908",
	tafoniColor: "#c96a2a",
};

const tafoniGenerationState = {
	offsetX: 0,
	offsetY: 0,
};

const maskParams = {
	enabled: true,
	style: "Tafoni",
	amount: 0.72,
	scale: 2.75,
	edgeWear: 0.82,
	breakup: 0.84,
	streaks: 0.3,
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

const previewShell = document.getElementById("tafoni-preview-shell");
const canvas = document.getElementById("tafoni-canvas");
const paneHost = document.getElementById("pane");
const imageDropZone = document.getElementById("image-dropzone");
const imageUpload = document.getElementById("image-upload");
const sourceImagePreview = document.getElementById("source-image-preview");
const imageStatus = document.getElementById("image-status");

const backgroundImageState = {
	objectUrl: "",
	texture: null,
	aspect: 1,
	enabled: false,
};

function detectRuntimeProfile() {
	const explicitProfile = document.body?.dataset.tafoniProfile;
	if (explicitProfile && RUNTIME_PROFILES[explicitProfile]) {
		return explicitProfile;
	}

	const isEditor = Boolean(paneHost);
	if (isEditor) return "editor";

	const mobileQuery =
		window.matchMedia?.("(max-width: 768px), (pointer: coarse)")?.matches ??
		false;
	return mobileQuery ? "mobile" : "web";
}

const runtimeProfileName = detectRuntimeProfile();
canvas.setAttribute("data-render-surface", "webgl-preview");
const runtimeProfile =
	RUNTIME_PROFILES[runtimeProfileName] || RUNTIME_PROFILES.web;
document.body?.setAttribute("data-tafoni-profile", runtimeProfileName);

function applyRuntimeProfileDefaults() {
	if (!runtimeProfile.allowMaskByDefault) {
		maskParams.enabled = false;
	}
}

function randomItem(items) {
	return items[Math.floor(Math.random() * items.length)] || items[0];
}

function randomBetween(min, max) {
	return min + Math.random() * (max - min);
}

function normalizeHexColor(value, fallback = TAFONI_COLOR_BANK[0]) {
	const normalizedValue =
		typeof value === "string" ? value.trim().toLowerCase() : "";
	if (/^#[0-9a-f]{6}$/.test(normalizedValue)) {
		return normalizedValue;
	}

	const normalizedFallback =
		typeof fallback === "string" ? fallback.trim().toLowerCase() : "";
	return /^#[0-9a-f]{6}$/.test(normalizedFallback)
		? normalizedFallback
		: TAFONI_COLOR_BANK[0];
}

let lastValidTafoniColor = normalizeHexColor(tafoniParams.tafoniColor);

function setTafoniColor(value, fallback = lastValidTafoniColor) {
	const nextColor = normalizeHexColor(value, fallback);
	tafoniParams.tafoniColor = nextColor;
	lastValidTafoniColor = nextColor;
	return nextColor;
}

function randomizeTafoniColor() {
	return setTafoniColor(randomItem(TAFONI_COLOR_BANK));
}

function randomizeTafoniSeed() {
	tafoniGenerationState.offsetX = randomBetween(-1000, 1000);
	tafoniGenerationState.offsetY = randomBetween(-1000, 1000);
}

function randomizeTafoni() {
	randomizeTafoniSeed();
	randomizeTafoniColor();
}

applyRuntimeProfileDefaults();
randomizeTafoni();

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const geometry = new THREE.PlaneGeometry(2, 2);
const postScene = new THREE.Scene();
const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

const uniforms = {
	uResolution: { value: new THREE.Vector2(1, 1) },
	uFrameAspect: { value: getSelectedAspect() },
	uLogicalResolution: {
		value: new THREE.Vector2(
			BASE_EXPORT_WIDTH,
			Math.round(BASE_EXPORT_WIDTH / getSelectedAspect()),
		),
	},
	uBackground: { value: new THREE.Color(tafoniParams.background) },
	uTafoniColor: { value: new THREE.Color(tafoniParams.tafoniColor) },
	uTafoniOffset: {
		value: new THREE.Vector2(
			tafoniGenerationState.offsetX,
			tafoniGenerationState.offsetY,
		),
	},
	uBackgroundImage: { value: null },
	uHasBackgroundImage: { value: 0 },
	uBackgroundImageAspect: { value: 1 },
	uMaskEnabled: { value: maskParams.enabled ? 1 : 0 },
	uMaskAmount: { value: maskParams.amount },
	uMaskScale: { value: maskParams.scale },
	uMaskFeather: { value: 0.1 },
	uMaskContrast: { value: 1.3 },
	uMaskWarp: { value: 0.18 },
	uMaskCoverageBias: { value: -0.01 },
	uMaskChipStrength: { value: 0.48 },
	uMaskChipScale: { value: 6.2 },
	uMaskEdgeWear: { value: maskParams.edgeWear },
	uMaskEdgeWidth: { value: 0.11 },
	uMaskPitStrength: { value: 0.14 },
	uMaskPitScale: { value: 17.5 },
	uMaskStreakStrength: { value: 0.3 },
	uMaskFeatherVariance: { value: 0.58 },
	uTransparentExport: { value: 0 },
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

		#define FLOW_OCTAVES 5
		#define CURL_EPSILON 0.01

		varying vec2 vUv;

		uniform vec2 uResolution;
		uniform float uFrameAspect;
		uniform vec2 uLogicalResolution;
		uniform vec3 uBackground;
		uniform vec3 uTafoniColor;
		uniform vec2 uTafoniOffset;
		uniform sampler2D uBackgroundImage;
		uniform float uHasBackgroundImage;
		uniform float uBackgroundImageAspect;

		const float TAFONI_SCALE = 2.4;
		const float TAFONI_STRENGTH = 0.88;
		const float TAFONI_DETAIL = 0.68;
		const float TAFONI_BLUR = 0.72;
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
		uniform float uTransparentExport;

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

		float hash(vec2 p) {
			return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
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

		float noise(vec2 p) {
			return cnoise(vec3(p, 0.0)) * 0.5 + 0.5;
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

		vec3 toLinear(vec3 color) {
			return pow(color, vec3(2.2));
		}

		vec3 toSrgb(vec3 color) {
			return pow(clamp(color, 0.0, 1.0), vec3(1.0 / 2.2));
		}

		vec2 coverUv(vec2 uv, float imageAspect, float frameAspect) {
			vec2 centered = uv - 0.5;
			if (imageAspect > frameAspect) {
				centered.x *= frameAspect / max(imageAspect, 0.0001);
			} else {
				centered.y *= max(imageAspect, 0.0001) / max(frameAspect, 0.0001);
			}
			return centered + 0.5;
		}

		vec2 frameUv(vec2 uv) {
			vec2 aspectUv = uv;
			aspectUv.x *= uFrameAspect;
			return aspectUv;
		}

		vec3 sampleBackground(vec2 uv) {
			if (uHasBackgroundImage > 0.5) {
				vec2 imageUv = coverUv(uv, uBackgroundImageAspect, uFrameAspect);
				return toLinear(texture2D(uBackgroundImage, clamp(imageUv, 0.0, 1.0)).rgb);
			}
			return toLinear(uBackground);
		}

		float tafoniCoverageBase(vec2 uv) {
			vec2 aspectUv = frameUv(uv);

			vec2 flowUv = aspectUv * TAFONI_SCALE + uTafoniOffset;
			float major = fbm(flowUv + vec2(0.0, 4.1));
			float secondary = fbm(flowUv * 1.7 + vec2(2.7, 9.2));
			float ridge = fbm(flowUv * 0.9 + vec2(8.3, 1.4));
			float turbulence = fbm(flowUv * 2.3 + vec2(4.5, 6.8));
			float vein = fbm(flowUv * 3.4 + vec2(6.2, 0.7));

			float body = major * 0.46 + secondary * 0.24 + ridge * 0.18;
			float cavities = smoothstep(0.22, 0.88, turbulence * 0.65 + ridge * 0.32 + vein * 0.18);
			float veil = smoothstep(0.08, 0.92, body + cavities * TAFONI_DETAIL * 0.28);
			float contrast = smoothstep(0.12, 0.92, veil * (0.72 + TAFONI_STRENGTH * 0.55));
			float edgeGlow = smoothstep(0.22, 0.86, ridge + turbulence * 0.28);
			return clamp(mix(contrast, edgeGlow, TAFONI_DETAIL * 0.32), 0.0, 1.0);
		}

		float renderTafoniCoverage(vec2 uv) {
			vec2 blurStep = vec2(1.0 / max(uLogicalResolution.x, 1.0), 1.0 / max(uLogicalResolution.y, 1.0)) * TAFONI_BLUR * 10.0;
			float coverage = tafoniCoverageBase(uv) * 0.227027;
			coverage += tafoniCoverageBase(uv + vec2( blurStep.x, 0.0)) * 0.1945946;
			coverage += tafoniCoverageBase(uv + vec2(-blurStep.x, 0.0)) * 0.1945946;
			coverage += tafoniCoverageBase(uv + vec2(0.0,  blurStep.y)) * 0.1216216;
			coverage += tafoniCoverageBase(uv + vec2(0.0, -blurStep.y)) * 0.1216216;
			coverage += tafoniCoverageBase(uv + blurStep) * 0.0702703;
			coverage += tafoniCoverageBase(uv - blurStep) * 0.0702703;

			return clamp(coverage, 0.0, 1.0);
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
			vec2 aspectUv = frameUv(uv);

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
			vec3 background = sampleBackground(vUv);
			float coverage = renderTafoniCoverage(vUv);
			float innerShade = smoothstep(0.16, 0.94, coverage);
			float highlight = smoothstep(0.54, 1.0, coverage);
			float tafoniBlend = innerShade * clamp(0.32 + TAFONI_STRENGTH * 0.75, 0.0, 1.0);
			float maskAlpha = 1.0;
			vec3 tafoniColor = toLinear(uTafoniColor);
			vec3 shadedColor = mix(tafoniColor * 0.72, tafoniColor * 1.08, highlight * (0.4 + TAFONI_STRENGTH * 0.25));
			vec3 base = mix(background, shadedColor, tafoniBlend);

			if (uMaskEnabled > 0.5) {
				maskAlpha = organicMask(vUv);
				base = mix(background, base, maskAlpha);
			}

			if (uTransparentExport > 0.5) {
				float exportAlpha = clamp(tafoniBlend * maskAlpha, 0.0, 1.0);
				vec3 exportColor = toSrgb(shadedColor) * step(0.0001, exportAlpha);
				gl_FragColor = vec4(exportColor, exportAlpha);
				return;
			}

			gl_FragColor = vec4(toSrgb(base), 1.0);
		}
	`,
});

const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

const postUniforms = {
	uScene: { value: null },
	uReferenceResolution: {
		value: new THREE.Vector2(
			BASE_EXPORT_WIDTH,
			Math.round(BASE_EXPORT_WIDTH / getSelectedAspect()),
		),
	},
	uDitherEnabled: { value: ditherParams.enabled ? 1 : 0 },
	uDitherLevels: { value: ditherParams.levels },
	uDitherStrength: { value: ditherParams.strength },
	uDitherScale: { value: ditherParams.scale },
	uDitherAlpha: { value: 0 },
};

const postMaterial = new THREE.ShaderMaterial({
	uniforms: postUniforms,
	vertexShader: `
		varying vec2 vUv;

		void main() {
			vUv = uv;
			gl_Position = vec4(position.xy, 0.0, 1.0);
		}
	`,
	fragmentShader: `
		precision highp float;

		varying vec2 vUv;

		uniform sampler2D uScene;
		uniform vec2 uReferenceResolution;
		uniform float uDitherEnabled;
		uniform float uDitherLevels;
		uniform float uDitherStrength;
		uniform float uDitherScale;
		uniform float uDitherAlpha;

		float bayer4(vec2 position) {
			vec2 cell = mod(floor(position), 4.0);
			float index = cell.x + cell.y * 4.0;
			if (index < 0.5) return 0.0 / 16.0;
			if (index < 1.5) return 8.0 / 16.0;
			if (index < 2.5) return 2.0 / 16.0;
			if (index < 3.5) return 10.0 / 16.0;
			if (index < 4.5) return 12.0 / 16.0;
			if (index < 5.5) return 4.0 / 16.0;
			if (index < 6.5) return 14.0 / 16.0;
			if (index < 7.5) return 6.0 / 16.0;
			if (index < 8.5) return 3.0 / 16.0;
			if (index < 9.5) return 11.0 / 16.0;
			if (index < 10.5) return 1.0 / 16.0;
			if (index < 11.5) return 9.0 / 16.0;
			if (index < 12.5) return 15.0 / 16.0;
			if (index < 13.5) return 7.0 / 16.0;
			if (index < 14.5) return 13.0 / 16.0;
			return 5.0 / 16.0;
		}

		void main() {
			vec4 sceneColor = texture2D(uScene, vUv);
			if (uDitherEnabled < 0.5) {
				gl_FragColor = sceneColor;
				return;
			}

			float levels = max(uDitherLevels, 2.0);
			vec2 fragCoord = vUv * uReferenceResolution;
			float pattern = bayer4(fragCoord / max(uDitherScale, 0.0001));
			float threshold = (pattern - 0.5) * (uDitherStrength / levels);
			vec3 quantized = floor(clamp(sceneColor.rgb + threshold, 0.0, 1.0) * (levels - 1.0) + 0.5) / (levels - 1.0);
			float alpha = sceneColor.a;

			if (uDitherAlpha > 0.5) {
				float alphaThreshold = step(pattern, clamp(alpha, 0.0, 1.0));
				alpha = mix(alpha, alphaThreshold, clamp(uDitherStrength, 0.0, 1.0));
				if (alpha < 0.0001) {
					quantized = vec3(0.0);
				}
			}

			gl_FragColor = vec4(quantized, alpha);
		}
	`,
});

const postMesh = new THREE.Mesh(geometry, postMaterial);
postScene.add(postMesh);

const renderer = createRenderer(canvas, { quality: "preview" });
let previewRenderTarget = null;

let currentThumbnailUrl = "";
let previewFrameId = 0;
let previewRenderQueued = false;
let previewVisible = true;
let pageVisible = document.visibilityState !== "hidden";

function createRenderer(
	targetCanvas,
	{ quality = "preview", transparent = false } = {},
) {
	const isExportQuality = quality === "export";
	const nextRenderer = new THREE.WebGLRenderer({
		canvas: targetCanvas,
		antialias: isExportQuality || runtimeProfileName === "editor",
		alpha: transparent,
		preserveDrawingBuffer: isExportQuality,
	});

	nextRenderer.outputColorSpace = THREE.SRGBColorSpace;
	nextRenderer.setClearColor(0x000000, transparent ? 0 : 1);
	nextRenderer.setPixelRatio(
		Math.min(
			window.devicePixelRatio,
			isExportQuality ? EXPORT_PIXEL_RATIO : runtimeProfile.previewPixelRatio,
		),
	);
	return nextRenderer;
}

function getSelectedAspect() {
	return ASPECT_RATIOS[exportParams.aspect] || 1;
}

function setAspectRatio() {
	previewShell.style.setProperty("--tafoni-aspect", `${getSelectedAspect()}`);
}

function getReferenceFrameSize(aspect = getSelectedAspect()) {
	const width = BASE_EXPORT_WIDTH;
	const height = Math.max(1, Math.round(width / aspect));
	return { width, height, aspect };
}

function syncFrameMetricsUniforms() {
	const { width, height, aspect } = getReferenceFrameSize();
	uniforms.uFrameAspect.value = aspect;
	uniforms.uLogicalResolution.value.set(width, height);
	postUniforms.uReferenceResolution.value.set(width, height);
}

function syncTafoniUniforms() {
	uniforms.uBackground.value.set(tafoniParams.background);
	uniforms.uTafoniColor.value.set(setTafoniColor(tafoniParams.tafoniColor));
	uniforms.uTafoniOffset.value.set(
		tafoniGenerationState.offsetX,
		tafoniGenerationState.offsetY,
	);
}

function syncBackgroundImageUniforms() {
	uniforms.uBackgroundImage.value = backgroundImageState.texture;
	uniforms.uHasBackgroundImage.value = backgroundImageState.enabled ? 1 : 0;
	uniforms.uBackgroundImageAspect.value = backgroundImageState.aspect;
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

function syncDitherUniforms() {
	postUniforms.uDitherEnabled.value = ditherParams.enabled ? 1 : 0;
	postUniforms.uDitherLevels.value = ditherParams.levels;
	postUniforms.uDitherStrength.value = ditherParams.strength;
	postUniforms.uDitherScale.value = ditherParams.scale;
	postUniforms.uDitherAlpha.value = 0;
}

function syncUniforms() {
	syncFrameMetricsUniforms();
	syncTafoniUniforms();
	syncBackgroundImageUniforms();
	syncMaskUniforms();
	syncDitherUniforms();
}

function syncPreviewUniforms() {
	syncUniforms();
	uniforms.uTransparentExport.value = 0;
}

function isPreviewRenderable() {
	return previewVisible && pageVisible;
}

function stopPreviewLoop() {
	if (previewFrameId) {
		window.cancelAnimationFrame(previewFrameId);
		previewFrameId = 0;
	}
}

function ensureRenderTarget(currentTarget, width, height) {
	if (
		currentTarget &&
		currentTarget.width === width &&
		currentTarget.height === height
	) {
		return currentTarget;
	}
	currentTarget?.dispose();
	return new THREE.WebGLRenderTarget(width, height, {
		depthBuffer: false,
		stencilBuffer: false,
		colorSpace: THREE.SRGBColorSpace,
	});
}

function renderScene(
	targetRenderer,
	target = null,
	{ applyDither = false, intermediateTarget = null } = {},
) {
	if (!applyDither) {
		targetRenderer.setRenderTarget(target);
		targetRenderer.render(scene, camera);
		return intermediateTarget;
	}

	const size = targetRenderer.getDrawingBufferSize(new THREE.Vector2());
	const ditherTarget = ensureRenderTarget(intermediateTarget, size.x, size.y);
	postUniforms.uScene.value = ditherTarget.texture;

	// The old “noise texture on top” look came from this separate screen-space post-process pass.
	// Keeping it optional makes the stylization explicit in preview and export.
	targetRenderer.setRenderTarget(ditherTarget);
	targetRenderer.render(scene, camera);
	targetRenderer.setRenderTarget(target);
	targetRenderer.render(postScene, postCamera);
	return ditherTarget;
}

function renderPreviewFrame() {
	previewFrameId = 0;
	previewRenderQueued = false;
	if (!isPreviewRenderable()) return;
	previewRenderTarget = renderScene(renderer, null, {
		applyDither: ditherParams.enabled,
		intermediateTarget: previewRenderTarget,
	});
}

function requestRender() {
	if (!isPreviewRenderable()) return;
	if (previewRenderQueued || previewFrameId) return;
	previewRenderQueued = true;
	previewFrameId = window.requestAnimationFrame(renderPreviewFrame);
}

function applyState({
	updateAspect = false,
	resize = false,
	syncPreview = true,
} = {}) {
	if (updateAspect) {
		setAspectRatio();
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

	renderer.setPixelRatio(
		Math.min(window.devicePixelRatio, runtimeProfile.previewPixelRatio),
	);
	renderer.setSize(clientWidth, clientHeight, false);
	uniforms.uResolution.value.set(clientWidth, clientHeight);
	syncFrameMetricsUniforms();
	const pixelWidth = Math.max(
		1,
		Math.round(clientWidth * renderer.getPixelRatio()),
	);
	const pixelHeight = Math.max(
		1,
		Math.round(clientHeight * renderer.getPixelRatio()),
	);
	previewRenderTarget = ensureRenderTarget(
		previewRenderTarget,
		pixelWidth,
		pixelHeight,
	);
	requestRender();
}

function revokeBackgroundImageResources() {
	if (backgroundImageState.texture) {
		backgroundImageState.texture.dispose();
		backgroundImageState.texture = null;
	}
	if (backgroundImageState.objectUrl) {
		URL.revokeObjectURL(backgroundImageState.objectUrl);
		backgroundImageState.objectUrl = "";
	}
	backgroundImageState.aspect = 1;
	backgroundImageState.enabled = false;
}

async function loadBackgroundImageTexture(file) {
	const objectUrl = URL.createObjectURL(file);

	try {
		const image = await new Promise((resolve, reject) => {
			const img = new Image();
			img.onload = () => resolve(img);
			img.onerror = () => reject(new Error("Image failed to load."));
			img.src = objectUrl;
		});

		const texture = new THREE.Texture(image);
		texture.colorSpace = THREE.SRGBColorSpace;
		texture.wrapS = THREE.ClampToEdgeWrapping;
		texture.wrapT = THREE.ClampToEdgeWrapping;
		texture.minFilter = THREE.LinearFilter;
		texture.magFilter = THREE.LinearFilter;
		texture.generateMipmaps = false;
		texture.needsUpdate = true;

		return {
			objectUrl,
			texture,
			aspect: image.naturalWidth / Math.max(image.naturalHeight, 1),
		};
	} catch (error) {
		URL.revokeObjectURL(objectUrl);
		throw error;
	}
}

async function handleImageUpload(file) {
	if (!file?.type.startsWith("image/")) return;

	imageStatus.textContent = "Loading background image...";

	try {
		const nextBackground = await loadBackgroundImageTexture(file);
		revokeBackgroundImageResources();
		backgroundImageState.objectUrl = nextBackground.objectUrl;
		backgroundImageState.texture = nextBackground.texture;
		backgroundImageState.aspect = nextBackground.aspect;
		backgroundImageState.enabled = true;

		if (currentThumbnailUrl) URL.revokeObjectURL(currentThumbnailUrl);
		currentThumbnailUrl = URL.createObjectURL(file);
		sourceImagePreview.src = currentThumbnailUrl;
		sourceImagePreview.hidden = false;
		imageDropZone.classList.add("has-preview");
		imageStatus.textContent = file.name;
		syncBackgroundImageUniforms();
		requestRender();
	} catch (error) {
		console.error("Error loading tafoni background image:", error);
		imageStatus.textContent = "Could not read image";
		alert(
			"Could not load that image as a tafoni background. Try another file.",
		);
	}
}

function updatePaneVisibility() {
	const isMaskEnabled = maskParams.enabled;

	maskStyleBinding.hidden = !isMaskEnabled;
	maskAmountBinding.hidden = !isMaskEnabled;
	maskScaleBinding.hidden = !isMaskEnabled;
	maskEdgeWearBinding.hidden = !isMaskEnabled;
	maskBreakupBinding.hidden = !isMaskEnabled;
	maskAdvancedFolder.hidden = !isMaskEnabled;
}

async function exportTafoni({ transparent = false } = {}) {
	const aspect = getSelectedAspect();
	const exportWidth = BASE_EXPORT_WIDTH * exportParams.scale;
	const exportHeight = Math.round(exportWidth / aspect);
	const previousResolution = uniforms.uResolution.value.clone();
	const previousTransparentExport = uniforms.uTransparentExport.value;
	const previousDitherAlpha = postUniforms.uDitherAlpha.value;

	const exportCanvas = document.createElement("canvas");
	const exportRenderer = createRenderer(exportCanvas, {
		quality: "export",
		transparent,
	});

	let exportRenderTarget = null;

	try {
		exportRenderer.setPixelRatio(EXPORT_PIXEL_RATIO);
		exportRenderer.setSize(exportWidth, exportHeight, false);
		exportRenderer.clear();
		uniforms.uResolution.value.set(exportWidth, exportHeight);
		syncUniforms();
		uniforms.uTransparentExport.value = transparent ? 1 : 0;
		postUniforms.uDitherAlpha.value = transparent ? 1 : 0;
		exportRenderTarget = renderScene(exportRenderer, null, {
			applyDither: ditherParams.enabled,
			intermediateTarget: exportRenderTarget,
		});

		const link = document.createElement("a");
		const exportSuffix = transparent ? "-transparent" : "";
		link.download = `tafoni-${exportParams.aspect.toLowerCase()}${exportSuffix}.png`;
		link.href = exportCanvas.toDataURL("image/png");
		link.click();
	} finally {
		uniforms.uResolution.value.copy(previousResolution);
		uniforms.uTransparentExport.value = previousTransparentExport;
		postUniforms.uDitherAlpha.value = previousDitherAlpha;
		syncPreviewUniforms();
		requestRender();
		exportRenderTarget?.dispose();
		exportRenderer.dispose();
	}
}

const pane = new Pane({
	container: paneHost,
	title: "Tafoni Generator",
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

const tafoniFolder = pane.addFolder({ title: "Tafoni" });
tafoniFolder.addBinding(tafoniParams, "background", {
	view: "color",
	label: "background",
});
const tafoniColorBinding = tafoniFolder.addBinding(
	tafoniParams,
	"tafoniColor",
	{
		view: "color",
		label: "color",
	},
);

const ditherFolder = pane.addFolder({
	title: "Ordered Dither",
	expanded: false,
});
const ditherEnabledBinding = ditherFolder.addBinding(ditherParams, "enabled", {
	label: "enabled",
});
ditherFolder.addBinding(ditherParams, "levels", {
	min: 2,
	max: 8,
	step: 1,
	label: "levels",
});
ditherFolder.addBinding(ditherParams, "strength", {
	min: 0,
	max: 1,
	step: 0.01,
	label: "strength",
});
ditherFolder.addBinding(ditherParams, "scale", {
	min: 0.5,
	max: 4,
	step: 0.05,
	label: "scale",
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

pane.addButton({ title: "Generate Tafoni" }).on("click", () => {
	randomizeTafoni();
	tafoniColorBinding.refresh();
	applyState();
});

pane.addButton({ title: "Set Background Image" }).on("click", () => {
	imageUpload.click();
});

pane.addButton({ title: "Export PNG" }).on("click", () => {
	exportTafoni().catch((error) => {
		console.error("Error exporting tafoni:", error);
		alert("Tafoni export failed. Please try again.");
	});
});

pane.addButton({ title: "Export Transparent PNG" }).on("click", () => {
	exportTafoni({ transparent: true }).catch((error) => {
		console.error("Error exporting transparent tafoni:", error);
		alert("Transparent tafoni export failed. Please try again.");
	});
});

aspectBinding.on("change", () => {
	applyState({ updateAspect: true, resize: true });
});

maskEnabledBinding.on("change", () => {
	updatePaneVisibility();
	requestRender();
});

ditherEnabledBinding.on("change", () => {
	requestRender();
});

pane.on("change", () => {
	const rawColor = tafoniParams.tafoniColor;
	const sanitizedColor = setTafoniColor(rawColor);
	if (rawColor !== sanitizedColor) {
		tafoniColorBinding.refresh();
	}
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
syncPreviewUniforms();
updatePaneVisibility();

const resizeObserver = new ResizeObserver(() => {
	resizeRenderer();
});

const previewVisibilityObserver = new IntersectionObserver(
	([entry]) => {
		previewVisible = entry?.isIntersecting ?? true;
		if (!previewVisible) {
			stopPreviewLoop();
			previewRenderQueued = false;
			return;
		}
		requestRender();
	},
	{
		threshold: 0.05,
	},
);

const handleDocumentVisibilityChange = () => {
	pageVisible = document.visibilityState !== "hidden";
	if (!pageVisible) {
		stopPreviewLoop();
		previewRenderQueued = false;
		return;
	}
	requestRender();
};

document.addEventListener("visibilitychange", handleDocumentVisibilityChange);
previewVisibilityObserver.observe(previewShell);
resizeObserver.observe(previewShell);
resizeRenderer();
requestRender();
