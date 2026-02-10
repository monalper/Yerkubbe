import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthProvider'

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { loading, profileLoading, session, profile } = useAuth()
  const location = useLocation()

  if (loading || profileLoading) return null
  if (!session?.user)
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{ from: `${location.pathname}${location.search}${location.hash}` }}
      />
    )

  // Profil henüz yüklenemediyse (örn. ağ hatası), yanlışlıkla anasayfaya atma.
  if (!profile) return null
  if (profile.role == null) {
    return (
      <div style={{ padding: 16 }}>
        <p style={{ margin: 0, opacity: 0.8 }}>
          Yetki bilgisi yüklenemedi. Lütfen sayfayı yenileyin veya tekrar giriş yapın.
        </p>
      </div>
    )
  }
  if (profile.role !== 'admin') return <Navigate to="/" replace />
  return children
}
