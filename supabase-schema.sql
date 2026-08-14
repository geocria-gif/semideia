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

drop policy if exists "Visitors can submit contact requests" on public.contact_requests;
create policy "Visitors can submit contact requests"
on public.contact_requests for insert to anon
with check (status = 'new');

drop policy if exists "Authenticated users can read contact requests" on public.contact_requests;
create policy "Authenticated users can read contact requests"
on public.contact_requests for select to authenticated
using (true);

drop policy if exists "Authenticated users can update contact requests" on public.contact_requests;
create policy "Authenticated users can update contact requests"
on public.contact_requests for update to authenticated
using (true) with check (true);

drop policy if exists "Authenticated users can delete contact requests" on public.contact_requests;
create policy "Authenticated users can delete contact requests"
on public.contact_requests for delete to authenticated
using (true);

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
using (bucket_id = 'contact-attachments');

drop policy if exists "Authenticated users can delete contact attachments" on storage.objects;
create policy "Authenticated users can delete contact attachments"
on storage.objects for delete to authenticated
using (bucket_id = 'contact-attachments');
