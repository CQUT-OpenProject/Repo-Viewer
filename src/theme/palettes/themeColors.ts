/**
 * 主题配色方案
 *
 * 定义所有可用的主题配色，每个主题包含 light 和 dark 两种模式。
 */

export interface ThemeColorConfig {
  name: string;
  light: {
    primary: {
      main: string;
      light: string;
      dark: string;
      contrastText: string;
    };
    secondary: {
      main: string;
      light: string;
      dark: string;
      contrastText: string;
    };
  };
  dark: {
    primary: {
      main: string;
      light: string;
      dark: string;
      contrastText: string;
    };
    secondary: {
      main: string;
      light: string;
      dark: string;
      contrastText: string;
    };
  };
}

export const THEME_COLORS: ThemeColorConfig[] = [
  {
    name: "默认",
    light: {
      primary: {
        main: "#C2185B",
        light: "#FCE4EC",
        dark: "#880E4F",
        contrastText: "#FFFFFF",
      },
      secondary: {
        main: "#E91E63",
        light: "#F8BBD0",
        dark: "#AD1457",
        contrastText: "#1C1B1F",
      },
    },
    dark: {
      primary: {
        main: "#F48FB1",
        light: "#FCE4EC",
        dark: "#F06292",
        contrastText: "#880E4F",
      },
      secondary: {
        main: "#F48FB1",
        light: "#FCE4EC",
        dark: "#F06292",
        contrastText: "#3F0019",
      },
    },
  },
  {
    name: "蓝色",
    light: {
      primary: {
        main: "#0B57D0",
        light: "#D3E3FD",
        dark: "#0842A0",
        contrastText: "#FFFFFF",
      },
      secondary: {
        main: "#1976d2",
        light: "#E3F2FD",
        dark: "#175cb9",
        contrastText: "#1C1B1F",
      },
    },
    dark: {
      primary: {
        main: "#A8C7FA",
        light: "#D3E3FD",
        dark: "#7AACF9",
        contrastText: "#0842A0",
      },
      secondary: {
        main: "#90CAF9",
        light: "#E3F2FD",
        dark: "#64B5F6",
        contrastText: "#002159",
      },
    },
  },
  {
    name: "绿色",
    light: {
      primary: {
        main: "#146C2E",
        light: "#CDEECD",
        dark: "#0C4819",
        contrastText: "#FFFFFF",
      },
      secondary: {
        main: "#2E7D32",
        light: "#E8F5E9",
        dark: "#1B5E20",
        contrastText: "#1C1B1F",
      },
    },
    dark: {
      primary: {
        main: "#86D993",
        light: "#CDEECD",
        dark: "#65C874",
        contrastText: "#0C4819",
      },
      secondary: {
        main: "#81C784",
        light: "#E8F5E9",
        dark: "#66BB6A",
        contrastText: "#052e10",
      },
    },
  },
  {
    name: "紫色",
    light: {
      primary: {
        main: "#7B1FA2",
        light: "#E9D8FD",
        dark: "#4A0072",
        contrastText: "#FFFFFF",
      },
      secondary: {
        main: "#9C27B0",
        light: "#F3E5F5",
        dark: "#6A0080",
        contrastText: "#1C1B1F",
      },
    },
    dark: {
      primary: {
        main: "#D0A9F5",
        light: "#E9D8FD",
        dark: "#C17EF3",
        contrastText: "#4A0072",
      },
      secondary: {
        main: "#CE93D8",
        light: "#F3E5F5",
        dark: "#BA68C8",
        contrastText: "#29003B",
      },
    },
  },
  {
    name: "橙色",
    light: {
      primary: {
        main: "#F25C00",
        light: "#FDC2A9",
        dark: "#B72500",
        contrastText: "#FFFFFF",
      },
      secondary: {
        main: "#FF5722",
        light: "#FFCCBC",
        dark: "#E64A19",
        contrastText: "#1C1B1F",
      },
    },
    dark: {
      primary: {
        main: "#FFB59C",
        light: "#FFDBCC",
        dark: "#FF8A65",
        contrastText: "#B72500",
      },
      secondary: {
        main: "#FF8A65",
        light: "#FFCCBC",
        dark: "#FF7043",
        contrastText: "#330900",
      },
    },
  },
  {
    name: "红色",
    light: {
      primary: {
        main: "#B31412",
        light: "#FFDAD6",
        dark: "#8C0009",
        contrastText: "#FFFFFF",
      },
      secondary: {
        main: "#F44336",
        light: "#FFEBEE",
        dark: "#D32F2F",
        contrastText: "#1C1B1F",
      },
    },
    dark: {
      primary: {
        main: "#FFACA8",
        light: "#FFDAD6",
        dark: "#FF897A",
        contrastText: "#8C0009",
      },
      secondary: {
        main: "#EF9A9A",
        light: "#FFEBEE",
        dark: "#E57373",
        contrastText: "#4B0000",
      },
    },
  },
  {
    name: "青色",
    light: {
      primary: {
        main: "#018786",
        light: "#A7F0EC",
        dark: "#005B5B",
        contrastText: "#FFFFFF",
      },
      secondary: {
        main: "#00BCD4",
        light: "#E0F7FA",
        dark: "#0097A7",
        contrastText: "#1C1B1F",
      },
    },
    dark: {
      primary: {
        main: "#70EFDE",
        light: "#A7F0EC",
        dark: "#00CFBE",
        contrastText: "#005B5B",
      },
      secondary: {
        main: "#80DEEA",
        light: "#E0F7FA",
        dark: "#4DD0E1",
        contrastText: "#003544",
      },
    },
  },
];
