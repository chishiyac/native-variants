import {
  tailwindBorderWidths,
  tailwindColors,
  tailwindDurations,
  tailwindFontSizes,
  tailwindFontWeights,
  tailwindLetterSpacing,
  tailwindLineHeights,
  tailwindOpacity,
  tailwindRadii,
  tailwindShadows,
  tailwindSpacing,
  tailwindZIndex,
} from "../tokens/default-tokens";
import type {
  Base,
  BaseWithUtils,
  ColorSchemeConfig,
  CompoundVariant,
  CompoundVariantWithUtils,
  Config,
  ConfigWithUtils,
  DefaultVariants,
  DefaultVariantsWithUtils,
  Styles,
  StylesWithUtils,
  UtilsConfig,
  Variants,
  VariantsWithUtils
} from "../types";

/**
 * High-performance memoization cache using WeakMap for object keys
 * and Map for primitive keys. Optimized for React Native runtime.
 */
const styleCache = new WeakMap<object, Map<string, Base<string>>>();
const primitiveCache = new Map<string, Base<string>>();

/**
 * Creates a stable cache key from variant props.
 * Optimized for performance by avoiding JSON.stringify on simple cases.
 *
 * @param props - The variant props to create a key from
 * @returns A stable string key for caching
 */
function createCacheKey(props: Record<string, unknown> | undefined): string {
  if (!props) return "{}";

  const keys = Object.keys(props);
  if (keys.length === 0) return "{}";

  // Sort keys for consistent ordering
  keys.sort();

  let key = "";
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    const v = props[k];
    if (v !== undefined) {
      key += `${k}:${String(v)};`;
    }
  }

  return key || "{}";
}

/**
 * Normalizes a variant value to string for comparison.
 * Handles boolean-to-string conversion for true/false variant keys.
 *
 * @param value - The value to normalize
 * @returns The normalized string value
 */
function normalizeVariantValue(value: unknown): string {
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return String(value);
}

/**
 * Applies variant styles to a specific slot.
 * Iterates through variant definitions and applies matching styles.
 *
 * @template S - Union type of slot names
 * @template V - Variants configuration type
 *
 * @param slot - The slot name to apply styles to
 * @param variants - The variants configuration object
 * @param props - The current variant props
 * @returns The merged styles for the slot
 */
function applyVariant<const S extends string, V extends Variants<S>>(
  slot: S,
  variants: V,
  props: Record<string, unknown>,
): Styles {
  let style: Styles = {};

  for (const variantKey in variants) {
    if (!Object.prototype.hasOwnProperty.call(props, variantKey)) continue;

    const value = props[variantKey];
    if (value === undefined) continue;

    const variantConfig = variants[variantKey];
    if (!variantConfig) continue;

    // Normalize boolean values to string keys
    const normalizedValue = normalizeVariantValue(value);
    const styleForValue = variantConfig[normalizedValue]?.[slot];

    if (styleForValue) {
      style = { ...style, ...styleForValue };
    }
  }

  return style;
}

/**
 * Applies compound variant styles to a specific slot.
 * Evaluates compound conditions and applies matching styles.
 *
 * @template S - Union type of slot names
 * @template V - Variants configuration type
 *
 * @param slot - The slot name to apply styles to
 * @param compoundVariants - Array of compound variant configurations
 * @param props - The current variant props
 * @returns The merged compound styles for the slot
 */
function applyCompound<const S extends string, V extends Variants<S>>(
  slot: S,
  compoundVariants: CompoundVariant<S, V>[],
  props: Record<string, unknown>,
): Styles {
  let style: Styles = {};

  for (let i = 0; i < compoundVariants.length; i++) {
    const cv = compoundVariants[i];
    const { css, ...conditions } = cv;

    // Check if all conditions match
    let isMatch = true;
    for (const condKey in conditions) {
      if (condKey === "css") continue;

      const condValue = conditions[condKey as keyof typeof conditions];
      const propValue = props[condKey];

      // Normalize both values for comparison
      const normalizedCond = normalizeVariantValue(condValue);
      const normalizedProp = normalizeVariantValue(propValue);

      if (normalizedCond !== normalizedProp) {
        isMatch = false;
        break;
      }
    }

    if (isMatch && css?.[slot]) {
      style = { ...style, ...css[slot] };
    }
  }

  return style;
}

/**
 * Computes the final styles for a slot by merging base, variant, and compound styles.
 *
 * @template S - Union type of slot names
 * @template V - Variants configuration type
 *
 * @param slot - The slot name to compute styles for
 * @param base - The base styles configuration
 * @param variants - The variants configuration
 * @param compoundVariants - The compound variants array
 * @param props - The resolved variant props
 * @returns The fully merged styles for the slot
 */
function computeSlotStyles<const S extends string, V extends Variants<S>>(
  slot: S,
  base: Base<S>,
  variants: V,
  compoundVariants: CompoundVariant<S, V>[],
  props: Record<string, unknown>,
): Styles {
  const baseStyle = base?.[slot] ?? {};
  const variantStyle = applyVariant(slot, variants, props);
  const compoundStyle = applyCompound(slot, compoundVariants, props);

  return {
    ...baseStyle,
    ...variantStyle,
    ...compoundStyle,
  };
}

/**
 * Creates a styled component function with variant support.
 * Provides caching for optimal performance in React Native.
 *
 * @template S - Union type of slot names
 * @template V - Variants configuration type
 *
 * @param config - The styled component configuration
 * @returns A function that computes styles based on variant props
 *
 * @example
 * ```ts
 * const buttonStyles = styled({
 *   slots: ["root", "text"],
 *   base: {
 *     root: { padding: 16 },
 *     text: { fontSize: 14 }
 *   },
 *   variants: {
 *     size: {
 *       small: { root: { padding: 8 } },
 *       large: { root: { padding: 24 } }
 *     }
 *   },
 *   defaultVariants: {
 *     size: "small"
 *   }
 * });
 *
 * // Usage
 * const styles = buttonStyles({ size: "large" });
 * ```
 */
export function styled<const S extends string, V extends Variants<S>>(
  config: Config<S, V>,
): (props?: DefaultVariants<S, V>) => Base<S> {
  const {
    slots,
    base = {} as Base<S>,
    variants = {} as V,
    defaultVariants = {},
    compoundVariants = [],
  } = config;

  // Pre-freeze arrays for performance
  const frozenSlots = Object.freeze([...slots]);
  const frozenCompoundVariants = Object.freeze([...compoundVariants]);

  // Create a stable config reference for caching
  const configRef = { config };

  return function computeStyles(props?: DefaultVariants<S, V>): Base<S> {
    // Create cache key from props
    const cacheKey = createCacheKey(props as Record<string, unknown>);

    // Check cache first
    let configCache = styleCache.get(configRef);
    if (configCache?.has(cacheKey)) {
      return configCache.get(cacheKey) as Base<S>;
    }

    // Resolve props with defaults
    const resolvedProps: Record<string, unknown> = { ...defaultVariants };

    if (props) {
      for (const key in props) {
        const value = (props as Record<string, unknown>)[key];
        if (value !== undefined) {
          resolvedProps[key] = value;
        }
      }
    }

    // Compute styles for each slot
    const result = {} as Record<S, Styles>;

    for (let i = 0; i < frozenSlots.length; i++) {
      const slot = frozenSlots[i];
      result[slot] = computeSlotStyles(
        slot,
        base,
        variants,
        frozenCompoundVariants as CompoundVariant<S, V>[],
        resolvedProps,
      );
    }

    // Store in cache
    if (!configCache) {
      configCache = new Map();
      styleCache.set(configRef, configCache);
    }
    configCache.set(cacheKey, result as Base<string>);

    return result;
  };
}

/**
 * Default tokens from Tailwind CSS.
 * These are included by default in every theme.
 */
const defaultTokens = {
  /** @see https://tailwindcss.com/docs/customizing-colors */
  palette: tailwindColors,
  /** @see https://tailwindcss.com/docs/customizing-spacing */
  spacing: tailwindSpacing,
  /** @see https://tailwindcss.com/docs/font-size */
  fontSizes: tailwindFontSizes,
  /** @see https://tailwindcss.com/docs/border-radius */
  radii: tailwindRadii,
  /** @see https://tailwindcss.com/docs/box-shadow */
  shadows: tailwindShadows,
  /** @see https://tailwindcss.com/docs/z-index */
  zIndex: tailwindZIndex,
  /** @see https://tailwindcss.com/docs/opacity */
  opacity: tailwindOpacity,
  /** @see https://tailwindcss.com/docs/line-height */
  lineHeights: tailwindLineHeights,
  /** @see https://tailwindcss.com/docs/font-weight */
  fontWeights: tailwindFontWeights,
  /** @see https://tailwindcss.com/docs/letter-spacing */
  letterSpacing: tailwindLetterSpacing,
  /** @see https://tailwindcss.com/docs/border-width */
  borderWidths: tailwindBorderWidths,
  /** @see https://tailwindcss.com/docs/transition-duration */
  durations: tailwindDurations,
} as const;


/**
 * Extracts light colors from theme configuration.
 */
type ExtractLightColors<T> = T extends { colors: { light: infer L extends Record<string, string> } }
  ? L
  : {};

/**
 * Extracts standalone colors (top-level string values in colors object).
 */
type ExtractStandaloneColors<T> = T extends { colors: infer C }
  ? { [K in keyof C as C[K] extends string ? K : never]: C[K] & string }
  : {};

/**
 * Extracts default colors from theme configuration (light + standalone).
 */
type ExtractDefaultColors<T> = ExtractLightColors<T> & ExtractStandaloneColors<T>;

/**
 * Known theme token keys that are handled explicitly.
 */
type KnownThemeKeys = 
  | "colors"
  | "spacing"
  | "fontSizes"
  | "radii"
  | "shadows"
  | "zIndex"
  | "opacity"
  | "lineHeights"
  | "fontWeights"
  | "letterSpacing"
  | "borderWidths"
  | "durations";

/**
 * Extracts custom theme keys (anything not in the predefined set).
 */
type ExtractCustomTokens<T> = Omit<T, KnownThemeKeys>;

/**
 * Base constraint for theme configuration.
 * Allows any keys, but enforces types for known keys.
 */
interface CreateNVAThemeConstraint {
  /** 
   * Colors configuration. Can be:
   * - Flat object: { primary: "#000", background: "#fff" } (no dark mode)
   * - Structured: { light: {...}, dark?: {...}, ...standalone } (with optional dark mode and standalone colors)
   */
  colors?:
    | Record<string, string>
    | {
        /** Light theme colors */
        light: Record<string, string>;
        /** Dark theme colors (optional) - should have the same keys as light */
        dark?: Record<string, string>;
        /** Standalone colors (shared across all themes) */
        [key: string]: string | Record<string, string> | undefined;
      };
  /** Spacing scale tokens (merged with Tailwind defaults) */
  spacing?: Record<string, number>;
  /** Font size scale tokens (merged with Tailwind defaults) */
  fontSizes?: Record<string, number>;
  /** Border radius scale tokens (merged with Tailwind defaults) */
  radii?: Record<string, number>;
  /** Shadow definition tokens (merged with Tailwind defaults) */
  shadows?: Record<string, any>;
  /** Z-index scale tokens (merged with Tailwind defaults) */
  zIndex?: Record<string, number>;
  /** Opacity scale tokens (merged with Tailwind defaults) */
  opacity?: Record<string, number>;
  /** Line height scale tokens (merged with Tailwind defaults) */
  lineHeights?: Record<string, number | string>;
  /** Font weight scale tokens (merged with Tailwind defaults) */
  fontWeights?: Record<string, string>;
  /** Letter spacing scale tokens (merged with Tailwind defaults) */
  letterSpacing?: Record<string, number>;
  /** Border width scale tokens (merged with Tailwind defaults) */
  borderWidths?: Record<string, number>;
  /** Animation duration scale tokens (merged with Tailwind defaults) */
  durations?: Record<string, number>;
  /** Allow any custom keys */
  [key: string]: any;
}

/**
 * Expands utils in a style object.
 * Takes a style with potential util keys and expands them to their actual styles.
 *
 * @param style - The style object potentially containing util keys
 * @param utils - The utils configuration
 * @returns The expanded style object
 */
function expandUtils<U extends UtilsConfig>(
  style: StylesWithUtils<U> | undefined,
  utils: U,
): Styles {
  if (!style) return {};

  const result: Styles = {};

  for (const key in style) {
    const value = (style as Record<string, unknown>)[key];

    if (key in utils) {
      // This is a util - expand it
      const utilFn = utils[key];
      const expandedStyles = utilFn(value);
      Object.assign(result, expandedStyles);
    } else {
      // Regular style property
      (result as Record<string, unknown>)[key] = value;
    }
  }

  return result;
}

/**
 * Expands utils in a base styles object for all slots.
 *
 * @param base - The base styles with potential utils
 * @param utils - The utils configuration
 * @returns The expanded base styles
 */
function expandBaseUtils<S extends string, U extends UtilsConfig>(
  base: BaseWithUtils<S, U> | undefined,
  utils: U,
): Base<S> {
  if (!base) return {} as Base<S>;

  const result = {} as Record<S, Styles>;

  for (const slot in base) {
    result[slot as S] = expandUtils(base[slot as S], utils);
  }

  return result;
}

/**
 * Expands utils in variants configuration.
 *
 * @param variants - The variants with potential utils
 * @param utils - The utils configuration
 * @returns The expanded variants
 */
function expandVariantsUtils<S extends string, U extends UtilsConfig>(
  variants: VariantsWithUtils<S, U> | undefined,
  utils: U,
): Variants<S> {
  if (!variants) return {} as Variants<S>;

  const result: Record<string, Record<string, Record<string, Styles>>> = {};

  for (const variantKey in variants) {
    const variantValues = variants[variantKey];
    if (!variantValues) continue;

    result[variantKey] = {};

    for (const valueKey in variantValues) {
      const slots = variantValues[valueKey];
      if (!slots) continue;

      result[variantKey][valueKey] = {};

      for (const slot in slots) {
        result[variantKey][valueKey][slot] = expandUtils(
          (slots as Record<string, StylesWithUtils<U>>)[slot],
          utils,
        );
      }
    }
  }

  return result as Variants<S>;
}

/**
 * Expands utils in compound variants.
 *
 * @param compoundVariants - The compound variants with potential utils
 * @param utils - The utils configuration
 * @returns The expanded compound variants
 */
function expandCompoundUtils<S extends string, V extends Variants<S>, U extends UtilsConfig>(
  compoundVariants: CompoundVariantWithUtils<S, VariantsWithUtils<S, U>, U>[] | undefined,
  utils: U,
): CompoundVariant<S, V>[] {
  if (!compoundVariants) return [];

  return compoundVariants.map((cv) => {
    const { css, ...conditions } = cv;
    const expandedCss: Partial<Record<S, Styles>> = {};

    if (css) {
      for (const slot in css) {
        expandedCss[slot as S] = expandUtils(
          css[slot as S] as StylesWithUtils<U>,
          utils,
        );
      }
    }

    return {
      ...conditions,
      css: expandedCss,
    } as CompoundVariant<S, V>;
  });
}

/**
 * Creates a themed NVA (Native Variants API) instance.
 * Provides a styled function with access to theme tokens and custom utils.
 *
 * Colors support light/dark mode via `light` and `dark` keys, plus standalone colors.
 * Both light and dark must have the same color keys for type safety - TypeScript will
 * error if dark is missing any keys from light or vice versa.
 *
 * Utils are style shortcuts that expand to multiple CSS properties.
 * They work like Stitches utils - you define them once and use them
 * throughout your styles.
 *
 * Tailwind CSS tokens (spacing, fontSizes, radii, etc.) are included by default.
 *
 * @template T - Theme configuration type (inferred, preserves literal types)
 * @template U - Utils configuration type
 *
 * @param options - Configuration options
 * @param options.theme - Theme configuration with colors (light/dark) and tokens
 * @param options.utils - Custom style utilities (like Stitches)
 * @returns An object containing the flattened theme, styled function, and utils
 *
 * @example
 * ```ts
 * const { styled, theme, colorScheme, utils } = createNVA({
 *   theme: {
 *     colors: {
 *       light: {
 *         primary: "#007AFF",
 *         background: "#FFFFFF",
 *       },
 *       dark: {
 *         primary: "#0A84FF",
 *         background: "#000000",
 *       },
 *       // Standalone colors (shared across themes)
 *       black: "#000000",
 *       white: "#FFFFFF",
 *       transparent: "transparent",
 *     },
 *     fontSizes: {
 *       xxs: 10,
 *       xs: 12,
 *     },
 *     breakpoints: {
 *       sm: 640,
 *       md: 768,
 *     },
 *   },
 *   utils: {
 *     // Margin shortcuts
 *     mx: (value) => ({ marginLeft: value, marginRight: value }),
 *     my: (value) => ({ marginTop: value, marginBottom: value }),
 *     // Padding shortcuts
 *     px: (value) => ({ paddingLeft: value, paddingRight: value }),
 *     py: (value) => ({ paddingTop: value, paddingBottom: value }),
 *     // Size shortcut
 *     size: (value) => ({ width: value, height: value }),
 *   },
 * });
 *
 * // Use utils in your styles!
 * const buttonStyles = styled((ctx, t) => ctx({
 *   slots: ["root"],
 *   base: {
 *     root: {
 *       backgroundColor: t.colors.primary,
 *       fontSize: t.fontSizes.xxs, // ← Type-safe! xxs is inferred
 *       px: 16,  // → paddingLeft: 16, paddingRight: 16
 *       py: 12,  // → paddingTop: 12, paddingBottom: 12
 *     },
 *   },
 * }));
 * ```
 */
export function createNVA<
  const T extends CreateNVAThemeConstraint,
  U extends UtilsConfig = {}
>(
  options?: {
    theme?: T;
    utils?: U;
  },
) {
  const inputTheme = options?.theme;
  const inputUtils = (options?.utils ?? {}) as U;

  // Extract default and dark colors from theme config
  type DefaultColors = ExtractDefaultColors<T>;

  // Helper to detect if colors is structured (has light/dark) or flat
  function isStructuredColors(colors: any): colors is { light: Record<string, string>; dark?: Record<string, string> } {
    return colors && typeof colors === "object" && "light" in colors;
  }

  // Helper to extract standalone colors (top-level string values)
  function extractStandaloneColors(colors: any): Record<string, string> {
    const standalone: Record<string, string> = {};
    if (colors && typeof colors === "object") {
      for (const key in colors) {
        if (key !== "light" && key !== "dark" && typeof colors[key] === "string") {
          standalone[key] = colors[key];
        }
      }
    }
    return standalone;
  }

  // Extract colors - handle both flat and structured formats
  let userColors: Record<string, string>;
  let colorSchemeConfig: ColorSchemeConfig<Record<string, string>>;

  if (inputTheme?.colors) {
    if (isStructuredColors(inputTheme.colors)) {
      // Structured: { light: {...}, dark?: {...}, standalone... }
      const standaloneColors = extractStandaloneColors(inputTheme.colors);
      userColors = { ...inputTheme.colors.light, ...standaloneColors };
      colorSchemeConfig = {
        light: { ...inputTheme.colors.light, ...standaloneColors },
        dark: inputTheme.colors.dark 
          ? { ...inputTheme.colors.dark, ...standaloneColors }
          : undefined,
      };
    } else {
      // Flat: { primary: "#000", ... }
      userColors = inputTheme.colors as Record<string, string>;
      colorSchemeConfig = {
        light: inputTheme.colors as Record<string, string>,
        dark: inputTheme.colors as Record<string, string>, // Use same colors for dark mode
      };
    }
  } else {
    userColors = {};
    colorSchemeConfig = {
      light: {},
      dark: undefined,
    };
  }

  // Merge user colors with Tailwind colors (user colors override defaults)
  const mergedColors = {
    ...defaultTokens.palette,
    ...userColors,
  };

  // Build the resolved theme with defaults and user overrides
  // Each token category merges Tailwind defaults with user values
  // Using Omit to remove conflicting keys, then merging to avoid 'never' type conflicts
  type ResolvedTheme = {
    /** 
     * Colors: User-defined semantic colors merged with Tailwind palette.
     * User colors override Tailwind colors if keys conflict.
     */
    colors: Omit<typeof tailwindColors, keyof DefaultColors> & DefaultColors;
    /** Spacing scale (0, px, 0.5, 1, 2, 4, 8, etc.) - user overrides merged */
    spacing: Omit<typeof tailwindSpacing, T extends { spacing: infer S } ? keyof S : never> & (T extends { spacing: infer S } ? S : {});
    /** Font size scale (xs, sm, base, lg, xl, 2xl, etc.) - user overrides merged */
    fontSizes: Omit<typeof tailwindFontSizes, T extends { fontSizes: infer F } ? keyof F : never> & (T extends { fontSizes: infer F } ? F : {});
    /** Border radius scale (none, sm, md, lg, xl, full, etc.) - user overrides merged */
    radii: Omit<typeof tailwindRadii, T extends { radii: infer R } ? keyof R : never> & (T extends { radii: infer R } ? R : {});
    /** Shadow definitions for iOS and Android - user overrides merged */
    shadows: Omit<typeof tailwindShadows, T extends { shadows: infer SH } ? keyof SH : never> & (T extends { shadows: infer SH } ? SH : {});
    /** Z-index scale (0, 10, 20, 30, 40, 50) - user overrides merged */
    zIndex: Omit<typeof tailwindZIndex, T extends { zIndex: infer Z } ? keyof Z : never> & (T extends { zIndex: infer Z } ? Z : {});
    /** Opacity scale (0, 5, 10, ..., 95, 100) - user overrides merged */
    opacity: Omit<typeof tailwindOpacity, T extends { opacity: infer O } ? keyof O : never> & (T extends { opacity: infer O } ? O : {});
    /** Line height scale (3, 4, ..., 10, none, tight, normal, etc.) - user overrides merged */
    lineHeights: Omit<typeof tailwindLineHeights, T extends { lineHeights: infer L } ? keyof L : never> & (T extends { lineHeights: infer L } ? L : {});
    /** Font weight scale (thin, light, normal, medium, bold, etc.) - user overrides merged */
    fontWeights: Omit<typeof tailwindFontWeights, T extends { fontWeights: infer FW } ? keyof FW : never> & (T extends { fontWeights: infer FW } ? FW : {});
    /** Letter spacing scale (tighter, tight, normal, wide, wider, widest) - user overrides merged */
    letterSpacing: Omit<typeof tailwindLetterSpacing, T extends { letterSpacing: infer LS } ? keyof LS : never> & (T extends { letterSpacing: infer LS } ? LS : {});
    /** Border width scale (0, DEFAULT, 2, 4, 8) - user overrides merged */
    borderWidths: Omit<typeof tailwindBorderWidths, T extends { borderWidths: infer BW } ? keyof BW : never> & (T extends { borderWidths: infer BW } ? BW : {});
    /** Animation duration scale (0, 75, 100, 150, 200, 300, 500, 700, 1000) - user overrides merged */
    durations: Omit<typeof tailwindDurations, T extends { durations: infer D } ? keyof D : never> & (T extends { durations: infer D } ? D : {});
  } & ExtractCustomTokens<T>;

  const resolvedTheme = {
    colors: mergedColors,
    spacing: { ...defaultTokens.spacing, ...(inputTheme?.spacing ?? {}) },
    fontSizes: { ...defaultTokens.fontSizes, ...(inputTheme?.fontSizes ?? {}) },
    radii: { ...defaultTokens.radii, ...(inputTheme?.radii ?? {}) },
    shadows: { ...defaultTokens.shadows, ...(inputTheme?.shadows ?? {}) },
    zIndex: { ...defaultTokens.zIndex, ...(inputTheme?.zIndex ?? {}) },
    opacity: { ...defaultTokens.opacity, ...(inputTheme?.opacity ?? {}) },
    lineHeights: { ...defaultTokens.lineHeights, ...(inputTheme?.lineHeights ?? {}) },
    fontWeights: { ...defaultTokens.fontWeights, ...(inputTheme?.fontWeights ?? {}) },
    letterSpacing: { ...defaultTokens.letterSpacing, ...(inputTheme?.letterSpacing ?? {}) },
    borderWidths: { ...defaultTokens.borderWidths, ...(inputTheme?.borderWidths ?? {}) },
    durations: { ...defaultTokens.durations, ...(inputTheme?.durations ?? {}) },
    // Spread any custom tokens (like breakpoints) that aren't in the predefined set
    ...Object.keys(inputTheme ?? {}).reduce((acc, key) => {
      if (!["colors", "spacing", "fontSizes", "radii", "shadows", "zIndex", "opacity", "lineHeights", "fontWeights", "letterSpacing", "borderWidths", "durations"].includes(key)) {
        (acc as any)[key] = (inputTheme as any)[key];
      }
      return acc;
    }, {} as ExtractCustomTokens<T>),
  } as unknown as ResolvedTheme;

  // Store the color scheme for ThemeProvider access
  const colorScheme = colorSchemeConfig;

  // Create a stable theme cache per createNVA instance
  const instanceCache = new Map<object, Map<string, Base<string>>>();

  /**
   * Define config with utils type.
   * Helper function that provides type inference for config objects with utils support.
   */
  type DefineConfigWithUtils = <
    const S extends string,
    const V extends VariantsWithUtils<S, U>
  >(
    config: ConfigWithUtils<S, V, U>,
  ) => ConfigWithUtils<S, V, U>;

  /**
   * Creates a styled component with theme access.
   * Supports both direct config objects and factory functions.
   * Utils defined in createNVA are automatically expanded.
   *
   * @overload Direct config object
   * @param config - The styled component configuration
   * @returns A function that computes styles based on variant props
   */
  function styled<
    const S extends string,
    const V extends VariantsWithUtils<S, U>
  >(
    config: ConfigWithUtils<S, V, U>,
  ): (props?: DefaultVariantsWithUtils<S, V, U> & { theme?: Record<string, string> }) => Base<S>;

  /**
   * @overload Factory function with theme access
   * @param configFactory - A function that receives defineConfig and theme
   * @returns A function that computes styles based on variant props
   */
  function styled<
    const S extends string,
    const V extends VariantsWithUtils<S, U>
  >(
    configFactory: (
      defineConfig: DefineConfigWithUtils,
      theme: ResolvedTheme,
    ) => ConfigWithUtils<S, V, U>,
  ): (props?: DefaultVariantsWithUtils<S, V, U> & { theme?: Record<string, string> }) => Base<S>;

  function styled<
    const S extends string,
    const V extends VariantsWithUtils<S, U>
  >(
    configOrFactory:
      | ConfigWithUtils<S, V, U>
      | ((
          defineConfig: DefineConfigWithUtils,
          theme: ResolvedTheme,
        ) => ConfigWithUtils<S, V, U>),
  ): (props?: DefaultVariantsWithUtils<S, V, U> & { theme?: Record<string, string> }) => Base<S> {
    const defineConfig: DefineConfigWithUtils = (config) => config;

    // For factory functions, we need to store it for re-evaluation with theme override
    const isFactory = typeof configOrFactory === "function";
    
    // Compute initial config with default theme
    const configWithUtils =
      isFactory
        ? configOrFactory(defineConfig, resolvedTheme)
        : configOrFactory;

    // Expand utils in all style configurations (for non-factory or default theme)
    const base = expandBaseUtils(configWithUtils.base as BaseWithUtils<S, U>, inputUtils);
    const variants = expandVariantsUtils<S, U>(
      configWithUtils.variants as VariantsWithUtils<S, U>,
      inputUtils,
    );
    const compoundVariants = expandCompoundUtils<S, Variants<S>, U>(
      configWithUtils.compoundVariants as CompoundVariantWithUtils<S, VariantsWithUtils<S, U>, U>[],
      inputUtils,
    );

    const { slots, defaultVariants = {} } = configWithUtils;

    // Pre-freeze for performance
    const frozenSlots = Object.freeze([...slots]);
    const frozenCompoundVariants = Object.freeze([...compoundVariants]);

    // Create stable reference for this specific styled call
    const configRef = { id: Symbol() };

    // Theme override cache: WeakMap<themeObject, Map<variantKey, styles>>
    const themeOverrideCache = new WeakMap<object, Map<string, Base<string>>>();

    return function computeStyles(
      props?: DefaultVariantsWithUtils<S, V, U> & { theme?: Record<string, string> },
    ): Base<S> {
      // Extract theme prop if provided
      const { theme: themeOverride, ...variantProps } = props ?? {};

      // If theme override is provided and we have a factory function, re-evaluate
      if (themeOverride && isFactory) {
        const cacheKey = createCacheKey(variantProps as Record<string, unknown>);

        // Check theme override cache
        let themeCache = themeOverrideCache.get(themeOverride);
        if (themeCache?.has(cacheKey)) {
          return themeCache.get(cacheKey) as Base<S>;
        }

        // Re-evaluate factory with overridden colors
        const overriddenTheme = {
          ...resolvedTheme,
          colors: themeOverride,
        } as ResolvedTheme;

        const recomputedConfig = (configOrFactory)(defineConfig, overriddenTheme);
        
        // Expand utils for the recomputed config
        const recomputedBase = expandBaseUtils(recomputedConfig.base as BaseWithUtils<S, U>, inputUtils);
        const recomputedVariants = expandVariantsUtils<S, U>(
          recomputedConfig.variants as VariantsWithUtils<S, U>,
          inputUtils,
        );
        const recomputedCompoundVariants = expandCompoundUtils<S, Variants<S>, U>(
          recomputedConfig.compoundVariants as CompoundVariantWithUtils<S, VariantsWithUtils<S, U>, U>[],
          inputUtils,
        );

        // Resolve props with defaults
        const resolvedProps: Record<string, unknown> = {
          ...(recomputedConfig.defaultVariants as Record<string, unknown> ?? {}),
        };

        if (variantProps) {
          for (const key in variantProps) {
            const value = (variantProps as Record<string, unknown>)[key];
            if (value !== undefined && key !== "theme") {
              resolvedProps[key] = value;
            }
          }
        }

        // Compute styles for each slot
        const result = {} as Record<S, Styles>;

        for (let i = 0; i < frozenSlots.length; i++) {
          const slot = frozenSlots[i];
          result[slot] = computeSlotStyles(
            slot,
            recomputedBase as Base<S>,
            recomputedVariants,
            recomputedCompoundVariants as CompoundVariant<S, Variants<S>>[],
            resolvedProps,
          );
        }

        // Store in theme cache
        if (!themeCache) {
          themeCache = new Map();
          themeOverrideCache.set(themeOverride, themeCache);
        }
        themeCache.set(cacheKey, result as Base<string>);

        return result;
      }

      // Default path: no theme override or non-factory config
      const cacheKey = createCacheKey(variantProps as Record<string, unknown>);

      // Check instance cache
      let configCache = instanceCache.get(configRef);
      if (configCache?.has(cacheKey)) {
        return configCache.get(cacheKey) as Base<S>;
      }

      // Resolve props with defaults
      const resolvedProps: Record<string, unknown> = {
        ...(defaultVariants as Record<string, unknown>),
      };

      if (variantProps) {
        for (const key in variantProps) {
          const value = (variantProps as Record<string, unknown>)[key];
          if (value !== undefined) {
            resolvedProps[key] = value;
          }
        }
      }

      // Compute styles for each slot
      const result = {} as Record<S, Styles>;

      for (let i = 0; i < frozenSlots.length; i++) {
        const slot = frozenSlots[i];
        result[slot] = computeSlotStyles(
          slot,
          base as Base<S>,
          variants,
          frozenCompoundVariants as CompoundVariant<S, Variants<S>>[],
          resolvedProps,
        );
      }

      // Store in cache
      if (!configCache) {
        configCache = new Map();
        instanceCache.set(configRef, configCache);
      }
      configCache.set(cacheKey, result as Base<string>);

      return result;
    };
  }

  return {
    /**
     * The resolved theme object with flattened colors.
     * Colors use the light scheme by default.
     * Use ThemeProvider to access dark mode colors.
     */
    theme: resolvedTheme,
    /**
     * The color scheme configuration with both light and dark colors.
     * Pass this to ThemeProvider for dark mode support.
     */
    colorScheme,
    /**
     * Creates styled components with variant support and theme access.
     * Utils defined in createNVA are automatically expanded in styles.
     */
    styled,
    /**
     * The utils configuration for use outside of styled.
     * Useful for applying utils to inline styles.
     */
    utils: inputUtils,
  };
}

/**
 * Clears all style caches. Useful for testing or hot reloading scenarios.
 * Note: This only clears the primitive cache. WeakMap entries are
 * automatically garbage collected when their keys are no longer referenced.
 */
export function clearStyleCache(): void {
  primitiveCache.clear();
}
