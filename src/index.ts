/**
 * @olivv/template-kit — public API.
 *
 * Server modules (site-content, tenant, revalidate-route) and client
 * components (ContentProvider, BuilderAgent) share this barrel; Next's
 * compiler splits them by the "use client" directives in each file.
 */
export {
  fetchSiteContent,
  contentTag,
  resolveFeaturePageUrl,
  featurePageEntries,
  type SiteContentDoc,
  type FetchOpts,
  type FeaturePagesContent,
  type FeaturePageEntry,
} from "./site-content";
export {
  clientIdFromHost,
  withTenantResolution,
  CLIENT_ID_HEADER,
  type MiddlewareHandler,
} from "./tenant";
export { ContentProvider, useContent, type ContentValue } from "./content-provider";
export { default as BuilderAgent } from "./builder-agent";
export { createRevalidateRoute, verifyHmacSignature } from "./revalidate-route";
export {
  themeStyleVars,
  ThemeStyle,
  hexToHslChannels,
  hslChannelsToHex,
} from "./theme";
export { getGeo, type GeoInfo, type GeoRequest } from "./geo";
export {
  defineTemplateManifest,
  KIT_SCHEMA_VERSION,
  type TemplateManifest,
} from "./manifest";
export {
  defineTemplateSchema,
  toRegistryManifest,
  TEMPLATE_SCHEMA_VERSION,
  type TemplateSchemaV2,
  type PageSpec,
  type ThemeTokenSpec,
  type ThemePreset,
  type MediaSlotSpec,
  type VariationSpec,
  type TemplateRegistryManifest,
  type RegistryManifestPage,
} from "./template-schema";
