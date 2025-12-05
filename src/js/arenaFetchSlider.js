const SLUG = "aa-portfolio";
async function fetchArena(slug) {
  const randomString = Math.random().toString(16).slice(2);
  const contentUrl = `https://api.are.na/v2/channels/${slug}?sort=position&order=desc&per=100?nocache=${randomString}`;
  return fetch(contentUrl).then((data) => data.json());
}

async function handleData() {
  const cache = localStorage.getItem("cache");
  let data = localStorage.getItem("data");
  if (cache && data && !cacheIsExpired(cache)) {
    data = JSON.parse(data);
  } else {
    data = await fetchArena(SLUG);
    const result = data.contents.reduce((acc, content) => {
      const key = content.title.split("_")[0];
      acc[key] = acc[key] || [];

      const isVideo =
        content.class === "Attachment" &&
        content.attachment?.content_type?.startsWith("video/");

      acc[key].push({
        title: content.title,
        description: content["description_html"],
        image: content.image?.original?.url || null,
        type: isVideo ? "video" : "image",
        videoUrl: isVideo ? content.attachment.url : null,
      });
      return acc;
    }, {});
    localStorage.setItem("cache", new Date().toLocaleString());
    localStorage.setItem("data", JSON.stringify(result));
    data = result;
  }
  renderSlider({ data, container: "#sliders" });
}

function renderSlider({ data, container }) {
  const slider = document.querySelector(container);
  let idx = 0;
  if (!slider) return;
  for (let key in data) {
    idx++;
    const div = document.createElement("div");
    div.classList.add("slider__container");
    const ul = document.createElement("ul");
    ul.classList.add("slides");
    const images = listSlides(data[key]);
    const info = slideInfoElements({
      title: key.replace(/-/g, " "),
      description: data[key][0].description,
      total: data[key].length,
    });
    handleSlider({ slides: images, countContainer: info.count.element });
    sliderNav({
      key,
      container: ".nav__items",
      text: idx.toString(),
      slideContainer: slider,
    });
    ul.append(...images);
    div.append(ul);
    div.append(info.infoWrapper.element);
    div.id = key;
    slider.prepend(div);
  }
}

function listSlides(data) {
  return data.map((item, idx) => {
    const li = document.createElement("li");
    li.classList.add("slide");
    li.setAttribute("data-title", `${item.title.toLowerCase()}`);
    li.setAttribute("data-type", item.type);
    if (idx === 0) li.classList.add("active");

    if (item.type === "video") {
      const videoEl = document.createElement("video");
      videoEl.src = item.videoUrl;
      videoEl.muted = true;
      videoEl.loop = true;
      videoEl.playsInline = true;
      videoEl.preload = "metadata";
      if (item.image) {
        videoEl.poster = item.image;
      }
      li.appendChild(videoEl);
    } else {
      const imgEl = document.createElement("img");
      imgEl.src = `${item.image}`;
      imgEl.alt = `${item.title}`;
      li.appendChild(imgEl);
    }

    return li;
  });
}

function sliderNav({ key, container, text, slideContainer }) {
  const nav = document.querySelector(container);
  if (!nav) return;
  const li = document.createElement("li");
  li.classList.add("nav__item");
  li.setAttribute("data-target", key);
  li.innerText = text;
  li.addEventListener("click", () => {
    slideContainer.scrollTo({
      top: document.getElementById(key).offsetTop,
      left: 0,
      behavior: "smooth",
    });
  });

  nav.appendChild(li);
}

function slideInfoElements({ title, description, total }) {
  const elements = {
    infoWrapper: {
      type: "div",
      classList: ["info__wrapper"],
    },
    info: {
      type: "div",
      classList: ["slide__info"],
    },
    title: {
      type: "p",
      classList: ["slide__title"],
    },
    count: {
      type: "p",
      classList: ["slide__count"],
    },
    description: {
      type: "p",
      classList: ["slide__description"],
    },
  };
  Object.keys(elements).forEach((key) => {
    elements[key].element = document.createElement(elements[key].type);
    elements[key].classList.forEach((className) =>
      elements[key].element.classList.add(className)
    );
  });
  elements.title.element.innerText = title;
  elements.count.element.innerText = total;
  elements.description.element.innerHTML = description;
  elements.info.element.appendChild(elements.title.element);
  elements.info.element.appendChild(elements.count.element);
  elements.infoWrapper.element.appendChild(elements.info.element);
  elements.infoWrapper.element.appendChild(elements.description.element);
  return elements;
}

function handleSlider({ slides, countContainer }) {
  if (!slides || !countContainer || slides.length <= 1) return;
  const slideCount = slides.length;
  let current = 1;
  let total = slideCount;
  let count = 0;
  countContainer.innerText = `${current} / ${total}`;

  function handleVideoPlayback(slide, shouldPlay) {
    const video = slide.querySelector("video");
    if (video) {
      if (shouldPlay) {
        video.play().catch(() => {});
      } else {
        video.pause();
        video.currentTime = 0;
      }
    }
  }

  function updateActiveSlide(offset) {
    // Pause video on current slide
    handleVideoPlayback(slides[count], false);

    slides[count].classList.remove("active");
    count = (count + offset + slideCount) % slideCount;
    slides[count].classList.add("active");

    // Play video on new active slide
    handleVideoPlayback(slides[count], true);

    current = (count + 1).toString();
    total = slideCount;
    countContainer.innerText = `${current} / ${total}`;
  }

  function nextSlide() {
    updateActiveSlide(1);
  }

  // Play video on first active slide if it's a video
  handleVideoPlayback(slides[0], true);

  slides.forEach((slide) => {
    slide.addEventListener("click", nextSlide);
  });
}

function cacheIsExpired(cacheDate) {
  const now = new Date();
  const cache = new Date(cacheDate);
  const diff = now - cache;
  const minutes = Math.floor(diff / 1000 / 60);
  return minutes > 60 * 24;
}

function setupIntersectionObserver() {
  const sliderContainers = document.querySelectorAll(".slider__container");
  const navItems = document.querySelectorAll(".nav__item");

  if (!sliderContainers.length || !navItems.length) return;

  const observerOptions = {
    root: null,
    rootMargin: "-20% 0px -60% 0px",
    threshold: 0,
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const targetId = entry.target.id;
      const correspondingNavItem = document.querySelector(
        `.nav__item[data-target="${targetId}"]`
      );

      if (entry.isIntersecting) {
        navItems.forEach((item) => item.classList.remove("active"));
        if (correspondingNavItem) {
          correspondingNavItem.classList.add("active");
        }
      }
    });
  }, observerOptions);

  sliderContainers.forEach((container) => {
    observer.observe(container);
  });
}

window.onload = () => {
  handleData().then(() => {
    setupIntersectionObserver();
  });
};
