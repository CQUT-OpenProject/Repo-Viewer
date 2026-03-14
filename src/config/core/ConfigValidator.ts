import type { Config } from "../types";
import { CONFIG_DEFAULTS } from "../constants";

/**
 * 配置验证器
 *
 * 负责验证配置的完整性和合法性
 */
export class ConfigValidator {
  /**
   * 验证完整配置
   */
  public validateConfig(config: Config): void {
    this.validateGitHubConfig(config);
    this.validateSiteConfig(config);
    this.validateSearchIndexConfig(config);
  }

  /**
   * 验证 GitHub 配置
   */
  private validateGitHubConfig(config: Config): void {
    if (config.github.repoOwner.trim() === "") {
      throw new Error("GitHub 仓库配置不完整：缺少 repoOwner");
    }

    if (config.github.repoName.trim() === "") {
      throw new Error("GitHub 仓库配置不完整：缺少 repoName");
    }

    if (config.github.repoBranch.trim() === "") {
      throw new Error("GitHub 仓库配置不完整：缺少 repoBranch");
    }
  }

  /**
   * 验证站点配置
   */
  private validateSiteConfig(config: Config): void {
    if (config.site.title.trim() === "") {
      throw new Error("站点配置不完整：缺少 title");
    }
  }

  /**
   * 验证搜索索引配置
   */
  private validateSearchIndexConfig(config: Config): void {
    const { searchIndex } = config.features;

    if (!searchIndex.enabled) {
      return;
    }

    if (!["build", "action", "off"].includes(searchIndex.generationMode)) {
      throw new Error("搜索索引配置不合法：generationMode 仅支持 build/action/off");
    }

    if (searchIndex.defaultBranch.trim() === "") {
      throw new Error("搜索索引配置不完整：缺少 defaultBranch");
    }

    if (searchIndex.manifestPath.trim() === "") {
      throw new Error("搜索索引配置不完整：缺少 manifestPath");
    }

    if (searchIndex.assetBasePath.trim() === "") {
      throw new Error("搜索索引配置不完整：缺少 assetBasePath");
    }

    if (searchIndex.refreshIntervalMs < CONFIG_DEFAULTS.SEARCH_INDEX_MIN_REFRESH_INTERVAL_MS) {
      throw new Error(
        `搜索索引配置不合法：refreshIntervalMs 不得小于 ${CONFIG_DEFAULTS.SEARCH_INDEX_MIN_REFRESH_INTERVAL_MS.toString()}ms`,
      );
    }
  }
}
