import { ChevronDown, Plus } from 'lucide-react'
import type { CSSProperties } from 'react'
import { CUSTOMIZATION_PARAMETERS } from '../core/world'
import type { Composition, CustomizationParameter, WorldConfig } from '../core/world'
import type { QualityProfile } from '../core/storage'

const labels: Record<CustomizationParameter, { label: string; low: string; high: string }> = {
  vegetationSize: { label: 'Escala de vegetación', low: 'Pequeña', high: 'Gigante' },
  fragmentSize: { label: 'Fragmentos flotantes', low: 'Diminutos', high: 'Monumentales' },
  particleDensity: {
    label: 'Partículas ambientales',
    low: 'Sin partículas',
    high: 'Cielo estrellado',
  },
  animationSpeed: { label: 'Velocidad del movimiento', low: 'Inmóvil', high: 'Dinámico' },
  lightIntensity: { label: 'Intensidad de luz', low: 'Tenue', high: 'Radiante' },
}

export default function WorldCustomization({
  config,
  onChange,
  quality,
  onQualityChange,
}: {
  config: WorldConfig
  onChange: (config: WorldConfig) => void
  quality: QualityProfile
  onQualityChange: (quality: QualityProfile) => void
}) {
  return (
    <details className="advanced-settings customization-settings">
      <summary>
        Más personalización <Plus size={13} />
      </summary>
      <p className="customization-hint">Transforma este mundo sin cambiar su semilla.</p>
      <div className="control-field">
        <label htmlFor="composition">Composición</label>
        <div className="select-wrapper">
          <select
            id="composition"
            value={config.composition}
            onChange={(event) =>
              onChange({ ...config, composition: event.target.value as Composition })
            }
          >
            <option value="auto">Según la semilla</option>
            <option value="minimal">I · Esencial</option>
            <option value="balanced">II · Equilibrada</option>
            <option value="complex">III · Compleja</option>
          </select>
          <ChevronDown size={14} />
        </div>
      </div>
      {CUSTOMIZATION_PARAMETERS.map((key) => (
        <div className="control-field range-field" key={key}>
          <label htmlFor={key}>
            {labels[key].label}
            <output htmlFor={key}>
              {config[key]}
              <small>%</small>
            </output>
          </label>
          <input
            id={key}
            type="range"
            min="0"
            max="100"
            value={config[key]}
            style={{ '--range-progress': `${config[key]}%` } as CSSProperties}
            onChange={(event) => onChange({ ...config, [key]: Number(event.target.value) })}
          />
          <div className="range-labels">
            <span>{labels[key].low}</span>
            <span>{labels[key].high}</span>
          </div>
        </div>
      ))}
      <div className="control-field">
        <label htmlFor="quality-profile">Calidad gráfica</label>
        <div className="select-wrapper">
          <select
            id="quality-profile"
            value={quality}
            onChange={(event) => onQualityChange(event.target.value as QualityProfile)}
          >
            <option value="auto">Automática · Según pantalla</option>
            <option value="eco">Eco · Fluidez y ahorro</option>
            <option value="high">Alta · Sombras y máxima nitidez</option>
          </select>
          <ChevronDown size={14} />
        </div>
      </div>
    </details>
  )
}
