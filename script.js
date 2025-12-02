/* ============================================================
   META-MATCH FRONTEND — GOLD TAROT EDITION (FULL)
   ============================================================ */

const API = "https://meta-match.onrender.com";
let profiles = [];
let index = 0;
let isPopped = false;

/* ============================================================
   FETCH FEED
============================================================ */
async function loadFeed() {
    let r = await fetch(`${API}/discover`);
    profiles = await r.json();

    buildSlot();
}

loadFeed();

/* ============================================================
   BUILD SLOT MACHINE (VERTICAL TRACK)
============================================================ */
function buildSlot() {
    const track = document.getElementById("slot-track");
    track.innerHTML = "";

    profiles.forEach((p, i) => {
        const card = document.createElement("div");
        card.className = "slot-card";

        const img = document.createElement("img");
        img.src = randomArchetypeIMG(p.archetype);

        const info = document.createElement("div");
        info.className = "slot-info";
        info.innerText = `${p.name.replace("Bot-", "")} • ${p.age}`;

        card.appendChild(img);
        card.appendChild(info);

        card.addEventListener("click", () => popCard(p));

        track.appendChild(card);
    });

    centerCard();
}

/* ============================================================
   RANDOM TAROT-LIKE IMAGE
============================================================ */
function randomArchetypeIMG(arch) {
    return {
        empath: "https://images.unsplash.com/photo-1519682577862-22b62b24e493",
        wanderer: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee",
        creator: "https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d",
        oracle: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e",
        shadow_light: "https://images.unsplash.com/photo-1524253482453-3fed8d2fe12b"
    }[arch] + "?auto=compress&fit=crop&w=800&q=80";
}

/* ============================================================
   CENTER THE CARD (SNAP EFFECT)
============================================================ */
function centerCard() {
    const track = document.getElementById("slot-track");
    const cardH = 260;
    track.style.transform = `translateY(${-index * cardH}px)`;
}

/* ============================================================
   TOUCH EVENTS FOR SLOT MACHINE SCROLL
============================================================ */
let startY = 0;

document.getElementById("slot-container").addEventListener("touchstart", e => {
    startY = e.touches[0].clientY;
});

document.getElementById("slot-container").addEventListener("touchend", e => {
    let endY = e.changedTouches[0].clientY;

    if (endY - startY > 50) moveUp();
    if (startY - endY > 50) moveDown();
});

function moveUp() {
    index = Math.max(0, index - 1);
    centerCard();
}
function moveDown() {
    index = Math.min(profiles.length - 1, index + 1);
    centerCard();
}

/* ============================================================
   POP CARD (TAP CENTER)
============================================================ */
function popCard(p) {
    const pop = document.getElementById("pop-card");

    pop.style.backgroundImage = `url(${randomArchetypeIMG(p.archetype)})`;
    document.getElementById("pop-name").innerText = p.name.replace("Bot-", "");
    document.getElementById("pop-meta").innerText = `${p.age} • ${p.state} • ${p.archetype}`;

    document.getElementById("pop-stage").classList.add("show");
    isPopped = true;
}

/* ============================================================
   SIDE PANELS (LEFT = ACTIONS / RIGHT = PROFILE)
============================================================ */
let sideStartX = 0;

document.getElementById("pop-stage").addEventListener("touchstart", e => {
    sideStartX = e.touches[0].clientX;
});

document.getElementById("pop-stage").addEventListener("touchend", e => {
    if (!isPopped) return;

    let endX = e.changedTouches[0].clientX;

    if (endX - sideStartX > 40) openLeftPanel();
    if (sideStartX - endX > 40) openRightPanel();
});

function openLeftPanel() {
    document.getElementById("left-panel").classList.add("open");
}

function openRightPanel() {
    const p = profiles[index];

    document.getElementById("profile-meta").innerHTML = `
        <div><b>Name:</b> ${p.name}</div>
        <div><b>Age:</b> ${p.age}</div>
        <div><b>State:</b> ${p.state}</div>
        <div><b>Archetype:</b> ${p.archetype}</div>
        <div><b>Intent:</b> ${p.intent}</div>
        <div><b>About:</b> ${p.about}</div>
    `;

    document.getElementById("right-panel").classList.add("open");
}

/* CLOSE PANELS BY TAP */
document.getElementById("pop-stage").addEventListener("click", e => {
    if (e.target.id === "pop-stage") {
        closePanels();
        closePop();
    }
});

function closePanels() {
    document.getElementById("left-panel").classList.remove("open");
    document.getElementById("right-panel").classList.remove("open");
}

function closePop() {
    document.getElementById("pop-stage").classList.remove("show");
    isPopped = false;
}
