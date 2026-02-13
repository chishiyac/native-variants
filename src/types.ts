import type {
  FlexStyle,
  ImageStyle,
  TextStyle,
  TransformsStyle,
  ViewStyle,
} from "react-native";

/**
 * Combined style type that includes all React Native style properties.
 * Supports View, Text, Image, Flex, and Transform styles.
 */
export type Styles = Partial<
  ViewStyle & TextStyle & ImageStyle & FlexStyle & TransformsStyle
>;

/**
 * Base styles configuration for slots.
 * Maps slot names to their corresponding styles.
 *
 * @template S - Union type of slot names
 */
export type Base<S extends string> = Partial<Record<S, Styles>>;

/**
 * Helper type to convert string literal "true" | "false" to actual boolean type.
 * This allows users to use boolean values directly instead of string literals.
 *
 * @template T - The type to potentially convert
 */
type StringToBoolean<T> = T extends "true" | "false" ? boolean : T;

/**
 * Extract variant keys and convert boolean string literals to actual booleans.
 *
 * @template V - The variants object type
 * @template K - The key of the variant
 */
type VariantValue<V, K extends keyof V> = V[K] extends Record<string, unknown>
  ? StringToBoolean<keyof V[K]>
  : never;

/**
 * Default variants configuration.
 * Allows setting default values for each variant, supporting both
 * string literals and boolean values for true/false variants.
 *
 * @template S - Union type of slot names
 * @template V - Variants configuration type
 */
export type DefaultVariants<S extends string, V extends Variants<S>> = {
  [K in keyof V]?: VariantValue<V, K>;
};

/**
 * Compound variant configuration.
 * Allows defining styles that apply when multiple variant conditions are met.
 *
 * @template S - Union type of slot names
 * @template V - Variants configuration type
 *
 * @property css - Optional styles to apply when conditions match
 */
export type CompoundVariant<S extends string, V extends Variants<S>> = {
  css?: Partial<Record<S, Styles>>;
} & {
  [K in keyof V]?: VariantValue<V, K>;
};

/**
 * Variants configuration type.
 * Defines the structure for variant definitions with nested slot styles.
 *
 * @template S - Union type of slot names
 */
export type Variants<S extends string> = {
  [K in string]?: { [K in string]: { [key in S]?: Styles } };
};

/**
 * Mapped variants type for external consumption.
 * Used when extracting variant props from a styled component.
 *
 * @template V - Variants configuration type
 */
export type MappedVariants<V> = Partial<{
  [K in keyof V]: V[K] extends Record<string, unknown>
    ? StringToBoolean<keyof V[K]>
    : never;
}>;

/**
 * Define config function type.
 * Helper function that provides type inference for config objects.
 *
 * @template S - Union type of slot names
 * @template V - Variants configuration type
 */
export type DefineConfig = <const S extends string, V extends Variants<S>>(
  config: Config<S, V>,
) => Config<S, V>;

/**
 * Main configuration type for styled components.
 * Defines the complete structure for a styled component configuration.
 *
 * @template S - Union type of slot names
 * @template V - Variants configuration type
 *
 * @property slots - Array of slot names
 * @property base - Optional base styles for each slot
 * @property variants - Optional variant definitions
 * @property defaultVariants - Optional default variant values
 * @property compoundVariants - Optional compound variant conditions
 */
export type Config<S extends string, V extends Variants<S>> = {
  slots: S[];
  base?: Base<S>;
  variants?: V;
  defaultVariants?: DefaultVariants<S, V>;
  compoundVariants?: CompoundVariant<S, V>[];
};

/**
 * Extract variant props from a styled function.
 * Useful for creating typed component props based on variant definitions.
 *
 * @template T - The styled function type
 *
 * @example
 * ```ts
 * const buttonVariants = styled({ ... });
 * type ButtonProps = VariantProps<typeof buttonVariants>;
 * ```
 */
export type VariantProps<T extends (...args: any[]) => any> = T extends (
  props?: infer P,
) => any
  ? Partial<P>
  : never;

// ============================================================================
// Theme Types for createNVA
// ============================================================================

/**
 * Color scheme configuration with light and dark variants.
 * Dark variant is optional - if not provided, only light mode is supported.
 *
 * @template T - The color keys type
 *
 * @example
 * ```ts
 * // With dark mode
 * const colors = {
 *   light: { primary: "#000", background: "#fff" },
 *   dark: { primary: "#fff", background: "#000" }
 * };
 * 
 * // Without dark mode (same colors for both)
 * const colors = {
 *   light: { primary: "#000", background: "#fff" }
 * };
 * ```
 */
export type ColorSchemeConfig<T extends Record<string, string>> = {
  /** Light theme colors */
  light: T;
  /** Dark theme colors (optional) - if not provided, uses light colors */
  dark?: T;
};

/**
 * Input type for colors in createNVA theme.
 * Supports light/dark theme colors plus standalone colors.
 *
 * @template L - Light colors type
 *
 * @example
 * ```ts
 * {
 *   light: { primary: "#000", background: "#fff" },
 *   dark: { primary: "#fff", background: "#000" },
 *   // Standalone colors (shared across themes)
 *   black: "#000",
 *   white: "#fff",
 *   transparent: "transparent"
 * }
 * ```
 */
export type ColorsInput<L extends Record<string, string>> = {
  /** Light theme colors */
  light: L;
  /** Dark theme colors - must have exactly the same keys as light */
  dark: { [K in keyof L]: string };
  /** Standalone colors (shared across all themes) */
  [key: string]: string | L | { [K in keyof L]: string };
};

/**
 * Strict colors input that validates both directions.
 * Use this when you want TypeScript to error if either side is missing keys.
 */
export type StrictColorsInput<
  L extends Record<string, string>,
  D extends Record<string, string>
> = [keyof L] extends [keyof D]
  ? [keyof D] extends [keyof L]
    ? { light: L; dark: D }
    : { light: L; dark: "Error: dark is missing keys from light" }
  : { light: "Error: light is missing keys from dark"; dark: D };

/**
 * Theme input configuration for createNVA.
 * Colors support light/dark mode via light/dark keys plus standalone colors.
 * Extensible with custom token keys.
 *
 * @template C - Custom colors type (inferred from colors.light)
 * @template S - Spacing type
 * @template F - Font sizes type
 * @template R - Border radii type
 * @template T - Shadows type
 * @template Z - Z-index type
 * @template O - Opacity type
 * @template L - Line heights type
 * @template FW - Font weights type
 * @template LS - Letter spacing type
 * @template BW - Border widths type
 * @template D - Durations type
 */
export type ThemeInput<
  C extends Record<string, string> = Record<string, string>,
  S = any,
  F = any,
  R = any,
  T = any,
  Z = any,
  O = any,
  L = any,
  FW = any,
  LS = any,
  BW = any,
  D = any,
> = {
  /** Color scheme with light and dark variants plus standalone colors */
  colors?: ColorsInput<C>;
  /** Spacing scale tokens */
  spacing?: S;
  /** Font size scale tokens */
  fontSizes?: F;
  /** Border radius scale tokens */
  radii?: R;
  /** Shadow definition tokens */
  shadows?: T;
  /** Z-index scale tokens */
  zIndex?: Z;
  /** Opacity scale tokens */
  opacity?: O;
  /** Line height scale tokens */
  lineHeights?: L;
  /** Font weight scale tokens */
  fontWeights?: FW;
  /** Letter spacing scale tokens */
  letterSpacing?: LS;
  /** Border width scale tokens */
  borderWidths?: BW;
  /** Animation duration scale tokens */
  durations?: D;
  /** Allow custom token keys (like breakpoints, etc.) */
  [key: string]: any;
};

/**
 * Resolved theme output from createNVA.
 * Colors are flattened (default scheme is used directly).
 * Extensible with custom token keys.
 *
 * @template C - Custom colors type
 * @template S - Spacing type
 * @template F - Font sizes type
 * @template R - Border radii type
 * @template T - Shadows type
 * @template Z - Z-index type
 * @template O - Opacity type
 * @template L - Line heights type
 * @template FW - Font weights type
 * @template LS - Letter spacing type
 * @template BW - Border widths type
 * @template D - Durations type
 */
export type ThemeOutput<
  C extends Record<string, string> = Record<string, string>,
  S = any,
  F = any,
  R = any,
  T = any,
  Z = any,
  O = any,
  L = any,
  FW = any,
  LS = any,
  BW = any,
  D = any,
> = {
  /** Flattened colors (uses default/light scheme) */
  colors: C;
  /** Spacing scale tokens */
  spacing: S;
  /** Font size scale tokens */
  fontSizes: F;
  /** Border radius scale tokens */
  radii: R;
  /** Shadow definition tokens */
  shadows: T;
  /** Z-index scale tokens */
  zIndex: Z;
  /** Opacity scale tokens */
  opacity: O;
  /** Line height scale tokens */
  lineHeights: L;
  /** Font weight scale tokens */
  fontWeights: FW;
  /** Letter spacing scale tokens */
  letterSpacing: LS;
  /** Border width scale tokens */
  borderWidths: BW;
  /** Animation duration scale tokens */
  durations: D;
  /** Allow custom token keys (like breakpoints, etc.) */
  [key: string]: any;
};

/**
 * Legacy Theme type for backwards compatibility.
 * @deprecated Use ThemeInput or ThemeOutput instead
 */
export type Theme<
  C = any,
  S = any,
  F = any,
  R = any,
  T = any,
  Z = any,
  O = any,
  L = any,
  FW = any,
  LS = any,
  BW = any,
  D = any,
> = {
  colors?: C;
  spacing?: S;
  fontSizes?: F;
  radii?: R;
  shadows?: T;
  zIndex?: Z;
  opacity?: O;
  lineHeights?: L;
  fontWeights?: FW;
  letterSpacing?: LS;
  borderWidths?: BW;
  durations?: D;
  /** Allow custom token keys (like breakpoints, etc.) */
  [key: string]: any;
};

// ============================================================================
// Utils Types for createNVA
// ============================================================================

/**
 * Utility function type that takes a value and returns style properties.
 * The value type is inferred from React Native style property values.
 *
 * @template V - The value type (inferred from usage)
 *
 * @example
 * ```ts
 * // Simple util
 * const mx: UtilFunction<number> = (value) => ({
 *   marginLeft: value,
 *   marginRight: value,
 * });
 * ```
 */
export type UtilFunction<V = any> = (value: V) => Styles;

/**
 * Utils configuration object.
 * Maps util names to their corresponding functions.
 *
 * @example
 * ```ts
 * const utils = {
 *   mx: (value: number) => ({ marginLeft: value, marginRight: value }),
 *   my: (value: number) => ({ marginTop: value, marginBottom: value }),
 *   px: (value: number) => ({ paddingLeft: value, paddingRight: value }),
 *   py: (value: number) => ({ paddingTop: value, paddingBottom: value }),
 *   size: (value: number) => ({ width: value, height: value }),
 * };
 * ```
 */
export type UtilsConfig = Record<string, UtilFunction>;

/**
 * Extract the parameter type from a util function.
 */
export type UtilParamType<T> = T extends (value: infer V) => any ? V : never;

/**
 * Style properties with utils applied.
 * Combines regular styles with util-based style shortcuts.
 *
 * @template U - Utils configuration type
 *
 * @example
 * ```ts
 * // With utils: { mx: (v) => ({...}) }
 * // You can use: { mx: 10 } instead of { marginLeft: 10, marginRight: 10 }
 * ```
 */
export type StylesWithUtils<U extends UtilsConfig> = Styles & {
  [K in keyof U]?: UtilParamType<U[K]>;
};

/**
 * Base styles configuration with utils support.
 * Maps slot names to their corresponding styles including utils.
 *
 * @template S - Union type of slot names
 * @template U - Utils configuration type
 */
export type BaseWithUtils<S extends string, U extends UtilsConfig> = {
  [K in S]?: StylesWithUtils<U>;
};

/**
 * Variants configuration type with utils support.
 * Preserves the variant keys for proper type inference.
 *
 * @template S - Union type of slot names
 * @template U - Utils configuration type
 */
export type VariantsWithUtils<S extends string, U extends UtilsConfig> = {
  [VariantName in string]?: {
    [VariantValue in string]?: {
      [Slot in S]?: StylesWithUtils<U>;
    };
  };
};

/**
 * Compound variant configuration with utils support.
 *
 * @template S - Union type of slot names
 * @template V - Variants configuration type
 * @template U - Utils configuration type
 */
export type CompoundVariantWithUtils<
  S extends string,
  V extends VariantsWithUtils<S, U>,
  U extends UtilsConfig
> = {
  css?: { [K in S]?: StylesWithUtils<U> };
} & {
  [K in keyof V]?: V[K] extends Record<string, unknown>
    ? StringToBoolean<keyof V[K]>
    : never;
};

/**
 * Default variants for config with utils.
 *
 * @template S - Union type of slot names
 * @template V - Variants configuration type
 * @template U - Utils configuration type
 */
export type DefaultVariantsWithUtils<
  S extends string,
  V extends VariantsWithUtils<S, U>,
  U extends UtilsConfig
> = {
  [K in keyof V]?: V[K] extends Record<string, unknown>
    ? StringToBoolean<keyof V[K]>
    : never;
};

/**
 * Config type with utils support.
 *
 * @template S - Union type of slot names
 * @template V - Variants configuration type
 * @template U - Utils configuration type
 */
export type ConfigWithUtils<
  S extends string,
  V extends VariantsWithUtils<S, U>,
  U extends UtilsConfig
> = {
  slots: readonly S[] | S[];
  base?: BaseWithUtils<S, U>;
  variants?: V;
  defaultVariants?: DefaultVariantsWithUtils<S, V, U>;
  compoundVariants?: CompoundVariantWithUtils<S, V, U>[];
};
