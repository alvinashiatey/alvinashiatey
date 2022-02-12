import Glide from "@glidejs/glide";

const handleRevealInfo = (e) => {
  const headingButton = document.querySelector("#header__icon");
  headingButton.addEventListener("click", () => {
    const info = document.querySelector(".header__content");
    info.toggleAttribute("hidden");
    if (info.getAttribute("hidden") === null) {
      headingButton.querySelector("h1").innerText = "Alvin Ashiatey";
    } else {
      headingButton.querySelector("h1").innerText = "AA";
    }
  });
};

const slideShowPortfolio = () => {
  const gl = new Glide(".glide", {
    type: "carousel",
    perView: 1,
    startAt: 0,
    autoplay: 7000,
  }).mount();
  return gl;
};

const fecthPortfolio = () => {
  let channelSlug = "aa-portfolio";
  let contentsURL = `https://api.are.na/v2/channels/${channelSlug}?sort=position&order=asc&per=100`;
  let portfolioContainer = document.querySelector(
    ".portfolio__wrapper .images"
  );
  return fetch(contentsURL)
    .then((response) => {
      return response.json();
    })
    .then((data) => {
      data.contents.forEach((content) => {
        let imageDiv = document.createElement("div");
        imageDiv.classList.add("image");
        let image = document.createElement("img");
        image.src = content.image.original.url;
        image.attributes.alt = content.title;
        imageDiv.appendChild(image);
        portfolioContainer.appendChild(imageDiv);
      });
      return new Promise((resolve, reject) => {
        resolve("complete");
      });
    })
    .then(() => {
      slideShowPortfolio();
    });
};

(() => {
  document.addEventListener("DOMContentLoaded", function () {
    fecthPortfolio();
    handleRevealInfo();
  });
})();
