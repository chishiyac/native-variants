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
 * Color scheme configuration with default (light) and dark variants.
 * Dark variant is optional - if not provided, only light mode is supported.
 *
 * @template T - The color keys type
 *
 * @example
 * ```ts
 * // With dark mode
 * const colors = {
 *   default: { primary: "#000", background: "#fff" },
 *   dark: { primary: "#fff", background: "#000" }
 * };
 * 
 * // Without dark mode (same colors for both)
 * const colors = {
 *   default: { primary: "#000", background: "#fff" }
 * };
 * ```
 */
export type ColorSchemeConfig<T extends Record<string, string>> = {
  /** Light theme colors (default) */
  default: T;
  /** Dark theme colors (optional) - if not provided, uses default colors */
  dark?: T;
};

/**
 * Input type for colors in createNVA theme.
 * Ensures both default and dark have identical keys.
 *
 * @template D - Default colors type
 * @template K - Dark colors type (must match default keys)
 */
export type ColorsInput<D extends Record<string, string>> = {
  /** Light theme colors (default) */
  default: D;
  /** Dark theme colors - must have exactly the same keys as default */
  dark: { [K in keyof D]: string };
};

/**
 * Strict colors input that validates both directions.
 * Use this when you want TypeScript to error if either side is missing keys.
 */
export type StrictColorsInput<
  D extends Record<string, string>,
  K extends Record<string, string>
> = [keyof D] extends [keyof K]
  ? [keyof K] extends [keyof D]
    ? { default: D; dark: K }
    : { default: D; dark: "Error: dark is missing keys from default" }
  : { default: "Error: default is missing keys from dark"; dark: K };

/**
 * Theme input configuration for createNVA.
 * Colors support light/dark mode via default/dark keys.
 *
 * @template C - Custom colors type (inferred from colors.default)
 * @template S - Spacing type
 * @template F - Font sizes type
 * @template R - Border radii type
 * @template T - Shadows type
 * @template Z - Z-index type
 * @template O - Opacity type
 * @template L - Line heights type
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
> = {
  /** Color scheme with default (light) and dark variants */
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
};

/**
 * Resolved theme output from createNVA.
 * Colors are flattened (default scheme is used directly).
 *
 * @template C - Custom colors type
 * @template S - Spacing type
 * @template F - Font sizes type
 * @template R - Border radii type
 * @template T - Shadows type
 * @template Z - Z-index type
 * @template O - Opacity type
 * @template L - Line heights type
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
> = {
  colors?: C;
  spacing?: S;
  fontSizes?: F;
  radii?: R;
  shadows?: T;
  zIndex?: Z;
  opacity?: O;
  lineHeights?: L;
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
