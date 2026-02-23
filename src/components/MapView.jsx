import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MARKER_ICONS } from './LocationPicker';
import 'leaflet/dist/leaflet.css';

/* ── Auto-fit bounds to markers ──────────────────────────────── */
function FitBounds({ markers, polygons }) {
  const map = useMap();
  useEffect(() => {
    const points = [];
    markers?.forEach(m => { if (m.lat && m.lng) points.push([m.lat, m.lng]); });
    polygons?.forEach(p => { p.coords?.forEach(c => points.push(c)); });
    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds.pad(0.15), { maxZoom: 15, duration: 0.8 });
    }
  }, [markers, polygons, map]);
  return null;
}

/* ══════════════════════════════════════════════════════════════
   MapView — read-only map with markers, popups & polygons
   Props:
     markers   — [{ lat, lng, type, label, popup, id }]
     polygons  — [{ coords: [[lat,lng],...], color, label }]
     center    — [lat, lng] (default UAE)
     zoom      — initial zoom (default 10)
     height    — CSS height (default 400)
     onMarkerClick(marker) — callback
   ══════════════════════════════════════════════════════════════ */
export default function MapView({
  markers = [], polygons = [],
  center = [25.2048, 55.2708], zoom = 10,
  height = 400, onMarkerClick,
}) {
  return (
    <div className="mapview-container" style={{ height }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%', borderRadius: 12, zIndex: 1 }}
        scrollWheelZoom={true}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap'
        />
        <FitBounds markers={markers} polygons={polygons} />

        {/* Polygon overlays */}
        {polygons.map((poly, i) => (
          poly.coords?.length > 2 && (
            <Polygon
              key={`poly-${i}`}
              positions={poly.coords}
              pathOptions={{
                color: poly.color || '#3b82f6',
                fillColor: poly.color || '#3b82f6',
                fillOpacity: 0.15,
                weight: 2.5,
                dashArray: poly.dashed ? '6 4' : null,
              }}
            >
              {poly.label && (
                <Popup>
                  <div className="map-popup">
                    <strong>{poly.label}</strong>
                  </div>
                </Popup>
              )}
            </Polygon>
          )
        ))}

        {/* Markers */}
        {markers.map((m, i) => {
          if (!m.lat || !m.lng) return null;
          const icon = MARKER_ICONS[m.type] || MARKER_ICONS.delivery;
          return (
            <Marker
              key={m.id || `m-${i}`}
              position={[parseFloat(m.lat), parseFloat(m.lng)]}
              icon={icon}
              eventHandlers={{
                click: () => onMarkerClick?.(m),
              }}
            >
              {m.popup && (
                <Popup>
                  <div className="map-popup">
                    {m.popup}
                  </div>
                </Popup>
              )}
            </Marker>
          );
        })}

        {/* Empty state overlay */}
        {markers.length === 0 && polygons.length === 0 && (
          <div className="mapview-empty-overlay">
            <span>No locations to display</span>
          </div>
        )}
      </MapContainer>
    </div>
  );
}
