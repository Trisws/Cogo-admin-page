import React, { useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  MapPin,
  Sparkles,
  Sun,
  Moon,
  Map,
  Satellite,
  Search,
  Loader2
} from 'lucide-react';
import { CityPreset, ThemeMode } from '../../lib/types/simulation';
import { geocodeAddress } from '../../lib/utils/geo';

interface HeaderProps {
  currentCity: CityPreset;
  onSelectCity: (city: CityPreset) => void;
  isSimulating: boolean;
  onToggleSimulate: () => void;
  simSpeed: number;
  onChangeSpeed: (speed: number) => void;
  onReset: () => void;
  onSeedRandom: () => void;
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
  totalUsers,
  activeTrips,
  completedTrips,
  selectedTileLayer,
  onChangeTileLayer,
  themeMode,
  onToggleTheme,
}) => {
  const isLight = themeMode === 'light';

  const [searchQuery, setSearchQuery] = useState(currentCity.name);
  const [isSearching, setIsSearching] = useState(false);

  React.useEffect(() => {
    setSearchQuery(currentCity.name);
  }, [currentCity.id]);

  const handleSearchLocation = async () => {
    const query = searchQuery.trim();
    if (!query || isSearching) return;

    setIsSearching(true);
    try {
      const result = await geocodeAddress(query);
      if (result) {
        onSelectCity({
          id: `search-${Date.now()}`,
          name: result.displayName,
          country: 'Việt Nam',
          center: [result.lat, result.lng],
          zoom: 14,
          landmarks: [],
        });
        setSearchQuery(result.displayName);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const outlineBtn = isLight
    ? 'bg-white text-zinc-700 ring-1 ring-zinc-300 hover:bg-zinc-50'
    : 'bg-zinc-900 text-zinc-200 ring-1 ring-zinc-700 hover:bg-zinc-800';
  const primaryBtn = isLight
    ? 'bg-zinc-900 text-white hover:bg-zinc-700'
    : 'bg-zinc-100 text-zinc-900 hover:bg-white';

  return (
    <header className={`flex items-center justify-between gap-3 border-b px-4 py-2.5 z-20 ${
      isLight ? 'border-zinc-200 bg-white' : 'border-zinc-800 bg-zinc-950'
    }`}>
      {/* Brand + live stats + city picker */}
      <div className="flex items-center gap-4 min-w-0">
        <div className="min-w-0">
          <h1 className={`text-sm font-semibold leading-tight ${isLight ? 'text-zinc-900' : 'text-zinc-100'}`}>
            CoGo Mô phỏng
          </h1>
          <p className={`text-xs truncate ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
            {totalUsers} khách hàng · {activeTrips} chuyến đang chạy · {completedTrips} hoàn thành
          </p>
        </div>

        <div className={`hidden md:flex items-center gap-1 rounded-md px-2 text-xs ring-1 w-64 ${
          isLight ? 'ring-zinc-300 bg-white' : 'ring-zinc-700 bg-zinc-900'
        }`}>
          <MapPin className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearchLocation();
            }}
            onFocus={(e) => e.target.select()}
            placeholder="Tìm vị trí, địa chỉ..."
            className={`min-w-0 flex-1 bg-transparent text-xs font-medium focus:outline-none py-1.5 ${
              isLight ? 'text-zinc-800 placeholder:text-zinc-400' : 'text-zinc-200 placeholder:text-zinc-600'
            }`}
          />
          <button
            onClick={handleSearchLocation}
            disabled={isSearching || !searchQuery.trim()}
            className={`shrink-0 p-1 rounded cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
              isLight ? 'text-zinc-500 hover:text-zinc-900' : 'text-zinc-500 hover:text-zinc-200'
            }`}
            title="Tìm vị trí"
            aria-label="Tìm vị trí"
          >
            {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1.5 flex-wrap justify-end">
        <button
          onClick={onToggleTheme}
          className={`rounded-md p-1.5 transition-colors cursor-pointer ${outlineBtn}`}
          title={isLight ? 'Chuyển chế độ tối' : 'Chuyển chế độ sáng'}
          aria-label={isLight ? 'Chuyển chế độ tối' : 'Chuyển chế độ sáng'}
        >
          {isLight ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          onClick={onToggleSimulate}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
            isSimulating
              ? isLight ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-300' : 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30'
              : primaryBtn
          }`}
        >
          {isSimulating ? <><Pause className="w-3.5 h-3.5" /> Tạm dừng</> : <><Play className="w-3.5 h-3.5" /> Chạy</>}
        </button>

        <div className={`flex items-center rounded-md p-0.5 text-xs ring-1 ${isLight ? 'ring-zinc-300' : 'ring-zinc-700'}`}>
          <FastForward className={`w-3 h-3 ml-1 mr-0.5 ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`} />
          {[1, 2, 5, 10].map((spd) => (
            <button
              key={spd}
              onClick={() => onChangeSpeed(spd)}
              className={`px-1.5 py-1 rounded text-[11px] font-semibold cursor-pointer transition-colors ${
                simSpeed === spd
                  ? isLight ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-900'
                  : isLight ? 'text-zinc-500 hover:text-zinc-900' : 'text-zinc-500 hover:text-zinc-200'
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>

        <div className={`flex items-center rounded-md p-0.5 text-xs ring-1 ${isLight ? 'ring-zinc-300' : 'ring-zinc-700'}`}>
          <button
            onClick={() => onChangeTileLayer('osm')}
            className={`px-1.5 py-1 rounded flex items-center gap-1 text-[11px] font-semibold cursor-pointer transition-colors ${
              selectedTileLayer === 'osm'
                ? isLight ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-900'
                : isLight ? 'text-zinc-500 hover:text-zinc-900' : 'text-zinc-500 hover:text-zinc-200'
            }`}
            title="Bản đồ chuẩn (OSM)"
          >
            <Map className="w-3.5 h-3.5" /> Bản
          </button>
          <button
            onClick={() => onChangeTileLayer('satellite')}
            className={`px-1.5 py-1 rounded flex items-center gap-1 text-[11px] font-semibold cursor-pointer transition-colors ${
              selectedTileLayer === 'satellite'
                ? isLight ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-900'
                : isLight ? 'text-zinc-500 hover:text-zinc-900' : 'text-zinc-500 hover:text-zinc-200'
            }`}
            title="Vệ tinh (Esri)"
          >
            <Satellite className="w-3.5 h-3.5" /> Vệ
          </button>
        </div>

        <button
          onClick={onSeedRandom}
          className={`rounded-md p-1.5 transition-colors cursor-pointer ${outlineBtn}`}
          title="Tạo thêm xe & khách ngẫu nhiên"
          aria-label="Tạo thêm xe & khách ngẫu nhiên"
        >
          <Sparkles className="w-4 h-4" />
        </button>

        <button
          onClick={onReset}
          className={`rounded-md p-1.5 transition-colors cursor-pointer ${
            isLight ? 'bg-white text-rose-600 ring-1 ring-rose-300 hover:bg-rose-50' : 'bg-zinc-900 text-rose-400 ring-1 ring-rose-500/30 hover:bg-rose-500/10'
          }`}
          title="Đặt lại toàn bộ dữ liệu"
          aria-label="Đặt lại toàn bộ dữ liệu"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
