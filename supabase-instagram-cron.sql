-- Execute somente depois de publicar a Edge Function publish-instagram.
-- Use o mesmo valor de CRON_SECRET configurado nos Secrets da funcao.
select cron.schedule(
  'publish-scheduled-instagram-posts',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://aalcwxznodqjskzfddli.supabase.co/functions/v1/publish-instagram',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'SUBSTITUA_POR_UM_SEGREDO_FORTE'
    ),
    body := '{}'::jsonb
  );
  $$
);
