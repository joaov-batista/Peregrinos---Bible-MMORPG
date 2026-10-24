-- PEREGRINOS — banco de dados (Supabase / Postgres)
-- Rode este arquivo inteiro em: Supabase > SQL Editor > New query > Run.

create extension if not exists pgcrypto;

create table if not exists public.characters (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null check (char_length(name) between 3 and 16),
  class       text not null check (class in ('guerreiro','pastor','profeta','levita')),
  look        jsonb not null default '{}',
  data        jsonb not null default '{}',   -- inventário, equipamentos, progresso das fases, missões
  level       int  not null default 1,
  score       int  not null default 0,
  week_id     text,
  week_score  int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index if not exists characters_name_unique on public.characters (lower(name));
create index if not exists characters_score_idx on public.characters (score desc);
create index if not exists characters_week_idx on public.characters (week_id, week_score desc);

-- No máximo 3 personagens por conta
create or replace function public.limit_characters() returns trigger language plpgsql as $$
begin
  if (select count(*) from public.characters where user_id = new.user_id) >= 3 then
    raise exception 'Limite de 3 personagens por conta';
  end if;
  return new;
end $$;
drop trigger if exists characters_limit on public.characters;
create trigger characters_limit before insert on public.characters for each row execute function public.limit_characters();

-- Proteção básica contra trapaça: pontuação nunca diminui (exceto o reset semanal)
-- e não pode subir mais que 20.000 pontos num único salvamento.
create or replace function public.check_score() returns trigger language plpgsql as $$
begin
  -- a classe pode mudar (troca de classe com Samuel)
  if new.user_id <> old.user_id or new.name <> old.name then
    raise exception 'Campos imutáveis';
  end if;
  if new.score < old.score or new.score - old.score > 20000 then
    raise exception 'Pontuação inválida';
  end if;
  if new.level < old.level or new.level > 99 then
    raise exception 'Nível inválido';
  end if;
  return new;
end $$;
drop trigger if exists characters_check on public.characters;
create trigger characters_check before update on public.characters for each row execute function public.check_score();

-- Segurança por linha: cada jogador só mexe nos próprios personagens
alter table public.characters enable row level security;
drop policy if exists "ler os meus" on public.characters;
drop policy if exists "criar os meus" on public.characters;
drop policy if exists "editar os meus" on public.characters;
drop policy if exists "apagar os meus" on public.characters;
create policy "ler os meus"    on public.characters for select using (auth.uid() = user_id);
create policy "criar os meus"  on public.characters for insert with check (auth.uid() = user_id);
create policy "editar os meus" on public.characters for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "apagar os meus" on public.characters for delete using (auth.uid() = user_id);

-- Ranking público: só nome, classe, nível e pontos (nada do inventário nem do e-mail)
create or replace view public.ranking as
  select name, class, level, score, week_id, week_score, look from public.characters;
grant select on public.ranking to anon, authenticated;

-- ============================================================
-- AMIZADES E CLÃS (rode de novo este arquivo inteiro para criar)
-- ============================================================

-- Lista pública de jogadores para procurar amigos (sem e-mail nem inventário)
create or replace view public.players as
  select id, name, class, level, score, look from public.characters;
grant select on public.players to anon, authenticated;

-- O personagem é meu?
create or replace function public.my_char(cid uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.characters where id = cid and user_id = auth.uid());
$$;

create table if not exists public.friendships (
  id         uuid primary key default gen_random_uuid(),
  requester  uuid not null references public.characters(id) on delete cascade,
  addressee  uuid not null references public.characters(id) on delete cascade,
  status     text not null default 'pendente' check (status in ('pendente','aceito')),
  created_at timestamptz not null default now(),
  check (requester <> addressee)
);
create unique index if not exists friendships_pair on public.friendships (least(requester, addressee), greatest(requester, addressee));

alter table public.friendships enable row level security;
drop policy if exists "ver minhas amizades" on public.friendships;
drop policy if exists "pedir amizade" on public.friendships;
drop policy if exists "aceitar amizade" on public.friendships;
drop policy if exists "desfazer amizade" on public.friendships;
create policy "ver minhas amizades" on public.friendships for select using (public.my_char(requester) or public.my_char(addressee));
create policy "pedir amizade"       on public.friendships for insert with check (public.my_char(requester) and status = 'pendente');
create policy "aceitar amizade"     on public.friendships for update using (public.my_char(addressee)) with check (public.my_char(addressee));
create policy "desfazer amizade"    on public.friendships for delete using (public.my_char(requester) or public.my_char(addressee));

create table if not exists public.clans (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 3 and 20),
  tag        text not null check (tag ~ '^[A-Z0-9]{2,4}$'),
  lema       text not null default '' check (char_length(lema) <= 80),
  owner      uuid not null references public.characters(id) on delete cascade,
  created_at timestamptz not null default now()
);
create unique index if not exists clans_name_unique on public.clans (lower(name));
create unique index if not exists clans_tag_unique on public.clans (tag);

create table if not exists public.clan_members (
  char_id   uuid primary key references public.characters(id) on delete cascade, -- um clã por personagem
  clan_id   uuid not null references public.clans(id) on delete cascade,
  role      text not null default 'membro' check (role in ('lider','membro')),
  joined_at timestamptz not null default now()
);
create index if not exists clan_members_clan on public.clan_members (clan_id);

-- No máximo 30 membros por clã
create or replace function public.limit_clan() returns trigger language plpgsql as $$
begin
  if (select count(*) from public.clan_members where clan_id = new.clan_id) >= 30 then
    raise exception 'Este clã está cheio (30 membros)';
  end if;
  return new;
end $$;
drop trigger if exists clan_limit on public.clan_members;
create trigger clan_limit before insert on public.clan_members for each row execute function public.limit_clan();

create or replace function public.clan_leader(cid uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.clans c where c.id = cid and public.my_char(c.owner));
$$;

alter table public.clans enable row level security;
alter table public.clan_members enable row level security;
drop policy if exists "ver clãs" on public.clans;
drop policy if exists "criar clã" on public.clans;
drop policy if exists "editar clã" on public.clans;
drop policy if exists "apagar clã" on public.clans;
create policy "ver clãs"   on public.clans for select using (true);
create policy "criar clã"  on public.clans for insert with check (public.my_char(owner));
create policy "editar clã" on public.clans for update using (public.my_char(owner)) with check (public.my_char(owner));
create policy "apagar clã" on public.clans for delete using (public.my_char(owner));
drop policy if exists "ver membros" on public.clan_members;
drop policy if exists "entrar no clã" on public.clan_members;
drop policy if exists "sair do clã" on public.clan_members;
create policy "ver membros"   on public.clan_members for select using (true);
create policy "entrar no clã" on public.clan_members for insert with check (public.my_char(char_id) and (role = 'membro' or public.clan_leader(clan_id)));
create policy "sair do clã"   on public.clan_members for delete using (public.my_char(char_id) or public.clan_leader(clan_id));

-- Ranking dos clãs: soma dos pontos dos membros
create or replace view public.clan_ranking as
  select c.id, c.name, c.tag, c.lema, count(m.char_id)::int as membros, coalesce(sum(ch.score), 0)::int as score, coalesce(sum(ch.week_score) filter (where ch.week_id = (select max(week_id) from public.characters)), 0)::int as week_score
  from public.clans c left join public.clan_members m on m.clan_id = c.id left join public.characters ch on ch.id = m.char_id
  group by c.id;
grant select on public.clan_ranking to anon, authenticated;
