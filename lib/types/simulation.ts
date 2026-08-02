export type VehicleType = 'motorbike' | 'car_4' | 'car_7';

// idle: rảnh, chưa làm gì. driving: đang là tài xế của 1 chuyến đi họ tự tạo.
// riding: đang là hành khách ngồi trong 1 chuyến đi (dành cho tính năng "Tìm chuyến đi" sau này).
export type UserStatus = 'idle' | 'driving' | 'riding';

export type TripStatus = 'in_progress' | 'completed' | 'cancelled';

export interface Location {
  lat: number;
  lng: number;
  address?: string;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  avatar: string;
  location: Location;
  status: UserStatus;
  heading?: number; // 0 to 360 degrees, set while driving a trip
}

// A single seat in a trip. passengerUserId is null while the seat is empty.
export interface TripSlot {
  passengerUserId: string | null;
}

export interface Trip {
  id: string;
  driverUserId: string;
  driverName: string;
  driverAvatar: string;
  driverPhone: string;
  vehicleType: VehicleType;
  slots: TripSlot[]; // length = passenger capacity for this vehicle type
  pickup: Location; // the driver's own location at trip creation time
  destination: Location;
  status: TripStatus;
  routeWaypoints: Location[];
  routeIndex: number;
  progress: number; // 0 to 100
  distanceKm: number;
  fareVND: number;
  etaSeconds: number;
  createdAt: number; // timestamp
}

export type MapClickMode =
  | 'none'
  | 'pick_random_center'
  | 'pick_trip_destination'
  | 'pick_demo_center';

export type TileLayerType = 'osm' | 'positron' | 'dark' | 'satellite';

export type ThemeMode = 'light' | 'dark';

export interface CityPreset {
  id: string;
  name: string;
  country: string;
  center: [number, number];
  zoom: number;
  landmarks: { name: string; location: Location }[];
}

export interface SimulationLog {
  id: string;
  time: string;
  type: 'user' | 'trip' | 'system';
  message: string;
  level?: 'info' | 'success' | 'warning' | 'error';
}

export interface CommandSpec {
  cmd: string;
  usage: string;
  desc: string;
}
