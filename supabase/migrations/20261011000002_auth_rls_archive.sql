-- =============================================================================
-- ThinkingLab - Migration 002: Auth profile, RLS policies, archive RPC
-- Chạy SAU 20261011000001_initial_schema.sql. Script có thể chạy lại nhiều lần (idempotent).
-- Áp dụng bằng: supabase db push (CLI tự bọc migration trong 1 transaction).
-- =============================================================================


-- =============================================================================
-- NHIỆM VỤ 1.1: public.users.id tham chiếu auth.users(id)
-- =============================================================================

-- id giờ do Supabase Auth cấp, không tự sinh nữa.
alter table public.users alter column id drop default;

-- LƯU Ý: nếu public.users đang có dòng mà id không tồn tại trong auth.users,
-- lệnh dưới sẽ báo lỗi và cả migration rollback. Kiểm tra trước bằng:
--   select u.id from public.users u
--   left join auth.users a on a.id = u.id where a.id is null;
alter table public.users drop constraint if exists users_id_fkey;
alter table public.users
    add constraint users_id_fkey
    foreign key (id) references auth.users (id) on delete cascade;

-- auth.users.email có thể NULL (đăng ký bằng số điện thoại / OAuth không trả email).
-- Nếu giữ NOT NULL, trigger bên dưới sẽ lỗi và CHẶN LUÔN việc đăng ký.
-- UNIQUE vẫn giữ nguyên (Postgres cho phép nhiều giá trị NULL trong cột UNIQUE).
alter table public.users alter column email drop not null;


-- =============================================================================
-- NHIỆM VỤ 1.2: Tự tạo profile khi user đăng ký
-- =============================================================================

-- SECURITY DEFINER: trigger chạy trong ngữ cảnh của supabase_auth_admin,
-- role này không có quyền ghi vào public.users -> cần chạy bằng quyền owner.
-- search_path = '' + tên đầy đủ schema: chặn tấn công đổi search_path.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.users (id, email)
    values (new.id, new.email)
    on conflict (id) do nothing;  -- an toàn nếu dòng đã tồn tại
    return new;
end;
$$;

-- Hàm trigger không được phép gọi trực tiếp qua API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- Backfill: tạo profile cho các user đã đăng ký trước khi có trigger.
insert into public.users (id, email)
select id, email from auth.users
on conflict (id) do nothing;


-- =============================================================================
-- NHIỆM VỤ 1.3: RLS cho conversations - chỉ chủ sở hữu được thao tác
-- =============================================================================
-- (select auth.uid()) thay vì auth.uid(): Postgres tính 1 lần cho cả câu query
-- thay vì 1 lần cho mỗi dòng -> nhanh hơn nhiều trên bảng lớn.

alter table public.conversations enable row level security;

drop policy if exists "conversations_select_own" on public.conversations;
create policy "conversations_select_own" on public.conversations
    for select to authenticated
    using (user_id = (select auth.uid()));

drop policy if exists "conversations_insert_own" on public.conversations;
create policy "conversations_insert_own" on public.conversations
    for insert to authenticated
    with check (user_id = (select auth.uid()));

-- USING: chỉ được sửa dòng của mình. WITH CHECK: không được đổi user_id sang người khác.
drop policy if exists "conversations_update_own" on public.conversations;
create policy "conversations_update_own" on public.conversations
    for update to authenticated
    using (user_id = (select auth.uid()))
    with check (user_id = (select auth.uid()));

drop policy if exists "conversations_delete_own" on public.conversations;
create policy "conversations_delete_own" on public.conversations
    for delete to authenticated
    using (user_id = (select auth.uid()));


-- =============================================================================
-- NHIỆM VỤ 1.4: RLS cho messages - chỉ thao tác tin nhắn thuộc phiên của mình
-- =============================================================================
-- EXISTS dùng PK conversations(id) + index conversations_user_id_idx -> rẻ.

alter table public.messages enable row level security;

drop policy if exists "messages_select_own" on public.messages;
create policy "messages_select_own" on public.messages
    for select to authenticated
    using (exists (
        select 1 from public.conversations c
        where c.id = messages.conversation_id
          and c.user_id = (select auth.uid())
    ));

drop policy if exists "messages_insert_own" on public.messages;
create policy "messages_insert_own" on public.messages
    for insert to authenticated
    with check (exists (
        select 1 from public.conversations c
        where c.id = messages.conversation_id
          and c.user_id = (select auth.uid())
    ));

-- WITH CHECK chặn việc "chuyển" tin nhắn sang phiên của người khác.
drop policy if exists "messages_update_own" on public.messages;
create policy "messages_update_own" on public.messages
    for update to authenticated
    using (exists (
        select 1 from public.conversations c
        where c.id = messages.conversation_id
          and c.user_id = (select auth.uid())
    ))
    with check (exists (
        select 1 from public.conversations c
        where c.id = messages.conversation_id
          and c.user_id = (select auth.uid())
    ));

drop policy if exists "messages_delete_own" on public.messages;
create policy "messages_delete_own" on public.messages
    for delete to authenticated
    using (exists (
        select 1 from public.conversations c
        where c.id = messages.conversation_id
          and c.user_id = (select auth.uid())
    ));


-- =============================================================================
-- NHIỆM VỤ 2: RPC archive_conversation - update + delete trong 1 transaction
-- =============================================================================
-- Một lời gọi hàm = một transaction: hoặc archive + xóa tin nhắn cùng thành công,
-- hoặc không có gì thay đổi. Không còn trạng thái "đã ARCHIVED nhưng còn tin nhắn".
--
-- p_cutoff = giá trị last_interacted_at mà job đã đọc được (optimistic lock).
-- Nếu user chat lại trong lúc job chạy, last_interacted_at đổi -> UPDATE không khớp
-- -> FOUND = false -> không xóa gì.

create or replace function public.archive_conversation(
    p_conversation_id uuid,
    p_summary         text,
    p_cutoff          timestamptz
)
returns boolean
language plpgsql
security invoker      -- chạy bằng quyền người gọi (service_role), không leo thang quyền
set search_path = ''
as $$
begin
    update public.conversations
       set context_summary = p_summary,
           status          = 'ARCHIVED'
     where id                 = p_conversation_id
       and status             = 'ACTIVE'
       and last_interacted_at = p_cutoff;

    if not found then
        return false;  -- trạng thái đã đổi / cutoff không khớp: không làm gì
    end if;

    delete from public.messages
     where conversation_id = p_conversation_id;

    return true;
end;
$$;

-- Supabase mặc định cho anon/authenticated gọi mọi function trong schema public
-- qua /rest/v1/rpc. Hàm này chỉ dành cho job server-side -> chỉ service_role.
revoke execute on function public.archive_conversation(uuid, text, timestamptz)
    from public, anon, authenticated;
grant execute on function public.archive_conversation(uuid, text, timestamptz)
    to service_role;

