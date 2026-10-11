-- =============================================================================
-- ThinkingLab - Migration 006: Tài khoản admin + nội dung khóa học quản trị được
-- - Quyền admin CHỈ cấp được bằng service_role (script grant_admin.py), client
--   không có cách nào tự nâng quyền.
-- - Video buổi học: chỉ lưu YouTube video id (11 ký tự) -> chỉ nhúng được YouTube.
-- - Tài liệu: bucket riêng, chỉ nhận PDF / PPTX, tối đa 50 MB.
-- =============================================================================


-- ---------------------------------------------------------------- admins
create table if not exists public.admins (
    user_id    uuid primary key references auth.users (id) on delete cascade,
    granted_at timestamptz not null default now()
);

-- RLS bật + KHÔNG có policy nào: anon/authenticated không đọc/ghi được.
-- Chỉ service_role (bỏ qua RLS) mới thêm/xóa admin.
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;

-- SECURITY DEFINER để đọc được bảng admins dù client không có quyền.
-- Thu hồi quyền admin có hiệu lực ngay (không phụ thuộc JWT cũ).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;


-- ---------------------------------------------------------------- updated_at
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

revoke execute on function public.touch_updated_at() from public, anon, authenticated;


-- ---------------------------------------------------------------- course_sessions
create table if not exists public.course_sessions (
    id         bigint generated always as identity primary key,
    position   integer not null check (position between 1 and 999),
    slug       text not null unique
               check (char_length(slug) <= 60 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    title      text not null check (char_length(btrim(title)) between 1 and 200),
    format     text not null check (format in ('Trực tiếp', 'Online', 'Dự phòng')),
    duration   text not null default '60 phút' check (char_length(duration) <= 40),
    goals      jsonb not null default '[]' check (jsonb_typeof(goals) = 'array'),
    parts      jsonb not null default '[]' check (jsonb_typeof(parts) = 'array'),
    -- Chỉ YouTube: lưu đúng video id, không lưu URL tùy ý
    youtube_id text check (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
    updated_at timestamptz not null default now()
);

create index if not exists course_sessions_position_idx on public.course_sessions (position, id);

drop trigger if exists course_sessions_touch on public.course_sessions;
create trigger course_sessions_touch
    before update on public.course_sessions
    for each row execute function public.touch_updated_at();


-- ---------------------------------------------------------------- course_materials
create table if not exists public.course_materials (
    id         bigint generated always as identity primary key,
    session_id bigint not null references public.course_sessions (id) on delete cascade,
    title      text not null check (char_length(btrim(title)) between 1 and 200),
    -- Đường dẫn trong bucket: <session_id>/<uuid>.<pdf|pptx>
    file_path  text not null unique check (file_path ~ '^[0-9]+/[A-Za-z0-9-]+\.(pdf|pptx)$'),
    file_type  text not null check (file_type in ('pdf', 'pptx')),
    size_bytes bigint not null check (size_bytes between 1 and 52428800),
    created_at timestamptz not null default now()
);

create index if not exists course_materials_session_idx on public.course_materials (session_id);


-- ---------------------------------------------------------------- RLS + GRANT
alter table public.course_sessions  enable row level security;
alter table public.course_materials enable row level security;

revoke all on public.course_sessions, public.course_materials from anon;
revoke insert, update, delete on public.course_sessions, public.course_materials from authenticated;
grant select on public.course_sessions, public.course_materials to authenticated;

-- Cột hệ thống (id, updated_at, created_at) không nằm trong GRANT -> client không ghi được.
grant insert (position, slug, title, format, duration, goals, parts, youtube_id),
      update (position, slug, title, format, duration, goals, parts, youtube_id),
      delete
    on public.course_sessions to authenticated;
-- Tài liệu không sửa: muốn thay file thì xóa rồi tải lên lại.
grant insert (session_id, title, file_path, file_type, size_bytes), delete
    on public.course_materials to authenticated;

drop policy if exists "course_sessions_read" on public.course_sessions;
create policy "course_sessions_read" on public.course_sessions
    for select to authenticated using (true);

drop policy if exists "course_sessions_admin_insert" on public.course_sessions;
create policy "course_sessions_admin_insert" on public.course_sessions
    for insert to authenticated with check ((select public.is_admin()));

drop policy if exists "course_sessions_admin_update" on public.course_sessions;
create policy "course_sessions_admin_update" on public.course_sessions
    for update to authenticated
    using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "course_sessions_admin_delete" on public.course_sessions;
create policy "course_sessions_admin_delete" on public.course_sessions
    for delete to authenticated using ((select public.is_admin()));

drop policy if exists "course_materials_read" on public.course_materials;
create policy "course_materials_read" on public.course_materials
    for select to authenticated using (true);

drop policy if exists "course_materials_admin_insert" on public.course_materials;
create policy "course_materials_admin_insert" on public.course_materials
    for insert to authenticated with check ((select public.is_admin()));

drop policy if exists "course_materials_admin_delete" on public.course_materials;
create policy "course_materials_admin_delete" on public.course_materials
    for delete to authenticated using ((select public.is_admin()));


-- ---------------------------------------------------------------- Storage
-- Bucket private: học viên tải qua signed URL. Storage tự từ chối file
-- sai MIME type hoặc quá 50 MB, kể cả khi client cố gửi.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'course-materials', 'course-materials', false, 52428800,
    array[
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ]
)
on conflict (id) do update
    set public             = excluded.public,
        file_size_limit    = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "course_files_read" on storage.objects;
create policy "course_files_read" on storage.objects
    for select to authenticated
    using (bucket_id = 'course-materials');

drop policy if exists "course_files_admin_insert" on storage.objects;
create policy "course_files_admin_insert" on storage.objects
    for insert to authenticated
    with check (
        bucket_id = 'course-materials'
        and (select public.is_admin())
        and lower(storage.extension(name)) in ('pdf', 'pptx')
    );

drop policy if exists "course_files_admin_delete" on storage.objects;
create policy "course_files_admin_delete" on storage.objects
    for delete to authenticated
    using (bucket_id = 'course-materials' and (select public.is_admin()));


-- ---------------------------------------------------------------- Dữ liệu ban đầu
-- 7 buổi học từ "Đề xuất dự án ThinkingLab". Chỉ chèn khi bảng còn trống
-- để chạy lại migration không ghi đè nội dung admin đã sửa.
insert into public.course_sessions (position, slug, title, format, duration, goals, parts)
select * from (values
    (1, $q$buoi-1$q$, $q$Đánh giá năng lực đầu vào & Giải mã bản chất phản biện$q$, $q$Trực tiếp$q$, $q$60 phút$q$,
     $q$["Thấu hiểu bản chất phản biện; phân biệt Sự thật và Quan điểm.","Bài đánh giá năng lực đầu vào được gửi làm online trước 24h."]$q$::jsonb,
     $q$[{"title":"Phần 1: Đánh giá năng lực đầu vào","points":["Thực hiện qua Google Form, gồm 10 câu hỏi tình huống.","Câu 1–3: phân biệt Sự thật khách quan và Ý kiến chủ quan.","Câu 4–6: phản xạ kiểm chứng nguồn tin trước thông tin giật gân, lời đồn học đường.","Câu 7–8: nhận diện các bẫy ngụy biện sơ cấp trong thảo luận nhóm.","Câu 9–10: thái độ và phản ứng tâm lý khi bị người khác phản biện.","Mục đích: thiết lập mốc dữ liệu gốc để đo mức độ tiến bộ sau khóa học."]},{"title":"Phần 2: Phản biện khoa học hay Bắt bẻ cá nhân?","points":["Tư duy phản biện không phải là \"thích cãi\", \"bới lông tìm vết\" hay luôn nói ngược số đông.","Là quá trình tư duy có ý thức, dùng logic và bằng chứng để đánh giá thông tin, nhận ra giả định ngầm và đưa ra kết luận công bằng.","Fact (Sự thật): chứng minh được bằng dữ liệu, số liệu, tài liệu khoa học; khách quan.","Opinion (Ý kiến): cảm xúc, niềm tin, giá trị cá nhân; chủ quan, thay đổi theo góc nhìn.","Tách rời Ý tưởng khỏi Con người: tấn công vào luận điểm, bảo vệ con người.","Công thức phản hồi SBI: Bối cảnh → Hành vi cụ thể → Tác động tới nhóm → Đề xuất giải pháp."]}]$q$::jsonb),
    (2, $q$buoi-2$q$, $q$Thiên kiến nhận thức, truy vấn Socrates & mô hình 5 Whys$q$, $q$Online$q$, $q$60 phút$q$,
     $q$["Nhận diện và tự phát hiện 3 bẫy thiên kiến nhận thức phổ biến nhất.","Làm chủ kỹ thuật đặt câu hỏi Socrates và 5 Whys để tìm nguyên nhân cốt lõi."]$q$::jsonb,
     $q$[{"title":"Phần 1: Giải mã thiên kiến nhận thức","points":["Thiên kiến là các lối tắt tư duy não bộ tự dùng, dẫn đến nhận định sai mà người mắc không nhận ra.","Thiên kiến xác nhận: chỉ tin dữ liệu ủng hộ quan điểm ban đầu (ví dụ chỉ đọc bài khen ngôn ngữ lập trình mình đang học).","Tâm lý bầy đàn: đồng thuận với số đông vì sợ bị cô lập hoặc lười kiểm chứng.","Ảo giác chi phí chìm: bám lấy hướng làm đồ án không hiệu quả chỉ vì \"đã lỡ thức 3 đêm\"."]},{"title":"Phần 2: Truy vấn Socrates & 5 Whys","points":["Hỏi làm rõ khái niệm: \"Chính xác thì từ [X] trong câu này có nghĩa là gì?\"","Hỏi kiểm tra giả định ngầm: \"Bạn đang mặc định điều gì là hiển nhiên đúng ở đây?\"","Hỏi tìm kiếm bằng chứng: \"Cơ sở thực tế hoặc số liệu nào chứng minh cho nhận định này?\"","Hỏi phân tích hệ quả: \"Nếu làm theo phương án của bạn thì điều tồi tệ nhất có thể xảy ra là gì?\"","5 Whys: liên tục hỏi \"Tại sao\" để lần theo chuỗi nhân quả tới điểm nghẽn thực sự."]}]$q$::jsonb),
    (3, $q$buoi-3$q$, $q$Mô hình ARE & cấu trúc PREP trong diễn đạt$q$, $q$Online$q$, $q$60 phút$q$,
     $q$["Chấm dứt thói quen phát biểu cảm tính; nắm vững cấu trúc lập luận ARE.","Dùng PREP để trình bày quan điểm gãy gọn trong 60–90 giây."]$q$::jsonb,
     $q$[{"title":"Phần 1: Mô hình ARE (Tam giác logic học thuật)","points":["A – Assertion: tuyên bố rõ ràng, trực diện. Quan điểm của bạn là gì?","R – Reasoning: chuỗi suy luận giải thích vì sao luận điểm đúng. Tại sao và như thế nào?","E – Evidence: cứ liệu khách quan củng cố lý lẽ. Đâu là bằng chứng?","Bằng chứng mạnh: số liệu thống kê uy tín, kết quả nghiên cứu, điều khoản luật, ví dụ kiểm chứng được — loại bỏ lời đồn."]},{"title":"Phần 2: Cấu trúc PREP","points":["P – Point: trả lời trực tiếp ngay ở giây đầu tiên.","R – Reason: 1–2 lý do cốt lõi.","E – Example/Evidence: một câu chuyện thực tế hoặc con số cụ thể.","P – Point: tóm lược ý chính và kêu gọi hành động."]}]$q$::jsonb),
    (4, $q$buoi-4$q$, $q$Nhận diện & hóa giải 5 bẫy ngụy biện logic kinh điển$q$, $q$Online$q$, $q$60 phút$q$,
     $q$["Bóc tách cơ chế 5 loại ngụy biện thường gặp trong đời sống sinh viên và mạng xã hội.","Phát hiện và phản bác ngụy biện lịch sự, đưa thảo luận về đúng bản chất."]$q$::jsonb,
     $q$[{"title":"Phần 1: Bản chất của ngụy biện","points":["Lập luận có vẻ thuyết phục nhưng sai về suy luận, dùng để đánh lừa tâm lý hoặc đánh lạc hướng.","Học ngụy biện để không bị dắt mũi, tuyệt đối không dùng nó làm vũ khí thao túng."]},{"title":"Phần 2: 5 bẫy ngụy biện và cách hóa giải","points":["Ad Hominem (Công kích cá nhân) → \"Hãy tạm gác chuyện cá nhân, chúng ta đang bàn về tính chính xác của số liệu.\"","Straw Man (Bù nhìn rơm) → \"Đó không phải điều tôi vừa nói. Quan điểm chính xác của tôi là...\"","Slippery Slope (Dốc trượt) → \"Đâu là cơ sở chứng minh A chắc chắn dẫn đến D?\"","False Dilemma (Lưỡng nan giả) → \"Vấn đề không chỉ có trắng và đen, còn lựa chọn C và D...\"","Bandwagon (Ngụy biện đám đông) → \"Nhiều người tin không làm điều đó tự động thành sự thật.\""]}]$q$::jsonb),
    (5, $q$buoi-5$q$, $q$Kỹ thuật "Đọc ngang" & tiêu chuẩn CRAAP Test$q$, $q$Online$q$, $q$60 phút$q$,
     $q$["Nắm vững kỹ thuật \"Đọc ngang\" của Đại học Stanford để kiểm chứng chéo thông tin.","Dùng bộ 5 tiêu chuẩn CRAAP để đánh giá tài liệu và phát hiện ảo giác khi dùng AI."]$q$::jsonb,
     $q$[{"title":"Phần 1: Đọc ngang (Lateral Reading)","points":["\"Đọc dọc\" chỉ lướt một trang từ trên xuống, dễ bị lừa bởi giao diện đẹp, logo chuyên nghiệp.","Gặp thông tin lạ, mở tab mới tra cứu: Tác giả là ai? Ai tài trợ trang web? Chuyên gia độc lập nói gì?","Không tin vào lời tự giới thiệu của chính trang web đó."]},{"title":"Phần 2: CRAAP Test","points":["Currency – Tính cập nhật: công bố khi nào, có bản mới hơn, link trích dẫn còn hoạt động?","Relevance – Tính phù hợp: có đúng câu hỏi nghiên cứu, hướng tới ai?","Authority – Thẩm quyền: tác giả có chuyên môn? Đơn vị xuất bản uy tín hay blog nặc danh?","Accuracy – Độ chính xác: có số liệu, bình duyệt, nguồn khác xác nhận?","Purpose – Mục đích: cung cấp thông tin hay bán hàng, định hướng dư luận?","Kiểm tra chéo AI: ép AI trích nguồn thật và phát hiện bài báo \"ảo giác\"."]}]$q$::jsonb),
    (6, $q$buoi-6$q$, $q$Thực chiến phản biện văn minh & vinh danh cuối khóa$q$, $q$Trực tiếp$q$, $q$60 phút$q$,
     $q$["Tổng hợp ARE, Socrates, CRAAP, nhận diện ngụy biện vào một phiên phản biện thực tế.","Hoàn thành Final-test để đo lường độ tăng trưởng năng lực.","Vinh danh và cấp chứng chỉ số cho học viên hoàn thành khóa học."]$q$::jsonb,
     $q$[{"title":"Phần 1: Thực chiến phản biện văn minh","points":["Bàn tròn: sinh viên \"bóc phốt\" công khai danh tính người khác khi bị đối xử bất công — dũng cảm bảo vệ cộng đồng hay bạo lực mạng?","Chia 2 nhóm cho 2 góc nhìn; mỗi lượt 90 giây theo cấu trúc PREP.","Phản bác phải chỉ ra điểm thiếu căn cứ hoặc ngụy biện, không công kích cá nhân."]},{"title":"Phần 2: Đánh giá đầu ra","points":["Final-test 10 câu tình huống trên Google Form, tương đương Pre-test.","Khảo sát mức độ tự tin và cảm nhận về khóa học."]},{"title":"Phần 3: Vinh danh & bế mạc","points":["Công bố biểu đồ tiến bộ trước – sau của cả khóa.","Vinh danh 3 học viên tích cực nhất.","Cấp chứng chỉ cho học viên đạt bài đánh giá cuối khóa."]}]$q$::jsonb),
    (7, $q$buoi-7$q$, $q$Buổi dự phòng$q$, $q$Dự phòng$q$, $q$60 phút$q$,
     $q$["Kích hoạt khi một buổi chính bị gián đoạn vì lý do kỹ thuật hoặc lịch thi đột xuất của trường."]$q$::jsonb,
     $q$[]$q$::jsonb)

) as seed (position, slug, title, format, duration, goals, parts)
where not exists (select 1 from public.course_sessions);
