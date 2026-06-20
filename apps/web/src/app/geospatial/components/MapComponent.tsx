import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leaflet icon loading issue in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Safe dynamic import for leaflet.heat
if (typeof window !== 'undefined') {
  (window as any).L = L;
  require('leaflet.heat');
}

function HeatmapLayer({ points }: { points: [number, number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (!points || points.length === 0) return;
    const heat = (L as any).heatLayer(points, { radius: 25, blur: 15 }).addTo(map);
    return () => { map.removeLayer(heat); };
  }, [map, points]);
  return null;
}

interface MapComponentProps {
  data: any[];
  latColumn: string;
  lngColumn: string;
  metricColumn: string;
  layerType: 'markers' | 'heatmap' | 'choropleth';
  geoJsonData: any;
}

export default function MapComponent({ data, latColumn, lngColumn, metricColumn, layerType, geoJsonData }: MapComponentProps) {
  const points: [number, number, number][] = [];
  
  if ((layerType === 'markers' || layerType === 'heatmap') && latColumn && lngColumn) {
    data.forEach(row => {
      const lat = parseFloat(row[latColumn]);
      const lng = parseFloat(row[lngColumn]);
      if (!isNaN(lat) && !isNaN(lng)) {
        const intensity = metricColumn ? parseFloat(row[metricColumn]) || 1 : 1;
        points.push([lat, lng, intensity]);
      }
    });
  }

  // Determine initial center
  let center: [number, number] = [-0.789275, 113.921327]; // Default to Indonesia
  if (points.length > 0) {
    center = [points[0][0], points[0][1]];
  } else if (geoJsonData && geoJsonData.features && geoJsonData.features.length > 0) {
    // Approx center for GeoJSON
    try {
      const coords = geoJsonData.features[0].geometry.coordinates[0][0];
      if (Array.isArray(coords)) {
        center = [coords[1], coords[0]]; // [lat, lng]
      }
    } catch (e) {}
  }

  const getStyle = (feature: any) => {
    return {
      fillColor: '#10b981', // emerald
      weight: 2,
      opacity: 1,
      color: 'white',
      fillOpacity: 0.5
    };
  };

  return (
    <MapContainer center={center} zoom={5} style={{ height: '100%', width: '100%', borderRadius: '0.75rem', zIndex: 0 }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      
      {layerType === 'markers' && points.map((p, i) => (
        <Marker key={i} position={[p[0], p[1]]}>
          <Popup>
            <div className="font-sans text-sm">
              <span className="font-semibold text-slate-800">Koordinat:</span><br/>
              Lat: {p[0].toFixed(4)}<br/>
              Lng: {p[1].toFixed(4)}<br/>
              {metricColumn && (
                <div className="mt-1 pt-1 border-t border-slate-200">
                  <span className="font-semibold text-slate-800">{metricColumn}:</span> {p[2]}
                </div>
              )}
            </div>
          </Popup>
        </Marker>
      ))}

      {layerType === 'heatmap' && <HeatmapLayer points={points} />}

      {layerType === 'choropleth' && geoJsonData && (
        <GeoJSON 
          key={JSON.stringify(geoJsonData).substring(0, 50)} // force re-render on new data
          data={geoJsonData} 
          style={getStyle} 
        />
      )}
    </MapContainer>
  );
}
