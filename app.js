// Meta Match App - FULL BUILD: Wings, Login, Gestures, Filters
(function() {
    'use strict';

    // Config
    const API_BASE = 'https://pandeyprateek057-meta-match.hf.space'; 
    const DRAG_THRESHOLD = 50; 
    const SWIPE_THRESHOLD = 150;
    const TAP_THRESHOLD = 150; 
    const archetypes = ['empath', 'wanderer', 'creator', 'oracle', 'shadow_light'];

    // Auth State
    let isLoggedIn = false; 
    let currentUserId = null; 
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
    const sendOtpBtn = document.getElementById('send-otp-btn');
    const modalCloseBtn = document.querySelector('.modal-close-btn');

    // --- Helper Functions for Dummy Data ---
    function getRandomElement(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }
    function getRandomSample(arr, k) {
        const shuffled = [...arr].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, k);
    }
    
    // --- Data Model (Fixed to include 'meta' structure for fallback) ---
    function generateDummies() {
        const dummies = [];
        const namesM = ['Aarav', 'Raj', 'Vikram', 'Arjun', 'Siddharth'];
        const namesF = ['Priya', 'Meera', 'Lila', 'Sita', 'Zara'];
        const states = ['MH', 'KA', 'DL', 'TN', 'GJ', 'WB'];
        const intents = ['Seeking Adventure', 'Deep Connections', 'Creative Sparks', 'Wisdom Exchange', 'Balance Journey'];
        const abouts = ['Loves midnight philosophies.', 'Artist at heart.', 'Wanderlust eternal.', 'Seer of patterns.', 'Dancing in shadows.'];
        
        const META_TIERS = ["Shadow/Light", "Empath", "Oracle", "Voyager", "Creator", "Wanderer"];
        const RARITY = ["Common", "Rare", "Epic", "Mythic"];
        const TRAITS = ["Empathic", "Intuitive", "Analytical", "Romantic", "Mysterious", "Calm"];
        
        for (let i = 0; i < 100; i++) {
            const isMale = i % 2 === 0;
            const uid = `bot_${i}`;
            dummies.push({
                id: uid,
                name: (isMale ? namesM : namesF)[i % namesM.length],
                age: 25 + (i % 10),
                state: getRandomElement(states),
                gender: isMale ? 'M' : 'F',
                archetype: getRandomElement(archetypes),
                intent: getRandomElement(intents),
                about: getRandomElement(abouts),
                is_bot: 1,
                // Add Meta fields to match backend API response
                img: `https://picsum.photos/seed/${uid}/800/1100`,
                meta: {
                    tier: getRandomElement(META_TIERS),
                    traits: getRandomSample(TRAITS, 2),
                    energy: getRandomElement(["Warm", "Neutral", "Chaotic", "Soft"]),
                    rarity: getRandomElement(RARITY)
                }
            });
        }
        return dummies;
    }

    // --- 1. DATA FETCHING ---
    async function fetchUsers() {
        try {
            const url = `${API_BASE}/discover`; 
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Fetch failed with status ${res.status}`);
            
            users = await res.json();
        } catch (err) {
            console.warn('Backend failed, using dummies:', err);
            users = generateDummies(); // Calls the corrected dummy function
        }
        applyFilters();
    }
    
    // --- 2. Card Visibility and Focus Logic (Fixes ReferenceError) ---
    function initObservers() {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                const card = entry.target;
                const userId = card.dataset.userId;
                
                // Determine if card is centered
                const rect = entry.boundingClientRect;
                const centerThreshold = window.innerHeight * 0.2;
                const isCenter = Math.abs(rect.top - (window.innerHeight / 2 - card.offsetHeight / 2)) < centerThreshold;
                
                if (isCenter && entry.intersectionRatio > 0.5) {
                    if (currentCenterId !== userId) {
                        const prevCard = cards.get(currentCenterId);
                        if(prevCard) prevCard.classList.remove('active', 'tilted');
                        
                        currentCenterId = userId;
                        currentUser = filteredUsers.find(u => u.id === currentCenterId);
                    }
                    card.classList.add('tilted'); // Tilt when centered
                    card.style.setProperty('--tilt-x', `${(Math.random() - 0.5) * 5}deg`);
                    card.style.setProperty('--scale', '1.02');
                } else {
                    if (currentCenterId !== userId) {
                        card.classList.remove('active', 'tilted'); // Remove active/tilt when moving away
                        card.style.removeProperty('--tilt-x');
                        card.style.removeProperty('--scale');
                    }
                }
            });
        }, { threshold: [0.5], rootMargin: '0px' });
        
        document.querySelectorAll('.profile-card').forEach(card => observer.observe(card));
    }


    function applyFilters() {
        // Filter locally (backend /discover currently ignores filters)
        filteredUsers = users.filter(u => {
            if (filterParams.state && u.state !== filterParams.state) return false;
            // Note: Gender filtering is currently not possible as gender is not guaranteed in the /discover response.
            // if (filterParams.gender && u.gender !== filterParams.gender) return false; 
            return true;
        });
        renderCards(filteredUsers);
        initObservers(); // Must be called after rendering new cards
    }

    // --- 3. AUTHENTICATION ---
    
    function openAuthModal() {
        authModal.classList.remove('hidden');
        authModal.setAttribute('aria-hidden', 'false');
        mobileInput.focus();
    }

    function closeAuthModal() {
        authModal.classList.add('hidden');
        authModal.setAttribute('aria-hidden', 'true');
        loginForm.classList.remove('hidden');
        otpForm.classList.add('hidden');
        document.getElementById('modal-title').textContent = 'Enter Mobile Number';
        mobileInput.value = '';
        otpInput.value = '';
    }

    async function sendOtp() {
        const phone = mobileInput.value.trim();
        if (!phone) return;
        
        sendOtpBtn.textContent = 'Sending...';
        sendOtpBtn.disabled = true;

        try {
            const res = await fetch(`${API_BASE}/send_otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: phone })
            });

            const data = await res.json();
            
            if (data.status === 'ok') {
                currentMobile = phone;
                loginForm.classList.add('hidden');
                otpForm.classList.remove('hidden');
                // IMPORTANT: Show the returned OTP for testing ease
                document.getElementById('modal-title').textContent = `Verify OTP (Prototype: OTP is ${data.otp})`; 
                otpInput.focus();
            } else {
                alert(`Error sending OTP: ${data.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Send OTP failed:', error);
            alert('Could not reach the server to send OTP.');
        } finally {
            sendOtpBtn.textContent = 'Send OTP';
            sendOtpBtn.disabled = false;
        }
    }

    async function verifyOtp(otp) {
        if (!currentMobile) return;

        try {
            const res = await fetch(`${API_BASE}/verify_otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: currentMobile, otp: otp })
            });
            const data = await res.json();

            if (data.status === 'ok') {
                isLoggedIn = true;
                currentUserId = data.user_id;
                loginBtn.textContent = 'Logged In';
                loginBtn.disabled = true;
                alert('Login Successful!');
                closeAuthModal();
            } else if (data.status === 'new_user') {
                alert('Verification successful. You are a new user! Please complete your registration.');
                isLoggedIn = true;
                loginBtn.textContent = 'Pending Registration';
                loginBtn.disabled = true;
                closeAuthModal();
            } else {
                alert(data.message || 'Invalid OTP. Please try again.');
            }
        } catch (error) {
            console.error('Verify OTP failed:', error);
            alert('Verification failed. Check your network.');
        }
    }

    function setupAuth() {
        loginBtn.addEventListener('click', openAuthModal);
        modalCloseBtn.addEventListener('click', closeAuthModal);
        authModal.addEventListener('click', (e) => {
            if (e.target === authModal) closeAuthModal();
        });

        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            sendOtp();
        });

        otpForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const otp = otpInput.value.trim();
            if (otp.length === 6) {
                verifyOtp(otp);
            } else {
                alert('OTP must be 6 digits.');
            }
        });
    }

    // --- 4. CARD RENDERING & WINGS ---

    function getLeftWingHTML(user) {
        return `
            <div class="wing-content">
                <h4>Engage with ${user.name}</h4>
                <p style="font-size:0.8rem; margin-bottom: 1rem;">Match Rarity: **${user.meta.rarity}**</p>
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
                <dl style="text-align: left;">
                    <dt>Meta Tier</dt><dd>${user.meta.tier}</dd>
                    <dt>Traits</dt><dd>${user.meta.traits.join(', ')}</dd>
                    <dt>Energy</dt><dd>${user.meta.energy}</dd>
                    <dt>Age</dt><dd>${user.age}</dd>
                    <dt>Archetype</dt><dd>${user.archetype.charAt(0).toUpperCase() + user.archetype.slice(1)}</dd>
                    <dt>Intent</dt><dd>${user.intent}</dd>
                </dl>
                <button data-action="connect" aria-label="Connect and Chat">Connect & Chat</button>
            </div>
        `;
    }

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

                <div class="archetype-artwork" style="background-image: url('${user.img}');"></div>
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

    // --- 5. GESTURE & ACTION LOGIC ---

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
            className = 'is-liked'; 
            transformStyle = 'translateY(-500px) rotateZ(0deg) scale(0.5)';
        }
        
        console.log(`Action: ${action.toUpperCase()} on user ${userId}`);
        
        card.classList.add(className);
        card.style.transition = 'transform 0.5s ease-out, opacity 0.5s';
        card.style.transform = transformStyle;
        card.style.opacity = '0';

        setTimeout(() => {
            card.remove();
            cards.delete(userId);
            slotContainer.scrollBy({ top: window.innerHeight, behavior: 'smooth' });
        }, 500);
    }
    
    function setupCardEvents() {
        let tapStart = 0;
        slotContainer.addEventListener('pointerdown', (e) => {
            if (!e.isPrimary) return;
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

        slotContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.action-btn');
            if (btn && currentCenterId) {
                handleSwipeAction(currentCenterId, btn.dataset.action);
                e.stopPropagation(); 
            }
            
            const wingBtn = e.target.closest('.card-wing button');
            if (wingBtn) {
                const action = wingBtn.dataset.action;
                if (!isLoggedIn) {
                    alert("Please Login first to use Meta-Features!");
                    openAuthModal();
                } else {
                    alert(`Initiating ${action.toUpperCase()} with ${currentUser?.name}!`);
                }
                cards.get(currentCenterId)?.classList.remove('active'); 
                e.stopPropagation();
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp') slotContainer.scrollBy({ top: -window.innerHeight, behavior: 'smooth' });
            if (e.key === 'ArrowDown') slotContainer.scrollBy({ top: window.innerHeight, behavior: 'smooth' });
        });
    }
    
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

            // Vertical Drag (Custom Scroll)
            if (!isHorizontalDrag && Math.abs(deltaY) > Math.abs(deltaX) + DRAG_THRESHOLD) {
                slotContainer.scrollTop -= deltaY;
                return;
            }

            if (Math.abs(deltaX) > DRAG_THRESHOLD && !isHorizontalDrag) {
                isHorizontalDrag = true;
            }

            // Horizontal Drag (Swipe Visual)
            if (isHorizontalDrag) {
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
                // Trigger action
                const action = deltaX > 0 ? 'like' : 'dislike';
                handleSwipeAction(currentCenterId, action);
            } else {
                // Reset tilt smoothly
                card.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                card.style.removeProperty('transform');
            }
            
            isHorizontalDrag = false;
        }
    }
    
    function setupFilters() {
        filterToggle.addEventListener('click', () => {
            const isOpen = filterDropdown.classList.toggle('hidden');
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

        document.addEventListener('click', (e) => {
            if (!filterToggle.contains(e.target) && !filterDropdown.contains(e.target)) {
                filterDropdown.classList.add('hidden');
                filterToggle.setAttribute('aria-expanded', 'false');
            }
        });
    }

    // Wheel: Anti-Glitch
    let rafId;
    slotContainer.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (rafId) cancelAnimationFrame(rafId);
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
        setupFilters();
        setupAuth();
    }

    init();
})();
