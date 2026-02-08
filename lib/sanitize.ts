import sanitize from "sanitize-html";

/**
 * Sanitize HTML content from WordPress, allowing safe tags only.
 * Use for post/page body content rendered via dangerouslySetInnerHTML.
 */
export function sanitizeContent(html: string): string {
  return sanitize(html, {
    allowedTags: sanitize.defaults.allowedTags.concat([
      "img",
      "figure",
      "figcaption",
      "picture",
      "source",
      "video",
      "audio",
      "iframe",
      "details",
      "summary",
      "mark",
      "del",
      "ins",
      "sub",
      "sup",
      "abbr",
      "time",
    ]),
    allowedAttributes: {
      ...sanitize.defaults.allowedAttributes,
      img: ["src", "srcset", "alt", "title", "width", "height", "loading", "decoding", "class"],
      video: ["src", "controls", "width", "height", "poster", "preload", "class"],
      audio: ["src", "controls", "preload", "class"],
      source: ["src", "srcset", "type", "media", "sizes"],
      iframe: ["src", "width", "height", "title", "allow", "loading", "class"],
      figure: ["class"],
      figcaption: ["class"],
      time: ["datetime", "class"],
      a: ["href", "name", "target", "rel", "class", "id"],
      div: ["class", "id"],
      span: ["class", "id"],
      p: ["class", "id"],
      h1: ["class", "id"],
      h2: ["class", "id"],
      h3: ["class", "id"],
      h4: ["class", "id"],
      h5: ["class", "id"],
      h6: ["class", "id"],
      ul: ["class"],
      ol: ["class", "start", "type"],
      li: ["class"],
      blockquote: ["class", "cite"],
      pre: ["class"],
      code: ["class"],
      table: ["class"],
      thead: ["class"],
      tbody: ["class"],
      tr: ["class"],
      td: ["class", "colspan", "rowspan"],
      th: ["class", "colspan", "rowspan", "scope"],
    },
    allowedIframeHostnames: ["www.youtube.com", "youtube.com", "player.vimeo.com", "vimeo.com"],
    allowedSchemes: ["http", "https", "mailto"],
  });
}

/**
 * Strip all HTML tags and return plain text.
 * Use for titles, excerpts in attributes, JSON-LD values, etc.
 */
export function stripHtmlTags(html: string): string {
  return sanitize(html, { allowedTags: [], allowedAttributes: {} }).trim();
}
