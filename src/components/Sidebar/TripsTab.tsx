import React from 'react';
import { Trip, ThemeMode } from '../../../lib/types/simulation';
import { VEHICLE_CONFIGS } from '../../../lib/utils/presets';
import { formatVND } from '../../../lib/utils/geo';
import {
  MapPin,
  CheckCircle2,
  Navigation,
  User as UserIcon
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface TripsTabProps {
  trips: Trip[];
  selectedTripId: string | null;
  onSelectTrip: (trip: Trip | null) => void;
  onCancelTrip: (tripId: string) => void;
  onForceFinishTrip: (tripId: string) => void;
  themeMode?: ThemeMode;
}

export const TripsTab: React.FC<TripsTabProps> = ({
  trips,
  selectedTripId,
  onSelectTrip,
  onCancelTrip,
  onForceFinishTrip,
  themeMode,
}) => {
  const isLight = themeMode === 'light';
  const border = isLight ? 'border-zinc-200' : 'border-zinc-800';
  const dim = isLight ? 'text-zinc-500' : 'text-zinc-400';
  const cardBg = isLight ? 'bg-white' : 'bg-zinc-900';

  const activeTrips = trips.filter((t) => t.status === 'in_progress');
  const completedTrips = trips.filter((t) => t.status === 'completed');

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
      {/* Active Trips */}
      <div className="space-y-2">
        <h4 className={`text-xs font-semibold ${dim}`}>Đang chạy ({activeTrips.length})</h4>

        {activeTrips.length === 0 ? (
          <div className={`text-center py-6 text-xs ${dim}`}>Chưa có chuyến nào đang chạy.</div>
        ) : (
          activeTrips.map((trip) => {
            const isSelected = trip.id === selectedTripId;
            const vConfig = VEHICLE_CONFIGS[trip.vehicleType];
            const filledSlots = trip.slots.filter((s) => s.passengerUserId).length;

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
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${
                      isLight ? 'bg-amber-100 text-amber-800 ring-amber-300' : 'bg-amber-500/15 text-amber-300 ring-amber-500/30'
                    }`}>Đang chạy</span>
                  </div>
                  <span className="font-semibold text-xs text-emerald-600">{formatVND(trip.fareVND)}</span>
                </div>

                <div className={`mt-2.5 flex items-center gap-2 p-2 rounded-md text-xs ${isLight ? 'bg-zinc-50' : 'bg-zinc-950'}`}>
                  <img src={trip.driverAvatar} alt="" className="w-6 h-6 rounded-full" />
                  <div className="truncate flex-1">
                    <span className={`text-[10px] block leading-none ${dim}`}>Tài xế · {vConfig.icon} {vConfig.name}</span>
                    <span className="font-medium truncate block">{trip.driverName}</span>
                  </div>
                </div>

                {/* Passenger slots */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {trip.slots.map((slot, i) => (
                    <div
                      key={i}
                      title={slot.passengerUserId ? 'Đã có khách' : 'Còn trống'}
                      className={`w-7 h-7 rounded-full flex items-center justify-center ring-1 ${
                        slot.passengerUserId
                          ? isLight ? 'bg-emerald-100 ring-emerald-300 text-emerald-700' : 'bg-emerald-500/15 ring-emerald-500/30 text-emerald-300'
                          : isLight ? 'bg-zinc-100 ring-zinc-300 text-zinc-400 border-dashed' : 'bg-zinc-800 ring-zinc-700 text-zinc-600'
                      }`}
                    >
                      <UserIcon className="w-3.5 h-3.5" />
                    </div>
                  ))}
                  <span className={`text-[10px] self-center ml-1 ${dim}`}>{filledSlots}/{trip.slots.length} khách</span>
                </div>

                <div className="mt-2 text-[11px] space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-600 font-medium truncate">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate">Đón: {trip.pickup.address || 'điểm đón'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-rose-500 font-medium truncate">
                    <Navigation className="w-3 h-3 shrink-0" />
                    <span className="truncate">Đến: {trip.destination.address || 'điểm đến'}</span>
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
                      {ct.driverName} · {VEHICLE_CONFIGS[ct.vehicleType].icon}
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
