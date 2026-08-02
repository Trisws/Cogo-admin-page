import React, { useEffect, useRef, useState } from 'react';
import { User, MapClickMode, Location, ThemeMode } from '../../../lib/types/simulation';
import { UserPlus, Trash2, Database, AlertTriangle, Compass, MapPin } from 'lucide-react';

interface MockDataTabProps {
  users: User[];
  onBatchGenerateUsers: (count: number) => void;
  onClearAllData?: () => void;
  mapClickMode: MapClickMode;
  setMapClickMode: (mode: MapClickMode) => void;
  demoDataCenter: Location | null;
  themeMode?: ThemeMode;
}

export const MockDataTab: React.FC<MockDataTabProps> = ({
  users,
  onBatchGenerateUsers,
  onClearAllData,
  mapClickMode,
  setMapClickMode,
  demoDataCenter,
  themeMode,
}) => {
  const isLight = themeMode === 'light';
  const border = isLight ? 'border-zinc-200' : 'border-zinc-800';
  const dim = isLight ? 'text-zinc-500' : 'text-zinc-400';
  const cardBg = isLight ? 'bg-white' : 'bg-zinc-900';
  const outlineBtn = isLight
    ? 'bg-white text-zinc-700 ring-1 ring-zinc-300 hover:bg-zinc-50'
    : 'bg-zinc-900 text-zinc-200 ring-1 ring-zinc-700 hover:bg-zinc-800';

  // In-app confirm (no window.confirm — native dialogs can be silently
  // blocked in some browsers, leaving the button looking unresponsive).
  const [confirmingClear, setConfirmingClear] = useState(false);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
  }, []);

  return (
    <div className="flex flex-col gap-3">
      {/* Overview Stats */}
      <div className={`p-2.5 rounded-lg border flex items-center justify-between ${border} ${cardBg}`}>
        <div>
          <span className={`text-[10px] font-medium block ${dim}`}>Khách hàng ảo</span>
          <span className={`text-base font-semibold ${isLight ? 'text-zinc-900' : 'text-zinc-100'}`}>{users.length}</span>
        </div>
        <UserPlus className={`w-5 h-5 ${dim}`} />
      </div>

      {/* Batch Generation */}
      <div className={`p-3 rounded-lg border flex flex-col gap-2 ${border} ${cardBg}`}>
        <h4 className={`font-semibold text-xs flex items-center gap-1.5 ${isLight ? 'text-zinc-900' : 'text-zinc-100'}`}>
          <Database className="w-4 h-4" /> Sinh nhanh dữ liệu
        </h4>

        <button
          onClick={() => setMapClickMode(mapClickMode === 'pick_demo_center' ? 'none' : 'pick_demo_center')}
          className={`text-xs px-2.5 py-1.5 rounded-md flex items-center justify-center gap-1.5 cursor-pointer ${
            mapClickMode === 'pick_demo_center' ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300' : outlineBtn
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          {demoDataCenter ? 'Đã ghim vùng — bấm để chọn lại' : 'Ghim vùng trung tâm dữ liệu ảo (bán kính 5km)'}
        </button>
        {demoDataCenter && (
          <div className={`text-[11px] flex items-center gap-1.5 ${dim}`}>
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{demoDataCenter.address || `${demoDataCenter.lat}, ${demoDataCenter.lng}`}</span>
          </div>
        )}

        <button
          onClick={() => onBatchGenerateUsers(5)}
          className={`py-2 px-2.5 rounded-md font-medium text-xs flex items-center justify-center gap-1.5 cursor-pointer ${outlineBtn}`}
        >
          <UserPlus className="w-3.5 h-3.5" /> +5 khách
        </button>
      </div>

      {/* Reset / Clear */}
      {onClearAllData && (
        <div className={`p-3 rounded-lg border flex flex-col gap-2 ${border} ${cardBg}`}>
          {confirmingClear ? (
            <div className="flex flex-col gap-1.5">
              <div className={`flex items-center gap-1.5 text-[11px] font-medium ${isLight ? 'text-rose-700' : 'text-rose-400'}`}>
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Xóa sạch toàn bộ dữ liệu, không thể hoàn tác?
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
                    setConfirmingClear(false);
                  }}
                  className={`py-1.5 px-3 rounded-md font-medium text-xs cursor-pointer ${outlineBtn}`}
                >
                  Hủy
                </button>
                <button
                  onClick={() => {
                    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
                    setConfirmingClear(false);
                    onClearAllData();
                  }}
                  className="py-1.5 px-3 rounded-md font-medium text-xs cursor-pointer bg-rose-600 text-white hover:bg-rose-500"
                >
                  Xác nhận xóa
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                setConfirmingClear(true);
                confirmTimerRef.current = setTimeout(() => setConfirmingClear(false), 5000);
              }}
              className="py-1.5 px-3 rounded-md font-medium text-xs flex items-center justify-center gap-1.5 cursor-pointer bg-rose-600 text-white hover:bg-rose-500"
              title="Xóa toàn bộ dữ liệu mô phỏng và bắt đầu lại từ trống"
            >
              <Trash2 className="w-3.5 h-3.5" /> Xóa toàn bộ dữ liệu mô phỏng
            </button>
          )}
        </div>
      )}
    </div>
  );
};
