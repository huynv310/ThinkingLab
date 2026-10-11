import { useEffect, useState } from 'react'
import type { SessionFormat } from '../data/course'
import { useAuth } from './auth'
import { MATERIAL_TYPES, checkMaterialFile, hasValidSignature, type MaterialType } from './courseRules'
import { supabase } from './supabase'

const BUCKET = 'course-materials'

export interface SessionPart {
  title: string
  points: string[]
}

export interface CourseSession {
  id: number
  position: number
  slug: string
  title: string
  format: SessionFormat
  duration: string
  goals: string[]
  parts: SessionPart[]
  youtube_id: string | null
}

export type SessionInput = Omit<CourseSession, 'id'>

export interface CourseMaterial {
  id: number
  session_id: number
  title: string
  file_path: string
  file_type: MaterialType
  size_bytes: number
  created_at: string
}

const SESSION_COLS = 'id, position, slug, title, format, duration, goals, parts, youtube_id'
const MATERIAL_COLS = 'id, session_id, title, file_path, file_type, size_bytes, created_at'

function fail(error: { message: string; code?: string }): never {
  if (error.code === '23505') throw new Error('Đường dẫn (slug) này đã được dùng cho buổi khác')
  if (error.code === '42501') throw new Error('Bạn không có quyền admin để thực hiện thao tác này')
  throw new Error(error.message)
}

// ------------------------------------------------------------- Đọc (mọi học viên)

export async function listSessions() {
  const { data, error } = await supabase.from('course_sessions').select(SESSION_COLS).order('position').order('id')
  if (error) fail(error)
  return data as CourseSession[]
}

export async function listMaterials(sessionId: number) {
  const { data, error } = await supabase
    .from('course_materials')
    .select(MATERIAL_COLS)
    .eq('session_id', sessionId)
    .order('created_at')
  if (error) fail(error)
  return data as CourseMaterial[]
}

/** Link tải có hạn 1 giờ (bucket private). */
export async function materialDownloadUrl(m: CourseMaterial) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(m.file_path, 3600, { download: `${m.title}.${m.file_type}` })
  if (error) fail(error)
  return data.signedUrl
}

export function useSessions() {
  const [state, setState] = useState<{ sessions: CourseSession[] | null; error: string }>({ sessions: null, error: '' })
  useEffect(() => {
    let alive = true
    listSessions().then(
      (sessions) => alive && setState({ sessions, error: '' }),
      (e: Error) => alive && setState({ sessions: null, error: e.message }),
    )
    return () => {
      alive = false
    }
  }, [])
  return state
}

export function useIsAdmin() {
  const { session } = useAuth()
  const userId = session?.user.id
  const [state, setState] = useState<{ userId?: string; isAdmin: boolean }>({ isAdmin: false })

  useEffect(() => {
    if (!userId) return
    let alive = true
    supabase.rpc('is_admin').then(({ data }) => alive && setState({ userId, isAdmin: data === true }))
    return () => {
      alive = false
    }
  }, [userId])

  // Chưa kiểm tra xong cho user hiện tại -> loading
  return { isAdmin: state.userId === userId && state.isAdmin, loading: !!userId && state.userId !== userId }
}

// ------------------------------------------------------------- Ghi (chỉ admin; RLS chặn người khác)

export async function saveSession(input: SessionInput, id?: number) {
  const query = id
    ? supabase.from('course_sessions').update(input).eq('id', id)
    : supabase.from('course_sessions').insert(input)
  const { data, error } = await query.select(SESSION_COLS).single()
  if (error) fail(error)
  return data as CourseSession
}

export async function deleteSession(id: number) {
  const materials = await listMaterials(id)
  if (materials.length) {
    const { error } = await supabase.storage.from(BUCKET).remove(materials.map((m) => m.file_path))
    if (error) fail(error)
  }
  const { error } = await supabase.from('course_sessions').delete().eq('id', id)
  if (error) fail(error)
}

export async function uploadMaterial(sessionId: number, title: string, file: File) {
  const check = checkMaterialFile(file)
  if (!check.ok) throw new Error(check.error)
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer())
  if (!hasValidSignature(check.type, head)) throw new Error(`File không phải ${check.type.toUpperCase()} hợp lệ`)

  const path = `${sessionId}/${crypto.randomUUID()}.${check.type}`
  const upload = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: MATERIAL_TYPES[check.type], upsert: false })
  if (upload.error) fail(upload.error)

  const { data, error } = await supabase
    .from('course_materials')
    .insert({ session_id: sessionId, title: title.trim(), file_path: path, file_type: check.type, size_bytes: file.size })
    .select(MATERIAL_COLS)
    .single()
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]) // không để file mồ côi
    fail(error)
  }
  return data as CourseMaterial
}

export async function deleteMaterial(m: CourseMaterial) {
  const { error } = await supabase.from('course_materials').delete().eq('id', m.id)
  if (error) fail(error)
  await supabase.storage.from(BUCKET).remove([m.file_path])
}
