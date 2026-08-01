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
  ThemeMode
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

export default function App() {
  // Theme State
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');

  // City & Viewport State
  const [currentCity, setCurrentCity] = useState<CityPreset>(CITY_PRESETS[0]);
  const [tileLayerType, setTileLayerType] = useState<TileLayerType>('positron');

  // Toggle Theme logic
  const handleToggleTheme = () => {
    setThemeMode((prev) => {
      const nextTheme = prev === 'light' ? 'dark' : 'light';
      if (nextTheme === 'light' && tileLayerType === 'dark') {
        setTileLayerType('positron');
      } else if (nextTheme === 'dark' && (tileLayerType === 'positron' || tileLayerType === 'osm')) {
        setTileLayerType('dark');
      }
      return nextTheme;
    });
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

  // Fetch data function
  const fetchInitialData = useCallback(async () => {
    try {
      const [usersRes, vehiclesRes] = await Promise.all([
        fetch(import.meta.env.VITE_APP_URL ? `${import.meta.env.VITE_APP_URL}/api/users` : '/api/users'),
        fetch(import.meta.env.VITE_APP_URL ? `${import.meta.env.VITE_APP_URL}/api/vehicles` : '/api/vehicles')
      ]);
      
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        const mappedUsers: User[] = usersData.map((u: any) => {
          let loc = u.location;
          if (typeof loc === 'string') {
            try { loc = JSON.parse(loc); } catch(e) {}
          }
          return {
            id: String(u.id_user),
            name: u.name || `User ${u.id_user}`,
            phone: u.phone || '',
            avatar: u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=u_${u.id_user}`,
            location: {
              lat: loc?.lat || loc?.latitude || CITY_PRESETS[0].center[0],
              lng: loc?.lng || loc?.longitude || CITY_PRESETS[0].center[1],
            },
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
      }

      if (vehiclesRes.ok) {
        const vehiclesData = await vehiclesRes.json();
        const mappedDrivers: Driver[] = vehiclesData.map((v: any) => {
          let loc = v.location;
          if (typeof loc === 'string') {
            try { loc = JSON.parse(loc); } catch(e) {}
          }
          return {
            id: String(v.driver_id),
            name: `Tài xế ${v.driver_id}`,
            phone: '',
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=drv_${v.driver_id}`,
            location: {
              lat: loc?.lat || loc?.latitude || CITY_PRESETS[0].center[0],
              lng: loc?.lng || loc?.longitude || CITY_PRESETS[0].center[1],
            },
            vehicleType: 'car_4',
            plateNumber: `Xe ${v.id_vehicle}`,
            rating: 5,
            status: loc?.isOnline ? 'available' : 'offline',
            speedKmH: 40,
            heading: 0,
            totalTrips: 0,
          };
        });
        setDrivers(mappedDrivers);
        addLog(`Đã tải ${mappedDrivers.length} tài xế từ CSDL`, 'success', 'system');
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

    if (!user || !driver) return;
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

      availableDrivers.forEach((driver) => {
        // Match vehicle preference if specified
        if (
          user.requestedVehicleType !== 'any' &&
          driver.vehicleType !== user.requestedVehicleType
        ) {
          return;
        }

        const dist = calculateDistanceKm(user.location, driver.location);
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

      // 2. Idle wandering for available drivers
      setDrivers((prevDrivers) =>
        prevDrivers.map((d) => {
          if (d.status !== 'available') return d;

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

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden font-sans select-none ${
      themeMode === 'light' ? 'theme-light bg-slate-100 text-slate-800' : 'theme-dark bg-slate-950 text-slate-100'
    }`}>
      {/* Top Header Controls Bar */}
      <Header
        currentCity={currentCity}
        onSelectCity={handleSelectCity}
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

      {/* Main Container: Sidebar + Leaflet Map */}
      <div className="flex-1 flex overflow-hidden relative">
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
        />

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
          currentCity={currentCity}
          onSelectLandmark={(loc) => {
            // Center map or create user at landmark
            addLog(`Đã chuyển tới địa danh: ${loc.address || 'Điểm quan tâm'}`, 'info', 'system');
          }}
          onRequestRideForUser={handleRequestRide}
          onUserLongPress={handleUserLongPress}
        />
      </div>
    </div>
  );
}
