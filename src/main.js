import "@/scss/main.scss";
import "@/js/arenaFetchSlider.js";

// Quotes cycling logic
function initQuotes() {
  const quotesContainer = document.querySelector(".quotes");
  const quotes = document.querySelectorAll(".quote");
  if (!quotesContainer || quotes.length === 0) return;

  let currentIndex = 0;

  function showNextQuote() {
    quotes.forEach((q) => q.classList.remove("active"));
    quotes[currentIndex].classList.add("active");
    currentIndex = (currentIndex + 1) % quotes.length;
  }

  // Show quotes after 33 seconds
  setTimeout(() => {
    quotesContainer.classList.add("visible");
    showNextQuote();
    // Cycle through quotes every 66 seconds
    setInterval(showNextQuote, 66000);
  }, 33000);
}

document.addEventListener("DOMContentLoaded", initQuotes);

function initToolsMenu() {
  const menu = document.querySelector(".tools-menu");
  const trigger = menu?.querySelector(".tools-menu__trigger");
  const panel = menu?.querySelector(".tools-menu__panel");

  if (!menu || !trigger || !panel) return;

  function setMenuOpen(isOpen) {
    trigger.setAttribute("aria-expanded", String(isOpen));
    panel.hidden = !isOpen;
    menu.classList.toggle("is-open", isOpen);
  }

  trigger.addEventListener("click", () => {
    setMenuOpen(trigger.getAttribute("aria-expanded") !== "true");
  });

  document.addEventListener("click", (event) => {
    if (!menu.contains(event.target)) setMenuOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    setMenuOpen(false);
    trigger.focus();
  });
}

document.addEventListener("DOMContentLoaded", initToolsMenu);
