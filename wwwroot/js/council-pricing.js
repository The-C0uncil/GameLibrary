(() => {
    'use strict';
    const prices = window.councilPrices;
    const cards = [...document.querySelectorAll('[data-price-model]')];
    if (!prices || !cards.length) return;
    const money = value => new Intl.NumberFormat('pt-PT', {
        style: 'currency', currency: 'EUR', minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
        maximumFractionDigits: 2
    }).format(value);
    const update = (count, announce) => {
        if (!Number.isInteger(count) || count < 1 || count > 8) return;
        const descriptions = [];
        cards.forEach(card => {
            const row = prices[card.dataset.priceModel][count];
            card.querySelector('[data-original]').textContent = money(row.original);
            card.querySelector('[data-original]').hidden = row.original <= row.entry;
            card.querySelector('[data-entry]').textContent = money(row.entry);
            card.querySelector('[data-consumption]').textContent = row.consumption > 0
                ? `+ ${money(row.consumption)} para consumos` : 'Sem consumo mínimo adicional';
            card.querySelector('[data-total]').textContent = money(row.total);
            descriptions.push(`${card.querySelector('h3').textContent}: ${money(row.total)} por pessoa`);
        });
        if (announce) document.getElementById('pricing-announcement').textContent = `${count} ${count === 1 ? 'jogador' : 'jogadores'}. ${descriptions.join('. ')}.`;
    };
    document.querySelectorAll('input[name="players"]').forEach(input => {
        input.addEventListener('change', () => update(Number(input.value), true));
    });
    update(Number(document.querySelector('input[name="players"]:checked')?.value || 4), false);
})();
