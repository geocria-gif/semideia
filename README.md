# Semideia

Landing page institucional estatica e independente.

## Executar localmente

```powershell
npx serve .
```

Abra o endereco informado pelo servidor. Os dados comerciais, cases e contatos sao demonstrativos e devem ser substituidos antes da publicacao.

## Supabase

1. Crie um projeto no Supabase.
2. Abra o SQL Editor e execute `supabase-schema.sql`.
3. Em Authentication, desative novos cadastros publicos.
4. Crie manualmente o usuario administrador em Authentication > Users.
5. Autorize esse usuario no SQL Editor, substituindo o e-mail:

```sql
insert into public.admin_users (user_id)
select id from auth.users where email = 'plbpoliana@gmail.com';
```

6. Preencha a Project URL e a chave publica `anon` em `supabase-config.js`.
7. Nunca coloque a chave `service_role` em arquivos do site.

O formulario salva os contatos em `contact_requests` e envia imagens/PDFs para o bucket privado `contact-attachments`. O painel protegido esta em `admin.html`.

## Instagram Studio

O painel inclui geracao de rascunhos, artes de feed, roteiros de Reels, aprovacao e agendamento. Para ativar:

1. Converta `@sem.ideia.com.br` para conta Profissional no Instagram.
2. Configure um App na Meta e obtenha `INSTAGRAM_USER_ID` e um token de longa duracao com permissao de publicacao.
3. Instale a Supabase CLI e vincule o projeto `aalcwxznodqjskzfddli`.
4. Configure os Secrets sem colocar valores no Git:

```powershell
supabase secrets set OPENAI_API_KEY=... META_ACCESS_TOKEN=... INSTAGRAM_USER_ID=... CRON_SECRET=...
```

5. Publique as funcoes:

```powershell
supabase functions deploy generate-instagram-content
supabase functions deploy publish-instagram --no-verify-jwt
```

6. Execute novamente `supabase-schema.sql` e, para agendamento automatico, configure um segredo forte em `supabase-instagram-cron.sql` e execute o arquivo no SQL Editor.

Reels recebem roteiro e capa automaticamente, mas exigem um MP4 revisado antes da aprovacao. A publicacao final ocorre somente depois da aprovacao administrativa.
