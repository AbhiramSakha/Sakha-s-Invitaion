import { useEffect, useState } from 'react'
import { Muxer, ArrayBufferTarget } from 'mp4-muxer'

/* ---------- local storage for photos / songs added in the Studio ---------- */
const KEY = 'wedding-media-v1'
const empty = { bride: null, groom: null, couple: null, extras: [], songs: [] }
const load = () => {
  try { return { ...empty, ...JSON.parse(localStorage.getItem(KEY) || '{}') } } catch { return { ...empty } }
}
export function saveMedia(next) {
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { return false }
  window.dispatchEvent(new Event('media-change'))
  return true
}
export function useMedia() {
  const [m, setM] = useState(load)
  useEffect(() => {
    const f = () => setM(load())
    window.addEventListener('media-change', f)
    return () => window.removeEventListener('media-change', f)
  }, [])
  return m
}
export function useHash() {
  const [h, setH] = useState(location.hash)
  useEffect(() => {
    const f = () => setH(location.hash)
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])
  return h
}

/* Studio opens with the #studio hash, so refreshing never gives a 404 on static hosting.
   The old /studio path still works if it is already open. */
const isStudio = () => location.hash === '#studio' || location.pathname.replace(/\/+$/, '').endsWith('/studio')
export function useIsStudio() {
  const [v, setV] = useState(isStudio)
  useEffect(() => {
    const f = () => setV(isStudio())
    ;['hashchange', 'popstate', 'studio-nav'].forEach((e) => window.addEventListener(e, f))
    return () => ['hashchange', 'popstate', 'studio-nav'].forEach((e) => window.removeEventListener(e, f))
  }, [])
  return v
}
export function openStudio() {
  history.pushState(null, '', location.pathname + location.search + '#studio')
  window.dispatchEvent(new Event('studio-nav'))
  window.scrollTo(0, 0)
}
export function closeStudio() {
  const base = location.pathname.replace(/\/studio\/?$/, '/') || '/'
  history.pushState(null, '', base + location.search)
  window.dispatchEvent(new Event('studio-nav'))
}

/* ---------- images ---------- */
export const loadImg = (src) => new Promise((res, rej) => {
  const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src
})
export async function resizeFile(file, max = 2000) {
  const url = URL.createObjectURL(file)
  const img = await loadImg(url)
  const k = Math.min(1, max / Math.max(img.width, img.height))
  const c = document.createElement('canvas')
  c.width = Math.round(img.width * k); c.height = Math.round(img.height * k)
  const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'
  g.drawImage(img, 0, 0, c.width, c.height)
  URL.revokeObjectURL(url)
  return c.toDataURL('image/jpeg', 0.92)
}
// Shrink a photo to fit inside the video frame right away (keeps memory small, important on phones)
export function fitImage(img, W, H) {
  const k = Math.min(1, W / img.width, H / img.height)
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k))
  const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'
  x.drawImage(img, 0, 0, c.width, c.height)
  return c
}
// Try each path in order and return the first one that loads (or null)
export async function firstWorking(list) {
  for (const s of list || []) {
    if (!s) continue
    try { await loadImg(s); return s } catch {}
  }
  return null
}

/* ---------- songs: official embed players (YouTube, Spotify, SoundCloud, Instagram) ---------- */
const yt = (id, vertical) => (id ? { src: `https://www.youtube.com/embed/${id}?rel=0`, ratio: vertical ? '9 / 16' : '16 / 9', maxW: vertical ? 380 : undefined } : null)
export function embedFor(raw) {
  let u
  try { u = new URL(String(raw).trim()) } catch { return null }
  const h = u.hostname.replace(/^(www|m)\./, '')
  if (h === 'youtu.be') return yt(u.pathname.slice(1))
  if (h.endsWith('youtube.com')) {
    if (u.pathname.startsWith('/shorts/')) return yt(u.pathname.split('/')[2], true)
    if (u.pathname.startsWith('/embed/')) return yt(u.pathname.split('/')[2])
    const v = u.searchParams.get('v'), list = u.searchParams.get('list')
    if (v) return yt(v)
    if (list) return { src: `https://www.youtube.com/embed/videoseries?list=${list}`, ratio: '16 / 9' }
  }
  if (h === 'vimeo.com') {
    const id = u.pathname.split('/').filter(Boolean).pop()
    if (/^\d+$/.test(id)) return { src: `https://player.vimeo.com/video/${id}`, ratio: '16 / 9' }
  }
  if (h === 'facebook.com' || h === 'fb.watch') {
    const vertical = u.pathname.includes('/reel')
    return { src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(raw.trim())}&show_text=false`, ratio: vertical ? '9 / 16' : '16 / 9', maxW: vertical ? 380 : undefined }
  }
  if (h === 'open.spotify.com') {
    const m = u.pathname.match(/\/(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]+)/)
    if (m) return { src: `https://open.spotify.com/embed/${m[1]}/${m[2]}`, h: m[1] === 'track' ? 152 : 352 }
  }
  if (h === 'soundcloud.com') return { src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(raw)}&color=%23b98318`, h: 166 }
  if (h === 'instagram.com') {
    const m = u.pathname.match(/\/(reel|p|tv)\/([\w-]+)/)
    if (m) return { src: `https://www.instagram.com/${m[1]}/${m[2]}/embed`, h: 720, maxW: 480 }
  }
  return null
}

/* ---------- video maker (canvas, runs fully in the browser) ---------- */
const SLIDE = 3.6, FADE = 0.8
const SERIF = "'Cormorant Garamond',Georgia,serif", SCRIPT = "'Great Vibes','Brush Script MT',cursive"

// Background behind photos. Small canvas (it is scaled up when drawn) to save memory.
function prepPlain(W, H) {
  const c = document.createElement('canvas'); c.width = Math.round(W / 3); c.height = Math.round(H / 3)
  const x = c.getContext('2d')
  const g = x.createRadialGradient(c.width / 2, c.height * 0.3, 0, c.width / 2, c.height * 0.4, Math.max(c.width, c.height) * 0.8)
  g.addColorStop(0, '#721232'); g.addColorStop(1, '#2a0612')
  x.fillStyle = g; x.fillRect(0, 0, c.width, c.height)
  return c
}
function prepBg(img, W, H) {
  const c = document.createElement('canvas'); c.width = Math.round(W / 3); c.height = Math.round(H / 3)
  const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'
  const r = Math.max(c.width / img.width, c.height / img.height) * 1.2
  const w = img.width * r, h = img.height * r
  try { x.filter = 'blur(8px) brightness(.6)' } catch {}
  x.drawImage(img, (c.width - w) / 2, (c.height - h) / 2, w, h)
  try { x.filter = 'none' } catch {}
  x.fillStyle = 'rgba(20,4,10,.3)'; x.fillRect(0, 0, c.width, c.height)
  return c
}

// Only shrink a photo if it is bigger than the video needs. Never enlarge it here.
function prepFit(img, W, H) {
  const k = Math.min(W / img.width, H / img.height) * 1.06
  if (k >= 1) return img
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k))
  const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'
  x.drawImage(img, 0, 0, c.width, c.height)
  return c
}

function drawSlide(ctx, s, W, H, p) {
  const u = Math.min(W, H)
  if (s.kind === 'photo') {
    const caption = !!(s.role || s.name)
    const ah = caption ? H * 0.8 : H            // leave room for the caption
    if (s.bg) ctx.drawImage(s.bg, 0, 0, W, H)
    // whole photo is always visible (nothing is cropped), slow gentle zoom
    const pic = s.fit || s.img
    const r = Math.min(W / pic.width, ah / pic.height) * (1 + 0.03 * p)
    const w = pic.width * r, h = pic.height * r
    ctx.drawImage(pic, (W - w) / 2, (ah - h) / 2, w, h)
    if (caption) {
      const g = ctx.createLinearGradient(0, H * 0.7, 0, H)
      g.addColorStop(0, 'rgba(20,4,10,0)'); g.addColorStop(1, 'rgba(20,4,10,.9)')
      ctx.fillStyle = g; ctx.fillRect(0, H * 0.7, W, H * 0.3)
      if (s.role) { ctx.fillStyle = '#f1d57a'; ctx.font = `700 ${u * 0.034}px ${SERIF}`; ctx.fillText(s.role.toUpperCase().split('').join(' '), W / 2, H * 0.865, W * 0.9) }
      if (s.name) { ctx.fillStyle = '#fff'; ctx.font = `700 ${u * 0.056}px ${SERIF}`; ctx.fillText(s.name, W / 2, H * 0.925, W * 0.92) }
    }
    return
  }
  const bg = ctx.createRadialGradient(W / 2, H * 0.3, 0, W / 2, H * 0.4, Math.max(W, H) * 0.8)
  bg.addColorStop(0, '#721232'); bg.addColorStop(1, '#2a0612')
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = 'rgba(232,195,90,.7)'; ctx.lineWidth = 2
  ctx.strokeRect(u * 0.03, u * 0.03, W - u * 0.06, H - u * 0.06)
  ctx.strokeStyle = 'rgba(232,195,90,.3)'; ctx.strokeRect(u * 0.05, u * 0.05, W - u * 0.1, H - u * 0.1)
  s.lines.forEach((l) => {
    ctx.fillStyle = l.color || '#fbeedd'
    ctx.font = `${l.script ? 400 : 700} ${u * l.size}px ${l.script ? SCRIPT : SERIF}`
    ctx.fillText(l.text, W / 2, H * l.y, W * 0.88)
  })
}

export async function audioDuration(file) {
  const ac = new (window.AudioContext || window.webkitAudioContext)()
  try { return (await ac.decodeAudioData(await file.arrayBuffer())).duration } finally { ac.close() }
}

// Draws the video frame for time t (seconds). A pure function of t, so it works offline and live.
function makeFrameDrawer(ctx, slides, W, H, total) {
  const durs = slides.map((s) => s.dur || SLIDE)
  const starts = durs.map((_, k) => durs.slice(0, k).reduce((a, b) => a + b, 0))
  return (t) => {
    let i = 0
    while (i < slides.length - 1 && t >= starts[i + 1]) i++
    const per = durs[i], local = Math.min(per, t - starts[i])
    const cur = slides[i], toText = cur.kind === 'text' && i > 0
    const fade = Math.min(toText ? 1.2 : FADE, per / 3)
    ctx.globalAlpha = 1
    if (local < fade) {
      if (toText) {
        // photo -> text card: fade out to dark first, then fade the card in
        const half = fade / 2
        ctx.fillStyle = '#16070d'; ctx.fillRect(0, 0, W, H)
        if (local < half) { ctx.globalAlpha = 1 - local / half; drawSlide(ctx, slides[i - 1], W, H, 1) }
        else { ctx.globalAlpha = (local - half) / half; drawSlide(ctx, cur, W, H, local / per) }
      } else {
        // photo -> photo: soft crossfade
        if (i > 0) drawSlide(ctx, slides[i - 1], W, H, 1); else { ctx.fillStyle = '#16070d'; ctx.fillRect(0, 0, W, H) }
        ctx.globalAlpha = local / fade
        drawSlide(ctx, cur, W, H, local / per)
      }
    } else {
      drawSlide(ctx, cur, W, H, local / per)
    }
    ctx.globalAlpha = 1
    // gentle fade to black in the last 0.7 seconds
    const left = total - t
    if (i === slides.length - 1 && left < 0.7) {
      ctx.fillStyle = `rgba(22,7,13,${Math.min(1, 1 - Math.max(0, left) / 0.7)})`
      ctx.fillRect(0, 0, W, H)
    }
  }
}

const tick = () => new Promise((r) => setTimeout(r, 0))

// High quality, exact-length MP4 (offline: not real time)
async function encodeMp4({ canvas, draw, total, W, H, fps, bitrate, audioFile, onProgress, signal }) {
  const vcfg = { codec: 'avc1.640028', width: W, height: H, bitrate, framerate: fps, latencyMode: 'quality' }
  if (!(await VideoEncoder.isConfigSupported(vcfg)).supported) throw new Error('no-webcodecs')

  let audioBuf = null, sampleRate = 0, channels = 0
  if (audioFile) {
    if (typeof AudioEncoder === 'undefined') throw new Error('no-webcodecs')
    const ac = new (window.AudioContext || window.webkitAudioContext)()
    try { audioBuf = await ac.decodeAudioData(await audioFile.arrayBuffer()) } finally { ac.close() }
    sampleRate = audioBuf.sampleRate; channels = Math.min(2, audioBuf.numberOfChannels)
    const ok = await AudioEncoder.isConfigSupported({ codec: 'mp4a.40.2', sampleRate, numberOfChannels: channels, bitrate: 192000 })
    if (!ok.supported) throw new Error('no-webcodecs')
  }

  const target = new ArrayBufferTarget()
  const muxer = new Muxer({
    target, fastStart: 'in-memory',
    video: { codec: 'avc', width: W, height: H },
    audio: audioBuf ? { codec: 'aac', numberOfChannels: channels, sampleRate } : undefined,
  })
  let err = null
  const venc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: (e) => { err = e } })
  venc.configure(vcfg)

  const n = Math.ceil(total * fps)
  for (let k = 0; k < n; k++) {
    if (signal && signal.aborted) { try { venc.close() } catch {} ; throw new Error('Cancelled') }
    if (err) throw err
    draw(k / fps)
    const frame = new VideoFrame(canvas, { timestamp: Math.round((k * 1e6) / fps), duration: Math.round(1e6 / fps) })
    venc.encode(frame, { keyFrame: k % (fps * 2) === 0 })
    frame.close()
    while (venc.encodeQueueSize > 6) await tick()
    if (k % 4 === 0) { onProgress && onProgress((k / n) * 0.95); await tick() }
  }
  await venc.flush(); venc.close()

  if (audioBuf) {
    const aenc = new AudioEncoder({ output: (c, m) => muxer.addAudioChunk(c, m), error: (e) => { err = e } })
    aenc.configure({ codec: 'mp4a.40.2', sampleRate, numberOfChannels: channels, bitrate: 192000 })
    const totalFrames = Math.min(audioBuf.length, Math.ceil(total * sampleRate)), CH = 4096
    for (let off = 0; off < totalFrames; off += CH) {
      const len = Math.min(CH, totalFrames - off)
      const data = new Float32Array(len * channels)
      for (let c = 0; c < channels; c++) data.set(audioBuf.getChannelData(c).subarray(off, off + len), c * len)
      const ad = new AudioData({ format: 'f32-planar', sampleRate, numberOfFrames: len, numberOfChannels: channels, timestamp: Math.round((off / sampleRate) * 1e6), data })
      aenc.encode(ad); ad.close()
      if (aenc.encodeQueueSize > 20) await tick()
    }
    await aenc.flush(); aenc.close()
  }
  if (err) throw err
  muxer.finalize()
  onProgress && onProgress(1)
  return { url: URL.createObjectURL(new Blob([target.buffer], { type: 'video/mp4' })), ext: 'mp4' }
}

// Old real-time recorder, only used when the browser has no WebCodecs
async function recordLive({ canvas, draw, audioFile, total, onProgress, signal, bitrate, fps }) {
  const stream = canvas.captureStream(fps)
  let ac, src
  if (audioFile) {
    ac = new (window.AudioContext || window.webkitAudioContext)()
    const buf = await ac.decodeAudioData(await audioFile.arrayBuffer())
    src = ac.createBufferSource(); src.buffer = buf
    const dest = ac.createMediaStreamDestination(); src.connect(dest)
    dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t))
  }
  const mime = ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
    .find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || ''
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: bitrate } : undefined)
  const chunks = []
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
  let wake = null
  try { wake = await navigator.wakeLock?.request('screen') } catch {}
  return new Promise((resolve, reject) => {
    let timer = null, cancelled = false
    const cleanup = () => {
      clearInterval(timer)
      try { wake && wake.release() } catch {}
      try { src && src.stop() } catch {}
      try { stream.getTracks().forEach((t) => t.stop()) } catch {}
      try { ac && ac.close() } catch {}
    }
    rec.onstop = () => {
      cleanup()
      if (cancelled) return reject(new Error('Cancelled'))
      resolve({ url: URL.createObjectURL(new Blob(chunks, { type: mime || 'video/webm' })), ext: mime.includes('mp4') ? 'mp4' : 'webm' })
    }
    rec.onerror = (e) => { cleanup(); reject(e.error || e) }
    rec.start(1000); if (src) src.start()
    const t0 = performance.now()
    const frame = () => {
      if (signal && signal.aborted) { cancelled = true; if (rec.state !== 'inactive') rec.stop(); return }
      const t = (performance.now() - t0) / 1000
      if (t >= total + 0.3) { clearInterval(timer); if (rec.state !== 'inactive') rec.stop(); return }
      draw(Math.min(t, total - 0.001))
      onProgress && onProgress(Math.min(1, t / total))
    }
    timer = setInterval(frame, Math.round(1000 / fps))
    frame()
  })
}

export async function buildVideo({ slides, audioFile, duration, W, H, onProgress, signal, blurBg = false, bitrate = 12000000, fps = 30 }) {
  try { await document.fonts.load(`64px 'Great Vibes'`); await document.fonts.load(`700 40px 'Cormorant Garamond'`) } catch {}
  // one pre-scaled copy + one background per unique photo (repeated slides share them)
  const fits = new Map(), bgs = new Map()
  const plain = blurBg ? null : prepPlain(W, H)
  slides.forEach((s) => {
    if (s.kind !== 'photo') return
    if (!fits.has(s.img)) { fits.set(s.img, prepFit(s.img, W, H)); bgs.set(s.img, blurBg ? prepBg(s.img, W, H) : plain) }
    s.fit = fits.get(s.img); s.bg = bgs.get(s.img)
  })
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'

  const total = duration || slides.reduce((a, s) => a + (s.dur || SLIDE), 0)
  const draw = makeFrameDrawer(ctx, slides, W, H, total)
  // higher bitrate than before: this is what removes the blocky look
  const hiBitrate = Math.max(bitrate, W >= 1080 || H >= 1080 ? 16000000 : 8000000)

  if (typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined') {
    try {
      return await encodeMp4({ canvas, draw, total, W, H, fps, bitrate: hiBitrate, audioFile, onProgress, signal })
    } catch (e) {
      if (e && e.message !== 'no-webcodecs') throw e
    }
  }
  return recordLive({ canvas, draw, audioFile, total, onProgress, signal, bitrate: hiBitrate, fps })
}