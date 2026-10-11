-- ThinkingLab schema (Supabase / PostgreSQL)

create extension if not exists citext with schema extensions;  -- email không phân biệt hoa/thường

create table public.users (
    id           uuid primary key default gen_random_uuid(),
    email        extensions.citext not null unique,
    full_name    text,
    is_verified  boolean not null default false,
    created_at   timestamptz not null default now()
);

create table public.conversations (
    id                  uuid primary key default gen_random_uuid(),
    user_id             uuid not null references public.users (id) on delete cascade,
    topic               text,
    status              text not null default 'ACTIVE'
                        check (status in ('ACTIVE', 'ARCHIVED')),
    token_count         integer not null default 0 check (token_count >= 0),
    last_interacted_at  timestamptz not null default now(),
    context_summary     text,
    created_at          timestamptz not null default now()
);

create index conversations_user_id_idx
    on public.conversations (user_id);

-- Partial index phục vụ đúng truy vấn của job dọn rác, chỉ chứa phiên ACTIVE nên rất nhỏ.
create index conversations_active_last_interacted_idx
    on public.conversations (last_interacted_at)
    where status = 'ACTIVE';

create table public.messages (
    id               bigint generated always as identity primary key,
    conversation_id  uuid not null references public.conversations (id) on delete cascade,
    sender_type      text not null check (sender_type in ('USER', 'BOT')),
    content          text not null,
    fallacy_code     text check (fallacy_code in ('HASTY_GENERALIZATION', 'AD_HOMINEM', 'STRAW_MAN')),
    meme_url         text check (meme_url ~ '^https://'),
    created_at       timestamptz not null default now()
);

create index messages_conversation_created_idx
    on public.messages (conversation_id, created_at);

-- Bật RLS: chưa có policy = chặn toàn bộ truy cập từ anon/authenticated key.
-- Job dọn rác chạy server-side bằng service_role key (bỏ qua RLS).
alter table public.users         enable row level security;
alter table public.conversations enable row level security;
alter table public.messages      enable row level security;
