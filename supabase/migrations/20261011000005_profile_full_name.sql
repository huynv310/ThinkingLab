-- Form đăng ký trên web gửi họ tên qua options.data -> auth.users.raw_user_meta_data.
-- Trigger chép sang public.users.full_name. Metadata do client tự khai nên
-- chỉ lấy dạng text, cắt khoảng trắng và giới hạn 100 ký tự.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.users (id, email, full_name)
    values (
        new.id,
        new.email,
        nullif(left(btrim(new.raw_user_meta_data ->> 'full_name'), 100), '')
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
