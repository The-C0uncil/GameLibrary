// ════════════════════════════════════════
//  Game selection
// ════════════════════════════════════════
let selectedGames = [];

document.querySelectorAll('.game-card:not(.unavailable)').forEach(card => {
    card.addEventListener('click', function () {
        const gameName = this.getAttribute('data-game-name');

        if (this.classList.contains('selected')) {
            this.classList.remove('selected');
            selectedGames = selectedGames.filter(g => g !== gameName);
        } else {
            this.classList.add('selected');
            selectedGames.push(gameName);
        }

        updateSelectedGamesDisplay();
        updateContactFab();
    });
});

function updateContactFab() {
    const fab = document.querySelector('.fab-right');
    if (selectedGames.length > 0) {
        fab.classList.add('visible');
    } else {
        fab.classList.remove('visible');
    }
}

function updateSelectedGamesDisplay() {
    const display = document.getElementById('selectedGamesDisplay');
    const list = document.getElementById('selectedGamesList');

    if (selectedGames.length > 0) {
        display.classList.add('show');
        list.innerHTML = '';
        selectedGames.forEach(game => {
            const li = document.createElement('li');
            li.textContent = game;
            list.appendChild(li);
        });
    } else {
        display.classList.remove('show');
    }
}

// ════════════════════════════════════════
//  Contact form submission
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
            updateSelectedGamesDisplay();
            updateContactFab();

            const modal = bootstrap.Modal.getInstance(document.getElementById('contactModal'));
            modal.hide();

            document.querySelectorAll('.game-card.selected').forEach(card => {
                card.classList.remove('selected');
            });
        } else {
            alert('Error submitting form: ' + result.message);
        }
    } catch (error) {
        alert('Error submitting form. Please check your email configuration.');
        console.error('Error:', error);
    }
});

document.getElementById('contactModal').addEventListener('show.bs.modal', function () {
    updateSelectedGamesDisplay();
});

// ════════════════════════════════════════
//  Sort & Filter panel
// ════════════════════════════════════════
const sfBtn      = document.getElementById('sortFilterBtn');
const sfPanel    = document.getElementById('sfPanel');
const sfBackdrop = document.getElementById('sfBackdrop');

// ── Open / close ──────────────────────
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

// ── Build filter badge groups from card data ──────────────────────
const filterGroups = {
    category:     document.getElementById('filterCategory'),
    theme:        document.getElementById('filterTheme'),
    tier:         document.getElementById('filterTier'),
    type:         document.getElementById('filterType'),
    complexity:   document.getElementById('filterComplexity'),
    availability: document.getElementById('filterAvailability'),
};

// Collect unique values per filter key
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

// Render badges
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

// ── Clear filters ──────────────────────
document.getElementById('clearFiltersBtn').addEventListener('click', () => {
    document.querySelectorAll('.sf-filter-badge.active').forEach(b => b.classList.remove('active'));
    applyFiltersAndSort();
});

// ── Search ──────────────────────
document.getElementById('sfSearchInput').addEventListener('input', applyFiltersAndSort);

// ── Sort ──────────────────────
let currentSort = 'name';

document.querySelectorAll('.sf-sort-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.sf-sort-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentSort = btn.dataset.sort;
        applyFiltersAndSort();
    });
});

// ── Core: apply filters then sort ──────────────────────
function applyFiltersAndSort() {
    // Gather active filters grouped by key
    const activeFilters = {};
    document.querySelectorAll('.sf-filter-badge.active').forEach(badge => {
        const k = badge.dataset.filterKey;
        if (!activeFilters[k]) activeFilters[k] = new Set();
        activeFilters[k].add(badge.dataset.filterVal);
    });

    const hasFilters = Object.keys(activeFilters).length > 0;
    const grid = document.getElementById('gamesGrid');

    // Show/hide cards based on filters
    allCards.forEach(card => {
        if (!hasFilters) {
            card.classList.remove('sf-hidden');
            return;
        }

        const visible = Object.entries(activeFilters).every(([key, vals]) => {
            const cardVal = (card.getAttribute(`data-filter-${key}`) || '').trim();
            return vals.has(cardVal);
        });

        card.classList.toggle('sf-hidden', !visible);
    });

    // Search by name
    const searchTerm = document.getElementById('sfSearchInput').value.trim().toLowerCase();
    allCards.forEach(card => {
        if (card.classList.contains('sf-hidden')) return; // already filtered out
        if (searchTerm && !card.getAttribute('data-sort-name').toLowerCase().includes(searchTerm)) {
            card.classList.add('sf-hidden');
        }
    });

    // Sort visible cards
    const visibleCards = allCards.filter(c => !c.classList.contains('sf-hidden'));

    visibleCards.sort((a, b) => {
        const aVal = (a.getAttribute(`data-sort-${currentSort}`) || '').trim();
        const bVal = (b.getAttribute(`data-sort-${currentSort}`) || '').trim();

        // Normalise: replace comma decimals ("7,5" -> "7.5"),
        // then extract the first numeric token so mixed strings
        // like "2-4 players" or "60 min" compare by their leading number.
        const toNum = str => {
            const normalised = str.replace(',', '.');
            const match = normalised.match(/^[\d.]+/);
            return match ? parseFloat(match[0]) : NaN;
        };

        const aNum = toNum(aVal);
        const bNum = toNum(bVal);

        if (!isNaN(aNum) && !isNaN(bNum)) {
            // BGG score: highest first (descending); all others: ascending
            return currentSort === 'bgg' ? bNum - aNum : aNum - bNum;
        }

        // One or both values are non-numeric — fall back to locale string sort
        return aVal.localeCompare(bVal);
    });

    // Re-append in sorted order (hidden cards stay in DOM but are display:none)
    const hiddenCards = allCards.filter(c => c.classList.contains('sf-hidden'));
    [...visibleCards, ...hiddenCards].forEach(card => grid.appendChild(card));
}

// Apply default sort (name) on page load
applyFiltersAndSort();