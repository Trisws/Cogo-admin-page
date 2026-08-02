import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Users, Car, Zap, Sparkles, Activity } from 'lucide-react';
import { UsersTab } from './UsersTab';
import { DriversTab } from './DriversTab';
import { TripsTab } from './TripsTab';
import { MockDataTab } from './MockDataTab';
import { LogsTab } from './LogsTab';
import { Section } from './Section';
import { CommandBar } from './CommandBar';
import { Driver, User, Trip, MapClickMode, DriverStatus, SimulationLog, ThemeMode, CommandSpec } from '../../../lib/types/simulation';

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
  onRunCommand: (raw: string) => string;
  commands: CommandSpec[];
}

export const Sidebar: React.FC<SidebarProps> = (props) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isLight = props.themeMode === 'light';

  const activeTripsCount = props.trips.filter((t) => t.status !== 'completed' && t.status !== 'cancelled').length;

  return (
    <aside
      className={`relative z-10 border-l flex flex-col ${
        isLight ? 'bg-white border-zinc-200 text-zinc-800' : 'bg-zinc-950 border-zinc-800 text-zinc-100'
      } ${isCollapsed ? 'w-0' : 'w-full md:w-96 lg:w-[420px]'}`}
    >
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`absolute -left-3 top-4 z-30 rounded-full p-1 ring-1 cursor-pointer ${
          isLight ? 'bg-white hover:bg-zinc-50 text-zinc-700 ring-zinc-300' : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 ring-zinc-700'
        }`}
        title={isCollapsed ? 'Mở rộng bảng điều khiển' : 'Thu nhỏ bảng điều khiển'}
        aria-label={isCollapsed ? 'Mở rộng bảng điều khiển' : 'Thu nhỏ bảng điều khiển'}
      >
        {isCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      {!isCollapsed && (
        <>
          <div className="flex-1 overflow-y-auto min-h-0">
            <Section title="Tài xế" icon={<Car className="w-4 h-4" />} count={props.drivers.length} defaultOpen themeMode={props.themeMode}>
              <DriversTab
                drivers={props.drivers}
                selectedDriverId={props.selectedDriverId}
                onSelectDriver={props.onSelectDriver}
                onDeleteDriver={props.onDeleteDriver}
                onToggleDriverStatus={props.onToggleDriverStatus}
                onAddDriver={props.onAddDriver}
                onBatchGenerateDrivers={props.onBatchGenerateDrivers}
                mapClickMode={props.mapClickMode}
                setMapClickMode={props.setMapClickMode}
                mapCenterLocation={props.mapCenterLocation}
                themeMode={props.themeMode}
              />
            </Section>

            <Section title="Khách hàng" icon={<Users className="w-4 h-4" />} count={props.users.length} defaultOpen themeMode={props.themeMode}>
              <UsersTab
                users={props.users}
                selectedUserId={props.selectedUserId}
                onSelectUser={props.onSelectUser}
                onDeleteUser={props.onDeleteUser}
                onRequestRide={props.onRequestRide}
                onAddUser={props.onAddUser}
                onBatchGenerateUsers={props.onBatchGenerateUsers}
                mapClickMode={props.mapClickMode}
                setMapClickMode={props.setMapClickMode}
                mapCenterLocation={props.mapCenterLocation}
                themeMode={props.themeMode}
              />
            </Section>

            <Section title="Điều phối chuyến đi" icon={<Zap className="w-4 h-4" />} count={activeTripsCount} defaultOpen themeMode={props.themeMode}>
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
            </Section>

            <Section title="Dữ liệu ảo" icon={<Sparkles className="w-4 h-4" />} defaultOpen={false} themeMode={props.themeMode}>
              <MockDataTab
                drivers={props.drivers}
                users={props.users}
                onBatchGenerateUsers={props.onBatchGenerateUsers}
                onBatchGenerateDrivers={props.onBatchGenerateDrivers}
                onResetSimulation={props.onResetSimulation}
                onClearAllData={props.onClearAllData}
                onSeedRandom={props.onSeedRandom}
                themeMode={props.themeMode}
              />
            </Section>

            <Section title="Nhật ký" icon={<Activity className="w-4 h-4" />} count={props.logs.length} defaultOpen={false} themeMode={props.themeMode}>
              <LogsTab
                logs={props.logs}
                onClearLogs={props.onClearLogs}
                totalTripsCount={props.trips.length}
                completedTripsCount={props.trips.filter((t) => t.status === 'completed').length}
                activeDriversCount={props.drivers.filter((d) => d.status === 'available' || d.status === 'busy').length}
                activeUsersCount={props.users.length}
                themeMode={props.themeMode}
              />
            </Section>
          </div>

          <CommandBar onRunCommand={props.onRunCommand} themeMode={props.themeMode} commands={props.commands} />
        </>
      )}
    </aside>
  );
};
