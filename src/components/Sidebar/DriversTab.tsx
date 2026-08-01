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
  onAddDriver: (driver: Omit<Driver, 'id' | 'status' | 'heading' | 'totalTrips'>) => void;
  onDeleteDriver: (driverId: string) => void;
  onToggleDriverStatus: (driverId: string, status: DriverStatus) => void;
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
  onAddDriver,
  onDeleteDriver,
  onToggleDriverStatus,
  onBatchGenerateDrivers,
  mapClickMode,
  setMapClickMode,
  mapCenterLocation,
  themeMode,
}) => {
  const [search, setSearch] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);

  const isLight = themeMode === 'light';

  // New Driver Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('0987654321');
  const [plateNumber, setPlateNumber] = useState('51F-888.88');
  const [vehicleType, setVehicleType] = useState<VehicleType>('car_4');
  const [speedKmH, setSpeedKmH] = useState(40);
  const [driverLat, setDriverLat] = useState<string>(mapCenterLocation.lat.toFixed(6));
  const [driverLng, setDriverLng] = useState<string>(mapCenterLocation.lng.toFixed(6));

  const filteredDrivers = drivers.filter((d) => {
    const matchesSearch = d.name.toLowerCase().includes(search.toLowerCase()) || d.plateNumber.includes(search);
    const matchesVehicle = vehicleFilter === 'all' || d.vehicleType === vehicleFilter;
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    return matchesSearch && matchesVehicle && matchesStatus;
  });

  const handleSubmitNewDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAddDriver({
      name,
      phone,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=drv_${Date.now()}`,
      location: {
        lat: parseFloat(driverLat) || mapCenterLocation.lat,
        lng: parseFloat(driverLng) || mapCenterLocation.lng,
      },
      vehicleType,
      plateNumber,
      rating: 4.9,
      speedKmH,
    });

    setName('');
    setShowAddForm(false);
  };

  return (
    <div className={`flex flex-col h-full gap-3 p-3 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
      {/* Top Action Bar & Batch Generation */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex-1 py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
        >
          <Car className="w-4 h-4" />
          {showAddForm ? 'Đóng Form' : 'Thêm Tài Xế Mới'}
        </button>

        <button
          onClick={() => onBatchGenerateDrivers(5)}
          className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center gap-1 transition-colors border cursor-pointer ${
            isLight
              ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700'
              : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-emerald-400'
          }`}
          title="Tạo thêm 5 tài xế ngẫu nhiên quanh bản đồ"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
          +5 Ngẫu nhiên
        </button>
      </div>

      {/* Manual Driver Creation Form */}
      {showAddForm && (
        <form onSubmit={handleSubmitNewDriver} className={`border rounded-xl p-3 flex flex-col gap-2.5 text-xs animate-fadeIn ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-700'
        }`}>
          <h3 className="font-bold text-emerald-600 flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-1.5">
            <Car className="w-4 h-4" /> Đăng ký tài xế giả lập
          </h3>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={`text-[10px] font-semibold block mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Tên tài xế</label>
              <input
                type="text"
                placeholder="VD: Nguyễn Văn B"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className={`w-full border rounded-lg px-2.5 py-1.5 text-xs focus:border-emerald-500 focus:outline-none ${
                  isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-700 text-slate-100'
                }`}
              />
            </div>
            <div>
              <label className={`text-[10px] font-semibold block mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Biển số xe</label>
              <input
                type="text"
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value)}
                className={`w-full border rounded-lg px-2.5 py-1.5 text-xs focus:border-emerald-500 focus:outline-none ${
                  isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-700 text-slate-100'
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={`text-[10px] font-semibold block mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Loại phương tiện</label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value as VehicleType)}
                className={`w-full border rounded-lg px-2 py-1.5 text-xs ${
                  isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-700 text-slate-100'
                }`}
              >
                {Object.entries(VEHICLE_CONFIGS).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.icon} {config.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={`text-[10px] font-semibold block mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Tốc độ (km/h)</label>
              <input
                type="number"
                min="10"
                max="100"
                value={speedKmH}
                onChange={(e) => setSpeedKmH(Number(e.target.value))}
                className={`w-full border rounded-lg px-2.5 py-1.5 text-xs ${
                  isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-700 text-slate-100'
                }`}
              />
            </div>
          </div>

          {/* Position Picker */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-600" /> Vị trí xuất phát
              </span>
              <button
                type="button"
                onClick={() => setMapClickMode(mapClickMode === 'add_driver' ? 'none' : 'add_driver')}
                className={`text-[10px] px-2 py-0.5 rounded border font-semibold cursor-pointer ${
                  mapClickMode === 'add_driver'
                    ? 'bg-emerald-500 text-white border-emerald-600'
                    : isLight
                      ? 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                      : 'bg-slate-800 text-emerald-300 border-slate-700'
                }`}
              >
                📍 Chọn trên bản đồ
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                step="any"
                placeholder="Vĩ độ (Lat)"
                value={driverLat}
                onChange={(e) => setDriverLat(e.target.value)}
                className={`border rounded-lg px-2 py-1 text-[11px] ${
                  isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-700 text-slate-200'
                }`}
              />
              <input
                type="number"
                step="any"
                placeholder="Kinh độ (Lng)"
                value={driverLng}
                onChange={(e) => setDriverLng(e.target.value)}
                className={`border rounded-lg px-2 py-1 text-[11px] ${
                  isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-700 text-slate-200'
                }`}
              />
            </div>
          </div>

          <button
            type="submit"
            className="mt-1 w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs transition-colors shadow cursor-pointer"
          >
            Lưu & Xuất Bến
          </button>
        </form>
      )}

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
