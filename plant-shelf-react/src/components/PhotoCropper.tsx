import { useState } from 'react'
import Cropper from 'react-easy-crop'
import { renderPhoto, type Area } from '../lib/image'

// Crop one photo. "Use whole photo" skips cropping.
export default function PhotoCropper({
  file, remaining, onDone, onCancel,
}: { file: File; remaining: number; onDone: (blob: Blob) => void; onCancel: () => void }) {
  const [url] = useState(() => URL.createObjectURL(file))
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [area, setArea] = useState<Area | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function go(useArea: Area | null) {
    setBusy(true)
    try {
      onDone(await renderPhoto(url, useArea))
    } catch (e) {
      setErr((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <div className="modal" style={{ zIndex: 40, alignItems: 'center' }}>
      <div className="msheet" style={{ borderRadius: 16, maxWidth: 480 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h3>Crop photo{remaining > 0 ? ` (${remaining} more after this)` : ''}</h3>
          <button className="link" onClick={onCancel}>Cancel</button>
        </div>
        <div style={{ position: 'relative', height: 320, background: '#000', borderRadius: 12, overflow: 'hidden' }}>
          <Cropper image={url} crop={crop} zoom={zoom} aspect={1} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, px) => setArea(px)} />
        </div>
        <input type="range" min={1} max={4} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} style={{ width: '100%', marginTop: 10 }} aria-label="Zoom" />
        {err && <p className="mut">{err}</p>}
        <div className="row" style={{ marginTop: 6 }}>
          <button className="btn" disabled={busy || !area} onClick={() => go(area)}>Crop and save</button>
          <button className="btn alt" disabled={busy} onClick={() => go(null)}>Use whole photo</button>
        </div>
      </div>
    </div>
  )
}
