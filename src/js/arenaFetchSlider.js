const SLUG = "aa-portfolio";
const CACHE_KEY = "arena-slider-cache-v3";
const DATA_KEY = "arena-slider-data-v3";

async function fetchArena(slug) {
	const contentUrl = `https://api.are.na/v3/channels/${slug}/contents?order=desc&per=100`;
	return fetch(contentUrl).then((data) => data.json());
}

async function handleData() {
	const cache = localStorage.getItem(CACHE_KEY);
	let data = localStorage.getItem(DATA_KEY);

	if (cache && data && !cacheIsExpired(cache)) {
		data = JSON.parse(data);
	} else {
		data = await fetchArena(SLUG);
		const result = data.data.reduce((acc, content) => {
			const key = content.title.split("_")[0];
			acc[key] = acc[key] || [];

			const isVideo =
				content.type === "Attachment" &&
				content.attachment?.content_type?.startsWith("video/");

			acc[key].push({
				title: content.title,
				description: getPlainText(content?.description?.html),
				image: getArenaImageUrl(content.image),
				type: isVideo ? "video" : "image",
				videoUrl: isVideo ? content.attachment.url : null,
			});
			return acc;
		}, {});
		localStorage.setItem(CACHE_KEY, new Date().toLocaleString());
		localStorage.setItem(DATA_KEY, JSON.stringify(result));
		localStorage.removeItem("cache");
		localStorage.removeItem("data");
		data = result;
	}

	renderSlider({ data, container: "#sliders" });
}

function renderSlider({ data, container }) {
	const slider = document.querySelector(container);

	if (!slider) return;

	const projects = buildProjects(data);

	if (!projects.length) {
		slider.replaceChildren();
		return;
	}

	const stage = createStage();
	const clickTarget = slider.closest(".container") || slider;
	slider.replaceChildren(stage.container);
	handleSlider({ projects, stage, clickTarget });
}

function buildProjects(data) {
	return Object.entries(data)
		.map(([key, items]) => ({
			key,
			title: key.replace(/-/g, " "),
			description: items[0]?.description || "",
			items: items.filter((item) => item.type === "image" && item.image),
		}))
		.filter((project) => project.items.length > 0);
}

function createStage() {
	const container = document.createElement("div");
	container.classList.add("slider__container", "slider__container--single");

	const slides = document.createElement("ul");
	slides.classList.add("slides");

	const slideLayers = ["is-oldest", "is-previous", "is-current"].map(
		(className) => {
			const slide = document.createElement("li");
			slide.classList.add("slide", className);
			slides.appendChild(slide);
			return slide;
		},
	);

	const info = slideInfoElements({
		title: "",
		description: "",
		total: "",
	});

	container.append(slides, info.infoWrapper.element);

	return {
		container,
		slides,
		slideLayers,
		title: info.title.element,
		count: info.count.element,
		description: info.description.element,
	};
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
			elements[key].element.classList.add(className),
		);
	});
	elements.title.element.innerText = title;
	elements.count.element.innerText = total;
	elements.description.element.textContent = description;
	elements.info.element.appendChild(elements.title.element);
	elements.info.element.appendChild(elements.count.element);
	elements.infoWrapper.element.appendChild(elements.info.element);
	elements.infoWrapper.element.appendChild(elements.description.element);
	return elements;
}

function handleSlider({ projects, stage, clickTarget }) {
	if (!projects.length) return;

	const entries = buildEntries(projects);
	let currentIndex = 0;
	let selectionHistory = [entries[currentIndex]];
	const preloadedImages = new Set();

	function syncStage() {
		const paddedHistory = [null, null, ...selectionHistory].slice(-3);

		stage.slideLayers.forEach((slide, index) => {
			renderSlide(slide, paddedHistory[index]?.item);
		});

		const currentSelection = selectionHistory[selectionHistory.length - 1];
		stage.title.innerText = currentSelection.project.title;
		stage.count.innerText = `${currentSelection.itemIndex + 1} / ${currentSelection.project.items.length}`;
		stage.description.textContent = currentSelection.project.description || "";
		preloadUpcomingEntries(entries, currentIndex, preloadedImages);
	}

	function nextSlide() {
		currentIndex = (currentIndex + 1) % entries.length;
		selectionHistory = [...selectionHistory, entries[currentIndex]].slice(-3);
		syncStage();
	}

	function handleCycleClick(event) {
		const clickedInteractive = event.target.closest(
			"a, button, input, textarea, select, label",
		);
		const clickedContent = event.target.closest(".content, .content-panel");

		if (clickedInteractive || clickedContent) return;
		nextSlide();
	}

	syncStage();
	clickTarget.addEventListener("click", handleCycleClick);
}

function buildEntries(projects) {
	return projects.flatMap((project) =>
		project.items.map((item, itemIndex) => ({
			project,
			item,
			itemIndex,
		})),
	);
}

function renderSlide(container, item) {
	container.replaceChildren();

	if (!item) return;

	container.style.setProperty("--slide-image-width", `${randomWidth()}%`);

	const imgEl = document.createElement("img");
	imgEl.src = item.image;
	imgEl.alt = item.title;
	imgEl.loading = "eager";
	imgEl.decoding = "async";
	container.appendChild(imgEl);
}

function preloadUpcomingEntries(
	entries,
	currentIndex,
	preloadedImages,
	count = 2,
) {
	for (let offset = 1; offset <= count; offset += 1) {
		const nextIndex = (currentIndex + offset) % entries.length;
		const src = entries[nextIndex]?.item?.image;

		if (!src || preloadedImages.has(src)) continue;

		const img = new Image();
		img.src = src;
		preloadedImages.add(src);
	}
}

function getArenaImageUrl(image) {
	if (!image) return null;

	const variants = [
		image.display,
		image.large,
		image.thumb,
		image.original,
		image,
	];

	for (const variant of variants) {
		const src = variant?.src || variant?.url;
		if (src) return src;
	}

	return null;
}

function getPlainText(html) {
	if (!html) return "";

	const doc = new DOMParser().parseFromString(html, "text/html");
	return doc.body.textContent?.trim() || "";
}

function cacheIsExpired(cacheDate) {
	const now = new Date();
	const cache = new Date(cacheDate);
	const diff = now - cache;
	const minutes = Math.floor(diff / 1000 / 60);
	return minutes > 60 * 24;
}

function randomWidth() {
	return 30 + Math.floor(Math.random() * 51);
}

window.onload = () => {
	handleData();
};
