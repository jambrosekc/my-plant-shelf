export interface Area { x: number; y: number; width: number; height: number }

export const newPhotoPath = (userId: string, plantId: string) =>
  `${userId}/${plantId}/${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}.jpg`

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('That file is not an image I can read'))
    img.src = url
  })
}

// Crops (optional) and shrinks to max px on the long side, as a JPEG.
export async function renderPhoto(url: string, area: Area | null, max = 1400): Promise<Blob> {
  const img = await loadImage(url)
  const a = area ?? { x: 0, y: 0, width: img.naturalWidth, height: img.naturalHeight }
  const k = Math.min(1, max / Math.max(a.width, a.height))
  const c = document.createElement('canvas')
  c.width = Math.round(a.width * k)
  c.height = Math.round(a.height * k)
  c.getContext('2d')!.drawImage(img, a.x, a.y, a.width, a.height, 0, 0, c.width, c.height)
  return new Promise((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not read that image'))), 'image/jpeg', 0.82),
  )
}
