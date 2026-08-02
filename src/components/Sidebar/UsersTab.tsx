import React, { useState } from 'react';
import { User, VehicleType, MapClickMode, ThemeMode } from '../../../lib/types/simulation';
import {
  Search,
  Trash2,
  Zap,
  Phone,
  Plus,
  Sparkles,
  MapPin,
  Navigation
} from 'lucide-react';

interface UsersTabProps {
  users: User[];
  selectedUserId: string | null;
  onSelectUser: (user: User | null) => void;
  onDeleteUser: (userId: string) => void;
  onRequestRide: (user: User) => void;
  onAddUser: (user: Omit<User, 'id' | 'status'>) => void;
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
  onDeleteUser,
  onRequestRide,
  onAddUser,
  onBatchGenerateUsers,
  mapClickMode,
  setMapClickMode,
  mapCenterLocation,
  themeMode,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);

  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('0901234567');
  const [pickupLat, setPickupLat] = useState<string>(mapCenterLocation.lat.toFixed(6));
  const [pickupLng, setPickupLng] = useState<string>(mapCenterLocation.lng.toFixed(6));
  const [destLat, setDestLat] = useState<string>((mapCenterLocation.lat + 0.012).toFixed(6));
  const [destLng, setDestLng] = useState<string>((mapCenterLocation.lng + 0.015).toFixed(6));
  const [requestedVehicle, setRequestedVehicle] = useState<VehicleType | 'any'>('any');

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

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.phone.includes(search);
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSubmitUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) return;
    onAddUser({
      name: userName,
      phone: userPhone,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=u_${Date.now()}`,
      location: { lat: parseFloat(pickupLat) || mapCenterLocation.lat, lng: parseFloat(pickupLng) || mapCenterLocation.lng },
      destination: { lat: parseFloat(destLat) || mapCenterLocation.lat + 0.01, lng: parseFloat(destLng) || mapCenterLocation.lng + 0.01 },
      requestedVehicleType: requestedVehicle,
    });
    setUserName('');
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
          <Plus className="w-3.5 h-3.5" /> Thêm khách hàng
        </button>
        <button
          onClick={() => onBatchGenerateUsers(5)}
          className={`rounded-md px-2.5 py-1.5 text-xs font-medium flex items-center gap-1 cursor-pointer ${outlineBtn}`}
          title="Sinh nhanh 5 khách hàng ngẫu nhiên"
        >
          <Sparkles className="w-3.5 h-3.5" /> +5
        </button>
      </div>

      {formOpen && (
        <form onSubmit={handleSubmitUser} className={`flex flex-col gap-2 rounded-lg border p-3 ${border} ${isLight ? 'bg-zinc-50' : 'bg-zinc-950'}`}>
          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder="Tên khách hàng" value={userName} onChange={(e) => setUserName(e.target.value)} required className={inputCls} />
            <input type="text" placeholder="Số điện thoại" value={userPhone} onChange={(e) => setUserPhone(e.target.value)} className={inputCls} />
          </div>
          <select value={requestedVehicle} onChange={(e) => setRequestedVehicle(e.target.value as VehicleType | 'any')} className={inputCls}>
            <option value="any">Bất kỳ phương tiện</option>
            <option value="motorbike">🛵 Xe máy</option>
            <option value="car_4">🚗 Ô tô 4 chỗ</option>
            <option value="car_7">🚘 Ô tô 7 chỗ</option>
          </select>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMapClickMode(mapClickMode === 'set_pickup' ? 'none' : 'set_pickup')}
              className={`text-[11px] px-2 py-1 rounded-md flex items-center gap-1 cursor-pointer ${
                mapClickMode === 'set_pickup' ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300' : outlineBtn
              }`}
            >
              <MapPin className="w-3 h-3" /> điểm đón
            </button>
            <button
              type="button"
              onClick={() => setMapClickMode(mapClickMode === 'set_dropoff' ? 'none' : 'set_dropoff')}
              className={`text-[11px] px-2 py-1 rounded-md flex items-center gap-1 cursor-pointer ${
                mapClickMode === 'set_dropoff' ? 'bg-rose-100 text-rose-800 ring-1 ring-rose-300' : outlineBtn
              }`}
            >
              <Navigation className="w-3 h-3" /> điểm đến
            </button>
          </div>
          <button type="submit" className={`w-full py-1.5 rounded-md text-xs font-medium cursor-pointer ${
            isLight ? 'bg-zinc-900 text-white hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-900 hover:bg-white'
          }`}>
            Tạo khách hàng
          </button>
        </form>
      )}

      {/* Filter and Search Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className={`w-3.5 h-3.5 absolute left-2.5 top-2.5 ${dim}`} />
          <input
            type="text"
            placeholder="Tìm tên/SĐT..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full rounded-md pl-8 pr-3 py-1.5 text-xs ring-1 focus:outline-none ${
              isLight ? 'bg-white ring-zinc-300 text-zinc-800 placeholder-zinc-400' : 'bg-zinc-950 ring-zinc-700 text-zinc-100 placeholder-zinc-600'
            }`}
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputCls}>
          <option value="all">Tất cả</option>
          <option value="idle">Chờ</option>
          <option value="requesting">Đang tìm xe</option>
          <option value="in_trip">Đang đi</option>
        </select>
      </div>

      {/* User List */}
      <div className="space-y-2">
        {filteredUsers.length === 0 ? (
          <div className={`text-center py-6 text-xs ${dim}`}>Chưa có khách hàng nào.</div>
        ) : (
          filteredUsers.map((user) => {
            const isSelected = user.id === selectedUserId;
            const isRequesting = user.status === 'requesting';
            const isInTrip = user.status === 'in_trip';

            return (
              <div
                key={user.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectUser(user)}
                onKeyDown={(e) => {
                  if (e.target !== e.currentTarget) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectUser(user);
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
                    <img src={user.avatar} alt={user.name} className={`w-8 h-8 rounded-full border ${border}`} />
                    <div>
                      <h4 className={`font-semibold text-xs flex items-center gap-1.5 ${isLight ? 'text-zinc-900' : 'text-zinc-100'}`}>
                        {user.name}
                        {isInTrip && (
                          <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ${
                            isLight ? 'bg-emerald-100 text-emerald-800 ring-emerald-300' : 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30'
                          }`}>Đang đi</span>
                        )}
                        {isRequesting && (
                          <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 animate-pulse ${
                            isLight ? 'bg-rose-100 text-rose-800 ring-rose-300' : 'bg-rose-500/15 text-rose-300 ring-rose-500/30'
                          }`}>Tìm xe</span>
                        )}
                      </h4>
                      <div className={`flex items-center gap-2 text-[10px] mt-0.5 ${dim}`}>
                        <span className="flex items-center gap-0.5"><Phone className="w-3 h-3" /> {user.phone}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteUser(user.id); }}
                    className={`p-1 rounded cursor-pointer ${dim} hover:text-rose-500`}
                    title="Xóa người dùng"
                    aria-label="Xóa người dùng"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className={`mt-2 text-[11px] rounded-md p-2 space-y-1 ${isLight ? 'bg-zinc-50' : 'bg-zinc-950'}`}>
                  <div className="flex items-center gap-1.5 text-emerald-600 font-medium truncate">
                    <span>●</span>
                    <span className="truncate">Đón: {user.location.address || `${user.location.lat}, ${user.location.lng}`}</span>
                  </div>
                  {user.destination && (
                    <div className="flex items-center gap-1.5 text-rose-500 font-medium truncate">
                      <span>●</span>
                      <span className="truncate">Đến: {user.destination.address || `${user.destination.lat}, ${user.destination.lng}`}</span>
                    </div>
                  )}
                </div>

                {user.status === 'idle' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onRequestRide(user); }}
                    className={`mt-2.5 w-full py-1.5 rounded-md font-medium text-xs flex items-center justify-center gap-1.5 cursor-pointer ${
                      isLight ? 'bg-zinc-900 text-white hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-900 hover:bg-white'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" /> Đặt chuyến ngay
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
