const header = document.querySelector('.site-header');
const menuButton = document.querySelector('.menu-button');
const nav = document.querySelector('.nav');

const closeMenu = () => {
  nav.classList.remove('open');
  menuButton.classList.remove('active');
  menuButton.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('menu-open');
};

menuButton.addEventListener('click', () => {
  const isOpen = nav.classList.toggle('open');
  menuButton.classList.toggle('active', isOpen);
  menuButton.setAttribute('aria-expanded', String(isOpen));
  document.body.classList.toggle('menu-open', isOpen);
});

nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
window.addEventListener('scroll', () => header.classList.toggle('scrolled', window.scrollY > 30), { passive: true });

if ('IntersectionObserver' in window) {
  const revealElements = document.querySelectorAll('.reveal');
  revealElements.forEach((element) => element.classList.add('waiting'));
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealElements.forEach((element) => observer.observe(element));
} else {
  document.querySelectorAll('.reveal').forEach((element) => element.classList.add('visible'));
}

document.getElementById('contactForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const status = document.getElementById('formStatus');
  if (!form.reportValidity()) return;
  status.textContent = 'Ideia recebida! Em breve entraremos em contato.';
  form.reset();
});

document.getElementById('year').textContent = new Date().getFullYear();
