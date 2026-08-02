import type { Config } from "../types";

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
}
