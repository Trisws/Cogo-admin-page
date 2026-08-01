import React, { useState } from 'react';
import { User, MapClickMode, VehicleType, ThemeMode } from '../../../lib/types/simulation';
import { VEHICLE_CONFIGS } from '../../../lib/utils/presets';
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
  onDeleteUser: (userId: string) => void;
  onRequestRide: (user: User) => void;
  onNavigateToMockTab?: () => void;
  themeMode?: ThemeMode;
}

export const UsersTab: React.FC<UsersTabProps> = ({
  users,
  selectedUserId,
  onSelectUser,
  onDeleteUser,
  onRequestRide,
  onNavigateToMockTab,
  themeMode,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const isLight = themeMode === 'light';

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.phone.includes(search);
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className={`flex flex-col h-full gap-3 p-3 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
      {/* Banner / Header for User Observation */}
      <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
        isLight ? 'bg-sky-50/80 border-sky-200 text-sky-900' : 'bg-slate-900 border-sky-900/50 text-sky-300'
      }`}>
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-sky-600 shrink-0" />
          <span className="text-xs font-semibold">
            Danh sách người dùng thực tế ({users.length})
          </span>
        </div>
        {onNavigateToMockTab && (
          <button
            onClick={onNavigateToMockTab}
            className={`text-[10px] px-2 py-1 rounded-lg font-bold border flex items-center gap-1 transition-all cursor-pointer ${
              isLight
                ? 'bg-white hover:bg-sky-100 text-sky-700 border-sky-300 shadow-sm'
                : 'bg-slate-800 hover:bg-slate-700 text-sky-400 border-slate-700'
            }`}
            title="Mở tab Quản lý Dữ liệu Ảo"
          >
            + Tạo dữ liệu ảo
          </button>
        )}
      </div>

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
