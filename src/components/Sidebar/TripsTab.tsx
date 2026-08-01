import React, { useState } from 'react';
import { Trip, User, Driver, TripStatus, ThemeMode } from '../../types/simulation';
import { VEHICLE_CONFIGS } from '../../utils/presets';
import { formatVND } from '../../utils/geo';
import { 
  Zap, 
  Car, 
  User as UserIcon, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  Sparkles,
  ArrowRight,
  ShieldCheck,
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
  // Manual dispatch form state
  const [selectedUserIdForDispatch, setSelectedUserIdForDispatch] = useState<string>('');
  const [selectedDriverIdForDispatch, setSelectedDriverIdForDispatch] = useState<string>('');

  const isLight = themeMode === 'light';

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
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.8 }
      });
    } catch (e) {
      // ignore
    }
  };

  return (
    <div className={`flex flex-col h-full gap-3 p-3 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
      {/* Auto Dispatch Banner */}
      <div className={`border rounded-xl p-3 flex items-center justify-between gap-2 shadow-sm ${
        isLight ? 'bg-emerald-50/60 border-emerald-200' : 'bg-slate-900 border-slate-800'
      }`}>
        <div className="flex items-center gap-2">
          <Sparkles className={`w-4 h-4 ${autoDispatch ? 'text-emerald-500' : 'text-slate-400'}`} />
          <div>
            <div className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
              Điều phối tự động: {autoDispatch ? 'ĐANG BẬT' : 'ĐÃ TẮT'}
            </div>
            <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              {autoDispatch ? 'Tự ghép khách đặt với tài xế rảnh gần nhất' : 'Ghép chuyến thủ công bên dưới'}
            </div>
          </div>
        </div>

        <button
          onClick={onToggleAutoDispatch}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
            autoDispatch
              ? 'bg-emerald-500/20 text-emerald-600 border-emerald-500/40 hover:bg-emerald-500/30'
              : isLight
                ? 'bg-white text-slate-600 border-slate-300'
                : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}
        >
          {autoDispatch ? 'Tắt' : 'Bật'}
        </button>
      </div>

      {/* Manual Dispatch Form */}
      <form onSubmit={handleManualDispatchSubmit} className={`border rounded-xl p-3 flex flex-col gap-2 text-xs ${
        isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'
      }`}>
        <h3 className="font-bold text-amber-600 flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-1.5">
          <Zap className="w-4 h-4" /> Ghép Chuyến Thủ Công (Dispatch)
        </h3>

        <div>
          <label className={`text-[10px] font-semibold block mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>1. Chọn khách hàng</label>
          <select
            value={selectedUserIdForDispatch}
            onChange={(e) => setSelectedUserIdForDispatch(e.target.value)}
            className={`w-full border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none ${
              isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-700 text-slate-100'
            }`}
          >
            <option value="">-- Chọn khách hàng cần đi --</option>
            {requestingUsers.map((u) => (
              <option key={u.id} value={u.id}>
                👤 {u.name} ({u.status === 'requesting' ? 'Đang tìm xe' : 'Rảnh'})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={`text-[10px] font-semibold block mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>2. Chọn tài xế điều phối</label>
          <select
            value={selectedDriverIdForDispatch}
            onChange={(e) => setSelectedDriverIdForDispatch(e.target.value)}
            className={`w-full border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none ${
              isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-700 text-slate-100'
            }`}
          >
            <option value="">-- Chọn tài xế rảnh --</option>
            {availableDrivers.map((d) => {
              const vConfig = VEHICLE_CONFIGS[d.vehicleType];
              return (
                <option key={d.id} value={d.id}>
                  {vConfig.icon} {d.name} ({d.plateNumber})
                </option>
              );
            })}
          </select>
        </div>

        <button
          type="submit"
          disabled={!selectedUserIdForDispatch || !selectedDriverIdForDispatch}
          className="mt-1 w-full py-2 bg-gradient-to-r from-amber-500 to-orange-500 disabled:opacity-40 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs rounded-lg transition-all shadow cursor-pointer"
        >
          Tạo & Ghép Chuyến Ngay
        </button>
      </form>

      {/* Active Trips Section */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        <h4 className={`text-xs font-bold flex items-center justify-between ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
          <span>Chuyến Đi Đang Chạy ({activeTrips.length})</span>
          <span className={`text-[10px] font-normal ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Tự động mô phỏng di chuyển</span>
        </h4>

        {activeTrips.length === 0 ? (
          <div className={`text-center py-8 text-xs ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
            Chưa có chuyến đi nào đang hoạt động. Hãy đặt xe cho người dùng!
          </div>
        ) : (
          activeTrips.map((trip) => {
            const isSelected = trip.id === selectedTripId;
            const isEnRoute = trip.status === 'driver_en_route';
            const isInProgress = trip.status === 'in_progress';

            let statusLabel = 'Đang tìm xe';
            let statusBadgeClass = 'bg-sky-500/20 text-sky-600 border-sky-500/30';
            if (isEnRoute) {
              statusLabel = '🛵 Tài xế đang đến đón';
              statusBadgeClass = 'bg-amber-500/20 text-amber-600 border-amber-500/30';
            } else if (isInProgress) {
              statusLabel = '🚕 Đang chở khách về đích';
              statusBadgeClass = 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30';
            }

            return (
              <div
                key={trip.id}
                onClick={() => onSelectTrip(trip)}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? isLight
                      ? 'bg-amber-50/80 border-amber-400 shadow-sm'
                      : 'bg-slate-900 border-amber-500 shadow-md shadow-amber-900/30'
                    : isLight
                      ? 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Header info */}
                <div className={`flex items-center justify-between gap-2 border-b pb-2 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-amber-600">#{trip.id.slice(-6)}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadgeClass}`}>
                      {statusLabel}
                    </span>
                  </div>

                  <span className="font-bold text-xs text-emerald-600">
                    {formatVND(trip.fareVND)}
                  </span>
                </div>

                {/* User & Driver */}
                <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs">
                  <div className={`flex items-center gap-2 p-2 rounded-lg border ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                  }`}>
                    <img src={trip.userAvatar} alt="" className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800" />
                    <div className="truncate">
                      <span className={`text-[10px] block leading-none ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Hành khách</span>
                      <span className={`font-semibold truncate block ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{trip.userName}</span>
                    </div>
                  </div>

                  <div className={`flex items-center gap-2 p-2 rounded-lg border ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                  }`}>
                    {trip.driverAvatar ? (
                      <img src={trip.driverAvatar} alt="" className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800" />
                    ) : (
                      <Car className="w-5 h-5 text-slate-400" />
                    )}
                    <div className="truncate">
                      <span className={`text-[10px] block leading-none ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Tài xế</span>
                      <span className={`font-semibold truncate block ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                        {trip.driverName || 'Chưa gán'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Pickup / Dropoff preview */}
                <div className="mt-2 text-[11px] space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-600 font-medium truncate">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate">Đón: {trip.pickup.address || 'Điểm đón'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-rose-600 font-medium truncate">
                    <Navigation className="w-3 h-3 shrink-0" />
                    <span className="truncate">Đến: {trip.dropoff.address || 'Điểm đến'}</span>
                  </div>
                </div>

                {/* Live Progress Bar */}
                <div className="mt-3">
                  <div className={`flex items-center justify-between text-[10px] mb-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    <span>Quãng đường: {trip.distanceKm.toFixed(1)} km</span>
                    <span className="font-bold text-amber-600">{Math.round(trip.progress)}%</span>
                  </div>
                  <div className={`w-full h-2 rounded-full overflow-hidden border ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(0, trip.progress))}%` }}
                    />
                  </div>
                </div>

                {/* Action buttons */}
                <div className={`mt-3 flex items-center justify-end gap-2 pt-2 border-t ${isLight ? 'border-slate-200' : 'border-slate-800/80'}`}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCancelTrip(trip.id);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                      isLight
                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                        : 'bg-slate-800 hover:bg-rose-950/80 text-rose-300 border-slate-700 hover:border-rose-800'
                    }`}
                  >
                    Hủy Chuyến
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFinish(trip.id);
                    }}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold shadow cursor-pointer"
                  >
                    Hoàn Thành Ngay
                  </button>
                </div>
              </div>
            );
          })
        )}

        {/* Completed Trips History */}
        {completedTrips.length > 0 && (
          <div className={`mt-4 pt-3 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <h4 className={`text-xs font-bold mb-2 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Lịch Sử Chuyến Đi Hoàn Thành ({completedTrips.length})
            </h4>

            <div className="space-y-1.5">
              {completedTrips.map((ct) => (
                <div key={ct.id} className={`p-2 rounded-lg border flex items-center justify-between text-xs ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800/80'
                }`}>
                  <div>
                    <div className={`font-bold flex items-center gap-1.5 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      {ct.userName} ➔ {ct.driverName}
                    </div>
                    <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{ct.distanceKm.toFixed(1)} km</div>
                  </div>

                  <span className="font-bold text-emerald-600 text-xs">
                    +{formatVND(ct.fareVND)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
