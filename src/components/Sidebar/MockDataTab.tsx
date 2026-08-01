import React, { useState } from 'react';
import { Driver, User, DriverStatus, VehicleType, MapClickMode, ThemeMode } from '../../types/simulation';
import { VEHICLE_CONFIGS } from '../../utils/presets';
import { 
  Sparkles, 
  Car, 
  UserPlus, 
  Plus, 
  RotateCcw, 
  Trash2, 
  MapPin, 
  Navigation, 
  Gauge, 
  Layers,
  Database,
  CheckCircle2
} from 'lucide-react';

interface MockDataTabProps {
  drivers: Driver[];
  users: User[];
  onAddUser: (user: Omit<User, 'id' | 'status'>) => void;
  onDeleteUser: (userId: string) => void;
  onBatchGenerateUsers: (count: number) => void;
  onAddDriver: (driver: Omit<Driver, 'id' | 'status' | 'heading' | 'totalTrips'>) => void;
  onDeleteDriver: (driverId: string) => void;
  onBatchGenerateDrivers: (count: number) => void;
  onResetSimulation: () => void;
  onClearAllData?: () => void;
  onSeedRandom: () => void;
  mapClickMode: MapClickMode;
  setMapClickMode: (mode: MapClickMode) => void;
  mapCenterLocation: { lat: number; lng: number };
  themeMode?: ThemeMode;
}

export const MockDataTab: React.FC<MockDataTabProps> = ({
  drivers,
  users,
  onAddUser,
  onDeleteUser,
  onBatchGenerateUsers,
  onAddDriver,
  onDeleteDriver,
  onBatchGenerateDrivers,
  onResetSimulation,
  onClearAllData,
  onSeedRandom,
  mapClickMode,
  setMapClickMode,
  mapCenterLocation,
  themeMode,
}) => {
  const isLight = themeMode === 'light';
  const [formType, setFormType] = useState<'driver' | 'user'>('driver');

  // New Driver Form State
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('0987654321');
  const [driverPlate, setDriverPlate] = useState('51F-888.88');
  const [vehicleType, setVehicleType] = useState<VehicleType>('car_4');
  const [speedKmH, setSpeedKmH] = useState(40);
  const [driverLat, setDriverLat] = useState<string>(mapCenterLocation.lat.toFixed(6));
  const [driverLng, setDriverLng] = useState<string>(mapCenterLocation.lng.toFixed(6));

  // New User Form State
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('0901234567');
  const [pickupLat, setPickupLat] = useState<string>(mapCenterLocation.lat.toFixed(6));
  const [pickupLng, setPickupLng] = useState<string>(mapCenterLocation.lng.toFixed(6));
  const [destLat, setDestLat] = useState<string>((mapCenterLocation.lat + 0.012).toFixed(6));
  const [destLng, setDestLng] = useState<string>((mapCenterLocation.lng + 0.015).toFixed(6));
  const [requestedVehicle, setRequestedVehicle] = useState<VehicleType | 'any'>('any');

  const handleSubmitDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverName.trim()) return;

    onAddDriver({
      name: driverName,
      phone: driverPhone,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=drv_${Date.now()}`,
      location: {
        lat: parseFloat(driverLat) || mapCenterLocation.lat,
        lng: parseFloat(driverLng) || mapCenterLocation.lng,
      },
      vehicleType,
      plateNumber: driverPlate,
      rating: 4.9,
      speedKmH,
    });

    setDriverName('');
  };

  const handleSubmitUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) return;

    onAddUser({
      name: userName,
      phone: userPhone,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=u_${Date.now()}`,
      location: {
        lat: parseFloat(pickupLat) || mapCenterLocation.lat,
        lng: parseFloat(pickupLng) || mapCenterLocation.lng,
      },
      destination: {
        lat: parseFloat(destLat) || mapCenterLocation.lat + 0.01,
        lng: parseFloat(destLng) || mapCenterLocation.lng + 0.01,
      },
      requestedVehicleType: requestedVehicle,
    });

    setUserName('');
  };

  return (
    <div className={`flex flex-col h-full gap-3 p-3 overflow-y-auto ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
      {/* Tab Header Banner */}
      <div className={`p-3 rounded-xl border flex items-center justify-between ${
        isLight ? 'bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200' : 'bg-slate-900 border-purple-900/50'
      }`}>
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-purple-600 text-white rounded-lg shadow-md shadow-purple-600/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-xs text-purple-700 dark:text-purple-300">Quản Lý Dữ Liệu Ảo</h3>
            <p className={`text-[10px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Tạo, sinh tự động hoặc xóa dữ liệu giả lập
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onClearAllData && (
            <button
              onClick={onClearAllData}
              className={`px-2 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1 transition-all cursor-pointer ${
                isLight
                  ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-700 shadow-sm'
                  : 'bg-rose-700 hover:bg-rose-600 text-white border-rose-800'
              }`}
              title="Xóa sạch toàn bộ tài xế, khách hàng và chuyến đi hiện tại"
            >
              <Trash2 className="w-3.5 h-3.5" /> Xóa Tất Cả Data
            </button>
          )}

          <button
            onClick={onResetSimulation}
            className={`px-2 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1 transition-all cursor-pointer ${
              isLight
                ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-sm'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Khôi phục lại bộ dữ liệu mẫu mặc định"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Mẫu Ban Đầu
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
          isLight ? 'bg-emerald-50/70 border-emerald-200' : 'bg-slate-900 border-emerald-900/40'
        }`}>
          <div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block">Tài Xế Ảo</span>
            <span className="text-base font-extrabold text-emerald-700 dark:text-emerald-300">{drivers.length}</span>
          </div>
          <Car className="w-5 h-5 text-emerald-500 opacity-80" />
        </div>

        <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
          isLight ? 'bg-sky-50/70 border-sky-200' : 'bg-slate-900 border-sky-900/40'
        }`}>
          <div>
            <span className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold block">Khách Hàng Ảo</span>
            <span className="text-base font-extrabold text-sky-700 dark:text-sky-300">{users.length}</span>
          </div>
          <UserPlus className="w-5 h-5 text-sky-500 opacity-80" />
        </div>
      </div>

      {/* Section 1: Quick Batch Generation */}
      <div className={`p-3 rounded-xl border flex flex-col gap-2 ${
        isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-900/80 border-slate-800'
      }`}>
        <h4 className="font-bold text-xs flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
          <Database className="w-4 h-4" /> Sinh Nhanh Dữ Liệu Tự Động
        </h4>

        <div className="grid grid-cols-2 gap-2 mt-1">
          <button
            onClick={() => onBatchGenerateDrivers(5)}
            className="py-2 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-colors cursor-pointer"
          >
            <Car className="w-3.5 h-3.5" /> +5 Tài Xế Ngẫu Nhiên
          </button>

          <button
            onClick={() => onBatchGenerateUsers(5)}
            className="py-2 px-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-colors cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" /> +5 Khách Ngẫu Nhiên
          </button>
        </div>

        <button
          onClick={onSeedRandom}
          className={`mt-1 py-1.5 px-3 rounded-lg font-bold text-xs border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            isLight
              ? 'bg-white hover:bg-purple-50 text-purple-700 border-purple-200'
              : 'bg-slate-800 hover:bg-slate-700 text-purple-300 border-slate-700'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-500" /> Phân Bổ Thêm 4 Tài Xế & 3 Khách Hàng
        </button>
      </div>

      {/* Section 2: Manual Creation Form */}
      <div className={`p-3 rounded-xl border flex flex-col gap-2.5 ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
      }`}>
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
          <h4 className="font-bold text-xs flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
            <Plus className="w-4 h-4 text-purple-500" /> Tạo Dữ Liệu Thủ Công
          </h4>

          {/* Switch Form Type */}
          <div className="flex p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-bold">
            <button
              onClick={() => setFormType('driver')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                formType === 'driver'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Tài Xế
            </button>
            <button
              onClick={() => setFormType('user')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                formType === 'user'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Khách Hàng
            </button>
          </div>
        </div>

        {/* Driver Form */}
        {formType === 'driver' && (
          <form onSubmit={handleSubmitDriver} className="flex flex-col gap-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={`text-[10px] font-semibold block mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Tên tài xế</label>
                <input
                  type="text"
                  placeholder="VD: Nguyễn Văn Nam"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  required
                  className={`w-full border rounded-lg px-2.5 py-1.5 text-xs focus:border-emerald-500 focus:outline-none ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-700 text-slate-100'
                  }`}
                />
              </div>
              <div>
                <label className={`text-[10px] font-semibold block mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Biển số xe</label>
                <input
                  type="text"
                  value={driverPlate}
                  onChange={(e) => setDriverPlate(e.target.value)}
                  className={`w-full border rounded-lg px-2.5 py-1.5 text-xs focus:border-emerald-500 focus:outline-none ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-700 text-slate-100'
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={`text-[10px] font-semibold block mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Phương tiện</label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value as VehicleType)}
                  className={`w-full border rounded-lg px-2 py-1.5 text-xs ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-700 text-slate-100'
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
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-700 text-slate-100'
                  }`}
                />
              </div>
            </div>

            {/* Position Picker */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-emerald-600" /> Vị trí trên bản đồ
                </span>
                <button
                  type="button"
                  onClick={() => setMapClickMode(mapClickMode === 'add_driver' ? 'none' : 'add_driver')}
                  className={`text-[10px] px-2 py-0.5 rounded border font-semibold cursor-pointer ${
                    mapClickMode === 'add_driver'
                      ? 'bg-emerald-500 text-white border-emerald-600'
                      : isLight
                        ? 'bg-slate-100 text-emerald-700 border-emerald-200 hover:bg-emerald-50'
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
                  placeholder="Vĩ độ"
                  value={driverLat}
                  onChange={(e) => setDriverLat(e.target.value)}
                  className={`border rounded-lg px-2 py-1 text-[11px] ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-700 text-slate-200'
                  }`}
                />
                <input
                  type="number"
                  step="any"
                  placeholder="Kinh độ"
                  value={driverLng}
                  onChange={(e) => setDriverLng(e.target.value)}
                  className={`border rounded-lg px-2 py-1 text-[11px] ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-700 text-slate-200'
                  }`}
                />
              </div>
            </div>

            <button
              type="submit"
              className="mt-1 w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs transition-colors shadow cursor-pointer"
            >
              Tạo Tài Xế Ảo Mới
            </button>
          </form>
        )}

        {/* User Form */}
        {formType === 'user' && (
          <form onSubmit={handleSubmitUser} className="flex flex-col gap-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={`text-[10px] font-semibold block mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Tên khách hàng</label>
                <input
                  type="text"
                  placeholder="VD: Trần Thị Mai"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  required
                  className={`w-full border rounded-lg px-2.5 py-1.5 text-xs focus:border-sky-500 focus:outline-none ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-700 text-slate-100'
                  }`}
                />
              </div>
              <div>
                <label className={`text-[10px] font-semibold block mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Số điện thoại</label>
                <input
                  type="text"
                  value={userPhone}
                  onChange={(e) => setUserPhone(e.target.value)}
                  className={`w-full border rounded-lg px-2.5 py-1.5 text-xs focus:border-sky-500 focus:outline-none ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-700 text-slate-100'
                  }`}
                />
              </div>
            </div>

            {/* Pickup Position */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-emerald-600" /> Vị trí đón (Pickup)
                </span>
                <button
                  type="button"
                  onClick={() => setMapClickMode(mapClickMode === 'set_pickup' ? 'none' : 'set_pickup')}
                  className={`text-[10px] px-2 py-0.5 rounded border font-semibold cursor-pointer ${
                    mapClickMode === 'set_pickup'
                      ? 'bg-emerald-500 text-white border-emerald-600'
                      : isLight
                        ? 'bg-slate-100 text-emerald-700 border-emerald-200 hover:bg-emerald-50'
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
                  placeholder="Vĩ độ"
                  value={pickupLat}
                  onChange={(e) => setPickupLat(e.target.value)}
                  className={`border rounded-lg px-2 py-1 text-[11px] ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-700 text-slate-200'
                  }`}
                />
                <input
                  type="number"
                  step="any"
                  placeholder="Kinh độ"
                  value={pickupLng}
                  onChange={(e) => setPickupLng(e.target.value)}
                  className={`border rounded-lg px-2 py-1 text-[11px] ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-700 text-slate-200'
                  }`}
                />
              </div>
            </div>

            {/* Dropoff Position */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-rose-600 font-semibold flex items-center gap-1">
                  <Navigation className="w-3 h-3 text-rose-600" /> Điểm đến (Dropoff)
                </span>
                <button
                  type="button"
                  onClick={() => setMapClickMode(mapClickMode === 'set_dropoff' ? 'none' : 'set_dropoff')}
                  className={`text-[10px] px-2 py-0.5 rounded border font-semibold cursor-pointer ${
                    mapClickMode === 'set_dropoff'
                      ? 'bg-rose-500 text-white border-rose-600'
                      : isLight
                        ? 'bg-slate-100 text-rose-700 border-rose-200 hover:bg-rose-50'
                        : 'bg-slate-800 text-rose-300 border-slate-700'
                  }`}
                >
                  📍 Chọn trên bản đồ
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="any"
                  placeholder="Vĩ độ"
                  value={destLat}
                  onChange={(e) => setDestLat(e.target.value)}
                  className={`border rounded-lg px-2 py-1 text-[11px] ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-700 text-slate-200'
                  }`}
                />
                <input
                  type="number"
                  step="any"
                  placeholder="Kinh độ"
                  value={destLng}
                  onChange={(e) => setDestLng(e.target.value)}
                  className={`border rounded-lg px-2 py-1 text-[11px] ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-700 text-slate-200'
                  }`}
                />
              </div>
            </div>

            <button
              type="submit"
              className="mt-1 w-full py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold text-xs transition-colors shadow cursor-pointer"
            >
              Tạo Khách Hàng Ảo Mới
            </button>
          </form>
        )}
      </div>

      {/* Section 3: Data Deletion / Entity Cleanup Management */}
      <div className={`p-3 rounded-xl border flex flex-col gap-2 ${
        isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'
      }`}>
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-xs flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
            <Trash2 className="w-4 h-4" /> Quản Lý & Xóa Dữ Liệu Ảo
          </h4>
          {onClearAllData && (drivers.length > 0 || users.length > 0) && (
            <button
              onClick={onClearAllData}
              className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold transition-colors cursor-pointer"
            >
              Xóa sạch tất cả
            </button>
          )}
        </div>

        {/* Drivers list for deletion */}
        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
          <span className="text-[10px] font-bold text-slate-500 block">TÀI XẾ ẢO ({drivers.length})</span>
          {drivers.map((drv) => (
            <div
              key={drv.id}
              className={`p-2 rounded-lg border flex items-center justify-between text-xs ${
                isLight ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{drv.name}</span>
                <span className="text-[10px] px-1 py-0.2 bg-slate-100 dark:bg-slate-800 font-mono rounded text-slate-500">{drv.plateNumber}</span>
              </div>
              <button
                onClick={() => onDeleteDriver(drv.id)}
                className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                title="Xóa tài xế ảo này"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          <span className="text-[10px] font-bold text-slate-500 block mt-3">KHÁCH HÀNG ẢO ({users.length})</span>
          {users.map((usr) => (
            <div
              key={usr.id}
              className={`p-2 rounded-lg border flex items-center justify-between text-xs ${
                isLight ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{usr.name}</span>
                <span className="text-[10px] text-slate-400">{usr.phone}</span>
              </div>
              <button
                onClick={() => onDeleteUser(usr.id)}
                className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                title="Xóa khách hàng ảo này"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
