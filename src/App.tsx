import { lazy, Suspense, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  ChevronDown,
  Compass,
  Copy,
  Dices,
  Download,
  Expand,
  Eye,
  Heart,
  History,
  Layers3,
  Orbit,
  Pause,
  Play,
  Plus,
  Search,
  Share2,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Upload,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import {
  ARCHETYPES,
  archetypeInfo,
  DEFAULT_CONFIG,
  generateWorld,
  hashSeed,
  mutateWorld,
  newSeed,
  normalizeConfig,
  palettes,
  PALETTES,
  randomizeWorld,
} from './core/world'
import WorldCustomization from './components/WorldCustomization'
import type { Archetype, Atmosphere, WorldConfig } from './core/world'
import { AmbientSoundscape, CAMERA_VIEW_LABELS, CAMERA_VIEWS } from './core/audio'
import type { CameraView } from './core/audio'
import {
  configKey,
  createFavorite,
  createHistory,
  exportFavoritesJson,
  filterFavorites,
  importFavoritesJson,
  isValidArchetypeFilter,
  parseWorld,
  pushHistory,
  readFavorites,
  readQualityProfile,
  serializeWorld,
  stepHistory,
  writeFavorites,
  writeQualityProfile,
} from './core/storage'
import type { Favorite, HistoryState, QualityProfile } from './core/storage'

const WorldScene = lazy(() => import('./scene/WorldScene'))
function loadCollection() {
  try {
    return readFavorites(window.localStorage)
  } catch {
    return { favorites: [] as Favorite[], warning: 'El almacenamiento local no está disponible.' }
  }
}
function loadQuality(): QualityProfile {
  try {
    return readQualityProfile(window.localStorage)
  } catch {
    return 'auto'
  }
}
function Modal({
  title,
  children,
  onClose,
  className = '',
}: {
  title: string
  children: ReactNode
  onClose: () => void
  className?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current!
    dialog.showModal()
    return () => dialog.close()
  }, [])
  return (
    <dialog
      ref={ref}
      className={`modal ${className}`}
      aria-labelledby={titleId}
      {...({ closedby: 'any' } as Record<string, string>)}
      onClose={onClose}
      onCancel={onClose}
      onClick={(event) => {
        const dialog = ref.current
        if (!dialog || 'closedBy' in HTMLDialogElement.prototype) return
        if (event.target !== dialog) return
        const rect = dialog.getBoundingClientRect()
        const isDialogContent =
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width
        if (!isDialogContent) dialog.close()
      }}
    >
      <div className="modal-heading">
        <div>
          <span className="eyebrow">TU ATLAS PERSONAL</span>
          <h2 id={titleId}>{title}</h2>
        </div>
        <button className="icon-button" aria-label="Cerrar ventana" onClick={onClose}>
          <X size={19} />
        </button>
      </div>
      {children}
    </dialog>
  )
}

export default function App() {
  const [initial] = useState(() => ({
    link: parseWorld(location.search),
    collection: loadCollection(),
    quality: loadQuality(),
  }))
  const [config, setConfig] = useState<WorldConfig>(initial.link.config ?? DEFAULT_CONFIG)
  const [sessionHistory, setSessionHistory] = useState<HistoryState>(() =>
    createHistory(initial.link.config ?? DEFAULT_CONFIG),
  )
  const world = useMemo(() => generateWorld(config), [config])
  const palette = palettes[world.paletteId]
  const info = archetypeInfo[config.archetype]
  const [mode, setMode] = useState<Archetype | 'surprise'>(config.archetype)
  const [favorites, setFavorites] = useState<Favorite[]>(initial.collection.favorites)
  const [collectionOpen, setCollectionOpen] = useState(false)
  const [collectionFilter, setCollectionFilter] = useState<Archetype | 'all'>('all')
  const [collectionQuery, setCollectionQuery] = useState('')
  const [shareUrl, setShareUrl] = useState('')
  const [toast, setToast] = useState(initial.link.warning ?? initial.collection.warning ?? '')
  const [panelOpen, setPanelOpen] = useState(() => !matchMedia('(max-width: 760px)').matches)
  const [reducedMotion, setReducedMotion] = useState(
    () => matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  const [paused, setPaused] = useState(false)
  const [cameraReset, setCameraReset] = useState(0)
  const [cameraView, setCameraView] = useState<CameraView>('orbit')
  const [quality, setQuality] = useState<QualityProfile>(initial.quality)
  const [captureRequest, setCaptureRequest] = useState(0)
  const [audioEnabled, setAudioEnabled] = useState(false)
  const [seedDraft, setSeedDraft] = useState(config.seed)
  const soundscapeRef = useRef<AmbientSoundscape | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const saved = favorites.some((item) => item.id === configKey(config))
  const worldNumber = String(hashSeed(config.seed) % 10000).padStart(4, '0')
  const filteredFavorites = useMemo(
    () => filterFavorites(favorites, collectionFilter, collectionQuery),
    [favorites, collectionFilter, collectionQuery],
  )
  const canStepBack = sessionHistory.index > 0
  const canStepForward = sessionHistory.index < sessionHistory.entries.length - 1

  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    try {
      window.history.replaceState(
        null,
        '',
        `${location.pathname}?${serializeWorld(config)}${location.hash}`,
      )
    } catch {
      /* Sharing still builds a complete URL. */
    }
  }, [config])
  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(''), 6500)
    return () => clearTimeout(timeout)
  }, [toast])
  useEffect(() => {
    return () => {
      soundscapeRef.current?.dispose()
    }
  }, [])

  const motionPaused = paused || reducedMotion || config.animationSpeed === 0
  useEffect(() => {
    if (!audioEnabled) return
    soundscapeRef.current?.update(world, motionPaused)
  }, [audioEnabled, world, motionPaused])

  function updateConfig(next: WorldConfig, recordHistory = true) {
    const normalized = normalizeConfig(next)
    setConfig(normalized)
    setSeedDraft(normalized.seed)
    if (recordHistory) {
      setSessionHistory((prev) => pushHistory(prev, normalized))
    }
  }
  function navigateHistory(delta: -1 | 1) {
    const result = stepHistory(sessionHistory, delta)
    setSessionHistory(result.state)
    setConfig(result.config)
    setSeedDraft(result.config.seed)
    setMode(result.config.archetype)
    setCameraReset((value) => value + 1)
  }
  function generate() {
    const seed = newSeed()
    const archetype = mode === 'surprise' ? ARCHETYPES[hashSeed(seed) % ARCHETYPES.length] : mode
    updateConfig({ ...config, seed, archetype })
    setCameraReset((value) => value + 1)
  }
  function randomizeAll() {
    const next = randomizeWorld()
    updateConfig(next)
    setMode(next.archetype)
    setCameraReset((value) => value + 1)
    setToast('Todas las propiedades aleatorizadas. Un universo completamente nuevo.')
  }
  function changeArchetype(archetype: Archetype | 'surprise') {
    setMode(archetype)
    if (archetype !== 'surprise') {
      updateConfig({ ...config, archetype })
      setCameraReset((value) => value + 1)
    }
  }
  function changeQuality(next: QualityProfile) {
    setQuality(next)
    try {
      writeQualityProfile(localStorage, next)
    } catch {
      /* Ignore storage restrictions */
    }
  }
  function cycleCameraView() {
    const next = CAMERA_VIEWS[(CAMERA_VIEWS.indexOf(cameraView) + 1) % CAMERA_VIEWS.length]
    setCameraView(next)
    setToast(`${CAMERA_VIEW_LABELS[next]} activada.`)
  }
  function toggleAudio() {
    if (audioEnabled) {
      soundscapeRef.current?.stop()
      setAudioEnabled(false)
      setToast(' Paisaje sonoro desactivado.')
      return
    }
    if (!soundscapeRef.current) {
      soundscapeRef.current = new AmbientSoundscape()
    }
    const started = soundscapeRef.current.start(world, motionPaused)
    if (started) {
      setAudioEnabled(true)
      setToast('Paisaje sonoro generativo activado.')
    } else {
      setToast('El sintetizador de audio no está disponible en este navegador.')
    }
  }
  const handleCaptured = useCallback((success: boolean) => {
    setToast(
      success
        ? 'Postal descargada. Un recuerdo de este pequeño universo.'
        : 'No se pudo generar la captura del mundo.',
    )
  }, [])
  function exportCollection() {
    const json = exportFavoritesJson(favorites)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = 'impossible-atlas-coleccion.json'
    link.href = url
    link.click()
    URL.revokeObjectURL(url)
    setToast('Colección exportada en formato JSON.')
  }
  async function importCollection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const text = await file.text()
      const result = importFavoritesJson(text, favorites)
      if (result.warning && result.added === 0) {
        setToast(result.warning)
        return
      }
      persist(
        result.favorites,
        result.warning ??
          `Importación completada: ${result.added} ${result.added === 1 ? 'mundo añadido' : 'mundos añadidos'}.`,
      )
    } catch {
      setToast('No se pudo leer el archivo seleccionado.')
    }
  }
  function persist(next: Favorite[], message: string) {
    let warning: string | undefined
    try {
      warning = writeFavorites(localStorage, next)
    } catch {
      warning = 'El almacenamiento local no está disponible.'
    }
    if (warning) {
      setToast(warning)
      return
    }
    setFavorites(next)
    setToast(message)
  }
  function toggleFavorite() {
    if (saved)
      persist(
        favorites.filter((item) => item.id !== configKey(config)),
        'Mundo retirado de tu colección.',
      )
    else if (favorites.length >= 100)
      setToast('Tu atlas tiene 100 mundos. Elimina uno para guardar otro.')
    else
      persist([createFavorite(world), ...favorites], 'Un nuevo lugar en tu atlas. Mundo guardado.')
  }
  async function share() {
    const url = new URL(location.pathname, location.origin)
    url.search = serializeWorld(config)
    try {
      await navigator.clipboard.writeText(url.href)
      setToast('Enlace copiado. Comparte este pequeño universo.')
    } catch {
      setShareUrl(url.href)
    }
  }
  function openFavorite(favorite: Favorite) {
    updateConfig(favorite.config)
    setMode(favorite.config.archetype)
    setCollectionOpen(false)
    setCameraReset((value) => value + 1)
  }

  return (
    <main
      className="atlas-app"
      style={
        {
          '--world-accent': palette.accent,
          '--world-background': palette.background,
        } as React.CSSProperties
      }
    >
      <div className="ambient-glow" aria-hidden="true" />
      <header className="topbar">
        <a className="brand" href={location.pathname} aria-label="Impossible Atlas, inicio">
          <span className="brand-symbol">
            <Orbit strokeWidth={1.1} size={36} />
          </span>
          <span>
            IMPOSSIBLE
            <span className="brand-atlas">
              ATLAS<span className="brand-period">.</span>
            </span>
          </span>
        </a>
        <div className="header-caption">
          THE ART OF IMPOSSIBLE WORLDS<span>Un lugar que no debería existir.</span>
        </div>
        <nav className="header-actions" aria-label="Principal">
          <button
            className="collection-button"
            aria-label={`Mi colección, ${favorites.length} mundos`}
            onClick={() => setCollectionOpen(true)}
          >
            <Layers3 size={16} />
            <span>Mi colección</span>
            <span className="count">{favorites.length.toString().padStart(2, '0')}</span>
          </button>
          <button
            className={`icon-button panel-toggle ${panelOpen ? 'active' : ''}`}
            onClick={() => setPanelOpen(!panelOpen)}
            aria-expanded={panelOpen}
            aria-controls="world-controls"
            aria-label="Controles del mundo"
          >
            <SlidersHorizontal size={19} />
          </button>
        </nav>
      </header>

      <div className={`universe ${panelOpen ? 'with-panel' : ''}`}>
        <div className="scene-label">
          <span className="status-dot" />
          <span>EXPLORANDO LO IMPOSIBLE</span>
          <span className="scene-label-divider">/</span>
          <span className="world-code">N.º {worldNumber}</span>
        </div>
        <div className="scene-canvas">
          <Suspense
            fallback={
              <div className="scene-loading">
                <Orbit size={32} />
                <span>Trazando un universo…</span>
              </div>
            }
          >
            <WorldScene
              world={world}
              paused={motionPaused}
              reset={cameraReset}
              view={cameraView}
              quality={quality}
              captureRequest={captureRequest}
              onCaptured={handleCaptured}
            />
          </Suspense>
        </div>
        <div className="scene-grid" aria-hidden="true">
          <span>O</span>
          <i />
          <span>E</span>
        </div>
        <div className="scene-tools">
          <button
            className="icon-button"
            onClick={() => navigateHistory(-1)}
            disabled={!canStepBack}
            aria-label="Mundo anterior del historial"
            title="Mundo anterior del historial"
          >
            <ArrowLeft size={15} />
          </button>
          <button
            className="icon-button"
            onClick={() => navigateHistory(1)}
            disabled={!canStepForward}
            aria-label="Mundo siguiente del historial"
            title="Mundo siguiente del historial"
          >
            <ArrowRight size={15} />
          </button>
          <button
            className={`icon-button ${cameraView !== 'orbit' ? 'active' : ''}`}
            onClick={cycleCameraView}
            aria-label={`Cambiar encuadre (${CAMERA_VIEW_LABELS[cameraView]})`}
            title={`Encuadre: ${CAMERA_VIEW_LABELS[cameraView]}`}
          >
            <Eye size={15} />
          </button>
          <button
            className="icon-button"
            onClick={() => {
              setCameraView('orbit')
              setCameraReset((value) => value + 1)
            }}
            aria-label="Restablecer cámara"
            title="Restablecer cámara"
          >
            <Expand size={16} />
          </button>
          <button
            className="icon-button"
            onClick={() => setCaptureRequest((value) => value + 1)}
            aria-label="Capturar postal del mundo"
            title="Capturar postal PNG"
          >
            <Camera size={15} />
          </button>
          <button
            className={`icon-button ${audioEnabled ? 'active' : ''}`}
            onClick={toggleAudio}
            aria-pressed={audioEnabled}
            aria-label="Paisaje sonoro ambiental"
            title={audioEnabled ? 'Desactivar sonido ambiental' : 'Activar sonido ambiental'}
          >
            {audioEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>
          <button
            className="icon-button"
            onClick={() => setPaused(!paused)}
            disabled={reducedMotion || config.animationSpeed === 0}
            aria-pressed={motionPaused}
            aria-label="Pausar animaciones"
            title={
              reducedMotion
                ? 'Movimiento reducido del sistema activo'
                : config.animationSpeed === 0
                  ? 'Aumenta la velocidad del movimiento para animar el mundo'
                  : motionPaused
                    ? 'Reanudar animaciones'
                    : 'Pausar animaciones'
            }
          >
            {motionPaused ? <Play size={15} /> : <Pause size={15} />}
          </button>
        </div>
        <div className="world-caption" key={world.name}>
          <div className="world-category">
            <span>
              {info.index} / {info.name}
            </span>
            <span className="category-line" />
          </div>
          <h1>{world.name}</h1>
          <p>{world.description}</p>
          <div className="world-tags">
            <span>
              <Sparkles size={11} /> {world.anomalies.length} anomalías
            </span>
            <span>SEMILLA {config.seed}</span>
            {sessionHistory.entries.length > 1 && (
              <span>
                <History size={11} /> {sessionHistory.index + 1}/{sessionHistory.entries.length}
              </span>
            )}
          </div>
        </div>
        <div className="exploration-hint">
          <Compass size={16} strokeWidth={1.2} />
          <span>
            Arrastra para explorar <i>·</i> Desliza para acercarte
          </span>
        </div>
      </div>

      <aside
        className={`control-panel ${panelOpen ? 'is-open' : ''}`}
        id="world-controls"
        aria-label="Personalizar mundo"
        inert={!panelOpen}
      >
        <div className="panel-scroll">
          <div className="panel-heading">
            <span className="eyebrow">CADA MUNDO, UNA POSIBILIDAD</span>
            <h2>
              Lo extraordinario
              <br />
              empieza aquí.
            </h2>
            <button
              className="icon-button mobile-close"
              aria-label="Cerrar controles"
              onClick={() => setPanelOpen(false)}
            >
              <X size={18} />
            </button>
          </div>
          <div className="control-field">
            <label htmlFor="archetype">
              <span>01</span> Tipo de mundo
            </label>
            <div className="select-wrapper">
              <select
                id="archetype"
                value={mode}
                onChange={(event) => changeArchetype(event.target.value as Archetype | 'surprise')}
              >
                <option value="surprise">✦ Sorpréndeme</option>
                {ARCHETYPES.map((type) => (
                  <option key={type} value={type}>
                    {archetypeInfo[type].label}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} />
            </div>
            <p className="field-hint">
              {mode === 'surprise' ? 'Una nueva familia en cada generación.' : info.short}
            </p>
          </div>
          <div className="archetype-navigation" role="group" aria-label="Recorrer tipos de mundo">
            <span>{ARCHETYPES.length} FAMILIAS POR DESCUBRIR</span>
            <button
              type="button"
              className="icon-button"
              aria-label="Tipo de mundo anterior"
              onClick={() =>
                changeArchetype(
                  ARCHETYPES[
                    (ARCHETYPES.indexOf(config.archetype) + ARCHETYPES.length - 1) %
                      ARCHETYPES.length
                  ],
                )
              }
            >
              <ArrowLeft size={13} />
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label="Siguiente tipo de mundo"
              onClick={() =>
                changeArchetype(
                  ARCHETYPES[(ARCHETYPES.indexOf(config.archetype) + 1) % ARCHETYPES.length],
                )
              }
            >
              <ArrowRight size={13} />
            </button>
          </div>
          <div className="control-field range-field">
            <label htmlFor="surrealism">
              <span>02</span> Surrealismo{' '}
              <output htmlFor="surrealism">
                {config.surrealism}
                <small>%</small>
              </output>
            </label>
            <input
              id="surrealism"
              type="range"
              min="0"
              max="100"
              value={config.surrealism}
              style={{ '--range-progress': `${config.surrealism}%` } as React.CSSProperties}
              onChange={(event) => setConfig({ ...config, surrealism: Number(event.target.value) })}
            />
            <div className="range-labels">
              <span>Un poco extraño</span>
              <span>Sin límites</span>
            </div>
          </div>
          <div className="control-field range-field">
            <label htmlFor="density">
              <span>03</span> Densidad{' '}
              <output htmlFor="density">
                {config.density}
                <small>%</small>
              </output>
            </label>
            <input
              id="density"
              type="range"
              min="0"
              max="100"
              value={config.density}
              style={{ '--range-progress': `${config.density}%` } as React.CSSProperties}
              onChange={(event) => setConfig({ ...config, density: Number(event.target.value) })}
            />
            <div className="range-labels">
              <span>Contemplativo</span>
              <span>Exuberante</span>
            </div>
          </div>
          <div className="control-field palette-field">
            <label>
              <span>04</span> Paleta de color{' '}
              <small>
                {config.palette === 'auto' ? 'Automática' : palettes[config.palette].name}
              </small>
            </label>
            <div className="palette-options" role="group" aria-label="Paleta de color">
              {PALETTES.map((id) => (
                <button
                  key={id}
                  className={`palette-swatch ${config.palette === id ? 'selected' : ''}`}
                  onClick={() => setConfig({ ...config, palette: id })}
                  aria-label={palettes[id].name}
                  aria-pressed={config.palette === id}
                  title={palettes[id].name}
                  style={{
                    background: `linear-gradient(135deg, ${palettes[id].ground} 0% 48%, ${palettes[id].foliage} 49% 73%, ${palettes[id].accent} 74%)`,
                  }}
                >
                  {config.palette === id && <Check size={15} />}
                </button>
              ))}
              <button
                className={`palette-auto ${config.palette === 'auto' ? 'selected' : ''}`}
                onClick={() => setConfig({ ...config, palette: 'auto' })}
                aria-label="Paleta automática"
                aria-pressed={config.palette === 'auto'}
                title="Paleta automática"
              >
                <Shuffle size={14} />
              </button>
            </div>
          </div>
          <WorldCustomization
            config={config}
            onChange={(next) => updateConfig(next, false)}
            quality={quality}
            onQualityChange={changeQuality}
          />
          <details className="advanced-settings">
            <summary>
              Coordenadas y atmósfera <Plus size={13} />
            </summary>
            <form
              onSubmit={(event) => {
                event.preventDefault()
                updateConfig({
                  ...config,
                  seed: seedDraft.trim().slice(0, 80) || DEFAULT_CONFIG.seed,
                })
                setCameraReset((value) => value + 1)
              }}
            >
              <label htmlFor="seed">Semilla reproducible</label>
              <div className="seed-input">
                <input
                  id="seed"
                  value={seedDraft}
                  maxLength={80}
                  onChange={(event) => setSeedDraft(event.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
                <button type="submit" className="icon-button" aria-label="Aplicar semilla">
                  <ArrowRight size={15} />
                </button>
              </div>
            </form>
            <label htmlFor="atmosphere">Atmósfera</label>
            <select
              id="atmosphere"
              value={config.atmosphere}
              onChange={(event) =>
                setConfig({ ...config, atmosphere: event.target.value as Atmosphere })
              }
            >
              <option value="dusk">Crepúsculo</option>
              <option value="dawn">Amanecer</option>
              <option value="nebula">Nebulosa</option>
            </select>
          </details>
          <div className="panel-note">
            <span>✳</span>
            <p>
              No hay destino correcto.
              <br />
              Solo lugares por descubrir.
            </p>
          </div>
        </div>
        <div className="panel-primary-action">
          <button className="generate-button" onClick={generate}>
            <Dices size={18} />
            <span>Generar mundo</span>
            <ArrowRight size={18} />
          </button>
          <button
            className="randomize-button"
            onClick={randomizeAll}
            title="Aleatorizar semilla, tipo de mundo y todos los ajustes"
          >
            <Shuffle size={16} />
            <span>Aleatorizar todo</span>
            <Sparkles size={15} />
          </button>
          <p className="generation-footnote">UN NUEVO UNIVERSO, A UN CLIC.</p>
        </div>
      </aside>

      <div className={`bottom-dock ${panelOpen ? 'with-panel' : ''}`}>
        <div className="world-actions">
          <button onClick={() => updateConfig(mutateWorld(config))}>
            <Shuffle size={16} />
            <span>Mutar</span>
          </button>
          <span className="action-divider" />
          <button onClick={toggleFavorite} className={saved ? 'is-saved' : ''} aria-pressed={saved}>
            <Heart size={16} fill={saved ? 'currentColor' : 'none'} />
            <span>{saved ? 'Guardado' : 'Guardar'}</span>
          </button>
          <span className="action-divider" />
          <button onClick={() => setCaptureRequest((value) => value + 1)}>
            <Camera size={16} />
            <span>Postal</span>
          </button>
          <span className="action-divider" />
          <button onClick={() => void share()}>
            <Share2 size={16} />
            <span>Compartir</span>
          </button>
        </div>
        <button
          className="dock-generate"
          onClick={generate}
          aria-label="Generar mundo"
          title="Generar mundo"
        >
          <ArrowRight size={20} />
        </button>
      </div>
      <footer className="site-footer">
        <span>UN ATLAS DE LO QUE NO EXISTE.</span>
        <span className="footer-center">
          <span className="status-dot" /> GENERADO AQUÍ. EXPLORADO POR TI.
        </span>
        <span>
          VOL. 001 <ArrowDown size={11} />
        </span>
      </footer>
      <div className={`toast ${toast ? 'visible' : ''}`} role="status" aria-live="polite">
        {toast && (
          <>
            <span>{toast}</span>
            <button onClick={() => setToast('')} aria-label="Cerrar mensaje">
              <X size={14} />
            </button>
          </>
        )}
      </div>

      {collectionOpen && (
        <Modal
          title="Lugares para volver."
          onClose={() => setCollectionOpen(false)}
          className="collection-modal"
        >
          <p className="modal-intro">
            Pequeños universos que decidiste conservar. Guardados en este navegador o exportables en
            JSON.
          </p>
          {favorites.length > 0 && (
            <div className="collection-toolbar">
              <div className="collection-search">
                <Search size={14} />
                <input
                  type="search"
                  aria-label="Buscar en la colección por nombre o semilla"
                  placeholder="Buscar nombre o semilla…"
                  value={collectionQuery}
                  onChange={(event) => setCollectionQuery(event.target.value)}
                />
              </div>
              <div className="select-wrapper collection-filter">
                <select
                  aria-label="Filtrar por familia de mundo"
                  value={collectionFilter}
                  onChange={(event) => {
                    const value = event.target.value
                    if (isValidArchetypeFilter(value)) setCollectionFilter(value)
                  }}
                >
                  <option value="all">Todas las familias ({favorites.length})</option>
                  {ARCHETYPES.map((type) => (
                    <option key={type} value={type}>
                      {archetypeInfo[type].label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} />
              </div>
            </div>
          )}
          {favorites.length === 0 ? (
            <div className="empty-state">
              <Layers3 size={40} strokeWidth={1} />
              <h3>Tu atlas aún está por escribir.</h3>
              <p>Explora un mundo y pulsa Guardar, o importa una colección existente.</p>
              <button className="text-button" onClick={() => setCollectionOpen(false)}>
                Seguir explorando <ArrowRight size={15} />
              </button>
            </div>
          ) : filteredFavorites.length === 0 ? (
            <div className="empty-state">
              <Search size={34} strokeWidth={1} />
              <h3>Ningún mundo coincide con este filtro.</h3>
              <p>Prueba con otra familia o limpia la búsqueda.</p>
              <button
                className="text-button"
                onClick={() => {
                  setCollectionFilter('all')
                  setCollectionQuery('')
                }}
              >
                Mostrar todos los mundos
              </button>
            </div>
          ) : (
            <div className="favorite-grid">
              {filteredFavorites.map((favorite) => {
                const favoriteWorld = generateWorld(favorite.config)
                const favoritePalette = palettes[favoriteWorld.paletteId]
                return (
                  <article className="favorite-card" key={favorite.id}>
                    <button className="favorite-open" onClick={() => openFavorite(favorite)}>
                      <div
                        className={`favorite-art art-${favorite.config.archetype}`}
                        style={
                          {
                            '--card-ground': favoritePalette.ground,
                            '--card-foliage': favoritePalette.foliage,
                            '--card-background': favoritePalette.background,
                            '--card-accent': favoritePalette.accent,
                          } as React.CSSProperties
                        }
                      >
                        <span />
                        <i />
                        <b />
                        <em />
                        <small>{archetypeInfo[favorite.config.archetype].index}</small>
                      </div>
                      <div className="favorite-text">
                        <span className="eyebrow">
                          {archetypeInfo[favorite.config.archetype].name}
                        </span>
                        <h3>{favorite.name}</h3>
                        <p>
                          {new Date(favorite.savedAt).toLocaleDateString('es-CL')}{' '}
                          <ArrowRight size={14} />
                        </p>
                      </div>
                    </button>
                    <button
                      className="favorite-delete icon-button"
                      aria-label={`Eliminar ${favorite.name}`}
                      onClick={() =>
                        persist(
                          favorites.filter((item) => item.id !== favorite.id),
                          'Mundo eliminado de la colección.',
                        )
                      }
                    >
                      <Trash2 size={14} />
                    </button>
                  </article>
                )
              })}
            </div>
          )}
          <div className="collection-footer">
            <span>{favorites.length} / 100 mundos guardados</span>
            <div className="collection-io">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                hidden
                onChange={(event) => void importCollection(event)}
              />
              <button
                type="button"
                className="text-button"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={13} /> Importar JSON
              </button>
              {favorites.length > 0 && (
                <button type="button" className="text-button" onClick={exportCollection}>
                  <Download size={13} /> Exportar JSON
                </button>
              )}
              <button className="text-button" onClick={() => setCollectionOpen(false)}>
                <ArrowLeft size={14} /> Volver al mundo
              </button>
            </div>
          </div>
        </Modal>
      )}
      {shareUrl && (
        <Modal title="Un universo para compartir." onClose={() => setShareUrl('')}>
          <p className="modal-intro">
            Copia el enlace completo. Incluye la semilla, los parámetros y la versión del generador.
          </p>
          <label className="share-label" htmlFor="share-link">
            <Copy size={14} /> Enlace reproducible
          </label>
          <input
            id="share-link"
            className="share-input"
            value={shareUrl}
            readOnly
            onFocus={(event) => event.target.select()}
            autoFocus
          />
          <button className="text-button" onClick={() => setShareUrl('')}>
            Listo <Check size={15} />
          </button>
        </Modal>
      )}
    </main>
  )
}
