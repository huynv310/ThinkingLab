-- =============================================================================
-- Kiểm tra bảo mật trên DB thật, KHÔNG để lại dữ liệu.
-- Chạy: supabase db query --linked -f supabase/checks/security_smoke.sql
-- Kết quả mong đợi: lỗi "ALL_CHECKS_PASSED" (cố ý raise để ROLLBACK toàn bộ).
-- Bất kỳ lỗi "FAIL: ..." nào = có lỗ hổng.
-- =============================================================================
do $$
declare
    u1 uuid := gen_random_uuid();
    u2 uuid := gen_random_uuid();
    c1 uuid;
    c2 uuid;
    n  int;
    ts timestamptz;
    ok boolean;
begin
    -- ---------- Chuẩn bị (quyền postgres) ----------
    insert into auth.users (id, email) values
        (u1, 'smoke-u1@thinkinglab.test'),
        (u2, 'smoke-u2@thinkinglab.test');

    select count(*) into n from public.users where id in (u1, u2);
    if n <> 2 then raise exception 'FAIL: trigger on_auth_user_created không tạo profile'; end if;

    insert into public.conversations (user_id, topic, last_interacted_at)
        values (u1, 'u1 topic', now() - interval '10 days') returning id into c1;
    insert into public.conversations (user_id, topic)
        values (u2, 'u2 topic') returning id into c2;
    insert into public.messages (conversation_id, sender_type, content, fallacy_code)
        values (c2, 'BOT', 'bot reply', 'AD_HOMINEM');

    -- ---------- Đóng vai user u1 ----------
    perform set_config('request.jwt.claims',
        json_build_object('sub', u1, 'role', 'authenticated')::text, true);
    set local role authenticated;

    -- RLS: chỉ thấy dữ liệu của mình
    select count(*) into n from public.conversations;
    if n <> 1 then raise exception 'FAIL: u1 thấy % conversations', n; end if;
    select count(*) into n from public.users;
    if n <> 1 then raise exception 'FAIL: u1 thấy % users', n; end if;
    select count(*) into n from public.messages;
    if n <> 0 then raise exception 'FAIL: u1 đọc được tin nhắn của u2'; end if;

    -- R2: không tự sửa cột hệ thống
    begin
        update public.conversations set token_count = 0 where id = c1;
        raise exception 'FAIL: u1 sửa được token_count';
    exception when insufficient_privilege then null; end;
    begin
        update public.conversations set status = 'ARCHIVED' where id = c1;
        raise exception 'FAIL: u1 sửa được status';
    exception when insufficient_privilege then null; end;
    begin
        insert into public.conversations (user_id, topic, token_count) values (u1, 'x', 999);
        raise exception 'FAIL: u1 insert được token_count';
    exception when insufficient_privilege then null; end;
    begin
        insert into public.conversations (user_id, topic) values (u2, 'giả danh u2');
        raise exception 'FAIL: u1 tạo được conversation cho u2';
    exception when insufficient_privilege then null; end;

    update public.conversations set topic = 'đổi tên' where id = c1;
    get diagnostics n = row_count;
    if n <> 1 then raise exception 'FAIL: u1 không đổi được topic của mình'; end if;
    update public.conversations set topic = 'hack' where id = c2;
    get diagnostics n = row_count;
    if n <> 0 then raise exception 'FAIL: u1 đổi được topic của u2'; end if;

    -- R3: không giả mạo tin nhắn BOT / nhãn
    begin
        insert into public.messages (conversation_id, sender_type, content) values (c1, 'BOT', 'giả bot');
        raise exception 'FAIL: u1 insert được tin nhắn BOT';
    exception when insufficient_privilege then null; end;
    begin
        insert into public.messages (conversation_id, sender_type, content, fallacy_code)
            values (c1, 'USER', 'x', 'STRAW_MAN');
        raise exception 'FAIL: u1 tự gắn được fallacy_code';
    exception when insufficient_privilege then null; end;
    begin
        insert into public.messages (conversation_id, sender_type, content) values (c2, 'USER', 'chen vao');
        raise exception 'FAIL: u1 chèn được tin nhắn vào phiên của u2';
    exception when insufficient_privilege then null; end;

    -- R1: tin nhắn hợp lệ -> last_interacted_at được chạm
    insert into public.messages (conversation_id, sender_type, content) values (c1, 'USER', 'xin chào');
    select last_interacted_at into ts from public.conversations where id = c1;
    if ts <> now() then raise exception 'FAIL: trigger không cập nhật last_interacted_at'; end if;

    -- R4: users chỉ sửa full_name
    begin
        update public.users set is_verified = true where id = u1;
        raise exception 'FAIL: u1 tự xác minh được tài khoản';
    exception when insufficient_privilege then null; end;
    update public.users set full_name = 'U Một' where id = u1;
    get diagnostics n = row_count;
    if n <> 1 then raise exception 'FAIL: u1 không sửa được full_name'; end if;

    -- RPC archive chỉ dành cho server
    begin
        perform public.archive_conversation(c1, 'x', now());
        raise exception 'FAIL: authenticated gọi được archive_conversation';
    exception when insufficient_privilege then null; end;

    reset role;

    -- ---------- anon không đụng được bảng nào ----------
    set local role anon;
    begin
        perform 1 from public.conversations;
        raise exception 'FAIL: anon đọc được conversations';
    exception when insufficient_privilege then null; end;
    reset role;

    -- ---------- archive_conversation (quyền server) ----------
    select public.archive_conversation(c1, 'tóm tắt', now() - interval '1 day') into ok;
    if ok then raise exception 'FAIL: archive chạy dù cutoff không khớp'; end if;

    select last_interacted_at into ts from public.conversations where id = c1;
    select public.archive_conversation(c1, 'tóm tắt', ts) into ok;
    if not ok then raise exception 'FAIL: archive không chạy dù cutoff khớp'; end if;
    select count(*) into n from public.messages where conversation_id = c1;
    if n <> 0 then raise exception 'FAIL: archive không xóa tin nhắn'; end if;

    -- R1: tin nhắn mới vào phiên ARCHIVED -> mở lại ACTIVE
    insert into public.messages (conversation_id, sender_type, content) values (c1, 'USER', 'quay lại');
    if (select status from public.conversations where id = c1) <> 'ACTIVE' then
        raise exception 'FAIL: phiên ARCHIVED không được mở lại khi có tin nhắn mới';
    end if;

    raise exception 'ALL_CHECKS_PASSED';
end;
$$;
