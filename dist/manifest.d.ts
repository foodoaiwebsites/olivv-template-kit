/** Highest manifest schema version this kit release understands. */
export declare const KIT_SCHEMA_VERSION = 1;
export interface TemplateManifest {
    templateId: string;
    version: string;
    schemaVersion: number;
    displayName: string;
    previewClientId?: string;
    engines?: {
        next?: string;
    };
}
/**
 * Validate a manifest at module-evaluation (i.e. build) time — fail loud.
 * Throws if any field is invalid or if the manifest targets a newer schema
 * than this kit understands.
 */
export declare function defineTemplateManifest(m: TemplateManifest): TemplateManifest;
