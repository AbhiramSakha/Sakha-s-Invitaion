import React, { useState } from 'react'
import { WEDDING } from './config.js'
import { useMedia, saveMedia, resizeFile, loadImg, buildVideo, closeStudio, audioDuration } from './Media.js'

export default function Studio() {
  const media = useMedia()
  const [msg, setMsg] = useState('')
  const [aspect, setAspect] = useState('portrait')
  const [audio, setAudio] = useState(null)
  const [audioDur, setAudioDur] = useState(0)
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`
  const pickAudio = async (file) => {
    setAudio(file || null); setAudioDur(0)
    if (!file) return
    try { setAudioDur(await audioDuration(file)) } catch { setMsg('Could not read this audio file. Try an mp3 or m4a.') }
  }
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)

  const [extras, setExtras] = useState(media.extras)
  const MAXX = 60
  const store = (next, ex) => {
    if (saveMedia({ ...next, extras: ex })) setMsg('')
    else if (saveMedia({ ...next, extras: [] })) setMsg('All photos are kept for this video, but there are too many to remember after you refresh.')
    else setMsg('Browser storage is full. Remove a photo and try again.')
  }
  const save = (next) => store(next, extras)
  const setSlot = async (key, file) => { if (file) save({ ...media, [key]: await resizeFile(file) }) }
  const addExtras = async (files) => {
    const list = [...files].slice(0, Math.max(0, MAXX - extras.length))
    const out = []
    for (let k = 0; k < list.length; k++) {
      setMsg(`Adding photo ${k + 1} of ${list.length}…`)
      try { out.push(await resizeFile(list[k], 1000)) } catch {}
    }
    const next = [...extras, ...out]
    setExtras(next); setMsg(''); store(media, next)
  }
  const removeExtra = (i) => { const next = extras.filter((_, j) => j !== i); setExtras(next); store(media, next) }
  const photoCount = (media.couple ? 1 : 0) + (media.bride ? 1 : 0) + (media.groom ? 1 : 0) + extras.length
  // Fit ALL photos inside the song length: title and ending get a few seconds, photos share the rest
  const plan = (dur, n) => {
    const td = Math.min(4, Math.max(2, dur * 0.1))
    const mid = Math.max(1, dur - 2 * td)
    const count = Math.max(n, Math.round(mid / 4.5))
    return { td, count, per: mid / count }
  }
  const makeVideo = async () => {
    setBusy(true); setResult(null); setProgress(0); setMsg('')
    try {
      const portrait = aspect === 'portrait'
      const W = portrait ? 720 : 1280, H = portrait ? 1280 : 720
      const when = `${WEDDING.dayName}, ${WEDDING.dateText}`
      const slides = [{ kind: 'text', lines: [
        { text: 'WE ARE GETTING MARRIED', size: 0.032, y: 0.22, color: '#f1d57a' },
        { text: 'Save the Date', size: 0.13, y: 0.36, script: true, color: '#f1d57a' },
        { text: WEDDING.bride, size: 0.05, y: 0.52 },
        { text: '&', size: 0.1, y: 0.59, script: true, color: '#f1d57a' },
        { text: WEDDING.groom, size: 0.05, y: 0.67 },
        { text: when, size: 0.042, y: 0.8, color: '#f1d57a' }] }]
      if (media.couple) slides.push({ kind: 'photo', img: await loadImg(media.couple), role: 'Together', name: '' })
      if (media.bride) slides.push({ kind: 'photo', img: await loadImg(media.bride), role: 'Bride', name: WEDDING.bride })
      if (media.groom) slides.push({ kind: 'photo', img: await loadImg(media.groom), role: 'Groom', name: WEDDING.groom })
      for (const x of extras) slides.push({ kind: 'photo', img: await loadImg(x), role: '', name: '' })
      slides.push({ kind: 'text', lines: [
        { text: 'With Love & Regards', size: 0.1, y: 0.3, script: true, color: '#f1d57a' },
        { text: WEDDING.venue, size: 0.055, y: 0.48 },
        { text: `${WEDDING.address}`, size: 0.038, y: 0.55, color: '#e6cfa8' },
        { text: when, size: 0.045, y: 0.67, color: '#f1d57a' },
        { text: 'Your presence will make it memorable', size: 0.034, y: 0.78, color: '#e6cfa8' }] })
      let seq = slides
      if (audioDur) {
        const title = slides[0], end = slides[slides.length - 1], photos = slides.slice(1, -1)
        if (photos.length) {
          const { td, count, per } = plan(audioDur, photos.length)
          seq = [{ ...title, dur: td }, ...Array.from({ length: count }, (_, k) => ({ ...photos[k % photos.length], dur: per })), { ...end, dur: td }]
        }
      }
      setResult(await buildVideo({ slides: seq, audioFile: audio, duration: audioDur || undefined, W, H, onProgress: setProgress }))
    } catch (e) { setMsg('Could not create the video: ' + (e?.message || 'unsupported browser. Try Chrome.')) }
    setBusy(false)
  }
  const close = closeStudio
  const hasPhotos = media.bride || media.groom || media.couple || extras.length

  const Slot = ({ k, label }) => (
    <div className="slot">
      <div className="thumb">{media[k] ? <img src={media[k]} alt={label} /> : <span>{label}</span>}</div>
      <label className="btn ghost sm">{media[k] ? 'Change' : 'Upload'}
        <input type="file" accept="image/*" hidden onChange={(e) => setSlot(k, e.target.files[0])} />
      </label>
      {media[k] && <>
        <a className="lnk" href={media[k]} download={`${k}.jpg`}>Download {k}.jpg</a>
        <button className="lnk" onClick={() => save({ ...media, [k]: null })}>Remove</button>
      </>}
    </div>
  )

  return (
    <div className="studio"><div className="s-in">
      <div className="s-top"><h1 className="script gold">Invitation Studio</h1><button className="btn ghost sm" onClick={close}>Close ✕</button></div>
      <p></p>
      {msg && <div className="s-msg">{msg}</div>}

      <div className="s-card">
        <h2>1 · Photos</h2>
        <div className="slots">
          <Slot k="bride" label="Bride" /><Slot k="groom" label="Groom" /><Slot k="couple" label="Couple (optional)" />
        </div>
        <h3>More photos for the video (up to 60)</h3>
        <div className="extras">
          {extras.map((x, i) => (
            <div className="ex" key={i}><img src={x} alt="" />
              <button onClick={() => removeExtra(i)}>×</button></div>
          ))}
          {extras.length < MAXX && <label className="ex add">＋<input type="file" accept="image/*" multiple hidden onChange={(e) => addExtras(e.target.files)} /></label>}
        </div>
      </div>

      <div className="s-card">
        <h2>2 · Create video</h2>
        <div className="s-row">
          <label><input type="radio" checked={aspect === 'portrait'} onChange={() => setAspect('portrait')} /> Portrait 9:16 (WhatsApp status, Reels)</label>
          <label><input type="radio" checked={aspect === 'landscape'} onChange={() => setAspect('landscape')} /> Landscape 16:9</label>
        </div>
        <p className="s-note">Optional music: choose an audio file you have the right to use (mp3, m4a or wav). The video length will match the song.</p>
        <input type="file" accept="audio/*" onChange={(e) => pickAudio(e.target.files[0])} />
        {audio && <p className="s-note">{audioDur
          ? <>🎵 Song length <b>{fmt(audioDur)}</b>. The video will be exactly this long.{photoCount > 0 && (() => { const p = plan(audioDur, photoCount); return ` All ${photoCount} photos are used, each shown for about ${p.per.toFixed(1)} seconds${p.count > photoCount ? ' (repeated to fill the song)' : ''}.` })()}{audioDur > 240 && ' Creating it takes as long as the song, so keep this tab open.'}</>
          : 'Reading song length…'}</p>}
        <div><button className="btn" disabled={busy || !hasPhotos || (audio && !audioDur)} onClick={makeVideo}>{busy ? `Creating… ${Math.round(progress * 100)}%` : '🎬 Create Video'}</button></div>
        {busy && <><div className="bar"><i style={{ width: progress * 100 + '%' }} /></div><p className="s-note">Keep this tab open and visible until it finishes.</p></>}
        {result && <div className="res">
          <video src={result.url} controls playsInline />
          <a className="btn" href={result.url} download={`wedding-invitation.${result.ext}`}>⬇ Download video (.{result.ext})</a>
          
        </div>}
      </div>
    </div></div>
  )
}