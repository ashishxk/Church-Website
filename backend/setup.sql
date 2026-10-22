-- DCYM Bokaro: run once in Supabase (SQL Editor > New query > paste > Run).

create table if not exists public.site_content (
  id int primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.site_content enable row level security;
drop policy if exists "public can read content" on public.site_content;
drop policy if exists "staff can add content" on public.site_content;
drop policy if exists "staff can edit content" on public.site_content;
create policy "public can read content" on public.site_content for select using (true);
create policy "staff can add content" on public.site_content for insert to authenticated with check (true);
create policy "staff can edit content" on public.site_content for update to authenticated using (true) with check (true);

-- Messages sent from the website contact form (anyone may send; only staff may read).
create table if not exists public.messages (
  id bigint generated always as identity primary key,
  name text not null,
  email text not null,
  subject text,
  message text not null,
  created_at timestamptz not null default now()
);
alter table public.messages enable row level security;
drop policy if exists "anyone can send a message" on public.messages;
drop policy if exists "staff can read messages" on public.messages;
drop policy if exists "staff can delete messages" on public.messages;
create policy "anyone can send a message" on public.messages for insert to anon, authenticated
  with check (char_length(name) between 1 and 120 and char_length(email) between 3 and 200 and char_length(message) between 1 and 4000);
create policy "staff can read messages" on public.messages for select to authenticated using (true);
create policy "staff can delete messages" on public.messages for delete to authenticated using (true);

-- Public storage bucket for photos.
insert into storage.buckets (id, name, public) values ('church-media', 'church-media', true) on conflict (id) do nothing;
drop policy if exists "public can view photos" on storage.objects;
drop policy if exists "staff can upload photos" on storage.objects;
drop policy if exists "staff can delete photos" on storage.objects;
create policy "public can view photos" on storage.objects for select using (bucket_id = 'church-media');
create policy "staff can upload photos" on storage.objects for insert to authenticated with check (bucket_id = 'church-media');
create policy "staff can delete photos" on storage.objects for delete to authenticated using (bucket_id = 'church-media');
