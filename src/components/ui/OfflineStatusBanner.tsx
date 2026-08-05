import { useEffect, useState } from "react";
import { Alert, Snackbar } from "@mui/material";
import WifiOffIcon from "@mui/icons-material/WifiOff";

/**
 * Shows a persistent banner when the browser reports an offline network state.
 */
export function OfflineStatusBanner(): React.ReactElement {
  const [isOffline, setIsOffline] = useState(() =>
    typeof navigator !== "undefined" ? !navigator.onLine : false,
  );

  useEffect(() => {
    const handleOnline = (): void => {
      setIsOffline(false);
    };
    const handleOffline = (): void => {
      setIsOffline(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <Snackbar
      open={isOffline}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
      sx={{ top: { xs: 56, sm: 64 } }}
    >
      <Alert severity="warning" icon={<WifiOffIcon fontSize="inherit" />} sx={{ width: "100%" }}>
        当前处于离线状态，仅可浏览已加载内容和首页预缓存内容。
      </Alert>
    </Snackbar>
  );
}
