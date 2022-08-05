const handleLanguage = () => {
  const lg = document.querySelectorAll(".content [lang]");
  const pgn = document.querySelectorAll(".content [lang='gh']");
  const en = document.querySelectorAll(".content [lang='en']");
  const engButton = document.getElementById("en");
  const pgnButton = document.getElementById("pgn");
  lg.forEach((l) => l.setAttribute("hidden", "true"));
  pgn.forEach((p) => p.removeAttribute("hidden"));

  engButton.addEventListener("click", () => {
    if (!en[0].hasAttribute("hidden")) return;
    pgn.forEach((l) => l.setAttribute("hidden", "true"));
    en.forEach((p) => p.removeAttribute("hidden"));
    pgnButton.classList.remove("select");
    engButton.classList.add("select");
  });

  pgnButton.addEventListener("click", () => {
    if (!pgn[0].hasAttribute("hidden")) return;
    en.forEach((l) => l.setAttribute("hidden", "true"));
    pgn.forEach((p) => p.removeAttribute("hidden"));
    engButton.classList.remove("select");
    pgnButton.classList.add("select");
  });
};

(() => {
  document.addEventListener("DOMContentLoaded", function () {
    handleLanguage();
  });
})();
