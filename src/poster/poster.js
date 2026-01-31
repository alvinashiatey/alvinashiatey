import "../scss/poster.scss";
import { DitheredImageHandler } from "./imageHandler.js";

const MAX_WORDS = 100;

// Predefined color pairs: [heading color, body color]
const COLOR_PAIRS = [
  ["#ff48b0", "#0078bf"], // Pink & Blue
  ["#ff6b35", "#004e89"], // Orange & Navy
  ["#7b2cbf", "#2a9d8f"], // Purple & Teal
  ["#e63946", "#1d3557"], // Red & Dark Blue
  ["#f77f00", "#003049"], // Amber & Prussian
  ["#06d6a0", "#ef476f"], // Mint & Pink
  ["#8338ec", "#ff006e"], // Violet & Magenta
  ["#3a86ff", "#fb5607"], // Blue & Orange
  ["#181818", "#FFB511"], // Black & Sunflower
  ["#9b5de5", "#00bbf9"], // Lavender & Cyan
];

const bodyText = document.getElementById("poster-text");
const subheadingWrapper = document.querySelector(".subheading-wrapper");
const closeBtn = document.querySelector(".subheading-wrapper .close-btn");
const saveBtn = document.getElementById("generate-poster-btn");
const randomizeBtn = document.getElementById("randomize-btn");
const posterContainer = document.querySelector(".poster-container");
const imageUpload = document.getElementById("image-upload");
const clearImageBtn = document.getElementById("clear-image-btn");
const backgroundCanvas = document.getElementById("background-canvas");

// Initialize dithered image handler
let imageHandler = null;

// Apply color pair by updating CSS custom properties
function applyColorPair(headingColor, bodyColor) {
  posterContainer.style.setProperty("--poster-heading-color", headingColor);
  posterContainer.style.setProperty("--poster-body-color", bodyColor);
}

// Randomize colors
let lastColorIndex = -1;
randomizeBtn.addEventListener("click", () => {
  let newIndex;
  do {
    newIndex = Math.floor(Math.random() * COLOR_PAIRS.length);
  } while (newIndex === lastColorIndex && COLOR_PAIRS.length > 1);

  lastColorIndex = newIndex;
  const [headingColor, bodyColor] = COLOR_PAIRS[newIndex];
  applyColorPair(headingColor, bodyColor);

  // Randomize dithered image (color, rotation, and dither scale)
  if (imageHandler) {
    imageHandler.randomize(hexToRgb(headingColor));
  }
});

// Helper to parse hex color to RGB object (0-1 range)
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : { r: 0, g: 0, b: 0 };
}

// Get current heading color
function getCurrentHeadingColor() {
  const colorValue = getComputedStyle(posterContainer)
    .getPropertyValue("--poster-heading-color")
    .trim();
  return hexToRgb(colorValue);
}

// Handle image upload
imageUpload.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    if (!imageHandler) {
      imageHandler = new DitheredImageHandler(backgroundCanvas);
    }

    const headingColor = getCurrentHeadingColor();
    await imageHandler.loadImage(file, headingColor);
    backgroundCanvas.classList.add("visible");
    clearImageBtn.hidden = false;
  } catch (error) {
    console.error("Error loading image:", error);
    alert("Error loading image. Please try another file.");
  }
});

// Clear image
clearImageBtn.addEventListener("click", () => {
  if (imageHandler) {
    imageHandler.clear();
  }
  backgroundCanvas.classList.remove("visible");
  clearImageBtn.hidden = true;
  imageUpload.value = "";
});

// Handle window resize
window.addEventListener("resize", () => {
  if (imageHandler) {
    imageHandler.resize();
  }
});

// Word count helper
function countWords(text) {
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
}

// Enforce word limit on body textarea
let lastValidContent = bodyText.value;

bodyText.addEventListener("input", () => {
  const wordCount = countWords(bodyText.value);

  if (wordCount > MAX_WORDS) {
    bodyText.value = lastValidContent;
  } else {
    lastValidContent = bodyText.value;
  }
});

// Hide subheading on close button click
closeBtn.addEventListener("click", () => {
  subheadingWrapper.classList.add("hidden");
});

// Save poster as image using html2canvas
saveBtn.addEventListener("click", async () => {
  try {
    const { default: html2canvas } = await import("html2canvas");

    // Temporarily hide close button for clean export
    const closeButtons = posterContainer.querySelectorAll(".close-btn");
    closeButtons.forEach((btn) => (btn.style.display = "none"));

    const canvas = await html2canvas(posterContainer, {
      scale: 3, // High resolution for printing
      useCORS: true,
      backgroundColor: "#fefefe",
    });

    // Restore close buttons
    closeButtons.forEach((btn) => (btn.style.display = ""));

    const link = document.createElement("a");
    link.download = "poster.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  } catch (error) {
    console.error("Error generating poster:", error);
    alert("To enable save, install html2canvas: pnpm add html2canvas");
  }
});
