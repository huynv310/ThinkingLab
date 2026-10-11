-- =============================================================================
-- ThinkingLab - Migration 003: Vá các rủi ro bảo mật / toàn vẹn dữ liệu
--   R1. Tin nhắn mới tự cập nhật last_interacted_at (optimistic lock của
--       archive_conversation mới đúng) và mở lại phiên đã ARCHIVED.
--   R2. User không được tự sửa token_count / status / context_summary.
--   R3. User không được giả mạo tin nhắn BOT / fallacy_code / meme_url.
--   R4. Bảng users: user chỉ đọc profile của mình, chỉ sửa được full_name.
-- Nguyên tắc: RLS quyết định DÒNG nào được đụng tới, GRANT theo cột quyết định
-- CỘT nào được ghi. Cần cả hai.
-- =============================================================================

-- anon (chưa đăng nhập) không có việc gì với 3 bảng này.
revoke all on public.users, public.conversations, public.messages from anon;


-- =============================================================================
-- R1. Trigger: tin nhắn mới -> chạm last_interacted_at + mở lại phiên
-- =============================================================================
-- SECURITY DEFINER vì authenticated không còn quyền UPDATE cột
-- last_interacted_at/status (xem R2). An toàn: chỉ đụng đúng conversation của
-- tin nhắn vừa insert, mà policy messages_insert_own đã xác nhận là của user.
--
-- Tương tác với archive_conversation():
--   - Tin nhắn đến TRƯỚC archive: last_interacted_at đổi -> archive không khớp
--     -> không xóa gì.
--   - Tin nhắn đến TRONG LÚC archive chạy: UPDATE ở đây chờ khóa dòng của
--     archive; tin nhắn mới chưa commit nên DELETE của archive không thấy nó;
--     sau khi archive commit, phiên được mở lại ACTIVE với tin nhắn mới.
create or replace function public.touch_conversation_on_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    update public.conversations
       set last_interacted_at = now(),
           status             = 'ACTIVE'
     where id = new.conversation_id;
    return new;
end;
$$;

revoke execute on function public.touch_conversation_on_message() from public, anon, authenticated;

drop trigger if exists messages_touch_conversation on public.messages;
create trigger messages_touch_conversation
    after insert on public.messages
    for each row execute function public.touch_conversation_on_message();


-- =============================================================================
-- R2. conversations: chỉ được ghi các cột "của user"
-- =============================================================================
-- token_count, status, context_summary, last_interacted_at, created_at
-- chỉ do server (service_role) hoặc trigger ghi.
revoke insert, update on public.conversations from authenticated;
grant insert (user_id, topic) on public.conversations to authenticated;
grant update (topic)          on public.conversations to authenticated;


-- =============================================================================
-- R3. messages: user chỉ gửi được tin nhắn USER, không tự gắn nhãn
-- =============================================================================
-- fallacy_code / meme_url không nằm trong GRANT -> client không ghi được,
-- chỉ backend (service_role) ghi sau khi phân tích.
revoke insert, update on public.messages from authenticated;
grant insert (conversation_id, sender_type, content) on public.messages to authenticated;
grant update (content)                               on public.messages to authenticated;

drop policy if exists "messages_insert_own" on public.messages;
create policy "messages_insert_own" on public.messages
    for insert to authenticated
    with check (
        sender_type = 'USER'
        and exists (
            select 1 from public.conversations c
            where c.id = messages.conversation_id
              and c.user_id = (select auth.uid())
        )
    );

-- Chỉ được sửa tin nhắn USER của mình, không sửa được câu trả lời của BOT.
drop policy if exists "messages_update_own" on public.messages;
create policy "messages_update_own" on public.messages
    for update to authenticated
    using (
        sender_type = 'USER'
        and exists (
            select 1 from public.conversations c
            where c.id = messages.conversation_id
              and c.user_id = (select auth.uid())
        )
    )
    with check (
        sender_type = 'USER'
        and exists (
            select 1 from public.conversations c
            where c.id = messages.conversation_id
              and c.user_id = (select auth.uid())
        )
    );


-- =============================================================================
-- R4. users: đọc profile của mình, chỉ sửa full_name
-- =============================================================================
-- INSERT do trigger on_auth_user_created; DELETE theo cascade từ auth.users;
-- is_verified/email do hệ thống quản lý.
revoke insert, update, delete on public.users from authenticated;
grant update (full_name) on public.users to authenticated;

drop policy if exists "users_select_own" on public.users;
create policy "users_select_own" on public.users
    for select to authenticated
    using (id = (select auth.uid()));

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own" on public.users
    for update to authenticated
    using (id = (select auth.uid()))
    with check (id = (select auth.uid()));
