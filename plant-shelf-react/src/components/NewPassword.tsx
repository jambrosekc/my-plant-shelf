import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function NewPassword({ done }: { done: () => void }) {
  const [pw, setPw] = useState('')
  const [msg, setMsg] = useState('')
  async function save(e: React.FormEvent) {
    e.preventDefault()
    const r = await supabase.auth.updateUser({ password: pw })
    if (r.error) setMsg(r.error.message)
    else done()
  }
  return (
    <div className="auth">
      <form className="card" onSubmit={save}>
        <h1>Choose a new password</h1>
        <label htmlFor="npw">New password</label>
        <input id="npw" type="password" minLength={6} required value={pw} onChange={(e) => setPw(e.target.value)} />
        <button className="btn">Save password</button>
        {msg && <p className="msg">{msg}</p>}
      </form>
    </div>
  )
}
