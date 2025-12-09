// Meta Match App - FULL BUILD: Wings, Login, Gestures, Filters (Dec 2025)
(function() {
    'use strict';

    // Config
    const API_BASE = 'https://pandeyprateek057-meta-match.hf.space';
    const DRAG_THRESHOLD = 50; 
    const SWIPE_THRESHOLD = 150;
    const TAP_THRESHOLD = 150; 
    const archetypes = ['empath', 'wanderer', 'creator', 'oracle', 'shadowlight'];
    
    // Auth State - Mocked for demo
    let isLoggedIn = false; 
    let currentMobile = '';

    // State
    let users = [];
    let filteredUsers = [];
    let currentCenterId = null;
    let isDragging = false;
    let startX = 0, startY = 0;
    let currentUser = null;
    let filterParams = { scope: 'global', state: '', gender: '' };

    // DOM
    const slotContainer = document.getElementById('slot-container');
    const cards = new Map();
    const filterToggle = document.getElementById('filter-toggle');
    const filterDropdown = document.querySelector('.filter-dropdown');
    const applyFilter = document.getElementById('apply-filter');
    const loginBtn = document.getElementById('login-btn');
    const authModal = document.getElementById('auth-modal');
    const loginForm = document.getElementById('login-form');
    const otpForm = document.getElementById('otp-form');
    const mobileInput = document.getElementById('mobile-number');
    const otpInput = document.getElementById('otp-code');
    const modalCloseBtn = document.querySelector('.modal-close-btn');

    // Dummies (unchanged)
    function generateDummies() {
        const dummies = [];
        const namesM = ['Aarav', 'Raj', 'Vikram', 'Arjun', 'Siddharth'];
        const namesF = ['Priya', 'Meera', 'Lila', 'Sita', 'Zara'];
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

    // Fetch and Filter (unchanged)
    async function fetchUsers() {
        // ... (API call logic)
        try {
             // Example URL for discovery API endpoint
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
    function applyFilters() {
        filteredUsers = users.filter(u => {
            if (filterParams.state && u.state !== filterParams.state) return false;
            if (filterParams.gender && u.gender !== filterParams.gender) return false;
            return true;
        });
        renderCards(filteredUsers);
        initObservers();
    }

    // Handle Swipe Action (Like, Dislike, Superlike) (Modified)
    function handleSwipeAction(userId, action) {
        if (!isLoggedIn) {
            alert("Please Login first to perform actions!");
            openAuthModal();
            return;
        }

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
            className = 'is-liked'; // Re-use like style for demo, but can be separate
            transformStyle = 'translateY(-500px) rotateZ(0deg) scale(0.5)';
        }
        
        console.log(`Action: ${action.toUpperCase()} on user ${userId}`);
        
        card.classList.add(className);
        card.style.transition = 'transform 0.5s ease-out, opacity 0.5s';
        card.style.transform = transformStyle;
        card.style.opacity = '0';

        // Remove card after animation
        setTimeout(() => {
            card.remove();
            cards.delete(userId);
            // Scroll to next card if available
            slotContainer.scrollBy({ top: window.innerHeight, behavior: 'smooth' });
        }, 500);
    }
    
    // --- Wing Content Generation ---
    function getLeftWingHTML(user) {
        return `
            <div class="wing-content">
                <h4>Engage with ${user.name}</h4>
                <ul role="menu">
                    <li><button data-action="game" aria-label="Play Game">Play Game</button></li>
                    <li><button data-action="quiz" aria-label="Compatibility Quiz">Compatibility Quiz</button></li>
                    <li><button data-action="vibe" aria-label="Vibe-Check">Vibe-Check</button></li>
                    <li><button data-action="story" aria-label="Create Story">Create Story</button></li>
                </ul>
            </div>
        `;
    }

    function getRightWingHTML(user) {
        return `
            <div class="wing-content">
                <h4>${user.name}'s Profile</h4>
                <dl>
                    <dt>Age</dt><dd>${user.age}</dd>
                    <dt>Archetype</dt><dd>${user.archetype.charAt(0).toUpperCase() + user.archetype.slice(1)}</dd>
                    <dt>Intent</dt><dd>${user.intent}</dd>
                    <dt>About</dt><dd>${user.about}</dd>
                </dl>
                <button data-action="connect" aria-label="Connect and Chat">Connect & Chat</button>
            </div>
        `;
    }

    // Render Cards (Modified to include Wing placeholders)
    function renderCards(userList = filteredUsers) {
        slotContainer.innerHTML = '';
        cards.clear();
        userList.forEach(user => {
            const card = document.createElement('article');
            card.className = `profile-card ${user.archetype}`;
            card.dataset.userId = user.id;
            card.innerHTML = `
                <div class="card-wing left-wing" role="complementary" aria-label="Activities">${getLeftWingHTML(user)}</div>
                
                <div class="card-wing right-wing" role="complementary" aria-label="Profile Details">${getRightWingHTML(user)}</div>

                <div class="archetype-artwork"></div>
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

    // Setup Card Events (Modified for button actions within wings)
    function setupCardEvents() {
        let tapStart = 0;
        slotContainer.addEventListener('pointerdown', (e) => {
            if (!e.isPrimary) return;
            // Only register tap if it's not on an interactive element
            if (e.target.closest('.action-btn') || e.target.closest('.card-wing button')) return;
            tapStart = Date.now();
        });

        slotContainer.addEventListener('pointerup', (e) => {
            // Tap to toggle 'active' class (which shows wings via CSS)
            if (Date.now() - tapStart < TAP_THRESHOLD && !isDragging) {
                const card = cards.get(currentCenterId);
                if (card) {
                    card.classList.toggle('active');
                }
            }
        });

        // Main action buttons (bottom of card)
        slotContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.action-btn');
            if (btn && currentCenterId) {
                handleSwipeAction(currentCenterId, btn.dataset.action);
                e.stopPropagation(); 
            }
            
            // Wing action buttons
            const wingBtn = e.target.closest('.card-wing button');
            if (wingBtn) {
                const action = wingBtn.dataset.action;
                alert(`${action.toUpperCase()} for ${currentUser?.name}!`);
                cards.get(currentCenterId)?.classList.remove('active'); // Close wings after action
                e.stopPropagation();
            }
        });
    }

    // Drag: Card Swipe and Wing Interaction (Modified)
    function setupDragEvents() {
        slotContainer.addEventListener('pointerdown', handleStart, { passive: false });
        slotContainer.addEventListener('pointermove', handleMove, { passive: false });
        slotContainer.addEventListener('pointerup', handleEnd, { passive: false });
        slotContainer.addEventListener('pointerleave', handleEnd, { passive: false });

        let isHorizontalDrag = false;

        function handleStart(e) {
            if (e.button !== 0 || !currentCenterId) return;
            isDragging = true;
            isHorizontalDrag = false;
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
                // Vertical Drag: Custom smooth scroll (FIXED: drag down scrolls down)
                slotContainer.scrollTop -= deltaY;
                return;
            }

            if (Math.abs(deltaX) > DRAG_THRESHOLD && !isHorizontalDrag) {
                isHorizontalDrag = true;
            }

            if (isHorizontalDrag) {
                // Card Swipe Drag (Center) - Visual feedback only
                const translateX = deltaX;
                card.style.transform = `translateX(${translateX}px) rotateZ(${translateX * 0.05}deg) scale(1.02)`;
            }
        }

        function handleEnd(e) {
            if (!isDragging || !currentCenterId) return;
            isDragging = false;
            const deltaX = e.clientX - startX;
            const card = cards.get(currentCenterId);
            
            // Reset visual move immediately
            card.style.transform = ''; 

            if (isHorizontalDrag && Math.abs(deltaX) > SWIPE_THRESHOLD) {
                // Trigger Like/Dislike on sufficient center swipe
                const action = deltaX > 0 ? 'like' : 'dislike';
                handleSwipeAction(currentCenterId, action);
            } else {
                // If not a deliberate swipe, ensure the card resets its position/tilt
                card.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                card.style.removeProperty('transform');
            }
            
            isHorizontalDrag = false;
        }
    }
    
    // --- Login/Auth Setup ---
    function openAuthModal() {
        authModal.classList.remove('hidden');
        authModal.setAttribute('aria-hidden', 'false');
    }

    function closeAuthModal() {
        authModal.classList.add('hidden');
        authModal.setAttribute('aria-hidden', 'true');
        // Reset forms
        loginForm.classList.remove('hidden');
        otpForm.classList.add('hidden');
        document.getElementById('modal-title').textContent = 'Enter Mobile Number';
    }

    function setupAuth() {
        loginBtn.addEventListener('click', openAuthModal);
        modalCloseBtn.addEventListener('click', closeAuthModal);
        authModal.addEventListener('click', (e) => {
            if (e.target === authModal) closeAuthModal();
        });

        // Step 1: Send OTP
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            currentMobile = mobileInput.value;
            // MOCK: Replace with API call to send OTP to currentMobile
            console.log(`Sending OTP to: ${currentMobile}`);
            
            // On success: Switch to OTP form
            loginForm.classList.add('hidden');
            otpForm.classList.remove('hidden');
            document.getElementById('modal-title').textContent = `Verify OTP sent to ${currentMobile}`;
            otpInput.focus();
        });

        // Step 2: Verify OTP
        otpForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const otp = otpInput.value;
            // MOCK: Replace with API call to verify OTP
            
            if (otp === '123456') { // Mock success check
                isLoggedIn = true;
                loginBtn.textContent = 'Logged In';
                loginBtn.disabled = true;
                alert('Login Successful!');
                closeAuthModal();
                console.log('User logged in with mobile:', currentMobile);
            } else {
                alert('Invalid OTP. Please try again.');
            }
        });
    }

    // Init
    async function init() {
        await fetchUsers();
        setupCardEvents();
        setupDragEvents();
        setupFilters();
        setupAuth();
    }

    init();
})();
