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
  status: 'idle' | 'driving' | 'searching' | 'riding'; // Rảnh | Đang lái xe | Đang tìm chuyến (đã chọn điểm đến, đang chờ ghép) | Đã ghép vào 1 chuyến (chờ đón hoặc đã lên xe)
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
  routeIndex: number;      // xe đang ở điểm thứ mấy trong routeWaypoints (số nguyên)
  stepProgress: number;    // vị trí "thật" của xe trên đường, có phần thập phân — dùng để tính tốc độ cho khớp với etaSeconds (xem mục 3)
  progress: number;        // % hoàn thành chuyến (0–100)
  distanceKm, fareVND, etaSeconds: number; // quãng đường, giá tiền, thời gian dự kiến
}
```

`TripSlot` là `{ passengerUserId: string | null; pickupIndex?: number; dropoffIndex?: number; pickedUp?: boolean }` — 1 ô chỗ ngồi:
- `passengerUserId`: `null` nghĩa là còn trống, có `id` nghĩa là đã có khách ghép vào ô này.
- `pickupIndex` / `dropoffIndex`: khách này sẽ được đón/trả ở **điểm thứ mấy** trong `routeWaypoints` của tài xế (xem mục "Tìm chuyến đi" ở mục 3).
- `pickedUp`: `false` = khách đang đứng chờ ở điểm đón (marker vẫn hiện trên bản đồ); `true` = tài xế đã đi ngang qua đón, khách coi như đang ngồi trong xe (marker ẩn đi, xem "Hiệu ứng marker" ở mục 3).

Số lượng `slots` phụ thuộc loại xe (xem mục 5).

### Các "chế độ bấm bản đồ" — `MapClickMode`

Đây là khái niệm quan trọng nhất để hiểu các luồng tương tác với bản đồ. Bản đồ (`LeafletMap.tsx`) có 1 sự kiện `onClick` DUY NHẤT, nhưng nó cần biết: "bấm vào bản đồ lúc này để LÀM GÌ?" — câu trả lời được lưu trong 1 biến gọi là `mapClickMode`, có 5 giá trị:

| Giá trị | Ý nghĩa | Được bật khi nào |
|---|---|---|
| `'none'` | Bấm bản đồ chỉ để bỏ chọn (không làm gì đặc biệt) | Mặc định |
| `'pick_random_center'` | Bấm 1 điểm để làm **tâm ghim**, sau đó random ra 1 vị trí trong bán kính 5km quanh điểm đó — dùng khi **tạo 1 khách hàng mới** | Bấm nút "Ghim tâm vùng..." trong form Thêm khách hàng |
| `'pick_trip_destination'` | Bấm 1 điểm để làm **điểm đến chính xác** của 1 chuyến đi sắp tạo | Bấm nút "Chọn điểm đến trên bản đồ" sau khi chọn loại xe |
| `'pick_demo_center'` | Bấm 1 điểm để làm **tâm vùng sinh dữ liệu ảo hàng loạt** (+5 khách...) | Bấm nút "Ghim vùng trung tâm dữ liệu ảo" trong tab Dữ liệu ảo |
| `'pick_find_destination'` | Bấm 1 điểm để làm **nơi muốn đến** khi tìm chuyến đi ké (khác `pick_trip_destination` ở chỗ user này không tự lái, điểm đón mặc định là vị trí hiện tại của họ) | Bấm nút "Tìm chuyến đi" trên 1 khách đang `idle` |

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
| `findTripDraft` | Thông tin tạm `{userId}` khi 1 user đang giữa chừng "Tìm chuyến đi" (đang chờ click bản đồ chọn điểm muốn đến) |
| `searchRequests` | Danh sách các user đã chọn điểm đến nhưng **chưa ghép được** chuyến nào — được giữ lại để dò lại liên tục (xem mục 3, phần "Tìm chuyến đi") |
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
Đây là đoạn code chạy **lặp đi lặp lại liên tục**, giống 1 cái đồng hồ tích tắc. Interval chạy mỗi `400 / simSpeed` mili-giây (tốc độ càng cao, tích tắc càng nhanh — đây gọi là "TICK_MS"). Với **mọi chuyến đi đang `in_progress`**:

```
Với mỗi chuyến đi đang chạy:
  - Tính "mỗi tick xe nên đi được bao nhiêu waypoint" dựa trên TỔNG SỐ waypoint và etaSeconds
    (route càng dài / eta càng ngắn → mỗi tick nhảy nhiều điểm hơn; route ngắn / eta dài → nhích chậm)
  - Cộng dồn số đó vào stepProgress (số thập phân), rồi làm tròn xuống ra routeIndex mới
  - Nếu routeIndex mới CHƯA đổi so với trước (route dài, mỗi tick chưa đủ 1 điểm):
      → chỉ lưu lại stepProgress, chưa di chuyển gì cả (đây là chỗ tạo cảm giác "chạy chậm")
  - Nếu routeIndex mới đã tới đích (>= tổng số điểm - 1):
      → Đổi user (tài xế) về status 'idle', đặt vị trí = điểm đến
      → Bất kỳ khách nào còn trong slots (kể cả đang chờ đón) cũng được trả về đúng điểm đến, status 'idle'
      → Ghi log "hoàn thành! Thu nhập: ... VND"
      → Đổi trạng thái chuyến thành 'completed', dọn sạch slots
  - Ngược lại (còn đường để đi):
      → Di chuyển user (tài xế) tới waypoint mới, tính lại "heading" (hướng quay đầu xe)
      → Với từng slot có khách: nếu routeIndex mới đã chạm/đi quá dropoffIndex → TRẢ khách ở đúng điểm đó,
        dọn trống slot; nếu chưa đón (`pickedUp: false`) mà đã chạm/đi quá pickupIndex → ĐÁNH DẤU pickedUp = true
        (khách coi như đã lên xe, marker của họ sẽ ẩn đi — xem "Hiệu ứng marker" ngay dưới đây)
      → Tính lại % hoàn thành (progress)
```

> **Vì sao lại có `stepProgress` thay vì chỉ dùng `routeIndex`?** Bản đầu tiên của app cứ mỗi tick lại nhảy đúng 1 waypoint, bất kể route đó dài 10 điểm hay 200 điểm — nghĩa là 1 chuyến 1km và 1 chuyến 10km chạy xong trong cùng 1 khoảng thời gian, rất phi lý. `stepProgress` sửa việc này: số điểm cần nhảy mỗi tick được tính ra từ chính `etaSeconds` của chuyến đó, nên quãng đường càng xa / thời gian dự kiến càng lâu thì xe di chuyển càng... chậm lại đúng như đời thực, thay vì luôn nhanh như nhau.

> **Lưu ý dành cho người mới:** Đoạn code này từng có 1 lỗi (đã sửa) — khi hoàn thành chuyến, code cũ gọi lại 1 hàm riêng để tìm chuyến đi trong danh sách `trips`, nhưng danh sách đó bị "cũ" (stale) do cách JavaScript ghi nhớ biến trong 1 hàm được tạo từ lâu (gọi là *closure*). Bài học: khi bạn đang có sẵn dữ liệu mới nhất ngay trong tay (biến `trip` trong vòng lặp `.map()`), hãy dùng luôn nó, đừng đi tra cứu lại từ 1 biến ở ngoài có thể đã lỗi thời.

#### `handleCancelTrip(tripId)` / `handleForceFinishTrip(tripId)`
Hai hàm này được gọi khi người dùng bấm nút "Hủy chuyến" / "Hoàn thành ngay" trong tab Chuyến đi — tức là **can thiệp thủ công**, không cần chờ mô phỏng tự chạy tới đích. Cùng logic với vòng lặp tick ở trên nhưng chạy ngay lập tức 1 lần — kể cả khách đang ngồi trong xe cũng được trả về `idle` luôn (không bị "kẹt" trong 1 chuyến đã huỷ/xong).

#### "Tìm chuyến đi" — ghép khách vào chuyến của người khác (đi ké xe)

Đây là tính năng phức tạp nhất app, dành cho user **không tự lái** mà muốn được 1 tài xế khác (đang chạy sẵn) tiện đường chở đi. Gồm 4 phần:

**a) `handleFindTrip(user)`** — bấm nút "Tìm chuyến đi": chỉ ghi nhớ `findTripDraft = {userId}` rồi bật `mapClickMode = 'pick_find_destination'`, giống hệt cách `handleStartCreateTrip` chờ chọn điểm đến vậy — khác ở chỗ điểm này là **nơi user này muốn tới**, không phải điểm đón (điểm đón mặc định = vị trí hiện tại của họ).

**b) `findBestTripMatch(vị_trí_khách, điểm_muốn_đến, trips)`** — hàm "thuần" (không đụng state), là bộ não so khớp:
```
Với mỗi chuyến đang in_progress mà còn ghế trống:
  - Duyệt các waypoint TỪ VỊ TRÍ HIỆN TẠI của tài xế (routeIndex) trở đi,
    tìm điểm nào gần vị trí khách nhất → nếu gần nhất cũng > 500m thì bỏ qua chuyến này
  - Duyệt tiếp các waypoint SAU điểm đón đó, tìm điểm nào gần điểm khách muốn đến nhất
    → nếu > 500m thì cũng bỏ qua (chuyến này không đi ngang qua đích của khách)
  - Nếu cả 2 đều đủ gần: đây là 1 ứng viên hợp lệ, "điểm số" = tổng 2 khoảng cách
Trả về ứng viên có điểm số thấp nhất (gần nhất) trong tất cả chuyến hợp lệ, hoặc null nếu không có chuyến nào.
```
500m (`NEARBY_THRESHOLD_KM`) là ngưỡng "coi như đi ngang qua" — chỉnh hằng số này nếu muốn dễ/khó ghép hơn.

**c) Ghép "thật" — không chỉ đi ngang qua mà xe phải GHÉ ĐÚNG chỗ khách** (`insertRouteWaypoint`, `spliceRiderIntoTrip`): tìm được ứng viên xong, app không chỉ ghi nhớ "gần điểm thứ mấy" — nó **chèn thẳng toạ độ chính xác của khách** (điểm đón) và **toạ độ khách muốn tới** (điểm trả) vào ngay giữa mảng `routeWaypoints` của tài xế, ngay sau các waypoint gần nhất đã tìm ở bước (b). Vì chèn thêm 2 điểm mới vào giữa mảng, mọi `pickupIndex`/`dropoffIndex` của các khách KHÁC đã có sẵn trên xe (nếu xe 4-7 chỗ chở nhiều khách) mà đứng sau vị trí chèn đều phải **dịch lên +1, +2** cho đúng — đây là việc `insertRouteWaypoint` lo. Kết quả: đường vẽ trên bản đồ giờ có 1 đoạn rẽ thật sự ghé vào đúng nhà khách rồi mới đi tiếp, thay vì xe chỉ tình cờ lướt qua gần đó.

**d) 2 nơi gọi tới việc ghép:**
- `handleRequestTrip(userId, destination)` — chạy ngay khi vừa chọn xong điểm đến: thử ghép luôn bằng `findBestTripMatch`. Ghép được thì gọi `spliceRiderIntoTrip` luôn, đổi user thành `status: 'riding'`. Ghép **không được** thì đẩy user vào `searchRequests`, đổi status thành `'searching'` — tức là "để đó, chờ tiếp".
- Một `useEffect` khác, chạy mỗi khi `trips` đổi (nghĩa là gần như mỗi tick, hoặc mỗi khi có chuyến mới được tạo): duyệt lại **toàn bộ** `searchRequests` còn tồn đọng, thử ghép lại từng người 1 lần nữa bằng đúng `findBestTripMatch`. Đây là lý do khách "Đang tìm chuyến" không cần bấm lại nút gì — chỉ cần ngồi yên, hễ có 1 chuyến mới xuất hiện hoặc chuyến cũ chạy tới gần là tự động được ghép ngay.

Có thể huỷ tìm bất cứ lúc nào bằng nút "Hủy tìm chuyến" → `handleCancelSearchTrip` — chỉ đơn giản gỡ user đó khỏi `searchRequests` và trả `status` về `'idle'`.

#### Hiệu ứng marker — `LeafletMap.tsx` "kể chuyện" bằng hình ảnh

`LeafletMap.tsx` không tự quyết định gì cả — nó chỉ đọc `users`/`trips` mỗi khi đổi và vẽ lại marker cho đúng trạng thái hiện tại. Vài quy tắc vẽ đáng chú ý (tất cả chỉ là CSS/HTML gắn kèm marker, không ảnh hưởng tới dữ liệu):

- **User đang `searching`**: marker có 1 vòng tròn tím nhấp nháy (CSS `animate-ping`) bao quanh — để nhận ra ngay ai đang chờ ghép chuyến.
- **User đang `riding` (đã ghép, đang chờ đón)**: marker có vòng nhấp nháy nhẹ màu xanh lá + tooltip đổi thành "Đang chờ xe đón".
- **User đang `riding` mà `pickedUp = true`** (đã lên xe): marker bị **ẩn hoàn toàn** khỏi bản đồ — tính bằng cách gom mọi `passengerUserId` có `pickedUp: true` trong tất cả `trips` đang chạy thành 1 danh sách "đang ngồi trong xe, khỏi vẽ".
- **Mỗi chuyến đang chạy**: ngoài đường line chính (pickup → destination), nếu chuyến đó có khách nào **đã ghép nhưng chưa đón** (`pickedUp: false`), sẽ có thêm **1 đường nét đứt mỏng màu tím** nối từ vị trí khách đó tới vị trí hiện tại của tài xế — cho biết trực quan "khách này đang chờ xe nào, xe đó đang ở đâu rồi".

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
Vòng lặp tick (mục 3) tự động chạy mỗi `400/simSpeed` mili-giây, đẩy marker xe nhích dần theo đường đã vẽ (tốc độ nhích nhanh/chậm tuỳ `etaSeconds` của chuyến, xem mục 3), thanh tiến độ tăng dần. Khi chạy hết đường, chuyến chuyển `completed`, user quay lại `idle`, và số liệu "Lịch sử hoàn thành" trong tab Chuyến đi tăng lên.

### Bước 4b — 1 khách khác muốn "đi ké" (Tìm chuyến đi)
1. Trên 1 card khách đang `idle`, bấm "Tìm chuyến đi" → `handleFindTrip` bật `mapClickMode = 'pick_find_destination'`.
2. Bản đồ hiện băng xanh "Nhấp vào bản đồ để CHỌN ĐIỂM MUỐN ĐẾN".
3. Click vào nơi muốn tới → `handleMapClickAction` gọi `handleRequestTrip(userId, điểm_đã_click)`.
4. `handleRequestTrip` thử ghép ngay bằng `findBestTripMatch` (xem mục 3):
   - **Ghép được**: `spliceRiderIntoTrip` chèn đúng vị trí khách + đúng điểm họ muốn đến vào route của tài xế đó, user chuyển `status: 'riding'`, marker vẫn hiện (đang chờ xe tới đón).
   - **Chưa ghép được**: user vào hàng chờ `searchRequests`, chuyển `status: 'searching'` — marker có vòng tròn tím nhấp nháy trên bản đồ (xem "Hiệu ứng marker" ngay dưới đây) để dễ nhận ra. Không cần làm gì thêm — hễ có chuyến mới tạo hoặc chuyến cũ chạy gần tới là được tự động ghép (xem `useEffect` dò liên tục ở mục 3).
5. Khi tài xế của chuyến đã ghép đi tới đúng điểm đón (`routeIndex` chạm `pickupIndex`): khách được đánh dấu `pickedUp = true`, marker của khách **ẩn đi** (coi như đang ngồi trong xe).
6. Khi tài xế đi tới đúng điểm khách muốn xuống (`dropoffIndex`): khách được trả về `status: 'idle'` tại đúng điểm đó, marker hiện lại.

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
| Tìm chuyến đi (đi ké) | "Tìm chuyến đi" → chọn điểm đến trên bản đồ | `handleFindTrip` rồi `handleRequestTrip` | Ghép được ngay thì `status: riding` + route tài xế được chèn thêm điểm đón/trả; chưa ghép được thì `status: searching`, vào hàng chờ `searchRequests`, tự ghép sau |
| Hủy tìm chuyến | "Hủy tìm chuyến" (khi đang `searching`) | `handleCancelSearchTrip` | Gỡ khỏi `searchRequests`, `status` về `idle` |
