# VKU · Sinh viên

Vite + React + TypeScript, Workbox `injectManifest`, Dexie và Capacitor Android. Giao diện tuân theo `../AGENTS.md`: Be Vietnam Pro được đóng gói cục bộ, một màu nhấn navy, icon Lucide, nhận diện bằng chữ, không hero/gradient/đổ bóng.

## Chạy trên máy

Yêu cầu Node.js 22.12+ và npm. Từ thư mục `student-pwa`:

```powershell
npm ci
npm run dev
```

Dev mặc định tại `http://localhost:5173`. **Kiểm tra Service Worker bằng bản build**, vì chế độ dev không đăng ký SW:

```powershell
npm run build
npm run preview -- --port 5173 --strictPort
```

Dừng dev server trước khi chạy preview cùng cổng. SW chỉ chạy trên localhost hoặc HTTPS. Giữ preview server chạy trong suốt kịch bản offline/online.

## Kiểm tra offline bằng DevTools

1. Mở `http://localhost:5173` khi có mạng. Chờ lịch xuất hiện. Mở **Điểm số** một lần để cache điểm rồi quay lại **Lịch học**.
2. F12 → **Application → Service Workers**. Chờ `sw.js` có trạng thái **activated and is running**; reload một lần để trang được SW quản lý. Không bật “Bypass for network” hoặc “Update on reload”.
3. Bật **Offline** trong phần Service Workers. Reload: giao diện, font và lịch đã lưu vẫn xuất hiện; có thông báo ngoại tuyến.
4. Chọn **Điểm danh** tại môn Lập trình Web. Ngay tại buổi học hiện **Chờ đồng bộ**; header hiện **Đang chờ 1 mục**. Có thể đánh dấu thêm buổi khác để kiểm tra FIFO.
5. Application → **IndexedDB → vku-student → syncQueue**, bấm Refresh: thấy `id`, `method`, `url`, `body`, `createdAt`, `retries`. Reload trang khi offline: mục đang chờ vẫn còn.
6. Bỏ chọn **Offline**. Chờ header chuyển sang **Đã đồng bộ**, buổi học thành **Đã điểm danh**; Refresh `syncQueue` thấy rỗng. API mock trả kết quả thực qua HTTP, không giả thành công khi mất mạng.
7. Mở `http://localhost:5173/api/_mock/events` để xem biên nhận mock: mỗi `id` chỉ xuất hiện một lần, theo thứ tự gửi.

Nếu DevTools chỉ ngắt request nhưng `navigator.onLine` không đổi, request vẫn được giữ trong hàng đợi khi thất bại. Khi bỏ Offline, cơ chế thử lại trong trang sẽ xả trong tối đa khoảng 60 giây; có thể bấm **Thử lại** ở header. Chromium cũng cho phép nhập `sync-events` trong Application → Service Workers → Background Sync và bấm **Sync** để gọi SW trực tiếp.

Safari/iOS không hỗ trợ Background Sync: giữ app mở khi nối mạng lại, hoặc mở lại app. Listener `window.online`, lúc app trở lại foreground và retry timer sẽ gửi trực tiếp. Không cam kết đồng bộ khi app iOS đã đóng.

Lần truy cập đầu tiên phải có mạng để cài SW và tải dữ liệu. Điểm chưa từng xem sẽ có trạng thái lỗi/rỗng rõ ràng khi offline. Không xóa site data khi còn mục chưa đồng bộ.

## Các phần đã triển khai

- **Phần 1:** `src/sw.ts` precache app shell/font/icon; Cache-First cho JS/CSS/font/ảnh; Network-First cho `GET /grades/me` với timeout 3 giây. Navigation trả shell đã cache khi offline.
- **Phần 2:** `src/lib/db.ts` có đúng hai bảng `timetable`, `syncQueue`. Lịch đọc Dexie trước, sau đó tải API khi có mạng. Cập nhật lịch giữ nguyên thao tác chưa đồng bộ.
- **Phần 3:** mọi POST/PUT đi qua hàng đợi bền vững trước khi gửi. `src/lib/syncQueue.ts` dùng chung cho trang và SW; lỗi tăng `retries`, giữ dữ liệu và dừng ở mục lỗi để không đảo thứ tự. UI hiện trạng thái tại từng buổi học và header. `sync-events` đăng ký qua `navigator.serviceWorker.ready`; thiếu API này vẫn có fallback.
- **Phần 4:** đã chạy `cap init` và `cap add android`, app ID `vn.edu.vku.student`, webDir `dist`. Chưa build APK, chưa kiểm tra trên Android Studio hoặc thiết bị thật.

### Tránh trùng và thử lại

Một transaction IndexedDB nhận quyền xử lý mục đầu hàng đợi trong 30 giây, dùng được giữa nhiều tab và SW. HTTP timeout là 10 giây. Worker bị đóng đột ngột thì lease hết hạn và được lấy lại. Cùng một lần điểm danh không tạo hai mục khi bấm lặp.

Mỗi mục giữ nguyên UUID làm header `Idempotency-Key` qua tất cả lần thử. Mock ghi nhận và trả lại cùng biên nhận cho UUID đã xử lý. **Backend thật phải lưu khóa idempotency cùng kết quả trong transaction**: nếu server đã ghi nhưng response bị mất, client bắt buộc gửi lại; client đơn lẻ không bảo đảm “exactly once”. Retry trong trang tăng thời gian chờ, tối đa 60 giây; lỗi không làm mất mục. Background Sync do trình duyệt quyết định lịch chạy.

## Mock và chuyển sang backend thật

Mặc định `VITE_API_URL=/api`, `VITE_USE_MOCK=true`, không cần tạo `.env`. Có thể sao chép `.env.example` thành `.env.local` (đã được gitignore).

`src/lib/mock.ts` là HTTP middleware cho Vite dev/preview. Dữ liệu mẫu: Nguyễn Minh Anh, MSSV 23IT112, lớp 23IT2. Trạng thái backend mock chỉ giữ trong RAM của server; Dexie trên thiết bị tồn tại qua reload. Middleware không nằm trong bundle và **không chạy khi chỉ host thư mục dist hoặc đóng gói APK**.

Toàn bộ `fetch` của ứng dụng nằm ở **`src/lib/api.ts`**, kể cả gửi hàng đợi. Workbox tự quản lý request cache của nó. Khi có backend thật:

```dotenv
VITE_API_URL=https://api.example.edu.vn/student
VITE_USE_MOCK=false
```

Chỉnh đường dẫn, xác thực và mapping response tại `src/lib/api.ts`, rồi build lại. Chờ xả hết hàng đợi trước khi đổi base URL vì từng mục lưu URL tại lúc tạo.

| Endpoint mock                          | Dữ liệu                                                       |
| -------------------------------------- | ------------------------------------------------------------- |
| `GET /api/timetable`                   | `TimetableEntry[]` trong `db.ts`                              |
| `GET /api/grades/me`                   | `{ course, credits, score }[]`                                |
| `POST /api/attendance` (cũng nhận PUT) | `{ studentId, lessonId, attended }`, header `Idempotency-Key` |

Backend hiện có `/ai/ask`, `/test-hybrid-search`, `/test-webhook` và `/`; **chưa có ba endpoint học vụ ở trên**. Không sửa backend và không coi endpoint mock là API đã triển khai. Xác thực, phân vùng cache/DB theo tài khoản, xóa cache khi đăng xuất cần được tích hợp trước khi dùng nhiều sinh viên thật trên cùng thiết bị. Hiện đây là demo một sinh viên.

## Kiểm thử

Kết quả đã chạy trong quá trình triển khai: build thành công, 7 unit test và 9 test trình duyệt đạt; `cap init`, `cap add android` và `cap sync android` thành công. Đã xem giao diện desktop theo AGENTS.md; dừng kiểm tra trình duyệt tiếp theo theo yêu cầu của bạn. Chưa kiểm tra Safari/iOS hoặc Android thật; fallback được kiểm thử bằng cách tắt API Background Sync trên Edge.

`npm audit` sau khi cài Capacitor báo 3 cảnh báo mức moderate trong chuỗi dependency công cụ build iOS (`@capacitor/cli → xcode → uuid`); không nằm trong bundle web. Chưa ép nâng/hạ dependency xuyên phiên bản để tránh làm hỏng cấu hình Capacitor.

```powershell
npm test
npm run build
npm run test:browser
```

Vitest dùng `fake-indexeddb` kiểm tra FIFO, lỗi/retry, đồng thời giữa hai connection, lease hết hạn, idempotency, bấm trùng và dữ liệu qua đóng/mở DB. Playwright chạy Edge sẵn có trên máy, tự mở preview tại cổng 4173, kiểm tra offline reload, Dexie trước API chậm, cache điểm timeout 3 giây, FIFO online/offline, fallback không có Background Sync, lỗi và sync event trong SW khi trang bị đóng băng. Máy không có Edge có thể đổi `channel` trong `playwright.config.ts` sau khi cài browser Playwright.

Rollup được dùng qua package WebAssembly chính thức vì Windows Application Control trên máy này chặn native binary của Rollup. Không thay đổi chính sách bảo mật Windows.

## Build APK sau khi cài Android Studio

1. Cài Android Studio, Android SDK/platform theo `android/variables.gradle` (hiện compile/target SDK 36) và JDK phù hợp với Gradle/Capacitor đang dùng. Mở SDK Manager để tải các thành phần còn thiếu.
2. Cấu hình `VITE_API_URL` thành **URL HTTPS truy cập được từ thiết bị**, `VITE_USE_MOCK=false`. Backend cần cho phép origin/CORS của Capacitor. `/api` tương đối và middleware mock của Vite không phải backend trong APK.
3. Trong `student-pwa`:

   ```powershell
   npm run build
   npx cap sync android
   npx cap open android
   ```

4. Chờ Gradle Sync trong Android Studio. Dùng **Build → Build Bundle(s) / APK(s) → Build APK(s)** (tên menu có thể thay đổi theo phiên bản), hoặc terminal:

   ```powershell
   cd android
   .\gradlew.bat assembleDebug
   ```

5. APK debug nằm ở `android/app/build/outputs/apk/debug/app-debug.apk`. Bản phát hành cần signed APK/AAB và keystore riêng. Không commit keystore hoặc `local.properties`.

Sau mỗi thay đổi web, chạy lại `npm run build` rồi `npx cap sync android`. SW web không được đăng ký trong Capacitor để tránh ảnh hưởng native bridge; shell đã được đóng gói, Dexie và đồng bộ lúc app đang mở vẫn dùng cùng logic.

**Build iOS cần macOS + Xcode**; trên macOS cài `@capacitor/ios`, chạy `npx cap add ios`, build web, `npx cap sync ios`, `npx cap open ios`. Thư mục iOS chưa được tạo trong yêu cầu này.

Tài liệu: [Vite PWA injectManifest](https://vite-pwa-org.netlify.app/guide/inject-manifest), [Dexie transactions](<https://dexie.org/docs/Dexie/Dexie.transaction()>), [Capacitor workflow](https://capacitorjs.com/docs/basics/workflow).

## Các màn hình nghiệp vụ

Xem [hướng dẫn tích hợp frontend](../FRONTEND_INTEGRATION.md) để nối backend Linux, đối chiếu API và kiểm tra từng luồng.

