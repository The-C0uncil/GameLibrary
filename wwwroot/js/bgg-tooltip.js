// // BGG Tooltip functionality
// const bggCache = new Map();
// let currentTooltipTimeout = null;
// let hideTooltipTimeout = null;

// document.addEventListener('DOMContentLoaded', function () {
//     const tooltip = document.getElementById('bggTooltip');
//     const gameCoverImages = document.querySelectorAll('.game-cover');

//     gameCoverImages.forEach(img => {
//         img.addEventListener('mouseenter', function (e) {
//             alert('Mouse entered game cover image'); // Debugging alert
//             const bggUrl = this.getAttribute('data-bgg-url');

//             // Clear any existing hide timeout
//             if (hideTooltipTimeout) {
//                 clearTimeout(hideTooltipTimeout);
//                 hideTooltipTimeout = null;
//             }

//             // Only show tooltip if there's a BGG URL
//             if (bggUrl && bggUrl.trim() !== '') {
//                 // Small delay before showing tooltip
//                 currentTooltipTimeout = setTimeout(() => {
//                     showBGGTooltip(e, bggUrl);
//                 }, 300);
//             }
//         });

//         img.addEventListener('mouseleave', function () {
//             // Clear the show timeout if mouse leaves before it triggers
//             if (currentTooltipTimeout) {
//                 clearTimeout(currentTooltipTimeout);
//                 currentTooltipTimeout = null;
//             }

//             // Hide tooltip after a short delay
//             hideTooltipTimeout = setTimeout(() => {
//                 tooltip.style.display = 'none';
//             }, 200);
//         });

//         img.addEventListener('mousemove', function (e) {
//             // Update tooltip position as mouse moves
//             if (tooltip.style.display === 'block') {
//                 positionTooltip(e);
//             }
//         });
//     });
// });

// function showBGGTooltip(event, bggUrl) {
//     const tooltip = document.getElementById('bggTooltip');
//     const loadingDiv = tooltip.querySelector('.bgg-loading');
//     const dataDiv = tooltip.querySelector('.bgg-data');
//     const errorDiv = tooltip.querySelector('.bgg-error');

//     // Reset tooltip state
//     loadingDiv.style.display = 'block';
//     dataDiv.style.display = 'none';
//     errorDiv.style.display = 'none';

//     // Position and show tooltip
//     positionTooltip(event);
//     tooltip.style.display = 'block';

//     // Extract BGG ID from URL
//     const bggId = extractBGGId(bggUrl);

//     if (!bggId) {
//         showError(tooltip);
//         return;
//     }

//     // Check cache first
//     if (bggCache.has(bggId)) {
//         displayBGGData(tooltip, bggCache.get(bggId));
//         return;
//     }

//     // Fetch from BGG API
//     fetchBGGData(bggId, tooltip);
// }

// function extractBGGId(url) {
//     // BGG URLs are typically: https://boardgamegeek.com/boardgame/12345/game-name
//     const match = url.match(/\/boardgame\/(\d+)/);
//     return match ? match[1] : null;
// }

// function fetchBGGData(bggId, tooltip) {
//     // Use our proxy controller to avoid CORS issues
//     const apiUrl = `/api/BGGProxy/${bggId}`;

//     fetch(apiUrl)
//         .then(response => {
//             if (!response.ok) {
//                 throw new Error('Failed to fetch BGG data');
//             }
//             return response.text();
//         })
//         .then(xmlText => {
//             const parser = new DOMParser();
//             const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

//             // Parse XML data
//             const item = xmlDoc.querySelector('item');
//             if (!item) {
//                 throw new Error('Game not found');
//             }

//             const data = {
//                 name: item.querySelector('name[type="primary"]')?.getAttribute('value') || 'Unknown',
//                 image: item.querySelector('image')?.textContent || '',
//                 thumbnail: item.querySelector('thumbnail')?.textContent || '',
//                 rating: item.querySelector('statistics ratings average')?.getAttribute('value') || 'N/A',
//                 minPlayers: item.querySelector('minplayers')?.getAttribute('value') || '?',
//                 maxPlayers: item.querySelector('maxplayers')?.getAttribute('value') || '?',
//                 playingTime: item.querySelector('playingtime')?.getAttribute('value') || 'N/A',
//                 yearPublished: item.querySelector('yearpublished')?.getAttribute('value') || 'N/A',
//                 description: item.querySelector('description')?.textContent || 'No description available'
//             };

//             // Cache the data
//             bggCache.set(bggId, data);

//             // Display the data
//             displayBGGData(tooltip, data);
//         })
//         .catch(error => {
//             console.error('Error fetching BGG data:', error);
//             showError(tooltip);
//         });
// }

// function displayBGGData(tooltip, data) {
//     const loadingDiv = tooltip.querySelector('.bgg-loading');
//     const dataDiv = tooltip.querySelector('.bgg-data');
//     const errorDiv = tooltip.querySelector('.bgg-error');

//     // Hide loading, show data
//     loadingDiv.style.display = 'none';
//     errorDiv.style.display = 'none';
//     dataDiv.style.display = 'block';

//     // Populate data
//     const img = dataDiv.querySelector('.bgg-image');
//     img.src = data.image || data.thumbnail || '/images/placeholder.png';
//     img.alt = data.name;

//     dataDiv.querySelector('.bgg-title').textContent = data.name;
//     dataDiv.querySelector('.bgg-rating span').textContent =
//         data.rating !== 'N/A' ? parseFloat(data.rating).toFixed(1) : 'N/A';
//     dataDiv.querySelector('.bgg-players span').textContent =
//         `${data.minPlayers}-${data.maxPlayers}`;
//     dataDiv.querySelector('.bgg-playtime span').textContent =
//         `${data.playingTime} min`;
//     dataDiv.querySelector('.bgg-year span').textContent = data.yearPublished;

//     // Clean and truncate description
//     const description = stripHtml(data.description);
//     const truncated = description.length > 200
//         ? description.substring(0, 200) + '...'
//         : description;
//     dataDiv.querySelector('.bgg-description').textContent = truncated;
// }

// function showError(tooltip) {
//     const loadingDiv = tooltip.querySelector('.bgg-loading');
//     const dataDiv = tooltip.querySelector('.bgg-data');
//     const errorDiv = tooltip.querySelector('.bgg-error');

//     loadingDiv.style.display = 'none';
//     dataDiv.style.display = 'none';
//     errorDiv.style.display = 'block';
// }

// function positionTooltip(event) {
//     const tooltip = document.getElementById('bggTooltip');
//     const offset = 15;

//     let x = event.clientX + offset;
//     let y = event.clientY + offset;

//     // Prevent tooltip from going off screen
//     const tooltipRect = tooltip.getBoundingClientRect();
//     const viewportWidth = window.innerWidth;
//     const viewportHeight = window.innerHeight;

//     if (x + tooltipRect.width > viewportWidth) {
//         x = event.clientX - tooltipRect.width - offset;
//     }

//     if (y + tooltipRect.height > viewportHeight) {
//         y = event.clientY - tooltipRect.height - offset;
//     }

//     tooltip.style.left = x + 'px';
//     tooltip.style.top = y + 'px';
// }

// function stripHtml(html) {
//     const tmp = document.createElement('div');
//     tmp.innerHTML = html;
//     return tmp.textContent || tmp.innerText || '';
// }
