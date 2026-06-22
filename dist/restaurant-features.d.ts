/**
 * Per-feature page/link visibility derived from a restaurant operator record.
 *
 * Templates gate optional pages (online order, gift card, table booking, AR /
 * table order) on these flags, and the navbar/footer hide the matching links.
 * Gating is **off by default**: a feature is shown ONLY when the operator record
 * explicitly enables it. With no restaurant record every feature is `false`
 * (nothing operator-specific renders) — never guess a page into existence.
 *
 * The operator record shape is backend-specific, so each toggle is read
 * defensively: a boolean field, or the presence/`enabled` flag of an options
 * object, maps to `true`; anything missing maps to `false`.
 */
/** Which operator-gated pages/links are enabled for a restaurant. */
export interface RestaurantFeatures {
    /** Online ordering — menu + order pages, "Order online" CTAs. */
    onlineOrder: boolean;
    /** Gift cards — the gift-card page + link. */
    giftCard: boolean;
    /** Table booking / reservations — the booking page + "Book a table" CTA. */
    tableBooking: boolean;
    /** In-venue table ordering — the AR-menu / table-order page. */
    tableOrder: boolean;
}
/**
 * Resolve feature flags from a restaurant operator record. Pass whatever
 * `getRestaurant()` returns — unknown / partial shapes are tolerated, and an
 * absent record yields all-`false` (the safe "nothing enabled" default).
 *
 * Recognised toggle fields (first match wins per feature):
 * - `onlineOrder`  → `onlineOrder` (boolean)
 * - `tableOrder`   → `tableOrder` (boolean)
 * - `tableBooking` → `tableBookingOptions` | `tableBooking`
 * - `giftCard`     → `giftCardOptions` | `giftCard`
 */
export declare function resolveRestaurantFeatures(restaurant: unknown): RestaurantFeatures;
