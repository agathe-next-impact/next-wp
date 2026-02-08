import Image from "next/image";
import Link from "next/link";

import { ContentNode } from "@/lib/wordpress.d";
import { cn } from "@/lib/utils";
import { truncateHtml } from "@/lib/metadata";
import { stripHtmlTags } from "@/lib/sanitize";

export function ContentNodeCard({
  node,
  basePath,
}: {
  node: ContentNode;
  basePath: string;
}) {
  const media = node._embedded?.["wp:featuredmedia"]?.[0] ?? null;
  const date = node.date
    ? new Date(node.date).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <Link
      href={`/${basePath}/${node.slug}`}
      className={cn(
        "border p-4 bg-accent/30 rounded-lg group flex justify-between flex-col not-prose gap-8",
        "hover:bg-accent/75 transition-all"
      )}
    >
      <div className="flex flex-col gap-4">
        <div className="h-48 w-full overflow-hidden relative rounded-md border flex items-center justify-center bg-muted">
          {media?.source_url ? (
            <Image
              className="h-full w-full object-cover"
              src={media.source_url}
              alt={node.title?.rendered || "Thumbnail"}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full text-muted-foreground">
              No image available
            </div>
          )}
        </div>
        {node.title?.rendered && (
          <div className="text-xl text-primary font-medium group-hover:underline decoration-muted-foreground underline-offset-4 decoration-dotted transition-all">
            {stripHtmlTags(node.title.rendered)}
          </div>
        )}
        <div className="text-sm">
          {node.excerpt?.rendered
            ? truncateHtml(node.excerpt.rendered, 12)
            : "No excerpt available"}
        </div>
      </div>

      {date && (
        <div className="flex flex-col gap-4">
          <hr />
          <div className="flex justify-end items-center text-xs">
            <p>{date}</p>
          </div>
        </div>
      )}
    </Link>
  );
}
