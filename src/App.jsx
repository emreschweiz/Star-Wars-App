import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Route, Routes, useParams } from 'react-router-dom'
import './App.css'

const API_BASE = 'https://swapi.dev/api'
const FALLBACK_IMAGE = '/images/starship-fallback.jpg'
const IMAGE_DATA = '/starship-images.json'

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

const useStarshipImages = () => {
  const [imageMap, setImageMap] = useState({})

  useEffect(() => {
    let isActive = true
    const loadImages = async () => {
      try {
        const response = await fetch(IMAGE_DATA)
        if (!response.ok) throw new Error('Image data missing')
        const data = await response.json()
        if (isActive) setImageMap(data)
      } catch (err) {
        if (isActive) setImageMap({})
      }
    }

    loadImages()
    return () => {
      isActive = false
    }
  }, [])

  return imageMap
}

const StarshipList = ({ imageMap }) => {
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
          const imageSrc = imageMap[ship.name] || FALLBACK_IMAGE
          return (
            <Link
              key={ship.url}
              to={shipId ? `/starships/${shipId}` : '/'}
              className="card"
            >
              <img
                className="ship-image"
                src={imageSrc}
                alt={`${ship.name} görseli`}
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.onerror = null
                  event.currentTarget.src = FALLBACK_IMAGE
                }}
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

const StarshipDetail = ({ imageMap }) => {
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
          <div className="detail-image">
            <img
              src={imageMap[starship.name] || FALLBACK_IMAGE}
              alt={`${starship.name} görseli`}
              loading="lazy"
              onError={(event) => {
                event.currentTarget.onerror = null
                event.currentTarget.src = FALLBACK_IMAGE
              }}
            />
          </div>
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
  const imageMap = useStarshipImages()

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<StarshipList imageMap={imageMap} />} />
        <Route path="/starships/:id" element={<StarshipDetail imageMap={imageMap} />} />
      </Routes>
    </div>
  )
}

export default App
