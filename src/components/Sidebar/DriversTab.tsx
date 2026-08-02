import React, { useState } from 'react';
import { Driver, DriverStatus, VehicleType, MapClickMode, ThemeMode } from '../../../lib/types/simulation';
import { VEHICLE_CONFIGS } from '../../../lib/utils/presets';
import {
  Search,
  Trash2,
  Star,
  Gauge,
  Plus,
  Sparkles,
  MapPin
} from 'lucide-react';

interface DriversTabProps {
  drivers: Driver[];
  selectedDriverId: string | null;
  onSelectDriver: (driver: Driver | null) => void;
  onDeleteDriver: (driverId: string) => void;
  onToggleDriverStatus: (driverId: string, status: DriverStatus) => void;
  onAddDriver: (driver: Omit<Driver, 'id' | 'status' | 'heading' | 'totalTrips'>) => void;
  onBatchGenerateDrivers: (count: number) => void;
  mapClickMode: MapClickMode;
  setMapClickMode: (mode: MapClickMode) => void;
  mapCenterLocation: { lat: number; lng: number };
  themeMode?: ThemeMode;
}

export const DriversTab: React.FC<DriversTabProps> = ({
  drivers,
  selectedDriverId,
  onSelectDriver,
  onDeleteDriver,
  onToggleDriverStatus,
  onAddDriver,
  onBatchGenerateDrivers,
  mapClickMode,
  setMapClickMode,
  mapCenterLocation,
  themeMode,
}) => {
  const [search, setSearch] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);

  const [driverName, setDriverName] = useState('');
  const [driverPlate, setDriverPlate] = useState('51F-888.88');
  const [vehicleType, setVehicleType] = useState<VehicleType>('car_4');
  const [speedKmH, setSpeedKmH] = useState(40);
  const [driverLat, setDriverLat] = useState<string>(mapCenterLocation.lat.toFixed(6));
  const [driverLng, setDriverLng] = useState<string>(mapCenterLocation.lng.toFixed(6));

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

  const filteredDrivers = drivers.filter((d) => {
    const matchesSearch = d.name.toLowerCase().includes(search.toLowerCase()) || d.plateNumber.includes(search);
    const matchesVehicle = vehicleFilter === 'all' || d.vehicleType === vehicleFilter;
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    return matchesSearch && matchesVehicle && matchesStatus;
  });

  const handleSubmitDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverName.trim()) return;
    onAddDriver({
      name: driverName,
      phone: '0987654321',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=drv_${Date.now()}`,
      location: { lat: parseFloat(driverLat) || mapCenterLocation.lat, lng: parseFloat(driverLng) || mapCenterLocation.lng },
      vehicleType,
      plateNumber: driverPlate,
      rating: 4.9,
      speedKmH,
    });
    setDriverName('');
    setFormOpen(false);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Quick actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFormOpen((o) => !o)}
          className={`flex-1 rounded-md px-2.5 py-1.5 text-xs font-medium flex items-center justify-center gap-1 cursor-pointer ${
            isLight ? 'bg-zinc-900 text-white hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-900 hover:bg-white'
          }`}
        >
          <Plus className="w-3.5 h-3.5" /> Thêm tài xế
        </button>
        <button
          onClick={() => onBatchGenerateDrivers(5)}
          className={`rounded-md px-2.5 py-1.5 text-xs font-medium flex items-center gap-1 cursor-pointer ${outlineBtn}`}
          title="Sinh nhanh 5 tài xế ngẫu nhiên"
        >
          <Sparkles className="w-3.5 h-3.5" /> +5
        </button>
      </div>

      {formOpen && (
        <form onSubmit={handleSubmitDriver} className={`flex flex-col gap-2 rounded-lg border p-3 ${border} ${isLight ? 'bg-zinc-50' : 'bg-zinc-950'}`}>
          <input type="text" placeholder="Tên tài xế" value={driverName} onChange={(e) => setDriverName(e.target.value)} required className={inputCls} />
          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder="Biển số" value={driverPlate} onChange={(e) => setDriverPlate(e.target.value)} className={inputCls} />
            <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value as VehicleType)} className={inputCls}>
              {Object.entries(VEHICLE_CONFIGS).map(([key, config]) => (
                <option key={key} value={key}>{config.icon} {config.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMapClickMode(mapClickMode === 'add_driver' ? 'none' : 'add_driver')}
              className={`text-[11px] px-2 py-1 rounded-md flex items-center gap-1 cursor-pointer ${
                mapClickMode === 'add_driver' ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300' : outlineBtn
              }`}
            >
              <MapPin className="w-3 h-3" /> chọn trên bản đồ
            </button>
            <span className={`text-[10px] ${dim}`}>{Number(driverLat).toFixed(4)}, {Number(driverLng).toFixed(4)}</span>
          </div>
          <button type="submit" className={`w-full py-1.5 rounded-md text-xs font-medium cursor-pointer ${
            isLight ? 'bg-zinc-900 text-white hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-900 hover:bg-white'
          }`}>
            Tạo tài xế
          </button>
        </form>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col gap-2">
        <div className="relative">
          <Search className={`w-3.5 h-3.5 absolute left-2.5 top-2.5 ${dim}`} />
          <input
            type="text"
            placeholder="Tìm tài xế, biển số..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full rounded-md pl-8 pr-3 py-1.5 text-xs ring-1 focus:outline-none ${
              isLight ? 'bg-white ring-zinc-300 text-zinc-800 placeholder-zinc-400' : 'bg-zinc-950 ring-zinc-700 text-zinc-100 placeholder-zinc-600'
            }`}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select value={vehicleFilter} onChange={(e) => setVehicleFilter(e.target.value)} className={inputCls}>
            <option value="all">Mọi phương tiện</option>
            {Object.entries(VEHICLE_CONFIGS).map(([key, config]) => (
              <option key={key} value={key}>{config.icon} {config.name.split(' ')[0]}</option>
            ))}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputCls}>
            <option value="all">Tất cả trạng thái</option>
            <option value="available">Sẵn sàng</option>
            <option value="busy">Đang bận</option>
            <option value="offline">Ngoại tuyến</option>
          </select>
        </div>
      </div>

      {/* Driver List */}
      <div className="space-y-2">
        {filteredDrivers.length === 0 ? (
          <div className={`text-center py-6 text-xs ${dim}`}>Chưa có tài xế nào.</div>
        ) : (
          filteredDrivers.map((driver) => {
            const isSelected = driver.id === selectedDriverId;
            const vConfig = VEHICLE_CONFIGS[driver.vehicleType] || VEHICLE_CONFIGS.car_4;

            let badge = isLight ? 'bg-emerald-100 text-emerald-800 ring-emerald-300' : 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30';
            let statusText = 'Sẵn sàng';
            if (driver.status === 'busy') {
              badge = isLight ? 'bg-amber-100 text-amber-800 ring-amber-300' : 'bg-amber-500/15 text-amber-300 ring-amber-500/30';
              statusText = 'Đang bận';
            } else if (driver.status === 'offline') {
              badge = isLight ? 'bg-zinc-100 text-zinc-600 ring-zinc-300' : 'bg-zinc-800 text-zinc-400 ring-zinc-700';
              statusText = 'Ngoại tuyến';
            }

            return (
              <div
                key={driver.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectDriver(driver)}
                onKeyDown={(e) => {
                  if (e.target !== e.currentTarget) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectDriver(driver);
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
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="relative">
                      <img src={driver.avatar} alt={driver.name} className={`w-8 h-8 rounded-full border ${border}`} />
                      <span className="absolute -bottom-1 -right-1 text-xs">{vConfig.icon}</span>
                    </div>
                    <div>
                      <h4 className={`font-semibold text-xs flex items-center gap-1.5 ${isLight ? 'text-zinc-900' : 'text-zinc-100'}`}>
                        {driver.name}
                        <span className="text-[10px] text-amber-500 flex items-center font-semibold">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {driver.rating}
                        </span>
                      </h4>
                      <div className={`flex items-center gap-2 text-[10px] mt-0.5 ${dim}`}>
                        <span className={`font-mono px-1 rounded ring-1 ${isLight ? 'ring-zinc-200' : 'ring-zinc-700'}`}>{driver.plateNumber}</span>
                        <span className="flex items-center gap-0.5"><Gauge className="w-3 h-3" /> {driver.speedKmH}km/h</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteDriver(driver.id); }}
                    className={`p-1 rounded cursor-pointer ${dim} hover:text-rose-500`}
                    title="Xóa tài xế"
                    aria-label="Xóa tài xế"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="mt-2 flex items-center justify-between text-[10px]">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ring-1 ${badge}`}>{statusText}</span>
                  {driver.status !== 'busy' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleDriverStatus(driver.id, driver.status === 'available' ? 'offline' : 'available');
                      }}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-medium cursor-pointer ${outlineBtn}`}
                    >
                      Bật/tắt online
                    </button>
                  )}
                </div>

                <div className={`mt-1.5 text-[10px] truncate ${dim}`}>
                  {driver.location.address || `${driver.location.lat}, ${driver.location.lng}`}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
