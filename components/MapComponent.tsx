import React, { useEffect } from 'react';
import type { Location } from '../types';
import type { LatLngTuple, LatLngBoundsExpression } from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Polyline, AttributionControl } from 'react-leaflet';
import { useLanguage } from '../contexts/LanguageContext';

// Fix for default marker icon issue with bundlers/frameworks
// This is a common workaround for react-leaflet
import L from 'leaflet';
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapClickHandlerProps {
  onMapClick: (coords: LatLngTuple) => void;
}

const MapClickHandler: React.FC<MapClickHandlerProps> = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      onMapClick([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
};

interface BoundsFitterProps {
  bounds: LatLngBoundsExpression | null;
  onFitted: () => void;
}

const BoundsFitter: React.FC<BoundsFitterProps> = ({ bounds, onFitted }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
      onFitted();
    }
  }, [bounds, map, onFitted]);
  return null;
};

interface ViewUpdaterProps {
  coords: LatLngTuple;
  zoom: number;
}

const ViewUpdater: React.FC<ViewUpdaterProps> = ({ coords, zoom }) => {
    const map = useMap();
    useEffect(() => {
        map.setView(coords, zoom);
    }, [coords, zoom, map]);
    return null;
}

interface MapResizerProps {
  isSidebarOpen: boolean;
}

const MapResizer: React.FC<MapResizerProps> = ({ isSidebarOpen }) => {
  const map = useMap();
  useEffect(() => {
    // Delay invalidation to allow sidebar transition to finish
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 350); // Sidebar transition is 300ms

    return () => clearTimeout(timer);
  }, [isSidebarOpen, map]);

  return null;
};


interface MapComponentProps {
  locations: Location[];
  selectedCoords: LatLngTuple | null;
  onMapClick: (coords: LatLngTuple) => void;
  viewCoords: LatLngTuple;
  viewZoom: number;
  boundsToFit: LatLngBoundsExpression | null;
  onBoundsFitted: () => void;
  editingLocation: Location | null;
  isSidebarOpen: boolean;
}

const MapComponent: React.FC<MapComponentProps> = ({ 
    locations, 
    selectedCoords, 
    onMapClick, 
    viewCoords,
    viewZoom,
    boundsToFit,
    onBoundsFitted,
    editingLocation,
    isSidebarOpen,
 }) => {
  const { t } = useLanguage();
  const pathCoordinates = locations.map(loc => loc.coordinates);
  const locationsToDisplay = locations.filter(loc => loc.id !== editingLocation?.id);

  return (
    <MapContainer center={viewCoords} zoom={viewZoom} scrollWheelZoom={true} className="h-full w-full" attributionControl={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <AttributionControl position="topright" prefix={false} />
      <ViewUpdater coords={viewCoords} zoom={viewZoom} />
      <BoundsFitter bounds={boundsToFit} onFitted={onBoundsFitted} />
      <MapResizer isSidebarOpen={isSidebarOpen} />

      {locationsToDisplay.map((loc) => (
        <Marker key={loc.id} position={loc.coordinates}>
          <Popup>
            <div className="w-72 space-y-2 text-slate-800">
               {loc.image && (
                <img 
                  src={loc.image} 
                  alt={loc.title} 
                  className="w-full h-24 object-cover rounded-md" 
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
              <h3 className="font-bold text-lg">{loc.title}, {loc.country}</h3>
              <div className="text-sm text-gray-600 leading-snug location-description" dangerouslySetInnerHTML={{ __html: loc.description }} />
              
              {loc.questions && loc.questions.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <h4 className="font-bold text-base mb-2">{t('quizTitle')}</h4>
                  <div className="space-y-3">
                    {loc.questions.map((q, index) => (
                      <div key={q.id}>
                        <p className="font-semibold text-sm">
                          <span className="font-normal">{index + 1}.</span> {q.text}
                        </p>
                        {q.type === 'multiple_choice' && q.options && (
                          <ul className="list-disc list-inside ltr:pl-4 rtl:pr-4 mt-1 text-sm space-y-0.5 text-slate-600">
                            {q.options.map((opt, oIndex) => <li key={oIndex}>{opt}</li>)}
                          </ul>
                        )}
                        {q.type === 'true_false' && (
                          <ul className="list-disc list-inside ltr:pl-4 rtl:pr-4 mt-1 text-sm space-y-0.5 text-slate-600">
                            <li>{t('quizTrue')}</li>
                            <li>{t('quizFalse')}</li>
                          </ul>
                        )}
                        {q.type === 'short_answer' && (
                          <p className="text-xs text-slate-400 mt-1 ltr:pl-4 rtl:pr-4 italic">{t('quizShortAnswerHint')}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Popup>
        </Marker>
      ))}

      {pathCoordinates.length > 1 && (
        <Polyline 
          positions={pathCoordinates} 
          pathOptions={{ color: '#14b8a6', weight: 4, opacity: 0.8, dashArray: '8, 8' }} 
        />
      )}

      {selectedCoords && (
         <Marker position={selectedCoords}>
           <Popup>
            <div className="text-slate-800">
              {t('newLocationPopup')} <br/> {selectedCoords[0].toFixed(4)}, {selectedCoords[1].toFixed(4)}
            </div>
          </Popup>
         </Marker>
      )}
      <MapClickHandler onMapClick={onMapClick} />
    </MapContainer>
  );
};

export default MapComponent;