/* ===========================================
   GLOBALS
=========================================== */

let profiles = [];
let activeIndex = 0;

const API = "https://meta-match.onrender.com";

/* ===========================================
   FETCH PROFILES
=========================================== */
async function loadProfiles() {
    let r = await fetch(`${API}/discover`);
    profiles = await r.json();

    buildReel();
}

function buildReel() {
    const reel = document.getElementById("reel");
    reel.innerHTML = "";

    profiles.forEach((p, i) => {
        const card = document.createElement("div");
        card.className = "reel-card";
        card.dataset.index = i;

        card.innerHTML = `
            <img src="${placeholderImage()}" class="reel-image">
            <div class="reel-info">
                <div class="reel-name">${cleanName(p.name)}</div>
                <div class="reel-meta">${p.age} • ${p.state}</div>
            </div>
        `;

        card.onclick = () => openPop(i);
        reel.appendChild(card);
    });

    snapTo(activeIndex);
}

function cleanName(n) {
    return n.replace("Bot-", "");
}

function placeholderImage() {
    const list = [
        "https://images.unsplash.com/photo-1517841905240-472988babdf9",
        "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e",
        "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04",
    ];
    return list[Math.floor(Math.random()*list.length)] + "?w=900&q=80";
}

/* ===========================================
   SLOT MACHINE PHYSICS
=========================================== */

const reel = document.getElementById("reel");
let startY = 0;
let currentY = 0;

reel.addEventListener("touchstart", e => {
    startY = e.touches[0].clientY;
});

reel.addEventListener("touchmove", e => {
    let dy = e.touches[0].clientY - startY;
    reel.style.transform = `translateY(${currentY + dy}px)`;
});

reel.addEventListener("touchend", e => {
    let dy = e.changedTouches[0].clientY - startY;

    // fast flick moves more
    if (Math.abs(dy) > 50) {
        if (dy < 0) activeIndex++;
        else activeIndex--;
    }

    if (activeIndex < 0) activeIndex = 0;
    if (activeIndex >= profiles.length) activeIndex = profiles.length - 1;

    snapTo(activeIndex);
});

function snapTo(index) {
    const cardHeight = 320;
    currentY = -(index * cardHeight);
    reel.style.transform = `translateY(${currentY}px)`;
}

/* ===========================================
   POP MODE
=========================================== */

const overlay = document.getElementById("pop-overlay");
const popCard = document.getElementById("pop-card");
const leftPanel = document.getElementById("left-panel");
const rightPanel = document.getElementById("right-panel");

function openPop(index) {
    const p = profiles[index];

    popCard.innerHTML = `
        <img src="${placeholderImage()}" class="pop-image">
        <div class="pop-name">${cleanName(p.name)}</div>
        <div class="pop-meta">${p.age} • ${p.state}</div>
    `;

    overlay.classList.add("show");
}

overlay.onclick = e => {
    if (e.target === overlay) closePop();
};

function closePop() {
    overlay.classList.remove("show");
    leftPanel.classList.remove("open");
    rightPanel.classList.remove("open");
}

/* ===========================================
   SIDE PANEL SWIPES
=========================================== */

let panelStartX = 0;

popCard.addEventListener("touchstart", e => {
    panelStartX = e.touches[0].clientX;
});

popCard.addEventListener("touchend", e => {
    let dx = e.changedTouches[0].clientX - panelStartX;

    if (dx > 60) {
        // swipe right → open left panel
        leftPanel.classList.add("open");
        rightPanel.classList.remove("open");
    }
    else if (dx < -60) {
        // swipe left → open right panel
        rightPanel.classList.add("open");
        leftPanel.classList.remove("open");
    }
});
    
/* ===========================================
   INIT
=========================================== */
loadProfiles();
