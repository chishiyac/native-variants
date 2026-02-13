import type {
  FlexStyle,
  ImageStyle,
  StyleProp,
  TextStyle,
  ViewStyle,
} from "react-native";

/**
 * Base style type that covers all React Native style types.
 */
type BaseStyle = ViewStyle | TextStyle | ImageStyle | FlexStyle;

/**
 * Animated style type compatible with react-native-reanimated.
 * Allows for animated values in style properties.
 */
type AnimatedStyle<T> = {
  [K in keyof T]: T[K] | { value: T[K] };
};

/**
 * Combined style input type that accepts:
 * - Regular React Native styles (ViewStyle, TextStyle, etc.)
 * - Animated styles from react-native-reanimated
 * - Partial style objects
 * - Style arrays
 * - null/undefined values
 */
type StyleInput =
  | StyleProp<BaseStyle>
  | AnimatedStyle<BaseStyle>
  | Partial<BaseStyle>
  | Record<string, unknown>
  | null
  | undefined;

/**
 * Flattens a potentially nested style into an array of style objects.
 * Handles arrays, nested arrays, and single style objects.
 *
 * @template T - The style type
 * @param style - The style to flatten
 * @returns An array of flattened style objects
 */
function flattenStyle<T>(style: StyleProp<T> | null | undefined): T[] {
  if (!style) return [];

  if (Array.isArray(style)) {
    const result: T[] = [];
    for (let i = 0; i < style.length; i++) {
      const item = style[i];
      if (item) {
        if (Array.isArray(item)) {
          // Handle nested arrays
          const nested = flattenStyle(item as StyleProp<T>);
          for (let j = 0; j < nested.length; j++) {
            result.push(nested[j] as T);
          }
        } else {
          result.push(item as T);
        }
      }
    }
    return result;
  }

  return [style as T];
}

/**
 * Merges multiple style objects into a single style object.
 * Optimized for performance with early returns and efficient iteration.
 *
 * @template T - The output style type
 * @param styles - Array of styles to merge
 * @returns A single merged style object
 */
function mergeStyles<T extends BaseStyle>(styles: unknown[]): T {
  if (styles.length === 0) return {} as T;
  if (styles.length === 1 && styles[0] && typeof styles[0] === "object") {
    return styles[0] as T;
  }

  const result: Record<string, unknown> = {};

  for (let i = 0; i < styles.length; i++) {
    const style = styles[i];
    if (!style || typeof style !== "object") continue;

    const keys = Object.keys(style);
    for (let j = 0; j < keys.length; j++) {
      const key = keys[j];
      const value = (style as Record<string, unknown>)[key];
      if (value !== undefined) {
        result[key] = value;
      }
    }
  }

  return result as T;
}

/**
 * Combines multiple style objects into a single merged style.
 * Supports React Native StyleProp, animated styles from react-native-reanimated,
 * and regular style objects.
 *
 * Features:
 * - Handles nested style arrays
 * - Compatible with react-native-reanimated animated styles
 * - Filters out null/undefined values
 * - Returns a properly typed style object
 *
 * @param styles - Variable number of style inputs to merge
 * @returns A single merged style object
 *
 * @example
 * ```ts
 * // Basic usage
 * const style = cn(styles.root, { padding: 16 });
 *
 * // With animated styles (react-native-reanimated)
 * const animatedStyle = useAnimatedStyle(() => ({
 *   transform: [{ translateX: translateX.value }],
 * }));
 * const style = cn(styles.wrapper, animatedStyle);
 *
 * // Multiple styles
 * const style = cn(
 *   baseStyles,
 *   conditionalStyles,
 *   { opacity: isVisible ? 1 : 0 }
 * );
 * ```
 */
export function cn<T extends BaseStyle = ViewStyle>(
  ...styles: StyleInput[]
): T {
  const flattened: unknown[] = [];

  for (let i = 0; i < styles.length; i++) {
    const style = styles[i];
    if (!style) continue;

    if (Array.isArray(style)) {
      const nested = flattenStyle(style);
      for (let j = 0; j < nested.length; j++) {
        if (nested[j]) flattened.push(nested[j]);
      }
    } else if (typeof style === "object") {
      flattened.push(style);
    }
  }

  return mergeStyles<T>(flattened);
}

/**
 * Type-safe version of cn specifically for ViewStyle.
 * Use this when you need explicit ViewStyle typing.
 *
 * @param styles - Variable number of style inputs to merge
 * @returns A merged ViewStyle object
 */
export function cnView(...styles: StyleInput[]): ViewStyle {
  return cn<ViewStyle>(...styles);
}

/**
 * Type-safe version of cn specifically for TextStyle.
 * Use this when you need explicit TextStyle typing.
 *
 * @param styles - Variable number of style inputs to merge
 * @returns A merged TextStyle object
 */
export function cnText(...styles: StyleInput[]): TextStyle {
  return cn<TextStyle>(...styles);
}

/**
 * Type-safe version of cn specifically for ImageStyle.
 * Use this when you need explicit ImageStyle typing.
 *
 * @param styles - Variable number of style inputs to merge
 * @returns A merged ImageStyle object
 */
export function cnImage(...styles: StyleInput[]): ImageStyle {
  return cn<ImageStyle>(...styles);
}
