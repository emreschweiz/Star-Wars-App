import fs from 'node:fs/promises'
import path from 'node:path'

const SWAPI_BASE = 'https://swapi.dev/api/starships/'
const FANDOM_API = 'https://starwars.fandom.com/api.php'
const DATABANK_BASE = 'https://www.starwars.com/databank/'
const OUTPUT_PATH = path.join(process.cwd(), 'public', 'starship-images.json')

const fetchJson = async (url) => {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'star-wars-app/1.0 (image-mapper)' },
  })
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} for ${url}`)
  }
  return response.json()
}

const fetchText = async (url) => {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'star-wars-app/1.0 (image-mapper)' },
  })
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`)
  }
  return response.text()
}

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const extractDatabankImage = (html) => {
  const match = html.match(/https:\/\/lumiere-a\.akamaihd\.net\/[^"'\s)]+/i)
  return match ? match[0] : ''
}

const DATABANK_SLUG_OVERRIDES = {
  'CR90 corvette': 'cr90-corvette',
  'Sentinel-class landing craft': 'sentinel-class-landing-craft',
  'Y-wing': 'y-wing-starfighter',
  'X-wing': 'x-wing-starfighter',
  'TIE Advanced x1': 'tie-advanced-x1',
  'Rebel transport': 'rebel-transport',
  'Calamari Cruiser': 'mon-calamari-cruiser',
  'A-wing': 'a-wing-starfighter',
  'Droid control ship': 'droid-control-ship',
  'J-type diplomatic barge': 'j-type-diplomatic-barge',
  'Republic Assault ship': 'republic-assault-ship',
  'Trade Federation cruiser': 'trade-federation-cruiser',
  'Theta-class T-2c shuttle': 'theta-class-t-2c-shuttle',
  'Naboo star skiff': 'naboo-star-skiff',
  'Jedi Interceptor': 'jedi-interceptor',
  'arc-170': 'arc-170-starfighter',
  'Banking clan frigte': 'banking-clan-frigate',
  'Belbullab-22 starfighter': 'belbullab-22-starfighter',
  'V-wing': 'v-wing-starfighter',
}

const fetchDatabankImage = async (name) => {
  const override = DATABANK_SLUG_OVERRIDES[name]
  const slug = override || slugify(name)
  const candidates = [
    slug,
    slug.replace(/-class$/, ''),
    slug.replace(/-starfighter$/, ''),
    slug.replace(/-fighter$/, ''),
  ].filter(Boolean)

  for (const candidate of candidates) {
    try {
      const html = await fetchText(`${DATABANK_BASE}${candidate}`)
      const image = extractDatabankImage(html)
      if (image) return image
    } catch (err) {
      // try next candidate
    }
  }
  return ''
}

const fetchFandomImageByTitle = async (title) => {
  const url = `${FANDOM_API}?action=query&prop=pageimages&titles=${encodeURIComponent(
    title,
  )}&pithumbsize=900&piprop=thumbnail|original&format=json&origin=*`
  const data = await fetchJson(url)
  const pages = data?.query?.pages || {}
  const first = Object.values(pages)[0]
  return first?.thumbnail?.source || first?.original?.source || ''
}

const fetchFandomImage = async (name) => {
  const candidates = [
    name,
    `${name} (starship)`,
    `${name} (starship class)`,
    `${name} (Star Wars)`,
  ]

  for (const title of candidates) {
    try {
      const image = await fetchFandomImageByTitle(title)
      if (image) return image
    } catch (err) {
      // try next title
    }
  }

  try {
    const searchQueries = [
      `incategory:Starships ${name}`,
      `incategory:\"Starships\" ${name}`,
      `${name} starship`,
    ]
    for (const query of searchQueries) {
      const searchUrl = `${FANDOM_API}?action=query&list=search&srsearch=${encodeURIComponent(
        query,
      )}&srlimit=5&format=json&origin=*`
      const searchData = await fetchJson(searchUrl)
      const results = searchData?.query?.search || []
      for (const result of results) {
        const title = result.title
        const image = await fetchFandomImageByTitle(title)
        if (image) return image
      }
    }
  } catch (err) {
    // ignore search errors
  }

  return ''
}

const fetchAllStarships = async () => {
  const ships = []
  let nextUrl = SWAPI_BASE
  while (nextUrl) {
    const data = await fetchJson(nextUrl)
    ships.push(...data.results)
    nextUrl = data.next
  }
  return ships
}

const main = async () => {
  const ships = await fetchAllStarships()
  const mapping = {}

  for (const ship of ships) {
    const name = ship.name
    let image = ''
    try {
      image = await fetchFandomImage(name)
    } catch (err) {
      image = ''
    }
    if (!image) {
      image = await fetchDatabankImage(name)
    }

    if (!image) {
      image = ''
    }

    mapping[name] = image
    console.log(`${name}: ${image ? 'ok' : 'missing'}`)
  }

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true })
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(mapping, null, 2))
  console.log(`Wrote ${OUTPUT_PATH}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
