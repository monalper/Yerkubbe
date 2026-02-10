import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useAuth } from '../../lib/auth/AuthProvider'
import { Seo } from '../../lib/seo/Seo'
import { supabase } from '../../lib/supabaseClient'
import styles from './admin.module.css'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

type FormValues = z.infer<typeof schema>

export function AdminLoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = ((location.state as { from?: string } | null)?.from ?? '/admin/articles') as string
  const { loading, profileLoading, session, profile } = useAuth()
  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
    setError,
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (loading || profileLoading) return
    if (!session?.user) return
    if (profile?.role !== 'admin') return
    navigate(from.startsWith('/admin') ? from : '/admin/articles', { replace: true })
  }, [from, loading, navigate, profile?.role, profileLoading, session?.user?.id])

  return (
    <section className={styles.narrow}>
      <Seo title="Admin giriş" description="Admin girişi." noindex />
      <h1 className={styles.h1}>Admin giriş</h1>
      <form
        className={styles.form}
        onSubmit={handleSubmit(async (values) => {
          const { error } = await supabase.auth.signInWithPassword(values)
          if (error) {
            setError('password', { message: 'Giriş başarısız. Email/şifre kontrol et.' })
            return
          }
          navigate(from.startsWith('/admin') ? from : '/admin/articles', { replace: true })
        })}
      >
        <div className={styles.field}>
          <label className={styles.label} htmlFor="email">
            Email
          </label>
          <input id="email" className={styles.input} autoComplete="email" {...register('email')} />
          {errors.email?.message ? <p className={styles.error}>{errors.email.message}</p> : null}
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="password">
            Şifre
          </label>
          <input
            id="password"
            className={styles.input}
            type="password"
            autoComplete="current-password"
            {...register('password')}
          />
          {errors.password?.message ? <p className={styles.error}>{errors.password.message}</p> : null}
        </div>
        <button className={styles.primary} type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Giriş yapılıyor…' : 'Giriş'}
        </button>
      </form>
    </section>
  )
}
