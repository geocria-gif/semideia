import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(url, serviceKey);

  try {
    const input = request.method === 'POST' ? await request.json().catch(() => ({})) : {};
    const cronAuthorized = Boolean(Deno.env.get('CRON_SECRET')) && request.headers.get('x-cron-secret') === Deno.env.get('CRON_SECRET');
    if (!cronAuthorized) {
      const authorization = request.headers.get('Authorization') || '';
      const authClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } } });
      const { data: userData } = await authClient.auth.getUser();
      if (!userData.user) return json({ error: 'Nao autorizado.' }, 401);
      const { data: adminUser } = await admin.from('admin_users').select('user_id').eq('user_id', userData.user.id).maybeSingle();
      if (!adminUser) return json({ error: 'Acesso administrativo necessario.' }, 403);
    }

    let query = admin.from('instagram_posts').select('*');
    if (input.postId) query = query.eq('id', input.postId).in('status', ['approved', 'scheduled', 'failed']);
    else query = query.eq('status', 'scheduled').lte('scheduled_at', new Date().toISOString()).order('scheduled_at').limit(5);
    const { data: posts, error: queryError } = await query;
    if (queryError) throw queryError;
    if (!posts?.length) return json({ message: 'Nenhum conteudo pronto para publicar.' });

    const results = [];
    for (const post of posts) results.push(await publishPost(admin, post));
    return json({ message: `${results.filter((item) => item.ok).length} conteudo(s) publicado(s).`, results });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : 'Erro interno.' }, 500);
  }
});

async function publishPost(admin: ReturnType<typeof createClient>, post: Record<string, any>) {
  const igUserId = Deno.env.get('INSTAGRAM_USER_ID');
  const accessToken = Deno.env.get('META_ACCESS_TOKEN');
  const version = Deno.env.get('META_GRAPH_VERSION') || 'v23.0';
  if (!igUserId || !accessToken) throw new Error('Credenciais da Meta nao configuradas.');
  if (!post.media_path) throw new Error(`Midia ausente no conteudo ${post.id}.`);
  await admin.from('instagram_posts').update({ status: 'publishing', error_message: null }).eq('id', post.id);
  try {
    const { data: signed, error: signedError } = await admin.storage.from('instagram-content').createSignedUrl(post.media_path, 3600);
    if (signedError) throw signedError;
    const caption = `${post.caption}\n\n${(post.hashtags || []).map((tag: string) => `#${tag.replace(/^#/, '')}`).join(' ')}`.trim();
    const params = new URLSearchParams({ caption, access_token: accessToken });
    if (post.format === 'reel') {
      params.set('media_type', 'REELS');
      params.set('video_url', signed.signedUrl);
      params.set('share_to_feed', 'true');
    } else params.set('image_url', signed.signedUrl);
    const createResponse = await fetch(`https://graph.facebook.com/${version}/${igUserId}/media`, { method: 'POST', body: params });
    const container = await createResponse.json();
    if (!createResponse.ok || !container.id) throw new Error(container.error?.message || 'Falha ao criar container na Meta.');
    if (post.format === 'reel') await waitForContainer(version, container.id, accessToken);
    const publishParams = new URLSearchParams({ creation_id: container.id, access_token: accessToken });
    const publishResponse = await fetch(`https://graph.facebook.com/${version}/${igUserId}/media_publish`, { method: 'POST', body: publishParams });
    const published = await publishResponse.json();
    if (!publishResponse.ok || !published.id) throw new Error(published.error?.message || 'Falha ao publicar na Meta.');
    await admin.from('instagram_posts').update({ status: 'published', instagram_media_id: published.id, error_message: null }).eq('id', post.id);
    return { id: post.id, ok: true, instagramMediaId: published.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha na publicacao.';
    await admin.from('instagram_posts').update({ status: 'failed', error_message: message }).eq('id', post.id);
    return { id: post.id, ok: false, error: message };
  }
}

async function waitForContainer(version: string, containerId: string, accessToken: string) {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const response = await fetch(`https://graph.facebook.com/${version}/${containerId}?fields=status_code,status&access_token=${encodeURIComponent(accessToken)}`);
    const status = await response.json();
    if (status.status_code === 'FINISHED') return;
    if (status.status_code === 'ERROR' || status.status_code === 'EXPIRED') throw new Error(status.status || 'A Meta recusou o video.');
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  throw new Error('Tempo limite ao processar o Reel.');
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
