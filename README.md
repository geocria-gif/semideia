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
