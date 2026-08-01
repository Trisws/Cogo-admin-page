import React, { useState } from 'react';
import { User, MapClickMode, VehicleType, ThemeMode } from '../../types/simulation';
import { VEHICLE_CONFIGS } from '../../utils/presets';
import { 
  Plus, 
  UserPlus, 
  Search, 
  MapPin, 
  Navigation, 
  Trash2, 
  Zap, 
  Phone, 
  Sparkles,
  CheckCircle2
} from 'lucide-react';

interface UsersTabProps {
  users: User[];
  selectedUserId: string | null;
  onSelectUser: (user: User | null) => void;
  onAddUser: (user: Omit<User, 'id' | 'status'>) => void;
  onDeleteUser: (userId: string) => void;
  onRequestRide: (user: User) => void;
  onBatchGenerateUsers: (count: number) => void;
  mapClickMode: MapClickMode;
  setMapClickMode: (mode: MapClickMode) => void;
  mapCenterLocation: { lat: number; lng: number };
  themeMode?: ThemeMode;
}

export const UsersTab: React.FC<UsersTabProps> = ({
  users,
  selectedUserId,
  onSelectUser,
  onAddUser,
  onDeleteUser,
  onRequestRide,
  onBatchGenerateUsers,
  mapClickMode,
  setMapClickMode,
  mapCenterLocation,
  themeMode,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);

  const isLight = themeMode === 'light';

  // New user form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('0901234567');
  const [pickupLat, setPickupLat] = useState<string>(mapCenterLocation.lat.toFixed(6));
  const [pickupLng, setPickupLng] = useState<string>(mapCenterLocation.lng.toFixed(6));
  const [destLat, setDestLat] = useState<string>((mapCenterLocation.lat + 0.012).toFixed(6));
  const [destLng, setDestLng] = useState<string>((mapCenterLocation.lng + 0.015).toFixed(6));
  const [requestedVehicle, setRequestedVehicle] = useState<VehicleType | 'any'>('any');

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.phone.includes(search);
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSubmitNewUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAddUser({
      name,
      phone,
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

    setName('');
    setShowAddForm(false);
  };

  return (
    <div className={`flex flex-col h-full gap-3 p-3 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
      {/* Top Action Bar & Batch Generation */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex-1 py-2 px-3 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-sky-600/20 transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          {showAddForm ? 'Đóng Form' : 'Tạo Khách Hàng Thủ Công'}
        </button>

        <button
          onClick={() => onBatchGenerateUsers(5)}
          className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center gap-1 transition-colors border cursor-pointer ${
            isLight
              ? 'bg-sky-50 hover:bg-sky-100 border-sky-200 text-sky-700'
              : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-sky-400'
          }`}
          title="Tạo nhanh 5 người dùng ngẫu nhiên"
        >
          <Sparkles className="w-3.5 h-3.5 text-sky-500" />
          +5 Ngẫu nhiên
        </button>
      </div>

      {/* Manual User Creation Form */}
      {showAddForm && (
        <form onSubmit={handleSubmitNewUser} className={`border rounded-xl p-3 flex flex-col gap-2.5 text-xs animate-fadeIn ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-700'
        }`}>
          <h3 className="font-bold text-sky-600 flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-1.5">
            <UserPlus className="w-4 h-4" /> Thêm người dùng mới
          </h3>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={`text-[10px] font-semibold block mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Tên khách hàng</label>
              <input
                type="text"
                placeholder="VD: Nguyễn Văn A"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className={`w-full border rounded-lg px-2.5 py-1.5 text-xs focus:border-sky-500 focus:outline-none ${
                  isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-700 text-slate-100'
                }`}
              />
            </div>
            <div>
              <label className={`text-[10px] font-semibold block mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Số điện thoại</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={`w-full border rounded-lg px-2.5 py-1.5 text-xs focus:border-sky-500 focus:outline-none ${
                  isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-700 text-slate-100'
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
                value={pickupLat}
                onChange={(e) => setPickupLat(e.target.value)}
                className={`border rounded-lg px-2 py-1 text-[11px] ${
                  isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-700 text-slate-200'
                }`}
              />
              <input
                type="number"
                step="any"
                placeholder="Kinh độ (Lng)"
                value={pickupLng}
                onChange={(e) => setPickupLng(e.target.value)}
                className={`border rounded-lg px-2 py-1 text-[11px] ${
                  isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-700 text-slate-200'
                }`}
              />
            </div>
          </div>

          {/* Destination Position */}
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
                      ? 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'
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
                placeholder="Vĩ độ (Lat)"
                value={destLat}
                onChange={(e) => setDestLat(e.target.value)}
                className={`border rounded-lg px-2 py-1 text-[11px] ${
                  isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-700 text-slate-200'
                }`}
              />
              <input
                type="number"
                step="any"
                placeholder="Kinh độ (Lng)"
                value={destLng}
                onChange={(e) => setDestLng(e.target.value)}
                className={`border rounded-lg px-2 py-1 text-[11px] ${
                  isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-700 text-slate-200'
                }`}
              />
            </div>
          </div>

          {/* Vehicle Preference */}
          <div>
            <label className={`text-[10px] font-semibold block mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Loại xe yêu cầu</label>
            <select
              value={requestedVehicle}
              onChange={(e) => setRequestedVehicle(e.target.value as any)}
              className={`w-full border rounded-lg px-2.5 py-1.5 text-xs ${
                isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-700 text-slate-100'
              }`}
            >
              <option value="any">Bất kỳ xe nào sẵn sàng</option>
              {Object.entries(VEHICLE_CONFIGS).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.icon} {config.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="mt-1 w-full py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold text-xs transition-colors shadow cursor-pointer"
          >
            Lưu & Tạo Người Dùng
          </button>
        </form>
      )}

      {/* Filter and Search Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className={`w-3.5 h-3.5 absolute left-2.5 top-2.5 ${isLight ? 'text-slate-400' : 'text-slate-400'}`} />
          <input
            type="text"
            placeholder="Tìm theo tên/SĐT..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full border rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-sky-500 ${
              isLight ? 'bg-slate-100 border-slate-200 text-slate-800 placeholder-slate-400' : 'bg-slate-900 border-slate-800 text-slate-200'
            }`}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={`border rounded-xl px-2.5 py-1.5 text-xs focus:outline-none ${
            isLight ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-slate-900 border-slate-800 text-slate-300'
          }`}
        >
          <option value="all">Tất cả ({users.length})</option>
          <option value="idle">Chờ ({users.filter(u => u.status === 'idle').length})</option>
          <option value="requesting">Đang tìm xe ({users.filter(u => u.status === 'requesting').length})</option>
          <option value="in_trip">Đang trong chuyến ({users.filter(u => u.status === 'in_trip').length})</option>
        </select>
      </div>

      {/* User List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {filteredUsers.length === 0 ? (
          <div className={`text-center py-8 text-xs ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
            Chưa có người dùng nào. Nhấn "+5 Ngẫu nhiên" để tạo nhanh!
          </div>
        ) : (
          filteredUsers.map((user) => {
            const isSelected = user.id === selectedUserId;
            const isRequesting = user.status === 'requesting';
            const isInTrip = user.status === 'in_trip';

            return (
              <div
                key={user.id}
                onClick={() => onSelectUser(user)}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? isLight
                      ? 'bg-sky-50 border-sky-400 shadow-sm'
                      : 'bg-sky-950/60 border-sky-500/80 shadow-md shadow-sky-900/30'
                    : isLight
                      ? 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className={`w-9 h-9 rounded-full border ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-800 border-slate-700'}`}
                    />
                    <div>
                      <h4 className={`font-bold text-xs flex items-center gap-1.5 ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                        {user.name}
                        {isInTrip && <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-600 font-bold rounded border border-emerald-500/30">Đang đi</span>}
                        {isRequesting && <span className="text-[10px] px-1.5 py-0.2 bg-rose-500/20 text-rose-600 font-bold rounded border border-rose-500/30 animate-pulse">Tìm xe</span>}
                      </h4>
                      <div className={`flex items-center gap-2 text-[10px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                        <span className="flex items-center gap-0.5"><Phone className="w-3 h-3" /> {user.phone}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteUser(user.id);
                    }}
                    className={`p-1 rounded cursor-pointer ${isLight ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50' : 'text-slate-500 hover:text-rose-400 hover:bg-slate-800'}`}
                    title="Xóa người dùng"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Location addresses */}
                <div className={`mt-2 text-[11px] rounded-lg p-2 space-y-1 border ${
                  isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-950/60 border-slate-800/80'
                }`}>
                  <div className="flex items-center gap-1.5 text-emerald-600 font-medium truncate">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                    <span className="truncate">Đón: {user.location.address || `${user.location.lat}, ${user.location.lng}`}</span>
                  </div>
                  {user.destination && (
                    <div className="flex items-center gap-1.5 text-rose-600 font-medium truncate">
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                      <span className="truncate">Đến: {user.destination.address || `${user.destination.lat}, ${user.destination.lng}`}</span>
                    </div>
                  )}
                </div>

                {/* Request Ride Button */}
                {user.status === 'idle' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRequestRide(user);
                    }}
                    className="mt-2.5 w-full py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5" /> Đặt Chuyến Ngay
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
