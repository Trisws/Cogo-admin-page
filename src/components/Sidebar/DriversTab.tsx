import React, { useState } from 'react';
import { Driver, DriverStatus, VehicleType, MapClickMode, ThemeMode } from '../../types/simulation';
import { VEHICLE_CONFIGS } from '../../utils/presets';
import { 
  Car, 
  Search, 
  Plus, 
  Trash2, 
  Star, 
  Phone, 
  MapPin, 
  Gauge, 
  Sparkles,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

interface DriversTabProps {
  drivers: Driver[];
  selectedDriverId: string | null;
  onSelectDriver: (driver: Driver | null) => void;
  onDeleteDriver: (driverId: string) => void;
  onToggleDriverStatus: (driverId: string, status: DriverStatus) => void;
  onNavigateToMockTab?: () => void;
  themeMode?: ThemeMode;
}

export const DriversTab: React.FC<DriversTabProps> = ({
  drivers,
  selectedDriverId,
  onSelectDriver,
  onDeleteDriver,
  onToggleDriverStatus,
  onNavigateToMockTab,
  themeMode,
}) => {
  const [search, setSearch] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const isLight = themeMode === 'light';

  const filteredDrivers = drivers.filter((d) => {
    const matchesSearch = d.name.toLowerCase().includes(search.toLowerCase()) || d.plateNumber.includes(search);
    const matchesVehicle = vehicleFilter === 'all' || d.vehicleType === vehicleFilter;
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    return matchesSearch && matchesVehicle && matchesStatus;
  });

  return (
    <div className={`flex flex-col h-full gap-3 p-3 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
      {/* Banner / Header for Driver Observation */}
      <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
        isLight ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' : 'bg-slate-900 border-emerald-900/50 text-emerald-300'
      }`}>
        <div className="flex items-center gap-2">
          <Car className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-xs font-semibold">
            Danh sách tài xế thực tế ({drivers.length})
          </span>
        </div>
        {onNavigateToMockTab && (
          <button
            onClick={onNavigateToMockTab}
            className={`text-[10px] px-2 py-1 rounded-lg font-bold border flex items-center gap-1 transition-all cursor-pointer ${
              isLight
                ? 'bg-white hover:bg-emerald-100 text-emerald-700 border-emerald-300 shadow-sm'
                : 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border-slate-700'
            }`}
            title="Mở tab Quản lý Dữ liệu Ảo"
          >
            + Tạo dữ liệu ảo
          </button>
        )}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Tìm tài xế, biển số xe..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full border rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-emerald-500 ${
              isLight ? 'bg-slate-100 border-slate-200 text-slate-800 placeholder-slate-400' : 'bg-slate-900 border-slate-800 text-slate-200'
            }`}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <select
            value={vehicleFilter}
            onChange={(e) => setVehicleFilter(e.target.value)}
            className={`border rounded-xl px-2 py-1.5 text-xs focus:outline-none ${
              isLight ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-slate-900 border-slate-800 text-slate-300'
            }`}
          >
            <option value="all">Mọi phương tiện</option>
            {Object.entries(VEHICLE_CONFIGS).map(([key, config]) => (
              <option key={key} value={key}>
                {config.icon} {config.name.split(' ')[0]}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`border rounded-xl px-2 py-1.5 text-xs focus:outline-none ${
              isLight ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-slate-900 border-slate-800 text-slate-300'
            }`}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="available">🟢 Rảnh</option>
            <option value="busy">🟠 Đang bận/có chuyến</option>
            <option value="offline">⚪ Ngoại tuyến</option>
          </select>
        </div>
      </div>

      {/* Driver List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {filteredDrivers.length === 0 ? (
          <div className={`text-center py-8 text-xs ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
            Không tìm thấy tài xế nào. Nhấn "+5 Ngẫu nhiên" để tạo tài xế!
          </div>
        ) : (
          filteredDrivers.map((driver) => {
            const isSelected = driver.id === selectedDriverId;
            const vConfig = VEHICLE_CONFIGS[driver.vehicleType] || VEHICLE_CONFIGS.car_4;

            let statusBadge = 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30';
            let statusName = '🟢 Rảnh (Sẵn sàng)';
            if (driver.status === 'busy') {
              statusBadge = 'bg-amber-500/20 text-amber-600 border-amber-500/30';
              statusName = '🟠 Đang có chuyến';
            } else if (driver.status === 'offline') {
              statusBadge = 'bg-slate-500/20 text-slate-500 border-slate-500/30';
              statusName = '⚪ Ngoại tuyến';
            }

            return (
              <div
                key={driver.id}
                onClick={() => onSelectDriver(driver)}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? isLight
                      ? 'bg-emerald-50 border-emerald-400 shadow-sm'
                      : 'bg-emerald-950/60 border-emerald-500/80 shadow-md shadow-emerald-900/30'
                    : isLight
                      ? 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="relative">
                      <img
                        src={driver.avatar}
                        alt={driver.name}
                        className={`w-9 h-9 rounded-full border ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-800 border-slate-700'}`}
                      />
                      <span className="absolute -bottom-1 -right-1 text-sm">{vConfig.icon}</span>
                    </div>

                    <div>
                      <h4 className={`font-bold text-xs flex items-center gap-1.5 ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                        {driver.name}
                        <span className="text-[10px] text-amber-500 flex items-center font-bold">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {driver.rating}
                        </span>
                      </h4>
                      <div className={`flex items-center gap-2 text-[10px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                        <span className={`font-mono px-1 rounded border font-bold ${
                          isLight ? 'bg-slate-100 text-slate-800 border-slate-200' : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}>{driver.plateNumber}</span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5"><Gauge className="w-3 h-3" /> {driver.speedKmH} km/h</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteDriver(driver.id);
                    }}
                    className={`p-1 rounded cursor-pointer ${isLight ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50' : 'text-slate-500 hover:text-rose-400 hover:bg-slate-800'}`}
                    title="Xóa tài xế"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Status bar & Location Address */}
                <div className="mt-2.5 flex items-center justify-between text-[10px]">
                  <span className={`px-2 py-0.5 rounded-full border font-semibold ${statusBadge}`}>
                    {statusName}
                  </span>

                  {/* Toggle Status button */}
                  {driver.status !== 'busy' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleDriverStatus(
                          driver.id,
                          driver.status === 'available' ? 'offline' : 'available'
                        );
                      }}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-semibold transition-colors cursor-pointer ${
                        isLight
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                      }`}
                    >
                      Bật/Tắt Online
                    </button>
                  )}
                </div>

                <div className={`mt-1.5 text-[10px] truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  📍 {driver.location.address || `${driver.location.lat}, ${driver.location.lng}`}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
