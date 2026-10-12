import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth, type AuthMode } from '../lib/auth'

/**
 * Trang đăng nhập/đăng ký chỉ hỗ trợ dạng popup modal theo yêu cầu.
 * Khi người dùng hoặc liên kết cũ truy cập /auth, tự động kích hoạt AuthModal và điều hướng về trang chủ /?mode=...
 */
export default function AuthPage() {
  const [params] = useSearchParams()
  const { openAuth } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const rawMode = params.get('mode') || params.get('auth')
    const mode: AuthMode = rawMode === 'signup' ? 'signup' : 'login'
    openAuth(mode)
    navigate(`/?mode=${mode}`, { replace: true })
  }, [params, openAuth, navigate])

  return null
}
