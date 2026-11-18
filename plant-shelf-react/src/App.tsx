import { useEffect, useMemo, useState } from 'react'
import AuthScreen from './components/AuthScreen'
import NewPassword from './components/NewPassword'
import Hero from './components/Hero'
import AddPlant from './components/AddPlant'
import ImportView from './components/ImportView'
import ListView from './components/ListView'
import SheetView from './components/SheetView'
import PlantModal from './components/PlantModal'
import { CardGrid, GenusCards, GenusShelf, IllusShelf } from './components/PlantViews'
import { supabase } from './lib/supabase'
import { useAuth } from './lib/useAuth'
import { usePlants } from './lib/usePlants'
import { gkey, passes, sortList, type Filter, type SortBy, type GroupBy } from './lib/helpers'

type View = 'shelf' | 'cards' | 'list' | 'sheet'
const store = (k: string, d: string) => { try { return localStorage.getItem(k) || d } catch { return d } }
const save = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* ignore */ } }

export default function App() {
  const { user, loading, recovery, clearRecovery } = useAuth()
  const { plants, photos, loading: plantsLoading, error, patch, addPlants, remove, removeMany, patchMany, addPhoto, deletePhoto, makeCover } = usePlants(user?.id)
  const [modalId, setModalId] = useState<string | null>(null)
  const [theme, setTheme] = useState(() => store('theme', matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'))
  const [view, setView] = useState<View>(() => store('view', 'shelf') as View)
  const [gmode, setGmode] = useState<'genus' | 'every'>('genus')
  const [gsel, setGsel] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortBy>('name')
  const [filter, setFilter] = useState<Filter>('all')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [groupBy, setGroupBy] = useState<GroupBy>('seller')
  const [q, setQ] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [tab, setTab] = useState<'home' | 'add' | 'imp'>('home')
  const [toast, setToast] = useState('')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    save('theme', theme)
  }, [theme])

  const list = useMemo(() => plants.filter((p) => passes(p, q, filter)), [plants, q, filter])

  if (loading) return <div className="auth"><p className="mut">Loading...</p></div>
  if (recovery) return <NewPassword done={clearRecovery} />
  if (!user) return <AuthScreen />

  const shelf = (user.user_metadata?.shelf_name as string) || 'My Shelf'
  const searching = !!q || filter !== 'all'
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3000) }
  const go = (t: 'home' | 'add' | 'imp') => { setTab(t); setMenuOpen(false); window.scrollTo(0, 0) }
  const open = (id: string) => setModalId(id)
  const modalPlant = plants.find((p) => p.id === modalId)

  function body() {
    if (view === 'list') return <ListView all={plants} list={list} groupBy={groupBy} setGroupBy={setGroupBy} onOpen={open} onPatch={patch} onBulkDelete={removeMany} onBulkPatch={patchMany} />
    if (view === 'sheet') return <SheetView list={list} onPatch={patch} />
    if (gmode === 'genus' && !searching && gsel == null)
      return view === 'cards'
        ? <GenusCards list={list} photos={photos} onOpen={setGsel} />
        : <GenusShelf list={list} photos={photos} onOpen={setGsel} />
    let sub = list
    let head = null
    if (gmode === 'genus' && gsel != null && !searching) {
      sub = list.filter((p) => gkey(p) === gsel)
      head = (
        <>
          <button className="link back" onClick={() => setGsel(null)}>← All genera</button>
          <h2 className="gtitle">{gsel}</h2>
          <p className="mut" style={{ margin: '0 0 6px' }}>{sub.length} plant{sub.length === 1 ? '' : 's'}</p>
        </>
      )
    }
    sub = sortList(sub, sortBy)
    return (
      <>
        {head}
        {!sub.length ? <p className="mut">Nothing matches.</p> : view === 'cards'
          ? <CardGrid list={sub} all={plants} photos={photos} onOpen={open} onWhere={patch} />
          : <IllusShelf list={sub} photos={photos} onOpen={open} />}
      </>
    )
  }

  return (
    <>
      <div className="hdr">
        <div style={{ minWidth: 0 }}>
          <small style={{ display: 'block', fontSize: 12, opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</small>
        </div>
        <div className="hbtns">
          <button className="hbtn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? '☀ Light' : '☾ Dark'}</button>
          <button className="hbtn" onClick={() => go('add')}>+ Add</button>
          <button className="hbtn" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">☰</button>
        </div>
      </div>
      {menuOpen && (
        <div className="menu">
          <button onClick={() => go('add')}>Add a plant</button>
          <button onClick={() => go('imp')}>Import from Excel</button>
          <button onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      )}
      <div className="wrap">
        {error && <p className="mut">{error}</p>}
        {tab !== 'home' ? (
          <>
            <button className="link back" onClick={() => go('home')}>← Back to my plants</button>
            {tab === 'add'
              ? <AddPlant onAdd={addPlants} done={(n) => { flash('Added ' + n); go('home') }} />
              : <ImportView onImport={addPlants} done={(n) => { flash('Imported ' + n + ' plants'); go('home') }} />}
          </>
        ) : plantsLoading ? <p className="mut">Loading your plants...</p> : !plants.length ? (
          <div className="card">
            <h3>Your shelf is empty</h3>
            <p className="mut">Add a plant or import a spreadsheet to get started.</p>
            <div className="row"><button className="btn" onClick={() => go('add')}>Add a plant</button><button className="btn alt" onClick={() => go('imp')}>Import Excel</button></div>
          </div>
        ) : (
          <>
            <Hero shelf={shelf} plants={plants} onPick={open} />
            <div className="seg">
              {(['shelf', 'cards', 'list', 'sheet'] as View[]).map((v) => (
                <button key={v} className={view === v ? 'on' : ''} onClick={() => { setView(v); save('view', v) }}>
                  {v[0].toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
            <div className="row" style={{ gap: 8, margin: '10px 0 4px' }}>
              <input type="search" placeholder="Search name, seller or ID" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: 1, margin: 0 }} />
              <button className={'chip' + (filter !== 'all' ? ' on' : '')} onClick={() => setFiltersOpen(!filtersOpen)}>Filter{filter !== 'all' ? ' •' : ''}</button>
            </div>
            {filtersOpen && (
              <div className="card" style={{ margin: '6px 0' }}>
                <div className="chips">
                  {([['all', 'All'], ['shipping', 'Shipping'], ['received', 'Have it'], ['print', 'Needs label'], ['labeled', 'Labeled'], ['missing', "Can't find"], ['repot', 'To repot'], ['water', 'To water'], ['sale', 'For sale'], ['sold', 'Sold']] as [Filter, string][]).map(([k, l]) => (
                    <button key={k} className={'chip' + (filter === k ? ' on' : '')} onClick={() => setFilter(k)}>{l}</button>
                  ))}
                </div>
              </div>
            )}
            {(view === 'shelf' || view === 'cards') && <div className="ctl">
              <div className="seg2">
                <button className={gmode === 'genus' ? 'on' : ''} onClick={() => { setGmode('genus'); setGsel(null) }}>By genus</button>
                <button className={gmode === 'every' ? 'on' : ''} onClick={() => { setGmode('every'); setGsel(null) }}>Every plant</button>
              </div>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}>
                <option value="name">Sort: name</option><option value="seller">Sort: seller</option>
                <option value="stage">Sort: stage</option><option value="newest">Sort: newest</option>
              </select>
            </div>}
            {body()}
          </>
        )}
      </div>
      {toast && <div className="toast">{toast}</div>}
      {modalPlant && (
        <PlantModal
          plant={modalPlant}
          photos={photos[modalPlant.id] ?? []}
          onClose={() => setModalId(null)}
          onPatch={patch}
          onDelete={remove}
          onAddPhoto={(id, blob) => addPhoto(id, user.id, blob)}
          onDeletePhoto={deletePhoto}
          onMakeCover={makeCover}
        />
      )}
    </>
  )
}
