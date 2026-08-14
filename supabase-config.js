(function () {
  const config = {
    url: 'https://aalcwxznodqjskzfddli.supabase.co',
    anonKey: 'sb_publishable_k-qt9J9TC07KDwXxAAWihw_GWIAghqB'
  };

  let client;
  window.getSupabaseClient = () => {
    const configured = config.url.startsWith('https://') && !config.anonKey.startsWith('COLE_AQUI');
    if (!configured || !window.supabase) return null;
    if (!client) client = window.supabase.createClient(config.url, config.anonKey);
    return client;
  };
})();
