import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authorization = request.headers.get('Authorization') || '';
    const url = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openAiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAiKey) throw new Error('OPENAI_API_KEY nao configurada.');

    const authClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: userData, error: userError } = await authClient.auth.getUser();
    if (userError || !userData.user) return json({ error: 'Nao autorizado.' }, 401);
    const admin = createClient(url, serviceKey);
    const { data: adminUser } = await admin.from('admin_users').select('user_id').eq('user_id', userData.user.id).maybeSingle();
    if (!adminUser) return json({ error: 'Acesso administrativo necessario.' }, 403);

    const input = await request.json();
    const format = input.format === 'reel' ? 'reel' : 'feed';
    const topic = String(input.topic || '').trim();
    if (topic.length < 3 || topic.length > 500) return json({ error: 'Tema invalido.' }, 400);
    const tone = String(input.tone || 'Profissional');
    const goal = String(input.goal || 'Gerar interesse');
    const prompt = `Crie um conteudo em portugues do Brasil para o Instagram da agencia Semideia, que vende sites, landing pages, lojas virtuais, identidade digital, SEO e suporte.\nFormato: ${format}.\nTema: ${topic}.\nTom: ${tone}.\nObjetivo: ${goal}.\nA marca usa linguagem clara, tecnologica e comercial. Nunca invente resultados ou clientes. Retorne somente JSON valido com: headline (maximo 70 caracteres), caption (maximo 1200 caracteres com CTA), hashtags (array com 8 a 14 termos sem #) e reel_script. Para feed, reel_script deve ser null. Para reel, reel_script deve ter hook, scenes (array de 4 a 7 cenas curtas), on_screen_text e closing_cta.`;
    const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini',
        temperature: 0.8,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: 'Voce e um estrategista senior de conteudo e social media.' }, { role: 'user', content: prompt }],
      }),
    });
    const openAiData = await openAiResponse.json();
    if (!openAiResponse.ok) throw new Error(openAiData.error?.message || 'Erro ao gerar conteudo.');
    const content = JSON.parse(openAiData.choices[0].message.content);
    const hashtags = Array.isArray(content.hashtags) ? content.hashtags.slice(0, 14).map((item: unknown) => String(item).replace(/^#/, '')) : [];
    const { data: post, error: insertError } = await admin.from('instagram_posts').insert({
      format,
      topic,
      tone,
      goal,
      headline: String(content.headline || topic).slice(0, 120),
      caption: String(content.caption || ''),
      hashtags,
      reel_script: format === 'reel' ? content.reel_script : null,
      created_by: userData.user.id,
    }).select().single();
    if (insertError) throw insertError;
    return json({ post });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : 'Erro interno.' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
