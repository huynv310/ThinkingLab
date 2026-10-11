import { AlertTriangle, Archive, ArrowLeft, Loader2, PenLine, Plus, SendHorizonal, Sparkles, X } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import logo from '../../assets/logo.webp'
import { QuotaRings } from '../../components/QuotaRings'
import { CUSTOM_TOPIC_ID, FALLACY_LABELS, TOPICS, topicTitle } from '../../data/topics'
import {
  ChatApiError,
  CUSTOM_TOPIC_MAX,
  DAILY_TOKEN_LIMIT,
  getDailyUsage,
  listConversations,
  listMessages,
  sendReply,
  startChat,
  TOKEN_LIMIT,
  type ChatMessage,
  type Conversation,
} from '../../lib/api'

const MAX_CHARS = 2000 // khớp MAX_CONTENT_CHARS ở api/chat.py
const MIN_TYPING_MS = 700 // để "đang soạn tin" kịp hiện, cảm giác như bạn bè đang gõ

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

function timeLabel(iso: string) {
  const d = new Date(iso)
  const sameDay = d.toDateString() === new Date().toDateString()
  return sameDay
    ? d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
}

export default function ChatPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [conversations, setConversations] = useState<Conversation[] | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [dailyUsed, setDailyUsed] = useState(0)

  const refreshList = useCallback(() => {
    listConversations()
      .then((c) => { setConversations(c); setListError(null) })
      .catch(() => setListError('Không tải được danh sách trò chuyện.'))
  }, [])

  useEffect(refreshList, [refreshList])
  useEffect(() => {
    getDailyUsage().then(setDailyUsed).catch(() => {}) // chỉ để hiển thị; server mới là nơi chặn
  }, [])

  const active = conversations?.find((c) => c.id === id) ?? null

  async function onPickTopic(topic: string, customTopic?: string) {
    const { conversation, usage } = await startChat(topic, customTopic)
    setDailyUsed(usage.daily_used)
    setPickerOpen(false)
    refreshList()
    navigate(`/dashboard/tro-chuyen/${conversation.id}`)
  }

  return (
    <div className="flex h-[calc(100dvh-3.75rem-6rem)] gap-4 p-3 sm:p-4 lg:h-dvh">
      {/* Danh sách hội thoại: luôn hiện trên desktop; trên mobile chỉ hiện khi chưa mở hội thoại */}
      <aside className={`glass w-full flex-col overflow-hidden rounded-3xl lg:flex lg:w-80 lg:shrink-0 ${id ? 'hidden' : 'flex'}`}>
        <div className="flex items-center justify-between p-4 pb-2">
          <h1 className="text-xl font-extrabold">Trò chuyện</h1>
          <button onClick={() => setPickerOpen(true)} className="btn-primary min-h-11 px-4 text-sm">
            <Plus size={18} aria-hidden /> Chủ đề mới
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {listError && <p className="p-3 text-sm text-red-700" role="alert">{listError}</p>}
          {conversations === null && !listError && (
            <p className="flex items-center gap-2 p-3 text-ink-soft"><Loader2 className="animate-spin" size={18} aria-hidden /> Đang tải…</p>
          )}
          {conversations?.length === 0 && (
            <p className="p-3 text-ink-soft">Chưa có cuộc trò chuyện nào. Chọn một chủ đề để bắt đầu nhé!</p>
          )}
          <ul className="space-y-1">
            {conversations?.map((c) => (
              <li key={c.id}>
                <Link
                  to={`/dashboard/tro-chuyen/${c.id}`}
                  aria-current={c.id === id ? 'page' : undefined}
                  className={`flex min-h-16 items-center gap-3 rounded-2xl px-3 py-2 transition-colors ${
                    c.id === id ? 'bg-white/90 shadow-sm' : 'hover:bg-white/60'
                  }`}
                >
                  <Avatar archived={c.status === 'ARCHIVED'} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{topicTitle(c.topic, c.custom_topic)}</span>
                    <span className="block truncate text-sm text-ink-soft">
                      {c.status === 'ARCHIVED' ? 'Đã lưu trữ' : 'Bạn luyện phản biện'}
                    </span>
                  </span>
                  <time className="shrink-0 text-xs text-ink-soft" dateTime={c.last_interacted_at}>
                    {timeLabel(c.last_interacted_at)}
                  </time>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Khung chat */}
      <section className={`glass min-w-0 flex-1 flex-col overflow-hidden rounded-3xl lg:flex ${id ? 'flex' : 'hidden'}`}>
        {id ? (
          <Thread
            key={id}
            conversationId={id}
            conversation={active}
            dailyUsed={dailyUsed}
            onUsage={setDailyUsed}
            onSent={refreshList}
            onNewChat={() => setPickerOpen(true)}
          />
        ) : (
          <Welcome onStart={() => setPickerOpen(true)} />
        )}
      </section>

      {pickerOpen && <TopicPicker onClose={() => setPickerOpen(false)} onPick={onPickTopic} />}
    </div>
  )
}

function Avatar({ archived = false, size = 44 }: { archived?: boolean; size?: number }) {
  return (
    <span className="relative shrink-0" style={{ width: size, height: size }}>
      <span className="grid size-full place-items-center rounded-full bg-gradient-to-br from-brand via-teal to-amber p-[2px]">
        <span className="grid size-full place-items-center rounded-full bg-white">
          <img src={logo} alt="" className="size-[78%]" />
        </span>
      </span>
      {!archived && <span className="absolute right-0 bottom-0 size-3 rounded-full border-2 border-white bg-emerald-500" aria-hidden />}
    </span>
  )
}

function Welcome({ onStart }: { onStart: () => void }) {
  return (
    <div className="grid flex-1 place-items-center p-8 text-center">
      <div className="max-w-md">
        <Avatar size={88} />
        <h2 className="mt-6 text-2xl font-extrabold">Bạn luyện phản biện của bạn đây!</h2>
        <p className="mt-2 text-ink-soft">
          Chọn một tình huống, nêu quan điểm, và chuẩn bị bị hỏi vặn kiểu Socrates. Lỡ khái quát vội, công kích cá nhân
          hay dựng bù nhìn thì… sẽ bị trêu một chút đấy.
        </p>
        <button onClick={onStart} className="btn-accent mt-6">
          <Sparkles size={18} aria-hidden /> Chọn chủ đề
        </button>
      </div>
    </div>
  )
}

type UiMessage = ChatMessage & { pending?: boolean }

function Thread({
  conversationId,
  conversation,
  dailyUsed,
  onUsage,
  onSent,
  onNewChat,
}: {
  conversationId: string
  conversation: Conversation | null
  dailyUsed: number
  onUsage: (dailyUsed: number) => void
  onSent: () => void
  onNewChat: () => void
}) {
  const [messages, setMessages] = useState<UiMessage[] | null>(null)
  // Số liệu mới nhất từ server; trước lượt gửi đầu tiên thì lấy từ danh sách hội thoại
  const [usedTokens, setUsedTokens] = useState<number | null>(null)
  const used = usedTokens ?? conversation?.token_count ?? 0
  const dailyOut = dailyUsed >= DAILY_TOKEN_LIMIT
  const exhausted = used >= TOKEN_LIMIT || dailyOut
  const [draft, setDraft] = useState('')
  const [typing, setTyping] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    listMessages(conversationId)
      .then(setMessages)
      .catch(() => setError('Không tải được tin nhắn.'))
  }, [conversationId])

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages, typing])

  async function send(e?: FormEvent) {
    e?.preventDefault()
    const content = draft.trim()
    if (!content || typing) return
    setError(null)
    setDraft('')
    const temp: UiMessage = {
      id: -Date.now(),
      conversation_id: conversationId,
      sender_type: 'USER',
      content,
      fallacy_code: null,
      meme_url: null,
      created_at: new Date().toISOString(),
      pending: true,
    }
    setMessages((m) => [...(m ?? []), temp])
    setTyping(true)
    try {
      const [res] = await Promise.all([sendReply(conversationId, content), wait(MIN_TYPING_MS)])
      setMessages((m) => [...(m ?? []).filter((x) => x.id !== temp.id), ...res.messages])
      setUsedTokens(res.usage.used)
      onUsage(res.usage.daily_used)
      onSent()
    } catch (err) {
      setMessages((m) => (m ?? []).filter((x) => x.id !== temp.id))
      setDraft(content)
      if (err instanceof ChatApiError && err.code === 'budget_exhausted') setUsedTokens(TOKEN_LIMIT)
      if (err instanceof ChatApiError && err.code === 'daily_exhausted') onUsage(DAILY_TOKEN_LIMIT)
      setError(err instanceof Error ? err.message : 'Gửi tin nhắn thất bại.')
    } finally {
      setTyping(false)
      inputRef.current?.focus()
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      send()
    }
  }

  return (
    <>
      <header className="flex items-center gap-3 border-b border-white/70 px-3 py-3 sm:px-5">
        <Link to="/dashboard/tro-chuyen" className="grid size-11 place-items-center rounded-full hover:bg-white/70 lg:hidden" aria-label="Quay lại danh sách">
          <ArrowLeft size={20} aria-hidden />
        </Link>
        <Avatar archived={conversation?.status === 'ARCHIVED'} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-bold">{topicTitle(conversation?.topic ?? null, conversation?.custom_topic)}</h2>
          <p className="truncate text-sm text-ink-soft">{typing ? 'Đang soạn tin…' : <><span className="max-sm:hidden">Bạn luyện phản biện · </span>Luôn online</>}</p>
        </div>
        <QuotaRings used={used} limit={TOKEN_LIMIT} dailyUsed={dailyUsed} dailyLimit={DAILY_TOKEN_LIMIT} />
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-5 sm:px-6" aria-live="polite">
        {conversation?.context_summary && (
          <div className="mx-auto flex max-w-lg gap-3 rounded-2xl bg-amber/15 px-4 py-3 text-sm">
            <Archive size={18} className="mt-0.5 shrink-0 text-flame-deep" aria-hidden />
            <p><strong>Tóm tắt phần đã lưu trữ:</strong> {conversation.context_summary}</p>
          </div>
        )}
        {messages === null && !error && (
          <p className="flex justify-center gap-2 text-ink-soft"><Loader2 className="animate-spin" size={18} aria-hidden /> Đang tải…</p>
        )}
        {messages?.map((m) => <Bubble key={m.id} message={m} />)}
        {typing && <TypingDots />}
      </div>

      {error && (
        <p role="alert" className="mx-3 mb-2 flex items-center justify-between gap-2 rounded-2xl bg-red-50 px-4 py-2 text-sm text-red-700 sm:mx-6">
          {error}
          <button onClick={() => setError(null)} className="grid size-9 place-items-center rounded-full hover:bg-red-100" aria-label="Đóng thông báo">
            <X size={16} aria-hidden />
          </button>
        </p>
      )}

      {exhausted ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/70 p-4 sm:px-6">
          <p className="text-sm text-ink-soft">
            {dailyOut
              ? 'Hôm nay bạn đã luyện hết lượt rồi 💪 0h mai quay lại luyện tiếp nhé!'
              : 'Cuộc trò chuyện này đã dùng hết lượt. Mở cuộc mới để luyện tiếp nhé!'}
          </p>
          {!dailyOut && (
            <button onClick={onNewChat} className="btn-primary min-h-11 px-4 text-sm">
              <Plus size={18} aria-hidden /> Trò chuyện mới
            </button>
          )}
        </div>
      ) : (
      <form onSubmit={send} className="flex items-end gap-2 border-t border-white/70 p-3 sm:px-5">
        <label htmlFor="chat-input" className="sr-only">Tin nhắn</label>
        <textarea
          id="chat-input"
          ref={inputRef}
          rows={1}
          value={draft}
          maxLength={MAX_CHARS}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Nêu quan điểm của bạn… (Enter để gửi)"
          className="input max-h-40 min-h-12 resize-none rounded-3xl py-3 [field-sizing:content]"
        />
        <button
          type="submit"
          disabled={!draft.trim() || typing}
          className="grid size-12 shrink-0 cursor-pointer place-items-center rounded-full bg-gradient-to-br from-brand to-teal-deep text-white shadow-lg transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Gửi"
        >
          <SendHorizonal size={20} aria-hidden />
        </button>
      </form>
      )}
    </>
  )
}

function Bubble({ message: m }: { message: UiMessage }) {
  const mine = m.sender_type === 'USER'
  return (
    <div className={`bubble-in flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
      {!mine && <Avatar size={30} archived />}
      <div className={`flex max-w-[82%] flex-col sm:max-w-[70%] ${mine ? 'items-end' : 'items-start'}`}>
        <div
          className={`rounded-3xl px-4 py-2.5 whitespace-pre-wrap break-words ${
            mine
              ? 'rounded-br-lg bg-gradient-to-br from-brand to-teal-deep text-white'
              : 'rounded-bl-lg bg-white/90 text-ink shadow-sm'
          } ${m.pending ? 'opacity-70' : ''}`}
        >
          {m.content}
          {m.meme_url && <Meme url={m.meme_url} />}
        </div>
        {m.fallacy_code && (
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber/25 px-2.5 py-0.5 text-xs font-semibold text-flame-deep">
            <AlertTriangle size={12} aria-hidden /> {FALLACY_LABELS[m.fallacy_code]}
          </span>
        )}
      </div>
    </div>
  )
}

function Meme({ url }: { url: string }) {
  const fromGiphy = url.startsWith('https://') && new URL(url).hostname.endsWith('giphy.com')
  return (
    <figure className="mt-2">
      <img
        src={url}
        alt="Meme phản ứng"
        className="w-full max-w-64 rounded-2xl"
        loading="lazy"
        referrerPolicy="no-referrer"
      />
      {fromGiphy && <figcaption className="mt-1 text-[11px] text-ink-soft">Powered by GIPHY</figcaption>}
    </figure>
  )
}

function TypingDots() {
  return (
    <div className="flex items-end gap-2" aria-label="Đang soạn tin">
      <Avatar size={30} archived />
      <div className="flex gap-1 rounded-3xl rounded-bl-lg bg-white/90 px-4 py-3.5 shadow-sm">
        {[0, 1, 2].map((i) => (
          <span key={i} className="typing-dot size-2 rounded-full bg-ink-soft" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  )
}

function TopicPicker({
  onClose,
  onPick,
}: {
  onClose: () => void
  onPick: (topic: string, customTopic?: string) => Promise<void>
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [custom, setCustom] = useState('')
  const customOk = custom.trim().length >= 5

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  async function pick(topic: string, customTopic?: string) {
    setBusy(topic)
    setError(null)
    try {
      await onPick(topic, customTopic)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tạo được cuộc trò chuyện.')
      setBusy(null)
    }
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="picker-title"
      className="glass-strong m-auto w-[min(40rem,calc(100vw-2rem))] rounded-3xl p-0 text-ink backdrop:bg-ink/30 backdrop:backdrop-blur-sm"
    >
      <div className="p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="picker-title" className="text-2xl font-extrabold">Hôm nay mình tranh luận về gì?</h2>
            <p className="mt-1 text-ink-soft">Các tình huống lấy từ nội dung khóa học ThinkingLab.</p>
          </div>
          <button onClick={onClose} className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-white/70" aria-label="Đóng">
            <X size={20} aria-hidden />
          </button>
        </div>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {TOPICS.map((t) => (
            <li key={t.id}>
              <button
                onClick={() => pick(t.id)}
                disabled={busy !== null}
                className="flex min-h-20 w-full cursor-pointer items-center gap-3 rounded-2xl bg-white/70 p-4 text-left transition-colors hover:bg-white disabled:cursor-wait disabled:opacity-60"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{t.title}</span>
                  <span className="block text-sm text-teal-deep">{t.hint}</span>
                </span>
                {busy === t.id && <Loader2 className="shrink-0 animate-spin text-brand" size={20} aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (customOk) pick(CUSTOM_TOPIC_ID, custom.trim())
          }}
          className="mt-3 rounded-2xl border-2 border-dashed border-brand/30 bg-white/50 p-4"
        >
          <label htmlFor="custom-topic" className="flex items-center gap-2 font-bold">
            <PenLine size={18} className="text-brand" aria-hidden /> Chủ đề của bạn
          </label>
          <p id="custom-topic-hint" className="mt-0.5 text-sm text-ink-soft">
            Một vấn đề bạn muốn tranh luận. Lab sẽ duyệt nhanh trước khi bắt đầu.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              id="custom-topic"
              className="input min-h-11 flex-1"
              value={custom}
              maxLength={CUSTOM_TOPIC_MAX}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="VD: Có nên cấm điện thoại trong lớp học?"
              aria-describedby="custom-topic-hint"
              disabled={busy !== null}
            />
            <button
              type="submit"
              disabled={busy !== null || !customOk}
              className="btn-primary min-h-11 px-5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy === CUSTOM_TOPIC_ID ? <Loader2 className="animate-spin" size={18} aria-hidden /> : <Sparkles size={18} aria-hidden />}
              {busy === CUSTOM_TOPIC_ID ? 'Đang duyệt…' : 'Bắt đầu'}
            </button>
          </div>
          <p className="mt-1 text-right text-xs text-ink-soft">
            {custom.length}/{CUSTOM_TOPIC_MAX}
          </p>
        </form>
        {error &&<p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      </div>
    </dialog>
  )
}
