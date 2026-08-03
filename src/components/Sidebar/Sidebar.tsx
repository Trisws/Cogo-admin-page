import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Users, Zap, Sparkles, Activity } from 'lucide-react';
import { UsersTab } from './UsersTab';
import { TripsTab } from './TripsTab';
import { MockDataTab } from './MockDataTab';
import { LogsTab } from './LogsTab';
import { Section } from './Section';
import { CommandBar } from './CommandBar';
import { User, Trip, MapClickMode, SimulationLog, ThemeMode, CommandSpec, VehicleType, Location } from '../../../lib/types/simulation';

interface SidebarProps {
  users: User[];
  trips: Trip[];
  logs: SimulationLog[];
  selectedUserId: string | null;
  selectedTripId: string | null;
  onSelectUser: (user: User | null) => void;
  onSelectTrip: (trip: Trip | null) => void;
  onAddUser: (user: { name: string; phone: string; location: Location }) => void;
  onDeleteUser: (userId: string) => void;
  onBatchGenerateUsers: (count: number) => void;
  onStartCreateTrip: (userId: string, vehicleType: VehicleType) => void;
  onFindTrip: (user: User) => void;
  onCancelFindTrip: (userId: string) => void;
  onClearAllData?: () => void;
  onCancelTrip: (tripId: string) => void;
  onForceFinishTrip: (tripId: string) => void;
  onClearLogs: () => void;
  mapClickMode: MapClickMode;
  setMapClickMode: (mode: MapClickMode) => void;
  pendingRandomLocation: Location | null;
  demoDataCenter: Location | null;
  themeMode?: ThemeMode;
  onRunCommand: (raw: string) => string;
  commands: CommandSpec[];
}

export const Sidebar: React.FC<SidebarProps> = (props) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isLight = props.themeMode === 'light';

  const activeTripsCount = props.trips.filter((t) => t.status === 'in_progress').length;

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
            <Section title="Khách hàng" icon={<Users className="w-4 h-4" />} count={props.users.length} defaultOpen themeMode={props.themeMode}>
              <UsersTab
                users={props.users}
                selectedUserId={props.selectedUserId}
                onSelectUser={props.onSelectUser}
                onDeleteUser={props.onDeleteUser}
                onAddUser={props.onAddUser}
                onBatchGenerateUsers={props.onBatchGenerateUsers}
                onStartCreateTrip={props.onStartCreateTrip}
                onFindTrip={props.onFindTrip}
                onCancelFindTrip={props.onCancelFindTrip}
                mapClickMode={props.mapClickMode}
                setMapClickMode={props.setMapClickMode}
                pendingRandomLocation={props.pendingRandomLocation}
                themeMode={props.themeMode}
              />
            </Section>

            <Section title="Chuyến đi" icon={<Zap className="w-4 h-4" />} count={activeTripsCount} defaultOpen themeMode={props.themeMode}>
              <TripsTab
                trips={props.trips}
                selectedTripId={props.selectedTripId}
                onSelectTrip={props.onSelectTrip}
                onCancelTrip={props.onCancelTrip}
                onForceFinishTrip={props.onForceFinishTrip}
                themeMode={props.themeMode}
              />
            </Section>

            <Section title="Dữ liệu ảo" icon={<Sparkles className="w-4 h-4" />} defaultOpen={false} themeMode={props.themeMode}>
              <MockDataTab
                users={props.users}
                onBatchGenerateUsers={props.onBatchGenerateUsers}
                onClearAllData={props.onClearAllData}
                mapClickMode={props.mapClickMode}
                setMapClickMode={props.setMapClickMode}
                demoDataCenter={props.demoDataCenter}
                themeMode={props.themeMode}
              />
            </Section>

            <Section title="Nhật ký" icon={<Activity className="w-4 h-4" />} count={props.logs.length} defaultOpen={false} themeMode={props.themeMode}>
              <LogsTab
                logs={props.logs}
                onClearLogs={props.onClearLogs}
                totalTripsCount={props.trips.length}
                completedTripsCount={props.trips.filter((t) => t.status === 'completed').length}
                activeTripsCount={activeTripsCount}
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
