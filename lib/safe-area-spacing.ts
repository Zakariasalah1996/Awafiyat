/**
 * Keeps bottom actions above the system navigation area while preserving a
 * minimum visual breathing space when the device reports no bottom inset.
 */
export function getSafeBottomPadding(
  bottomInset: number,
  contentSpacing: number = 16,
): number {
  return Math.max(0, bottomInset) + Math.max(0, contentSpacing);
}
