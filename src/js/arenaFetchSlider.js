const SLUG = "aa-portfolio"
async function fetchArena(slug){
    const randomString = Math.random().toString(16).slice(2)
    const contentUrl = `https://api.are.na/v2/channels/${slug}?sort=position&order=desc&per=100?nocache=${randomString}`
    return fetch(contentUrl).then(data => data.json())
}

async function handleData() {
    const cache = localStorage.getItem('cache');
    let data = localStorage.getItem('data');
    if (cache && data && !cacheIsExpired(cache)) {
        data = JSON.parse(data);
    } else {
        data = await fetchArena(SLUG);
        const result = data.contents.reduce((acc, content) => {
            const key = content.title.split("_")[0];
            acc[key] = acc[key] || [];
            acc[key].push({
                title: content.title,
                description: content["description_html"],
                image: content.image.original.url
            });
            return acc;
        }, {});
        localStorage.setItem('cache', new Date().toLocaleString());
        localStorage.setItem('data', JSON.stringify(result));
        data = result;
    }
    renderSlider({ data, container: "#sliders" });
}

function renderSlider({data, container}){
    const slider = document.querySelector(container)
    let idx = 0
    if (!slider) return
    for (let key in data){
            idx++
            const div = document.createElement('div')
            div.classList.add("slider__container")
            const ul = document.createElement('ul')
            ul.classList.add("slides")
            const images = listSlides(data[key])
            const info = slideInfoElements({
                title: key.replace(/-/g, " "),
                description: data[key][0].description,
                total: data[key].length
            })
            handleSlider({slides: images, countContainer: info.count.element})
            sliderNav({key, container: ".nav__items", text: idx.toString(), slideContainer: slider})
            ul.append(...images)
            div.append(ul)
            div.append(info.infoWrapper.element)
            div.id = key
            slider.prepend(div)
    }
}

function listSlides(data){
    return data.map((img, idx) => {
        const li = document.createElement('li')
        li.classList.add("slide")
        li.setAttribute("data-title", `${img.title.toLowerCase()}`)
        if (idx === 0) li.classList.add("active")
        const imgEl = document.createElement('img')
        imgEl.src = `${img.image}`
        imgEl.alt = `${img.title}`
        li.appendChild(imgEl)
        return li
    })
}

function sliderNav({key, container, text, slideContainer}){
    const nav = document.querySelector(container)
    if (!nav) return
    const li = document.createElement('li')
    li.classList.add("nav__item")
    li.innerText = text
    li.addEventListener('click', () => {
        slideContainer.scrollTo({
            top: document.getElementById(key).offsetTop,
            left: 0,
            behavior: 'smooth'
        })
    })

    nav.appendChild(li)
}

function slideInfoElements({title, description, total}){
    const elements = {
        infoWrapper: {
            type: 'div',
            classList: ['info__wrapper']
        },
        info: {
            type: 'div',
            classList: ['slide__info']
        },
        title: {
            type: 'p',
            classList: ['slide__title']
        },
        count: {
            type: 'p',
            classList: ['slide__count']
        },
        description: {
            type: 'p',
            classList: ['slide__description']
        }
    };
    Object.keys(elements).forEach(key => {
        elements[key].element = document.createElement(elements[key].type);
        elements[key].classList.forEach(className => elements[key].element.classList.add(className));
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

function handleSlider({slides, countContainer}){
    if (!slides || !countContainer || slides.length <= 1) return
    const slideCount = slides.length
    let current = 1
    let total = slideCount
    let count = 0
    countContainer.innerText = `${current} / ${total}`

    function updateActiveSlide(offset){
        slides[count].classList.remove("active")
        count = (count + offset + slideCount) % slideCount
        slides[count].classList.add("active")
        current = (count + 1).toString()
        total = slideCount
        countContainer.innerText = `${current} / ${total}`
    }

    function nextSlide(){
        updateActiveSlide(1)
    }

    slides.forEach((slide) => {
        slide.addEventListener('click', nextSlide)
    })
}

function cacheIsExpired(cacheDate){
    const now = new Date()
    const cache = new Date(cacheDate)
    const diff = now - cache
    const minutes = Math.floor(diff / 1000 / 60)
    return minutes > 60 * 24
}

window.onload = ()=>{
    handleData().then()
}