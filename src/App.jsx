import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Route, Routes, useParams } from 'react-router-dom'
import './App.css'

const API_BASE = 'https://swapi.dev/api'

const formatValue = (value) => {
  if (!value || value === 'unknown' || value === 'n/a') {
    return 'Bilinmiyor'
  }
  return value
}

const getStarshipId = (url) => {
  const match = url?.match(/\/starships\/(\d+)\/?$/)
  return match ? match[1] : null
}

const useFetch = (initialUrl) => {
  const [items, setItems] = useState([])
  const [nextUrl, setNextUrl] = useState(initialUrl)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasLoaded, setHasLoaded] = useState(false)

  const loadPage = useCallback(async (url, { append } = { append: false }) => {
    if (!url) return
    setLoading(true)
    setError('')
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('SWAPI isteği başarısız oldu.')
      }
      const data = await response.json()
      setItems((prev) => (append ? [...prev, ...data.results] : data.results))
      setNextUrl(data.next)
      setHasLoaded(true)
    } catch (err) {
      setError('Veriler alınamadı. Lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    items,
    nextUrl,
    loading,
    error,
    hasLoaded,
    loadPage,
    setItems,
    setNextUrl,
  }
}

const hashString = (value) => {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

const makeShipSvg = (name) => {
  const base = hashString(name || 'ship')
  const hue = base % 360
  const accent = `hsl(${hue}, 70%, 65%)`
  const accentDark = `hsl(${(hue + 24) % 360}, 50%, 30%)`
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${accentDark}"/>
          <stop offset="100%" stop-color="#0b0c12"/>
        </linearGradient>
        <radialGradient id="glow" cx="0.2" cy="0.1" r="0.8">
          <stop offset="0%" stop-color="${accent}" stop-opacity="0.7"/>
          <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="640" height="360" rx="24" fill="url(#g)"/>
      <rect width="640" height="360" rx="24" fill="url(#glow)"/>
      <g transform="translate(100 120)" fill="#e6e7f0">
        <path d="M60 30c40-30 160-40 260-10 30 9 60 27 80 46 12 12 20 30 20 44 0 18-10 36-26 46-36 22-96 30-178 22-70-7-134-28-170-48-24-14-34-32-34-47 0-19 16-39 48-53z" opacity="0.92"/>
        <path d="M120 70h100c20 0 40 8 52 18l24 18-32 16H140l-24-14c-8-5-12-12-12-18 0-11 8-20 16-20z" fill="#cfd3e6"/>
        <circle cx="300" cy="96" r="18" fill="${accent}"/>
        <rect x="40" y="96" width="60" height="18" rx="9" fill="${accent}"/>
      </g>
    </svg>
  `
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

const StarshipList = () => {
  const {
    items,
    nextUrl,
    loading,
    error,
    hasLoaded,
    loadPage,
  } = useFetch(`${API_BASE}/starships/`)
  const [query, setQuery] = useState('')
  const [activeQuery, setActiveQuery] = useState('')

  useEffect(() => {
    loadPage(`${API_BASE}/starships/`)
  }, [loadPage])

  const handleSubmit = (event) => {
    event.preventDefault()
    const trimmed = query.trim()
    setActiveQuery(trimmed)
    if (!trimmed) {
      loadPage(`${API_BASE}/starships/`)
      return
    }
    loadPage(`${API_BASE}/starships/?search=${encodeURIComponent(trimmed)}`)
  }

  const handleClear = () => {
    setQuery('')
    setActiveQuery('')
    loadPage(`${API_BASE}/starships/`)
  }

  const summaryLabel = useMemo(() => {
    if (!activeQuery) {
      return 'Galaktik filodaki yıldız gemileri'
    }
    return `"${activeQuery}" için bulunan yıldız gemileri`
  }, [activeQuery])

  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">SWAPI Explorer</p>
          <h1 className="logo-title">STAR WARS</h1>
          <p className="subtitle">{summaryLabel}</p>
        </div>
        <form className="search" onSubmit={handleSubmit}>
          <label htmlFor="searchInput">Name / Model</label>
          <div className="search-row">
            <input
              id="searchInput"
              type="search"
              placeholder="Name / Model"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button type="submit" disabled={loading}>
              Filter
            </button>
            <button
              type="button"
              className="ghost"
              onClick={handleClear}
              disabled={loading && !hasLoaded}
            >
              Temizle
            </button>
          </div>
        </form>
      </header>

      {error && <p className="state error">{error}</p>}
      {loading && !hasLoaded && <p className="state">Yükleniyor...</p>}

      <section className="grid">
        {items.map((ship) => {
          const shipId = getStarshipId(ship.url)
          return (
            <Link
              key={ship.url}
              to={shipId ? `/starships/${shipId}` : '/'}
              className="card"
            >
              <img
                className="ship-image"
                src={makeShipSvg(ship.name)}
                alt={`${ship.name} görseli`}
                loading="lazy"
              />
              <div className="card-body">
                <div>
                  <h2>{ship.name}</h2>
                  <p className="meta">Model: {ship.model}</p>
                </div>
                <div className="stats">
                  <div>
                    <span>Max hız</span>
                    <strong>{formatValue(ship.max_atmosphering_speed)}</strong>
                  </div>
                  <div>
                    <span>Mürettebat</span>
                    <strong>{formatValue(ship.crew)}</strong>
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </section>

      {!loading && hasLoaded && items.length === 0 && (
        <p className="state">Sonuç bulunamadı.</p>
      )}

      <div className="actions">
        {nextUrl && (
          <button onClick={() => loadPage(nextUrl, { append: true })} disabled={loading}>
            Daha Fazla
          </button>
        )}
      </div>
    </div>
  )
}

const StarshipDetail = () => {
  const { id } = useParams()
  const [starship, setStarship] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadDetail = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await fetch(`${API_BASE}/starships/${id}/`)
        if (!response.ok) {
          throw new Error('Detaylar alınamadı.')
        }
        const data = await response.json()
        setStarship(data)
      } catch (err) {
        setError('Detaylar alınamadı. Lütfen tekrar deneyin.')
      } finally {
        setLoading(false)
      }
    }

    loadDetail()
  }, [id])

  return (
    <div className="page">
      <header className="detail-hero">
        <Link to="/" className="back">
          ← Ana sayfaya dön
        </Link>
        {starship && (
          <>
            <h1>{starship.name}</h1>
            <p className="subtitle">{starship.model}</p>
          </>
        )}
      </header>

      {loading && <p className="state">Yükleniyor...</p>}
      {error && <p className="state error">{error}</p>}

      {starship && (
        <section className="detail-grid">
          <div className="detail-card">
            <h3>Üretici</h3>
            <p>{formatValue(starship.manufacturer)}</p>
          </div>
          <div className="detail-card">
            <h3>Yolcu Sayısı</h3>
            <p>{formatValue(starship.passengers)}</p>
          </div>
          <div className="detail-card">
            <h3>Maksimum Atmosfer Hızı</h3>
            <p>{formatValue(starship.max_atmosphering_speed)}</p>
          </div>
          <div className="detail-card">
            <h3>Mürettebat</h3>
            <p>{formatValue(starship.crew)}</p>
          </div>
          <div className="detail-card">
            <h3>Kargo Kapasitesi</h3>
            <p>{formatValue(starship.cargo_capacity)}</p>
          </div>
        </section>
      )}
    </div>
  )
}

function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<StarshipList />} />
        <Route path="/starships/:id" element={<StarshipDetail />} />
      </Routes>
    </div>
  )
}

export default App
