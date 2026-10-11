-- Meme do chatbot gửi là file tĩnh của chính web app (/memes/<tên>.svg|png|webp|gif).
-- Vẫn chặn javascript:, data:, http:// và đường dẫn tùy ý (../, ?query...).
alter table public.messages drop constraint if exists messages_meme_url_check;
alter table public.messages
    add constraint messages_meme_url_check
    check (meme_url ~ '^(https://|/memes/[a-z0-9-]+\.(svg|png|webp|gif)$)');
