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

// How close (km) a route waypoint must be to a point to count as "passing by" it
const NEARBY_THRESHOLD_KM = 0.5;

interface TripMatch {
  tripId: string;
  slotIndex: number;
  pickupIndex: number;
  dropoffIndex: number;
  score: number;
}

// Finds the best in-progress trip whose remaining route passes near both
// searcherLocation and destination (in that order along the route), among
// trips that still have a free passenger seat. Pure — no state access.
function findBestTripMatch(searcherLocation: Location, destination: Location, trips: Trip[]): TripMatch | null {
  let best: TripMatch | null = null;

  for (const trip of trips) {
    if (trip.status !== 'in_progress') continue;
    const slotIndex = trip.slots.findIndex((s) => s.passengerUserId === null);
    if (slotIndex === -1) continue;

    const route = trip.routeWaypoints;
    if (!route || route.length < 2) continue;

    let bestPickup = { index: -1, distanceKm: Infinity };
    for (let i = trip.routeIndex; i < route.length; i++) {
      const d = calculateDistanceKm(route[i], searcherLocation);
      if (d < bestPickup.distanceKm) bestPickup = { index: i, distanceKm: d };
    }
    if (bestPickup.index === -1 || bestPickup.distanceKm > NEARBY_THRESHOLD_KM) continue;

    let bestDropoff = { index: -1, distanceKm: Infinity };
    for (let i = bestPickup.index + 1; i < route.length; i++) {
      const d = calculateDistanceKm(route[i], destination);
      if (d < bestDropoff.distanceKm) bestDropoff = { index: i, distanceKm: d };
    }
    if (bestDropoff.index === -1 || bestDropoff.distanceKm > NEARBY_THRESHOLD_KM) continue;

    const score = bestPickup.distanceKm + bestDropoff.distanceKm;
    if (!best || score < best.score) {
      best = { tripId: trip.id, slotIndex, pickupIndex: bestPickup.index, dropoffIndex: bestDropoff.index, score };
    }
  }

  return best;
}

interface SearchRequest {
  userId: string;
  userName: string;
  location: Location;
  destination: Location;
}

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
  const [findTripDraft, setFindTripDraft] = useState<{ userId: string } | null>(null);

  // Users who picked a destination but weren't matched yet — kept here so
  // every new/advancing trip is continuously checked against them until a
  // match is found or the search is cancelled.
  const [searchRequests, setSearchRequests] = useState<SearchRequest[]>([]);

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
    setSearchRequests([]);
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
    setSearchRequests([]);
    setSelectedUserId(null);
    setSelectedTripId(null);
    setPendingRandomLocation(null);
    setTripDraft(null);
    setFindTripDraft(null);
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
    setSearchRequests((prev) => prev.filter((r) => r.userId !== userId));
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
      stepProgress: 0,
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

    const passengerIds = trip.slots.map((s) => s.passengerUserId).filter((id): id is string => !!id);
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === trip.driverUserId) return { ...u, status: 'idle' };
        if (passengerIds.includes(u.id)) return { ...u, status: 'idle' };
        return u;
      })
    );
    setTrips((prev) =>
      prev.map((t) => (t.id === tripId ? { ...t, status: 'cancelled', slots: t.slots.map(() => ({ passengerUserId: null })) } : t))
    );

    addLog(`Đã hủy chuyến đi #${tripId.slice(-6)}`, 'warning', 'trip');
  };

  const handleForceFinishTrip = (tripId: string) => {
    const trip = trips.find((t) => t.id === tripId);
    if (!trip) return;

    const passengerIds = trip.slots.map((s) => s.passengerUserId).filter((id): id is string => !!id);
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === trip.driverUserId) return { ...u, status: 'idle', location: trip.destination };
        if (passengerIds.includes(u.id)) return { ...u, status: 'idle', location: trip.destination };
        return u;
      })
    );
    setTrips((prev) =>
      prev.map((t) => (t.id === tripId ? { ...t, status: 'completed', progress: 100, slots: t.slots.map(() => ({ passengerUserId: null })) } : t))
    );

    addLog(`Chuyến đi #${tripId.slice(-6)} hoàn thành! Thu nhập: ${trip.fareVND.toLocaleString()} VND`, 'success', 'trip');
  };

  // Arms the "pick desired destination" map-click flow to search for a matching in-progress trip
  const handleFindTrip = (user: User) => {
    if (user.status !== 'idle') return;
    setFindTripDraft({ userId: user.id });
    setMapClickMode('pick_find_destination');
    addLog('Đang chọn điểm muốn đến để tìm chuyến đi phù hợp... (Nhấp trên bản đồ)', 'info', 'system');
  };

  // Tries to match a user to an in-progress trip right away; if nothing
  // passes by close enough yet, queues them as a standing search request so
  // they keep getting checked against every subsequent trip tick/creation
  // until a match is found or the search is cancelled.
  const handleRequestTrip = useCallback((userId: string, destination: Location) => {
    const user = users.find((u) => u.id === userId);
    if (!user || user.status !== 'idle') return;

    const match = findBestTripMatch(user.location, destination, trips);

    if (match) {
      const { tripId, slotIndex, pickupIndex, dropoffIndex } = match;
      const matchedTrip = trips.find((t) => t.id === tripId)!;
      setTrips((prev) =>
        prev.map((t) =>
          t.id === tripId
            ? {
                ...t,
                slots: t.slots.map((s, i) =>
                  i === slotIndex ? { passengerUserId: userId, pickupIndex, dropoffIndex, pickedUp: false } : s
                ),
              }
            : t
        )
      );
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: 'riding' } : u)));
      addLog(`${user.name} đã ghép vào chuyến của ${matchedTrip.driverName} — đang chờ xe tới đón`, 'success', 'trip');
      return;
    }

    setSearchRequests((prev) => [...prev, { userId, userName: user.name, location: user.location, destination }]);
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: 'searching' } : u)));
    addLog(`${user.name} chưa có chuyến phù hợp — đang chờ, sẽ tự động ghép ngay khi có chuyến đi ngang qua`, 'info', 'system');
  }, [users, trips, addLog]);

  const handleCancelSearchTrip = (userId: string) => {
    setSearchRequests((prev) => prev.filter((r) => r.userId !== userId));
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: 'idle' } : u)));
  };

  // Continuously re-checks every pending search request against the latest
  // trips (new trips created, or existing ones advancing their route) so a
  // waiting passenger is matched as soon as a suitable trip passes nearby.
  useEffect(() => {
    setSearchRequests((prevRequests) => {
      if (prevRequests.length === 0) return prevRequests;

      const stillPending: SearchRequest[] = [];
      const matchedUserIds: string[] = [];
      let anyMatched = false;

      setTrips((prevTrips) => {
        const tripsCopy = prevTrips.map((t) => ({ ...t, slots: t.slots.map((s) => ({ ...s })) }));

        prevRequests.forEach((req) => {
          const match = findBestTripMatch(req.location, req.destination, tripsCopy);
          if (!match) {
            stillPending.push(req);
            return;
          }
          const trip = tripsCopy.find((t) => t.id === match.tripId)!;
          trip.slots[match.slotIndex] = {
            passengerUserId: req.userId,
            pickupIndex: match.pickupIndex,
            dropoffIndex: match.dropoffIndex,
            pickedUp: false,
          };
          matchedUserIds.push(req.userId);
          anyMatched = true;
          addLog(`${req.userName} đã ghép vào chuyến của ${trip.driverName} — đang chờ xe tới đón`, 'success', 'trip');
        });

        return anyMatched ? tripsCopy : prevTrips;
      });

      if (matchedUserIds.length > 0) {
        setUsers((prevUsers) =>
          prevUsers.map((u) => (matchedUserIds.includes(u.id) ? { ...u, status: 'riding' } : u))
        );
      }

      return stillPending.length === prevRequests.length ? prevRequests : stillPending;
    });
  }, [trips, addLog]);

  // Main Simulation Movement Tick Loop — advances the driver of every active
  // trip along its route waypoints, pacing movement against the trip's own
  // etaSeconds so a trip's real-world duration is respected instead of
  // always covering one waypoint per tick (which ignored route length/eta
  // and made every trip finish at roughly the same, too-fast pace).
  useEffect(() => {
    if (!isSimulating) return;

    const TICK_MS = 400; // real time represented by one tick at simSpeed = 1

    const interval = setInterval(() => {
      setTrips((prevTrips) =>
        prevTrips.map((trip) => {
          if (trip.status !== 'in_progress') return trip;

          const route = trip.routeWaypoints;
          if (!route || route.length === 0) return trip;

          const totalPoints = route.length;
          const etaMs = Math.max(trip.etaSeconds, 1) * 1000;
          const stepIncrement = ((totalPoints - 1) * TICK_MS) / etaMs;
          const newStepProgress = (trip.stepProgress ?? trip.routeIndex) + stepIncrement;

          if (newStepProgress >= totalPoints - 1) {
            // Reached destination -> complete trip. Uses `trip` straight from
            // this map callback (not a re-lookup) since the `trips` state this
            // effect closed over can be stale by the time this tick fires.
            setUsers((prevUsers) =>
              prevUsers.map((u) =>
                u.id === trip.driverUserId ? { ...u, status: 'idle', location: trip.destination } : u
              )
            );
            trip.slots.forEach((slot) => {
              if (!slot.passengerUserId) return;
              setUsers((prevUsers) =>
                prevUsers.map((u) =>
                  u.id === slot.passengerUserId
                    ? { ...u, status: 'idle', location: trip.destination, heading: undefined }
                    : u
                )
              );
            });
            addLog(`Chuyến đi #${trip.id.slice(-6)} hoàn thành! Thu nhập: ${trip.fareVND.toLocaleString()} VND`, 'success', 'trip');
            return {
              ...trip,
              status: 'completed',
              progress: 100,
              routeIndex: totalPoints - 1,
              stepProgress: totalPoints - 1,
              slots: trip.slots.map(() => ({ passengerUserId: null })),
            };
          }

          const nextIndex = Math.floor(newStepProgress);
          if (nextIndex === trip.routeIndex) {
            // Not yet time to advance to the next waypoint - just accumulate.
            return { ...trip, stepProgress: newStepProgress };
          }

          const nextPos = route[nextIndex];
          const prevPos = route[trip.routeIndex];
          const heading = calculateBearing(prevPos, nextPos);

          setUsers((prevUsers) =>
            prevUsers.map((u) =>
              u.id === trip.driverUserId ? { ...u, location: nextPos, heading } : u
            )
          );

          let slotsChanged = false;
          const newSlots = trip.slots.map((slot) => {
            if (!slot.passengerUserId) return slot;

            if (slot.dropoffIndex !== undefined && nextIndex >= slot.dropoffIndex) {
              slotsChanged = true;
              const dropoffUserId = slot.passengerUserId;
              const dropoffPos = route[slot.dropoffIndex];
              setUsers((prevUsers) =>
                prevUsers.map((u) =>
                  u.id === dropoffUserId ? { ...u, status: 'idle', location: dropoffPos, heading: undefined } : u
                )
              );
              addLog(`Hành khách đã tới nơi và xuống xe của ${trip.driverName}`, 'success', 'trip');
              return { passengerUserId: null };
            }

            if (!slot.pickedUp && slot.pickupIndex !== undefined && nextIndex >= slot.pickupIndex) {
              slotsChanged = true;
              addLog(`${trip.driverName} đã đón khách dọc đường`, 'info', 'trip');
              return { ...slot, pickedUp: true };
            }

            return slot;
          });

          const calcProgress = Number(((nextIndex / (totalPoints - 1)) * 100).toFixed(1));
          return {
            ...trip,
            routeIndex: nextIndex,
            stepProgress: newStepProgress,
            progress: calcProgress,
            slots: slotsChanged ? newSlots : trip.slots,
          };
        })
      );
    }, TICK_MS / simSpeed);

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
    } else if (mapClickMode === 'pick_find_destination') {
      if (findTripDraft) {
        handleRequestTrip(findTripDraft.userId, { ...loc, address: getApproximateAddress(loc) });
      }
      setFindTripDraft(null);
      setMapClickMode('none');
    }
  };

  const handleCancelClickMode = () => {
    setMapClickMode('none');
    setTripDraft(null);
    setFindTripDraft(null);
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
          onCancelFindTrip={handleCancelSearchTrip}
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
