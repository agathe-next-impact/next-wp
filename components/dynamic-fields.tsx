import Image from "next/image";
import type { CustomTaxonomyData } from "@/lib/wordpress.d";
import { sanitizeContent } from "@/lib/sanitize";

interface DynamicFieldsProps {
  acf?: Record<string, unknown>;
  customTaxonomies?: CustomTaxonomyData[];
}

// Convert snake_case/kebab-case keys to readable labels
function formatLabel(key: string): string {
  return key
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Check if a string looks like an image URL
function isImageUrl(value: string): boolean {
  return /\.(jpg|jpeg|png|webp|gif|svg|avif)(\?.*)?$/i.test(value);
}

// Check if a string looks like a URL
function isUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

// Check if a string contains HTML tags
function isHtml(value: string): boolean {
  return /<[a-z][\s\S]*>/i.test(value);
}

function FieldValue({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === "" || value === false) {
    return null;
  }

  // String values
  if (typeof value === "string") {
    if (isImageUrl(value)) {
      return (
        <div className="my-2 relative w-full max-w-lg aspect-video">
          <Image
            src={value}
            alt=""
            fill
            className="object-contain rounded-lg border"
            sizes="(max-width: 768px) 100vw, 512px"
          />
        </div>
      );
    }
    if (isUrl(value)) {
      return (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline break-all"
        >
          {value}
        </a>
      );
    }
    if (isHtml(value)) {
      return <div dangerouslySetInnerHTML={{ __html: sanitizeContent(value) }} />;
    }
    return <span>{value}</span>;
  }

  // Number
  if (typeof value === "number") {
    return <span>{value}</span>;
  }

  // Boolean
  if (typeof value === "boolean") {
    return (
      <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-accent text-accent-foreground">
        {value ? "Oui" : "Non"}
      </span>
    );
  }

  // Array
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    return (
      <ul className="list-disc list-inside space-y-1">
        {value.map((item, i) => (
          <li key={i}>
            <FieldValue value={item} />
          </li>
        ))}
      </ul>
    );
  }

  // Object
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([, v]) => v !== null && v !== undefined && v !== "" && v !== false
    );
    if (entries.length === 0) return null;
    return (
      <div className="pl-4 border-l-2 border-accent space-y-2">
        {entries.map(([key, val]) => (
          <div key={key}>
            <span className="text-sm font-medium text-muted-foreground">
              {formatLabel(key)}:
            </span>{" "}
            <FieldValue value={val} />
          </div>
        ))}
      </div>
    );
  }

  return <span>{String(value)}</span>;
}

export function DynamicFields({ acf, customTaxonomies }: DynamicFieldsProps) {
  const hasAcf = acf && Object.keys(acf).length > 0;
  const hasTaxonomies = customTaxonomies && customTaxonomies.length > 0;

  if (!hasAcf && !hasTaxonomies) return null;

  return (
    <div className="mt-8 space-y-6">
      {hasTaxonomies && (
        <div className="space-y-3">
          {customTaxonomies.map((tax) => (
            <div key={tax.taxonomy}>
              <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                {tax.label}
              </h4>
              <div className="flex flex-wrap gap-2">
                {tax.terms.map((term) => (
                  <span
                    key={term.id}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent text-accent-foreground"
                  >
                    {term.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {hasAcf && (
        <div className="space-y-4 border-t pt-6">
          {Object.entries(acf).map(([key, value]) => {
            const rendered = <FieldValue value={value} />;
            if (rendered === null) return null;

            return (
              <div key={key}>
                <h4 className="text-sm font-semibold text-muted-foreground mb-1">
                  {formatLabel(key)}
                </h4>
                <div className="text-foreground">{rendered}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
