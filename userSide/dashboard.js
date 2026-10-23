const body = document.body;
const navLinks = document.querySelectorAll('.nav-link');
const navMenu = document.querySelector('.nav-menu');
const mobileToggle = document.querySelector('.mobile-toggle');

const setMenuState = (isOpen) => {
    if (!navMenu || !mobileToggle) return;
    navMenu.classList.toggle('is-open', isOpen);
    navMenu.setAttribute('aria-expanded', String(isOpen));
    mobileToggle.setAttribute('aria-expanded', String(isOpen));
    mobileToggle.classList.toggle('active', isOpen);
};

navLinks.forEach(link => {
    link.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            setMenuState(false);
        }
    });
});

if (mobileToggle) {
    mobileToggle.addEventListener('click', () => {
        const isOpen = !navMenu.classList.contains('is-open');
        setMenuState(isOpen);
    });
}

window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
        setMenuState(false);
    }
});

window.addEventListener('scroll', () => {
    body.classList.toggle('scrolled', window.scrollY > 50);
});