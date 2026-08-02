import { Location } from '../types/simulation';

/**
 * Calculates distance in kilometers between two lat/lng points using Haversine formula
 */
export function calculateDistanceKm(loc1: Location, loc2: Location): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(loc2.lat - loc1.lat);
  const dLng = toRad(loc2.lng - loc1.lng);
  const lat1 = toRad(loc1.lat);
  const lat2 = toRad(loc2.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function toDeg(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Calculates bearing angle (0 - 360 deg) from loc1 to loc2
 */
export function calculateBearing(loc1: Location, loc2: Location): number {
  const lat1 = toRad(loc1.lat);
  const lat2 = toRad(loc2.lat);
  const dLng = toRad(loc2.lng - loc1.lng);

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  let brng = toDeg(Math.atan2(y, x));
  return (brng + 360) % 360;
}

/**
 * Generates intermediate route waypoints with realistic road-like slight jitter
 */
export function generateRouteWaypoints(
  start: Location,
  end: Location,
  steps: number = 20
): Location[] {
  const points: Location[] = [];
  const distance = calculateDistanceKm(start, end);
  
  // Dynamic step count based on distance
  const actualSteps = Math.max(10, Math.min(60, Math.floor(steps * Math.max(1, distance * 2))));

  for (let i = 0; i <= actualSteps; i++) {
    const fraction = i / actualSteps;
    
    // Linear interpolation
    let lat = start.lat + (end.lat - start.lat) * fraction;
    let lng = start.lng + (end.lng - start.lng) * fraction;

    // Add subtle perpendicular curvature to simulate streets instead of straight lines
    if (i > 0 && i < actualSteps) {
      const curveFactor = Math.sin(fraction * Math.PI) * 0.0012;
      lat += (i % 2 === 0 ? 1 : -1) * curveFactor * 0.3;
      lng += (i % 3 === 0 ? 1 : -1) * curveFactor * 0.3;
    }

    points.push({ lat, lng });
  }

  return points;
}

export interface RoadRoute {
  waypoints: Location[];
  distanceKm: number;
  durationSeconds: number;
}

/**
 * Fetches a real road-snapped route between two points via the public OSRM API.
 * Returns null on failure so callers can fall back to generateRouteWaypoints.
 */
export async function fetchRoadRoute(start: Location, end: Location): Promise<RoadRoute | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    const data = await response.json();
    const route = data.routes?.[0];
    if (!route) return null;

    // OSRM returns coordinates as [lng, lat]; our Location type uses {lat, lng}
    const waypoints: Location[] = route.geometry.coordinates.map(
      ([lng, lat]: [number, number]) => ({ lat, lng })
    );

    return {
      waypoints,
      distanceKm: route.distance / 1000,
      durationSeconds: route.duration,
    };
  } catch (error) {
    console.error('Error fetching OSRM route:', error);
    return null;
  }
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
}

/**
 * Looks up a place name/address via the public Nominatim (OSM) geocoding API.
 * Returns null if nothing is found or the request fails.
 */
export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(trimmed)}`;
    const response = await fetch(url, {
      headers: { 'Accept-Language': 'vi' },
    });
    const results = await response.json();
    const first = results?.[0];
    if (!first) return null;

    return {
      lat: parseFloat(first.lat),
      lng: parseFloat(first.lon),
      displayName: first.display_name,
    };
  } catch (error) {
    console.error('Error geocoding address:', error);
    return null;
  }
}

/**
 * Generates a random location around a given center point within radius in km
 */
export function generateRandomLocation(center: Location, radiusKm: number = 2): Location {
  const rInDeg = radiusKm / 111.32; // ~111km per degree lat
  const u = Math.random();
  const v = Math.random();
  const w = rInDeg * Math.sqrt(u);
  const t = 2 * Math.PI * v;
  const x = w * Math.cos(t);
  const y = w * Math.sin(t);

  const newLng = x / Math.cos(toRad(center.lat));
  const newLat = y;

  return {
    lat: Number((center.lat + newLat).toFixed(6)),
    lng: Number((center.lng + newLng).toFixed(6)),
  };
}

/**
 * Format currency in VND
 */
export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

/**
 * Calculates estimated fare in VND based on vehicle type and distance
 */
export function calculateFare(distanceKm: number, vehicleType: string): number {
  let baseFare = 12000;
  let perKmRate = 10000;

  switch (vehicleType) {
    case 'motorbike':
      baseFare = 12000;
      perKmRate = 6000;
      break;
    case 'car_4':
      baseFare = 20000;
      perKmRate = 13500;
      break;
    case 'car_7':
      baseFare = 25000;
      perKmRate = 16000;
      break;
    default:
      baseFare = 15000;
      perKmRate = 8000;
  }

  const total = baseFare + Math.max(0, distanceKm - 1) * perKmRate;
  // Round to nearest 1,000 VND
  return Math.round(total / 1000) * 1000;
}

/**
 * Approximate address generator based on coordinates or landmarks
 */
export function getApproximateAddress(loc: Location): string {
  const streetNames = [
    'Nguyễn Huệ', 'Lê Lợi', 'Đồng Khởi', 'Nguyễn Thị Minh Khai', 
    'Cách Mạng Tháng 8', 'Nam Kỳ Khởi Nghĩa', 'Võ Văn Kiệt', 'Điện Biên Phủ',
    'Hoàng Văn Thụ', 'Phạm Văn Đồng', 'Trần Hưng Đạo', 'Lê Văn Sỹ'
  ];
  const districtNames = ['Quận 1', 'Quận 3', 'Quận 5', 'Quận 7', 'Quận 10', 'Bình Thạnh', 'Tân Bình'];
  
  const houseNumber = Math.floor((Math.abs(loc.lat * 1000) % 300) + 1);
  const street = streetNames[Math.floor(Math.abs(loc.lng * 1000) % streetNames.length)];
  const district = districtNames[Math.floor(Math.abs((loc.lat + loc.lng) * 1000) % districtNames.length)];

  return `${houseNumber} ${street}, ${district}`;
}
