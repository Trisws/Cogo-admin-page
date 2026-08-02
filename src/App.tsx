import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { LeafletMap } from './components/LeafletMap';
import { Sidebar } from './components/Sidebar/Sidebar';
import { 
  Driver, 
  User, 
  Trip, 
  SimulationLog, 
  CityPreset, 
  MapClickMode, 
  TileLayerType, 
  Location,
  DriverStatus,
  VehicleType,
  ThemeMode,
  CommandSpec
} from '../lib/types/simulation';
import { 
  CITY_PRESETS, 
  generateInitialDrivers, 
  generateInitialUsers, 
  getRandomDriverName, 
  getRandomUserName, 
  getRandomPlateNumber, 
  getRandomPhoneNumber,
  VEHICLE_CONFIGS 
} from '../lib/utils/presets';
import {
  calculateDistanceKm,
  calculateBearing,
  generateRouteWaypoints,
  calculateFare,
  getApproximateAddress,
  generateRandomLocation,
  fetchRoadRoute
} from '../lib/utils/geo';

const COMMAND_LIST: CommandSpec[] = [
  { cmd: 'help', usage: 'help', desc: 'danh sách lệnh' },
  { cmd: 'ls', usage: 'ls drivers|users|trips', desc: 'liệt kê nhanh' },
  { cmd: 'driver', usage: 'driver <id> on|off', desc: 'bật/tắt tài xế' },
  { cmd: 'dispatch', usage: 'dispatch <userId> <driverId>', desc: 'ghép chuyến thủ công' },
  { cmd: 'cancel', usage: 'cancel <tripId>', desc: 'hủy chuyến' },
  { cmd: 'finish', usage: 'finish <tripId>', desc: 'hoàn thành ngay' },
  { cmd: 'seed', usage: 'seed [drivers|users] [n]', desc: 'sinh dữ liệu ảo' },
  { cmd: 'pause', usage: 'pause', desc: 'tạm dừng mô phỏng' },
  { cmd: 'resume', usage: 'resume', desc: 'chạy mô phỏng' },
  { cmd: 'speed', usage: 'speed <1|2|5|10>', desc: 'tốc độ mô phỏng' },
  { cmd: 'theme', usage: 'theme light|dark', desc: 'đổi giao diện' },
  { cmd: 'city', usage: 'city <cityId>', desc: 'đổi khu vực' },
  { cmd: 'reset', usage: 'reset', desc: 'nạp lại dữ liệu từ CSDL' },
  { cmd: 'clear', usage: 'clear [all]', desc: 'xóa màn hình / xóa sạch dữ liệu' },
];

const HELP_TEXT = COMMAND_LIST.map((c) => `${c.usage.padEnd(30)} - ${c.desc}`).join('\n');

export default function App() {
  // Theme State
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');

  // City & Viewport State
  const [currentCity, setCurrentCity] = useState<CityPreset>(CITY_PRESETS[0]);
  const [tileLayerType, setTileLayerType] = useState<TileLayerType>('osm');

  // Toggle Theme logic (only affects UI chrome, not the map tile layer —
  // the tile layer is controlled solely by the Bản/Vệ buttons)
  const handleToggleTheme = () => {
    setThemeMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Simulation Data State
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [logs, setLogs] = useState<SimulationLog[]>([]);

  // Add Log Helper
  const addLog = useCallback((message: string, level: 'info' | 'success' | 'warning' | 'error' = 'info', type: 'user' | 'driver' | 'trip' | 'system' = 'system') => {
    const time = new Date().toLocaleTimeString('vi-VN');
    setLogs((prev) => [
      { id: `log-${Date.now()}-${Math.random()}`, time, message, level, type },
      ...prev.slice(0, 99), // keep last 100 logs
    ]);
  }, []);

  // Tracks the most recent "should this fetch's result still be applied" request.
  // Bumped by handleClearAllData so an in-flight fetch from page load/StrictMode
  // double-invoke can't silently overwrite an explicit clear with stale DB data.
  const fetchGenerationRef = useRef(0);

  // Fetch data function
  const fetchInitialData = useCallback(async () => {
    const myGeneration = ++fetchGenerationRef.current;
    try {
      const [usersRes, vehiclesRes] = await Promise.all([
        fetch(import.meta.env.VITE_APP_URL ? `${import.meta.env.VITE_APP_URL}/api/users` : '/api/users'),
        fetch(import.meta.env.VITE_APP_URL ? `${import.meta.env.VITE_APP_URL}/api/vehicles` : '/api/vehicles')
      ]);

      // vehicles.id_user is a subset of users.id_user — a user who owns a vehicle
      // IS that driver, so they must be excluded from the customer list below.
      const driverIdUsers = new Set<string>();
      if (vehiclesRes.ok) {
        const peek = await vehiclesRes.clone().json();
        peek.forEach((v: any) => driverIdUsers.add(String(v.id_user)));
      }

      if (usersRes.ok && fetchGenerationRef.current === myGeneration) {
        const usersData = await usersRes.json();
        const mappedUsers: User[] = usersData
          .filter((u: any) => !driverIdUsers.has(String(u.id_user)))
          .map((u: any) => {
          let loc = u.location;
          if (typeof loc === 'string') {
            try { loc = JSON.parse(loc); } catch(e) {}
          }
          const lat = loc?.lat ?? loc?.latitude;
          const lng = loc?.lng ?? loc?.longitude;
          const hasLocation = typeof lat === 'number' && typeof lng === 'number';
          return {
            id: String(u.id_user),
            name: u.name || `User ${u.id_user}`,
            phone: u.phone || '',
            avatar: u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=u_${u.id_user}`,
            location: hasLocation ? { lat, lng } : null,
            status: u.driver_id ? 'in_trip' : 'idle',
            requestedVehicleType: 'any',
            destination: u.destination
              ? {
                  lat: u.destination.lat,
                  lng: u.destination.lng,
                  address: u.destination.address,
                }
              : undefined,
          };
        });
        setUsers(mappedUsers);
        addLog(`Đã tải ${mappedUsers.length} khách hàng từ CSDL`, 'success', 'system');
      } else if (!usersRes.ok && fetchGenerationRef.current === myGeneration) {
        addLog(`Lỗi tải khách hàng từ CSDL (HTTP ${usersRes.status}) — kiểm tra cấu hình kết nối database`, 'error', 'system');
      }

      if (vehiclesRes.ok && fetchGenerationRef.current === myGeneration) {
        const vehiclesData = await vehiclesRes.json();
        const mappedDrivers: Driver[] = vehiclesData.map((v: any) => {
          let loc = v.location;
          if (typeof loc === 'string') {
            try { loc = JSON.parse(loc); } catch(e) {}
          }
          const typeStr = (v.type_vehicle || '').toLowerCase();
          const vehicleType: VehicleType = typeStr.includes('máy') || typeStr.includes('may')
            ? 'motorbike'
            : typeStr.includes('tải') || typeStr.includes('giao')
              ? 'delivery'
              : typeStr.includes('7')
                ? 'car_7'
                : 'car_4';
          return {
            id: String(v.id_vehicle),
            name: v.driver_name || `Tài xế #${v.id_user}`,
            phone: '',
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=drv_${v.id_vehicle}`,
            location: {
              lat: loc?.lat || loc?.latitude || CITY_PRESETS[0].center[0],
              lng: loc?.lng || loc?.longitude || CITY_PRESETS[0].center[1],
              address: loc?.address || undefined,
            },
            vehicleType,
            plateNumber: v.name_vehicle || `Xe ${v.id_vehicle}`,
            rating: 5,
            status: loc?.isOnline ? 'available' : 'offline',
            speedKmH: 40,
            heading: 0,
            totalTrips: 0,
            isFromDb: true,
          };
        });
        setDrivers(mappedDrivers);
        addLog(`Đã tải ${mappedDrivers.length} tài xế từ CSDL`, 'success', 'system');
      } else if (!vehiclesRes.ok && fetchGenerationRef.current === myGeneration) {
        addLog(`Lỗi tải tài xế từ CSDL (HTTP ${vehiclesRes.status}) — kiểm tra cấu hình kết nối database`, 'error', 'system');
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
      addLog('Lỗi khi tải dữ liệu từ CSDL', 'error', 'system');
    }
  }, [addLog]);

  // Fetch initial data from DB
  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Tracks driver/user ids currently mid-dispatch (route fetch in flight) so the
  // auto-dispatch loop doesn't re-match them again before the trip is created.
  const pendingDispatchDriverIds = useRef<Set<string>>(new Set());
  const pendingDispatchUserIds = useRef<Set<string>>(new Set());

  // Selection & Interactive Controls State
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [mapClickMode, setMapClickMode] = useState<MapClickMode>('none');

  // Simulation Engine Settings
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(2); // 1x, 2x, 5x, 10x
  const [autoDispatch, setAutoDispatch] = useState<boolean>(true);

  // Initial welcome log
  useEffect(() => {
    addLog('Hệ thống giả lập bản đồ Leaflet sẵn sàng - TP. Hồ Chí Minh', 'success', 'system');
  }, [addLog]);

  // Switch City
  const handleSelectCity = (city: CityPreset) => {
    setCurrentCity(city);
    const newDrivers = generateInitialDrivers(city.center, 8);
    const newUsers = generateInitialUsers(city.center, 5);
    setDrivers(newDrivers);
    setUsers(newUsers);
    setTrips([]);
    setSelectedDriverId(null);
    setSelectedUserId(null);
    setSelectedTripId(null);
    addLog(`Đã chuyển khu vực đến: ${city.name}`, 'info', 'system');
  };

  // Pan the map to a searched location without touching existing driver/user data
  // (their coordinates come from the DB and must stay fixed, not be randomized)
  const handleSearchLocation = (city: CityPreset) => {
    setCurrentCity(city);
    addLog(`Đã di chuyển bản đồ đến: ${city.name}`, 'info', 'system');
  };

  // Reset Simulation Data
  const handleResetSimulation = () => {
    fetchInitialData();
    setTrips([]);
    setLogs([]);
    setSelectedDriverId(null);
    setSelectedUserId(null);
    setSelectedTripId(null);
    addLog('Đã đặt lại toàn bộ dữ liệu giả lập từ CSDL', 'warning', 'system');
  };

  // Clear All Data
  const handleClearAllData = () => {
    fetchGenerationRef.current++; // invalidate any in-flight fetchInitialData so it can't overwrite this clear
    setDrivers([]);
    setUsers([]);
    setTrips([]);
    setSelectedDriverId(null);
    setSelectedUserId(null);
    setSelectedTripId(null);
    addLog('Đã xóa tất cả dữ liệu hiện tại (Tài xế, Khách hàng, Chuyến đi)', 'error', 'system');
  };

  // Seed extra random entities
  const handleSeedRandom = () => {
    const extraDrivers = generateInitialDrivers(currentCity.center, 4);
    const extraUsers = generateInitialUsers(currentCity.center, 3);
    setDrivers((prev) => [...prev, ...extraDrivers]);
    setUsers((prev) => [...prev, ...extraUsers]);
    addLog('Đã tạo thêm 4 tài xế và 3 khách hàng xung quanh thành phố', 'info', 'system');
  };

  // User Actions
  const handleAddUser = (userData: Omit<User, 'id' | 'status'>) => {
    const newUser: User = {
      ...userData,
      id: `usr-${Date.now()}`,
      status: 'idle',
      location: {
        ...userData.location,
        address: userData.location.address || getApproximateAddress(userData.location),
      },
    };
    setUsers((prev) => [newUser, ...prev]);
    setSelectedUserId(newUser.id);
    addLog(`Đã tạo khách hàng mới: ${newUser.name}`, 'success', 'user');
  };

  const handleDeleteUser = (userId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    if (selectedUserId === userId) setSelectedUserId(null);
    addLog('Đã xóa thông tin khách hàng', 'info', 'user');
  };

  const handleRequestRide = (user: User) => {
    // Update user status to requesting
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, status: 'requesting' } : u))
    );
    addLog(`Khách hàng ${user.name} đang tìm xe...`, 'warning', 'user');
  };

  const handleBatchGenerateUsers = (count: number) => {
    const batch = generateInitialUsers(currentCity.center, count);
    setUsers((prev) => [...batch, ...prev]);
    addLog(`Đã tạo nhanh ${count} khách hàng mới`, 'info', 'user');
  };

  // Driver Actions
  const handleAddDriver = (driverData: Omit<Driver, 'id' | 'status' | 'heading' | 'totalTrips'>) => {
    const newDriver: Driver = {
      ...driverData,
      id: `drv-${Date.now()}`,
      status: 'available',
      heading: Math.floor(Math.random() * 360),
      totalTrips: 0,
      location: {
        ...driverData.location,
        address: driverData.location.address || getApproximateAddress(driverData.location),
      },
    };
    setDrivers((prev) => [newDriver, ...prev]);
    setSelectedDriverId(newDriver.id);
    addLog(`Tài xế ${newDriver.name} (${newDriver.plateNumber}) đã xuất bến`, 'success', 'driver');
  };

  const handleDeleteDriver = (driverId: string) => {
    setDrivers((prev) => prev.filter((d) => d.id !== driverId));
    if (selectedDriverId === driverId) setSelectedDriverId(null);
    addLog('Đã xóa thông tin tài xế', 'info', 'driver');
  };

  const handleToggleDriverStatus = (driverId: string, newStatus: DriverStatus) => {
    setDrivers((prev) =>
      prev.map((d) => (d.id === driverId ? { ...d, status: newStatus } : d))
    );
    addLog(`Tài xế đổi trạng thái: ${newStatus === 'available' ? '🟢 Sẵn sàng' : '⚪ Ngoại tuyến'}`, 'info', 'driver');
  };

  const handleBatchGenerateDrivers = (count: number) => {
    const batch = generateInitialDrivers(currentCity.center, count);
    setDrivers((prev) => [...batch, ...prev]);
    addLog(`Đã tạo nhanh ${count} tài xế mới quanh bản đồ`, 'info', 'driver');
  };

  // Manual & Auto Dispatch Trip Logic
  const handleDispatchTrip = useCallback(async (userId: string, driverId: string) => {
    const user = users.find((u) => u.id === userId);
    const driver = drivers.find((d) => d.id === driverId);

    if (!user || !driver || !user.location) return;
    if (pendingDispatchDriverIds.current.has(driverId) || pendingDispatchUserIds.current.has(userId)) return;

    pendingDispatchDriverIds.current.add(driverId);
    pendingDispatchUserIds.current.add(userId);

    try {
      const pickup = user.location;
      const dropoff = user.destination || generateRandomLocation(pickup, 3);

      // Fetch real road-snapped routes (OSRM); fall back to synthetic waypoints on failure
      const [driverToPickupRoad, pickupToDropoffRoad] = await Promise.all([
        fetchRoadRoute(driver.location, pickup),
        fetchRoadRoute(pickup, dropoff),
      ]);

      const driverToPickupRoute = driverToPickupRoad?.waypoints ?? generateRouteWaypoints(driver.location, pickup, 15);
      const pickupToDropoffRoute = pickupToDropoffRoad?.waypoints ?? generateRouteWaypoints(pickup, dropoff, 25);

      const distanceKm = Number(
        (pickupToDropoffRoad?.distanceKm ?? calculateDistanceKm(pickup, dropoff)).toFixed(1)
      );
      const fareVND = calculateFare(distanceKm, driver.vehicleType);
      const etaSeconds = pickupToDropoffRoad
        ? Math.round(pickupToDropoffRoad.durationSeconds)
        : Math.round((distanceKm / driver.speedKmH) * 3600);

      const newTrip: Trip = {
        id: `trip-${Date.now()}`,
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar,
        driverId: driver.id,
        driverName: driver.name,
        driverAvatar: driver.avatar,
        driverPhone: driver.phone,
        driverPlate: driver.plateNumber,
        pickup,
        dropoff,
        status: 'driver_en_route',
        vehicleType: driver.vehicleType,
        fareVND,
        distanceKm,
        createdAt: Date.now(),
        progress: 0,
        currentDriverPos: driver.location,
        driverToPickupRoute,
        pickupToDropoffRoute,
        routeIndex: 0,
        etaSeconds,
      };

      // Update Driver & User status
      setDrivers((prev) =>
        prev.map((d) => (d.id === driver.id ? { ...d, status: 'busy' } : d))
      );
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: 'in_trip' } : u))
      );

      setTrips((prev) => [newTrip, ...prev]);
      setSelectedTripId(newTrip.id);

      addLog(
        `Điều phối thành công! Tài xế ${driver.name} nhận chuyến của khách ${user.name}`,
        'success',
        'trip'
      );
    } finally {
      pendingDispatchDriverIds.current.delete(driverId);
      pendingDispatchUserIds.current.delete(userId);
    }
  }, [users, drivers, addLog]);

  const handleCancelTrip = (tripId: string) => {
    const trip = trips.find((t) => t.id === tripId);
    if (!trip) return;

    if (trip.driverId) {
      setDrivers((prev) =>
        prev.map((d) => (d.id === trip.driverId ? { ...d, status: 'available' } : d))
      );
    }
    setUsers((prev) =>
      prev.map((u) => (u.id === trip.userId ? { ...u, status: 'idle' } : u))
    );

    setTrips((prev) =>
      prev.map((t) => (t.id === tripId ? { ...t, status: 'cancelled' } : t))
    );

    addLog(`Đã hủy chuyến đi #${tripId.slice(-6)}`, 'warning', 'trip');
  };

  const handleForceFinishTrip = (tripId: string) => {
    const trip = trips.find((t) => t.id === tripId);
    if (!trip) return;

    if (trip.driverId) {
      setDrivers((prev) =>
        prev.map((d) =>
          d.id === trip.driverId
            ? {
                ...d,
                status: 'available',
                location: trip.dropoff,
                totalTrips: d.totalTrips + 1,
              }
            : d
        )
      );
    }
    setUsers((prev) =>
      prev.map((u) =>
        u.id === trip.userId ? { ...u, status: 'idle', location: trip.dropoff } : u
      )
    );

    setTrips((prev) =>
      prev.map((t) => (t.id === tripId ? { ...t, status: 'completed', progress: 100 } : t))
    );

    addLog(`Chuyến đi #${tripId.slice(-6)} hoàn thành! Thu nhập: ${trip.fareVND.toLocaleString()} VND`, 'success', 'trip');
  };

  // Auto Dispatcher Loop Effect
  useEffect(() => {
    if (!autoDispatch || !isSimulating) return;

    const requestingUsers = users.filter(
      (u) => u.status === 'requesting' && !pendingDispatchUserIds.current.has(u.id)
    );
    const availableDrivers = drivers.filter(
      (d) => d.status === 'available' && !pendingDispatchDriverIds.current.has(d.id)
    );

    if (requestingUsers.length === 0 || availableDrivers.length === 0) return;

    requestingUsers.forEach((user) => {
      // Find closest available driver
      let closestDriver: Driver | null = null;
      let minDistance = Infinity;

      if (!user.location) return;

      availableDrivers.forEach((driver) => {
        // Match vehicle preference if specified
        if (
          user.requestedVehicleType !== 'any' &&
          driver.vehicleType !== user.requestedVehicleType
        ) {
          return;
        }

        const dist = calculateDistanceKm(user.location as Location, driver.location);
        if (dist < minDistance) {
          minDistance = dist;
          closestDriver = driver;
        }
      });

      if (closestDriver && minDistance <= 8) {
        handleDispatchTrip(user.id, (closestDriver as Driver).id);
      }
    });
  }, [autoDispatch, isSimulating, users, drivers, handleDispatchTrip]);

  // Main Simulation Movement Tick Loop
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      // 1. Move drivers on active trips along route waypoints
      setTrips((prevTrips) => {
        return prevTrips.map((trip) => {
          if (trip.status === 'completed' || trip.status === 'cancelled') return trip;

          const isEnRoute = trip.status === 'driver_en_route';
          const activeRoute = isEnRoute ? trip.driverToPickupRoute : trip.pickupToDropoffRoute;

          if (!activeRoute || activeRoute.length === 0) return trip;

          const nextIndex = trip.routeIndex + 1;
          const totalPoints = activeRoute.length;

          if (nextIndex < totalPoints) {
            const nextPos = activeRoute[nextIndex];
            const prevPos = activeRoute[trip.routeIndex];
            const heading = calculateBearing(prevPos, nextPos);

            // Update driver position in state
            if (trip.driverId) {
              setDrivers((prevDrivers) =>
                prevDrivers.map((d) =>
                  d.id === trip.driverId
                    ? { ...d, location: nextPos, heading }
                    : d
                )
              );
            }

            // If in progress, update user position as well
            if (trip.status === 'in_progress') {
              setUsers((prevUsers) =>
                prevUsers.map((u) =>
                  u.id === trip.userId ? { ...u, location: nextPos } : u
                )
              );
            }

            const calcProgress = Number(((nextIndex / (totalPoints - 1)) * 100).toFixed(1));

            return {
              ...trip,
              routeIndex: nextIndex,
              currentDriverPos: nextPos,
              progress: calcProgress,
            };
          } else {
            // Reached end of current route leg!
            if (isEnRoute) {
              // Reached Pickup Point -> Transition to in_progress
              addLog(`Tài xế ${trip.driverName} đã đón khách ${trip.userName}`, 'info', 'trip');
              return {
                ...trip,
                status: 'in_progress',
                routeIndex: 0,
                progress: 0,
              };
            } else {
              // Reached Destination -> Complete Trip!
              handleForceFinishTrip(trip.id);
              return {
                ...trip,
                status: 'completed',
                progress: 100,
              };
            }
          }
        });
      });

      // 2. Idle wandering for available drivers (drivers loaded from the DB
      // keep their real fixed location and never wander)
      setDrivers((prevDrivers) =>
        prevDrivers.map((d) => {
          if (d.status !== 'available' || d.isFromDb) return d;

          // 20% chance per tick to wander slightly
          if (Math.random() > 0.25) return d;

          const stepKm = 0.0003 * simSpeed;
          const deltaLat = (Math.random() - 0.5) * stepKm;
          const deltaLng = (Math.random() - 0.5) * stepKm;

          const newPos: Location = {
            lat: Number((d.location.lat + deltaLat).toFixed(6)),
            lng: Number((d.location.lng + deltaLng).toFixed(6)),
          };

          const heading = calculateBearing(d.location, newPos);

          return {
            ...d,
            location: newPos,
            heading,
          };
        })
      );
    }, 400 / simSpeed);

    return () => clearInterval(interval);
  }, [isSimulating, simSpeed, addLog]);

  // Handle Map Click Actions (placing users/drivers or setting lat/lng)
  const handleMapClickAction = (loc: Location) => {
    if (mapClickMode === 'add_user') {
      handleAddUser({
        name: getRandomUserName(),
        phone: getRandomPhoneNumber(),
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}`,
        location: loc,
        destination: generateRandomLocation(loc, 2.5),
        requestedVehicleType: 'any',
      });
      setMapClickMode('none');
    } else if (mapClickMode === 'add_driver') {
      handleAddDriver({
        name: getRandomDriverName(),
        phone: getRandomPhoneNumber(),
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}`,
        location: loc,
        vehicleType: 'car_4',
        plateNumber: getRandomPlateNumber(),
        rating: 4.8,
        speedKmH: 40,
      });
      setMapClickMode('none');
    } else if (mapClickMode === 'set_pickup') {
      setMapClickMode('none');
    } else if (mapClickMode === 'set_dropoff') {
      if (selectedUserId) {
        setUsers((prev) => 
          prev.map((u) => 
            u.id === selectedUserId ? { ...u, destination: loc } : u
          )
        );
        const user = users.find(u => u.id === selectedUserId);
        if (user) {
          addLog(`Đã đặt lại điểm đến cho ${user.name}`, 'success', 'user');
        }
      }
      setMapClickMode('none');
    }
  };

  const handleUserLongPress = (user: User) => {
    setSelectedUserId(user.id);
    setMapClickMode('set_dropoff');
    addLog(`Đang chọn điểm đến mới cho ${user.name}... (Nhấp trên bản đồ)`, 'info', 'system');
  };

  // --- Command Bar: parses a typed command and dispatches to the same handlers as the UI ---
  const findDriver = useCallback(
    (frag: string) => drivers.find((d) => d.id === frag) || drivers.find((d) => d.id.endsWith(frag)),
    [drivers]
  );
  const findUser = useCallback(
    (frag: string) => users.find((u) => u.id === frag) || users.find((u) => u.id.endsWith(frag)),
    [users]
  );
  const findTrip = useCallback(
    (frag: string) => trips.find((t) => t.id === frag) || trips.find((t) => t.id.endsWith(frag)),
    [trips]
  );

  const handleRunCommand = useCallback(
    (raw: string): string => {
      const parts = raw.trim().split(/\s+/).filter(Boolean);
      if (parts.length === 0) return '';
      const [cmd, ...args] = parts;
      const lower = cmd.toLowerCase();

      const fail = (msg: string) => {
        addLog(`$ ${raw} → ${msg}`, 'error', 'system');
        return msg;
      };
      const ok = (msg: string) => {
        addLog(`$ ${raw} → ${msg}`, 'success', 'system');
        return msg;
      };

      switch (lower) {
        case 'help':
          return HELP_TEXT;

        case 'ls': {
          const target = args[0]?.toLowerCase();
          if (target === 'drivers') {
            return ok(`${drivers.length} tài xế: ${drivers.map((d) => d.id.slice(-6)).join(', ') || '(trống)'}`);
          }
          if (target === 'users') {
            return ok(`${users.length} khách hàng: ${users.map((u) => u.id.slice(-6)).join(', ') || '(trống)'}`);
          }
          if (target === 'trips') {
            return ok(`${trips.length} chuyến: ${trips.map((t) => t.id.slice(-6)).join(', ') || '(trống)'}`);
          }
          return fail('dùng: ls drivers|users|trips');
        }

        case 'driver': {
          const [idFrag, action] = args;
          const driver = idFrag ? findDriver(idFrag) : undefined;
          if (!driver) return fail(`không tìm thấy tài xế "${idFrag ?? ''}"`);
          if (action !== 'on' && action !== 'off') return fail('dùng: driver <id> on|off');
          handleToggleDriverStatus(driver.id, action === 'on' ? 'available' : 'offline');
          return ok(`tài xế ${driver.name} → ${action === 'on' ? 'ONLINE' : 'OFFLINE'}`);
        }

        case 'dispatch': {
          const [userFrag, driverFrag] = args;
          const user = userFrag ? findUser(userFrag) : undefined;
          const driver = driverFrag ? findDriver(driverFrag) : undefined;
          if (!user || !driver) return fail('dùng: dispatch <userId> <driverId>');
          handleDispatchTrip(user.id, driver.id);
          return ok(`đang ghép ${user.name} với ${driver.name}...`);
        }

        case 'cancel': {
          const trip = args[0] ? findTrip(args[0]) : undefined;
          if (!trip) return fail(`không tìm thấy chuyến "${args[0] ?? ''}"`);
          handleCancelTrip(trip.id);
          return ok(`đã hủy chuyến #${trip.id.slice(-6)}`);
        }

        case 'finish': {
          const trip = args[0] ? findTrip(args[0]) : undefined;
          if (!trip) return fail(`không tìm thấy chuyến "${args[0] ?? ''}"`);
          handleForceFinishTrip(trip.id);
          return ok(`đã hoàn thành chuyến #${trip.id.slice(-6)}`);
        }

        case 'seed': {
          const kind = args[0]?.toLowerCase();
          const count = Number(args[1]) || 5;
          if (!kind) {
            handleSeedRandom();
            return ok('đã sinh thêm dữ liệu ngẫu nhiên quanh bản đồ');
          }
          if (kind === 'drivers') {
            handleBatchGenerateDrivers(count);
            return ok(`đã sinh ${count} tài xế mới`);
          }
          if (kind === 'users') {
            handleBatchGenerateUsers(count);
            return ok(`đã sinh ${count} khách hàng mới`);
          }
          return fail('dùng: seed [drivers|users] [n]');
        }

        case 'pause':
          setIsSimulating(false);
          return ok('đã tạm dừng mô phỏng');

        case 'resume':
          setIsSimulating(true);
          return ok('đã chạy mô phỏng');

        case 'speed': {
          const spd = Number(args[0]);
          if (![1, 2, 5, 10].includes(spd)) return fail('dùng: speed <1|2|5|10>');
          setSimSpeed(spd);
          return ok(`tốc độ mô phỏng: ${spd}x`);
        }

        case 'theme': {
          const mode = args[0]?.toLowerCase();
          if (mode !== 'light' && mode !== 'dark') return fail('dùng: theme light|dark');
          setThemeMode(mode);
          return ok(`giao diện: ${mode}`);
        }

        case 'city': {
          const city = CITY_PRESETS.find((c) => c.id === args[0]);
          if (!city) return fail(`không tìm thấy khu vực "${args[0] ?? ''}". Có: ${CITY_PRESETS.map((c) => c.id).join(', ')}`);
          handleSelectCity(city);
          return ok(`đã chuyển tới ${city.name}`);
        }

        case 'reset':
          handleResetSimulation();
          return ok('đã nạp lại dữ liệu từ CSDL');

        case 'clear':
          if (args[0] === 'all') {
            handleClearAllData();
            return ok('đã xóa sạch toàn bộ dữ liệu hiện tại');
          }
          return '__CLEAR__';

        default:
          return fail(`lệnh không hợp lệ: "${cmd}". Gõ "help" để xem danh sách lệnh.`);
      }
    },
    [
      drivers,
      users,
      trips,
      findDriver,
      findUser,
      findTrip,
      addLog,
      handleToggleDriverStatus,
      handleDispatchTrip,
      handleCancelTrip,
      handleForceFinishTrip,
      handleSeedRandom,
      handleBatchGenerateDrivers,
      handleBatchGenerateUsers,
      handleResetSimulation,
      handleClearAllData,
      handleSelectCity,
    ]
  );

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden select-none ${
      themeMode === 'light' ? 'theme-light bg-zinc-50 text-zinc-900' : 'theme-dark bg-zinc-950 text-zinc-100'
    }`}>
      {/* Top Header Controls Bar */}
      <Header
        currentCity={currentCity}
        onSelectCity={handleSearchLocation}
        isSimulating={isSimulating}
        onToggleSimulate={() => setIsSimulating(!isSimulating)}
        simSpeed={simSpeed}
        onChangeSpeed={setSimSpeed}
        onReset={handleResetSimulation}
        onSeedRandom={handleSeedRandom}
        autoDispatch={autoDispatch}
        onToggleAutoDispatch={() => setAutoDispatch(!autoDispatch)}
        totalDrivers={drivers.length}
        availableDrivers={drivers.filter((d) => d.status === 'available').length}
        totalUsers={users.length}
        activeTrips={trips.filter((t) => t.status !== 'completed' && t.status !== 'cancelled').length}
        completedTrips={trips.filter((t) => t.status === 'completed').length}
        selectedTileLayer={tileLayerType}
        onChangeTileLayer={setTileLayerType}
        themeMode={themeMode}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Container: Leaflet Map + Panel */}
      <div className="flex-1 flex overflow-hidden relative">
        <LeafletMap
          center={currentCity.center}
          zoom={currentCity.zoom}
          drivers={drivers}
          users={users}
          trips={trips}
          selectedDriverId={selectedDriverId}
          selectedUserId={selectedUserId}
          selectedTripId={selectedTripId}
          onSelectDriver={(d) => setSelectedDriverId(d ? d.id : null)}
          onSelectUser={(u) => setSelectedUserId(u ? u.id : null)}
          onSelectTrip={(t) => setSelectedTripId(t ? t.id : null)}
          mapClickMode={mapClickMode}
          onMapClickAction={handleMapClickAction}
          tileLayerType={tileLayerType}
          onChangeTileLayer={setTileLayerType}
          onRequestRideForUser={handleRequestRide}
          onUserLongPress={handleUserLongPress}
        />

        <Sidebar
          drivers={drivers}
          users={users}
          trips={trips}
          logs={logs}
          selectedDriverId={selectedDriverId}
          selectedUserId={selectedUserId}
          selectedTripId={selectedTripId}
          onSelectDriver={(d) => setSelectedDriverId(d ? d.id : null)}
          onSelectUser={(u) => setSelectedUserId(u ? u.id : null)}
          onSelectTrip={(t) => setSelectedTripId(t ? t.id : null)}
          onAddUser={handleAddUser}
          onDeleteUser={handleDeleteUser}
          onRequestRide={handleRequestRide}
          onBatchGenerateUsers={handleBatchGenerateUsers}
          onAddDriver={handleAddDriver}
          onDeleteDriver={handleDeleteDriver}
          onToggleDriverStatus={handleToggleDriverStatus}
          onBatchGenerateDrivers={handleBatchGenerateDrivers}
          onResetSimulation={handleResetSimulation}
          onClearAllData={handleClearAllData}
          onSeedRandom={handleSeedRandom}
          onDispatchTrip={handleDispatchTrip}
          onCancelTrip={handleCancelTrip}
          onForceFinishTrip={handleForceFinishTrip}
          autoDispatch={autoDispatch}
          onToggleAutoDispatch={() => setAutoDispatch(!autoDispatch)}
          onClearLogs={() => setLogs([])}
          mapClickMode={mapClickMode}
          setMapClickMode={setMapClickMode}
          mapCenterLocation={{ lat: currentCity.center[0], lng: currentCity.center[1] }}
          themeMode={themeMode}
          onRunCommand={handleRunCommand}
          commands={COMMAND_LIST}
        />
      </div>
    </div>
  );
}
