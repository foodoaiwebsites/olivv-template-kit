import { describe, expect, it } from "bun:test";
import { resolveFeaturePageUrl, featurePageEntries, type FeaturePagesContent } from "../src/site-content";

const fp = (over: Partial<FeaturePagesContent> = {}): FeaturePagesContent => ({
  onlineOrder: true,
  tableBookingOptions: false,
  giftCardOptions: true,
  tableOrder: true,
  onlineOrderDefaultSlug: "/order",
  bookingDefaultSlug: "/table-booking",
  giftcardDefaultSlug: "/giftcard",
  arMenuDefaultSlug: "/ar-menu",
  onlineOrderDefaultURL: "https://order.thefoodo.com/{slug}",
  bookingDefaultURL: "https://tb/{slug}/iframe",
  giftcardDefaultURL: "https://gc/{restaurantId}",
  arMenuDefaultURL: "https://ar/{slug}/table/1",
  slug: "vu-lounge",
  tenantId: "rest-99",
  ...over,
});

describe("resolveFeaturePageUrl", () => {
  it("substitutes {slug}", () => {
    expect(resolveFeaturePageUrl("https://o/{slug}", { slug: "vu", tenantId: "r1" })).toBe("https://o/vu");
  });
  it("substitutes {restaurantId} and the {resturantId} typo", () => {
    expect(resolveFeaturePageUrl("https://g/{restaurantId}", { slug: "vu", tenantId: "r1" })).toBe("https://g/r1");
    expect(resolveFeaturePageUrl("https://g/{resturantId}", { slug: "vu", tenantId: "r1" })).toBe("https://g/r1");
  });
});

describe("featurePageEntries", () => {
  it("returns 4 entries in order, with resolved urls and correct flags", () => {
    const e = featurePageEntries(fp());
    expect(e.map((x) => x.appKey)).toEqual(["order", "booking", "giftcard", "ar-menu"]);
    const order = e[0];
    expect(order.enabled).toBe(true);
    expect(order.enabledKey).toBe("onlineOrder");
    expect(order.slug).toBe("/order");
    expect(order.url).toBe("https://order.thefoodo.com/vu-lounge"); // {slug} resolved
    expect(order.chrome).toBe(true);
    expect(order.inNav).toBe(true);

    const booking = e[1];
    expect(booking.enabled).toBe(false); // tableBookingOptions false

    const giftcard = e[2];
    expect(giftcard.url).toBe("https://gc/rest-99"); // {restaurantId} -> tenantId

    const ar = e[3];
    expect(ar.appKey).toBe("ar-menu");
    expect(ar.enabled).toBe(true); // tableOrder
    expect(ar.chrome).toBe(false);
    expect(ar.inNav).toBe(false);
  });
});
