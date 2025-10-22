"use client";

import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Activity, Clock, Flame, Footprints, Navigation, MapPin, Locate } from 'lucide-react';

const RunningTrackerApp = () => {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [destination, setDestination] = useState<[number, number] | null>(null);
  const [distance, setDistance] = useState(0);
  const [time, setTime] = useState(0);
  const [calories, setCalories] = useState(0);
  const [routeInstructions, setRouteInstructions] = useState<string[]>([]);
  const [isSelectingDestination, setIsSelectingDestination] = useState(false);
  const mapInitializedRef = useRef(false);
  const mapInstanceRef = useRef<any>(null);
  const routeLayerRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.L) {
      setMapLoaded(true);
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js';
    script.onload = () => {
      const checkLeaflet = () => {
        if (window.L) {
          setMapLoaded(true);
        } else {
          setTimeout(checkLeaflet, 100);
        }
      };
      checkLeaflet();
    };
    script.onerror = () => {
      console.error('Error al cargar Leaflet');
    };
    document.body.appendChild(script);

    return () => {
      if (document.head.contains(link)) document.head.removeChild(link);
      if (document.body.contains(script)) document.body.removeChild(script);
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (error) {
          console.log('Error limpiando mapa:', error);
        }
        mapInstanceRef.current = null;
      }
      mapInitializedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (mapLoaded && !mapInitializedRef.current && window.L) {
      initMap();
    }
  }, [mapLoaded]);

  const initMap = () => {
    const L = window.L;
    if (!L) {
      console.error('Leaflet no está disponible');
      return;
    }

    const mapContainer = document.getElementById('leaflet-map-container');
    if (!mapContainer) {
      console.error('Elemento del mapa no encontrado');
      return;
    }

    // Eliminar solo el mapa anterior sin tocar botones
    const leafletRoot = mapContainer.querySelector('.leaflet-container');
    if (leafletRoot) leafletRoot.remove();

    try {
      mapInitializedRef.current = true;

      const map = L.map('leaflet-map-container', {
        zoomControl: false,
        attributionControl: false
      }).setView([3.4516, -76.5320], 15);

      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      // Capas para marcadores y rutas
      markersLayerRef.current = L.layerGroup().addTo(map);
      routeLayerRef.current = L.layerGroup().addTo(map);

      // Obtener ubicación del usuario primero
      getUserLocation();

      // Evento para seleccionar destino al hacer click
      map.on('click', (e: any) => {
        if (isSelectingDestination && userLocation) {
          const clickedLocation: [number, number] = [e.latlng.lat, e.latlng.lng];
          setDestination(clickedLocation);
          calculateRoute(clickedLocation);
          setIsSelectingDestination(false);
        }
      });

      setTimeout(() => {
        map.invalidateSize();
      }, 100);

    } catch (error) {
      console.error('Error inicializando el mapa:', error);
      mapInitializedRef.current = false;
    }
  };

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLoc: [number, number] = [
            position.coords.latitude,
            position.coords.longitude
          ];
          setUserLocation(userLoc);

          if (mapInstanceRef.current) {
            mapInstanceRef.current.setView(userLoc, 15);
            addUserMarker(userLoc);
          }
        },
        (error) => {
          console.error('Error obteniendo ubicación:', error);
          const defaultLocation: [number, number] = [3.4516, -76.5320];
          setUserLocation(defaultLocation);
          if (mapInstanceRef.current) addUserMarker(defaultLocation);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    }
  };

  const addUserMarker = (location: [number, number]) => {
    const L = window.L;
    if (!L || !markersLayerRef.current) return;

    const userIcon = L.divIcon({
      className: 'custom-marker',
      html: '<div class="bg-green-500 w-4 h-4 rounded-full border-3 border-white shadow-lg flex items-center justify-center"><Locate className="w-2 h-2 text-white" /></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    L.marker(location, { icon: userIcon })
      .addTo(markersLayerRef.current)
      .bindPopup('Tu ubicación actual')
      .openPopup();
  };

  const startDestinationSelection = () => {
    if (!userLocation) {
      alert('Primero necesitamos tu ubicación. Asegúrate de permitir el acceso a la ubicación.');
      getUserLocation();
      return;
    }
    setIsSelectingDestination(true);
    setRouteInstructions(['🗺️ Haz click en el mapa para seleccionar tu destino']);
  };

  const calculateRoute = async (destination: [number, number]) => {
    if (!userLocation) return;

    const L = window.L;
    if (!L || !routeLayerRef.current || !markersLayerRef.current) return;

    // Limpiar ruta anterior
    routeLayerRef.current.clearLayers();
    markersLayerRef.current.clearLayers();

    // Agregar marcador de usuario
    addUserMarker(userLocation);

    // Agregar marcador de destino
    const destinationIcon = L.divIcon({
      className: 'custom-marker',
      html: '<div class="bg-red-500 w-4 h-4 rounded-full border-3 border-white shadow-lg flex items-center justify-center"><MapPin className="w-2 h-2 text-white" /></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    L.marker(destination, { icon: destinationIcon })
      .addTo(markersLayerRef.current)
      .bindPopup('Destino seleccionado');

    try {
      // Usar el servicio de routing de OSRM para obtener una ruta real
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${userLocation[1]},${userLocation[0]};${destination[1]},${destination[0]}?overview=full&geometries=geojson`
      );
      
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const routeCoordinates = route.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);
        
        // Crear polyline con la ruta real
        const polyline = L.polyline(routeCoordinates, {
          color: '#F59E0B',
          weight: 6,
          opacity: 0.8,
          lineJoin: 'round',
          lineCap: 'round'
        }).addTo(routeLayerRef.current);

        const routeDistance = route.distance / 1000; // Convertir a km
        const estimatedTime = Math.round((route.duration / 60) * 1.5); // Ajustar para running
        const estimatedCalories = Math.round(routeDistance * 70);

        setDistance(parseFloat(routeDistance.toFixed(2)));
        setTime(estimatedTime);
        setCalories(estimatedCalories);

        generateDetailedInstructions(userLocation, destination, routeDistance);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.fitBounds(polyline.getBounds(), { padding: [20, 20] });
        }
      } else {
        // Fallback: ruta directa si OSRM falla
        createDirectRoute(userLocation, destination);
      }
    } catch (error) {
      console.error('Error calculando ruta con OSRM:', error);
      // Fallback: ruta directa
      createDirectRoute(userLocation, destination);
    }
  };

  const createDirectRoute = (start: [number, number], end: [number, number]) => {
    const L = window.L;
    if (!L) return;

    // Crear ruta directa como fallback
    const route = [start, end];
    const polyline = L.polyline(route, {
      color: '#F59E0B',
      weight: 5,
      opacity: 0.9,
      lineJoin: 'round',
      lineCap: 'round',
      dashArray: '10, 10'
    }).addTo(routeLayerRef.current);

    const routeDistance = calculateDistance(start[0], start[1], end[0], end[1]);
    const estimatedTime = Math.round(routeDistance * 12);
    const estimatedCalories = Math.round(routeDistance * 70);

    setDistance(parseFloat(routeDistance.toFixed(2)));
    setTime(estimatedTime);
    setCalories(estimatedCalories);

    generateDetailedInstructions(start, end, routeDistance);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.fitBounds(polyline.getBounds(), { padding: [20, 20] });
    }
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const generateDetailedInstructions = (start: [number, number], end: [number, number], distance: number) => {
    const instructions = [
      "📍 Comienza desde tu ubicación actual",
      "🧭 Sigue la ruta marcada en amarillo",
      `📏 Distancia total: ${distance.toFixed(2)} km`,
      `⏱️ Tiempo estimado: ${Math.round(distance * 12)} minutos`,
      `🔥 Calorías estimadas: ${Math.round(distance * 70)} cal`,
      "🏁 Llegarás a tu destino marcado en rojo"
    ];
    setRouteInstructions(instructions);
  };

  const clearRoute = () => {
    setDestination(null);
    setDistance(0);
    setTime(0);
    setCalories(0);
    setRouteInstructions([]);
    setIsSelectingDestination(false);

    if (routeLayerRef.current) routeLayerRef.current.clearLayers();
    if (markersLayerRef.current) markersLayerRef.current.clearLayers();

    if (userLocation) addUserMarker(userLocation);
    if (mapInstanceRef.current && userLocation) mapInstanceRef.current.setView(userLocation, 15);
  };

  const refreshLocation = () => {
    getUserLocation();
    if (destination) calculateRoute(destination);
  };

  return (
    <div className="h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-amber-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Círculos decorativos de fondo */}
      <div className="absolute top-10 left-10 w-64 h-64 bg-orange-200 rounded-full opacity-20 blur-xl animate-pulse"></div>
      <div className="absolute bottom-20 right-16 w-48 h-48 bg-amber-300 rounded-full opacity-30 blur-lg animate-bounce"></div>
      <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-orange-300 rounded-full opacity-25 blur-lg animate-pulse"></div>
      <div className="absolute bottom-10 right-1/3 w-40 h-40 bg-amber-400 rounded-full opacity-20 blur-xl animate-bounce"></div>
      <div className="absolute top-1/3 right-20 w-24 h-24 bg-orange-200 rounded-full opacity-30 blur-lg animate-pulse"></div>
      <div className="absolute top-20 right-1/4 w-36 h-36 bg-amber-300 rounded-full opacity-25 blur-xl"></div>
      
      <div className="w-full max-w-md h-[90vh] max-h-[700px] relative z-10">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full h-full flex flex-col">
          {/* Sección de botones - ARRIBA del mapa */}
          <div className="bg-gray-800 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gray-700 p-2 rounded-xl">
                <Footprints className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">Running Tracker</h3>
                <p className="text-gray-400 text-xs">3000 meters per day</p>
              </div>
            </div>
            
            {/* Botones de acción en el header */}
            <div className="flex gap-2">
              <button 
                onClick={refreshLocation}
                className="bg-green-500 text-white rounded-full p-2 shadow-lg hover:shadow-xl transition-all duration-200 hover:bg-green-600 flex items-center justify-center w-9 h-9"
                title="Actualizar mi ubicación"
              >
                <Locate className="w-4 h-4" />
              </button>
              <button 
                onClick={startDestinationSelection}
                className={`rounded-full p-2 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center w-9 h-9 ${
                  isSelectingDestination 
                    ? 'bg-yellow-500 text-white hover:bg-yellow-600' 
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
                title="Seleccionar destino"
              >
                <MapPin className="w-4 h-4" />
              </button>
              <button 
                onClick={clearRoute}
                className="bg-red-500 text-white rounded-full p-2 shadow-lg hover:shadow-xl transition-all duration-200 hover:bg-red-600 flex items-center justify-center w-9 h-9"
                title="Limpiar ruta"
              >
                <Navigation className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Indicadores de estado */}
          {!userLocation && (
            <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
              <p className="text-blue-700 text-xs text-center flex items-center justify-center gap-1">
                <Locate className="w-3 h-3" />
                Detectando tu ubicación...
              </p>
            </div>
          )}

          {userLocation && !destination && !isSelectingDestination && (
            <div className="bg-green-50 border-b border-green-200 px-4 py-2">
              <p className="text-green-700 text-xs text-center flex items-center justify-center gap-1">
                <MapPin className="w-3 h-3" />
                Presiona el botón azul para seleccionar destino
              </p>
            </div>
          )}

          {isSelectingDestination && (
            <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2">
              <p className="text-yellow-700 text-xs text-center flex items-center justify-center gap-1">
                <MapPin className="w-3 h-3" />
                🗺️ Haz click en el mapa para seleccionar destino
              </p>
            </div>
          )}

          {/* Mapa - DEBAJO de los botones */}
          <div className="relative flex-1 min-h-[300px] bg-gray-100">
            <div id="leaflet-map-container" className="w-full h-full bg-slate-50">
              {!mapLoaded && (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-gray-500 flex flex-col items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-2"></div>
                    <span>Cargando mapa...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Indicador de distancia en el mapa */}
            {distance > 0 && (
              <div className="absolute top-3 left-3 z-50">
                <div className="bg-orange-500 text-white px-3 py-1.5 rounded-full font-bold text-sm shadow-lg">
                  {distance.toFixed(2)} <span className="text-xs font-normal">Km</span>
                </div>
              </div>
            )}

            {/* Instrucciones de ruta en el mapa */}
            {routeInstructions.length > 0 && (
              <div className="absolute bottom-3 left-3 right-3 z-50">
                <div className="bg-white rounded-lg p-3 shadow-lg max-h-24 overflow-y-auto">
                  <h4 className="text-xs font-semibold text-gray-800 mb-2 flex items-center gap-1">
                    <Navigation className="w-3 h-3 text-blue-500" />
                    Instrucciones de la ruta:
                  </h4>
                  <div className="text-xs text-gray-600 space-y-1">
                    {routeInstructions.slice(0, 3).map((instruction, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <span className="text-orange-500 mt-0.5">•</span>
                        <span className="leading-tight">{instruction}</span>
                      </div>
                    ))}
                    {routeInstructions.length > 3 && (
                      <div className="text-orange-500 text-xs font-semibold text-center mt-1">
                        +{routeInstructions.length - 3} más instrucciones
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sección de estadísticas */}
          <div className="p-4 border-t border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Today</h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-orange-50 rounded-xl p-4 text-center hover:bg-orange-100 transition-colors duration-200 cursor-pointer">
                <div className="flex justify-center mb-2">
                  <div className="bg-orange-100 p-2 rounded-lg">
                    <Activity className="w-5 h-5 text-orange-600" />
                  </div>
                </div>
                <p className="text-lg font-bold text-gray-900">{distance.toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">Kilometer</p>
              </div>
              <div className="bg-orange-50 rounded-xl p-4 text-center hover:bg-orange-100 transition-colors duration-200 cursor-pointer">
                <div className="flex justify-center mb-2">
                  <div className="bg-orange-100 p-2 rounded-lg">
                    <Clock className="w-5 h-5 text-orange-600" />
                  </div>
                </div>
                <p className="text-lg font-bold text-gray-900">{time}</p>
                <p className="text-xs text-gray-500 mt-1">minutes</p>
              </div>
              <div className="bg-orange-50 rounded-xl p-4 text-center hover:bg-orange-100 transition-colors duration-200 cursor-pointer">
                <div className="flex justify-center mb-2">
                  <div className="bg-orange-100 p-2 rounded-lg">
                    <Flame className="w-5 h-5 text-orange-600" />
                  </div>
                </div>
                <p className="text-lg font-bold text-gray-900">{calories}</p>
                <p className="text-xs text-gray-500 mt-1">Calories</p>
              </div>
            </div>
            
            {/* Barra de progreso */}
            <div className="mt-4 bg-gray-100 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-orange-500 to-amber-500 h-full transition-all duration-500 ease-out" 
                style={{ width: `${Math.min((distance / 3) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 text-center mt-2">
              Progreso diario: {Math.min((distance / 3) * 100, 100).toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RunningTrackerApp;