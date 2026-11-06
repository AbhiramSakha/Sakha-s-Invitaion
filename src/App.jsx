import React, { useEffect, useRef, useState } from 'react'
import { WEDDING } from './config.js'
import Studio from './Studio.jsx'
import { useMedia, useIsStudio, openStudio } from './media.js'

const MAP = 'https://www.google.com/maps/search/?api=1&query=Surya+Convention+Hall+Samalkot'
const CAL =
  'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' +
  encodeURIComponent('Wedding of Ganga Uma Maheswari & Venkatesh') +
  '&dates=20261213/20261214&location=' +
  encodeURIComponent('Surya Convention Hall, Near Lorry Stand, Samalkot')

function Reveal({ children, delay = 0 }) {
  const ref = useRef(null)
  const [on, setOn] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!('IntersectionObserver' in window)) return setOn(true)
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setOn(true); io.disconnect() }
    }, { threshold: 0.15 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div ref={ref} className={'rv ' + (on ? 'in' : '')} style={{ transitionDelay: delay + 'ms' }}>
      {children}
    </div>
  )
}

function Petals() {
  const colors = ['#f59e0b', '#fb923c', '#ec4899', '#f472b6', '#fbbf24']
  const [items] = useState(() =>
    Array.from({ length: 16 }, (_, i) => ({
      left: Math.random() * 100, size: 10 + Math.random() * 12, dur: 11 + Math.random() * 12,
      delay: -Math.random() * 20, dx: (Math.random() - 0.5) * 160, c: colors[i % colors.length],
    }))
  )
  return (
    <div id="petals" aria-hidden="true">
      {items.map((p, i) => (
        <span key={i} className="petal"
          style={{ left: p.left + '%', width: p.size, height: p.size, background: p.c,
            animationDuration: p.dur + 's', animationDelay: p.delay + 's', '--dx': p.dx + 'px' }} />
      ))}
    </div>
  )
}

function Intro({ open, onOpen }) {
  return (
    <div className={'intro' + (open ? ' open' : '')}>
      <div className="lamp">🪔</div>
      <div style={{ letterSpacing: '.3em', fontSize: '.9rem', textTransform: 'uppercase', opacity: 0.8 }}>
        Save the Date
      </div>
      <h1 className="script gold">Uma &amp; Venkatesh</h1>
      <div style={{ opacity: 0.9, letterSpacing: '.12em' }}>{WEDDING.dayName}, {WEDDING.dateText}</div>
      <button className="btn" onClick={onOpen}>Open Invitation</button>
    </div>
  )
}

function useSources(list) {
  const [idx, setIdx] = useState(0)
  const key = list.filter(Boolean).join('|')
  useEffect(() => setIdx(0), [key])
  const srcs = list.filter(Boolean)
  return [srcs[idx], () => setIdx((i) => i + 1)]
}

function CouplePhoto({ extra, alt }) {
  const [img, next] = useSources([extra, ...WEDDING.coupleImg])
  if (!img) return null
  return (
    <div className="cframe"><div className="cphoto">
      <img key={img} src={img} alt={alt} onError={next} />
    </div></div>
  )
}

function NameCard({ role, name, initial, uploaded, files }) {
  const [img, next] = useSources([uploaded, ...files])
  return (
    <div className="person">
      {img
        ? <div className="frame"><div className="photo"><img key={img} src={img} alt={name} onError={next} /></div></div>
        : <div className="initial script gold">{initial}</div>}
      <span className="tag">{role}</span>
      <h3>{name}</h3>
    </div>
  )
}

function VideoSection() {
  const [ok, setOk] = useState(true)
  const list = WEDDING.video || []
  if (!list.length) return null
  return (
    <section style={{ display: ok ? '' : 'none' }}>
      <Reveal>
        <h2 className="script gold">Our Invitation Video</h2><div className="orn">❖</div>
        <video className="vid" controls playsInline preload="metadata">
          {list.map((s, i) => <source key={s} src={s} onError={i === list.length - 1 ? () => setOk(false) : undefined} />)}
        </video>
      </Reveal>
    </section>
  )
}

function Countdown() {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  if (WEDDING.date - now <= 0)
    return <h3 className="script gold" style={{ fontSize: '3rem' }}>Today is the big day 🎉</h3>
  const s = Math.floor((WEDDING.date - now) / 1000)
  const v = [['Days', Math.floor(s / 86400)], ['Hours', Math.floor((s % 86400) / 3600)],
    ['Minutes', Math.floor((s % 3600) / 60)], ['Seconds', s % 60]]
  return (
    <div className="cd">
      {v.map(([l, n]) => (
        <div key={l}><b className="gold">{String(n).padStart(2, '0')}</b><span>{l}</span></div>
      ))}
    </div>
  )
}

export default function App() {
  const [open, setOpen] = useState(false)
  const [toast, setToast] = useState('')
  const media = useMedia()
  const studio = useIsStudio()
  const daysLeft = Math.ceil((WEDDING.date - new Date()) / 86400000)
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const openInvite = () => {
    setOpen(true)
    const el = audioRef.current
    if (el) el.play().then(() => setPlaying(true)).catch(() => {})
  }
  const toggleMusic = () => {
    const el = audioRef.current
    if (!el) return
    if (el.paused) { el.play(); setPlaying(true) } else { el.pause(); setPlaying(false) }
  }
  useEffect(() => { document.body.style.overflow = open ? '' : 'hidden' }, [open])

  const share = async () => {
    const data = {
      title: 'Wedding Invitation',
      text: 'You are invited to the wedding of Ganga Uma Maheswari & Venkatesh on 13 December 2026.',
      url: location.href,
    }
    try { if (navigator.share) return await navigator.share(data) } catch { return }
    try {
      await navigator.clipboard.writeText(location.href)
      setToast('Link copied'); setTimeout(() => setToast(''), 2200)
    } catch {}
  }

  return (
    <>
      <Intro open={open} onOpen={openInvite} />
      <Petals />
      <main>
        <header className="hero">
          <div style={{ fontSize: '2.6rem' }}>🪔</div>
          <p className="sub">With the blessings of our beloved families</p>
          <p className="sub">We cordially invite you to the</p>
          <h1 className="script gold">Wedding Ceremony</h1>
          <div className="names">
            {WEDDING.bride} <span className="script gold" style={{ fontSize: '1.6em' }}>&amp;</span> {WEDDING.groom}
          </div>
          <div className="std-label script gold">Save the Date</div>
          <div className="datechip">📅 {WEDDING.dayName}, {WEDDING.dateText}{WEDDING.time && ` · ${WEDDING.time}`}</div>
          <div className="dateline">Wedding Date · 13-12-2026</div>
          <p style={{ maxWidth: 520, marginTop: 22, color: 'var(--muted)', fontStyle: 'italic' }}>
            Your gracious presence will make our celebrations more memorable…
          </p>
          <div className="scroll">SCROLL ↓</div>
        </header>

        <section>
          <Reveal><h2 className="script gold">The Bride &amp; Groom</h2><div className="orn">❖</div></Reveal>
          <Reveal><CouplePhoto extra={media.couple} alt="Bride and Groom" /></Reveal>
          <div className="pair">
            <Reveal><NameCard role="Bride" name={WEDDING.bride} initial="G" uploaded={media.bride} files={WEDDING.brideImg} /></Reveal>
            <Reveal delay={150}><NameCard role="Groom" name={WEDDING.groom} initial="V" uploaded={media.groom} files={WEDDING.groomImg} /></Reveal>
          </div>
        </section>

        <section>
          <Reveal>
            <h2 className="script gold">Save the Date</h2><div className="orn">❖</div>
            <div className="std">
              <div className="std-side"><small>Day</small>{WEDDING.dayName}</div>
              <div className="std-mid">
                <span>December</span>
                <b className="gold">13</b>
                <span>2026</span>
              </div>
              <div className="std-side"><small>Venue</small>Samalkot</div>
            </div>
            {daysLeft > 0 && <div className="chip">⏳ {daysLeft} {daysLeft === 1 ? 'day' : 'days'} to go</div>}
            <p style={{ margin: '22px 0 0', color: 'var(--muted)' }}>The wedding ceremony takes place on {WEDDING.dayName}, {WEDDING.dateText}. Please mark your calendar and join us in celebrating.</p>
            <a className="btn" href={CAL} target="_blank" rel="noopener noreferrer">🗓 Save to Calendar</a>
          </Reveal>
        </section>

        <section>
          <Reveal><h2 className="script gold">Counting Down</h2><div className="orn">❖</div><Countdown /></Reveal>
        </section>

        <VideoSection />

        <section>
          <Reveal>
            <h2 className="script gold">Wedding Venue</h2><div className="orn">❖</div>
            <div className="venue">
              <div style={{ fontSize: '2.4rem' }}>🛕</div>
              <h3>{WEDDING.venue}</h3>
              <p>{WEDDING.address}<br />{WEDDING.state}</p>
              <p><b>Wedding Date: {WEDDING.dayName}, {WEDDING.dateText}</b>{WEDDING.time && <><br />Time: {WEDDING.time}</>}</p>
              <div className="row">
                <a className="btn" href={MAP} target="_blank" rel="noopener noreferrer">📍 Get Directions</a>
                <a className="btn ghost" href={CAL} target="_blank" rel="noopener noreferrer">🗓 Add to Calendar</a>
                <button className="btn ghost" onClick={share}>↗ Share Invitation</button>
              </div>
            </div>
          </Reveal>
        </section>

        {WEDDING.showStudioButton && (
          <section>
            <Reveal>
              <div className="cta">
                <div className="cta-ico">🎬</div>
                <h3>Want to create a video?</h3>
                <p>Upload the bride and groom photos, add your favourite song and make a wedding invitation video in a few clicks.</p>
                <button className="btn" onClick={openStudio}>🎬 Create Video →</button>
              </div>
            </Reveal>
          </section>
        )}

        <footer>
          <Reveal>
            <div className="script gold">With Love &amp; Regards</div>
            <p>Sakha &amp; Burra Families</p>
          </Reveal>
        </footer>
      </main>
      {WEDDING.bgMusic && <audio ref={audioRef} src={WEDDING.bgMusic} loop preload="none" />}
      {WEDDING.bgMusic && open && <button className="mute" onClick={toggleMusic} aria-label="Toggle music">{playing ? '🔊' : '🔇'}</button>}
      {studio && <Studio />}
      {toast && <div className="toast">{toast}</div>}
    </>
  )
}