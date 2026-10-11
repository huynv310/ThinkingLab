-- Hạn mức token theo ngày cho mỗi người + mở rộng mã lỗi lập luận theo nội dung khóa học.
--   token_usage_daily: user chỉ đọc được dòng của mình (để hiển thị); chỉ service_role ghi.
--   record_token_usage: ghi nguyên tử token đã dùng vào ngày + (tùy chọn) cuộc trò chuyện.
--   messages.fallacy_code: 6 ngụy biện (Buổi 4 + khái quát vội) + 3 thiên kiến (Buổi 2).

create table if not exists public.token_usage_daily (
    user_id uuid    not null references auth.users (id) on delete cascade,
    day     date    not null,
    tokens  integer not null default 0 check (tokens >= 0),
    primary key (user_id, day)
);

alter table public.token_usage_daily enable row level security;
revoke all on public.token_usage_daily from anon, authenticated;
grant select on public.token_usage_daily to authenticated;

drop policy if exists token_usage_daily_read_own on public.token_usage_daily;
create policy token_usage_daily_read_own on public.token_usage_daily
    for select to authenticated using (user_id = (select auth.uid()));

-- p_conversation_tokens khác p_tokens khi server đóng cuộc trò chuyện ở lượt chốt
-- (cộng đủ hạn mức cuộc trò chuyện) nhưng hạn mức ngày chỉ tính token thật.
create or replace function public.record_token_usage(
    p_user_id uuid,
    p_day date,
    p_tokens integer,
    p_conversation_id uuid default null,
    p_conversation_tokens integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_daily integer;
    v_conversation integer;
begin
    insert into public.token_usage_daily as t (user_id, day, tokens)
        values (p_user_id, p_day, greatest(coalesce(p_tokens, 0), 0))
    on conflict (user_id, day) do update set tokens = t.tokens + excluded.tokens
    returning t.tokens into v_daily;

    if p_conversation_id is not null then
        update public.conversations
           set token_count = token_count + greatest(coalesce(p_conversation_tokens, p_tokens, 0), 0)
         where id = p_conversation_id and user_id = p_user_id
        returning token_count into v_conversation;
    end if;

    return jsonb_build_object('daily', v_daily, 'conversation', v_conversation);
end;
$$;

revoke execute on function public.record_token_usage(uuid, date, integer, uuid, integer) from public, anon, authenticated;
grant execute on function public.record_token_usage(uuid, date, integer, uuid, integer) to service_role;

-- Thay thế bởi record_token_usage
drop function if exists public.add_conversation_tokens(uuid, integer);

alter table public.messages drop constraint if exists messages_fallacy_code_check;
alter table public.messages add constraint messages_fallacy_code_check check (fallacy_code in (
    'HASTY_GENERALIZATION', 'AD_HOMINEM', 'STRAW_MAN', 'SLIPPERY_SLOPE', 'FALSE_DILEMMA', 'BANDWAGON',
    'CONFIRMATION_BIAS', 'HERD_MENTALITY', 'SUNK_COST'
));
