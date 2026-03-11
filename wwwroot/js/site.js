// ════════════════════════════════════════
//  Constants
// ════════════════════════════════════════
const PAGE_SIZE = 21;

// ════════════════════════════════════════
//  Game selection (single click — available cards only)
// ════════════════════════════════════════
let selectedGames = []; // [{ id, name }]

document.querySelectorAll('.game-card:not(.unavailable)').forEach(card => {
    card.addEventListener('click', function () {
        const gameId   = parseInt(this.getAttribute('data-game-id'));
        const gameName = this.getAttribute('data-game-name');
        toggleGameSelection(gameId, gameName);
    });
});

function toggleGameSelection(gameId, gameName) {
    const card  = document.querySelector(`.game-card[data-game-id="${gameId}"]`);
    const index = selectedGames.findIndex(g => g.id === gameId);

    if (index >= 0) {
        selectedGames.splice(index, 1);
        if (card) card.classList.remove('selected');
    } else {
        selectedGames.push({ id: gameId, name: gameName });
        if (card) card.classList.add('selected');
    }

    updateFabs();
    refreshContactChips();
    refreshRentChips();
    if (typeof updateCartUI === 'function') updateCartUI(selectedGames);
}

// Exposed globally so the cart remove buttons in _Layout can call back into site.js
window.cartRemove = function(gameId) {
    const game = selectedGames.find(g => g.id === gameId);
    if (game) toggleGameSelection(game.id, game.name);
};

// ── FAB visibility ──────────────────────
function updateFabs() {
    const hasSelection = selectedGames.length > 0;
    document.querySelector('.fab-rent').classList.toggle('visible', hasSelection);
}

// ── Chip rendering ──────────────────────
function buildChips(containerEl) {
    containerEl.innerHTML = '';
    selectedGames.forEach(({ id, name }) => {
        const chip = document.createElement('span');
        chip.className = 'game-chip';
        chip.innerHTML = `${name}
            <button type="button" class="game-chip-remove" aria-label="Remove ${name}">
                <span class="material-symbols-rounded">close</span>
            </button>`;
        chip.querySelector('.game-chip-remove').addEventListener('click', () => {
            toggleGameSelection(id, name);
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
//  End date = start date + 31 days (hidden, display label only)
// ════════════════════════════════════════
document.getElementById('rentStartDate').addEventListener('change', function () {
    const start = new Date(this.value);
    if (isNaN(start.getTime())) return;

    const end = new Date(start);
    end.setDate(end.getDate() + 31);

    const endStr = end.toISOString().split('T')[0];
    document.getElementById('rentEndDate').value = endStr;

    // Show human-readable display
    document.getElementById('rentEndDateDisplay').textContent =
        end.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
});


// ════════════════════════════════════════
//  Double-click unavailable card → receive confirmation
// ════════════════════════════════════════
let pendingOrderId = null;
const receiveModal = new bootstrap.Modal(document.getElementById('receiveModal'));
const receiveConfirmInput = document.getElementById('receiveConfirmInput');
const confirmReceiveBtn   = document.getElementById('confirmReceiveBtn');

// Enable/disable confirm button based on input
receiveConfirmInput.addEventListener('input', function () {
    confirmReceiveBtn.disabled = this.value.trim().toLowerCase() !== 'confirm';
});

// Clear input when modal closes
document.getElementById('receiveModal').addEventListener('hidden.bs.modal', function () {
    receiveConfirmInput.value = '';
    confirmReceiveBtn.disabled = true;
    pendingOrderId = null;
});

function attachReceiveListener(card) {
    card.addEventListener('dblclick', function () {
        pendingOrderId = parseInt(this.getAttribute('data-order-id'));
        document.getElementById('receiveGameName').textContent = this.getAttribute('data-game-name');
        receiveModal.show();
    });
}

document.querySelectorAll('.game-card.unavailable').forEach(attachReceiveListener);

confirmReceiveBtn.addEventListener('click', async function () {
    if (!pendingOrderId) return;

    try {
        const response = await fetch('/Home/ReceiveOrder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameId: pendingOrderId })
        });

        const result = await response.json();
        receiveModal.hide();

        if (result.success) {
            document.querySelectorAll(`.game-card[data-order-id="${pendingOrderId}"]`).forEach(card => {
                card.classList.remove('unavailable', 'overdue', 'selected');
                card.removeAttribute('aria-disabled');
                card.setAttribute('data-filter-availability', 'available');
                card.setAttribute('data-order-id', '');
                card.querySelectorAll('.renter-banner, .unavailable-banner, .overdue-banner')
                    .forEach(el => el.remove());

                card.addEventListener('click', function () {
                    toggleGameSelection(
                        parseInt(this.getAttribute('data-game-id')),
                        this.getAttribute('data-game-name')
                    );
                });
            });
        } else {
            alert('Error: ' + result.message);
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
        alert('Please fill in Renter Name and Start Date.');
        return;
    }
    if (selectedGames.length === 0) {
        alert('Please select at least one game.');
        return;
    }

    const payload = {
        renterName,
        startDate,
        endDate,
        phoneNumber: phone,
        games: selectedGames.map(g => g.id)
    };

    try {
        const response = await fetch('/Home/SubmitRental', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.success) {
            const orderId = result.orderId;

            selectedGames.forEach(({ id: gameId, name: gameName }) => {
                const card = document.querySelector(`.game-card[data-game-id="${gameId}"]`);
                if (!card) return;

                card.classList.remove('selected');
                card.classList.add('unavailable');
                card.setAttribute('aria-disabled', 'true');
                card.setAttribute('data-filter-availability', 'unavailable');
                card.setAttribute('data-order-id', orderId);

                const imgWrap        = card.querySelector('.card-img-wrap');
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

                attachReceiveListener(card);
            });

            // Reset form
            document.getElementById('renterName').value       = '';
            document.getElementById('rentStartDate').value    = '';
            document.getElementById('rentEndDate').value      = '';
            document.getElementById('rentEndDateDisplay').textContent = '—';
            document.getElementById('renterPhone').value      = '';
            selectedGames = [];
            updateFabs();
            refreshRentChips();
            if (typeof updateCartUI === 'function') updateCartUI(selectedGames);
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
//  Contact form
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

    try {
        const response = await fetch('/Home/SubmitContactForm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name, phoneNumber: phone, email, address,
                selectedGames: selectedGames.map(g => g.name)
            })
        });
        const result = await response.json();
        if (result.success) {
            selectedGames = [];
            document.querySelectorAll('.game-card.selected').forEach(c => c.classList.remove('selected'));
            updateFabs();
            refreshContactChips();
            bootstrap.Modal.getInstance(document.getElementById('contactModal')).hide();
        } else {
            alert('Error submitting form: ' + result.message);
        }
    } catch (error) {
        console.error(error);
    }
});


// ════════════════════════════════════════
//  Sort & Filter panel
// ════════════════════════════════════════
const sfBtn      = document.getElementById('sortFilterBtn');
const sfPanel    = document.getElementById('sfPanel');
const sfBackdrop = document.getElementById('sfBackdrop');

function openPanel()  { sfPanel.classList.add('open');    sfBackdrop.classList.add('open');    sfBtn.classList.add('active');    sfPanel.setAttribute('aria-hidden','false'); }
function closePanel() { sfPanel.classList.remove('open'); sfBackdrop.classList.remove('open'); sfBtn.classList.remove('active'); sfPanel.setAttribute('aria-hidden','true');  }

sfBtn.addEventListener('click', () => sfPanel.classList.contains('open') ? closePanel() : openPanel());
sfBackdrop.addEventListener('click', closePanel);

const filterGroups = {
    category:     document.getElementById('filterCategory'),
    theme:        document.getElementById('filterTheme'),
    tier:         document.getElementById('filterTier'),
    type:         document.getElementById('filterType'),
    complexity:   document.getElementById('filterComplexity'),
    availability: document.getElementById('filterAvailability'),
};

const allCards = Array.from(document.querySelectorAll('.game-card'));

Object.keys(filterGroups).forEach(key => {
    const vals = new Set();
    allCards.forEach(card => {
        const v = card.getAttribute(`data-filter-${key}`);
        if (v && v.trim()) vals.add(v.trim());
    });
    Array.from(vals).sort().forEach(val => {
        const badge = document.createElement('span');
        badge.className = 'sf-filter-badge';
        badge.textContent = val;
        badge.dataset.filterKey = key;
        badge.dataset.filterVal = val;
        badge.addEventListener('click', () => { badge.classList.toggle('active'); applyFiltersAndSort(); });
        filterGroups[key].appendChild(badge);
    });
});

document.getElementById('clearFiltersBtn').addEventListener('click', () => {
    document.querySelectorAll('.sf-filter-badge.active').forEach(b => b.classList.remove('active'));
    applyFiltersAndSort();
});

document.getElementById('sfSearchInput').addEventListener('input', () => {
    currentPage = 1;
    applyFiltersAndSort();
});

let currentSort = 'name';
document.querySelectorAll('.sf-sort-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.sf-sort-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentSort = btn.dataset.sort;
        currentPage = 1;
        applyFiltersAndSort();
    });
});

document.querySelectorAll('.sf-filter-badge').forEach(badge => {
    badge.addEventListener('click', () => { currentPage = 1; });
});


// ════════════════════════════════════════
//  Pagination
// ════════════════════════════════════════
let currentPage = 1;
let visibleCards = [];

function renderPagination(total) {
    const wrap       = document.getElementById('gridPagination');
    const totalPages = Math.ceil(total / PAGE_SIZE);
    wrap.innerHTML   = '';

    if (totalPages <= 1) return;

    const prev = document.createElement('button');
    prev.className = 'page-btn';
    prev.innerHTML = '<span class="material-symbols-rounded">chevron_left</span>';
    prev.disabled  = currentPage === 1;
    prev.addEventListener('click', () => { currentPage--; applyFiltersAndSort(); });
    wrap.appendChild(prev);

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.className = 'page-btn' + (i === currentPage ? ' active' : '');
        btn.textContent = i;
        btn.addEventListener('click', (e) => {
            currentPage = parseInt(e.currentTarget.textContent);
            applyFiltersAndSort();
        });
        wrap.appendChild(btn);
    }

    const next = document.createElement('button');
    next.className = 'page-btn';
    next.innerHTML = '<span class="material-symbols-rounded">chevron_right</span>';
    next.disabled  = currentPage === totalPages;
    next.addEventListener('click', () => { currentPage++; applyFiltersAndSort(); });
    wrap.appendChild(next);
}

function applyFiltersAndSort() {
    const activeFilters = {};
    document.querySelectorAll('.sf-filter-badge.active').forEach(badge => {
        const k = badge.dataset.filterKey;
        if (!activeFilters[k]) activeFilters[k] = new Set();
        activeFilters[k].add(badge.dataset.filterVal);
    });

    const hasFilters = Object.keys(activeFilters).length > 0;
    const searchTerm = document.getElementById('sfSearchInput').value.trim().toLowerCase();
    const grid       = document.getElementById('gamesGrid');

    // Filter
    visibleCards = allCards.filter(card => {
        if (hasFilters) {
            const passesFilters = Object.entries(activeFilters).every(([key, vals]) =>
                vals.has((card.getAttribute(`data-filter-${key}`) || '').trim()));
            if (!passesFilters) return false;
        }
        if (searchTerm) {
            return card.getAttribute('data-sort-name').toLowerCase().includes(searchTerm);
        }
        return true;
    });

    // Sort
    const toNum = str => {
        const m = (str || '').replace(',', '.').match(/^[\d.]+/);
        return m ? parseFloat(m[0]) : NaN;
    };

    visibleCards.sort((a, b) => {
        const aVal = (a.getAttribute(`data-sort-${currentSort}`) || '').trim();
        const bVal = (b.getAttribute(`data-sort-${currentSort}`) || '').trim();
        const aNum = toNum(aVal), bNum = toNum(bVal);
        if (!isNaN(aNum) && !isNaN(bNum)) return currentSort === 'bgg' ? bNum - aNum : aNum - bNum;
        return aVal.localeCompare(bVal);
    });

    // Hide all, show only current page
    const start = (currentPage - 1) * PAGE_SIZE;
    const end   = start + PAGE_SIZE;

    allCards.forEach(card => { card.classList.add('sf-hidden'); });
    visibleCards.slice(start, end).forEach(card => { card.classList.remove('sf-hidden'); });

    // Re-order in DOM (visible first, then hidden — preserves grid layout)
    [...visibleCards, ...allCards.filter(c => !visibleCards.includes(c))]
        .forEach(card => grid.appendChild(card));

    renderPagination(visibleCards.length);

    // Scroll to top of grid on page change
    document.getElementById('gamesGrid').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

applyFiltersAndSort();