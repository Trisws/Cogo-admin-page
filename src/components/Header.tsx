import React from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  FastForward, 
  MapPin, 
  Car, 
  Users, 
  Navigation, 
  Zap, 
  Settings2,
  Sparkles,
  Layers,
  Sun,
  Moon
} from 'lucide-react';
import { CityPreset, ThemeMode } from '../types/simulation';
import { CITY_PRESETS } from '../utils/presets';

interface HeaderProps {
  currentCity: CityPreset;
  onSelectCity: (city: CityPreset) => void;
  isSimulating: boolean;
  onToggleSimulate: () => void;
  simSpeed: number;
  onChangeSpeed: (speed: number) => void;
  onReset: () => void;
  onSeedRandom: () => void;
  autoDispatch: boolean;
  onToggleAutoDispatch: () => void;
  totalDrivers: number;
  availableDrivers: number;
  totalUsers: number;
  activeTrips: number;
  completedTrips: number;
  selectedTileLayer: string;
  onChangeTileLayer: (layer: any) => void;
  themeMode: ThemeMode;
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentCity,
  onSelectCity,
  isSimulating,
  onToggleSimulate,
  simSpeed,
  onChangeSpeed,
  onReset,
  onSeedRandom,
  autoDispatch,
  onToggleAutoDispatch,
  totalDrivers,
  availableDrivers,
  totalUsers,
  activeTrips,
  completedTrips,
  selectedTileLayer,
  onChangeTileLayer,
  themeMode,
  onToggleTheme,
}) => {
  const isLight = themeMode === 'light';

  return (
    <header className={`px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-sm z-20 sticky top-0 transition-colors ${
      isLight 
        ? 'bg-white/95 border-b border-slate-200 text-slate-800 shadow-slate-200/50' 
        : 'bg-slate-900 border-b border-slate-800 text-slate-100 shadow-slate-950/50'
    }`}>
      {/* Brand & City Picker */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 p-0.5 shadow-md shadow-emerald-500/20">
            <div className={`w-full h-full rounded-[10px] flex items-center justify-center ${isLight ? 'bg-white' : 'bg-slate-950'}`}>
              <Navigation className="w-5 h-5 text-emerald-500 transform rotate-45" />
            </div>
          </div>
          <div>
            <h1 className={`text-base font-bold bg-gradient-to-r ${isLight ? 'from-emerald-600 via-teal-600 to-cyan-700' : 'from-emerald-400 via-teal-300 to-cyan-400'} bg-clip-text text-transparent leading-tight flex items-center gap-1.5`}>
              RideSim Leaflet
              <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.2 rounded font-semibold border ${
                isLight 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              }`}>
                v2.0 Realtime
              </span>
            </h1>
            <p className={`text-xs hidden sm:block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Giả lập vị trí & điều phối chuyến đi thời gian thực
            </p>
          </div>
        </div>

        {/* City Switcher */}
        <div className={`hidden md:flex items-center rounded-lg p-1 text-xs border ${
          isLight ? 'bg-slate-100/80 border-slate-200' : 'bg-slate-800/80 border-slate-700/60'
        }`}>
          <MapPin className={`w-3.5 h-3.5 ml-1.5 mr-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`} />
          <select
            value={currentCity.id}
            onChange={(e) => {
              const found = CITY_PRESETS.find((c) => c.id === e.target.value);
              if (found) onSelectCity(found);
            }}
            className={`bg-transparent text-xs font-medium focus:outline-none cursor-pointer pr-2 ${
              isLight ? 'text-slate-800' : 'text-slate-200'
            }`}
          >
            {CITY_PRESETS.map((city) => (
              <option key={city.id} value={city.id} className={isLight ? 'bg-white text-slate-800' : 'bg-slate-900 text-slate-200'}>
                {city.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Summary Chips */}
      <div className="flex items-center gap-2 overflow-x-auto py-1 max-w-full">
        <div className={`rounded-lg px-2.5 py-1 flex items-center gap-2 text-xs border ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/90 border-slate-700/80'
        }`}>
          <Car className="w-4 h-4 text-emerald-500" />
          <div>
            <span className={`text-[10px] block leading-none ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Tài xế</span>
            <span className={`font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              <span className="text-emerald-500 font-extrabold">{availableDrivers}</span>/{totalDrivers} rảnh
            </span>
          </div>
        </div>

        <div className={`rounded-lg px-2.5 py-1 flex items-center gap-2 text-xs border ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/90 border-slate-700/80'
        }`}>
          <Users className="w-4 h-4 text-sky-500" />
          <div>
            <span className={`text-[10px] block leading-none ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Người dùng</span>
            <span className={`font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{totalUsers}</span>
          </div>
        </div>

        <div className={`rounded-lg px-2.5 py-1 flex items-center gap-2 text-xs border ${
          isLight ? 'bg-amber-50/80 border-amber-200' : 'bg-slate-800/90 border-slate-700/80'
        }`}>
          <Zap className="w-4 h-4 text-amber-500 animate-pulse" />
          <div>
            <span className={`text-[10px] block leading-none ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Đang chạy</span>
            <span className="font-bold text-amber-600">{activeTrips}</span>
          </div>
        </div>

        <div className={`rounded-lg px-2.5 py-1 flex items-center gap-2 text-xs hidden lg:flex border ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/90 border-slate-700/80'
        }`}>
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <div>
            <span className={`text-[10px] block leading-none ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Hoàn thành</span>
            <span className={`font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{completedTrips}</span>
          </div>
        </div>
      </div>

      {/* Simulation Engine & Quick Actions Controls */}
      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
        {/* Theme Toggle Button */}
        <button
          onClick={onToggleTheme}
          className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
            isLight
              ? 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
              : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
          }`}
          title={isLight ? 'Đang ở Chế độ Sáng - Nhấp để chuyển Chế độ Tối' : 'Đang ở Chế độ Tối - Nhấp để chuyển Chế độ Sáng'}
        >
          {isLight ? (
            <>
              <Sun className="w-4 h-4 text-amber-500 fill-amber-400" />
              <span>Màu Sáng</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-sky-400 fill-sky-400" />
              <span>Màu Tối</span>
            </>
          )}
        </button>

        {/* Auto Dispatch Toggle */}
        <button
          onClick={onToggleAutoDispatch}
          className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all ${
            autoDispatch
              ? isLight
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-sm'
                : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-sm shadow-emerald-500/20'
              : isLight
                ? 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-800'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
          title="Tự động tìm tài xế gần nhất khi người dùng đặt chuyến"
        >
          <Sparkles className={`w-3.5 h-3.5 ${autoDispatch ? 'text-emerald-500' : ''}`} />
          <span className="hidden sm:inline">Tự ghép chuyến</span>
          <span className={`text-[10px] font-bold px-1 rounded ${isLight ? 'bg-slate-200/80 text-slate-700' : 'bg-slate-950/40'}`}>
            {autoDispatch ? 'BẬT' : 'TẮT'}
          </span>
        </button>

        {/* Play / Pause simulation */}
        <button
          onClick={onToggleSimulate}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ${
            isSimulating
              ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-amber-500/20'
              : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-emerald-500/20'
          }`}
        >
          {isSimulating ? (
            <>
              <Pause className="w-3.5 h-3.5 fill-current" /> Tạm dừng
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" /> Chạy giả lập
            </>
          )}
        </button>

        {/* Speed Selector */}
        <div className={`flex items-center border rounded-lg p-0.5 text-xs ${
          isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-800 border-slate-700'
        }`}>
          <FastForward className={`w-3 h-3 ml-1.5 mr-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`} />
          {[1, 2, 5, 10].map((spd) => (
            <button
              key={spd}
              onClick={() => onChangeSpeed(spd)}
              className={`px-1.5 py-0.5 rounded text-[11px] font-bold transition-all ${
                simSpeed === spd
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : isLight
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>

        {/* Seed & Reset buttons */}
        <button
          onClick={onSeedRandom}
          className={`p-1.5 rounded-lg border transition-colors ${
            isLight
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
          }`}
          title="Tạo thêm xe & khách ngẫu nhiên quanh bản đồ"
        >
          <Settings2 className="w-4 h-4 text-cyan-500" />
        </button>

        <button
          onClick={onReset}
          className={`p-1.5 rounded-lg border transition-colors ${
            isLight
              ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
              : 'bg-slate-800 hover:bg-rose-950/80 text-rose-300 hover:text-rose-200 border-slate-700 hover:border-rose-800'
          }`}
          title="Đặt lại toàn bộ dữ liệu giả lập"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
