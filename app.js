// Meta Match App - FULL BUILD: Wings, Login, Gestures, Filters (Dec 2025)
(function() {
    'use strict';

    // Config
    // NOTE: Replace this with your actual deployed backend URL (e.g., your Hugging Face Space URL)
    const API_BASE = 'https://pandeyprateek057-meta-match.hf.space'; 
    const DRAG_THRESHOLD = 50; 
    const SWIPE_THRESHOLD = 150;
    const TAP_THRESHOLD = 150; 
    const archetypes = ['empath', 'wanderer', 'creator', 'oracle', 'shadow_light']; // Note: 'shadowlight' became 'shadow_light' in backend

    // Auth State
    let isLoggedIn = false; 
    let currentUserId = null; // Store user ID after successful login
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

    // Dummies (Kept for fallback, but now redundant if the backend is working)
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

    // --- 1. DATA FETCHING (Using Backend /discover endpoint) ---
    async function fetchUsers() {
        try {
            // Backend currently ignores filters, but we call the /discover endpoint
            const url = `${API_BASE}/discover`; 
            
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Fetch failed with status ${res.status}`);
            
            users = await res.json();
            
            // NOTE: The 'gender' filter is not currently supported by your backend /discover endpoint
            // We must filter locally if needed until the backend is updated.
        } catch (err) {
            console.warn('Backend failed, using dummies:', err);
            users = generateDummies();
        }
        applyFilters();
    }
    
    // NOTE: We must define initObservers before applyFilters, as per previous fix.
    function initObservers() {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                const card = entry.target;
                const userId = card.dataset.userId;
                
                // Check for center position logic (critical for currentCenterId tracking)
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


    function applyFilters() {
        // Local filtering based on UI selects, since backend /discover ignores them for now
        filteredUsers = users.filter(u => {
            if (filterParams.state && u.state !== filterParams.state) return false;
            // NOTE: Gender filtering is currently not possible as gender is not in the /discover response.
            // if (filterParams.gender && u.gender !== filterParams.gender) return false; 
            return true;
        });
        renderCards(filteredUsers);
        initObservers();
    }


    // --- 2. AUTHENTICATION (Using Backend /send_otp and /verify_otp) ---
    
    function openAuthModal() {
        authModal.classList.remove('hidden');
        authModal.setAttribute('aria-hidden', 'false');
        mobileInput.focus();
    }

    function closeAuthModal() {
        authModal.classList.add('hidden');
        authModal.setAttribute('aria-hidden', 'true');
        // Reset forms to initial state
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
                // Success: User authenticated and found
                isLoggedIn = true;
                currentUserId = data.user_id;
                loginBtn.textContent = 'Logged In';
                loginBtn.disabled = true;
                alert('Login Successful!');
                closeAuthModal();
            } else if (data.status === 'new_user') {
                // New User: Redirect to a registration page/form (e.g., fill name, age, archetype)
                alert('Verification successful. You are a new user! Please complete your registration (UI not implemented).');
                // NOTE: For a real app, you would swap the OTP form for a registration form here.
                isLoggedIn = true;
                loginBtn.textContent = 'Pending Registration';
                loginBtn.disabled = true;
                closeAuthModal();
            } else {
                // Error: Wrong OTP
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

        // Step 1: Send OTP
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            sendOtp();
        });

        // Step 2: Verify OTP
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

    // --- 3. UI/Gesture Functions (Minimal changes to incorporate auth check) ---

    function handleSwipeAction(userId, action) {
        if (!isLoggedIn) {
            alert("Please Login first to perform actions!");
            openAuthModal();
            return;
        }
        // ... rest of the swipe logic remains the same
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
        // NOTE: In a real app, you would send this match/dislike action to a backend endpoint here.
        
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

    function getLeftWingHTML(user) {
        return `
            <div class="wing-content">
                <h4>Engage with ${user.name}</h4>
                <p style="font-size:0.8rem; margin-bottom: 1rem;">Match Meter: ${user.meta.rarity}</p>
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

                <div class="archetype-artwork" style="background-image: url('${user.img}'); background-size: cover; background-position: center;"></div>
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

    // Keep all other setup functions (setupCardEvents, setupDragEvents, setupFilters) as they were.

    // Tap activation, button actions, drag/swipe, and wheel logic (from the last working build)
    function setupCardEvents() {
        let tapStart = 0;
        slotContainer.addEventListener('pointerdown', (e) => {
            if (!e.isPrimary) return;
            if (e.target.closest('.action-btn') || e.target.closest('.card-wing button')) return;
            tapStart = Date.now();
        });

        slotContainer.addEventListener('pointerup', (e) => {
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
                    alert(`${action.toUpperCase()} for ${currentUser?.name}!`);
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

            if (!isHorizontalDrag && Math.abs(deltaY) > Math.abs(deltaX) + DRAG_THRESHOLD) {
                slotContainer.scrollTop -= deltaY;
                return;
            }

            if (Math.abs(deltaX) > DRAG_THRESHOLD && !isHorizontalDrag) {
                isHorizontalDrag = true;
            }

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
            
            card.style.transform = ''; 

            if (isHorizontalDrag && Math.abs(deltaX) > SWIPE_THRESHOLD) {
                const action = deltaX > 0 ? 'like' : 'dislike';
                handleSwipeAction(currentCenterId, action);
            } else {
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
        // Ensure the archetype list matches the backend
        if (archetypes.includes('shadowlight')) {
             archetypes[archetypes.indexOf('shadowlight')] = 'shadow_light';
        }
        await fetchUsers();
        setupCardEvents();
        setupDragEvents();
        setupFilters();
        setupAuth();
    }

    init();
})();
