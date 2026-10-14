-- Bảng đồng bộ trạng thái cooldown của các Gemini API Key giữa các Serverless Instances (Scale-out)
-- Chỉ service_role mới có quyền đọc và cập nhật; anon và authenticated bị thu hồi toàn bộ quyền.

create table if not exists public.gemini_key_health (
    key_hash text primary key,
    status text not null default 'HEALTHY' check (status in ('HEALTHY', 'COOLDOWN_RPM', 'EXHAUSTED_RPD')),
    cooldown_until timestamptz not null,
    updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.gemini_key_health enable row level security;
revoke all on public.gemini_key_health from anon, authenticated;
grant all on public.gemini_key_health to service_role;
