-- =============================================================================
-- Kiểm tra quyền admin / nội dung khóa học trên DB thật, KHÔNG để lại dữ liệu.
-- Chạy: supabase db query --linked -f supabase/checks/admin_smoke.sql
-- Kết quả mong đợi: lỗi "ALL_CHECKS_PASSED" (cố ý raise để ROLLBACK toàn bộ).
-- =============================================================================
do $$
declare
    admin_id   uuid := gen_random_uuid();
    student_id uuid := gen_random_uuid();
    sid        bigint;
    n          int;
    ok         boolean;
begin
    insert into auth.users (id, email) values
        (admin_id,   'smoke-admin-'   || admin_id   || '@example.com'),
        (student_id, 'smoke-student-' || student_id || '@example.com');
    insert into public.admins (user_id) values (admin_id);

    select count(*) into n from storage.buckets
    where id = 'course-materials' and public = false and file_size_limit = 52428800
      and allowed_mime_types = array['application/pdf',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation'];
    if n <> 1 then raise exception 'FAIL: cấu hình bucket course-materials sai'; end if;

    -- ------------------------------------------------------------ anon
    set local role anon;
    begin
        perform 1 from public.course_sessions;
        raise exception 'FAIL: anon đọc được course_sessions';
    exception when insufficient_privilege then null; end;
    reset role;

    -- ------------------------------------------------------------ học viên
    perform set_config('request.jwt.claims',
        json_build_object('sub', student_id, 'role', 'authenticated')::text, true);
    set local role authenticated;

    select count(*) into n from public.course_sessions;
    if n < 1 then raise exception 'FAIL: học viên không đọc được buổi học'; end if;
    if public.is_admin() then raise exception 'FAIL: học viên được coi là admin'; end if;

    begin
        insert into public.admins (user_id) values (student_id);
        raise exception 'FAIL: học viên tự cấp quyền admin';
    exception when insufficient_privilege then null; end;
    begin
        perform 1 from public.admins;
        raise exception 'FAIL: học viên đọc được bảng admins';
    exception when insufficient_privilege then null; end;
    begin
        insert into public.course_sessions (position, slug, title, format)
        values (99, 'smoke-hack', 'x', 'Online');
        raise exception 'FAIL: học viên tạo được buổi học';
    exception when insufficient_privilege then null; end;

    update public.course_sessions set title = 'hacked';
    get diagnostics n = row_count;
    if n <> 0 then raise exception 'FAIL: học viên sửa được buổi học'; end if;
    delete from public.course_sessions;
    get diagnostics n = row_count;
    if n <> 0 then raise exception 'FAIL: học viên xóa được buổi học'; end if;

    begin
        insert into storage.objects (bucket_id, name) values ('course-materials', '1/smoke.pdf');
        raise exception 'FAIL: học viên tải file lên được';
    exception when insufficient_privilege then null; end;
    reset role;

    -- ------------------------------------------------------------ admin
    perform set_config('request.jwt.claims',
        json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
    set local role authenticated;

    if not public.is_admin() then raise exception 'FAIL: admin không được nhận diện'; end if;

    insert into public.course_sessions (position, slug, title, format, youtube_id)
    values (99, 'smoke-session', 'Smoke', 'Online', 'dQw4w9WgXcQ')
    returning id into sid;

    update public.course_sessions set title = 'Smoke 2' where id = sid;
    get diagnostics n = row_count;
    if n <> 1 then raise exception 'FAIL: admin không sửa được buổi học'; end if;

    begin
        update public.course_sessions set youtube_id = 'https://vimeo.com/1' where id = sid;
        raise exception 'FAIL: lưu được video không phải YouTube id';
    exception when check_violation then null; end;

    begin
        insert into public.course_materials (session_id, title, file_path, file_type, size_bytes)
        values (sid, 'x', sid || '/abc.docx', 'pdf', 10);
        raise exception 'FAIL: lưu được tài liệu .docx';
    exception when check_violation then null; end;

    insert into public.course_materials (session_id, title, file_path, file_type, size_bytes)
    values (sid, 'Slide', sid || '/abc-123.pptx', 'pptx', 10);

    insert into storage.objects (bucket_id, name) values ('course-materials', sid || '/smoke.pdf');
    begin
        insert into storage.objects (bucket_id, name) values ('course-materials', sid || '/smoke.exe');
        raise exception 'FAIL: admin tải được file .exe';
    exception when insufficient_privilege then null; end;

    delete from public.course_sessions where id = sid;
    get diagnostics n = row_count;
    if n <> 1 then raise exception 'FAIL: admin không xóa được buổi học'; end if;
    select not exists (select 1 from public.course_materials where session_id = sid) into ok;
    if not ok then raise exception 'FAIL: xóa buổi không xóa tài liệu kèm theo'; end if;
    reset role;

    raise exception 'ALL_CHECKS_PASSED';
end;
$$;
