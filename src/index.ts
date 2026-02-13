/**
 * Native Variants - A type-safe styling library for React Native
 * with Tailwind CSS inspired design tokens.
 *
 * @packageDocumentation
 */

// Core styling utilities
export { cn, cnView, cnText, cnImage } from "./lib/cn";
export { styled, createNVA, clearStyleCache } from "./lib/create-nva";
export { wq, hq, getScreenDimensions, responsiveFontSize } from "./lib/media-query";

// Context provider utilities
export { createCTX } from "./provider/create-provider";

// Theme provider and hooks
export {
  ThemeProvider,
  useTheme,
} from "./provider/theme-provider";

export type {
  ColorScheme,
  ThemeMode,
  ThemeContextValue,
  ThemeProviderProps,
} from "./provider/theme-provider";

// Type exports
export type {
  Styles,
  Base,
  DefaultVariants,
  CompoundVariant,
  Variants,
  MappedVariants,
  DefineConfig,
  Config,
  VariantProps,
  Theme,
  ThemeInput,
  ThemeOutput,
  ColorSchemeConfig,
  ColorsInput,
  // Utils types
  UtilFunction,
  UtilsConfig,
  UtilParamType,
  StylesWithUtils,
  BaseWithUtils,
  VariantsWithUtils,
  CompoundVariantWithUtils,
  DefaultVariantsWithUtils,
  ConfigWithUtils,
} from "./types";

// Utility functions
export { alpha, hexToRgba, lighten, darken } from "./utils/alpha";
export { composeText, hasTextStyles, composeView } from "./utils/compose-text";

// Default tokens (Tailwind CSS)
export {
  defaultTheme,
  extendTheme,
  // Tailwind exports
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
  tailwindMaxWidths,
  tailwindDurations,
  // Legacy exports (backwards compatibility)
  defaultColors,
  defaultSpacing,
  defaultFontSizes,
  defaultRadii,
  defaultShadows,
  defaultZIndex,
  defaultOpacity,
  defaultLineHeights,
  defaultFontWeights,
  defaultLetterSpacing,
} from "./tokens/default-tokens";

// Token types
export type {
  DefaultTheme,
  TailwindColors,
  TailwindSpacing,
  TailwindFontSizes,
  TailwindRadii,
  TailwindShadows,
  TailwindZIndex,
  TailwindOpacity,
  TailwindLineHeights,
  TailwindFontWeights,
  TailwindLetterSpacing,
  TailwindBorderWidths,
  TailwindMaxWidths,
  TailwindDurations,
  // Legacy type exports
  DefaultColors,
  DefaultSpacing,
  DefaultFontSizes,
  DefaultRadii,
  DefaultShadows,
  DefaultZIndex,
  DefaultOpacity,
  DefaultLineHeights,
  DefaultFontWeights,
  DefaultLetterSpacing,
} from "./tokens/default-tokens";
