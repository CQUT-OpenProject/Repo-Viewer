import { GitHub } from "@/services/github";
import { logger } from "../logging/logger";
import axios from "axios";

/**
 * Token状态响应接口
 */
interface TokenStatusResponse {
  status: string;
  data?: {
    hasTokens: boolean;
    count: number;
  };
}

/**
 * Token状态接口
 */
interface TokenStatus {
  /** 是否有可用token */
  hasToken: boolean;
  /** token数量 */
  tokenCount: number;
  /** 是否为服务器端token */
  isServerToken: boolean;
  /** 错误信息 */
  error?: unknown;
}

/**
 * 从服务器获取GitHub Token状态
 *
 * 调用服务端API接口查询token配置情况。
 *
 * @returns Promise，解析为Token状态对象
 */
export async function fetchServerTokenStatus(): Promise<TokenStatus> {
  try {
    // 调用新添加的服务端API接口
    const response = await axios.get<TokenStatusResponse>("/api/github?action=getTokenStatus");

    const responseData = response.data;
    if (responseData.status === "success" && responseData.data !== undefined) {
      const { hasTokens, count } = responseData.data;
      return {
        hasToken: hasTokens,
        tokenCount: count,
        isServerToken: true,
      };
    }

    return { hasToken: false, tokenCount: 0, isServerToken: true };
  } catch (error) {
    logger.error("获取服务器令牌状态失败:", error);
    return { hasToken: false, tokenCount: 0, isServerToken: true, error };
  }
}

/**
 * 检查GitHub Token状态
 *
 * 检查客户端和服务端的token配置情况，并在控制台输出详细信息。
 *
 * @returns Promise，解析为包含客户端和服务端token状态的对象
 */
export async function checkTokenStatus(): Promise<{
  hasToken: boolean;
  tokenCount: number;
  clientToken: { hasToken: boolean; count: number };
  serverToken: { hasToken: boolean; tokenCount: number };
}> {
  // 获取前端token状态
  const clientTokenCount = GitHub.Auth.getTokenCount();
  const hasClientToken = GitHub.Auth.hasToken();

  // 获取服务端token状态
  let serverTokenStatus = { hasToken: false, tokenCount: 0 };

  try {
    // 检查是否为生产环境
    const isProduction = !import.meta.env.DEV;

    if (isProduction) {
      // 在生产环境中，获取服务端token状态
      serverTokenStatus = await fetchServerTokenStatus();
    }
  } catch (error) {
    logger.error("检查服务端令牌状态失败:", error);
  }

  // 结合前端和后端状态
  const combinedHasToken = hasClientToken || serverTokenStatus.hasToken;
  const tokenCount = serverTokenStatus.hasToken ? serverTokenStatus.tokenCount : clientTokenCount;

  // 记录状态
  logger.info(`=============================================`);
  logger.info(`GitHub Token状态: ${combinedHasToken ? "已配置" : "未配置"}`);
  logger.info(`Token数量: ${tokenCount.toString()}`);

  if (serverTokenStatus.hasToken) {
    logger.info(`令牌位置: 服务器端`);
  } else if (hasClientToken) {
    logger.info(`令牌位置: 客户端 (开发环境)`);
  }

  // 如果未配置token，给出提示
  if (!combinedHasToken) {
    logger.warn("未检测到GitHub Token，API搜索功能可能受限。");
    logger.warn("请考虑配置Token以获取更好的搜索体验。");
    logger.info("您可以使用以下代码在开发环境中设置临时token:");
    logger.info('setLocalToken("your_github_token_here")');
  }
  logger.info(`=============================================`);

  return {
    hasToken: combinedHasToken,
    tokenCount,
    clientToken: { hasToken: hasClientToken, count: clientTokenCount },
    serverToken: serverTokenStatus,
  };
}

/**
 * 测试GitHub API搜索功能
 *
 * 执行测试搜索以验证配置的token是否有效。
 *
 * @returns Promise，解析为测试结果（成功返回true，失败返回false）
 */
export async function testApiSearch(): Promise<boolean> {
  try {
    logger.info("正在测试GitHub API搜索...");
    const result = await GitHub.Search.searchFiles("test", "", true);
    logger.info(`搜索成功! 找到 ${result.length.toString()} 个结果`);
    logger.debug("搜索结果:", result);
    return true;
  } catch (error) {
    logger.error("GitHub API搜索测试失败:", error);
    return false;
  }
}

// 导出便捷函数，方便在控制台使用
interface WindowWithDebugFunctions extends Window {
  checkGitHubToken?: typeof checkTokenStatus;
  testGitHubSearch?: typeof testApiSearch;
}

const windowWithDebug = window as WindowWithDebugFunctions;
windowWithDebug.checkGitHubToken = checkTokenStatus;
windowWithDebug.testGitHubSearch = testApiSearch;
