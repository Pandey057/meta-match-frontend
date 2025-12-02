// Meta Match App - Fixed Glitches + Filters (Dec 2025)
(function() {
    'use strict';

    // Config
    const API_BASE = 'https://pandeyprateek057-meta-match.hf.space';
    const DRAG_THRESHOLD = 50; // Higher for no random
    const EDGE_WIDTH = 50; // Drag must start on edge
    const TAP_THRESHOLD = 150; // ms for tap vs drag
    const archetypes = ['empath', 'wanderer', 'creator', 'oracle', 'shadowlight'];

    // State
    let users = [];
    let filteredUsers = [];
    let currentCenterId = null;
    let isDragging = false;
    let dragStartTime = 0;
    let startX = 0, startY = 0;
    let currentUser = null;
    let filterParams = { scope: 'global', state: '', gender: '' };

    // DOM
    const slotContainer = document.getElementById('slot-container');
    const leftPanel = document.getElementById('left-panel');
    const rightPanel = document.getElementById('right-panel');
    const cards = new Map();
    const filterToggle = document.getElementById('filter-toggle');
    const filterDropdown = document.querySelector('.filter-dropdown');
    const applyFilter = document.getElementById('apply-filter');

    // Dummies with Gender
    function generateDummies() {
        const dummies = [];
        const namesM = ['Aarav', 'Raj', 'Vikram', 'Arjun']; // Male
        const namesF = ['Priya', 'Meera', 'Lila', 'Sita']; // Female
        const states = ['Maharashtra', 'Karnataka', 'Delhi', 'Tamil Nadu', 'Gujarat'];
        const intents = ['Seeking Adventure', 'Deep Connections', 'Creative Sparks', 'Wisdom Exchange', 'Balance Journey'];
        const abouts = ['Loves midnight philosophies.', 'Artist at heart.', 'Wanderlust eternal.', 'Seer of patterns.', 'Dancing in shadows.'];
        for (let i = 0; i < 100; i++) {
            const isMale = i % 2 === 0;
            dummies.push({
                id: `bot_${i}`,
                name: (isMale ? namesM : namesF)[i % 4],
                age: 25 + (i % 10),
                state: states[i % states.length],
                gender: isMale ? 'M' : 'F',
                archetype: archetypes[i % archetypes.length],
                intent: intents[i % intents.length],
                about: abouts[i % abouts.length],
                is_bot: 1
            });
        }
        return dummies;
    }

    // Fetch with Filters
    async function fetchUsers() {
        try {
            let url = `${API_BASE}/discover?global=${filterParams.scope === 'global' ? 1 : 0}&state=${filterParams.state}&gender=${filterParams.gender}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Fetch failed');
            users = await res.json();
        } catch (err) {
            console.warn('Backend failed:', err);
            users = generateDummies();
        }
        applyFilters();
    }

    // Apply Local Filters
    function applyFilters() {
        filteredUsers = users.filter(u => {
            if (filterParams.state && u.state !== filterParams.state) return false;
            if (filterParams.gender && u.gender !== filterParams.gender) return false;
            return true;
        });
        renderCards(filteredUsers);
        initObservers();
    }

    // Render Cards
    function renderCards(userList = filteredUsers) {
        slotContainer.innerHTML = '';
        cards.clear();
        userList.forEach(user => {
            const card = document.createElement('article');
            card.className = `profile-card ${user.archetype}`;
            card.dataset.userId = user.id;
            card.innerHTML = `
                <div class="archetype-artwork">🔮</div>
                <div class="card-overlay">
                    <div class="archetype-title">${user.archetype.charAt(0).toUpperCase() + user.archetype.slice(1)}</div>
                    <div class="archetype-meaning">${user.intent}</div>
                </div>
                <footer style="position:absolute;bottom:1rem;width:100%;text-align:center;font-size:0.8rem;">
                    ${user.name}, ${user.age} • ${user.state}
                </footer>
            `;
            card.tabIndex = 0;
            card.setAttribute('role', 'button');
            card.setAttribute('aria-label', `${user.name}'s ${user.archetype} Card`);
            cards.set(user.id, card);
            slotContainer.appendChild(card);
        });
    }

    // Center & Tilt (Unchanged, but re-init on filter)
    function initObservers() {
        // Observer code same as before
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                const card = entry.target;
                const rect = entry.boundingClientRect;
                const isCenter = Math.abs(rect.top - (window.innerHeight / 2)) < 100;
                if (isCenter && entry.intersectionRatio > 0.5) {
                    currentCenterId = card.dataset.userId;
                    currentUser = filteredUsers.find(u => u.id === currentCenterId);
                    card.classList.add('active', 'tilted');
                    card.style.setProperty('--tilt-x', `${(Math.random() - 0.5) * 5}deg`);
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

    // Tap Activation (No Stuck: Time-based)
    function setupCardEvents() {
        let tapStart = 0;
        slotContainer.addEventListener('pointerdown', (e) => {
            if (!e.isPrimary || !currentCenterId) return;
            const cardRect = e.target.closest('.profile-card')?.getBoundingClientRect();
            if (!cardRect) return;
            tapStart = Date.now();
            // Edge-only for panels, but tap anywhere for pop
        });

        slotContainer.addEventListener('pointerup', (e) => {
            if (Date.now() - tapStart < TAP_THRESHOLD && !isDragging) {
                const card = cards.get(currentCenterId);
                if (card) card.classList.toggle('active');
            }
        });

        // Keyboard unchanged
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp') slotContainer.scrollBy({ top: -window.innerHeight, behavior: 'smooth' });
            if (e.key === 'ArrowDown') slotContainer.scrollBy({ top: window.innerHeight, behavior: 'smooth' });
        });
    }

    // Drag: Reversed + Edge-Only + Glitch-Free
    function setupDragEvents() {
        slotContainer.addEventListener('pointerdown', handleStart, { passive: false });
        slotContainer.addEventListener('pointermove', handleMove, { passive: false });
        slotContainer.addEventListener('pointerup', handleEnd, { passive: false });
        slotContainer.addEventListener('pointerleave', handleEnd, { passive: false });

        function handleStart(e) {
            if (e.button !== 0 || !currentCenterId) return;
            const cardRect = cards.get(currentCenterId).getBoundingClientRect();
            const edgeDist = Math.min(e.clientX - cardRect.left, cardRect.right - e.clientX);
            if (edgeDist > EDGE_WIDTH) return; // Not on edge → no panel drag
            isDragging = true;
            dragStartTime = Date.now();
            startX = e.clientX;
            startY = e.clientY;
            e.preventDefault(); // No glitch select
        }

        function handleMove(e) {
            if (!isDragging) return;
            e.preventDefault();
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;

            if (Math.abs(deltaY) > Math.abs(deltaX) + DRAG_THRESHOLD) {
                // Vertical: Custom smooth scroll (anti-glitch)
                slotContainer.scrollTop += deltaY;
                return;
            } 
            if (Math.abs(deltaX) > DRAG_THRESHOLD) {
                // Horizontal: Reversed per spec
                leftPanel.classList.add('hidden');
                rightPanel.classList.add('hidden');
                if (deltaX > 0) { // Drag right → open left panel
                    leftPanel.classList.remove('hidden');
                } else { // Drag left → open right panel
                    rightPanel.classList.remove('hidden');
                }
                updateRightPanel(); // If right
            }
        }

        function handleEnd(e) {
            if (!isDragging) return;
            isDragging = false;
            // Auto-close if not hovering
            setTimeout(() => {
                if (!leftPanel.matches(':hover') && !rightPanel.matches(':hover')) {
                    leftPanel.classList.add('hidden');
                    rightPanel.classList.add('hidden');
                }
            }, 2000);
            // Close panels on scroll
            slotContainer.addEventListener('scroll', () => {
                leftPanel.classList.add('hidden');
                rightPanel.classList.add('hidden');
            }, { once: true });
        }
    }

    // Panels & Actions (Unchanged except updateRightPanel uses currentUser)
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

    function setupActions() {
        document.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                alert(`${action.toUpperCase()} for ${currentUser?.name}!`);
            });
        });
    }

    // Filters Setup
    function setupFilters() {
        filterToggle.addEventListener('click', () => {
            const isOpen = !filterDropdown.classList.contains('hidden');
            filterDropdown.classList.toggle('hidden');
            filterToggle.setAttribute('aria-expanded', !isOpen);
        });

        applyFilter.addEventListener('click', () => {
            filterParams.scope = document.getElementById('scope-select').value;
            filterParams.state = document.getElementById('state-select').value;
            filterParams.gender = document.querySelector('input[name="gender"]:checked').value;
            fetchUsers(); // Refetch with params
            filterDropdown.classList.add('hidden');
            filterToggle.setAttribute('aria-expanded', 'false');
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!filterToggle.contains(e.target) && !filterDropdown.contains(e.target)) {
                filterDropdown.classList.add('hidden');
                filterToggle.setAttribute('aria-expanded', 'false');
            }
        });
    }

    // Wheel: Anti-Glitch (Custom RAF for smooth)
    let rafId;
    slotContainer.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (rafId) cancelAnimationFrame(rafId);
        const delta = e.deltaY * 0.5;
        let newTop = slotContainer.scrollTop + delta;
        rafId = requestAnimationFrame(() => {
            slotContainer.scrollTo({ top: newTop, behavior: 'auto' });
        });
    }, { passive: false });

    // Init
    async function init() {
        await fetchUsers();
        setupCardEvents();
        setupDragEvents();
        setupActions();
        setupFilters();
    }

    init();
})();
