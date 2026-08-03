# Luồng hoạt động của CoGo Mô phỏng — giải thích cho người mới học code

Tài liệu này giải thích **cách app hoạt động bên trong**, viết cho người chưa quen đọc code React. Mục tiêu: đọc xong, bạn hiểu được khi bấm 1 nút trên giao diện thì dữ liệu đi đâu, ai gọi ai, vì sao màn hình lại đổi.

---

## 1. Bức tranh tổng quan

Đây là 1 **web app mô phỏng gọi xe** (giống Grab nhưng chỉ chạy trên trình duyệt, không có server thật lưu dữ liệu). Toàn bộ dữ liệu (khách hàng, chuyến đi...) chỉ tồn tại **trong bộ nhớ của trình duyệt** — tải lại trang (F5) là mất hết, quay về trạng thái trống.

```
┌─────────────────────────────────────────────┐
│               src/App.tsx                    │  ← "bộ não" duy nhất giữ toàn bộ dữ liệu
│  (users, trips, logs, trạng thái mô phỏng)   │
└───────────────┬───────────────┬──────────────┘
                │               │
        truyền dữ liệu xuống dạng "props"
                │               │
       ┌────────▼──────┐   ┌────▼─────────────┐
       │   Header.tsx   │   │  Sidebar.tsx      │
       │ (thanh trên)   │   │  (bảng bên phải)  │
       └────────────────┘   └────┬──────────────┘
                                  │
                    ┌─────────────┼─────────────┬──────────────┐
                    ▼             ▼             ▼              ▼
              UsersTab      TripsTab      MockDataTab      LogsTab
             (Khách hàng)  (Chuyến đi)   (Dữ liệu ảo)     (Nhật ký)

       ┌────────────────┐
       │ LeafletMap.tsx  │  ← vẽ bản đồ + các chấm tròn (marker) đại diện user
       └────────────────┘
```

### Nguyên tắc cốt lõi cần nhớ trước khi đọc tiếp

1. **Chỉ có 1 nơi giữ dữ liệu thật**: `App.tsx`. Mọi component khác (Header, Sidebar, UsersTab...) chỉ là "cái loa" hiển thị dữ liệu được `App.tsx` đưa cho, và khi người dùng bấm nút, chúng gọi ngược lại 1 hàm mà `App.tsx` đã đưa cho chúng. Đây gọi là mô hình **"state ở trên cùng, hành động gọi ngược lên"** (lifting state up) — rất phổ biến trong React.
2. **Không có Database, không có "tài xế" riêng.** Trong bản thiết kế mới, chỉ có **1 loại thực thể duy nhất là `User`** (khách hàng). Khi 1 user tạo chuyến đi, chính họ tạm thời "hoá thân" thành tài xế của chuyến đó — không có bảng dữ liệu tài xế tách biệt.
3. **Mọi thứ đổi trên bản đồ đều là do state đổi.** Bạn sẽ không thấy dòng code nào "vẽ" hình trực tiếp theo kiểu vẽ 1 lần rồi thôi — React cứ mỗi khi state đổi là tự vẽ lại toàn bộ giao diện theo state mới.

---

## 2. Các khái niệm dữ liệu (types) — định nghĩa tại `lib/types/simulation.ts`

Hãy tưởng tượng những "khuôn mẫu" dữ liệu này giống như các loại phiếu thông tin có sẵn các ô cần điền:

### `User` — một khách hàng/tài xế
```ts
{
  id: string;        // mã định danh duy nhất, vd "usr-1234567890"
  name: string;       // tên
  phone: string;      // số điện thoại
  avatar: string;     // link ảnh đại diện (tự sinh từ dịch vụ dicebear.com)
  location: Location; // vị trí hiện tại {lat, lng, address?}
  status: 'idle' | 'driving' | 'riding'; // Rảnh | Đang lái xe | Đang là khách trên xe
  heading?: number;   // hướng xe đang quay mặt (0–360 độ), chỉ có ý nghĩa khi đang lái
}
```

### `Trip` — một chuyến đi
```ts
{
  id: string;
  driverUserId: string;    // id của User đang là tài xế chuyến này
  driverName, driverAvatar, driverPhone: string; // sao chép lại thông tin tài xế lúc tạo chuyến
  vehicleType: 'motorbike' | 'car_4' | 'car_7';  // loại xe
  slots: TripSlot[];       // danh sách chỗ ngồi cho khách (xem bên dưới)
  pickup: Location;        // điểm đón = vị trí của tài xế lúc họ bấm "Tạo chuyến đi"
  destination: Location;   // điểm đến do tài xế chọn trên bản đồ
  status: 'in_progress' | 'completed' | 'cancelled';
  routeWaypoints: Location[]; // danh sách các điểm nhỏ nối từ pickup → destination, xe sẽ "nhảy" qua từng điểm này mỗi nhịp mô phỏng
  routeIndex: number;      // xe đang ở điểm thứ mấy trong routeWaypoints
  progress: number;        // % hoàn thành chuyến (0–100)
  distanceKm, fareVND, etaSeconds: number; // quãng đường, giá tiền, thời gian dự kiến
}
```

`TripSlot` chỉ là `{ passengerUserId: string | null }` — 1 ô chỗ ngồi, `null` nghĩa là còn trống. Số lượng `slots` phụ thuộc loại xe (xem mục 5).

### Các "chế độ bấm bản đồ" — `MapClickMode`

Đây là khái niệm quan trọng nhất để hiểu các luồng tương tác với bản đồ. Bản đồ (`LeafletMap.tsx`) có 1 sự kiện `onClick` DUY NHẤT, nhưng nó cần biết: "bấm vào bản đồ lúc này để LÀM GÌ?" — câu trả lời được lưu trong 1 biến gọi là `mapClickMode`, có 4 giá trị:

| Giá trị | Ý nghĩa | Được bật khi nào |
|---|---|---|
| `'none'` | Bấm bản đồ chỉ để bỏ chọn (không làm gì đặc biệt) | Mặc định |
| `'pick_random_center'` | Bấm 1 điểm để làm **tâm ghim**, sau đó random ra 1 vị trí trong bán kính 5km quanh điểm đó — dùng khi **tạo 1 khách hàng mới** | Bấm nút "Ghim tâm vùng..." trong form Thêm khách hàng |
| `'pick_trip_destination'` | Bấm 1 điểm để làm **điểm đến chính xác** của 1 chuyến đi sắp tạo | Bấm nút "Chọn điểm đến trên bản đồ" sau khi chọn loại xe |
| `'pick_demo_center'` | Bấm 1 điểm để làm **tâm vùng sinh dữ liệu ảo hàng loạt** (+5 khách...) | Bấm nút "Ghim vùng trung tâm dữ liệu ảo" trong tab Dữ liệu ảo |

Cơ chế chung: bấm nút → `setMapClickMode('xxx')` → bản đồ đổi con trỏ chuột thành dấu `+` và hiện băng thông báo màu xanh ở trên cùng → người dùng click vào bản đồ → `LeafletMap` gọi `onMapClickAction(toạ_độ_vừa_click)` → hàm này nằm trong `App.tsx`, nó kiểm tra `mapClickMode` đang là gì để quyết định làm gì với toạ độ đó → xong việc thì tự đặt lại `mapClickMode = 'none'`.

---

## 3. `App.tsx` — nơi giữ toàn bộ "bộ nhớ" của app

Mở đầu file là danh sách các "hộp nhớ" (state), khai báo bằng `useState`. Hãy đọc như sau: `const [users, setUsers] = useState([])` nghĩa là *"tạo 1 hộp tên `users`, giá trị ban đầu là mảng rỗng `[]`, và có 1 cái remote điều khiển tên `setUsers` để đổi nội dung hộp đó."* Mỗi khi gọi `setUsers(...)`, React sẽ tự vẽ lại toàn bộ giao diện có dùng đến `users`.

Danh sách các hộp nhớ chính:

| State | Chứa gì |
|---|---|
| `users` | Toàn bộ danh sách khách hàng/tài xế hiện có |
| `trips` | Toàn bộ chuyến đi (đang chạy + đã xong + đã huỷ) |
| `logs` | Nhật ký các sự kiện đã xảy ra (hiển thị ở tab "Nhật ký") |
| `selectedUserId`, `selectedTripId` | Đang bấm chọn user/chuyến nào (để tô sáng trên bản đồ + sidebar) |
| `mapClickMode` | Xem mục 2 |
| `pendingRandomLocation` | Vị trí ngẫu nhiên vừa chọn xong, đang chờ form "Thêm khách hàng" lấy dùng |
| `tripDraft` | Thông tin tạm `{userId, vehicleType}` khi 1 user đang giữa chừng tạo chuyến đi (đã chọn loại xe, đang chờ click bản đồ chọn điểm đến) |
| `demoDataCenter` | Toạ độ tâm vùng sinh dữ liệu ảo hàng loạt (nếu chưa ghim thì `null`) |
| `isSimulating`, `simSpeed` | Mô phỏng đang chạy hay tạm dừng, và tốc độ (1x/2x/5x/10x) |
| `currentCity`, `tileLayerType`, `themeMode` | Thành phố đang xem, kiểu bản đồ (OSM/Vệ tinh), giao diện sáng/tối |

### Các hàm xử lý (handlers) quan trọng

Mỗi hàm `handleXxx` là **1 "công thức" trả lời câu hỏi: khi sự kiện này xảy ra thì phải đổi những hộp nhớ nào**. Dưới đây là các hàm cốt lõi, đọc theo đúng thứ tự vòng đời 1 chuyến đi:

#### `handleAddUser({name, phone, location})`
Được gọi khi bấm nút "Tạo khách hàng" (sau khi đã điền tên, SĐT, và ghim vị trí). Tạo 1 object `User` mới với `status: 'idle'`, thêm vào đầu mảng `users`.

#### `handleStartCreateTrip(userId, vehicleType)`
Được gọi khi 1 user (đang rảnh) chọn xong loại xe và bấm "Chọn điểm đến trên bản đồ". Việc này **chưa tạo chuyến đi ngay** — nó chỉ ghi nhớ tạm `tripDraft = {userId, vehicleType}` rồi bật `mapClickMode = 'pick_trip_destination'`, tức là "đang chờ người dùng click vào bản đồ để chọn điểm đến".

#### `handleMapClickAction(loc)` (nhánh `pick_trip_destination`)
Khi người dùng click vào bản đồ lúc đang ở chế độ này, hàm này lấy lại `tripDraft` đã lưu, rồi gọi `handleCreateTrip(tripDraft.userId, tripDraft.vehicleType, loc)` — đây là bước thực sự tạo ra chuyến đi.

#### `handleCreateTrip(userId, vehicleType, destination)` — trái tim của tính năng "Tạo chuyến đi"
Đây là hàm **bất đồng bộ** (từ khoá `async`) vì nó cần gọi 1 dịch vụ bản đồ bên ngoài (OSRM) qua internet để lấy đường đi thật trên đường phố. Các bước:

1. Tìm user theo `userId`, lấy vị trí hiện tại của họ làm điểm đón (`pickup`).
2. Gọi `fetchRoadRoute(pickup, destination)` — hàm này gửi request tới OSRM (1 dịch vụ chỉ đường công khai, miễn phí) để lấy 1 danh sách các điểm toạ độ đi men theo đường thật (không đi xuyên qua nhà). Nếu mạng lỗi hoặc OSRM không phản hồi, dùng `generateRouteWaypoints` để tự vẽ 1 đường thẳng có uốn éo giả (không cần internet).
3. Tính quãng đường (`distanceKm`), giá tiền (`fareVND`, qua hàm `calculateFare`), thời gian dự kiến (`etaSeconds`).
4. Tính số chỗ ngồi (`slots`) dựa vào loại xe — tra bảng `TRIP_SLOT_CAPACITY` (xem mục 5).
5. Tạo object `Trip` mới, `status: 'in_progress'` — nghĩa là bắt đầu chạy ngay.
6. **Đổi trạng thái user đó thành `'driving'`** — đây là bước biến 1 khách hàng thành "tài xế" của chuyến đi vừa tạo.
7. Thêm chuyến mới vào đầu mảng `trips`.

#### Vòng lặp mô phỏng di chuyển (tick loop) — `useEffect(..., [isSimulating, simSpeed, addLog])`
Đây là đoạn code chạy **lặp đi lặp lại liên tục**, giống 1 cái đồng hồ tích tắc. Cứ mỗi `400 / simSpeed` mili-giây (tốc độ càng cao, tích tắc càng nhanh), nó chạy 1 lần và làm việc sau với **mọi chuyến đi đang `in_progress`**:

```
Với mỗi chuyến đi đang chạy:
  - Lấy điểm tiếp theo trong routeWaypoints (routeIndex + 1)
  - Nếu còn điểm tiếp theo:
      → Di chuyển user (tài xế) tới điểm đó, tính lại "heading" (hướng quay đầu xe)
      → Tính lại % hoàn thành (progress)
  - Nếu đã hết điểm (đã tới đích):
      → Đổi user về status 'idle', đặt vị trí user = điểm đến
      → Ghi log "hoàn thành! Thu nhập: ... VND"
      → Đổi trạng thái chuyến thành 'completed'
```

> **Lưu ý dành cho người mới:** Đoạn code này từng có 1 lỗi (đã sửa) — khi hoàn thành chuyến, code cũ gọi lại 1 hàm riêng để tìm chuyến đi trong danh sách `trips`, nhưng danh sách đó bị "cũ" (stale) do cách JavaScript ghi nhớ biến trong 1 hàm được tạo từ lâu (gọi là *closure*). Bài học: khi bạn đang có sẵn dữ liệu mới nhất ngay trong tay (biến `trip` trong vòng lặp `.map()`), hãy dùng luôn nó, đừng đi tra cứu lại từ 1 biến ở ngoài có thể đã lỗi thời.

#### `handleCancelTrip(tripId)` / `handleForceFinishTrip(tripId)`
Hai hàm này được gọi khi người dùng bấm nút "Hủy chuyến" / "Hoàn thành ngay" trong tab Chuyến đi — tức là **can thiệp thủ công**, không cần chờ mô phỏng tự chạy tới đích. Cùng logic với vòng lặp tick ở trên nhưng chạy ngay lập tức 1 lần.

#### `handleFindTrip(user)` — placeholder
Hiện tại chỉ ghi 1 dòng log "Tính năng sẽ được thiết kế sau" — chưa có logic thật, vì tính năng "tìm chuyến đi để làm hành khách" chưa được thiết kế xong (cố ý để dành làm sau).

---

## 4. Vòng đời 1 lần sử dụng app — kể theo trình tự thời gian

Hãy tưởng tượng bạn là người dùng mới mở app:

### Bước 1 — Mở app
App khởi động **hoàn toàn trống**: `users = []`, `trips = []`. Không có gọi API nào tới server (vì đã ngắt kết nối database — xem mục 7). Bạn phải tự tạo dữ liệu.

### Bước 2 — Tạo 1 khách hàng
1. Bấm "Thêm khách hàng" → `UsersTab` mở ra 1 form (tên, SĐT, nút ghim vị trí).
2. Điền tên + SĐT.
3. Bấm "Ghim tâm vùng, random vị trí trong bán kính 5km" → `setMapClickMode('pick_random_center')`.
4. Bản đồ hiện băng xanh "Nhấp vào bản đồ để GHIM TÂM VÙNG".
5. Bạn click 1 điểm bất kỳ trên bản đồ.
6. `LeafletMap` bắt được sự kiện click → gọi `onMapClickAction(toạ_độ)`.
7. Trong `App.tsx`, `handleMapClickAction` thấy `mapClickMode === 'pick_random_center'` → gọi `generateRandomLocation(toạ_độ, 5)` (hàm toán học random ra 1 điểm cách tâm tối đa 5km) → lưu kết quả vào `pendingRandomLocation`.
8. `UsersTab` có 1 đoạn `useEffect` đang "lắng nghe" `pendingRandomLocation` — khi nó đổi, form tự động điền vị trí vào và hiện địa chỉ ước lượng.
9. Bấm "Tạo khách hàng" → gọi `onAddUser(...)` → chạy tới `handleAddUser` ở `App.tsx` → thêm 1 `User` mới vào `users` với `status: 'idle'`.
10. Vì `users` đổi, React tự vẽ lại: card khách hàng mới xuất hiện trong sidebar, và 1 chấm tròn 👤 xuất hiện trên bản đồ (do `LeafletMap` có 1 đoạn code lặp qua `users` để vẽ marker cho từng người).

### Bước 3 — Tạo 1 chuyến đi
1. Trên card khách hàng (đang `idle`), bấm "Tạo chuyến đi" → `UsersTab` mở ra 1 ô chọn loại xe + nút "Chọn điểm đến trên bản đồ" (chỉ là UI cục bộ trong `UsersTab`, chưa động tới `App.tsx`).
2. Chọn loại xe (vd Ô tô 4 chỗ), bấm nút chọn điểm đến → gọi `onStartCreateTrip(userId, vehicleType)` → `App.tsx` lưu `tripDraft` và bật `mapClickMode = 'pick_trip_destination'`.
3. Bản đồ hiện băng xanh "Nhấp vào bản đồ để CHỌN ĐIỂM ĐẾN".
4. Click vào 1 điểm bất kỳ (nơi khách muốn đến) → `handleMapClickAction` thấy đúng mode → gọi `handleCreateTrip(userId, vehicleType, điểm_đã_click)`.
5. `handleCreateTrip` gọi OSRM lấy đường đi thật, tạo `Trip` mới, đổi user đó thành `status: 'driving'`.
6. Giao diện tự vẽ lại: card user giờ có nhãn "Đang lái", tab "Chuyến đi" hiện 1 card mới với thanh tiến độ 0%, bản đồ vẽ 2 lá cờ A (điểm đón) / B (điểm đến) và 1 đường kẻ nối chúng, marker của user đổi từ 👤 thành icon xe (🛵/🚗/🚘) tuỳ loại xe.

### Bước 4 — Mô phỏng tự chạy
Vòng lặp tick (mục 3) tự động chạy mỗi `400/simSpeed` mili-giây, đẩy marker xe nhích dần theo đường đã vẽ, thanh tiến độ tăng dần. Khi chạy hết đường, chuyến chuyển `completed`, user quay lại `idle`, và số liệu "Lịch sử hoàn thành" trong tab Chuyến đi tăng lên.

### Bước 5 — Xoá dữ liệu
Bấm nút đỏ "Xóa toàn bộ dữ liệu mô phỏng" → xuất hiện bước xác nhận **ngay trong giao diện** (không dùng popup của trình duyệt, vì popup đó có thể bị 1 số trình duyệt chặn âm thầm) → bấm "Xác nhận xóa" → `handleClearAllData` chạy, đưa mọi hộp nhớ về rỗng/`null`.

---

## 5. Bảng cấu hình loại xe — `lib/utils/presets.ts`

```ts
VEHICLE_CONFIGS = {
  motorbike: { name: 'Xe máy (GrabBike)',    icon: '🛵', speedKmH: 38 },
  car_4:     { name: 'Ô tô 4 chỗ (GrabCar)', icon: '🚗', speedKmH: 42 },
  car_7:     { name: 'Ô tô 7 chỗ (GrabSUV)', icon: '🚘', speedKmH: 40 },
}

TRIP_SLOT_CAPACITY = {
  motorbike: 1,  // 1 chỗ khách (chưa tính tài xế)
  car_4: 3,      // 3 chỗ khách
  car_7: 6,      // 6 chỗ khách
}
```

Đây là 2 cái "bảng tra cứu" (lookup table) đơn giản — thay vì viết `if (vehicleType === 'motorbike') { ... } else if (...)` lặp đi lặp lại khắp nơi, code chỉ cần viết `VEHICLE_CONFIGS[vehicleType]` để lấy đúng thông tin. Đây là 1 kỹ thuật rất phổ biến, nên làm quen.

File này cũng có các hàm sinh dữ liệu giả cho vui:
- `getRandomUserName()` — bốc ngẫu nhiên 1 tên từ danh sách tên tiếng Việt có sẵn.
- `getRandomPhoneNumber()` — ghép ngẫu nhiên đầu số + 7 chữ số.
- `generateInitialUsers(center, count)` — tạo hàng loạt user ngẫu nhiên quanh 1 toạ độ tâm, dùng cho các nút "+5 khách", "Sinh nhanh".

---

## 6. Các hàm toán học địa lý — `lib/utils/geo.ts`

File này chỉ chứa các hàm "tính toán thuần" (không đụng tới giao diện), rất dễ đọc từng hàm riêng lẻ:

| Hàm | Làm gì |
|---|---|
| `calculateDistanceKm(a, b)` | Tính khoảng cách đường chim bay giữa 2 toạ độ (công thức Haversine — công thức toán học chuẩn để tính khoảng cách trên mặt cầu Trái Đất) |
| `calculateBearing(a, b)` | Tính góc hướng (0–360°) để "xoay" icon xe cho đúng hướng đang di chuyển |
| `generateRouteWaypoints(start, end, steps)` | Tự vẽ 1 đường giả (không cần mạng) — chia đường thẳng thành nhiều đoạn nhỏ và thêm chút uốn éo cho giống đường thật |
| `fetchRoadRoute(start, end)` | Gọi dịch vụ **OSRM** (Open Source Routing Machine — dịch vụ chỉ đường mã nguồn mở, miễn phí, công khai trên internet) để lấy đường đi thật men theo đường phố |
| `generateRandomLocation(center, radiusKm)` | Random ra 1 điểm trong vòng tròn bán kính `radiusKm` quanh `center` — dùng cho tính năng ghim vị trí |
| `calculateFare(distanceKm, vehicleType)` | Tính giá cước theo công thức: giá mở cửa + đơn giá/km tuỳ loại xe |
| `getApproximateAddress(loc)` | **Địa chỉ giả** — không tra cứu địa chỉ thật (không gọi mạng), mà bốc ngẫu nhiên 1 tên đường + quận dựa theo toạ độ, chỉ để hiển thị cho có vẻ thật |
| `geocodeAddress(query)` | Ngược lại với trên — đây là tra cứu **thật**, gọi dịch vụ **Nominatim** (dịch vụ tìm kiếm địa điểm của OpenStreetMap) để chuyển 1 câu chữ (vd "Chợ Bến Thành") thành toạ độ thật, dùng cho ô tìm kiếm ở Header |

> **Phân biệt quan trọng:** `getApproximateAddress` là "giả vờ" (không cần mạng, chỉ để trang trí), còn `geocodeAddress` và `fetchRoadRoute` là **gọi API thật** qua internet. Khi đọc code thấy `await fetch(...)` hoặc `await fetchRoadRoute(...)`, đó là dấu hiệu "hàm này cần chờ internet trả lời".

---

## 7. Vì sao không có Database?

Ban đầu app này có 1 server Express (`server/server.ts`) kết nối tới Postgres (Supabase) để lấy dữ liệu tài xế/khách hàng thật. Theo yêu cầu, phần này đã bị **gỡ bỏ hoàn toàn**:
- `server/server.ts` giờ chỉ làm 1 việc: phục vụ file giao diện (không còn route `/api/...` nào).
- Không còn cần biến môi trường `DB_HOST`, `DB_USER`... trong file `.env`.
- Toàn bộ dữ liệu chỉ sống trong bộ nhớ trình duyệt (biến `useState` trong `App.tsx`) — tắt tab hoặc F5 là mất sạch.

Điều duy nhất app còn gọi ra internet là 2 dịch vụ bản đồ công khai, miễn phí, không cần đăng nhập: **OSRM** (chỉ đường) và **Nominatim** (tìm địa điểm) — cả 2 đều không phải "database" của bạn, chỉ là tiện ích bản đồ dùng chung của cộng đồng OpenStreetMap.

---

## 8. Cây thư mục — cái gì nằm ở đâu

```
lib/
  types/simulation.ts   ← định nghĩa mọi "khuôn mẫu" dữ liệu (User, Trip, MapClickMode...)
  utils/
    presets.ts           ← danh sách thành phố, cấu hình loại xe, hàm sinh dữ liệu giả
    geo.ts               ← các hàm toán học địa lý + 2 hàm gọi API bản đồ (mục 6)

src/
  App.tsx                ← "bộ não": giữ mọi state + mọi hàm xử lý (mục 3)
  components/
    Header.tsx            ← thanh trên cùng: nút play/pause, tốc độ, ô tìm vị trí, nút xoá
    LeafletMap.tsx         ← vẽ bản đồ Leaflet + marker + đường đi
    Sidebar/
      Sidebar.tsx          ← khung bảng bên phải, chỉ làm việc "chuyển tiếp" props xuống các tab con
      UsersTab.tsx         ← tab "Khách hàng": form thêm, danh sách, nút tạo/tìm chuyến
      TripsTab.tsx         ← tab "Chuyến đi": danh sách chuyến đang chạy + lịch sử
      MockDataTab.tsx      ← tab "Dữ liệu ảo": sinh nhanh, ghim vùng trung tâm, xoá sạch
      LogsTab.tsx          ← tab "Nhật ký": thống kê + danh sách log
      CommandBar.tsx       ← ô gõ lệnh ở cuối sidebar (vd gõ "help", "seed 10")
      Section.tsx          ← khung có thể đóng/mở, dùng chung cho mọi tab trong Sidebar

server/
  server.ts               ← server Express tối giản, chỉ phục vụ giao diện, không có API dữ liệu
```

---

## 9. Vài "mẹo đọc code React" áp dụng cho app này

- **`useState`** = 1 hộp nhớ có thể đổi giá trị, mỗi lần đổi thì giao diện tự vẽ lại.
- **`useEffect`** = "làm việc này mỗi khi những thứ trong dấu `[]` cuối cùng bị đổi". Vòng lặp tick mô phỏng chính là 1 `useEffect` với `[isSimulating, simSpeed, addLog]` — nghĩa là nó chỉ được **tạo lại** khi 1 trong 3 thứ đó đổi (không phải mỗi khi `users`/`trips` đổi, để tránh việc tạo interval mới liên tục).
- **`useCallback`** = "nhớ lại hàm này, đừng tạo hàm mới mỗi lần vẽ lại giao diện" — chỉ là tối ưu hiệu năng, không đổi ý nghĩa logic.
- **Props** = cách 1 component cha "đưa" dữ liệu + hàm xuống cho component con. Đọc `interface XxxProps { ... }` ở đầu mỗi file trong `Sidebar/` để biết component đó cần được đưa những gì.
- **`prev => ...`** (vd `setUsers((prev) => prev.map(...))`) = cách an toàn để đổi 1 hộp nhớ dựa trên giá trị cũ của chính nó, tránh bug khi nhiều thao tác xảy ra gần như cùng lúc.

---

## 10. Tóm tắt 1 câu cho từng tính năng

| Tính năng | Bấm gì | Hàm xử lý chính | Kết quả |
|---|---|---|---|
| Tạo khách hàng | "Thêm khách hàng" → ghim vị trí → "Tạo khách hàng" | `handleAddUser` | Thêm 1 `User` mới, `status: idle` |
| Sinh nhanh nhiều khách | "+5 khách" | `handleBatchGenerateUsers` | Thêm N `User` ngẫu nhiên quanh `demoDataCenter` (hoặc tâm thành phố) |
| Ghim vùng dữ liệu ảo | "Ghim vùng trung tâm dữ liệu ảo" → click bản đồ | `handleMapClickAction` (nhánh `pick_demo_center`) | Lưu `demoDataCenter`, mọi lần sinh ngẫu nhiên sau đó dùng điểm này |
| Tạo chuyến đi | "Tạo chuyến đi" → chọn xe → chọn điểm đến trên bản đồ | `handleStartCreateTrip` rồi `handleCreateTrip` | Tạo `Trip` mới, user thành `driving` |
| Mô phỏng chạy xe | Tự động (khi `isSimulating = true`) | vòng lặp `useEffect` tick | Xe nhích dần theo `routeWaypoints`, tới đích thì `completed` |
| Hủy / hoàn thành thủ công | Nút trong card chuyến đi | `handleCancelTrip` / `handleForceFinishTrip` | Đổi trạng thái chuyến + user ngay lập tức |
| Xoá toàn bộ | "Xóa toàn bộ dữ liệu mô phỏng" → xác nhận | `handleClearAllData` | `users`, `trips` về rỗng |
| Tìm vị trí trên bản đồ | Gõ vào ô "Tìm vị trí" ở Header | `geocodeAddress` (gọi Nominatim) | Bản đồ pan tới địa điểm, không đụng dữ liệu |
| Tìm chuyến đi | "Tìm chuyến đi" | `handleFindTrip` (placeholder) | Chỉ ghi log, chưa có logic thật |
