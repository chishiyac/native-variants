import { createNVA } from "./lib/create-nva";
import { ThemeProvider } from "./provider/theme-provider";

// Example 1: Structured colors with dark mode
const { styled, theme, colorScheme, utils } = createNVA({
  theme: {
    colors: {
      light: {
        primary: "#3b82f6",
        background: "#ffffff",
        foreground: "#000000",
      },
      dark: {
        primary: "#60a5fa",
        background: "#000000",
        foreground: "#ffffff",
      },
    },
    // Optional: Override default spacing
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
    },
    // Optional: Add custom font sizes
    fontSizes: {
      caption: 12,
      body: 14,
      heading: 24,
    },
  },
  utils: {
    // Margin shortcuts
    mx: (value: number) => ({
      marginLeft: value,
      marginRight: value,
    }),
    my: (value: number) => ({
      marginTop: value,
      marginBottom: value,
    }),
    // Padding shortcuts
    px: (value: number) => ({
      paddingLeft: value,
      paddingRight: value,
    }),
    py: (value: number) => ({
      paddingTop: value,
      paddingBottom: value,
    }),
    // Size shortcut
    size: (value: number) => ({
      width: value,
      height: value,
    }),
    // Border shortcut
    brd: (value: number) => ({
      borderWidth: value,
      borderStyle: "solid" as const,
    }),
  },
});

// Example 2: Flat colors (no dark mode)
createNVA({
  theme: {
    colors: {
      primary: "#3b82f6",
      secondary: "#8b5cf6",
      background: "#ffffff",
    },
  },
});

// ✅ Use utils in styled!
const buttonVariants = styled((ctx, t) => ctx({
  slots: ["root", "text"],
  base: {
    root: {
      backgroundColor: t.colors.primary,
      px: 16, // → paddingLeft: 16, paddingRight: 16
      py: 12, // → paddingTop: 12, paddingBottom: 12
      borderRadius: t.radii.lg,
    },
    text: {
      color: t.colors.background,
      fontSize: t.fontSizes.base,
    },
  },
  variants: {
    size: {
      sm: {
        root: {
          px: 12,
          py: 8,
        },
        text: {
          fontSize: t.fontSizes.sm,
        },
      },
      lg: {
        root: {
          px: 24,
          py: 16,
        },
        text: {
          fontSize: t.fontSizes.lg,
        },
      },
    },
    square: {
      true: {
        root: {
          size: 48, // → width: 48, height: 48
          px: 0,
          py: 0,
        },
      },
    },
  },
  compoundVariants: [
    {
      size: "lg",
      square: true,
      css: {
        root: {
          size: 64, // Utils work in compoundVariants too!
        },
      },
    },
  ],
}));


// ✅ Get styles - size has autocomplete: "sm" | "lg"
const styles = buttonVariants({ size: "lg" });
console.log(styles.root);

// ✅ square has autocomplete: true | false (boolean)
const squareStyles = buttonVariants({ square: true });
console.log(squareStyles.root);

// ✅ Combine variants
const combined = buttonVariants({ size: "sm", square: false });
console.log(combined.root);


// ✅ Theme with all tokens + custom overrides
console.log(theme.colors.primary); // "#3b82f6" (custom)
console.log(theme.colors.blue500); // "#3b82f6" (from Tailwind)
console.log((theme.spacing).md); // 16 (custom override)
console.log(theme.spacing["4"]); // 16 (from Tailwind)
console.log((theme.fontSizes).heading); // 24 (custom)
console.log(theme.fontSizes.lg); // 18 (from Tailwind)

// ✅ Utils exported for use outside styled
console.log(utils.mx(10)); // { marginLeft: 10, marginRight: 10 }

// ✅ colorScheme ready for ThemeProvider
console.log(colorScheme); // { default: {...}, dark: {...} }

// Example usage with ThemeProvider:
// import { ThemeProvider, useTheme } from "native-variants";
// 
// <ThemeProvider colors={colorScheme} defaultMode="system">
//   <App />
// </ThemeProvider>
//
// function MyComponent() {
//   const { theme, colors, isDark, toggle, setTheme } = useTheme();
//   // theme: "light" | "dark" | "system"
//   // colors: reactive colors that change with theme
//   // isDark: boolean
//   // toggle: () => void - toggles between light/dark
//   // setTheme: (mode) => void - sets theme mode
// }


export default function Example() {
  return (
    <ThemeProvider theme={colorScheme}>
      <div>
        Click Me!
      </div>
    </ThemeProvider>
  );
}