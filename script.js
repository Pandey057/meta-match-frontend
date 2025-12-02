/* Dummy profile data */
const profiles = Array.from({ length: 100 }, (_, i) => ({
    name: ["Lina","Aria","Kaira","Rhea","Mira","Ava","Sara","Vera"][i % 8],
    age: 20 + (i % 15),
    state: ["RJ","MH","KA","PB","WB"][i % 5],
    intent: ["friendship","dating","vibe_check"][i % 3],
    arch: ["EMPATH","CREATOR","SHADOW/LIGHT"][i % 3],
    about: "Deep emotional field, intuitive mirror.",
    img: [
        "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e",
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb",
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2",
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e"
    ][i % 4]
}));

/* DOM */
const track = document.getElementById("slot-track");
const leftP = document.getElementById("left-panel");
const rightP = document.getElementById("right-panel");
const profBox = document.getElementById("prof-details");

/* Build cards */
profiles.forEach((u, idx) => {
    let card = document.createElement("div");
    card.className = "card";
    card.dataset.index = idx;

    card.innerHTML = `
        <img src="${u.img}">
        <div class="info-bubble">
            <div class="name">${u.name}</div>
            <div class="meta">${u.age} · ${u.state}</div>
            <div class="intent">${u.intent}</div>
            <div style="margin-top:10px;font-size:14px;font-weight:600;">${u.arch}</div>
        </div>
    `;

    track.appendChild(card);
});

/* Snapping 🟡 */
let cards = document.querySelectorAll(".card");

track.addEventListener("scroll", () => {
    let middle = window.innerHeight / 2;

    cards.forEach(card => {
        let rect = card.getBoundingClientRect();
        let diff = Math.abs(rect.top + rect.height / 2 - middle);

        card.classList.remove("active");
        if (diff < 100) card.classList.add("active");
    });
});

/* Side swipe detection 🟡 */
let startX = 0;

document.body.addEventListener("touchstart", (e) => {
    startX = e.touches[0].clientX;
});

document.body.addEventListener("touchend", (e) => {
    let endX = e.changedTouches[0].clientX;
    let diff = endX - startX;

    let active = document.querySelector(".card.active");
    if (!active) return;

    let idx = active.dataset.index;
    let user = profiles[idx];

    if (diff < -60) {
        // right swipe → open RIGHT PROFILE
        profBox.innerHTML = `
            <h3>${user.name}</h3>
            <p>${user.age} • ${user.state}</p>
            <p><b>${user.arch}</b></p>
            <p>${user.about}</p>
        `;
        rightP.classList.add("show-right");
        leftP.classList.remove("show-left");
    }

    else if (diff > 60) {
        // left swipe → open LEFT ACTIONS
        leftP.classList.add("show-left");
        rightP.classList.remove("show-right");
    }

    else {
        // tap anywhere closes both
        leftP.classList.remove("show-left");
        rightP.classList.remove("show-right");
    }
});
