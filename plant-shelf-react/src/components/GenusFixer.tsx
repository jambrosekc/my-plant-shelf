import { useMemo, useState } from 'react'
import type { Plant } from '../lib/types'

const KNOWN = [
  'Aglaonema', 'Alocasia', 'Amydrium', 'Anthurium', 'Begonia', 'Calathea', 'Caladium', 'Ceropegia', 'Chamaedorea', 'Cissus',
  'Codiaeum', 'Colocasia', 'Cryptanthus', 'Dieffenbachia', 'Dischidia', 'Dracaena', 'Epipremnum', 'Epiphyllum', 'Euphorbia',
  'Ficus', 'Fittonia', 'Gasteria', 'Haworthia', 'Hoya', 'Hydrangea', 'Kalanchoe', 'Lithops', 'Maranta', 'Monstera',
  'Nephrolepis', 'Orchid', 'Oxalis', 'Pachira', 'Peperomia', 'Philodendron', 'Pilea', 'Platycerium', 'Pothos', 'Raphidophora',
  'Rhaphidophora', 'Rhipsalis', 'Sansevieria', 'Schefflera', 'Scindapsus', 'Senecio', 'Spathiphyllum', 'Stromanthe',
  'Syngonium', 'Thaumatophyllum', 'Tradescantia', 'Xanthosoma', 'Zamioculcas', 'Zebrina',
]
const FIX: Record<string, string> = { pothos: 'Epipremnum', raphidophora: 'Rhaphidophora', zebrina: 'Tradescantia' }

export function guessGenus(name: string): string | null {
  const words = name.replace(/["'“”’()]/g, ' ').split(/[\s\-_/,]+/).filter(Boolean)
  for (const w of words) {
    const k = KNOWN.find((g) => g.toLowerCase() === w.toLowerCase())
    if (k) return FIX[k.toLowerCase()] ?? k
  }
  return null
}

export default function GenusFixer({ plants, onApply }: { plants: Plant[]; onApply: (ids: string[], patch: Partial<Plant>) => Promise<unknown> | void }) {
  const [open, setOpen] = useState(false)
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem('genusfix') === '1' } catch { return false } })
  const [busy, setBusy] = useState(false)
  const missing = useMemo(() => plants.filter((p) => !p.genus || p.genus === 'None'), [plants])
  const guesses = useMemo(() => {
    const m: Record<string, string[]> = {}
    let none = 0
    missing.forEach((p) => { const g = guessGenus(p.plant_name); if (g) (m[g] ??= []).push(p.id); else none++ })
    return { m, none }
  }, [missing])
  if (hidden || !missing.length) return null
  const found = Object.values(guesses.m).reduce((a, b) => a + b.length, 0)

  async function apply() {
    setBusy(true)
    for (const [g, ids] of Object.entries(guesses.m)) await onApply(ids, { genus: g })
    setBusy(false)
    setOpen(false)
  }

  return (
    <div className="card" style={{ margin: '8px 0' }}>
      <b>{missing.length} plant{missing.length === 1 ? ' has' : 's have'} no genus</b>
      <p className="mut" style={{ margin: '4px 0 8px' }}>That is why they all sit under "Other". I can fill the genus in from the plant names, like "Hoya carnosa" becomes Hoya.</p>
      {!open ? (
        <div className="row">
          <button className="btn" onClick={() => setOpen(true)} disabled={!found}>Preview the fix</button>
          <button className="btn alt" onClick={() => { try { localStorage.setItem('genusfix', '1') } catch { /* ignore */ } setHidden(true) }}>Not now</button>
        </div>
      ) : (
        <>
          <p style={{ margin: '4px 0' }}><b>{found}</b> can be filled in. {guesses.none > 0 && <span className="mut">{guesses.none} have no recognizable genus in the name and stay as they are.</span>}</p>
          <div className="mut" style={{ fontSize: 13, margin: '4px 0 10px' }}>
            {Object.entries(guesses.m).sort((a, b) => b[1].length - a[1].length).map(([g, ids]) => `${g} (${ids.length})`).join(' · ')}
          </div>
          <div className="row">
            <button className="btn" onClick={apply} disabled={busy}>{busy ? 'Working...' : `Fill in ${found} plants`}</button>
            <button className="btn alt" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </>
      )}
    </div>
  )
}
