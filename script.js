// ------- PROFILE DATA (100 PROFILES AUTO-GENERATED) -------
const profiles = Array.from({ length: 100 }).map((_, i) => ({
    name: ["Lina","Aria","Kaira","Mira","Sana","Tara","Nova","Rhea","Asha","Ira"][i % 10],
    age: 18 + (i % 20),
    img: `https://picsum.photos/seed/meta${i}/800/1000`,
    meta: [
        "Shadow/Light duality",
        "Empathic field reader",
        "Cognitive resonance type",
        "Intuitive archetype tier 2",
        "Energy signature: Warm"
    ]
}));

const track = document.getElementById("card-track");
let currentIndex = 0;

// ------- BUILD CARDS -------
profiles.forEach((p, idx) => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `<img src="${p.img}">`;
    card.dataset.index = idx;
    track.appendChild(card);
});

// ------- UPDATE NAME STRIP -------
function updateStrip() {
    const p = profiles[currentIndex];
    document.getElementById("strip-name").innerText = p.name;
    document.getElementById("strip-age").innerText = p.age + " yrs";
}
updateStrip();

// ------- UPDATE SIDE PANEL META -------
function updateMetaPanel() {
    const p = profiles[currentIndex];
    document.getElementById("meta-list").innerHTML =
        p.meta.map(m => `<div>• ${m}</div>`).join("");
}
updateMetaPanel();

// ------- POSITION TRACK -------
function positionTrack() {
    const offset = -currentIndex * (window.innerHeight * 0.95);
    track.style.transform = `translateY(${offset}px)`;
}
positionTrack();

// ------- TOUCH / SWIPE LOGIC -------
let startY = 0;
let deltaY = 0;

document.addEventListener("touchstart", e => {
    startY = e.touches[0].clientY;
});

document.addEventListener("touchmove", e => {
    deltaY = e.touches[0].clientY - startY;
});

document.addEventListener("touchend", () => {
    if (Math.abs(deltaY) > 50) {
        if (deltaY < 0 && currentIndex < profiles.length - 1) currentIndex++;
        if (deltaY > 0 && currentIndex > 0) currentIndex--;
        updateStrip();
        updateMetaPanel();
        positionTrack();
    }
    deltaY = 0;
});

// ------- SIDE PANEL LOGIC -------
let startX = 0;
let deltaX = 0;

document.addEventListener("touchstart", e => {
    startX = e.touches[0].clientX;
});

document.addEventListener("touchmove", e => {
    deltaX = e.touches[0].clientX - startX;
});

document.addEventListener("touchend", () => {
    // OPEN LEFT PANEL
    if (deltaX > 80) {
        document.getElementById("left-panel").style.transform = "translateX(60vw)";
    }

    // OPEN RIGHT PANEL
    if (deltaX < -80) {
        document.getElementById("right-panel").style.transform = "translateX(-60vw)";
    }

    // CLOSE PANELS on small slide
    if (Math.abs(deltaX) < 20) {
        document.getElementById("left-panel").style.transform = "";
        document.getElementById("right-panel").style.transform = "";
    }

    deltaX = 0;
});
