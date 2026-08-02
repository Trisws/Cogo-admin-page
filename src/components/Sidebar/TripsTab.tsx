import React, { useState } from 'react';
import { Trip, User, Driver, ThemeMode } from '../../../lib/types/simulation';
import { VEHICLE_CONFIGS } from '../../../lib/utils/presets';
import { formatVND } from '../../../lib/utils/geo';
import {
  Zap,
  Car,
  MapPin,
  CheckCircle2,
  Sparkles,
  Navigation
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface TripsTabProps {
  trips: Trip[];
  users: User[];
  drivers: Driver[];
  selectedTripId: string | null;
  onSelectTrip: (trip: Trip | null) => void;
  onDispatchTrip: (userId: string, driverId: string) => void;
  onCancelTrip: (tripId: string) => void;
  onForceFinishTrip: (tripId: string) => void;
  autoDispatch: boolean;
  onToggleAutoDispatch: () => void;
  themeMode?: ThemeMode;
}

export const TripsTab: React.FC<TripsTabProps> = ({
  trips,
  users,
  drivers,
  selectedTripId,
  onSelectTrip,
  onDispatchTrip,
  onCancelTrip,
  onForceFinishTrip,
  autoDispatch,
  onToggleAutoDispatch,
  themeMode,
}) => {
  const [selectedUserIdForDispatch, setSelectedUserIdForDispatch] = useState<string>('');
  const [selectedDriverIdForDispatch, setSelectedDriverIdForDispatch] = useState<string>('');

  const isLight = themeMode === 'light';
  const border = isLight ? 'border-zinc-200' : 'border-zinc-800';
  const dim = isLight ? 'text-zinc-500' : 'text-zinc-400';
  const cardBg = isLight ? 'bg-white' : 'bg-zinc-900';
  const inputCls = `w-full rounded-md px-2.5 py-1.5 text-xs focus:outline-none ring-1 ${
    isLight ? 'bg-white text-zinc-800 ring-zinc-300 focus:ring-zinc-500' : 'bg-zinc-950 text-zinc-100 ring-zinc-700 focus:ring-zinc-500'
  }`;
  const outlineBtn = isLight
    ? 'bg-white text-zinc-700 ring-1 ring-zinc-300 hover:bg-zinc-50'
    : 'bg-zinc-900 text-zinc-200 ring-1 ring-zinc-700 hover:bg-zinc-800';

  const requestingUsers = users.filter((u) => u.status === 'requesting' || u.status === 'idle');
  const availableDrivers = drivers.filter((d) => d.status === 'available');
  const activeTrips = trips.filter((t) => t.status !== 'completed' && t.status !== 'cancelled');
  const completedTrips = trips.filter((t) => t.status === 'completed');

  const handleManualDispatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserIdForDispatch || !selectedDriverIdForDispatch) return;
    onDispatchTrip(selectedUserIdForDispatch, selectedDriverIdForDispatch);
    setSelectedUserIdForDispatch('');
    setSelectedDriverIdForDispatch('');
  };

  const handleFinish = (tripId: string) => {
    onForceFinishTrip(tripId);
    try {
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.8 } });
    } catch (e) {
      // ignore
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Auto Dispatch Banner */}
      <div className={`rounded-lg border p-2.5 flex items-center justify-between gap-2 ${border} ${cardBg}`}>
        <div className="flex items-center gap-2">
          <Sparkles className={`w-4 h-4 ${autoDispatch ? 'text-emerald-500' : dim}`} />
          <div>
            <div className={`text-xs font-semibold ${isLight ? 'text-zinc-900' : 'text-zinc-100'}`}>
              Tự động: {autoDispatch ? 'Bật' : 'Tắt'}
            </div>
            <div className={`text-[10px] ${dim}`}>
              {autoDispatch ? 'Tự ghép khách với tài xế gần nhất' : 'Ghép chuyến thủ công bên dưới'}
            </div>
          </div>
        </div>
        <button onClick={onToggleAutoDispatch} className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer ${outlineBtn}`}>
          {autoDispatch ? 'Tắt' : 'Bật'}
        </button>
      </div>

      {/* Manual Dispatch Form */}
      <form onSubmit={handleManualDispatchSubmit} className={`rounded-lg border p-3 flex flex-col gap-2 ${border} ${isLight ? 'bg-zinc-50' : 'bg-zinc-950'}`}>
        <h3 className={`text-xs font-semibold flex items-center gap-1.5 ${isLight ? 'text-zinc-900' : 'text-zinc-100'}`}>
          <Zap className="w-4 h-4" /> Ghép chuyến thủ công
        </h3>
        <select value={selectedUserIdForDispatch} onChange={(e) => setSelectedUserIdForDispatch(e.target.value)} className={inputCls}>
          <option value="">-- Chọn khách hàng --</option>
          {requestingUsers.map((u) => (
            <option key={u.id} value={u.id}>{u.name} ({u.status === 'requesting' ? 'đang tìm xe' : 'rảnh'})</option>
          ))}
        </select>
        <select value={selectedDriverIdForDispatch} onChange={(e) => setSelectedDriverIdForDispatch(e.target.value)} className={inputCls}>
          <option value="">-- Chọn tài xế --</option>
          {availableDrivers.map((d) => {
            const vConfig = VEHICLE_CONFIGS[d.vehicleType];
            return <option key={d.id} value={d.id}>{vConfig.icon} {d.name} ({d.plateNumber})</option>;
          })}
        </select>
        <button
          type="submit"
          disabled={!selectedUserIdForDispatch || !selectedDriverIdForDispatch}
          className={`mt-1 w-full py-1.5 rounded-md text-xs font-medium cursor-pointer disabled:opacity-40 ${
            isLight ? 'bg-zinc-900 text-white hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-900 hover:bg-white'
          }`}
        >
          Tạo &amp; ghép chuyến ngay
        </button>
      </form>

      {/* Active Trips */}
      <div className="space-y-2">
        <h4 className={`text-xs font-semibold ${dim}`}>Đang chạy ({activeTrips.length})</h4>

        {activeTrips.length === 0 ? (
          <div className={`text-center py-6 text-xs ${dim}`}>Chưa có chuyến nào đang chạy.</div>
        ) : (
          activeTrips.map((trip) => {
            const isSelected = trip.id === selectedTripId;
            const isEnRoute = trip.status === 'driver_en_route';
            const isInProgress = trip.status === 'in_progress';

            let statusLabel = 'Đang tìm xe';
            let badge = isLight ? 'bg-sky-100 text-sky-800 ring-sky-300' : 'bg-sky-500/15 text-sky-300 ring-sky-500/30';
            if (isEnRoute) { statusLabel = 'Đang đón khách'; badge = isLight ? 'bg-amber-100 text-amber-800 ring-amber-300' : 'bg-amber-500/15 text-amber-300 ring-amber-500/30'; }
            else if (isInProgress) { statusLabel = 'Đang chở đi'; badge = isLight ? 'bg-emerald-100 text-emerald-800 ring-emerald-300' : 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30'; }

            return (
              <div
                key={trip.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectTrip(trip)}
                onKeyDown={(e) => {
                  if (e.target !== e.currentTarget) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectTrip(trip);
                  }
                }}
                className={`p-2.5 rounded-lg border cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${
                  isLight ? 'focus-visible:ring-zinc-900 focus-visible:ring-offset-white' : 'focus-visible:ring-zinc-100 focus-visible:ring-offset-zinc-950'
                } ${
                  isSelected
                    ? isLight ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-100 bg-zinc-800'
                    : `${border} ${cardBg} ${isLight ? 'hover:bg-zinc-50' : 'hover:bg-zinc-800/60'}`
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold text-xs ${isLight ? 'text-zinc-900' : 'text-zinc-100'}`}>#{trip.id.slice(-6)}</span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${badge}`}>{statusLabel}</span>
                  </div>
                  <span className="font-semibold text-xs text-emerald-600">{formatVND(trip.fareVND)}</span>
                </div>

                <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs">
                  <div className={`flex items-center gap-2 p-2 rounded-md ${isLight ? 'bg-zinc-50' : 'bg-zinc-950'}`}>
                    <img src={trip.userAvatar} alt="" className="w-6 h-6 rounded-full" />
                    <div className="truncate">
                      <span className={`text-[10px] block leading-none ${dim}`}>Khách</span>
                      <span className="font-medium truncate block">{trip.userName}</span>
                    </div>
                  </div>
                  <div className={`flex items-center gap-2 p-2 rounded-md ${isLight ? 'bg-zinc-50' : 'bg-zinc-950'}`}>
                    {trip.driverAvatar ? <img src={trip.driverAvatar} alt="" className="w-6 h-6 rounded-full" /> : <Car className={`w-5 h-5 ${dim}`} />}
                    <div className="truncate">
                      <span className={`text-[10px] block leading-none ${dim}`}>Tài xế</span>
                      <span className="font-medium truncate block">{trip.driverName || 'Chưa gán'}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-2 text-[11px] space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-600 font-medium truncate">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate">Đón: {trip.pickup.address || 'điểm đón'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-rose-500 font-medium truncate">
                    <Navigation className="w-3 h-3 shrink-0" />
                    <span className="truncate">Đến: {trip.dropoff.address || 'điểm đến'}</span>
                  </div>
                </div>

                <div className="mt-3">
                  <div className={`flex items-center justify-between text-[10px] mb-1 ${dim}`}>
                    <span>{trip.distanceKm.toFixed(1)} km</span>
                    <span className="font-semibold text-amber-500">{Math.round(trip.progress)}%</span>
                  </div>
                  <div className={`w-full h-1.5 rounded-full overflow-hidden ${isLight ? 'bg-zinc-100' : 'bg-zinc-800'}`}>
                    <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, Math.max(0, trip.progress))}%` }} />
                  </div>
                </div>

                <div className={`mt-3 flex items-center justify-end gap-2 pt-2 border-t ${border}`}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Hủy chuyến #${trip.id.slice(-6)}?`)) {
                        onCancelTrip(trip.id);
                      }
                    }}
                    className="px-2.5 py-1 rounded-md text-[11px] font-medium cursor-pointer bg-white text-rose-700 ring-1 ring-rose-300 hover:bg-rose-50"
                  >
                    Hủy chuyến
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleFinish(trip.id); }}
                    className="px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer bg-emerald-600 text-white hover:bg-emerald-500"
                  >
                    Hoàn thành ngay
                  </button>
                </div>
              </div>
            );
          })
        )}

        {completedTrips.length > 0 && (
          <div className={`mt-2 pt-3 border-t ${border}`}>
            <h4 className={`text-xs font-semibold mb-2 ${dim}`}>Lịch sử hoàn thành ({completedTrips.length})</h4>
            <div className="space-y-1.5">
              {completedTrips.map((ct) => (
                <div key={ct.id} className={`p-2 rounded-md border flex items-center justify-between text-xs ${border} ${cardBg}`}>
                  <div>
                    <div className={`font-medium flex items-center gap-1.5 ${isLight ? 'text-zinc-800' : 'text-zinc-200'}`}>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      {ct.userName} → {ct.driverName}
                    </div>
                    <div className={`text-[10px] ${dim}`}>{ct.distanceKm.toFixed(1)} km</div>
                  </div>
                  <span className="font-semibold text-emerald-600 text-xs">+{formatVND(ct.fareVND)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
