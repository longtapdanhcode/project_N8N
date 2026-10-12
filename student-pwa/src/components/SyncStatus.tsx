import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Check, Clock3, RefreshCw, AlertCircle, WifiOff } from "lucide-react";
import { db } from "../lib/db";
import { syncNow } from "../lib/sync";

export function SyncStatus({ online }: { online: boolean }) {
  const items = useLiveQuery(() => db.syncQueue.toArray());
  const [state, setState] = useState("idle");
  useEffect(() => {
    const listener = (event: Event) =>
      setState((event as CustomEvent<string>).detail);
    window.addEventListener("sync-state", listener);
    return () => window.removeEventListener("sync-state", listener);
  }, []);
  const count = items?.length || 0;
  const failed =
    online &&
    count > 0 &&
    (state === "error" || !!items?.some((item) => item.lastError));
  const label = !items
    ? "Đang đọc dữ liệu"
    : state === "syncing" && online && count
      ? "Đang đồng bộ"
      : failed
        ? `Lỗi · ${count} mục chờ`
        : count
          ? `Đang chờ ${count} mục`
          : online
            ? "Đã đồng bộ"
            : "Ngoại tuyến";
  const Icon = failed
    ? AlertCircle
    : count
      ? state === "syncing" && online
        ? RefreshCw
        : Clock3
      : online
        ? Check
        : WifiOff;
  return (
    <div className={`status ${failed ? "error" : ""}`}>
      <span role="status" aria-live="polite">
        <Icon className={state === "syncing" && count ? "spin" : ""} />
        {label}
      </span>
      {failed && (
        <button className="retry-link" onClick={() => void syncNow()}>
          Thử lại
        </button>
      )}
    </div>
  );
}
