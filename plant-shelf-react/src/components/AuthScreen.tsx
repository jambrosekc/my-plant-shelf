import { useState } from 'react'
import { Leaf } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { cleanSlug } from '../lib/useProfile'

type Mode = 'in' | 'up' | 'reset'

export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [shelf, setShelf] = useState('')
  const [uname, setUname] = useState('')
  const [unameMsg, setUnameMsg] = useState('')
  const [msg, setMsg] = useState('')
  const [needResend, setNeedResend] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMsg('')
    setNeedResend(false)
    if (mode === 'reset') {
      const r = await supabase.auth.resetPasswordForEmail(email, { redirectTo: location.origin })
      setMsg(r.error ? r.error.message : 'Check your email for a reset link.')
    } else if (mode === 'up') {
      const un = uname.replace(/-+$/, '')
      if (un.length < 3) { setMsg('Pick a username with at least 3 letters or numbers.'); setBusy(false); return }
      const ok = await supabase.rpc('username_available', { p_name: un })
      if (ok.data === false) { setMsg('That username is taken. Try another.'); setBusy(false); return }
      const r = await supabase.auth.signUp({
        email,
        password,
        options: { data: { shelf_name: shelf.trim() || 'My Shelf', username: un } },
      })
      if (r.error) setMsg(r.error.message)
      else if (!r.data.session) setMsg('Check your email to confirm your account, then sign in.')
    } else {
      const r = await supabase.auth.signInWithPassword({ email, password })
      if (r.error) {
        setMsg(r.error.message)
        setNeedResend(/not confirmed/i.test(r.error.message))
      }
    }
    setBusy(false)
  }

  async function resend() {
    await supabase.auth.resend({ type: 'signup', email })
    setMsg('Sent. Check your email for a new confirmation link.')
    setNeedResend(false)
  }

  return (
    <div className="auth">
      <form className="card" onSubmit={submit}>
        <h1><Leaf size={26} /> My Plant Shelf</h1>
        <p className="mut">
          {mode === 'in' ? 'Sign in to your shelf.' : mode === 'up' ? 'Create your shelf.' : 'Reset your password.'}
        </p>
        {mode === 'up' && (
          <>
            <label htmlFor="shelf">Shelf name</label>
            <input id="shelf" value={shelf} onChange={(e) => setShelf(e.target.value)} placeholder="My Shelf" />
            <label htmlFor="un">Username (this becomes your share link)</label>
            <input
              id="un" required minLength={3} maxLength={30} autoCapitalize="off" autoComplete="off" value={uname}
              onChange={(e) => { setUname(cleanSlug(e.target.value)); setUnameMsg('') }}
              onBlur={async () => {
                if (uname.length < 3) return
                const r = await supabase.rpc('username_available', { p_name: uname })
                if (!r.error) setUnameMsg(r.data ? 'Available' : 'Taken. Try another.')
              }}
              placeholder="e.g. jessplants"
            />
            <p className="mut" style={{ margin: '4px 0 0', fontSize: 12 }}>Your shelf name and username are visible to other collectors. Your plants stay private unless you choose to share them.</p>
            {unameMsg && <p className="mut" style={{ margin: '4px 0 0' }}>{unameMsg}</p>}
          </>
        )}
        <label htmlFor="em">Email</label>
        <input id="em" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        {mode !== 'reset' && (
          <>
            <label htmlFor="pw">Password</label>
            <input
              id="pw"
              type="password"
              required
              minLength={6}
              autoComplete={mode === 'up' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </>
        )}
        <button className="btn" disabled={busy}>
          {mode === 'in' ? 'Sign in' : mode === 'up' ? 'Create account' : 'Send reset link'}
        </button>
        {msg && <p className="msg">{msg}</p>}
        {needResend && <button type="button" className="link" onClick={resend}>Resend confirmation email</button>}
        <div className="links">
          {mode !== 'in' && <button type="button" className="link" onClick={() => setMode('in')}>Sign in</button>}
          {mode !== 'up' && <button type="button" className="link" onClick={() => setMode('up')}>Create account</button>}
          {mode === 'in' && <button type="button" className="link" onClick={() => setMode('reset')}>Forgot password?</button>}
        </div>
      </form>
    </div>
  )
}
