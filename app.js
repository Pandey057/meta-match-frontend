// Meta Match App - Blueprint v1.0 (Dec 2025)
// Vanilla JS: Slot Reel, Drag Panels, HF Backend

(function() {
    'use strict';

    // Config
    const API_BASE = 'https://pandeyprateek057-meta-match.hf.space';
    const DRAG_THRESHOLD = 20; // px diff for vertical vs horizontal
    const archetypes = ['empath', 'wanderer', 'creator', 'oracle', 'shadowlight'];

    // State
    let users = [];
    let currentCenterId = null;
    let isDragging = false;
    let startX = 0, startY = 0;
    let currentUser = null;

    // DOM
    const slotContainer = document.getElementById('slot-container');
    const leftPanel = document.getElementById('left-panel');
    const rightPanel = document.getElementById('right-panel');
    const cards = new Map(); // id -> card element

    // Dummy Data Fallback (100 bots, cycled archetypes)
    function generateDummies() {
        const dummies = [];
        const names = ['Aarav', 'Priya', 'Raj', 'Meera', 'Vikram', 'Lila', 'Arjun', 'Sita'];
        const states = ['Maharashtra', 'Karnataka', 'Delhi', 'Tamil Nadu', 'Gujarat'];
        const intents = ['Seeking Adventure', 'Deep Connections', 'Creative Sparks', 'Wisdom Exchange', 'Balance Journey'];
        const abouts = ['Loves midnight philosophies.', 'Artist at heart.', 'Wanderlust eternal.', 'Seer of patterns.', 'Dancing in shadows.'];
        for (let i = 0; i < 100; i++) {
            dummies.push({
                id: `bot_${i}`,
                name: names[i % names.length],
                age: 25 + (i % 10),
                state: states[i % states.length],
                archetype: archetypes[i % archetypes.length],
                intent: intents[i % intents.length],
                about: abouts[i % abouts.length],
                is_bot: 1
            });
        }
        return dummies;
    }

    // Fetch Users
    async function fetchUsers() {
        try {
            const res = await fetch(`${API_BASE}/discover`);
            if (!res.ok) throw new Error('Fetch failed');
            users = await res.json();
        } catch (err) {
            console.warn('Backend /discover failed:', err);
            users = generateDummies();
        }
        renderCards();
        initObservers();
    }

    // Render Cards
    function renderCards() {
        slotContainer.innerHTML = '';
        users.forEach(user => {
            const card = document.createElement('article');
            card.className = `profile-card ${user.archetype}`;
            card.dataset.userId = user.id;
            card.innerHTML = `
                <div class="archetype-artwork">🔮</div> <!-- Placeholder; future AI art -->
                <div class="card-overlay">
                    <div class="archetype-title">${user.archetype.charAt(0).toUpperCase() + user.archetype.slice(1)}</div>
                    <div class="archetype-meaning">${user.intent}</div>
                </div>
                <footer style="position:absolute;bottom:1rem;width:100%;text-align:center;font-size:0.8rem;">
                    ${user.name}, ${user.age} • ${user.state}
                </footer>
            `;
            card.tabIndex = 0; // Keyboard focus
            card.setAttribute('role', 'button');
            card.setAttribute('aria-label', `${user.name}'s ${user.archetype} Card`);
            cards.set(user.id, card);
            slotContainer.appendChild(card);
        });
    }

    // Center Detection & Tilt
    function initObservers() {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                const card = entry.target;
                const rect = entry.boundingClientRect;
                const isCenter = Math.abs(rect.top - (window.innerHeight / 2)) < 100; // ~center tolerance
                if (isCenter && entry.intersectionRatio > 0.5) {
                    currentCenterId = card.dataset.userId;
                    currentUser = users.find(u => u.id === currentCenterId);
                    card.classList.add('active', 'tilted');
                    card.style.setProperty('--tilt-x', `${(Math.random() - 0.5) * 5}deg`); // Subtle tilt
                    card.style.setProperty('--scale', '1.02');
                } else {
                    card.classList.remove('active', 'tilted');
                    card.style.removeProperty('--tilt-x');
                    card.style.removeProperty('--scale');
                }
            });
        }, { threshold: [0.5], rootMargin: '0px' });
        document.querySelectorAll('.profile-card').forEach(card => observer.observe(card));
    }

    // Card Activation (Tap for Pop + Hotspots)
    function setupCardEvents() {
        slotContainer.addEventListener('click', (e) => {
            if (e.target.closest('.profile-card')?.dataset.userId !== currentCenterId) return;
            const card = cards.get(currentCenterId);
            card.classList.toggle('active'); // Pop if not already
            // Hotspots active via drag listeners below
        }, true);

        // Keyboard: Arrows for scroll
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp') slotContainer.scrollBy({ top: -window.innerHeight, behavior: 'smooth' });
            if (e.key === 'ArrowDown') slotContainer.scrollBy({ top: window.innerHeight, behavior: 'smooth' });
        });
    }

    // Drag Detection: Vertical Scroll vs Horizontal Panels
    function setupDragEvents() {
        let isHorizontal = false;

        // Start Drag
        slotContainer.addEventListener('touchstart', handleStart, { passive: true });
        slotContainer.addEventListener('mousedown', handleStart);

        function handleStart(e) {
            if (!currentCenterId || e.button === 2) return; // Right-click ignore
            isDragging = true;
            startX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
            startY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
            isHorizontal = false;
            slotContainer.style.scrollBehavior = 'auto'; // Disable smooth during drag
        }

        // Move
        slotContainer.addEventListener('touchmove', handleMove, { passive: false });
        slotContainer.addEventListener('mousemove', handleMove);

        function handleMove(e) {
            if (!isDragging) return;
            e.preventDefault();
            const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
            const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
            const deltaX = clientX - startX;
            const deltaY = clientY - startY;

            // Enforce: Vertical > Horizontal → Scroll
            if (Math.abs(deltaY) > Math.abs(deltaX) + DRAG_THRESHOLD) {
                if (!isHorizontal) {
                    // Vertical: Scroll
                    slotContainer.scrollTop += deltaY * 0.5; // Momentum sim
                    return;
                }
            } else if (Math.abs(deltaX) > DRAG_THRESHOLD) {
                isHorizontal = true;
                // Horizontal: Slide panels
                if (deltaX > 0) {
                    // Drag right → Right panel
                    rightPanel.classList.remove('hidden');
                    leftPanel.classList.add('hidden');
                    updateRightPanel();
                } else {
                    // Drag left → Left panel
                    leftPanel.classList.remove('hidden');
                    rightPanel.classList.add('hidden');
                }
                return; // Prevent scroll
            }
        }

        // End
        slotContainer.addEventListener('touchend', handleEnd, { passive: true });
        slotContainer.addEventListener('mouseup', handleEnd);
        slotContainer.addEventListener('mouseleave', handleEnd);

        function handleEnd() {
            if (!isDragging) return;
            isDragging = false;
            slotContainer.style.scrollBehavior = 'smooth'; // Re-enable snap
            // Close panels after delay? Or tap to close
            setTimeout(() => {
                if (leftPanel.matches(':hover') || rightPanel.matches(':hover')) return;
                leftPanel.classList.add('hidden');
                rightPanel.classList.add('hidden');
                leftPanel.setAttribute('aria-hidden', 'true');
                rightPanel.setAttribute('aria-hidden', 'true');
            }, 2000);
        }
    }

    // Update Right Panel
    function updateRightPanel() {
        if (!currentUser) return;
        document.getElementById('panel-name').textContent = currentUser.name;
        document.getElementById('panel-age').textContent = currentUser.age;
        document.getElementById('panel-state').textContent = currentUser.state;
        document.getElementById('panel-archetype').textContent = currentUser.archetype;
        document.getElementById('panel-intent').textContent = currentUser.intent;
        document.getElementById('panel-about').textContent = currentUser.about;
        rightPanel.setAttribute('aria-hidden', 'false');
    }

    // Left Panel Actions (Placeholders; future modals/endpoints)
    function setupActions() {
        document.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                alert(`${action.toUpperCase()} Activated for ${currentUser?.name}!`); // Mock; future HF calls
                // e.g., fetch(`${API_BASE}/${action}`, { method: 'POST', body: JSON.stringify({ userId: currentUser.id }) });
            });
        });
    }

    // Init
    async function init() {
        await fetchUsers();
        setupCardEvents();
        setupDragEvents();
        setupActions();
        // Wheel for desktop momentum
        slotContainer.addEventListener('wheel', (e) => {
            e.preventDefault();
            slotContainer.scrollBy({ top: e.deltaY * 0.5, behavior: 'auto' });
        }, { passive: false });
    }

    // Boot
    init();
})();
