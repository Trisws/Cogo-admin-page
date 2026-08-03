import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  User,
  Trip,
  MapClickMode,
  TileLayerType,
  Location,
  ThemeMode
} from '../../lib/types/simulation';
import { VEHICLE_CONFIGS } from '../../lib/utils/presets';
import { MapPin } from 'lucide-react';

interface LeafletMapProps {
  center: [number, number];
  zoom: number;
  users: User[];
  trips: Trip[];
  selectedUserId: string | null;
  selectedTripId: string | null;
  onSelectUser: (user: User | null) => void;
  onSelectTrip: (trip: Trip | null) => void;
  mapClickMode: MapClickMode;
  onMapClickAction: (location: Location) => void;
  onCancelClickMode: () => void;
  tileLayerType: TileLayerType;
  onChangeTileLayer: (layer: TileLayerType) => void;
  themeMode?: ThemeMode;
}

const TILE_LAYERS: Record<TileLayerType, { name: string; url: string; attribution: string }> = {
  dark: {
    name: 'Tối (Dark Theme)',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>'
  },
  positron: {
    name: 'Sáng (Light Theme)',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>'
  },
  osm: {
    name: 'Bản đồ chuẩn (OSM)',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors'
  },
  satellite: {
    name: 'Vệ tinh (Esri)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
  }
};

export const LeafletMap: React.FC<LeafletMapProps> = ({
  center,
  zoom,
  users,
  trips,
  selectedUserId,
  selectedTripId,
  onSelectUser,
  onSelectTrip,
  mapClickMode,
  onMapClickAction,
  onCancelClickMode,
  tileLayerType,
  onChangeTileLayer,
  themeMode,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const isLight = themeMode === 'light';

  // Layer groups for dynamic markers and routes
  const userMarkersRef = useRef<Record<string, L.Marker>>({});
  const tripRoutesGroupRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapRef.current) {
      // Check if the container is already initialized by leaflet (e.g. strict mode HMR)
      const container = mapContainerRef.current as any;
      if (container._leaflet_id !== undefined) {
        container._leaflet_id = null;
      }

      const map = L.map(mapContainerRef.current, {
        center,
        zoom,
        zoomControl: false,
      });

      // Add zoom control at top right
      L.control.zoom({ position: 'topright' }).addTo(map);

      // Add default tile layer
      const layerConfig = TILE_LAYERS[tileLayerType];
      const tileLayer = L.tileLayer(layerConfig.url, {
        attribution: layerConfig.attribution,
        maxZoom: 19,
      }).addTo(map);

      tileLayerRef.current = tileLayer;

      // Layer group for routes
      const tripGroup = L.layerGroup().addTo(map);
      tripRoutesGroupRef.current = tripGroup;

      mapRef.current = map;
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update center & zoom when city changes
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView(center, zoom, { animate: true });
    }
  }, [center, zoom]);

  // Handle Tile Layer Switch
  useEffect(() => {
    if (mapRef.current && tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current);
      const config = TILE_LAYERS[tileLayerType];
      const newLayer = L.tileLayer(config.url, {
        attribution: config.attribution,
        maxZoom: 19,
      }).addTo(mapRef.current);
      tileLayerRef.current = newLayer;
    }
  }, [tileLayerType]);

  // Handle Map Clicks (for placing users or picking points)
  useEffect(() => {
    if (!mapRef.current) return;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      const loc: Location = {
        lat: Number(e.latlng.lat.toFixed(6)),
        lng: Number(e.latlng.lng.toFixed(6)),
      };

      if (mapClickMode !== 'none') {
        onMapClickAction(loc);
      } else {
        // Deselect if clicked on empty map
        onSelectUser(null);
        onSelectTrip(null);
      }
    };

    mapRef.current.off('click');
    mapRef.current.on('click', handleMapClick);

    // Update cursor based on click mode
    if (mapContainerRef.current) {
      if (mapClickMode !== 'none') {
        mapContainerRef.current.style.cursor = 'crosshair';
      } else {
        mapContainerRef.current.style.cursor = '';
      }
    }
  }, [mapClickMode, onMapClickAction, onSelectUser, onSelectTrip]);

  // Update User Markers dynamically (a "driving" user shows their vehicle icon + heading)
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    const currentMarkers = userMarkersRef.current;
    const activeUserIds = new Set(users.map((u) => u.id));

    // Passengers who have already boarded a vehicle are hidden until they're
    // dropped off at their destination waypoint (they're inside the car).
    const onboardPassengerIds = new Set(
      trips
        .filter((t) => t.status === 'in_progress')
        .flatMap((t) => t.slots)
        .filter((s) => s.passengerUserId && s.pickedUp)
        .map((s) => s.passengerUserId as string)
    );

    // Remove deleted or currently-onboard user markers
    Object.keys(currentMarkers).forEach((id) => {
      if (!activeUserIds.has(id) || onboardPassengerIds.has(id)) {
        currentMarkers[id].remove();
        delete currentMarkers[id];
      }
    });

    users.forEach((user) => {
      if (onboardPassengerIds.has(user.id)) return;
      const isSelected = user.id === selectedUserId;
      const isDriving = user.status === 'driving';
      const isSearching = user.status === 'searching';
      const isRiding = user.status === 'riding';

      const drivingTrip = isDriving
        ? trips.find((t) => t.driverUserId === user.id && t.status === 'in_progress')
        : undefined;
      const vConfig = drivingTrip ? VEHICLE_CONFIGS[drivingTrip.vehicleType] : null;

      let badgeBg = 'bg-sky-500';
      if (isDriving) badgeBg = 'bg-amber-500';
      if (isSearching) badgeBg = 'bg-violet-500';
      if (isRiding) badgeBg = 'bg-emerald-500';

      const iconHtml = `
        <div class="relative group cursor-pointer">
          <div class="${isDriving ? 'w-10 h-10' : 'w-9 h-9'} rounded-full ${isLight ? 'bg-sky-50 border-sky-300' : 'bg-sky-950/90 border-sky-600'} border-2 ${
            isSelected ? (isLight ? 'border-sky-500 scale-125 z-30 shadow-lg shadow-sky-500/30' : 'border-sky-400 scale-125 z-30 shadow-lg shadow-sky-500/50') : 'shadow-md'
          } flex items-center justify-center transition-all duration-200">
            <span class="${isDriving ? 'text-lg' : 'text-base'} transform transition-transform" style="transform: rotate(${isDriving ? (user.heading ?? 0) : 0}deg)">
              ${isDriving && vConfig ? vConfig.icon : '👤'}
            </span>
            <span class="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full ${badgeBg} border-2 ${isLight ? 'border-white' : 'border-slate-900'}"></span>
          </div>

          <div class="absolute -top-7 left-1/2 transform -translate-x-1/2 ${isLight ? 'bg-sky-50 text-sky-900 border-sky-200' : 'bg-sky-950/95 text-sky-100 border-sky-700'} text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap shadow-md pointer-events-none ${
            isSelected ? 'block z-40' : 'hidden group-hover:block'
          }">
            ${user.name} ${isDriving ? '• Đang lái' : ''}${isSearching ? '• Đang tìm chuyến' : ''}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-user-marker',
        html: iconHtml,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      if (currentMarkers[user.id]) {
        const marker = currentMarkers[user.id];
        marker.setLatLng([user.location.lat, user.location.lng]);
        marker.setIcon(customIcon);
        marker.off('click');
      } else {
        const marker = L.marker([user.location.lat, user.location.lng], {
          icon: customIcon,
          title: user.name,
        }).addTo(map);

        currentMarkers[user.id] = marker;
      }

      const marker = currentMarkers[user.id];
      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectUser(user);
      });
    });
  }, [users, trips, selectedUserId, onSelectUser, isLight]);

  // Render Routes and Pickup/Destination Markers for active trips
  useEffect(() => {
    if (!mapRef.current || !tripRoutesGroupRef.current) return;

    const group = tripRoutesGroupRef.current;
    group.clearLayers();

    trips.forEach((trip) => {
      if (trip.status !== 'in_progress') return;
      const isSelected = trip.id === selectedTripId;

      // Draw Pickup Flag Marker (Green)
      const pickupIcon = L.divIcon({
        className: 'custom-flag-marker',
        html: `
          <div class="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs border-2 border-slate-900 shadow-lg">
            A
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      L.marker([trip.pickup.lat, trip.pickup.lng], { icon: pickupIcon })
        .bindTooltip(`Điểm đón: ${trip.driverName}`, { direction: 'top', className: 'text-xs font-semibold' })
        .addTo(group);

      // Draw Destination Flag Marker (Red/Rose)
      const destinationIcon = L.divIcon({
        className: 'custom-flag-marker',
        html: `
          <div class="w-7 h-7 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-xs border-2 border-slate-900 shadow-lg">
            B
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      L.marker([trip.destination.lat, trip.destination.lng], { icon: destinationIcon })
        .bindTooltip(`Điểm đến: ${trip.destination.address || 'Đích đến'}`, { direction: 'top', className: 'text-xs font-semibold' })
        .addTo(group);

      // Draw route line from pickup to destination
      if (trip.routeWaypoints && trip.routeWaypoints.length > 0) {
        const routeLatLngs = trip.routeWaypoints.map((pt) => [pt.lat, pt.lng] as [number, number]);

        L.polyline(routeLatLngs, {
          color: isSelected ? '#10b981' : '#059669',
          weight: isSelected ? 6 : 4,
          opacity: isSelected ? 0.9 : 0.7,
          dashArray: '8, 8',
        }).addTo(group);
      }
    });
  }, [trips, selectedTripId]);

  return (
    <div className={`relative w-full h-full min-h-[400px] flex-1 overflow-hidden ${isLight ? 'bg-slate-100' : 'bg-slate-950'}`}>
      {/* Leaflet Map Canvas Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Map Click Mode Active Banner */}
      {mapClickMode !== 'none' && (
        <div className={`absolute top-4 left-1/2 transform -translate-x-1/2 z-[400] ${isLight ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-xl' : 'bg-emerald-900/95 border-emerald-500 text-emerald-100 shadow-2xl'} border-2 px-4 py-2 rounded-xl backdrop-blur-md flex items-center gap-3 animate-bounce`}>
          <MapPin className={`w-5 h-5 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
          <div className="text-xs font-bold">
            {mapClickMode === 'pick_random_center' && 'Nhấp vào bản đồ để GHIM TÂM VÙNG (random vị trí trong bán kính 5km)'}
            {mapClickMode === 'pick_trip_destination' && 'Nhấp vào bản đồ để CHỌN ĐIỂM ĐẾN cho chuyến đi'}
            {mapClickMode === 'pick_demo_center' && 'Nhấp vào bản đồ để GHIM VÙNG TRUNG TÂM cho dữ liệu ảo (bán kính 5km)'}
            {mapClickMode === 'pick_find_destination' && 'Nhấp vào bản đồ để CHỌN ĐIỂM MUỐN ĐẾN — hệ thống sẽ tìm chuyến đi phù hợp'}
          </div>
          <button
            onClick={onCancelClickMode}
            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${isLight ? 'text-emerald-700 hover:text-white hover:bg-emerald-600 border-emerald-300 bg-white' : 'text-emerald-300 hover:text-white bg-emerald-950 border-emerald-700'}`}
          >
            Hủy chọn
          </button>
        </div>
      )}

    </div>
  );
};
