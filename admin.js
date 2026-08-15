const loginView = document.getElementById('loginView');
const dashboardView = document.getElementById('dashboardView');
const loginForm = document.getElementById('loginForm');
const loginStatus = document.getElementById('loginStatus');
const dashboardStatus = document.getElementById('dashboardStatus');
const requestList = document.getElementById('requestList');
const instagramList = document.getElementById('instagramList');
const instagramStatus = document.getElementById('instagramStatus');
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

const wrapCanvasText = (context, text, maxWidth) => {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  words.forEach((word) => {
    const candidate = `${line}${line ? ' ' : ''}${word}`;
    if (context.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  });
  if (line) lines.push(line);
  return lines.slice(0, 5);
};

const createInstagramArtwork = async (post) => {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1080;
  const context = canvas.getContext('2d');
  const background = context.createLinearGradient(0, 0, 1080, 1080);
  background.addColorStop(0, '#08090C');
  background.addColorStop(0.58, '#15171C');
  background.addColorStop(1, '#4B0603');
  context.fillStyle = background;
  context.fillRect(0, 0, 1080, 1080);
  context.strokeStyle = 'rgba(255,42,26,.12)';
  context.lineWidth = 2;
  for (let position = 0; position <= 1080; position += 90) {
    context.beginPath(); context.moveTo(position, 0); context.lineTo(position, 1080); context.stroke();
    context.beginPath(); context.moveTo(0, position); context.lineTo(1080, position); context.stroke();
  }
  const glow = context.createRadialGradient(850, 230, 20, 850, 230, 330);
  glow.addColorStop(0, 'rgba(255,42,26,.75)');
  glow.addColorStop(1, 'rgba(225,6,0,0)');
  context.fillStyle = glow;
  context.fillRect(500, 0, 580, 620);
  context.fillStyle = '#FFFFFF';
  context.font = '900 66px Arial';
  context.fillText('SEM', 80, 130);
  context.fillStyle = '#FF9F0A';
  context.fillText('i', 230, 130);
  context.fillStyle = '#E10600';
  context.fillText('DEIA', 250, 130);
  context.fillStyle = '#FFC247';
  context.font = '700 24px Arial';
  context.fillText(post.format === 'reel' ? 'ROTEIRO PARA REEL' : 'IDEIA PARA O SEU NEGOCIO', 82, 285);
  context.fillStyle = '#FFFFFF';
  context.font = '900 76px Arial';
  const lines = wrapCanvasText(context, post.headline, 850);
  lines.forEach((line, index) => context.fillText(line, 80, 390 + index * 86));
  context.fillStyle = '#FF2A1A';
  context.fillRect(80, 875, 150, 12);
  context.fillStyle = '#BFC3C9';
  context.font = '600 28px Arial';
  context.fillText('Design, tecnologia e estrategia.', 80, 950);
  context.fillStyle = '#FFFFFF';
  context.font = '700 25px Arial';
  context.fillText('@sem.ideia.com.br', 80, 1005);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', .92));
  const path = `${post.id}/${post.format === 'feed' ? 'feed' : 'cover'}.jpg`;
  const { error: uploadError } = await client.storage.from('instagram-content').upload(path, blob, { contentType: 'image/jpeg', upsert: true });
  if (uploadError) throw uploadError;
  const field = post.format === 'feed' ? 'media_path' : 'cover_path';
  const { error: updateError } = await client.from('instagram_posts').update({ [field]: path }).eq('id', post.id);
  if (updateError) throw updateError;
};

const signedPreview = async (path, image) => {
  if (!path) return;
  const { data } = await client.storage.from('instagram-content').createSignedUrl(path, 900);
  if (data?.signedUrl) image.src = data.signedUrl;
};

const updateInstagramPost = async (id, values, message) => {
  const { error } = await client.from('instagram_posts').update(values).eq('id', id);
  instagramStatus.textContent = error ? 'Nao foi possivel atualizar o conteudo.' : message;
  if (!error) await loadInstagramPosts();
};

const uploadReel = async (post, file) => {
  if (file.type !== 'video/mp4' || file.size > 100 * 1024 * 1024) {
    instagramStatus.textContent = 'Envie um MP4 de ate 100 MB.';
    return;
  }
  instagramStatus.textContent = 'Enviando video...';
  const path = `${post.id}/reel-${Date.now()}.mp4`;
  const { error } = await client.storage.from('instagram-content').upload(path, file, { contentType: 'video/mp4' });
  if (error) {
    instagramStatus.textContent = 'Nao foi possivel enviar o video.';
    return;
  }
  await updateInstagramPost(post.id, { media_path: path }, 'Video anexado ao Reel.');
};

const publishInstagramPost = async (postId) => {
  instagramStatus.textContent = 'Enviando para o Instagram...';
  const { data, error } = await client.functions.invoke('publish-instagram', { body: { postId } });
  instagramStatus.textContent = error ? 'Publicacao indisponivel. Verifique a configuracao da Meta API.' : (data.message || 'Conteudo publicado.');
  await loadInstagramPosts();
};

const renderInstagramPosts = async (posts) => {
  instagramList.replaceChildren();
  if (!posts.length) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'Nenhum rascunho gerado.';
    instagramList.appendChild(empty);
    return;
  }
  posts.forEach((post) => {
    const card = document.createElement('article');
    card.className = 'instagram-card';
    const preview = document.createElement('div');
    preview.className = 'instagram-preview';
    const image = document.createElement('img');
    image.alt = `Previa: ${post.headline}`;
    preview.appendChild(image);
    signedPreview(post.format === 'feed' ? post.media_path : post.cover_path, image);
    const body = document.createElement('div');
    body.className = 'instagram-body';
    const meta = document.createElement('div');
    meta.className = 'instagram-meta';
    const format = document.createElement('span');
    format.textContent = post.format;
    const status = document.createElement('span');
    status.className = `post-status ${post.status}`;
    status.textContent = post.status;
    meta.append(format, status);
    const title = document.createElement('h3');
    title.textContent = post.headline;
    const caption = document.createElement('p');
    caption.className = 'instagram-caption';
    caption.textContent = post.caption;
    const hashtags = document.createElement('p');
    hashtags.className = 'instagram-hashtags';
    hashtags.textContent = (post.hashtags || []).map((item) => `#${item.replace(/^#/, '')}`).join(' ');
    body.append(meta, title, caption, hashtags);
    if (post.format === 'reel' && post.reel_script) {
      const script = document.createElement('p');
      script.className = 'reel-script';
      script.textContent = `Roteiro: ${(post.reel_script.scenes || []).join(' | ')}`;
      body.appendChild(script);
    }
    const actions = document.createElement('div');
    actions.className = 'instagram-actions';
    if (post.format === 'reel') {
      const uploadLabel = document.createElement('label');
      uploadLabel.textContent = post.media_path ? 'Trocar MP4' : 'Anexar MP4';
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'video/mp4';
      input.addEventListener('change', () => input.files[0] && uploadReel(post, input.files[0]));
      uploadLabel.appendChild(input);
      actions.appendChild(uploadLabel);
    }
    if (post.status === 'draft' || post.status === 'failed') {
      const approve = document.createElement('button');
      approve.type = 'button';
      approve.className = 'approve';
      approve.textContent = 'Aprovar';
      approve.disabled = post.format === 'reel' && !post.media_path;
      approve.addEventListener('click', () => updateInstagramPost(post.id, { status: 'approved', error_message: null }, 'Conteudo aprovado.'));
      actions.appendChild(approve);
    }
    if (post.status === 'approved' || post.status === 'scheduled') {
      const publish = document.createElement('button');
      publish.type = 'button';
      publish.className = 'publish';
      publish.textContent = 'Publicar agora';
      publish.addEventListener('click', () => publishInstagramPost(post.id));
      actions.appendChild(publish);
      const schedule = document.createElement('input');
      schedule.type = 'datetime-local';
      schedule.setAttribute('aria-label', 'Agendar publicacao');
      schedule.addEventListener('change', () => schedule.value && updateInstagramPost(post.id, { status: 'scheduled', scheduled_at: new Date(schedule.value).toISOString() }, 'Publicacao agendada.'));
      actions.appendChild(schedule);
    }
    body.appendChild(actions);
    card.append(preview, body);
    instagramList.appendChild(card);
  });
};

const loadInstagramPosts = async () => {
  const { data, error } = await client.from('instagram_posts').select('*').order('created_at', { ascending: false });
  if (error) {
    instagramList.innerHTML = '<p class="empty">Execute novamente o schema do Supabase para ativar o Instagram Studio.</p>';
    return;
  }
  renderInstagramPosts(data);
};

document.getElementById('instagramGenerator').addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = document.getElementById('generateInstagramButton');
  const form = new FormData(event.currentTarget);
  button.disabled = true;
  instagramStatus.textContent = 'Criando estrategia, legenda e arte...';
  const { data, error } = await client.functions.invoke('generate-instagram-content', { body: Object.fromEntries(form) });
  if (error || !data?.post) {
    instagramStatus.textContent = 'Geracao indisponivel. Configure e publique a Edge Function e a chave OpenAI.';
    button.disabled = false;
    return;
  }
  try {
    await createInstagramArtwork(data.post);
    instagramStatus.textContent = 'Rascunho e arte criados para revisao.';
    event.currentTarget.reset();
    await loadInstagramPosts();
  } catch (artError) {
    console.error(artError);
    instagramStatus.textContent = 'O texto foi criado, mas a arte nao pode ser salva.';
  }
  button.disabled = false;
});

document.getElementById('refreshInstagramButton').addEventListener('click', () => client && loadInstagramPosts());

if (!client) {
  loginStatus.textContent = 'Configure a Project URL e a anon key em supabase-config.js.';
  loginForm.querySelector('button').disabled = true;
} else {
  client.auth.getSession().then(({ data }) => {
    const authenticated = Boolean(data.session);
    setView(authenticated);
    if (authenticated) Promise.all([loadRequests(), loadInstagramPosts()]);
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
  await Promise.all([loadRequests(), loadInstagramPosts()]);
});

document.getElementById('refreshButton').addEventListener('click', () => client && loadRequests());
document.getElementById('logoutButton').addEventListener('click', async () => {
  if (!client) return;
  await client.auth.signOut();
  requestList.replaceChildren();
});
