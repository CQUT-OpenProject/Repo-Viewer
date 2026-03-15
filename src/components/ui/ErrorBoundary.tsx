/**
 * 全局错误边界组件
 *
 * 捕获React组件树中的JavaScript错误并提供优雅的降级UI。
 * 支持三个层级的错误边界：页面级、功能级和组件级。
 *
 * @module ErrorBoundary
 * @see {@link ErrorManager} 错误管理器
 * @see {@link PageErrorBoundary} 页面级错误边界快捷组件
 * @see {@link FeatureErrorBoundary} 功能级错误边界快捷组件
 */

import React from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Alert,
  AlertTitle,
  Chip,
  Collapse,
} from "@mui/material";
import { g3BorderRadius, G3_PRESETS } from "@/theme/g3Curves";
import {
  ErrorOutline,
  Refresh,
  BugReport,
  Home,
  ExpandLess,
  ExpandMore,
} from "@mui/icons-material";
import { ErrorManager } from "@/utils/error";
import { isDeveloperMode } from "@/config";
import { useI18n } from "@/contexts/I18nContext";
import { buildAppPath } from "@/utils/routing/basePath";

type ErrorInfo = React.ErrorInfo;

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  retryCount: number;
}

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: (string | number)[];
  level?: "page" | "component" | "feature";
  componentName?: string;
}

export interface ErrorFallbackProps {
  error: Error;
  errorInfo: ErrorInfo;
  resetError: () => void;
  retryCount: number;
  level: "page" | "component" | "feature";
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const { onError, componentName = "Unknown" } = this.props;

    // 创建组件错误并交给ErrorManager处理
    const componentError = ErrorManager.createComponentError(
      componentName,
      error.message,
      undefined, // props在这里不容易获取
      {
        componentStack: errorInfo.componentStack,
        stack: error.stack,
        retryCount: this.state.retryCount,
      },
    );

    ErrorManager.captureError(componentError);

    // 更新状态
    this.setState({
      errorInfo,
      retryCount: this.state.retryCount + 1,
    });

    // 调用自定义错误处理器
    onError?.(error, errorInfo);
  }

  override componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    const { resetOnPropsChange, resetKeys } = this.props;
    const { hasError } = this.state;

    // 当指定的props发生变化时重置错误状态
    if (
      hasError &&
      resetOnPropsChange === true &&
      Array.isArray(resetKeys) &&
      Array.isArray(prevProps.resetKeys)
    ) {
      const hasResetKeyChanged = resetKeys.some((key, idx) => prevProps.resetKeys?.[idx] !== key);

      if (hasResetKeyChanged) {
        this.resetError();
      }
    }
  }

  resetError = (): void => {
    // 清除重置定时器
    if (this.resetTimeoutId !== null) {
      window.clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = null;
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  // 延迟重置，给用户时间看到错误信息

  toggleDetails = (): void => {
    this.setState((prevState) => ({
      showDetails: !prevState.showDetails,
    }));
  };

  reloadPage = (): void => {
    window.location.reload();
  };

  goHome = (): void => {
    window.location.href = buildAppPath();
  };

  override render(): React.ReactNode {
    const { hasError, error, errorInfo, showDetails, retryCount } = this.state;
    const { children, fallback: CustomFallback, level = "component" } = this.props;

    if (hasError && error !== null) {
      const resolvedErrorInfo: ErrorInfo = errorInfo ?? { componentStack: "" };

      // 使用自定义fallback组件
      if (typeof CustomFallback === "function") {
        return (
          <CustomFallback
            error={error}
            errorInfo={resolvedErrorInfo}
            resetError={this.resetError}
            retryCount={retryCount}
            level={level}
          />
        );
      }

      // 默认错误UI
      return (
        <DefaultErrorFallback
          error={error}
          errorInfo={resolvedErrorInfo}
          resetError={this.resetError}
          retryCount={retryCount}
          level={level}
          toggleDetails={this.toggleDetails}
          showDetails={showDetails}
          reloadPage={this.reloadPage}
          goHome={this.goHome}
        />
      );
    }

    return children;
  }
}

// 默认错误回退组件
const DefaultErrorFallback: React.FC<
  ErrorFallbackProps & {
    toggleDetails: () => void;
    showDetails: boolean;
    reloadPage: () => void;
    goHome: () => void;
  }
> = ({
  error,
  errorInfo,
  resetError,
  retryCount,
  level,
  toggleDetails,
  showDetails,
  reloadPage,
  goHome,
}) => {
  const isPageLevel = level === "page";
  const isDev = isDeveloperMode();
  const { t } = useI18n();

  const getErrorTitle = (): string => {
    switch (level) {
      case "page":
        return t("error.boundary.title.page");
      case "feature":
        return t("error.boundary.title.feature");
      default:
        return t("error.boundary.title.component");
    }
  };

  const getErrorMessage = (): string => {
    if (retryCount > 3) {
      return t("error.boundary.retryExceeded");
    }
    if (error.message !== "") {
      return error.message;
    }
    return t("error.boundary.unknownError");
  };

  return (
    <Box
      sx={{
        p: isPageLevel ? 4 : 2,
        minHeight: isPageLevel ? "50vh" : "auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Card
        sx={{
          maxWidth: isPageLevel ? 600 : 400,
          width: "100%",
          boxShadow: isPageLevel ? 3 : 1,
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={2} alignItems="center">
            {/* 错误图标和标题 */}
            <Box sx={{ textAlign: "center" }}>
              <ErrorOutline
                sx={{
                  fontSize: isPageLevel ? 64 : 48,
                  color: "error.main",
                  mb: 1,
                }}
              />
              <Typography variant={isPageLevel ? "h4" : "h6"} gutterBottom>
                {getErrorTitle()}
              </Typography>
            </Box>

            {/* 错误信息 */}
            <Alert severity="error" sx={{ width: "100%" }}>
              <AlertTitle>{t("error.boundary.details")}</AlertTitle>
              {getErrorMessage()}
            </Alert>

            {/* 重试次数显示 */}
            {retryCount > 0 && (
              <Chip
                label={t("error.boundary.retryCount", { count: retryCount })}
                color="warning"
                size="small"
              />
            )}

            {/* 操作按钮 */}
            <Stack direction="row" spacing={2} sx={{ width: "100%" }} justifyContent="center">
              <Button
                variant="contained"
                startIcon={<Refresh />}
                onClick={resetError}
                disabled={retryCount > 5}
              >
                重试
              </Button>

              {isPageLevel && (
                <>
                  <Button variant="outlined" startIcon={<Home />} onClick={goHome}>
                    回到首页
                  </Button>
                  <Button variant="outlined" onClick={reloadPage}>
                    刷新页面
                  </Button>
                </>
              )}
            </Stack>

            {/* 开发模式下的详细信息 */}
            {isDev && (
              <Box sx={{ width: "100%" }}>
                <Button
                  startIcon={showDetails ? <ExpandLess /> : <ExpandMore />}
                  onClick={toggleDetails}
                  size="small"
                  endIcon={<BugReport />}
                >
                  {showDetails ? "隐藏" : "显示"}堆栈详情
                </Button>

                <Collapse in={showDetails}>
                  <Box sx={{ mt: 2 }}>
                    <Alert severity="info">
                      <AlertTitle>错误堆栈</AlertTitle>
                      <Box
                        component="pre"
                        sx={{
                          fontSize: "0.75rem",
                          maxHeight: 200,
                          overflow: "auto",
                          backgroundColor: "grey.100",
                          p: 1,
                          borderRadius: g3BorderRadius(G3_PRESETS.card),
                          mt: 1,
                        }}
                      >
                        {error.stack}
                      </Box>
                    </Alert>

                    {errorInfo.componentStack !== "" && (
                      <Alert severity="info" sx={{ mt: 1 }}>
                        <AlertTitle>组件堆栈</AlertTitle>
                        <Box
                          component="pre"
                          sx={{
                            fontSize: "0.75rem",
                            maxHeight: 200,
                            overflow: "auto",
                            backgroundColor: "grey.100",
                            p: 1,
                            borderRadius: g3BorderRadius(G3_PRESETS.card),
                            mt: 1,
                          }}
                        >
                          {errorInfo.componentStack}
                        </Box>
                      </Alert>
                    )}
                  </Box>
                </Collapse>
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

// 页面级错误边界
export const PageErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ErrorBoundary level="page" componentName="PageLevel" resetOnPropsChange={true}>
    {children}
  </ErrorBoundary>
);

// 功能模块级错误边界
export const FeatureErrorBoundary: React.FC<{
  children: React.ReactNode;
  featureName: string;
}> = ({ children, featureName }) => (
  <ErrorBoundary level="feature" componentName={featureName} resetOnPropsChange={true}>
    {children}
  </ErrorBoundary>
);
