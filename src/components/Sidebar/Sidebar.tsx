import React, { useState } from 'react';
import { 
  Users, 
  Car, 
  Zap, 
  Activity, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  Sliders
} from 'lucide-react';
import { UsersTab } from './UsersTab';
import { DriversTab } from './DriversTab';
import { TripsTab } from './TripsTab';
import { MockDataTab } from './MockDataTab';
import { LogsTab } from './LogsTab';
import { Driver, User, Trip, MapClickMode, DriverStatus, SimulationLog, ThemeMode } from '../../types/simulation';

interface SidebarProps {
  drivers: Driver[];
  users: User[];
  trips: Trip[];
  logs: SimulationLog[];
  selectedDriverId: string | null;
  selectedUserId: string | null;
  selectedTripId: string | null;
  onSelectDriver: (driver: Driver | null) => void;
  onSelectUser: (user: User | null) => void;
  onSelectTrip: (trip: Trip | null) => void;
  onAddUser: (user: Omit<User, 'id' | 'status'>) => void;
  onDeleteUser: (userId: string) => void;
  onRequestRide: (user: User) => void;
  onBatchGenerateUsers: (count: number) => void;
  onAddDriver: (driver: Omit<Driver, 'id' | 'status' | 'heading' | 'totalTrips'>) => void;
  onDeleteDriver: (driverId: string) => void;
  onToggleDriverStatus: (driverId: string, status: DriverStatus) => void;
  onBatchGenerateDrivers: (count: number) => void;
  onResetSimulation: () => void;
  onClearAllData?: () => void;
  onSeedRandom: () => void;
  onDispatchTrip: (userId: string, driverId: string) => void;
  onCancelTrip: (tripId: string) => void;
  onForceFinishTrip: (tripId: string) => void;
  autoDispatch: boolean;
  onToggleAutoDispatch: () => void;
  onClearLogs: () => void;
  mapClickMode: MapClickMode;
  setMapClickMode: (mode: MapClickMode) => void;
  mapCenterLocation: { lat: number; lng: number };
  themeMode?: ThemeMode;
}

type TabType = 'users' | 'drivers' | 'trips' | 'mockdata' | 'logs';

export const Sidebar: React.FC<SidebarProps> = (props) => {
  const [activeTab, setActiveTab] = useState<TabType>('drivers');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const activeTripsCount = props.trips.filter((t) => t.status !== 'completed' && t.status !== 'cancelled').length;
  const requestingUsersCount = props.users.filter((u) => u.status === 'requesting').length;
  const isLight = props.themeMode === 'light';

  return (
    <aside
      className={`relative z-10 border-r flex flex-col transition-all duration-300 ${
        isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-100'
      } ${
        isCollapsed ? 'w-14' : 'w-full md:w-96 lg:w-[420px]'
      }`}
    >
      {/* Collapse / Expand Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`absolute -right-3 top-4 z-30 border rounded-full p-1 shadow-md transition-transform ${
          isLight 
            ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200' 
            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
        }`}
        title={isCollapsed ? 'Mở rộng bảng điều khiển' : 'Thu nhỏ bảng điều khiển'}
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Navigation Tabs Header */}
      <div className={`flex items-center border-b p-1.5 gap-1 overflow-x-auto ${
        isLight ? 'bg-slate-100/90 border-slate-200' : 'bg-slate-950 border-slate-800'
      }`}>
        <button
          onClick={() => {
            setActiveTab('users');
            if (isCollapsed) setIsCollapsed(false);
          }}
          className={`flex-1 min-w-[70px] py-2 px-1 rounded-xl text-xs font-bold flex flex-col md:flex-row items-center justify-center gap-1 transition-all ${
            activeTab === 'users'
              ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
              : isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
          title="Quan sát Khách hàng"
        >
          <div className="relative">
            <Users className="w-4 h-4" />
            {requestingUsersCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping"></span>
            )}
          </div>
          {!isCollapsed && (
            <span className="truncate">
              Khách ({props.users.length})
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveTab('drivers');
            if (isCollapsed) setIsCollapsed(false);
          }}
          className={`flex-1 min-w-[70px] py-2 px-1 rounded-xl text-xs font-bold flex flex-col md:flex-row items-center justify-center gap-1 transition-all ${
            activeTab === 'drivers'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
              : isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
          title="Quan sát Tài xế"
        >
          <Car className="w-4 h-4" />
          {!isCollapsed && (
            <span className="truncate">
              Tài Xế ({props.drivers.length})
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveTab('trips');
            if (isCollapsed) setIsCollapsed(false);
          }}
          className={`flex-1 min-w-[70px] py-2 px-1 rounded-xl text-xs font-bold flex flex-col md:flex-row items-center justify-center gap-1 transition-all ${
            activeTab === 'trips'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
              : isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
          title="Điều phối Chuyến đi"
        >
          <div className="relative">
            <Zap className="w-4 h-4" />
            {activeTripsCount > 0 && (
              <span className="absolute -top-1 -right-1.5 px-1 bg-amber-400 text-slate-950 text-[9px] font-extrabold rounded-full">
                {activeTripsCount}
              </span>
            )}
          </div>
          {!isCollapsed && <span className="truncate">Điều Phối</span>}
        </button>

        <button
          onClick={() => {
            setActiveTab('mockdata');
            if (isCollapsed) setIsCollapsed(false);
          }}
          className={`flex-1 min-w-[70px] py-2 px-1 rounded-xl text-xs font-bold flex flex-col md:flex-row items-center justify-center gap-1 transition-all ${
            activeTab === 'mockdata'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
              : isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
          title="Thao tác Tạo / Xóa Dữ liệu Ảo"
        >
          <Sparkles className="w-4 h-4 text-purple-400" />
          {!isCollapsed && <span className="truncate">Dữ Liệu Ảo</span>}
        </button>

        <button
          onClick={() => {
            setActiveTab('logs');
            if (isCollapsed) setIsCollapsed(false);
          }}
          className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center transition-all ${
            activeTab === 'logs'
              ? isLight ? 'bg-white text-cyan-600 border border-slate-300 shadow-sm' : 'bg-slate-800 text-cyan-400 border border-slate-700'
              : isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
          title="Nhật ký sự kiện"
        >
          <Activity className="w-4 h-4" />
        </button>
      </div>

      {/* Tab Content Container */}
      {!isCollapsed && (
        <div className={`flex-1 overflow-hidden ${isLight ? 'bg-white' : 'bg-slate-900/90'}`}>
          {activeTab === 'users' && (
            <UsersTab
              users={props.users}
              selectedUserId={props.selectedUserId}
              onSelectUser={props.onSelectUser}
              onDeleteUser={props.onDeleteUser}
              onRequestRide={props.onRequestRide}
              onNavigateToMockTab={() => setActiveTab('mockdata')}
              themeMode={props.themeMode}
            />
          )}

          {activeTab === 'drivers' && (
            <DriversTab
              drivers={props.drivers}
              selectedDriverId={props.selectedDriverId}
              onSelectDriver={props.onSelectDriver}
              onDeleteDriver={props.onDeleteDriver}
              onToggleDriverStatus={props.onToggleDriverStatus}
              onNavigateToMockTab={() => setActiveTab('mockdata')}
              themeMode={props.themeMode}
            />
          )}

          {activeTab === 'trips' && (
            <TripsTab
              trips={props.trips}
              users={props.users}
              drivers={props.drivers}
              selectedTripId={props.selectedTripId}
              onSelectTrip={props.onSelectTrip}
              onDispatchTrip={props.onDispatchTrip}
              onCancelTrip={props.onCancelTrip}
              onForceFinishTrip={props.onForceFinishTrip}
              autoDispatch={props.autoDispatch}
              onToggleAutoDispatch={props.onToggleAutoDispatch}
              themeMode={props.themeMode}
            />
          )}

          {activeTab === 'mockdata' && (
            <MockDataTab
              drivers={props.drivers}
              users={props.users}
              onAddUser={props.onAddUser}
              onDeleteUser={props.onDeleteUser}
              onBatchGenerateUsers={props.onBatchGenerateUsers}
              onAddDriver={props.onAddDriver}
              onDeleteDriver={props.onDeleteDriver}
              onBatchGenerateDrivers={props.onBatchGenerateDrivers}
              onResetSimulation={props.onResetSimulation}
              onClearAllData={props.onClearAllData}
              onSeedRandom={props.onSeedRandom}
              mapClickMode={props.mapClickMode}
              setMapClickMode={props.setMapClickMode}
              mapCenterLocation={props.mapCenterLocation}
              themeMode={props.themeMode}
            />
          )}

          {activeTab === 'logs' && (
            <LogsTab
              logs={props.logs}
              onClearLogs={props.onClearLogs}
              totalTripsCount={props.trips.length}
              completedTripsCount={props.trips.filter((t) => t.status === 'completed').length}
              activeDriversCount={props.drivers.filter((d) => d.status === 'available' || d.status === 'busy').length}
              activeUsersCount={props.users.length}
              themeMode={props.themeMode}
            />
          )}
        </div>
      )}
    </aside>
  );
};
