(() => {
    'use strict';
    const header = document.querySelector('.council-header');
    const updateHeight = () => document.documentElement.style.setProperty('--council-header-height', `${header.offsetHeight}px`);
    if (header) {
        updateHeight();
        if ('ResizeObserver' in window) new ResizeObserver(updateHeight).observe(header);
        else window.addEventListener('resize', updateHeight);
    }
    document.querySelectorAll('[data-council-contact]').forEach(button => {
        button.addEventListener('click', () => document.querySelector('.council-whatsapp')?.click());
    });
    const menu = document.getElementById('council-menu');
    menu?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
        if (window.bootstrap && menu.classList.contains('show')) {
            // Re-scroll after the collapsing mobile menu changes the sticky header height.
            const url = new URL(link.href);
            if (url.pathname === location.pathname && url.hash) {
                menu.addEventListener('hidden.bs.collapse', () => {
                    updateHeight();
                    document.getElementById(decodeURIComponent(url.hash.slice(1)))?.scrollIntoView();
                }, { once: true });
            }
            bootstrap.Collapse.getOrCreateInstance(menu, { toggle: false }).hide();
        }
    }));
    const sectionLinks = [...document.querySelectorAll('.council-subnav a')];
    const sections = sectionLinks.map(link => document.getElementById(link.hash.slice(1))).filter(Boolean);
    if (sections.length) {
        let pending = false;
        const updateSection = () => {
            const threshold = (header?.offsetHeight || 0) + 60;
            let active = sections[0];
            sections.forEach(section => { if (section.getBoundingClientRect().top <= threshold) active = section; });
            sectionLinks.forEach(link => {
                const selected = link.hash === `#${active.id}`;
                link.classList.toggle('active', selected);
                if (selected) link.setAttribute('aria-current', 'location');
                else link.removeAttribute('aria-current');
            });
            pending = false;
        };
        window.addEventListener('scroll', () => {
            if (!pending) { pending = true; requestAnimationFrame(updateSection); }
        }, { passive: true });
        window.addEventListener('resize', updateSection);
        updateSection();
    }
})();
