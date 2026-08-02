import React from 'react';
import { Driver, User, ThemeMode } from '../../../lib/types/simulation';
import { Sparkles, Car, UserPlus, RotateCcw, Trash2, Database } from 'lucide-react';

interface MockDataTabProps {
  drivers: Driver[];
  users: User[];
  onBatchGenerateUsers: (count: number) => void;
  onBatchGenerateDrivers: (count: number) => void;
  onResetSimulation: () => void;
  onClearAllData?: () => void;
  onSeedRandom: () => void;
  themeMode?: ThemeMode;
}

export const MockDataTab: React.FC<MockDataTabProps> = ({
  drivers,
  users,
  onBatchGenerateUsers,
  onBatchGenerateDrivers,
  onResetSimulation,
  onClearAllData,
  onSeedRandom,
  themeMode,
}) => {
  const isLight = themeMode === 'light';
  const border = isLight ? 'border-zinc-200' : 'border-zinc-800';
  const dim = isLight ? 'text-zinc-500' : 'text-zinc-400';
  const cardBg = isLight ? 'bg-white' : 'bg-zinc-900';
  const outlineBtn = isLight
    ? 'bg-white text-zinc-700 ring-1 ring-zinc-300 hover:bg-zinc-50'
    : 'bg-zinc-900 text-zinc-200 ring-1 ring-zinc-700 hover:bg-zinc-800';

  return (
    <div className="flex flex-col gap-3">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className={`p-2.5 rounded-lg border flex items-center justify-between ${border} ${cardBg}`}>
          <div>
            <span className={`text-[10px] font-medium block ${dim}`}>Tài xế ảo</span>
            <span className={`text-base font-semibold ${isLight ? 'text-zinc-900' : 'text-zinc-100'}`}>{drivers.length}</span>
          </div>
          <Car className={`w-5 h-5 ${dim}`} />
        </div>
        <div className={`p-2.5 rounded-lg border flex items-center justify-between ${border} ${cardBg}`}>
          <div>
            <span className={`text-[10px] font-medium block ${dim}`}>Khách hàng ảo</span>
            <span className={`text-base font-semibold ${isLight ? 'text-zinc-900' : 'text-zinc-100'}`}>{users.length}</span>
          </div>
          <UserPlus className={`w-5 h-5 ${dim}`} />
        </div>
      </div>

      {/* Batch Generation */}
      <div className={`p-3 rounded-lg border flex flex-col gap-2 ${border} ${cardBg}`}>
        <h4 className={`font-semibold text-xs flex items-center gap-1.5 ${isLight ? 'text-zinc-900' : 'text-zinc-100'}`}>
          <Database className="w-4 h-4" /> Sinh nhanh dữ liệu
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onBatchGenerateDrivers(5)}
            className={`py-2 px-2.5 rounded-md font-medium text-xs flex items-center justify-center gap-1.5 cursor-pointer ${outlineBtn}`}
          >
            <Car className="w-3.5 h-3.5" /> +5 tài xế
          </button>
          <button
            onClick={() => onBatchGenerateUsers(5)}
            className={`py-2 px-2.5 rounded-md font-medium text-xs flex items-center justify-center gap-1.5 cursor-pointer ${outlineBtn}`}
          >
            <UserPlus className="w-3.5 h-3.5" /> +5 khách
          </button>
        </div>
        <button
          onClick={onSeedRandom}
          className={`py-1.5 px-3 rounded-md font-medium text-xs flex items-center justify-center gap-1.5 cursor-pointer ${outlineBtn}`}
        >
          <Sparkles className="w-3.5 h-3.5" /> Phân bổ thêm 4 tài xế &amp; 3 khách
        </button>
      </div>

      {/* Reset / Clear */}
      <div className={`p-3 rounded-lg border flex flex-col gap-2 ${border} ${cardBg}`}>
        <button
          onClick={onResetSimulation}
          className={`py-1.5 px-3 rounded-md font-medium text-xs flex items-center justify-center gap-1.5 cursor-pointer ${outlineBtn}`}
          title="Tải lại tài xế & khách hàng thật từ database, bỏ qua mọi dữ liệu ảo đã thêm"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Nạp lại từ CSDL (dữ liệu thật)
        </button>
        {onClearAllData && (
          <button
            onClick={() => {
              if (window.confirm('Xóa sạch dữ liệu đang chạy trên trình duyệt (tài xế, khách hàng, chuyến đi)? Database sẽ không bị ảnh hưởng. Không thể hoàn tác.')) {
                onClearAllData();
              }
            }}
            className="py-1.5 px-3 rounded-md font-medium text-xs flex items-center justify-center gap-1.5 cursor-pointer bg-rose-600 text-white hover:bg-rose-500"
            title="Chỉ xóa dữ liệu đang chạy trên trình duyệt, không ảnh hưởng database"
          >
            <Trash2 className="w-3.5 h-3.5" /> Xóa dữ liệu đang chạy (chỉ trình duyệt)
          </button>
        )}
      </div>
    </div>
  );
};
