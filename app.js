// Meta Match App - Filters Fixed + Squeeze + Chat (Dec 2025)
(function() {
    'use strict';

    // Config
    const API_BASE = 'https://pandeyprateek057-meta-match.hf.space';
    const DRAG_THRESHOLD = 50;
    const EDGE_WIDTH = 50;
    const TAP_THRESHOLD = 150;
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
    let chatMessages = []; // For chat state

    // DOM
    const slotContainer = document.getElementById('slot-container');
    const leftPanel = document.getElementById('left-panel');
    const rightPanel = document.getElementById('right-panel');
    const currentCard = () => cards.get(currentCenterId); // Helper
    const cards = new Map();
    const filterToggle = document.getElementById('filter-toggle');
    const filterDropdown = document.querySelector('.filter-dropdown');
    const applyFilter = document.getElementById('apply-filter');
    const chatModal = document.getElementById('chat-modal');
    const chatTitle = document.getElementById('chat-title');
    const chatBubbles = document.getElementById('chat-bubbles');
    const chatInput = document.getElementById('chat-input');
    const sendMessage = document.getElementById('send-message');
    const shareMedia = document.getElementById('share-media');
    const closeChat = document.querySelector('.close-chat');

    // Dummies (with gender fixed)
    function generateDummies() {
        const dummies = [];
        const namesM = ['Aarav', 'Raj', 'Vikram', 'Arjun'];
        const namesF = ['Priya', 'Meera', 'Lila', 'Sita'];
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
            let url = `${API_BASE}/discover?scope=${filterParams.scope}&state=${filterParams.state}&gender=${filterParams.gender}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Fetch failed');
            users = await res.json();
        } catch (err) {
            console.warn('Backend failed:', err);
            users = generateDummies();
        }
        applyFilters();
    }

    // Apply Filters
    function applyFilters() {
        filteredUsers = users.filter(u => {
            if (filterParams.state && u.state !== filterParams.state) return false;
            if (filterParams.gender && u.gender !== filterParams.gender) return false;
            return true;
        });
        renderCards(filteredUsers);
        initObservers();
    }

    // Render Cards (unchanged)
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

    // Center & Tilt (unchanged)
    function initObservers() {
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
                    card.classList.remove('active', 'tilted', 'squeeze');
                    card.style.removeProperty('--tilt-x');
                    card.style.removeProperty('--scale');
                }
            });
        }, { threshold: [0.5], rootMargin: '0px' });
        document.querySelectorAll('.profile-card').forEach(card => observer.observe(card));
    }

    // Tap Activation (unchanged)
    function setupCardEvents() {
        let tapStart = 0;
        slotContainer.addEventListener('pointerdown', (e) => {
            if (!e.isPrimary || !currentCenterId) return;
            const cardRect = e.target.closest('.profile-card')?.getBoundingClientRect();
            if (!cardRect) return;
            tapStart = Date.now();
        });

        slotContainer.addEventListener('pointerup', (e) => {
            if (Date.now() - tapStart < TAP_THRESHOLD && !isDragging) {
                const card = currentCard();
                if (card) card.classList.toggle('active');
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp') slotContainer.scrollBy({ top: -window.innerHeight, behavior: 'smooth' });
            if (e.key === 'ArrowDown') slotContainer.scrollBy({ top: window.innerHeight, behavior: 'smooth' });
            if (e.key === 'Escape') { // Close filters/chat
                filterDropdown.classList.add('hidden');
                chatModal.classList.add('hidden');
                filterToggle.setAttribute('aria-expanded', 'false');
            }
        });
    }

    // Drag: Squeeze on Open
    function setupDragEvents() {
        slotContainer.addEventListener('pointerdown', handleStart, { passive: false });
        slotContainer.addEventListener('pointermove', handleMove, { passive: false });
        slotContainer.addEventListener('pointerup', handleEnd, { passive: false });
        slotContainer.addEventListener('pointerleave', handleEnd, { passive: false });

        function handleStart(e) {
            if (e.button !== 0 || !currentCenterId) return;
            const cardRect = currentCard().getBoundingClientRect();
            const edgeDistLeft = e.clientX - cardRect.left;
            const edgeDistRight = cardRect.right - e.clientX;
            const edgeDist = Math.min(edgeDistLeft, edgeDistRight);
            if (edgeDist > EDGE_WIDTH) return;
            isDragging = true;
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

            if (Math.abs(deltaY) > Math.abs(deltaX) + DRAG_THRESHOLD) {
                slotContainer.scrollTop += deltaY;
                return;
            } 
            if (Math.abs(deltaX) > DRAG_THRESHOLD) {
                // Close others
                leftPanel.classList.add('hidden');
                rightPanel.classList.add('hidden');
                const card = currentCard();
                card.classList.remove('squeeze'); // Reset first
                if (deltaX > 0) { // Drag right → left panel + squeeze
                    leftPanel.classList.remove('hidden');
                    card.classList.add('squeeze');
                } else { // Drag left → right panel + squeeze
                    rightPanel.classList.remove('hidden');
                    card.classList.add('squeeze');
                }
                updateRightPanel();
            }
        }

        function handleEnd() {
            if (!isDragging) return;
            isDragging = false;
            setTimeout(() => {
                if (!leftPanel.matches(':hover') && !rightPanel.matches(':hover')) {
                    leftPanel.classList.add('hidden');
                    rightPanel.classList.add('hidden');
                    currentCard()?.classList.remove('squeeze');
                }
            }, 2000);
            slotContainer.addEventListener('scroll', () => {
                leftPanel.classList.add('hidden');
                rightPanel.classList.add('hidden');
                currentCard()?.classList.remove('squeeze');
            }, { once: true });
        }
    }

    // Panels
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

    // Actions: Chat Open
    function setupActions() {
        document.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                if (action === 'chat' && currentUser) {
                    openChat(currentUser);
                } else {
                    alert(`${action.toUpperCase()} for ${currentUser?.name}!`);
                }
            });
        });
    }

    // Chat Functions
    function openChat(user) {
        chatTitle.innerHTML = `Chat with ${user.name}`;
        chatMessages = [{ text: `Hi ${user.name}! What's your archetype story?`, isBot: true }];
        renderChatBubbles();
        chatModal.classList.remove('hidden');
        chatInput.focus();
    }

    function renderChatBubbles() {
        chatBubbles.innerHTML = chatMessages.map(msg => 
            `<div class="chat-bubble ${msg.isBot ? 'bot' : 'user'}">${msg.text}</div>`
        ).join('');
        chatBubbles.scrollTop = chatBubbles.scrollHeight;
    }

    async function sendChatMessage() {
        const text = chatInput.value.trim();
        if (!text) return;
        chatMessages.push({ text, isBot: false });
        chatInput.value = '';
        renderChatBubbles();
        // Mock send to HF /chat
        try {
            const res = await fetch(`${API_BASE}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUser.id, message: text })
            });
            const data = await res.json();
            setTimeout(() => {
                chatMessages.push({ text: data.reply || `Echo: ${text} – Intriguing! Tell me more about your ${currentUser.archetype}.`, isBot: true });
                renderChatBubbles();
            }, 1000);
        } catch {
            setTimeout(() => {
                chatMessages.push({ text: `Mock: ${text} resonates with your ${currentUser.archetype} energy!`, isBot: true });
                renderChatBubbles();
            }, 1000);
        }
    }

    function shareMedia() {
        // Mock: Append placeholder image bubble
        chatMessages.push({ text: '[Shared Image: Placeholder]', isBot: false });
        renderChatBubbles();
        alert('Media shared! (Mock upload)');
    }

    // Filters: Enhanced Close
    function setupFilters() {
        filterToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = !filterDropdown.classList.contains('hidden');
            filterDropdown.classList.toggle('hidden');
            filterToggle.setAttribute('aria-expanded', !isOpen);
        });

        applyFilter.addEventListener('click', () => {
            filterParams.scope = document.getElementById('scope-select').value;
            filterParams.state = document.getElementById('state-select').value;
            filterParams.gender = document.querySelector('input[name="gender"]:checked').value;
            fetchUsers();
            filterDropdown.classList.add('hidden');
            filterToggle.setAttribute('aria-expanded', 'false');
        });

        // Outside/ESC close
        document.addEventListener('click', (e) => {
            if (!filterToggle.contains(e.target) && !filterDropdown.contains(e.target)) {
                filterDropdown.classList.add('hidden');
                filterToggle.setAttribute('aria-expanded', 'false');
            }
        });
    }

    // Chat Events
    sendMessage.addEventListener('click', sendChatMessage);
    chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendChatMessage(); });
    shareMedia.addEventListener('click', shareMedia);
    closeChat.addEventListener('click', () => chatModal.classList.add('hidden'));
    chatModal.addEventListener('click', (e) => { if (e.target === chatModal) chatModal.classList.add('hidden'); });

    // Wheel (unchanged)
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
