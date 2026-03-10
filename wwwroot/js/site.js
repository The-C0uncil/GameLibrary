// ════════════════════════════════════════
//  Game selection (single click — available cards only)
// ════════════════════════════════════════
let selectedGames = [];

document.querySelectorAll('.game-card:not(.unavailable)').forEach(card => {
    card.addEventListener('click', function () {
        const gameName = this.getAttribute('data-game-name');
        toggleGameSelection(gameName);
    });
});

function toggleGameSelection(gameName) {
    const card = document.querySelector(`.game-card[data-game-name="${CSS.escape(gameName)}"]`);

    if (selectedGames.includes(gameName)) {
        selectedGames = selectedGames.filter(g => g !== gameName);
        if (card) card.classList.remove('selected');
    } else {
        selectedGames.push(gameName);
        if (card) card.classList.add('selected');
    }

    updateFabs();
    refreshContactChips();
    refreshRentChips();
}

// ── FAB visibility ──────────────────────
function updateFabs() {
    const hasSelection = selectedGames.length > 0;
    const rentFab = document.querySelector('.fab-rent');
    rentFab.classList.toggle('visible', hasSelection);

    // Contact FAB — uncomment both lines below to re-enable:
    // const contactFab = document.querySelector('.fab-contact');
    // contactFab.classList.toggle('visible', hasSelection);
}

// ── Chip rendering ──────────────────────
function buildChips(containerEl) {
    containerEl.innerHTML = '';
    selectedGames.forEach(gameName => {
        const chip = document.createElement('span');
        chip.className = 'game-chip';
        chip.innerHTML = `${gameName}
            <button type="button" class="game-chip-remove" aria-label="Remove ${gameName}">
                <span class="material-symbols-rounded">close</span>
            </button>`;
        chip.querySelector('.game-chip-remove').addEventListener('click', () => {
            toggleGameSelection(gameName);
        });
        containerEl.appendChild(chip);
    });
}

function refreshContactChips() {
    const container = document.getElementById('selectedGamesList');
    if (container) buildChips(container);
    const display = document.getElementById('selectedGamesDisplay');
    if (display) display.style.display = selectedGames.length > 0 ? '' : 'none';
}

function refreshRentChips() {
    const container = document.getElementById('rentSelectedGamesList');
    if (container) buildChips(container);
    const display = document.getElementById('rentSelectedGamesDisplay');
    if (display) display.style.display = selectedGames.length > 0 ? '' : 'none';
}

document.getElementById('contactModal').addEventListener('show.bs.modal', refreshContactChips);
document.getElementById('rentModal').addEventListener('show.bs.modal', refreshRentChips);


// ════════════════════════════════════════
//  Double-click unavailable card → receive confirmation
// ════════════════════════════════════════
let pendingReceiveGame = null;
const receiveModal    = new bootstrap.Modal(document.getElementById('receiveModal'));
const receiveGameName = document.getElementById('receiveGameName');

document.querySelectorAll('.game-card.unavailable').forEach(card => {
    card.addEventListener('dblclick', function () {
        pendingReceiveGame = this.getAttribute('data-game-name');
        receiveGameName.textContent = pendingReceiveGame;
        receiveModal.show();
    });
});

document.getElementById('confirmReceiveBtn').addEventListener('click', async function () {
    if (!pendingReceiveGame) return;

    try {
        const response = await fetch('/Home/ReceiveGame', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameName: pendingReceiveGame })
        });

        const result = await response.json();
        receiveModal.hide();

        if (result.success) {
            // Update the card in the DOM without a full reload
            const card = document.querySelector(`.game-card[data-game-name="${CSS.escape(pendingReceiveGame)}"]`);
            if (card) {
                card.classList.remove('unavailable');
                card.removeAttribute('aria-disabled');
                card.setAttribute('data-filter-availability', 'available');

                // Remove renter banner and unavailable banner
                card.querySelectorAll('.renter-banner, .unavailable-banner').forEach(el => el.remove());

                // Re-attach single-click selection listener
                card.addEventListener('click', function () {
                    toggleGameSelection(this.getAttribute('data-game-name'));
                });
            }
            pendingReceiveGame = null;
        } else {
            alert('Error marking game as returned: ' + result.message);
        }
    } catch (err) {
        receiveModal.hide();
        alert('Error communicating with server.');
        console.error(err);
    }
});


// ════════════════════════════════════════
//  Rent form submission
// ════════════════════════════════════════
document.getElementById('submitRentBtn').addEventListener('click', async function () {
    const renterName = document.getElementById('renterName').value.trim();
    const startDate  = document.getElementById('rentStartDate').value;
    const endDate    = document.getElementById('rentEndDate').value;
    const phone      = document.getElementById('renterPhone').value.trim();

    if (!renterName || !startDate || !endDate) {
        alert('Please fill in all required fields (Name, Start Date, End Date).');
        return;
    }
    if (endDate < startDate) {
        alert('End date cannot be before start date.');
        return;
    }
    if (selectedGames.length === 0) {
        alert('Please select at least one game.');
        return;
    }

    const payload = { renterName, startDate, endDate, phoneNumber: phone, games: selectedGames };

    try {
        const response = await fetch('/Home/SubmitRental', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.success) {
            // Mark rented cards as unavailable in the DOM
            selectedGames.forEach(gameName => {
                const card = document.querySelector(`.game-card[data-game-name="${CSS.escape(gameName)}"]`);
                if (!card) return;

                card.classList.remove('selected');
                card.classList.add('unavailable');
                card.setAttribute('aria-disabled', 'true');
                card.setAttribute('data-filter-availability', 'unavailable');

                // Add renter banner
                const imgWrap = card.querySelector('.card-img-wrap');
                const existingBanner = imgWrap.querySelector('.unavailable-banner');

                const renterBanner = document.createElement('div');
                renterBanner.className = 'renter-banner';
                renterBanner.innerHTML = `
                    <span class="material-symbols-rounded renter-icon">person</span>
                    <span class="renter-text">
                        ${renterName}
                        <span class="renter-dates">${startDate} – ${endDate}</span>
                    </span>`;

                if (existingBanner) {
                    imgWrap.insertBefore(renterBanner, existingBanner);
                } else {
                    const unavailBanner = document.createElement('div');
                    unavailBanner.className = 'unavailable-banner';
                    unavailBanner.textContent = 'Unavailable';
                    imgWrap.appendChild(renterBanner);
                    imgWrap.appendChild(unavailBanner);
                }

                // Attach double-click listener for receiving
                card.addEventListener('dblclick', function () {
                    pendingReceiveGame = this.getAttribute('data-game-name');
                    receiveGameName.textContent = pendingReceiveGame;
                    receiveModal.show();
                });
            });

            alert('Rental registered successfully!');
            document.getElementById('rentForm').reset();
            selectedGames = [];
            updateFabs();
            refreshRentChips();
            bootstrap.Modal.getInstance(document.getElementById('rentModal')).hide();
        } else {
            alert('Error registering rental: ' + result.message);
        }
    } catch (error) {
        alert('Error registering rental. Please try again.');
        console.error(error);
    }
});


// ════════════════════════════════════════
//  Contact form submission (hidden, kept for re-enable)
// ════════════════════════════════════════
document.getElementById('submitBtn').addEventListener('click', async function () {
    const name    = document.getElementById('name').value;
    const phone   = document.getElementById('phone').value;
    const email   = document.getElementById('email').value;
    const address = document.getElementById('address').value;

    if (!name || !phone || !email) {
        alert('Please fill in all required fields (Name, Phone, Email)');
        return;
    }

    const formData = { name, phoneNumber: phone, email, address, selectedGames };

    try {
        const response = await fetch('/Home/SubmitContactForm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        const result = await response.json();
        if (result.success) {
            alert('Form submitted successfully!');
            document.getElementById('contactForm').reset();
            selectedGames = [];
            document.querySelectorAll('.game-card.selected').forEach(c => c.classList.remove('selected'));
            updateFabs();
            refreshContactChips();
            bootstrap.Modal.getInstance(document.getElementById('contactModal')).hide();
        } else {
            alert('Error submitting form: ' + result.message);
        }
    } catch (error) {
        alert('Error submitting form. Please check your email configuration.');
        console.error(error);
    }
});


// ════════════════════════════════════════
//  Sort & Filter panel
// ════════════════════════════════════════
const sfBtn      = document.getElementById('sortFilterBtn');
const sfPanel    = document.getElementById('sfPanel');
const sfBackdrop = document.getElementById('sfBackdrop');

function openPanel() {
    sfPanel.classList.add('open');
    sfBackdrop.classList.add('open');
    sfBtn.classList.add('active');
    sfPanel.setAttribute('aria-hidden', 'false');
}

function closePanel() {
    sfPanel.classList.remove('open');
    sfBackdrop.classList.remove('open');
    sfBtn.classList.remove('active');
    sfPanel.setAttribute('aria-hidden', 'true');
}

sfBtn.addEventListener('click', () => {
    sfPanel.classList.contains('open') ? closePanel() : openPanel();
});
sfBackdrop.addEventListener('click', closePanel);

// Build filter badge groups
const filterGroups = {
    category:     document.getElementById('filterCategory'),
    theme:        document.getElementById('filterTheme'),
    tier:         document.getElementById('filterTier'),
    type:         document.getElementById('filterType'),
    complexity:   document.getElementById('filterComplexity'),
    availability: document.getElementById('filterAvailability'),
};

const allCards = Array.from(document.querySelectorAll('.game-card'));
const uniqueValues = {};

Object.keys(filterGroups).forEach(key => {
    const vals = new Set();
    allCards.forEach(card => {
        const v = card.getAttribute(`data-filter-${key}`);
        if (v && v.trim() !== '') vals.add(v.trim());
    });
    uniqueValues[key] = Array.from(vals).sort();
});

Object.entries(filterGroups).forEach(([key, container]) => {
    uniqueValues[key].forEach(val => {
        const badge = document.createElement('span');
        badge.className = 'sf-filter-badge';
        badge.textContent = val;
        badge.dataset.filterKey = key;
        badge.dataset.filterVal = val;
        badge.addEventListener('click', () => {
            badge.classList.toggle('active');
            applyFiltersAndSort();
        });
        container.appendChild(badge);
    });
});

document.getElementById('clearFiltersBtn').addEventListener('click', () => {
    document.querySelectorAll('.sf-filter-badge.active').forEach(b => b.classList.remove('active'));
    applyFiltersAndSort();
});

document.getElementById('sfSearchInput').addEventListener('input', applyFiltersAndSort);

let currentSort = 'name';
document.querySelectorAll('.sf-sort-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.sf-sort-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentSort = btn.dataset.sort;
        applyFiltersAndSort();
    });
});

function applyFiltersAndSort() {
    const activeFilters = {};
    document.querySelectorAll('.sf-filter-badge.active').forEach(badge => {
        const k = badge.dataset.filterKey;
        if (!activeFilters[k]) activeFilters[k] = new Set();
        activeFilters[k].add(badge.dataset.filterVal);
    });

    const hasFilters = Object.keys(activeFilters).length > 0;
    const grid = document.getElementById('gamesGrid');

    allCards.forEach(card => {
        if (!hasFilters) { card.classList.remove('sf-hidden'); return; }
        const visible = Object.entries(activeFilters).every(([key, vals]) => {
            return vals.has((card.getAttribute(`data-filter-${key}`) || '').trim());
        });
        card.classList.toggle('sf-hidden', !visible);
    });

    const searchTerm = document.getElementById('sfSearchInput').value.trim().toLowerCase();
    allCards.forEach(card => {
        if (card.classList.contains('sf-hidden')) return;
        if (searchTerm && !card.getAttribute('data-sort-name').toLowerCase().includes(searchTerm)) {
            card.classList.add('sf-hidden');
        }
    });

    const visibleCards = allCards.filter(c => !c.classList.contains('sf-hidden'));
    visibleCards.sort((a, b) => {
        const aVal = (a.getAttribute(`data-sort-${currentSort}`) || '').trim();
        const bVal = (b.getAttribute(`data-sort-${currentSort}`) || '').trim();
        const toNum = str => {
            const m = str.replace(',', '.').match(/^[\d.]+/);
            return m ? parseFloat(m[0]) : NaN;
        };
        const aNum = toNum(aVal), bNum = toNum(bVal);
        if (!isNaN(aNum) && !isNaN(bNum))
            return currentSort === 'bgg' ? bNum - aNum : aNum - bNum;
        return aVal.localeCompare(bVal);
    });

    const hiddenCards = allCards.filter(c => c.classList.contains('sf-hidden'));
    [...visibleCards, ...hiddenCards].forEach(card => grid.appendChild(card));
}

applyFiltersAndSort();