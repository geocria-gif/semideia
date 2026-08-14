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

const heroMessage = document.getElementById('heroMessage');
const typingLead = heroMessage.querySelector('.typing-lead');
const typingAccent = heroMessage.querySelector('.typing-accent');
const heroMessages = [
  ['Ideias que ', 'movem marcas.'],
  ['Design, tecnologia e ', 'estratégia para o seu negócio crescer.'],
  ['Sua identidade digital. Seu espaço. ', 'Sua melhor ideia.'],
  ['Sites personalizados que transformam ideias em ', 'presença digital.'],
  ['Sua marca disponível em ', 'todos os dispositivos.']
];

if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  let messageIndex = 0;
  let characterIndex = 0;
  let deleting = false;
  const typeNextCharacter = () => {
    const [lead, accent] = heroMessages[messageIndex];
    const fullMessage = lead + accent;
    const visible = fullMessage.slice(0, characterIndex);
    typingLead.textContent = visible.slice(0, Math.min(characterIndex, lead.length));
    typingAccent.textContent = visible.slice(lead.length);
    heroMessage.setAttribute('aria-label', fullMessage);

    if (!deleting && characterIndex < fullMessage.length) {
      characterIndex += 1;
      setTimeout(typeNextCharacter, 42);
    } else if (!deleting) {
      deleting = true;
      setTimeout(typeNextCharacter, 2600);
    } else if (characterIndex > 0) {
      characterIndex -= 1;
      setTimeout(typeNextCharacter, 18);
    } else {
      deleting = false;
      messageIndex = (messageIndex + 1) % heroMessages.length;
      setTimeout(typeNextCharacter, 400);
    }
  };
  typingLead.textContent = '';
  typingAccent.textContent = '';
  typeNextCharacter();
}

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

const contactForm = document.getElementById('contactForm');
const fileInput = document.getElementById('attachments');
const fileHint = document.getElementById('fileHint');
const maxFiles = 5;
const maxTotalSize = 10 * 1024 * 1024;
const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const validateFiles = () => {
  const files = [...fileInput.files];
  const totalSize = files.reduce((total, file) => total + file.size, 0);
  if (files.length > maxFiles) return `Envie no maximo ${maxFiles} arquivos.`;
  if (totalSize > maxTotalSize) return 'Os arquivos devem ter no maximo 10 MB no total.';
  if (files.some((file) => !acceptedTypes.includes(file.type))) return 'Envie apenas JPG, PNG, WEBP ou PDF.';
  return '';
};

fileInput.addEventListener('change', () => {
  const error = validateFiles();
  const files = [...fileInput.files];
  fileHint.textContent = error || (files.length ? files.map((file) => file.name).join(', ') : 'Ate 5 arquivos e 10 MB no total.');
  fileHint.classList.toggle('error', Boolean(error));
});

contactForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const status = document.getElementById('formStatus');
  if (!form.reportValidity()) return;
  const fileError = validateFiles();
  if (fileError) {
    status.className = 'form-status error';
    status.textContent = fileError;
    return;
  }

  const client = window.getSupabaseClient?.();
  if (!client) {
    status.className = 'form-status error';
    status.textContent = 'Formulario aguardando a configuracao do Supabase.';
    return;
  }

  const button = form.querySelector('button[type=submit]');
  const uploadedPaths = [];
  button.disabled = true;
  button.textContent = 'Enviando...';
  status.className = 'form-status';
  status.textContent = '';

  try {
    const attachments = [];
    const requestFolder = crypto.randomUUID();
    for (const file of fileInput.files) {
      const safeName = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '-');
      const path = `${requestFolder}/${crypto.randomUUID()}-${safeName}`;
      const { error } = await client.storage.from('contact-attachments').upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      uploadedPaths.push(path);
      attachments.push({ path, name: file.name, type: file.type, size: file.size });
    }

    const data = new FormData(form);
    const { error } = await client.from('contact_requests').insert({
      name: data.get('name').trim(),
      email: data.get('email').trim(),
      phone: data.get('phone').trim(),
      address: data.get('address').trim(),
      service: data.get('service'),
      message: data.get('message').trim(),
      attachments
    });
    if (error) throw error;

    status.className = 'form-status success';
    status.textContent = 'Ideia recebida! Em breve entraremos em contato.';
    form.reset();
    fileHint.textContent = 'Ate 5 arquivos e 10 MB no total.';
  } catch (error) {
    if (uploadedPaths.length) await client.storage.from('contact-attachments').remove(uploadedPaths);
    status.className = 'form-status error';
    status.textContent = 'Nao foi possivel enviar agora. Tente novamente em instantes.';
    console.error(error);
  } finally {
    button.disabled = false;
    button.innerHTML = 'Enviar minha ideia <span>→</span>';
  }
});

document.getElementById('year').textContent = new Date().getFullYear();
