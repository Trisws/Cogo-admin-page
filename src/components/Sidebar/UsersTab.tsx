import React, { useEffect, useState } from 'react';
import { User, VehicleType, MapClickMode, ThemeMode, Location } from '../../../lib/types/simulation';
import { VEHICLE_CONFIGS } from '../../../lib/utils/presets';
import {
  Search,
  Trash2,
  Zap,
  Compass,
  Phone,
  Plus,
  Sparkles,
  MapPin,
  Car
} from 'lucide-react';

interface UsersTabProps {
  users: User[];
  selectedUserId: string | null;
  onSelectUser: (user: User | null) => void;
  onDeleteUser: (userId: string) => void;
  onAddUser: (user: { name: string; phone: string; location: Location }) => void;
  onBatchGenerateUsers: (count: number) => void;
  onStartCreateTrip: (userId: string, vehicleType: VehicleType) => void;
  onFindTrip: (user: User) => void;
  mapClickMode: MapClickMode;
  setMapClickMode: (mode: MapClickMode) => void;
  pendingRandomLocation: Location | null;
  themeMode?: ThemeMode;
}

export const UsersTab: React.FC<UsersTabProps> = ({
  users,
  selectedUserId,
  onSelectUser,
  onDeleteUser,
  onAddUser,
  onBatchGenerateUsers,
  onStartCreateTrip,
  onFindTrip,
  mapClickMode,
  setMapClickMode,
  pendingRandomLocation,
  themeMode,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);

  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('0901234567');
  const [pickedLocation, setPickedLocation] = useState<Location | null>(null);

  const [tripDraftUserId, setTripDraftUserId] = useState<string | null>(null);
  const [tripVehicleType, setTripVehicleType] = useState<VehicleType>('motorbike');

  // Pick up the random location chosen via the map pin-drop, if the form is the one waiting for it
  useEffect(() => {
    if (pendingRandomLocation) {
      setPickedLocation(pendingRandomLocation);
      setFormOpen(true);
    }
  }, [pendingRandomLocation]);

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
    if (!userName.trim() || !pickedLocation) return;
    onAddUser({ name: userName, phone: userPhone, location: pickedLocation });
    setUserName('');
    setPickedLocation(null);
    setFormOpen(false);
  };

  const handleOpenTripDraft = (userId: string) => {
    setTripDraftUserId((prev) => (prev === userId ? null : userId));
    setTripVehicleType('motorbike');
  };

  const handlePickTripDestination = (userId: string) => {
    onStartCreateTrip(userId, tripVehicleType);
    setTripDraftUserId(null);
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

          <button
            type="button"
            onClick={() => setMapClickMode(mapClickMode === 'pick_random_center' ? 'none' : 'pick_random_center')}
            className={`text-xs px-2.5 py-1.5 rounded-md flex items-center justify-center gap-1.5 cursor-pointer ${
              mapClickMode === 'pick_random_center' ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300' : outlineBtn
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            {pickedLocation ? 'Đã chọn vị trí — bấm để chọn lại' : 'Ghim tâm vùng, random vị trí trong bán kính 5km'}
          </button>

          {pickedLocation && (
            <div className={`text-[11px] flex items-center gap-1.5 ${dim}`}>
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{pickedLocation.address || `${pickedLocation.lat}, ${pickedLocation.lng}`}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!userName.trim() || !pickedLocation}
            className={`w-full py-1.5 rounded-md text-xs font-medium cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              isLight ? 'bg-zinc-900 text-white hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-900 hover:bg-white'
            }`}
          >
            Tạo khách hàng
          </button>
        </form>
      )}

      {/* Filter and Search Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
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
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={`shrink-0 w-28 rounded-md px-2 py-1.5 text-xs focus:outline-none ring-1 ${
            isLight ? 'bg-white text-zinc-800 ring-zinc-300 focus:ring-zinc-500' : 'bg-zinc-950 text-zinc-100 ring-zinc-700 focus:ring-zinc-500'
          }`}
        >
          <option value="all">Tất cả</option>
          <option value="idle">Rảnh</option>
          <option value="driving">Đang lái</option>
          <option value="riding">Đang đi</option>
        </select>
      </div>

      {/* User List */}
      <div className="space-y-2">
        {filteredUsers.length === 0 ? (
          <div className={`text-center py-6 text-xs ${dim}`}>Chưa có khách hàng nào.</div>
        ) : (
          filteredUsers.map((user) => {
            const isSelected = user.id === selectedUserId;
            const isDriving = user.status === 'driving';
            const isRiding = user.status === 'riding';
            const isDraftOpen = tripDraftUserId === user.id;

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
                        {isDriving && (
                          <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ${
                            isLight ? 'bg-amber-100 text-amber-800 ring-amber-300' : 'bg-amber-500/15 text-amber-300 ring-amber-500/30'
                          }`}>Đang lái</span>
                        )}
                        {isRiding && (
                          <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ${
                            isLight ? 'bg-emerald-100 text-emerald-800 ring-emerald-300' : 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30'
                          }`}>Đang đi</span>
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
                    <span className="truncate">Vị trí: {user.location.address || `${user.location.lat}, ${user.location.lng}`}</span>
                  </div>
                </div>

                {user.status === 'idle' && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <div className="mt-2.5 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleOpenTripDraft(user.id)}
                        className={`py-1.5 rounded-md font-medium text-xs flex items-center justify-center gap-1.5 cursor-pointer ${
                          isDraftOpen ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300' : outlineBtn
                        }`}
                      >
                        <Car className="w-3.5 h-3.5" /> Tạo chuyến đi
                      </button>
                      <button
                        onClick={() => onFindTrip(user)}
                        className={`py-1.5 rounded-md font-medium text-xs flex items-center justify-center gap-1.5 cursor-pointer ${outlineBtn}`}
                      >
                        <Zap className="w-3.5 h-3.5" /> Tìm chuyến đi
                      </button>
                    </div>

                    {isDraftOpen && (
                      <div className={`mt-2 p-2 rounded-md border flex flex-col gap-2 ${border} ${isLight ? 'bg-zinc-50' : 'bg-zinc-950'}`}>
                        <select
                          value={tripVehicleType}
                          onChange={(e) => setTripVehicleType(e.target.value as VehicleType)}
                          className={inputCls}
                        >
                          {Object.entries(VEHICLE_CONFIGS).map(([key, config]) => (
                            <option key={key} value={key}>{config.icon} {config.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handlePickTripDestination(user.id)}
                          className={`py-1.5 rounded-md font-medium text-xs flex items-center justify-center gap-1.5 cursor-pointer ${
                            isLight ? 'bg-zinc-900 text-white hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-900 hover:bg-white'
                          }`}
                        >
                          <MapPin className="w-3.5 h-3.5" /> Chọn điểm đến trên bản đồ
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
