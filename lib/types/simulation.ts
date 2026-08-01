export type VehicleType = 'motorbike' | 'car_4' | 'car_7' | 'delivery';

export type DriverStatus = 'available' | 'busy' | 'offline';

export type UserStatus = 'idle' | 'requesting' | 'in_trip' | 'completed';

export type TripStatus = 
  | 'searching' 
  | 'driver_assigned' 
  | 'driver_en_route' 
  | 'in_progress' 
  | 'completed' 
  | 'cancelled';

export interface Location {
  lat: number;
  lng: number;
  address?: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  avatar: string;
  location: Location;
  vehicleType: VehicleType;
  plateNumber: string;
  rating: number;
  status: DriverStatus;
  speedKmH: number;
  heading: number; // 0 to 360 degrees
  totalTrips: number;
  targetLocation?: Location; // for wandering or navigating
}

export interface User {
  id: string;
  name: string;
  phone: string;
  avatar: string;
  location: Location;
  destination?: Location;
  status: UserStatus;
  requestedVehicleType: VehicleType | 'any';
  note?: string;
}

export interface Trip {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  driverId?: string;
  driverName?: string;
  driverAvatar?: string;
  driverPhone?: string;
  driverPlate?: string;
  pickup: Location;
  dropoff: Location;
  status: TripStatus;
  vehicleType: VehicleType;
  fareVND: number;
  distanceKm: number;
  createdAt: number; // timestamp
  progress: number; // 0 to 100 percentage of active leg
  currentDriverPos?: Location;
  pickupToDropoffRoute: Location[];
  driverToPickupRoute?: Location[];
  routeIndex: number;
  etaSeconds: number;
}

export type MapClickMode = 
  | 'none' 
  | 'add_user' 
  | 'add_driver' 
  | 'set_pickup' 
  | 'set_dropoff';

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
  type: 'user' | 'driver' | 'trip' | 'system';
  message: string;
  level?: 'info' | 'success' | 'warning' | 'error';
}

export interface FilterOptions {
  driverStatus: 'all' | DriverStatus;
  userStatus: 'all' | UserStatus;
  vehicleType: 'all' | VehicleType;
  searchQuery: string;
}
