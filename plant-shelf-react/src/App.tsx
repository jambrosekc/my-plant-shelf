import { LogOut, Sprout } from 'lucide-react'
import AuthScreen from './components/AuthScreen'
import NewPassword from './components/NewPassword'
import { supabase, photoUrl } from './lib/supabase'
import { useAuth } from './lib/useAuth'
import { usePlants } from './lib/usePlants'

export default function App() {
  const { user, loading, recovery, clearRecovery } = useAuth()
  const { plants, photos, loading: plantsLoading, error } = usePlants(user?.id)

  if (loading) return <div className="auth"><p className="mut">Loading...</p></div>
  if (recovery) return <NewPassword done={clearRecovery} />
  if (!user) return <AuthScreen />

  const shelf = (user.user_metadata?.shelf_name as string) || 'My Shelf'

  return (
    <div className="app">
      <header className="hdr">
        <h1><Sprout size={22} /> {shelf}</h1>
        <button className="link" onClick={() => supabase.auth.signOut()}><LogOut size={16} /> Sign out</button>
      </header>
      <main className="wrap">
        {error && <p className="msg">{error}</p>}
        {plantsLoading ? (
          <p className="mut">Loading your plants...</p>
        ) : (
          <>
            <p className="mut">{plants.length} plants</p>
            <div className="grid">
              {plants.map((p) => {
                const cover = photos[p.id]?.[0]
                return (
                  <div className="tile" key={p.id}>
                    {cover && <img src={photoUrl(cover.path)} alt="" loading="lazy" />}
                    <b>{p.plant_name}</b>
                    <span className="mut">{p.genus}</span>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
