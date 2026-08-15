create table if not exists public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (char_length(email) between 5 and 180),
  phone text not null check (char_length(phone) between 8 and 30),
  address text not null check (char_length(address) between 3 and 250),
  service text not null check (char_length(service) between 2 and 100),
  message text not null check (char_length(message) between 5 and 5000),
  attachments jsonb not null default '[]'::jsonb check (jsonb_typeof(attachments) = 'array'),
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  created_at timestamptz not null default now()
);

alter table public.contact_requests enable row level security;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
revoke all on public.admin_users from anon, authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

insert into public.admin_users (user_id)
select id from auth.users where lower(email) = 'plbpoliana@gmail.com'
on conflict (user_id) do nothing;

drop policy if exists "Visitors can submit contact requests" on public.contact_requests;
create policy "Visitors can submit contact requests"
on public.contact_requests for insert to anon
with check (status = 'new');

drop policy if exists "Authenticated users can read contact requests" on public.contact_requests;
create policy "Authenticated users can read contact requests"
on public.contact_requests for select to authenticated
using (public.is_admin());

drop policy if exists "Authenticated users can update contact requests" on public.contact_requests;
create policy "Authenticated users can update contact requests"
on public.contact_requests for update to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Authenticated users can delete contact requests" on public.contact_requests;
create policy "Authenticated users can delete contact requests"
on public.contact_requests for delete to authenticated
using (public.is_admin());

grant insert on public.contact_requests to anon;
grant select, update, delete on public.contact_requests to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'contact-attachments',
  'contact-attachments',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Visitors can upload contact attachments" on storage.objects;
create policy "Visitors can upload contact attachments"
on storage.objects for insert to anon
with check (bucket_id = 'contact-attachments');

drop policy if exists "Authenticated users can read contact attachments" on storage.objects;
create policy "Authenticated users can read contact attachments"
on storage.objects for select to authenticated
using (bucket_id = 'contact-attachments' and public.is_admin());

drop policy if exists "Authenticated users can delete contact attachments" on storage.objects;
create policy "Authenticated users can delete contact attachments"
on storage.objects for delete to authenticated
using (bucket_id = 'contact-attachments' and public.is_admin());

create table if not exists public.instagram_posts (
  id uuid primary key default gen_random_uuid(),
  format text not null check (format in ('feed', 'reel')),
  topic text not null check (char_length(topic) between 3 and 500),
  tone text not null default 'profissional',
  goal text not null default 'gerar interesse',
  headline text not null,
  caption text not null,
  hashtags text[] not null default '{}',
  reel_script jsonb,
  template text not null default 'impact',
  media_path text,
  cover_path text,
  status text not null default 'draft' check (status in ('draft', 'approved', 'scheduled', 'publishing', 'published', 'failed')),
  scheduled_at timestamptz,
  instagram_media_id text,
  error_message text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.instagram_posts enable row level security;

drop policy if exists "Admins can read Instagram posts" on public.instagram_posts;
create policy "Admins can read Instagram posts"
on public.instagram_posts for select to authenticated
using (public.is_admin());

drop policy if exists "Admins can create Instagram posts" on public.instagram_posts;
create policy "Admins can create Instagram posts"
on public.instagram_posts for insert to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update Instagram posts" on public.instagram_posts;
create policy "Admins can update Instagram posts"
on public.instagram_posts for update to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can delete Instagram posts" on public.instagram_posts;
create policy "Admins can delete Instagram posts"
on public.instagram_posts for delete to authenticated
using (public.is_admin());

grant select, insert, update, delete on public.instagram_posts to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'instagram-content',
  'instagram-content',
  false,
  104857600,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admins can upload Instagram content" on storage.objects;
create policy "Admins can upload Instagram content"
on storage.objects for insert to authenticated
with check (bucket_id = 'instagram-content' and public.is_admin());

drop policy if exists "Admins can read Instagram content" on storage.objects;
create policy "Admins can read Instagram content"
on storage.objects for select to authenticated
using (bucket_id = 'instagram-content' and public.is_admin());

drop policy if exists "Admins can update Instagram content" on storage.objects;
create policy "Admins can update Instagram content"
on storage.objects for update to authenticated
using (bucket_id = 'instagram-content' and public.is_admin())
with check (bucket_id = 'instagram-content' and public.is_admin());

drop policy if exists "Admins can delete Instagram content" on storage.objects;
create policy "Admins can delete Instagram content"
on storage.objects for delete to authenticated
using (bucket_id = 'instagram-content' and public.is_admin());
