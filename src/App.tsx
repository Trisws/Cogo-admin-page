import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { LeafletMap } from './components/LeafletMap';
import { Sidebar } from './components/Sidebar/Sidebar';
import {
  User,
  Trip,
  SimulationLog,
  CityPreset,
  MapClickMode,
  TileLayerType,
  Location,
  VehicleType,
  ThemeMode,
  CommandSpec
} from '../lib/types/simulation';
import {
  CITY_PRESETS,
  generateInitialUsers,
  VEHICLE_CONFIGS,
  TRIP_SLOT_CAPACITY
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
  { cmd: 'ls', usage: 'ls users|trips', desc: 'liệt kê nhanh' },
  { cmd: 'cancel', usage: 'cancel <tripId>', desc: 'hủy chuyến' },
  { cmd: 'finish', usage: 'finish <tripId>', desc: 'hoàn thành ngay' },
  { cmd: 'seed', usage: 'seed [n]', desc: 'sinh nhanh n khách hàng ảo' },
  { cmd: 'pause', usage: 'pause', desc: 'tạm dừng mô phỏng' },
  { cmd: 'resume', usage: 'resume', desc: 'chạy mô phỏng' },
  { cmd: 'speed', usage: 'speed <1|2|5|10>', desc: 'tốc độ mô phỏng' },
  { cmd: 'theme', usage: 'theme light|dark', desc: 'đổi giao diện' },
  { cmd: 'city', usage: 'city <cityId>', desc: 'đổi khu vực' },
  { cmd: 'reset', usage: 'reset', desc: 'đặt lại mô phỏng về trạng thái trống' },
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
  const [users, setUsers] = useState<User[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [logs, setLogs] = useState<SimulationLog[]>([]);

  // Add Log Helper
  const addLog = useCallback((message: string, level: 'info' | 'success' | 'warning' | 'error' = 'info', type: 'user' | 'trip' | 'system' = 'system') => {
    const time = new Date().toLocaleTimeString('vi-VN');
    setLogs((prev) => [
      { id: `log-${Date.now()}-${Math.random()}`, time, message, level, type },
      ...prev.slice(0, 99), // keep last 100 logs
    ]);
  }, []);

  // Selection & Interactive Controls State
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [mapClickMode, setMapClickMode] = useState<MapClickMode>('none');

  // Pending state for the map-click driven flows:
  // 1) picking a random-location center (pin) when creating a new user
  // 2) picking a destination for a trip a user is creating
  const [pendingRandomLocation, setPendingRandomLocation] = useState<Location | null>(null);
  const [tripDraft, setTripDraft] = useState<{ userId: string; vehicleType: VehicleType } | null>(null);

  // Pinned center used by every random demo-data generator (+5 khách, seed
  // random, ...) instead of scaling off the map's searched/panned location.
  // Falls back to the current city preset's center until a pin is dropped.
  const [demoDataCenter, setDemoDataCenter] = useState<Location | null>(null);
  const demoCenterTuple = (): [number, number] =>
    demoDataCenter ? [demoDataCenter.lat, demoDataCenter.lng] : currentCity.center;

  // Simulation Engine Settings
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(2); // 1x, 2x, 5x, 10x

  // Initial welcome log
  useEffect(() => {
    addLog('Hệ thống giả lập bản đồ Leaflet sẵn sàng - TP. Hồ Chí Minh', 'success', 'system');
  }, [addLog]);

  // Switch City (also reseeds a fresh batch of demo users around the new center)
  const handleSelectCity = (city: CityPreset) => {
    setCurrentCity(city);
    const newUsers = generateInitialUsers(city.center, 5);
    setUsers(newUsers);
    setTrips([]);
    setSelectedUserId(null);
    setSelectedTripId(null);
    addLog(`Đã chuyển khu vực đến: ${city.name}`, 'info', 'system');
  };

  // Pan the map to a searched location without touching existing user/trip data
  const handleSearchLocation = (city: CityPreset) => {
    setCurrentCity(city);
    addLog(`Đã di chuyển bản đồ đến: ${city.name}`, 'info', 'system');
  };

  // Clear All Data (reset simulation back to an empty slate)
  const handleClearAllData = () => {
    setUsers([]);
    setTrips([]);
    setSelectedUserId(null);
    setSelectedTripId(null);
    setPendingRandomLocation(null);
    setTripDraft(null);
    setMapClickMode('none');
    addLog('Đã xóa tất cả dữ liệu hiện tại (Khách hàng, Chuyến đi)', 'error', 'system');
  };

  // Seed extra random users
  const handleSeedRandom = () => {
    const extraUsers = generateInitialUsers(demoCenterTuple(), 5);
    setUsers((prev) => [...extraUsers, ...prev]);
    addLog('Đã tạo thêm 5 khách hàng ngẫu nhiên quanh vùng đã ghim', 'info', 'system');
  };

  // User Actions
  const handleAddUser = (userData: { name: string; phone: string; location: Location }) => {
    const newUser: User = {
      id: `usr-${Date.now()}`,
      name: userData.name,
      phone: userData.phone,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=u_${Date.now()}`,
      status: 'idle',
      location: {
        ...userData.location,
        address: userData.location.address || getApproximateAddress(userData.location),
      },
    };
    setUsers((prev) => [newUser, ...prev]);
    setSelectedUserId(newUser.id);
    setPendingRandomLocation(null);
    addLog(`Đã tạo khách hàng mới: ${newUser.name}`, 'success', 'user');
  };

  const handleDeleteUser = (userId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    if (selectedUserId === userId) setSelectedUserId(null);
    addLog('Đã xóa thông tin khách hàng', 'info', 'user');
  };

  const handleBatchGenerateUsers = (count: number) => {
    const batch = generateInitialUsers(demoCenterTuple(), count);
    setUsers((prev) => [...batch, ...prev]);
    addLog(`Đã tạo nhanh ${count} khách hàng mới`, 'info', 'user');
  };

  // Arms the "pick trip destination" map-click flow for a given user + vehicle type
  const handleStartCreateTrip = (userId: string, vehicleType: VehicleType) => {
    setTripDraft({ userId, vehicleType });
    setMapClickMode('pick_trip_destination');
    addLog('Đang chọn điểm đến cho chuyến đi... (Nhấp trên bản đồ)', 'info', 'system');
  };

  // Placeholder — "Tìm chuyến đi" behavior is not designed yet.
  const handleFindTrip = (user: User) => {
    addLog('Tính năng "Tìm chuyến đi" sẽ được thiết kế sau', 'info', 'system');
  };

  // Creates a trip: the creating user becomes the driver, starting from their
  // own current location, heading to the chosen destination.
  const handleCreateTrip = useCallback(async (userId: string, vehicleType: VehicleType, destination: Location) => {
    const user = users.find((u) => u.id === userId);
    if (!user || user.status !== 'idle') return;

    const pickup = user.location;
    const vConfig = VEHICLE_CONFIGS[vehicleType];

    const roadRoute = await fetchRoadRoute(pickup, destination);
    const waypoints = roadRoute?.waypoints ?? generateRouteWaypoints(pickup, destination, 25);
    const distanceKm = Number((roadRoute?.distanceKm ?? calculateDistanceKm(pickup, destination)).toFixed(1));
    const fareVND = calculateFare(distanceKm, vehicleType);
    const etaSeconds = roadRoute
      ? Math.round(roadRoute.durationSeconds)
      : Math.round((distanceKm / vConfig.speedKmH) * 3600);

    const capacity = TRIP_SLOT_CAPACITY[vehicleType];

    const newTrip: Trip = {
      id: `trip-${Date.now()}`,
      driverUserId: user.id,
      driverName: user.name,
      driverAvatar: user.avatar,
      driverPhone: user.phone,
      vehicleType,
      slots: Array.from({ length: capacity }, () => ({ passengerUserId: null })),
      pickup,
      destination: { ...destination, address: destination.address || getApproximateAddress(destination) },
      status: 'in_progress',
      routeWaypoints: waypoints,
      routeIndex: 0,
      progress: 0,
      distanceKm,
      fareVND,
      etaSeconds,
      createdAt: Date.now(),
    };

    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: 'driving' } : u)));
    setTrips((prev) => [newTrip, ...prev]);
    setSelectedTripId(newTrip.id);
    addLog(`${user.name} đã tạo chuyến đi bằng ${vConfig.name}`, 'success', 'trip');
  }, [users, addLog]);

  const handleCancelTrip = (tripId: string) => {
    const trip = trips.find((t) => t.id === tripId);
    if (!trip) return;

    setUsers((prev) =>
      prev.map((u) => (u.id === trip.driverUserId ? { ...u, status: 'idle' } : u))
    );
    setTrips((prev) =>
      prev.map((t) => (t.id === tripId ? { ...t, status: 'cancelled' } : t))
    );

    addLog(`Đã hủy chuyến đi #${tripId.slice(-6)}`, 'warning', 'trip');
  };

  const handleForceFinishTrip = (tripId: string) => {
    const trip = trips.find((t) => t.id === tripId);
    if (!trip) return;

    setUsers((prev) =>
      prev.map((u) =>
        u.id === trip.driverUserId ? { ...u, status: 'idle', location: trip.destination } : u
      )
    );
    setTrips((prev) =>
      prev.map((t) => (t.id === tripId ? { ...t, status: 'completed', progress: 100 } : t))
    );

    addLog(`Chuyến đi #${tripId.slice(-6)} hoàn thành! Thu nhập: ${trip.fareVND.toLocaleString()} VND`, 'success', 'trip');
  };

  // Main Simulation Movement Tick Loop — advances the driver of every active
  // trip along its route waypoints.
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setTrips((prevTrips) =>
        prevTrips.map((trip) => {
          if (trip.status !== 'in_progress') return trip;

          const route = trip.routeWaypoints;
          if (!route || route.length === 0) return trip;

          const nextIndex = trip.routeIndex + 1;
          const totalPoints = route.length;

          if (nextIndex < totalPoints) {
            const nextPos = route[nextIndex];
            const prevPos = route[trip.routeIndex];
            const heading = calculateBearing(prevPos, nextPos);

            setUsers((prevUsers) =>
              prevUsers.map((u) =>
                u.id === trip.driverUserId ? { ...u, location: nextPos, heading } : u
              )
            );

            const calcProgress = Number(((nextIndex / (totalPoints - 1)) * 100).toFixed(1));
            return { ...trip, routeIndex: nextIndex, progress: calcProgress };
          } else {
            // Reached destination -> complete trip. Uses `trip` straight from
            // this map callback (not a re-lookup) since the `trips` state this
            // effect closed over can be stale by the time this tick fires.
            setUsers((prevUsers) =>
              prevUsers.map((u) =>
                u.id === trip.driverUserId ? { ...u, status: 'idle', location: trip.destination } : u
              )
            );
            addLog(`Chuyến đi #${trip.id.slice(-6)} hoàn thành! Thu nhập: ${trip.fareVND.toLocaleString()} VND`, 'success', 'trip');
            return { ...trip, status: 'completed', progress: 100 };
          }
        })
      );
    }, 400 / simSpeed);

    return () => clearInterval(interval);
  }, [isSimulating, simSpeed, addLog]);

  // Handle Map Click Actions (picking a random-location center or a trip destination)
  const handleMapClickAction = (loc: Location) => {
    if (mapClickMode === 'pick_random_center') {
      const randomLoc = generateRandomLocation(loc, 5);
      setPendingRandomLocation({ ...randomLoc, address: getApproximateAddress(randomLoc) });
      setMapClickMode('none');
      addLog('Đã chọn vị trí ngẫu nhiên trong bán kính 5km quanh ghim', 'success', 'system');
    } else if (mapClickMode === 'pick_trip_destination') {
      if (tripDraft) {
        handleCreateTrip(tripDraft.userId, tripDraft.vehicleType, loc);
      }
      setTripDraft(null);
      setMapClickMode('none');
    } else if (mapClickMode === 'pick_demo_center') {
      setDemoDataCenter({ ...loc, address: getApproximateAddress(loc) });
      setMapClickMode('none');
      addLog('Đã ghim vùng trung tâm cho dữ liệu ảo (bán kính 5km)', 'success', 'system');
    }
  };

  const handleCancelClickMode = () => {
    setMapClickMode('none');
    setTripDraft(null);
  };

  // --- Command Bar: parses a typed command and dispatches to the same handlers as the UI ---
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
          if (target === 'users') {
            return ok(`${users.length} khách hàng: ${users.map((u) => u.id.slice(-6)).join(', ') || '(trống)'}`);
          }
          if (target === 'trips') {
            return ok(`${trips.length} chuyến: ${trips.map((t) => t.id.slice(-6)).join(', ') || '(trống)'}`);
          }
          return fail('dùng: ls users|trips');
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
          const count = Number(args[0]) || 5;
          handleBatchGenerateUsers(count);
          return ok(`đã sinh ${count} khách hàng mới`);
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
          handleClearAllData();
          return ok('đã đặt lại mô phỏng về trạng thái trống');

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
      users,
      trips,
      findTrip,
      addLog,
      handleBatchGenerateUsers,
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
        onReset={handleClearAllData}
        onSeedRandom={handleSeedRandom}
        totalUsers={users.length}
        activeTrips={trips.filter((t) => t.status === 'in_progress').length}
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
          users={users}
          trips={trips}
          selectedUserId={selectedUserId}
          selectedTripId={selectedTripId}
          onSelectUser={(u) => setSelectedUserId(u ? u.id : null)}
          onSelectTrip={(t) => setSelectedTripId(t ? t.id : null)}
          mapClickMode={mapClickMode}
          onMapClickAction={handleMapClickAction}
          onCancelClickMode={handleCancelClickMode}
          tileLayerType={tileLayerType}
          onChangeTileLayer={setTileLayerType}
        />

        <Sidebar
          users={users}
          trips={trips}
          logs={logs}
          selectedUserId={selectedUserId}
          selectedTripId={selectedTripId}
          onSelectUser={(u) => setSelectedUserId(u ? u.id : null)}
          onSelectTrip={(t) => setSelectedTripId(t ? t.id : null)}
          onAddUser={handleAddUser}
          onDeleteUser={handleDeleteUser}
          onBatchGenerateUsers={handleBatchGenerateUsers}
          onStartCreateTrip={handleStartCreateTrip}
          onFindTrip={handleFindTrip}
          onClearAllData={handleClearAllData}
          onCancelTrip={handleCancelTrip}
          onForceFinishTrip={handleForceFinishTrip}
          onClearLogs={() => setLogs([])}
          mapClickMode={mapClickMode}
          setMapClickMode={setMapClickMode}
          pendingRandomLocation={pendingRandomLocation}
          demoDataCenter={demoDataCenter}
          themeMode={themeMode}
          onRunCommand={handleRunCommand}
          commands={COMMAND_LIST}
        />
      </div>
    </div>
  );
}
