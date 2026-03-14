/**
 * 全局常量定义模块
 *
 * 集中定义应用级别的常量配置，所有常量都从配置系统中获取，
 * 确保单点配置、多处使用的一致性。
 *
 * @module constants
 */

import { getSiteConfig } from "../config";

/**
 * 网站标题
 *
 * 从站点配置中获取的应用主标题，用于浏览器标签、页面头部显示等。
 */
export const SITE_TITLE = getSiteConfig().title;
