-- Chủ đề tự đặt + ngân sách token mỗi cuộc trò chuyện.
--   custom_topic: chỉ server (service_role) ghi, SAU khi đã làm sạch + AI duyệt.
--     Không cấp quyền insert/update cột này cho authenticated -> client không thể
--     tự nhét nội dung vào prompt.
--   add_conversation_tokens: cộng dồn token Gemini thực tế (nguyên tử, không race),
--     chỉ service_role gọi được.

alter table public.conversations
  add column if not exists custom_topic text
  check (custom_topic is null or char_length(custom_topic) between 5 and 120);

create or replace function public.add_conversation_tokens(p_conversation_id uuid, p_tokens integer)
returns integer
language sql
security definer
set search_path = ''
as $$
  update public.conversations
     set token_count = token_count + greatest(coalesce(p_tokens, 0), 0)
   where id = p_conversation_id
  returning token_count;
$$;

revoke execute on function public.add_conversation_tokens(uuid, integer) from public, anon, authenticated;
grant execute on function public.add_conversation_tokens(uuid, integer) to service_role;
