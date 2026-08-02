import { CityPreset, User, VehicleType } from '../types/simulation';
import { generateRandomLocation, getApproximateAddress } from './geo';

export const CITY_PRESETS: CityPreset[] = [
  {
    id: 'hcmc',
    name: 'TP. Hồ Chí Minh (Trung tâm)',
    country: 'Việt Nam',
    center: [10.776889, 106.700806], // Ben Thanh Market / District 1
    zoom: 14,
    landmarks: [
      { name: 'Chợ Bến Thành', location: { lat: 10.7725, lng: 106.6980, address: 'Chợ Bến Thành, Quận 1' } },
      { name: 'Phố đi bộ Nguyễn Huệ', location: { lat: 10.7742, lng: 106.7032, address: 'Nguyễn Huệ, Quận 1' } },
      { name: 'Nhà hát Thành Phố', location: { lat: 10.7766, lng: 106.7031, address: '7 Công Trường Lam Sơn, Quận 1' } },
      { name: 'Dinh Độc Lập', location: { lat: 10.7770, lng: 106.6953, address: '135 Nam Kỳ Khởi Nghĩa, Quận 1' } },
      { name: 'Sân bay Tân Sơn Nhất', location: { lat: 10.8185, lng: 106.6588, address: 'Sân bay Tân Sơn Nhất, Tân Bình' } },
      { name: 'Landmark 81', location: { lat: 10.7951, lng: 106.7218, address: '720A Điện Biên Phủ, Bình Thạnh' } },
    ]
  },
  {
    id: 'hanoi',
    name: 'Hà Nội (Hoàn Kiếm)',
    country: 'Việt Nam',
    center: [21.028511, 105.854167], // Hoan Kiem Lake
    zoom: 14,
    landmarks: [
      { name: 'Hồ Hoàn Kiếm', location: { lat: 21.0285, lng: 105.8542, address: 'Hồ Hoàn Kiếm, Hoàn Kiếm' } },
      { name: 'Lăng Chủ tịch Hồ Chí Minh', location: { lat: 21.0368, lng: 105.8347, address: 'Hùng Vương, Điện Biên, Ba Đình' } },
      { name: 'Nhà hát Lớn Hà Nội', location: { lat: 21.0244, lng: 105.8576, address: '1 Tràng Tiền, Hoàn Kiếm' } },
      { name: 'Sân bay Nội Bài', location: { lat: 21.2187, lng: 105.8042, address: 'Sân bay Nội Bài, Sóc Sơn' } },
    ]
  },
  {
    id: 'danang',
    name: 'Đà Nẵng (Cầu Rồng)',
    country: 'Việt Nam',
    center: [16.0610, 108.2230], // Dragon Bridge
    zoom: 14,
    landmarks: [
      { name: 'Cầu Rồng', location: { lat: 16.0610, lng: 108.2230, address: 'Cầu Rồng, Hải Châu' } },
      { name: 'Bãi biển Mỹ Khê', location: { lat: 16.0601, lng: 108.2467, address: 'Bãi biển Mỹ Khê, Sơn Trà' } },
      { name: 'Sân bay Đà Nẵng', location: { lat: 16.0439, lng: 108.1994, address: 'Sân bay Đà Nẵng, Hải Châu' } },
    ]
  },
  {
    id: 'cantho',
    name: 'Cần Thơ (Bến Ninh Kiều)',
    country: 'Việt Nam',
    center: [10.0342, 105.7885],
    zoom: 14,
    landmarks: [
      { name: 'Bến Ninh Kiều', location: { lat: 10.0342, lng: 105.7885, address: 'Hai Bà Trưng, Tân An, Ninh Kiều' } },
      { name: 'Chợ nổi Cái Răng', location: { lat: 10.0035, lng: 105.7483, address: 'Chợ nổi Cái Răng, Cần Thơ' } },
    ]
  }
];

export const VEHICLE_CONFIGS: Record<VehicleType, { name: string; icon: string; color: string; speedKmH: number }> = {
  motorbike: { name: 'Xe máy (GrabBike)', icon: '🛵', color: '#10B981', speedKmH: 38 },
  car_4: { name: 'Ô tô 4 chỗ (GrabCar)', icon: '🚗', color: '#3B82F6', speedKmH: 42 },
  car_7: { name: 'Ô tô 7 chỗ (GrabSUV)', icon: '🚘', color: '#8B5CF6', speedKmH: 40 },
};

// Number of passenger seats per vehicle type, not counting the driver.
export const TRIP_SLOT_CAPACITY: Record<VehicleType, number> = {
  motorbike: 1,
  car_4: 3,
  car_7: 6,
};

const VIETNAMESE_NAMES_MALE = [
  'Nguyễn Văn An', 'Trần Minh Khoa', 'Lê Hoàng Nam', 'Phạm Đức Anh', 'Vũ Quốc Huy',
  'Đặng Văn Tuấn', 'Bùi Xuân Trường', 'Đỗ Thanh Tùng', 'Hồ Bảo Long', 'Ngõ Việt Cường',
  'Trịnh Hoài Nam', 'Dương Tấn Phát', 'Lý Hải Đăng', 'Võ Trọng Nghĩa'
];

const VIETNAMESE_NAMES_FEMALE = [
  'Nguyễn Thị Mai', 'Trần Thu Hà', 'Lê Mỹ Duyên', 'Phạm Ngọc Ánh', 'Vũ Linh Chi',
  'Đặng Thảo Nguyên', 'Bùi Phương Thảo', 'Đỗ Như Quỳnh', 'Hồ Quỳnh Trang', 'Huỳnh Thanh Trúc'
];

export function getRandomUserName(): string {
  const isFemale = Math.random() > 0.5;
  const list = isFemale ? VIETNAMESE_NAMES_FEMALE : VIETNAMESE_NAMES_MALE;
  return list[Math.floor(Math.random() * list.length)];
}

export function getRandomPhoneNumber(): string {
  const prefixes = ['090', '091', '098', '093', '097', '038', '086'];
  const pref = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = Math.floor(1000000 + Math.random() * 9000000);
  return `${pref}${suffix}`;
}

export function generateInitialUsers(center: [number, number], count: number = 5): User[] {
  const users: User[] = [];

  for (let i = 1; i <= count; i++) {
    const loc = generateRandomLocation({ lat: center[0], lng: center[1] }, 1.5);

    users.push({
      id: `usr-${Date.now()}-${i}`,
      name: getRandomUserName(),
      phone: getRandomPhoneNumber(),
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=user_${i}_${Date.now()}`,
      location: { ...loc, address: getApproximateAddress(loc) },
      status: 'idle',
    });
  }

  return users;
}
