import type { TextStyle } from "react-native";
import type { Styles } from "../types";

/**
 * Complete list of React Native TextStyle property keys.
 * Used to filter text-specific styles from combined style objects.
 */
const textStyleKeys: ReadonlySet<keyof TextStyle> = new Set([
  "color",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "textAlign",
  "textAlignVertical",
  "letterSpacing",
  "lineHeight",
  "textDecorationLine",
  "textDecorationColor",
  "textDecorationStyle",
  "fontFamily",
  "includeFontPadding",
  "textTransform",
  "writingDirection",
  "textShadowColor",
  "textShadowOffset",
  "textShadowRadius",
  "fontVariant",
  "userSelect",
]);

/**
 * Extracts text-specific styles from a combined style object.
 * Useful when you need to apply text styles to a Text component
 * from a style object that may contain View styles.
 *
 * @param style - The combined style object to extract from
 * @returns A new object containing only TextStyle properties
 *
 * @example
 * ```ts
 * const combinedStyles = {
 *   backgroundColor: "#fff",
 *   padding: 16,
 *   color: "#000",
 *   fontSize: 14,
 *   fontWeight: "600",
 * };
 *
 * const textStyles = composeText(combinedStyles);
 * // Result: { color: "#000", fontSize: 14, fontWeight: "600" }
 *
 * // Usage in components
 * <View style={combinedStyles}>
 *   <Text style={composeText(combinedStyles)}>Hello</Text>
 * </View>
 * ```
 */
export function composeText(style?: Styles): Partial<TextStyle> {
  if (!style) return {};

  const result: Partial<TextStyle> = {};
  const keys = Object.keys(style) as Array<Extract<keyof Styles, string>>;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (textStyleKeys.has(key as keyof TextStyle)) {
      (result as Record<string, unknown>)[key] = style[key];
    }
  }

  return result;
}

/**
 * Checks if a style object contains any text-specific styles.
 *
 * @param style - The style object to check
 * @returns True if the style contains at least one text style property
 *
 * @example
 * ```ts
 * hasTextStyles({ padding: 10 }); // false
 * hasTextStyles({ color: "red" }); // true
 * hasTextStyles({ padding: 10, fontSize: 14 }); // true
 * ```
 */
export function hasTextStyles(style?: Styles): boolean {
  if (!style) return false;

  const keys = Object.keys(style);
  for (let i = 0; i < keys.length; i++) {
    if (textStyleKeys.has(keys[i] as keyof TextStyle)) {
      return true;
    }
  }

  return false;
}

/**
 * Extracts non-text styles (View styles) from a combined style object.
 * Complement to composeText - returns everything except text styles.
 *
 * @param style - The combined style object to extract from
 * @returns A new object containing only non-TextStyle properties
 *
 * @example
 * ```ts
 * const combinedStyles = {
 *   backgroundColor: "#fff",
 *   padding: 16,
 *   color: "#000",
 *   fontSize: 14,
 * };
 *
 * const viewStyles = composeView(combinedStyles);
 * // Result: { backgroundColor: "#fff", padding: 16 }
 * ```
 */
export function composeView(style?: Styles): Styles {
  if (!style) return {};

  const result: Styles = {};
  const keys = Object.keys(style) as Array<Extract<keyof Styles, string>>;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (!textStyleKeys.has(key as keyof TextStyle)) {
      (result as Record<string, unknown>)[key] = style[key];
    }
  }

  return result;
}
