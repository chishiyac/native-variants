import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Appearance, ColorSchemeName } from "react-native";
import type { ColorSchemeConfig } from "../types";

/**
 * Color scheme options for the theme.
 */
export type ColorScheme = "light" | "dark";

/**
 * Theme mode options.
 * - "light": Always use light theme
 * - "dark": Always use dark theme
 * - "system": Follow system preference
 */
export type ThemeMode = ColorScheme | "system";

/**
 * Theme context value interface.
 *
 * @template T - The colors type
 */
export interface ThemeContextValue<T extends Record<string, string>> {
  /** Current theme mode: "light", "dark", or "system" */
  theme: ThemeMode;
  /** Whether dark mode is active */
  isDark: boolean;
  /** Current theme colors based on color scheme */
  colors: T;
  /** Set theme mode */
  setTheme: (mode: ThemeMode) => void;
  /** Toggle between light and dark (ignores system) */
  toggle: () => void;
}

// Create context with any type to allow generic usage
const ThemeContext = createContext<ThemeContextValue<any> | undefined>(undefined);

/**
 * Props for ThemeProvider component.
 *
 * @template T - The colors type
 */
export interface ThemeProviderProps<T extends Record<string, string>> {
  /** Child components */
  children: React.ReactNode;
  /**
   * Color scheme configuration with default (light) and optional dark colors.
   * Get this from createNVA's colorScheme output.
   *
   * @example
   * ```tsx
   * const { colorScheme } = createNVA({
   *   theme: {
   *     colors: {
   *       default: { primary: "#000" },
   *       dark: { primary: "#fff" },
   *     },
   *   },
   * });
   *
   * <ThemeProvider colors={colorScheme}>
   *   <App />
   * </ThemeProvider>
   * ```
   */
  colors: ColorSchemeConfig<T>;
  /** Initial theme mode (default: "system") */
  defaultMode?: ThemeMode;
  /** Storage key for persisting theme preference (default: "native-variants-theme") */
  storageKey?: string;
}

// Try to load AsyncStorage - it's optional
type AsyncStorageLike = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

let AsyncStorage: AsyncStorageLike | null = null;
try {
  const maybeRequire = (globalThis as { require?: (id: string) => unknown }).require;
  if (typeof maybeRequire === "function") {
    const storageModule = maybeRequire(
      "@react-native-async-storage/async-storage",
    ) as { default?: AsyncStorageLike };
    AsyncStorage = storageModule.default ?? null;
  }
} catch {
  // AsyncStorage not available - storage will be disabled
}

/**
 * Resolves the actual color scheme from mode and system preference.
 */
function resolveColorScheme(
  mode: ThemeMode,
  systemScheme: ColorSchemeName | null,
): ColorScheme {
  if (mode === "system") {
    return systemScheme === "dark" ? "dark" : "light";
  }
  return mode;
}

/**
 * ThemeProvider component.
 * Provides theme context with dark/light mode support.
 *
 * **Important:** This provider requires colors to be passed explicitly.
 * Get colors from createNVA's colorScheme output.
 *
 * Storage is handled automatically via @react-native-async-storage/async-storage
 * if it's installed. Install it to enable theme persistence:
 * ```bash
 * npm install @react-native-async-storage/async-storage
 * ```
 *
 * @template T - The colors type
 *
 * @example
 * ```tsx
 * // 1. Create your theme with createNVA
 * const { theme, colorScheme, styled } = createNVA({
 *   theme: {
 *     colors: {
 *       default: {
 *         background: "#ffffff",
 *         foreground: "#000000",
 *         primary: "#3b82f6",
 *       },
 *       dark: {
 *         background: "#0a0a0a",
 *         foreground: "#ffffff",
 *         primary: "#60a5fa",
 *       },
 *     },
 *   },
 * });
 *
 * // 2. Wrap your app with ThemeProvider
 * function App() {
 *   return (
 *     <ThemeProvider colors={colorScheme} defaultMode="system">
 *       <MyApp />
 *     </ThemeProvider>
 *   );
 * }
 *
 * // 3. Use theme in components
 * function MyComponent() {
 *   const { colors, isDark, toggle, theme, setTheme } = useTheme();
 *
 *   return (
 *     <View style={{ backgroundColor: colors.background }}>
 *       <Text style={{ color: colors.foreground }}>
 *         {isDark ? "Dark Mode" : "Light Mode"}
 *       </Text>
 *       <Button onPress={toggle} title="Toggle" />
 *       <Button onPress={() => setTheme("system")} title="System" />
 *     </View>
 *   );
 * }
 * ```
 */
export function ThemeProvider<T extends Record<string, string>>({
  children,
  colors,
  defaultMode = "system",
  storageKey = "native-variants-theme",
}: ThemeProviderProps<T>) {
  const [mode, setModeState] = useState<ThemeMode>(defaultMode);
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName | null>(
    Appearance.getColorScheme() ?? null,
  );
  const [isHydrated, setIsHydrated] = useState(!AsyncStorage);

  // Load persisted mode on mount
  useEffect(() => {
    if (AsyncStorage) {
      AsyncStorage.getItem(storageKey)
        .then((storedMode: string | null) => {
          if (storedMode && (storedMode === "light" || storedMode === "dark" || storedMode === "system")) {
            setModeState(storedMode);
          }
          setIsHydrated(true);
        })
        .catch(() => {
          setIsHydrated(true);
        });
    }
  }, [storageKey]);

  // Listen to system color scheme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }: { colorScheme: ColorSchemeName | null }) => {
      setSystemScheme(colorScheme);
    });

    return () => subscription.remove();
  }, []);

  // Set mode with automatic persistence
  const setTheme = useCallback(
    (newMode: ThemeMode) => {
      setModeState(newMode);
      if (AsyncStorage) {
        AsyncStorage.setItem(storageKey, newMode).catch(() => {
          // Silently ignore storage errors
        });
      }
    },
    [storageKey],
  );

  // Toggle between light and dark
  const toggle = useCallback(() => {
    const currentScheme = resolveColorScheme(mode, systemScheme);
    const newMode: ColorScheme = currentScheme === "light" ? "dark" : "light";
    setTheme(newMode);
  }, [mode, systemScheme, setTheme]);

  // Compute context value
  const value = useMemo<ThemeContextValue<T>>(() => {
    const colorScheme = resolveColorScheme(mode, systemScheme);
    // Use dark colors if available and in dark mode, otherwise use default
    const currentColors = (colorScheme === "dark" && colors.dark) 
      ? colors.dark 
      : colors.default;
    return {
      theme: mode,
      isDark: colorScheme === "dark",
      colors: currentColors as T,
      setTheme,
      toggle,
    };
  }, [mode, systemScheme, colors, setTheme, toggle]);

  // Don't render until hydrated to prevent flash
  if (!isHydrated) {
    return null;
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access theme context.
 * Must be used within a ThemeProvider.
 *
 * Returns all theme values and controls:
 * - theme: Current theme mode ("light" | "dark" | "system")
 * - isDark: Boolean indicating if dark mode is active
 * - colors: Current theme colors (reactive to mode changes)
 * - setTheme: Function to set theme mode
 * - toggle: Function to toggle between light and dark
 *
 * @template T - The colors type
 * @returns Theme context value with colors and controls
 * @throws Error if used outside ThemeProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { theme, colors, isDark, toggle, setTheme } = useTheme<MyColors>();
 *
 *   return (
 *     <View style={{ backgroundColor: colors.background }}>
 *       <Text style={{ color: colors.foreground }}>
 *         Current mode: {theme} ({isDark ? "Dark" : "Light"})
 *       </Text>
 *       <Button onPress={toggle} title="Toggle Theme" />
 *       <Button onPress={() => setTheme("system")} title="Use System" />
 *     </View>
 *   );
 * }
 * ```
 */
export function useTheme<T extends Record<string, string>>(): ThemeContextValue<T> {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      "useTheme must be used within a ThemeProvider. " +
        "Make sure to wrap your app with <ThemeProvider colors={colorScheme}>.",
    );
  }

  return context as ThemeContextValue<T>;
}
