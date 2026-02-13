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
    // Cycle through quotes every 33 seconds
    setInterval(showNextQuote, 33000);
  }, 33000);
}

document.addEventListener("DOMContentLoaded", initQuotes);
