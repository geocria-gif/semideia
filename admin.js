const loginView = document.getElementById('loginView');
const dashboardView = document.getElementById('dashboardView');
const loginForm = document.getElementById('loginForm');
const loginStatus = document.getElementById('loginStatus');
const dashboardStatus = document.getElementById('dashboardStatus');
const requestList = document.getElementById('requestList');
const client = window.getSupabaseClient?.();
const slides = [...document.querySelectorAll('.login-slide')];
const dotsBox = document.querySelector('.login-dots');
let slideIndex = 0;

const showSlide = (index) => {
  slideIndex = (index + slides.length) % slides.length;
  slides.forEach((slide, position) => slide.classList.toggle('active', position === slideIndex));
  [...dotsBox.children].forEach((dot, position) => dot.classList.toggle('active', position === slideIndex));
};

slides.forEach((_slide, index) => {
  const dot = document.createElement('button');
  dot.type = 'button';
  dot.className = `login-dot${index === 0 ? ' active' : ''}`;
  dot.setAttribute('aria-label', `Mostrar projeto ${index + 1}`);
  dot.addEventListener('click', () => showSlide(index));
  dotsBox.appendChild(dot);
});

if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  setInterval(() => showSlide(slideIndex + 1), 4800);
}

const setView = (authenticated) => {
  loginView.hidden = authenticated;
  dashboardView.hidden = !authenticated;
};

const addField = (container, label, value, className = '') => {
  const field = document.createElement('div');
  field.className = `request-field ${className}`.trim();
  const caption = document.createElement('span');
  caption.textContent = label;
  const text = document.createElement('p');
  text.textContent = value || '-';
  field.append(caption, text);
  container.appendChild(field);
};

const openAttachment = async (path) => {
  const { data, error } = await client.storage.from('contact-attachments').createSignedUrl(path, 60);
  if (error) {
    dashboardStatus.textContent = 'Nao foi possivel abrir o anexo.';
    return;
  }
  window.open(data.signedUrl, '_blank', 'noopener');
};

const renderRequests = (requests) => {
  requestList.replaceChildren();
  document.getElementById('totalCount').textContent = requests.length;
  document.getElementById('newCount').textContent = requests.filter((item) => item.status === 'new').length;
  document.getElementById('contactedCount').textContent = requests.filter((item) => item.status === 'contacted').length;

  if (!requests.length) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'Nenhuma solicitacao recebida.';
    requestList.appendChild(empty);
    return;
  }

  requests.forEach((request) => {
    const card = document.createElement('article');
    card.className = 'request-card';
    const head = document.createElement('div');
    head.className = 'request-head';
    const title = document.createElement('h2');
    title.textContent = request.name;
    const date = document.createElement('span');
    date.className = 'request-date';
    date.textContent = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(request.created_at));
    head.append(title, date);

    const grid = document.createElement('div');
    grid.className = 'request-grid';
    addField(grid, 'E-mail', request.email);
    addField(grid, 'Telefone', request.phone);
    addField(grid, 'Endereco', request.address);
    addField(grid, 'Servico', request.service);
    addField(grid, 'Mensagem', request.message, 'request-message');

    const controls = document.createElement('div');
    controls.className = 'request-controls';
    const attachments = document.createElement('div');
    attachments.className = 'attachments';
    (request.attachments || []).forEach((file) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'attachment';
      button.textContent = file.name;
      button.addEventListener('click', () => openAttachment(file.path));
      attachments.appendChild(button);
    });
    if (!attachments.children.length) attachments.textContent = 'Sem anexos';

    const select = document.createElement('select');
    [['new', 'Nova'], ['contacted', 'Em atendimento'], ['closed', 'Concluida']].forEach(([value, text]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = text;
      option.selected = request.status === value;
      select.appendChild(option);
    });
    select.setAttribute('aria-label', `Status da solicitacao de ${request.name}`);
    select.addEventListener('change', async () => {
      select.disabled = true;
      const { error } = await client.from('contact_requests').update({ status: select.value }).eq('id', request.id);
      dashboardStatus.textContent = error ? 'Nao foi possivel atualizar o status.' : 'Status atualizado.';
      select.disabled = false;
    });
    controls.append(attachments, select);
    card.append(head, grid, controls);
    requestList.appendChild(card);
  });
};

const loadRequests = async () => {
  dashboardStatus.textContent = 'Carregando...';
  const { data, error } = await client.from('contact_requests').select('*').order('created_at', { ascending: false });
  if (error) {
    dashboardStatus.textContent = 'Nao foi possivel carregar as solicitacoes.';
    return;
  }
  dashboardStatus.textContent = '';
  renderRequests(data);
};

if (!client) {
  loginStatus.textContent = 'Configure a Project URL e a anon key em supabase-config.js.';
  loginForm.querySelector('button').disabled = true;
} else {
  client.auth.getSession().then(({ data }) => {
    const authenticated = Boolean(data.session);
    setView(authenticated);
    if (authenticated) loadRequests();
  });
  client.auth.onAuthStateChange((_event, session) => setView(Boolean(session)));
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!client) return;
  const button = loginForm.querySelector('button');
  button.disabled = true;
  loginStatus.textContent = 'Entrando...';
  const data = new FormData(loginForm);
  const { error } = await client.auth.signInWithPassword({ email: data.get('email'), password: data.get('password') });
  if (error) {
    loginStatus.textContent = 'E-mail ou senha incorretos.';
    button.disabled = false;
    return;
  }
  loginStatus.textContent = '';
  loginForm.reset();
  button.disabled = false;
  await loadRequests();
});

document.getElementById('refreshButton').addEventListener('click', () => client && loadRequests());
document.getElementById('logoutButton').addEventListener('click', async () => {
  if (!client) return;
  await client.auth.signOut();
  requestList.replaceChildren();
});
