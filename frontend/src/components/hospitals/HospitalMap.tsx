import 'leaflet/dist/leaflet.css'
import { useEffect } from 'react'
import { Circle, CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet'
import type { Hospital, SearchCenter } from '../../api/hospitals'

// Default: OpenStreetMap's standard tiles — fine for development and light use, with attribution, no bulk or
// offline use, no SLA (operations.osmfoundation.org/policies/tiles). Set VITE_MAP_TILE_URL for production.
const TILE_URL = import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATTRIBUTION =
  import.meta.env.VITE_MAP_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

export interface HospitalMapProps {
  center: SearchCenter
  radiusKm: number
  hospitals: Hospital[]
  selectedId: string | null
  onSelect: (id: string) => void
  label: string
}

function FitToResults({ center, hospitals }: Pick<HospitalMapProps, 'center' | 'hospitals'>) {
  const map = useMap()
  useEffect(() => {
    const points: [number, number][] = [[center.lat, center.lon], ...hospitals.map((h) => [h.lat, h.lon] as [number, number])]
    if (points.length > 1) map.fitBounds(points, { padding: [24, 24], maxZoom: 15 })
    else map.setView(points[0], 13)
  }, [map, center, hospitals])
  return null
}

function FlyToSelected({ hospital }: { hospital: Hospital | undefined }) {
  const map = useMap()
  useEffect(() => {
    if (hospital) map.flyTo([hospital.lat, hospital.lon], Math.max(map.getZoom(), 15), { duration: 0.5 })
  }, [map, hospital])
  return null
}

export default function HospitalMap({ center, radiusKm, hospitals, selectedId, onSelect, label }: HospitalMapProps) {
  const selected = hospitals.find((h) => h.id === selectedId)
  return (
    <div role="region" aria-label={label} className="overflow-hidden rounded-xl border border-line bg-sage-50">
      <MapContainer center={[center.lat, center.lon]} zoom={13} scrollWheelZoom className="h-72 w-full sm:h-96 lg:h-[36rem]">
        <TileLayer url={TILE_URL} attribution={ATTRIBUTION} />
        <Circle center={[center.lat, center.lon]} radius={radiusKm * 1000} pathOptions={{ color: '#0f766e', weight: 1, fillOpacity: 0.04 }} />
        <CircleMarker center={[center.lat, center.lon]} radius={7} pathOptions={{ color: '#1d4ed8', fillColor: '#3b82f6', fillOpacity: 1 }} />
        {hospitals.map((h) => {
          const isSelected = h.id === selectedId
          return (
            <CircleMarker
              key={h.id}
              center={[h.lat, h.lon]}
              radius={isSelected ? 11 : 8}
              pathOptions={{
                color: isSelected ? '#b91c1c' : '#0f766e',
                fillColor: isSelected ? '#ef4444' : '#14b8a6',
                fillOpacity: 0.9,
                weight: 2,
              }}
              eventHandlers={{ click: () => onSelect(h.id) }}
            >
              <Tooltip>{h.name}</Tooltip>
            </CircleMarker>
          )
        })}
        <FitToResults center={center} hospitals={hospitals} />
        <FlyToSelected hospital={selected} />
      </MapContainer>
    </div>
  )
}
