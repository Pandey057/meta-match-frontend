// Meta Match App - FULL BUILD: Gestures, Filters, Actions (Dec 2025)
(function() {
    'use strict';

    // Config
    const API_BASE = 'https://pandeyprateek057-meta-match.hf.space';
    const DRAG_THRESHOLD = 50; // Minimum drag to start moving panels/scroll
    const SWIPE_THRESHOLD = 150; // Minimum horizontal drag to trigger like/dislike action
    const EDGE_WIDTH = 50; // Drag must start on edge for panels
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
        const namesM = ['Aarav', 'Raj', 'Vikram', 'Arjun', 'Siddharth']; // Male
        const namesF = ['Priya', 'Meera', 'Lila', 'Sita', 'Zara']; // Female
        const states = ['Maharashtra', 'Karnataka', 'Delhi', 'Tamil Nadu', 'Gujarat', 'West Bengal'];
        const intents = ['Seeking Adventure', 'Deep Connections', 'Creative Sparks', 'Wisdom Exchange', 'Balance Journey'];
        const abouts = ['Loves midnight philosophies.', 'Artist at heart.', 'Wanderlust eternal.', 'Seer of patterns.', 'Dancing in shadows.'];
        for (let i = 0; i < 100; i++) {
            const isMale = i % 2 === 0;
            dummies.push({
                id: `bot_${i}`,
                name: (isMale ? namesM : namesF)[i % namesM.length],
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
            // NOTE: For a real app, you would include filterParams in the URL for backend filtering
            let url = `${API_BASE}/discover?global=${filterParams.scope === 'global' ? 1 : 0}&state=${filterParams.state}&gender=${filterParams.gender}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Fetch failed');
            users = await res.json();
        } catch (err) {
            console.warn('Backend failed, using dummies:', err);
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

    // Handle Swipe Action (Like, Dislike, Superlike)
    function handleSwipeAction(userId, action) {
        const card = cards.get(userId);
        if (!card) return;

        let className = '';
        let transformStyle = '';

        if (action === 'like') {
            className = 'is-liked';
            transformStyle = 'translateX(500px) rotateZ(30deg) scale(0.5)';
        } else if (action === 'dislike') {
            className = 'is-disliked';
            transformStyle = 'translateX(-500px) rotateZ(-30deg) scale(0.5)';
        } else if (action === 'superlike') {
            className = 'is-superliked'; // Assuming you add this CSS class
            transformStyle = 'translateY(-500px) rotateZ(0deg) scale(0.5)';
        }
        
        console.log(`Action: ${action.toUpperCase()} on user ${userId}`);
        // TODO: Send action to backend via API (e.g., fetch(`${API_BASE}/match/${userId}/${action}`, {method: 'POST'}) )
        
        card.classList.add(className);
        card.style.transition = 'transform 0.5s ease-out, opacity 0.5s';
        card.style.transform = transformStyle;
        card.style.opacity = '0';

        // Remove card after animation
        setTimeout(() => {
            card.remove();
            cards.delete(userId);
            // Optional: Scroll to the next card after the swipe animation is complete
            slotContainer.scrollBy({ top: cards.get(currentCenterId) ? 0 : window.innerHeight, behavior: 'smooth' });
        }, 500);
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
                <div class="archetype-artwork">
                    </div>
                <div class="card-overlay">
                    <div class="archetype-title">${user.archetype.charAt(0).toUpperCase() + user.archetype.slice(1)}</div>
                    <div class="archetype-meaning">${user.intent}</div>
                </div>
                <footer class="card-info">
                    ${user.name}, ${user.age} • ${user.state}
                </footer>
                <div class="card-actions">
                    <button class="action-btn dislike-btn" data-action="dislike" aria-label="Pass on ${user.name}">❌</button>
                    <button class="action-btn superlike-btn" data-action="superlike" aria-label="Super Vibe Check on ${user.name}">⭐</button>
                    <button class="action-btn like-btn" data-action="like" aria-label="Connect with ${user.name}">✅</button>
                </div>
            `;
            card.tabIndex = 0;
            card.setAttribute('role', 'button');
            card.setAttribute('aria-label', `${user.name}'s ${user.archetype} Card`);
            cards.set(user.id, card);
            slotContainer.appendChild(card);
        });
    }

    // Center & Tilt Observer
    function initObservers() {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                const card = entry.target;
                const userId = card.dataset.userId;
                
                // Determine if card is centered (or near center) and highly visible
                const rect = entry.boundingClientRect;
                const centerThreshold = window.innerHeight * 0.2; // 20% of viewport from center
                const isCenter = Math.abs(rect.top - (window.innerHeight / 2 - card.offsetHeight / 2)) < centerThreshold;
                
                if (isCenter && entry.intersectionRatio > 0.5) {
                    if (currentCenterId !== userId) {
                         // Reset previous card if it exists
                        const prevCard = cards.get(currentCenterId);
                        if(prevCard) prevCard.classList.remove('active', 'tilted');
                        
                        currentCenterId = userId;
                        currentUser = filteredUsers.find(u => u.id === currentCenterId);
                    }
                    card.classList.add('active', 'tilted');
                    card.style.setProperty('--tilt-x', `${(Math.random() - 0.5) * 5}deg`);
                    card.style.setProperty('--scale', '1.02');
                } else {
                    if (currentCenterId !== userId) {
                        card.classList.remove('active', 'tilted');
                        card.style.removeProperty('--tilt-x');
                        card.style.removeProperty('--scale');
                    }
                }
            });
        }, { threshold: [0.5], rootMargin: '0px' });
        
        document.querySelectorAll('.profile-card').forEach(card => observer.observe(card));
    }

    // Tap Activation (Open Card Details/Expanded View)
    function setupCardEvents() {
        let tapStart = 0;
        slotContainer.addEventListener('pointerdown', (e) => {
            if (!e.isPrimary) return;
            // Check if the tap is on an action button, if so, don't register as a main tap
            if (e.target.closest('.action-btn')) return;
            tapStart = Date.now();
        });

        slotContainer.addEventListener('pointerup', (e) => {
            if (Date.now() - tapStart < TAP_THRESHOLD && !isDragging) {
                const card = cards.get(currentCenterId);
                if (card) {
                    // For a full app, this would open a full-screen modal profile view
                    card.classList.toggle('active'); 
                    console.log('Tapped card: Open Expanded View');
                }
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp') slotContainer.scrollBy({ top: -window.innerHeight, behavior: 'smooth' });
            if (e.key === 'ArrowDown') slotContainer.scrollBy({ top: window.innerHeight, behavior: 'smooth' });
        });
        
        // Button actions
        slotContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.action-btn');
            if (btn && currentCenterId) {
                handleSwipeAction(currentCenterId, btn.dataset.action);
                e.stopPropagation(); // Prevent the main tap handler from firing
            }
        });
    }

    // Drag: Panels and Swipes
    function setupDragEvents() {
        slotContainer.addEventListener('pointerdown', handleStart, { passive: false });
        slotContainer.addEventListener('pointermove', handleMove, { passive: false });
        slotContainer.addEventListener('pointerup', handleEnd, { passive: false });
        slotContainer.addEventListener('pointerleave', handleEnd, { passive: false });

        let isHorizontalDrag = false; // To distinguish between vertical scroll and horizontal swipe/panel
        let isPanelDrag = false; // To track if we're dragging from the edge for panels

        function handleStart(e) {
            if (e.button !== 0 || !currentCenterId) return;
            const card = cards.get(currentCenterId);
            if (!card) return;
            const cardRect = card.getBoundingClientRect();
            
            // Edge check for panels
            const edgeDist = Math.min(e.clientX - cardRect.left, cardRect.right - e.clientX);
            isPanelDrag = edgeDist <= EDGE_WIDTH;
            
            isDragging = true;
            isHorizontalDrag = false;
            dragStartTime = Date.now();
            startX = e.clientX;
            startY = e.clientY;
            e.preventDefault(); 
        }

        function handleMove(e) {
            if (!isDragging) return;
            e.preventDefault();
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            const card = cards.get(currentCenterId);

            // Determine primary direction
            if (!isHorizontalDrag && Math.abs(deltaY) > Math.abs(deltaX) + DRAG_THRESHOLD) {
                // Vertical Drag: Custom smooth scroll
                // FIX: Drag down (positive deltaY) should scroll down (subtract delta from scrollTop)
                slotContainer.scrollTop -= deltaY;
                return;
            }

            if (Math.abs(deltaX) > DRAG_THRESHOLD && !isHorizontalDrag) {
                isHorizontalDrag = true;
            }

            if (isHorizontalDrag) {
                if (isPanelDrag) { 
                    // Horizontal Panel Drag (Edge only)
                    leftPanel.classList.add('hidden');
                    rightPanel.classList.add('hidden');
                    leftPanel.setAttribute('aria-hidden', 'true');
                    rightPanel.setAttribute('aria-hidden', 'true');

                    if (deltaX > DRAG_THRESHOLD) { // Drag right → open left panel
                        leftPanel.classList.remove('hidden');
                        leftPanel.setAttribute('aria-hidden', 'false');
                    } else if (deltaX < -DRAG_THRESHOLD) { // Drag left → open right panel
                        rightPanel.classList.remove('hidden');
                        rightPanel.setAttribute('aria-hidden', 'false');
                        updateRightPanel(); 
                    }
                } else { 
                    // Card Swipe Drag (Center)
                    const translateX = deltaX;
                    // Apply visual move and rotation
                    card.style.transform = `translateX(${translateX}px) rotateZ(${translateX * 0.05}deg) scale(1.02)`;
                }
            }
        }

        function handleEnd(e) {
            if (!isDragging || !currentCenterId) return;
            isDragging = false;
            const deltaX = e.clientX - startX;
            const card = cards.get(currentCenterId);
            
            // Reset visual move immediately
            card.style.transform = ''; 

            if (!isPanelDrag && isHorizontalDrag && Math.abs(deltaX) > SWIPE_THRESHOLD) {
                // Trigger Like/Dislike/Superlike on sufficient center swipe
                const action = deltaX > 0 ? 'like' : 'dislike';
                handleSwipeAction(currentCenterId, action);

            } else {
                // If not a deliberate swipe, ensure the card resets its position/tilt
                card.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                card.style.removeProperty('transform');
            }
            
            // Auto-close panels on scroll (or any movement that isn't a deliberate hold)
            slotContainer.addEventListener('scroll', closePanels, { once: true });
            
            isHorizontalDrag = false;
            isPanelDrag = false;
        }
    }
    
    function closePanels() {
        leftPanel.classList.add('hidden');
        rightPanel.classList.add('hidden');
        rightPanel.setAttribute('aria-hidden', 'true');
        leftPanel.setAttribute('aria-hidden', 'true');
    }

    // Panels & Actions
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
        document.querySelectorAll('#left-panel [data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                alert(`${action.toUpperCase()} for ${currentUser?.name}!`);
                closePanels(); // Close panel after action
            });
        });
    }

    // Filters Setup
    function setupFilters() {
        filterToggle.addEventListener('click', () => {
            const isOpen = filterDropdown.classList.toggle('hidden');
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
        // Reduce scroll speed for a smoother, less glitchy feel
        const delta = e.deltaY * 0.3; 
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
