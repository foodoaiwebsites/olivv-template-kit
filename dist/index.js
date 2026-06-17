/**
 * @olivv/template-kit — public API.
 *
 * Server modules (site-content, tenant, revalidate-route) and client
 * components (ContentProvider, BuilderAgent) share this barrel; Next's
 * compiler splits them by the "use client" directives in each file.
 */
export { fetchSiteContent, contentTag, resolveFeaturePageUrl, featurePageEntries, } from "./site-content";
export { clientIdFromHost, withTenantResolution, CLIENT_ID_HEADER, } from "./tenant";
export { ContentProvider, useContent } from "./content-provider";
export { default as BuilderAgent } from "./builder-agent";
export { createRevalidateRoute, verifyHmacSignature } from "./revalidate-route";
export { themeStyleVars, ThemeStyle, hexToHslChannels, hslChannelsToHex, } from "./theme";
export { getGeo } from "./geo";
export { defineTemplateManifest, KIT_SCHEMA_VERSION, } from "./manifest";
export { defineTemplateSchema, toRegistryManifest, TEMPLATE_SCHEMA_VERSION, } from "./template-schema";
