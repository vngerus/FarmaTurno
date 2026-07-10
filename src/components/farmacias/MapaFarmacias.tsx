import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Rectangle, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, Clock, Phone, Map } from 'lucide-react';
import { obtenerUbicacion } from '../../utils/geolocation';
import type { Farmacia } from '../../types';

const getEmeraldMarker = () => L.divIcon({
  className: 'custom-div-icon',
  html: `
    <div class="relative flex items-center justify-center w-8 h-8">
      <div class="absolute w-6 h-6 rounded-full bg-[#065f46]/30 animate-ping"></div>
      <div class="relative w-4 h-4 bg-[#065f46] border-2 border-[#0f1f19] rounded-full"></div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -10]
});

const getUserMarker = () => L.divIcon({
  className: 'custom-user-icon',
  html: `
    <div class="relative flex items-center justify-center w-10 h-10">
      <div class="absolute w-8 h-8 rounded-full bg-[#2563eb]/30 animate-pulse"></div>
      <div class="relative w-5 h-5 bg-[#2563eb] border-2 border-[#0f1f19] rounded-full flex items-center justify-center">
        <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
      </div>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -10]
});

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 13);
  }, [center, map]);
  return null;
}

interface MapaFarmaciasProps {
  farmacias: Farmacia[];
  selectedFarmaciaId?: string | null;
  userCoords: [number, number] | null;
  onLocateUser: (coords: [number, number]) => void;
}

export default function MapaFarmacias({
  farmacias,
  selectedFarmaciaId,
  userCoords,
  onLocateUser
}: MapaFarmaciasProps) {
  const [isLocating, setIsLocating] = useState<boolean>(false);

  const farmaciasConMapa = farmacias.filter(
    f => f.local_lat && f.local_lng && !isNaN(parseFloat(f.local_lat)) && !isNaN(parseFloat(f.local_lng))
  );

  const selectedFarmacia = farmaciasConMapa.find(f => f.local_id === selectedFarmaciaId);
  
  const mapCenter = React.useMemo<[number, number]>(() => {
    if (selectedFarmacia) {
      return [parseFloat(selectedFarmacia.local_lat), parseFloat(selectedFarmacia.local_lng)];
    }
    if (userCoords) {
      return userCoords;
    }
    if (farmaciasConMapa.length > 0) {
      return [parseFloat(farmaciasConMapa[0].local_lat), parseFloat(farmaciasConMapa[0].local_lng)];
    }
    return [-33.4489, -70.6693];
  }, [farmaciasConMapa, selectedFarmacia, userCoords]);

  const comunaBounds = React.useMemo<[[number, number], [number, number]] | null>(() => {
    if (farmaciasConMapa.length === 0) return null;

    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;

    farmaciasConMapa.forEach(f => {
      const lat = parseFloat(f.local_lat);
      const lng = parseFloat(f.local_lng);
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    });

    const paddingLat = 0.008;
    const paddingLng = 0.012;

    if (minLat === maxLat) {
      return [
        [minLat - paddingLat, minLng - paddingLng],
        [maxLat + paddingLat, maxLng + paddingLng]
      ];
    }

    return [
      [minLat - paddingLat, minLng - paddingLng],
      [maxLat + paddingLat, maxLng + paddingLng]
    ];
  }, [farmaciasConMapa]);

  const routePoints = React.useMemo<[number, number][] | null>(() => {
    if (!userCoords || !selectedFarmacia) return null;
    const destLat = parseFloat(selectedFarmacia.local_lat);
    const destLng = parseFloat(selectedFarmacia.local_lng);
    return [userCoords, [destLat, destLng]];
  }, [userCoords, selectedFarmacia]);

  const handleLocateMe = () => {
    setIsLocating(true);
    obtenerUbicacion()
      .then((coords) => {
        onLocateUser(coords);
        setIsLocating(false);
      })
      .catch((error) => {
        console.error("Error obteniendo ubicación:", error);
        alert("No se pudo obtener tu ubicación actual. Asegúrate de otorgar permisos de ubicación en el navegador.");
        setIsLocating(false);
      });
  };

  return (
    <div className="relative isolate w-full h-[400px] md:h-[500px] rounded-2xl overflow-hidden border-2 border-[#0f1f19]">

      <button
        onClick={handleLocateMe}
        disabled={isLocating}
        type="button"
        title="Centrar en mi ubicación actual"
        className="absolute top-4 right-4 z-[1001] bg-[#0f1f19] hover:bg-[#e8632c] border-2 border-[#0f1f19] p-3 rounded-xl text-[#faf9f4] transition-all flex items-center justify-center cursor-pointer active:scale-95"
      >
        <Navigation className={`w-5 h-5 ${isLocating ? 'animate-pulse' : ''}`} />
      </button>

      <div className="absolute bottom-4 left-4 z-[1001] bg-[#faf9f4] border-2 border-[#0f1f19] p-3 rounded-xl text-[10px] space-y-1.5 pointer-events-none text-[#0f1f19] font-mono">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#065f46] border border-[#0f1f19] inline-block"></span>
          <span>Farmacia de Turno</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#2563eb] border border-[#0f1f19] inline-block"></span>
          <span>Tu Ubicación Actual</span>
        </div>
        {comunaBounds && (
          <div className="flex items-center gap-2">
            <span className="w-5 h-2.5 border border-dashed border-[#065f46] bg-[#065f46]/10 inline-block"></span>
            <span>Caja Límite Comunal</span>
          </div>
        )}
      </div>

      <MapContainer 
        center={mapCenter} 
        zoom={13} 
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <ChangeView center={mapCenter} />

        {comunaBounds && (
          <Rectangle 
            bounds={comunaBounds} 
            pathOptions={{
              color: '#065f46',
              weight: 1.5,
              fillColor: '#065f46',
              fillOpacity: 0.04,
              dashArray: '6, 12'
            }}
          />
        )}

        {routePoints && (
          <Polyline
            positions={routePoints}
            pathOptions={{
              color: '#3b82f6',
              weight: 3,
              dashArray: '5, 8',
              lineCap: 'round',
              opacity: 0.8
            }}
          />
        )}

        {userCoords && (
          <Marker position={userCoords} icon={getUserMarker()}>
            <Popup>
              <div className="text-center p-1">
                <span className="font-bold text-[#0f1f19] text-xs">Tu Ubicación</span>
              </div>
            </Popup>
          </Marker>
        )}

        {farmaciasConMapa.map(farmacia => {
          const lat = parseFloat(farmacia.local_lat);
          const lng = parseFloat(farmacia.local_lng);

          return (
            <Marker 
              key={farmacia.local_id} 
              position={[lat, lng]} 
              icon={getEmeraldMarker()}
            >
              <Popup>
                <div className="p-1 max-w-[200px]">
                  <h4 className="font-bold text-[#0f1f19] text-sm leading-tight mb-1">
                    {farmacia.local_nombre.toUpperCase()}
                  </h4>
                  <p className="text-[#33443d] text-xs mb-1 font-medium">
                    {farmacia.local_direccion}
                  </p>

                  <div className="flex flex-col gap-0.5 text-[11px] text-[#065f46] mt-2 font-mono">
                    <div className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Apertura: {farmacia.funcionamiento_hora_apertura.slice(0, 5)} hrs.</div>
                    <div className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Cierre: {farmacia.funcionamiento_hora_cierre.slice(0, 5)} hrs.</div>
                  </div>

                  {farmacia.local_telefono && (
                    <a
                      href={`tel:${farmacia.local_telefono.replace(/\s+/g, '')}`}
                      className="inline-flex items-center gap-1 text-[11px] text-[#065f46] hover:text-[#e8632c] mt-2 font-medium transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5 inline mr-1" /> Llamar: {farmacia.local_telefono}
                    </a>
                  )}

                  <div className="mt-2.5 pt-2 border-t-2 border-[#0f1f19] flex justify-center">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-[#faf9f4] hover:bg-[#e8632c] bg-[#0f1f19] border-2 border-[#0f1f19] px-2.5 py-1.5 rounded-lg font-bold font-mono flex items-center gap-1 w-full justify-center transition-colors"
                    >
                      <Map className="w-3.5 h-3.5 inline mr-1" /> Cómo llegar (Google Maps)
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
