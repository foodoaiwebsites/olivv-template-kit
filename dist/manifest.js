/**
 * Template manifest contract (`template.manifest.json`). Validated at build
 * time via `defineTemplateManifest` and by `verify-template` in CI.
 */
import { z } from "zod";
/** Highest manifest schema version this kit release understands. */
export const KIT_SCHEMA_VERSION = 1;
const SEMVERISH_RE = /^\d+\.\d+\.\d+(-[\w.]+)?$/;
const manifestSchema = z.object({
    templateId: z.string().min(1, "templateId must be a non-empty string"),
    version: z.string().regex(SEMVERISH_RE, "version must be semver (e.g. 1.0.0)"),
    schemaVersion: z.number().int().positive(),
    displayName: z.string().min(1, "displayName must be a non-empty string"),
    previewClientId: z.string().min(1).optional(),
    engines: z.object({ next: z.string().min(1).optional() }).optional(),
});
/**
 * Validate a manifest at module-evaluation (i.e. build) time — fail loud.
 * Throws if any field is invalid or if the manifest targets a newer schema
 * than this kit understands.
 */
export function defineTemplateManifest(m) {
    const parsed = manifestSchema.parse(m);
    if (parsed.schemaVersion > KIT_SCHEMA_VERSION) {
        throw new Error(`@olivv/template-kit: manifest schemaVersion ${parsed.schemaVersion} is newer than this ` +
            `kit's KIT_SCHEMA_VERSION ${KIT_SCHEMA_VERSION} — upgrade @olivv/template-kit.`);
    }
    return parsed;
}
