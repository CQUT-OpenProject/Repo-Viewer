/**
 * Tailwind CSS 配置
 *
 * 扩展配置以与 Material-UI 主题保持一致
 * 提供项目统一的设计系统变量
 */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}", "./src/index.css"],
  theme: {
    extend: {
      // 扩展颜色系统，与 Material-UI 主题保持一致
      colors: {
        // 可以根据需要添加自定义颜色
        primary: {
          light: "var(--mui-palette-primary-light, #7986cb)",
          main: "var(--mui-palette-primary-main, #3f51b5)",
          dark: "var(--mui-palette-primary-dark, #303f9f)",
        },
        secondary: {
          light: "var(--mui-palette-secondary-light, #ff4081)",
          main: "var(--mui-palette-secondary-main, #f50057)",
          dark: "var(--mui-palette-secondary-dark, #c51162)",
        },
      },
      // 扩展间距系统
      spacing: {
        18: "4.5rem", // 72px
        88: "22rem", // 352px
        128: "32rem", // 512px
      },
      // 扩展字体大小，与 Material-UI Typography 对齐
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1rem" }], // 12px
        sm: ["0.875rem", { lineHeight: "1.25rem" }], // 14px
        base: ["1rem", { lineHeight: "1.5rem" }], // 16px
        lg: ["1.125rem", { lineHeight: "1.75rem" }], // 18px
        xl: ["1.25rem", { lineHeight: "1.75rem" }], // 20px
        "2xl": ["1.5rem", { lineHeight: "2rem" }], // 24px
      },
      // 扩展阴影，与 Material-UI elevation 保持一致
      boxShadow: {
        "mui-1":
          "0px 2px 1px -1px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 1px 3px 0px rgba(0,0,0,0.12)",
        "mui-2":
          "0px 3px 1px -2px rgba(0,0,0,0.2), 0px 2px 2px 0px rgba(0,0,0,0.14), 0px 1px 5px 0px rgba(0,0,0,0.12)",
        "mui-3":
          "0px 3px 3px -2px rgba(0,0,0,0.2), 0px 3px 4px 0px rgba(0,0,0,0.14), 0px 1px 8px 0px rgba(0,0,0,0.12)",
      },
      // 扩展动画时长，与项目 G3 曲线保持一致
      transitionDuration: {
        250: "250ms",
        300: "300ms",
        350: "350ms",
      },
      // 扩展 z-index 层级
      zIndex: {
        drawer: "1200",
        modal: "1300",
        snackbar: "1400",
        tooltip: "1500",
      },
    },
  },
  plugins: [
    // 可以根据需要添加插件，例如：
    // require('@tailwindcss/forms'),
    // require('@tailwindcss/typography'),
  ],
};
