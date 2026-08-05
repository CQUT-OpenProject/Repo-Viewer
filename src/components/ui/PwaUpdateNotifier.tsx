import { useEffect } from "react";
import { Button } from "@mui/material";
import { useSnackbar } from "notistack";
import { registerSW } from "virtual:pwa-register";

interface PwaUpdateNotifierProps {
  enabled: boolean;
}

/**
 * Registers the service worker in production and prompts users when a new version is available.
 */
export function PwaUpdateNotifier({ enabled }: PwaUpdateNotifierProps): null {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let updateServiceWorker: ((reloadPage?: boolean) => Promise<void>) | undefined;

    updateServiceWorker = registerSW({
      immediate: true,
      onNeedRefresh() {
        enqueueSnackbar("发现新版本，刷新后即可使用最新内容。", {
          variant: "info",
          persist: true,
          action: (snackbarId) => (
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                closeSnackbar(snackbarId);
                void updateServiceWorker?.(true);
              }}
            >
              刷新
            </Button>
          ),
        });
      },
      onOfflineReady() {
        enqueueSnackbar("应用已可离线打开。", {
          variant: "success",
        });
      },
    });
  }, [closeSnackbar, enabled, enqueueSnackbar]);

  return null;
}
