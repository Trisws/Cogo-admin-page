import React from 'react';
import { SimulationLog, ThemeMode } from '../../../lib/types/simulation';
import { 
  Activity, 
  Trash2, 
  Info, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  Car,
  User,
  Zap,
  TrendingUp
} from 'lucide-react';

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

  return (
    <div className={`flex flex-col h-full gap-3 p-3 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
      {/* Quick Analytics Summary Panel */}
      <div className="grid grid-cols-2 gap-2">
        <div className={`border rounded-xl p-2.5 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}>
          <div className={`text-[10px] font-semibold flex items-center gap-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            <TrendingUp className="w-3 h-3 text-emerald-500" /> Tỷ lệ hoàn thành
          </div>
          <div className="text-lg font-extrabold text-emerald-600 mt-0.5">
            {totalTripsCount > 0 ? Math.round((completedTripsCount / totalTripsCount) * 100) : 100}%
          </div>
          <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>{completedTripsCount}/{totalTripsCount} chuyến thành công</div>
        </div>

        <div className={`border rounded-xl p-2.5 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}>
          <div className={`text-[10px] font-semibold flex items-center gap-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            <Car className="w-3 h-3 text-sky-500" /> Mật độ hệ thống
          </div>
          <div className="text-lg font-extrabold text-sky-600 mt-0.5">
            {activeDriversCount + activeUsersCount}
          </div>
          <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>{activeDriversCount} xe • {activeUsersCount} khách</div>
        </div>
      </div>

      {/* Real-time Logs Feed */}
      <div className={`flex items-center justify-between border-b pb-2 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
        <h3 className={`font-bold text-xs flex items-center gap-1.5 ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
          <Activity className="w-4 h-4 text-emerald-500" /> Nhật Ký Sự Kiện Realtime
        </h3>

        <button
          onClick={onClearLogs}
          className={`p-1 rounded flex items-center gap-1 text-[10px] cursor-pointer ${
            isLight ? 'text-slate-500 hover:text-rose-600 hover:bg-slate-100' : 'text-slate-500 hover:text-rose-400 hover:bg-slate-800'
          }`}
          title="Xóa lịch sử nhật ký"
        >
          <Trash2 className="w-3.5 h-3.5" /> Xóa
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 font-mono text-[11px]">
        {logs.length === 0 ? (
          <div className={`text-center py-8 text-xs ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
            Chưa có sự kiện nào ghi nhận. Hãy chạy giả lập!
          </div>
        ) : (
          logs.map((log) => {
            let icon = <Info className="w-3.5 h-3.5 text-sky-500 shrink-0 mt-0.5" />;
            let borderClass = isLight ? 'border-slate-200 bg-slate-50 text-slate-800' : 'border-slate-800 bg-slate-950/80 text-slate-200';

            if (log.level === 'success') {
              icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />;
              borderClass = isLight ? 'border-emerald-200 bg-emerald-50/60 text-slate-800' : 'border-emerald-900/50 bg-emerald-950/20 text-slate-200';
            } else if (log.level === 'warning') {
              icon = <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />;
              borderClass = isLight ? 'border-amber-200 bg-amber-50/60 text-slate-800' : 'border-amber-900/50 bg-amber-950/20 text-slate-200';
            } else if (log.level === 'error') {
              icon = <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />;
              borderClass = isLight ? 'border-rose-200 bg-rose-50/60 text-slate-800' : 'border-rose-900/50 bg-rose-950/20 text-slate-200';
            }

            return (
              <div
                key={log.id}
                className={`p-2 rounded-lg border ${borderClass} flex items-start gap-2 leading-tight`}
              >
                {icon}
                <div className="flex-1 min-w-0">
                  <span className={`text-[10px] mr-1.5 font-bold ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>[{log.time}]</span>
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
