import React from 'react';
import { SimulationLog, ThemeMode } from '../../../lib/types/simulation';
import { Trash2, Info, CheckCircle2, AlertTriangle, XCircle, Car, TrendingUp } from 'lucide-react';

interface LogsTabProps {
  logs: SimulationLog[];
  onClearLogs: () => void;
  totalTripsCount: number;
  completedTripsCount: number;
  activeDriversCount: number;
  activeUsersCount: number;
  themeMode?: ThemeMode;
}

export const LogsTab: React.FC<LogsTabProps> = ({
  logs,
  onClearLogs,
  totalTripsCount,
  completedTripsCount,
  activeDriversCount,
  activeUsersCount,
  themeMode,
}) => {
  const isLight = themeMode === 'light';
  const border = isLight ? 'border-zinc-200' : 'border-zinc-800';
  const dim = isLight ? 'text-zinc-500' : 'text-zinc-400';
  const cardBg = isLight ? 'bg-white' : 'bg-zinc-900';

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <div className={`border rounded-lg p-2.5 ${border} ${cardBg}`}>
          <div className={`text-[10px] font-medium flex items-center gap-1 ${dim}`}>
            <TrendingUp className="w-3 h-3" /> Tỷ lệ hoàn thành
          </div>
          <div className="text-lg font-semibold mt-0.5 text-emerald-600">
            {totalTripsCount > 0 ? Math.round((completedTripsCount / totalTripsCount) * 100) : 100}%
          </div>
          <div className={`text-[10px] ${dim}`}>{completedTripsCount}/{totalTripsCount} chuyến</div>
        </div>
        <div className={`border rounded-lg p-2.5 ${border} ${cardBg}`}>
          <div className={`text-[10px] font-medium flex items-center gap-1 ${dim}`}>
            <Car className="w-3 h-3" /> Mật độ hệ thống
          </div>
          <div className="text-lg font-semibold mt-0.5 text-sky-600">{activeDriversCount + activeUsersCount}</div>
          <div className={`text-[10px] ${dim}`}>{activeDriversCount} xe • {activeUsersCount} khách</div>
        </div>
      </div>

      <div className="flex items-center justify-end">
        <button
          onClick={onClearLogs}
          className={`p-1 flex items-center gap-1 text-[10px] cursor-pointer ${dim} hover:text-rose-500`}
        >
          <Trash2 className="w-3.5 h-3.5" /> Xóa nhật ký
        </button>
      </div>

      <div className="space-y-1.5">
        {logs.length === 0 ? (
          <div className={`text-center py-6 text-xs ${dim}`}>Chưa có sự kiện nào.</div>
        ) : (
          logs.map((log) => {
            let icon = <Info className="w-3.5 h-3.5 text-sky-500 shrink-0 mt-0.5" />;
            if (log.level === 'success') icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />;
            else if (log.level === 'warning') icon = <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />;
            else if (log.level === 'error') icon = <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />;

            return (
              <div key={log.id} className={`p-2 rounded-md border ${border} ${cardBg} flex items-start gap-2 leading-tight text-[11px]`}>
                {icon}
                <div className={`flex-1 min-w-0 ${isLight ? 'text-zinc-800' : 'text-zinc-200'}`}>
                  <span className={`text-[10px] mr-1.5 font-medium ${dim}`}>[{log.time}]</span>
                  <span>{log.message}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
