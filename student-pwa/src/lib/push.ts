// Web Push: báo khi AI chấm xong bài, kể cả khi đã đóng ứng dụng.
// Việc tự hỏi kết quả (polling) trong thẻ bài nộp vẫn giữ làm dự phòng.
import { apiUrl, request } from "./api";

export type PushState =
  | "unsupported" // trình duyệt không có Push API
  | "needs-install" // iPhone/iPad: chỉ có khi mở từ Màn hình chính
  | "denied" // người dùng đã chặn thông báo
  | "off"
  | "on";

const SCOPE = import.meta.env.BASE_URL;

const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

export const pushSupported = () =>
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

async function currentSubscription() {
  const registration = await navigator.serviceWorker.getRegistration(SCOPE);
  return (await registration?.pushManager.getSubscription()) ?? null;
}

export async function getPushState(): Promise<PushState> {
  if (!pushSupported()) return isIOS() && !isStandalone() ? "needs-install" : "unsupported";
  if (Notification.permission === "denied") return "denied";
  return (await currentSubscription()) ? "on" : "off";
}

/** Khóa VAPID dạng base64url → Uint8Array cho pushManager.subscribe. */
export function decodeKey(base64url: string) {
  const base64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

const sameKey = (a: ArrayBuffer | null, b: Uint8Array) =>
  !!a && a.byteLength === b.byteLength && new Uint8Array(a).every((v, i) => v === b[i]);

export async function enablePush(): Promise<PushState> {
  if (!pushSupported()) return getPushState();
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "off";
  const { publicKey } = await request<{ publicKey: string }>(
    apiUrl("push/vapid-public-key"),
  );
  const key = decodeKey(publicKey);
  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  // Máy chủ đổi khóa VAPID thì đăng ký cũ không dùng được nữa.
  if (subscription && !sameKey(subscription.options.applicationServerKey, key)) {
    await subscription.unsubscribe();
    subscription = null;
  }
  subscription ??= await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: key,
  });
  await request(apiUrl("push/subscriptions"), {
    method: "POST",
    body: JSON.stringify({ subscription: subscription.toJSON() }),
  });
  return "on";
}

/**
 * Tắt trên thiết bị này. Hủy đăng ký ở trình duyệt luôn chạy, kể cả khi báo máy chủ
 * thất bại: endpoint đã hủy sẽ bị máy chủ xóa ở lần gửi sau (410).
 */
export async function disablePush(): Promise<PushState> {
  if (!pushSupported()) return getPushState();
  const subscription = await currentSubscription();
  if (!subscription) return "off";
  try {
    await request(apiUrl("push/subscriptions"), {
      method: "DELETE",
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
  } finally {
    await subscription.unsubscribe();
  }
  return "off";
}
