import type {
  Base,
  BaseWithUtils,
  ColorSchemeConfig,
  ColorsInput,
  CompoundVariant,
  CompoundVariantWithUtils,
  Config,
  ConfigWithUtils,
  DefaultVariants,
  DefaultVariantsWithUtils,
  DefineConfig,
  Styles,
  StylesWithUtils,
  UtilsConfig,
  Variants,
  VariantsWithUtils,
} from "../types";
import {
  tailwindColors,
  tailwindSpacing,
  tailwindFontSizes,
  tailwindRadii,
  tailwindShadows,
  tailwindZIndex,
  tailwindOpacity,
  tailwindLineHeights,
  tailwindFontWeights,
  tailwindLetterSpacing,
  tailwindBorderWidths,
  tailwindDurations,
} from "../tokens/default-tokens";

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
 * Type for the default tokens object.
 */
type DefaultTokens = typeof defaultTokens;

/**
 * Validates that two record types have the same keys.
 * Returns true type if valid, error message type if not.
 */
type ValidateColorKeys<
  D extends Record<string, string>,
  K extends Record<string, string>
> = Exclude<keyof K, keyof D> extends never
  ? Exclude<keyof D, keyof K> extends never
    ? true
    : { _error: "⚠️ 'dark' is missing colors that exist in 'default'"; missingInDark: Exclude<keyof D, keyof K> }
  : { _error: "⚠️ 'default' is missing colors that exist in 'dark'"; missingInDefault: Exclude<keyof K, keyof D> };

/**
 * Theme configuration input for createNVA.
 * Colors must have matching keys in default and dark.
 */
interface CreateNVATheme<
  D extends Record<string, string>,
  K extends Record<string, string>,
> {
  /** 
   * Colors configuration. Can be:
   * - Flat object: { primary: "#000", background: "#fff" } (no dark mode)
   * - Structured: { default: {...}, dark?: {...} } (with optional dark mode)
   */
  colors?: D | {
    /** Light theme colors (default) */
    default: D;
    /** Dark theme colors (optional) - should have the same keys as default */
    dark?: ValidateColorKeys<D, K> extends true ? K : ValidateColorKeys<D, K>;
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
 * Colors support light/dark mode via `default` and `dark` keys.
 * Both must have the same color keys for type safety - TypeScript will
 * error if dark is missing any keys from default or vice versa.
 *
 * Utils are style shortcuts that expand to multiple CSS properties.
 * They work like Stitches utils - you define them once and use them
 * throughout your styles.
 *
 * Tailwind CSS tokens (spacing, fontSizes, radii, etc.) are included by default.
 *
 * @template D - Default colors type (inferred from colors.default)
 * @template K - Dark colors type (must have same keys as D)
 * @template U - Utils configuration type
 *
 * @param options - Configuration options
 * @param options.theme - Theme configuration with colors (default/dark)
 * @param options.utils - Custom style utilities (like Stitches)
 * @returns An object containing the flattened theme, styled function, and utils
 *
 * @example
 * ```ts
 * const { styled, theme, colorScheme, utils } = createNVA({
 *   theme: {
 *     colors: {
 *       default: {
 *         primary: "#007AFF",
 *         background: "#FFFFFF",
 *       },
 *       dark: {
 *         primary: "#0A84FF",
 *         background: "#000000",
 *       },
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
 *       px: 16,  // → paddingLeft: 16, paddingRight: 16
 *       py: 12,  // → paddingTop: 12, paddingBottom: 12
 *     },
 *   },
 * }));
 * ```
 */
export function createNVA<
  D extends Record<string, string>,
  K extends Record<string, string> = D,
  U extends UtilsConfig = {}
>(
  options?: {
    theme?: CreateNVATheme<D, K>;
    utils?: U;
  },
) {
  const inputTheme = options?.theme;
  const inputUtils = (options?.utils ?? {}) as U;

  // Helper to detect if colors is structured (has default/dark) or flat
  function isStructuredColors(colors: any): colors is { default: Record<string, string>; dark?: Record<string, string> } {
    return colors && typeof colors === "object" && "default" in colors;
  }

  // Extract colors - handle both flat and structured formats
  let userColors: D;
  let colorSchemeConfig: ColorSchemeConfig<D> | undefined;

  if (inputTheme?.colors) {
    if (isStructuredColors(inputTheme.colors)) {
      // Structured: { default: {...}, dark?: {...} }
      userColors = inputTheme.colors.default as D;
      colorSchemeConfig = {
        default: inputTheme.colors.default as D,
        dark: inputTheme.colors.dark as D | undefined,
      };
    } else {
      // Flat: { primary: "#000", ... }
      userColors = inputTheme.colors as D;
      colorSchemeConfig = {
        default: inputTheme.colors as D,
        dark: inputTheme.colors as D, // Use same colors for dark mode
      };
    }
  } else {
    userColors = {} as D;
    colorSchemeConfig = undefined;
  }

  // Merge user colors with Tailwind colors (user colors override defaults)
  const mergedColors = {
    ...defaultTokens.palette,
    ...userColors,
  } as typeof tailwindColors & D;

  // Build the resolved theme with defaults
  type ResolvedTheme = {
    /** 
     * Colors: User-defined semantic colors merged with Tailwind palette.
     * User colors override Tailwind colors if keys conflict.
     */
    colors: typeof tailwindColors & D;
    /** Spacing scale (0, px, 0.5, 1, 2, 4, 8, etc.) - user overrides merged */
    spacing: typeof tailwindSpacing & (CreateNVATheme<D, K>["spacing"] extends Record<string, number> ? CreateNVATheme<D, K>["spacing"] : {});
    /** Font size scale (xs, sm, base, lg, xl, 2xl, etc.) - user overrides merged */
    fontSizes: typeof tailwindFontSizes & (CreateNVATheme<D, K>["fontSizes"] extends Record<string, number> ? CreateNVATheme<D, K>["fontSizes"] : {});
    /** Border radius scale (none, sm, md, lg, xl, full, etc.) - user overrides merged */
    radii: typeof tailwindRadii & (CreateNVATheme<D, K>["radii"] extends Record<string, number> ? CreateNVATheme<D, K>["radii"] : {});
    /** Shadow definitions for iOS and Android - user overrides merged */
    shadows: typeof tailwindShadows & (CreateNVATheme<D, K>["shadows"] extends Record<string, any> ? CreateNVATheme<D, K>["shadows"] : {});
    /** Z-index scale (0, 10, 20, 30, 40, 50) - user overrides merged */
    zIndex: typeof tailwindZIndex & (CreateNVATheme<D, K>["zIndex"] extends Record<string, number> ? CreateNVATheme<D, K>["zIndex"] : {});
    /** Opacity scale (0, 5, 10, ..., 95, 100) - user overrides merged */
    opacity: typeof tailwindOpacity & (CreateNVATheme<D, K>["opacity"] extends Record<string, number> ? CreateNVATheme<D, K>["opacity"] : {});
    /** Line height scale (3, 4, ..., 10, none, tight, normal, etc.) - user overrides merged */
    lineHeights: typeof tailwindLineHeights & (CreateNVATheme<D, K>["lineHeights"] extends Record<string, number | string> ? CreateNVATheme<D, K>["lineHeights"] : {});
    /** Font weight scale (thin, light, normal, medium, bold, etc.) - user overrides merged */
    fontWeights: typeof tailwindFontWeights & (CreateNVATheme<D, K>["fontWeights"] extends Record<string, string> ? CreateNVATheme<D, K>["fontWeights"] : {});
    /** Letter spacing scale (tighter, tight, normal, wide, wider, widest) - user overrides merged */
    letterSpacing: typeof tailwindLetterSpacing & (CreateNVATheme<D, K>["letterSpacing"] extends Record<string, number> ? CreateNVATheme<D, K>["letterSpacing"] : {});
    /** Border width scale (0, DEFAULT, 2, 4, 8) - user overrides merged */
    borderWidths: typeof tailwindBorderWidths & (CreateNVATheme<D, K>["borderWidths"] extends Record<string, number> ? CreateNVATheme<D, K>["borderWidths"] : {});
    /** Animation duration scale (0, 75, 100, 150, 200, 300, 500, 700, 1000) - user overrides merged */
    durations: typeof tailwindDurations & (CreateNVATheme<D, K>["durations"] extends Record<string, number> ? CreateNVATheme<D, K>["durations"] : {});
  };

  const resolvedTheme: ResolvedTheme = {
    colors: mergedColors,
    spacing: { ...defaultTokens.spacing, ...(inputTheme?.spacing ?? {}) } as any,
    fontSizes: { ...defaultTokens.fontSizes, ...(inputTheme?.fontSizes ?? {}) } as any,
    radii: { ...defaultTokens.radii, ...(inputTheme?.radii ?? {}) } as any,
    shadows: { ...defaultTokens.shadows, ...(inputTheme?.shadows ?? {}) } as any,
    zIndex: { ...defaultTokens.zIndex, ...(inputTheme?.zIndex ?? {}) } as any,
    opacity: { ...defaultTokens.opacity, ...(inputTheme?.opacity ?? {}) } as any,
    lineHeights: { ...defaultTokens.lineHeights, ...(inputTheme?.lineHeights ?? {}) } as any,
    fontWeights: { ...defaultTokens.fontWeights, ...(inputTheme?.fontWeights ?? {}) } as any,
    letterSpacing: { ...defaultTokens.letterSpacing, ...(inputTheme?.letterSpacing ?? {}) } as any,
    borderWidths: { ...defaultTokens.borderWidths, ...(inputTheme?.borderWidths ?? {}) } as any,
    durations: { ...defaultTokens.durations, ...(inputTheme?.durations ?? {}) } as any,
  };

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
  ): (props?: DefaultVariantsWithUtils<S, V, U>) => Base<S>;

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
  ): (props?: DefaultVariantsWithUtils<S, V, U>) => Base<S>;

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
  ): (props?: DefaultVariantsWithUtils<S, V, U>) => Base<S> {
    const defineConfig: DefineConfigWithUtils = (config) => config;

    const configWithUtils =
      typeof configOrFactory === "function"
        ? configOrFactory(defineConfig, resolvedTheme)
        : configOrFactory;

    // Expand utils in all style configurations
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

    return function computeStyles(
      props?: DefaultVariantsWithUtils<S, V, U>,
    ): Base<S> {
      const cacheKey = createCacheKey(props as Record<string, unknown>);

      // Check instance cache
      let configCache = instanceCache.get(configRef);
      if (configCache?.has(cacheKey)) {
        return configCache.get(cacheKey) as Base<S>;
      }

      // Resolve props with defaults
      const resolvedProps: Record<string, unknown> = {
        ...(defaultVariants as Record<string, unknown>),
      };

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
     * Colors use the default (light) scheme.
     * Use ThemeProvider to access dark mode colors.
     */
    theme: resolvedTheme,
    /**
     * The color scheme configuration with both default and dark colors.
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
