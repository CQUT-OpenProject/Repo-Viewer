/**
 * 工具函数模块
 */

// 格式化工具
import * as formatHelpers from "./format/formatters";
export const format = formatHelpers;

// 日志工具
import { logger as loggerInstance } from "./logging/logger";
export const logger = loggerInstance;
export const logging = { logger: loggerInstance };

// 网络相关工具
import { getProxiedUrl } from "./network/proxyHelper";
export const network = {
  getProxiedUrl,
};

// 认证工具
import * as tokenHelper from "./auth/token-helper";
export const auth = tokenHelper;

// 错误管理工具
import { ErrorManager as ErrorManagerClass } from "./error";
import * as errorHandlerModule from "./error/errorHandler";
export const error = {
  ErrorManager: ErrorManagerClass,
  ...errorHandlerModule,
};

// PDF相关工具
import * as pdfLoading from "./pdf/pdfLoading";
import * as pdfPreviewHelper from "./pdf/pdfPreviewHelper";
export const pdf = {
  ...pdfLoading,
  ...pdfPreviewHelper,
};

// 请求管理工具
import { requestManager as requestManagerInstance } from "./request/requestManager";
export const request = {
  manager: requestManagerInstance,
};

// 缓存工具
import * as SmartCacheModule from "./cache/SmartCache";
export const cache = SmartCacheModule;

// 内容处理工具
import * as contentFilters from "./content";
export const content = contentFilters;

// 滚动工具
import * as scrollUtils from "./scroll/scrollUtils";
export const scroll = scrollUtils;

// 主题相关工具
import * as g3Curves from "@/theme/g3Curves";
export const theme = g3Curves;

// 懒加载工具
export * as lazyLoading from "./lazy-loading";

/**
 * 性能优化工具集合
 */
export const performance = {
  /**
   * 防抖函数
   *
   * 限制函数执行频率，在指定时间内多次调用只执行最后一次。
   *
   * @param func - 要防抖的函数
   * @param waitFor - 等待时间（毫秒）
   * @returns 防抖后的函数
   */
  debounce: <F extends (...args: unknown[]) => unknown>(
    func: F,
    waitFor: number,
  ): ((...args: Parameters<F>) => void) => {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    return (...args: Parameters<F>): void => {
      if (timeout !== null) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => {
        func(...args);
      }, waitFor);
    };
  },
};

export type { SmartCacheOptions } from "./cache/SmartCache";
export type { RequestOptions } from "./request/requestManager";
export type { ErrorHandlerOptions } from "./error/errorHandler";
export type { HomepageFilterConfig } from "./content";
