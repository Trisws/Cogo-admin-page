import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { 
  Driver, 
  User, 
  Trip, 
  MapClickMode,
  TileLayerType,
  Location,
  ThemeMode
} from '../../lib/types/simulation';
import { VEHICLE_CONFIGS } from '../../lib/utils/presets';
import { Locate, Navigation, Plus, MapPin } from 'lucide-react';

interface LeafletMapProps {
  center: [number, number];
  zoom: number;
  drivers: Driver[];
  users: User[];
  trips: Trip[];
  selectedDriverId: string | null;
  selectedUserId: string | null;
  selectedTripId: string | null;
  onSelectDriver: (driver: Driver | null) => void;
  onSelectUser: (user: User | null) => void;
  onSelectTrip: (trip: Trip | null) => void;
  mapClickMode: MapClickMode;
  onMapClickAction: (location: Location) => void;
  tileLayerType: TileLayerType;
  onChangeTileLayer: (layer: TileLayerType) => void;
  onRequestRideForUser?: (user: User) => void;
  onUserLongPress?: (user: User) => void;
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
  drivers,
  users,
  trips,
  selectedDriverId,
  selectedUserId,
  selectedTripId,
  onSelectDriver,
  onSelectUser,
  onSelectTrip,
  mapClickMode,
  onMapClickAction,
  tileLayerType,
  onChangeTileLayer,
  onRequestRideForUser,
  onUserLongPress,
  themeMode,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const isLight = themeMode === 'light';

  // Layer groups for dynamic markers and routes
  const driverMarkersRef = useRef<Record<string, L.Marker>>({});
  const userMarkersRef = useRef<Record<string, L.Marker>>({});
  const tripRoutesGroupRef = useRef<L.LayerGroup | null>(null);
  const destinationPreviewMarkerRef = useRef<L.Marker | null>(null);

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

  // Handle Map Clicks (for placing drivers/users or setting points)
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
        onSelectDriver(null);
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
  }, [mapClickMode, onMapClickAction, onSelectDriver, onSelectUser, onSelectTrip]);

  // Update Driver Markers dynamically on map
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    const currentMarkers = driverMarkersRef.current;
    const activeDriverIds = new Set(drivers.map((d) => d.id));

    // Remove old markers for drivers no longer present
    Object.keys(currentMarkers).forEach((id) => {
      if (!activeDriverIds.has(id)) {
        currentMarkers[id].remove();
        delete currentMarkers[id];
      }
    });

    // Add or Update markers
    drivers.forEach((driver) => {
      const vConfig = VEHICLE_CONFIGS[driver.vehicleType] || VEHICLE_CONFIGS.car_4;
      const isSelected = driver.id === selectedDriverId;
      
      let badgeBg = 'bg-emerald-500';
      let statusText = 'Rảnh';
      if (driver.status === 'busy') {
        badgeBg = 'bg-amber-500';
        statusText = 'Có chuyến';
      } else if (driver.status === 'offline') {
        badgeBg = 'bg-slate-500';
        statusText = 'Offline';
      }

      // Create custom div icon with rotation and emoji badge
      const iconHtml = `
        <div class="relative group cursor-pointer">
          <div class="w-10 h-10 rounded-full ${isLight ? 'bg-white border-slate-300' : 'bg-slate-900/90 border-slate-700'} border-2 ${
            isSelected ? (isLight ? 'border-sky-400 scale-125 z-30 shadow-lg shadow-sky-500/30' : 'border-cyan-400 scale-125 z-30 shadow-lg shadow-cyan-500/50') : 'shadow-md'
          } flex items-center justify-center transition-all duration-200">
            <span class="text-lg transform transition-transform" style="transform: rotate(${driver.heading}deg)">
              ${vConfig.icon}
            </span>
            <span class="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full ${badgeBg} border-2 ${isLight ? 'border-white' : 'border-slate-900'}"></span>
          </div>
          
          <div class="absolute -top-7 left-1/2 transform -translate-x-1/2 ${isLight ? 'bg-white text-slate-800 border-slate-200' : 'bg-slate-900/95 text-slate-100 border-slate-700'} text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap shadow-md pointer-events-none ${
            isSelected ? 'block z-40' : 'hidden group-hover:block'
          }">
            ${driver.name} • ${driver.plateNumber}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-driver-marker',
        html: iconHtml,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      if (currentMarkers[driver.id]) {
        // Update position & icon
        const marker = currentMarkers[driver.id];
        marker.setLatLng([driver.location.lat, driver.location.lng]);
        marker.setIcon(customIcon);
      } else {
        // Create new marker
        const marker = L.marker([driver.location.lat, driver.location.lng], {
          icon: customIcon,
          title: driver.name,
        }).addTo(map);

        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          onSelectDriver(driver);
        });

        currentMarkers[driver.id] = marker;
      }
    });
  }, [drivers, selectedDriverId, onSelectDriver]);

  // Update User Markers dynamically
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    const currentMarkers = userMarkersRef.current;
    const activeUserIds = new Set(users.map((u) => u.id));

    // Remove deleted user markers
    Object.keys(currentMarkers).forEach((id) => {
      if (!activeUserIds.has(id)) {
        currentMarkers[id].remove();
        delete currentMarkers[id];
      }
    });

    users.forEach((user) => {
      const isSelected = user.id === selectedUserId;
      const isRequesting = user.status === 'requesting';
      const isInTrip = user.status === 'in_trip';

      let userBadgeBg = 'bg-sky-500';
      if (isRequesting) userBadgeBg = 'bg-rose-500 animate-pulse';
      if (isInTrip) userBadgeBg = 'bg-emerald-500';

      const iconHtml = `
        <div class="relative group cursor-pointer">
          ${isRequesting ? '<div class="user-request-pulse"></div>' : ''}
          <div class="w-9 h-9 rounded-full ${isLight ? 'bg-sky-50 border-sky-300' : 'bg-sky-950/90 border-sky-600'} border-2 ${
            isSelected ? (isLight ? 'border-sky-500 scale-125 z-30 shadow-lg shadow-sky-500/30' : 'border-sky-400 scale-125 z-30 shadow-lg shadow-sky-500/50') : 'shadow-md'
          } flex items-center justify-center transition-all duration-200">
            <span class="text-base">👤</span>
            <span class="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full ${userBadgeBg} border-2 ${isLight ? 'border-white' : 'border-slate-900'}"></span>
          </div>
          
          <div class="absolute -top-7 left-1/2 transform -translate-x-1/2 ${isLight ? 'bg-sky-50 text-sky-900 border-sky-200' : 'bg-sky-950/95 text-sky-100 border-sky-700'} text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap shadow-md pointer-events-none ${
            isSelected ? 'block z-40' : 'hidden group-hover:block'
          }">
            ${user.name} ${isRequesting ? '• Đang tìm xe...' : ''}
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
        
        // Remove old listeners to prevent stale closures
        marker.off('click');
        marker.off('mousedown');
        marker.off('mouseup');
        marker.off('mouseout');
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
      
      let longPressTimer: NodeJS.Timeout | null = null;

      const showDestinationPin = () => {
        if (!user.destination || !mapRef.current) return;
        if (destinationPreviewMarkerRef.current) {
          destinationPreviewMarkerRef.current.remove();
        }
        const destIcon = L.divIcon({
          className: 'custom-destination-preview-marker',
          html: `
            <div class="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg border-2 border-white animate-bounce">
              📍
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        });
        destinationPreviewMarkerRef.current = L.marker(
          [user.destination.lat, user.destination.lng],
          { icon: destIcon, interactive: false }
        )
          .bindTooltip(`Điểm đến: ${user.destination.address || 'Chưa xác định'}`, { direction: 'top', className: 'text-xs font-semibold' })
          .addTo(mapRef.current);
      };

      const hideDestinationPin = () => {
        if (destinationPreviewMarkerRef.current) {
          destinationPreviewMarkerRef.current.remove();
          destinationPreviewMarkerRef.current = null;
        }
      };

      marker.on('mousedown', (e) => {
        L.DomEvent.stopPropagation(e);
        showDestinationPin();
        longPressTimer = setTimeout(() => {
          longPressTimer = null;
          if (onUserLongPress) {
            onUserLongPress(user);
          }
        }, 2000); // 2 seconds
      });

      const clearTimer = () => {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
        hideDestinationPin();
      };

      marker.on('mouseup', clearTimer);
      marker.on('mouseout', clearTimer);

      // Native touch listeners: mouse events above don't reliably fire during a
      // sustained touch-and-hold on real mobile devices, so long-press needs its own binding.
      const el = marker.getElement();
      if (el) {
        const markerWithTouch = marker as L.Marker & { _touchLongPressHandlers?: { start: (ev: TouchEvent) => void; end: () => void } };
        const prevHandlers = markerWithTouch._touchLongPressHandlers;
        if (prevHandlers) {
          el.removeEventListener('touchstart', prevHandlers.start);
          el.removeEventListener('touchend', prevHandlers.end);
          el.removeEventListener('touchcancel', prevHandlers.end);
        }

        const handleTouchStart = (ev: TouchEvent) => {
          ev.stopPropagation();
          showDestinationPin();
          longPressTimer = setTimeout(() => {
            longPressTimer = null;
            if (onUserLongPress) {
              onUserLongPress(user);
            }
          }, 2000);
        };

        el.addEventListener('touchstart', handleTouchStart, { passive: true });
        el.addEventListener('touchend', clearTimer, { passive: true });
        el.addEventListener('touchcancel', clearTimer, { passive: true });
        markerWithTouch._touchLongPressHandlers = { start: handleTouchStart, end: clearTimer };
      }
    });
  }, [users, selectedUserId, onSelectUser, onUserLongPress]);

  // Render Routes and Pickup/Dropoff Markers for active trips
  useEffect(() => {
    if (!mapRef.current || !tripRoutesGroupRef.current) return;

    const group = tripRoutesGroupRef.current;
    group.clearLayers();

    trips.forEach((trip) => {
      const isSelected = trip.id === selectedTripId;
      const isEnRoute = trip.status === 'driver_en_route';
      const isInProgress = trip.status === 'in_progress';

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
        .bindTooltip(`Điểm đón: ${trip.userName}`, { direction: 'top', className: 'text-xs font-semibold' })
        .addTo(group);

      // Draw Dropoff Flag Marker (Red/Rose)
      const dropoffIcon = L.divIcon({
        className: 'custom-flag-marker',
        html: `
          <div class="w-7 h-7 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-xs border-2 border-slate-900 shadow-lg">
            B
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      L.marker([trip.dropoff.lat, trip.dropoff.lng], { icon: dropoffIcon })
        .bindTooltip(`Điểm đến: ${trip.dropoff.address || 'Đích đến'}`, { direction: 'top', className: 'text-xs font-semibold' })
        .addTo(group);

      // Draw route line from Pickup to Dropoff
      if (trip.pickupToDropoffRoute && trip.pickupToDropoffRoute.length > 0) {
        const routeLatLngs = trip.pickupToDropoffRoute.map((pt) => [pt.lat, pt.lng] as [number, number]);
        
        // Solid Glowing Main Route Line
        L.polyline(routeLatLngs, {
          color: isSelected ? '#10b981' : '#059669',
          weight: isSelected ? 6 : 4,
          opacity: isSelected ? 0.9 : 0.7,
          dashArray: isInProgress ? '8, 8' : undefined,
        }).addTo(group);
      }

      // Draw dashed route from Driver current position to Pickup if en route
      if (isEnRoute && trip.driverToPickupRoute && trip.driverToPickupRoute.length > 0) {
        const enRouteLatLngs = trip.driverToPickupRoute.map((pt) => [pt.lat, pt.lng] as [number, number]);
        
        L.polyline(enRouteLatLngs, {
          color: '#3b82f6',
          weight: 4,
          opacity: 0.85,
          dashArray: '6, 6',
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
            {mapClickMode === 'add_user' && 'Nhấp vào vị trí bất kỳ trên bản đồ để TẠO NGƯỜI DÙNG'}
            {mapClickMode === 'add_driver' && 'Nhấp vào vị trí bất kỳ trên bản đồ để TẠO TÀI XẾ'}
            {mapClickMode === 'set_pickup' && 'Nhấp vào bản đồ để CHỌN ĐIỂM ĐÓN (A)'}
            {mapClickMode === 'set_dropoff' && 'Nhấp vào bản đồ để CHỌN ĐIỂM ĐẾN (B)'}
          </div>
          <button
            onClick={() => onMapClickAction({ lat: 0, lng: 0 })}
            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${isLight ? 'text-emerald-700 hover:text-white hover:bg-emerald-600 border-emerald-300 bg-white' : 'text-emerald-300 hover:text-white bg-emerald-950 border-emerald-700'}`}
          >
            Hủy chọn
          </button>
        </div>
      )}

    </div>
  );
};
