import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

export const maxDuration = 30;

// ============================================================================
// Rate Limiting (in-memory, per-instance)
// ============================================================================

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 30; // max requests per window

const requestLog: number[] = [];

function isRateLimited(): boolean {
  const now = Date.now();
  // Prune old entries
  while (requestLog.length > 0 && requestLog[0] < now - RATE_LIMIT_WINDOW_MS) {
    requestLog.shift();
  }
  if (requestLog.length >= RATE_LIMIT_MAX) {
    return true;
  }
  requestLog.push(now);
  return false;
}

// ============================================================================
// HMAC Signature Verification
// ============================================================================

function verifySignature(
  body: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false;

  const expected = createHmac("sha256", secret).update(body).digest("hex");

  try {
    return timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

// ============================================================================
// Simple secret comparison (legacy fallback)
// ============================================================================

function verifySecret(headerSecret: string | null, envSecret: string): boolean {
  if (!headerSecret || !envSecret) return false;

  try {
    return timingSafeEqual(
      Buffer.from(headerSecret),
      Buffer.from(envSecret)
    );
  } catch {
    return false;
  }
}

/**
 * WordPress webhook handler for content revalidation.
 *
 * Supports two authentication modes:
 *  1. HMAC-SHA256: header `x-webhook-signature` contains HMAC of raw body
 *  2. Shared secret (legacy): header `x-webhook-secret` matches env var
 */
export async function POST(request: NextRequest) {
  // Rate limiting
  if (isRateLimited()) {
    return NextResponse.json(
      { message: "Too many requests" },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  try {
    const rawBody = await request.text();
    const webhookSecret = process.env.WORDPRESS_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("WORDPRESS_WEBHOOK_SECRET is not configured");
      return NextResponse.json(
        { message: "Server misconfiguration" },
        { status: 500 }
      );
    }

    // Try HMAC signature first, fall back to shared secret
    const hmacSignature = request.headers.get("x-webhook-signature");
    const legacySecret = request.headers.get("x-webhook-secret");

    const isValid = hmacSignature
      ? verifySignature(rawBody, hmacSignature, webhookSecret)
      : verifySecret(legacySecret, webhookSecret);

    if (!isValid) {
      console.error("Invalid webhook authentication");
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    let requestBody: { contentType?: string; contentId?: string | number };
    try {
      requestBody = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { message: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { contentType, contentId } = requestBody;

    if (!contentType || typeof contentType !== "string") {
      return NextResponse.json(
        { message: "Missing content type" },
        { status: 400 }
      );
    }

    // Validate contentType format (alphanumeric, hyphens, underscores only)
    if (!/^[a-z0-9_-]+$/i.test(contentType)) {
      return NextResponse.json(
        { message: "Invalid content type format" },
        { status: 400 }
      );
    }

    try {
      console.log(
        `Revalidating content: ${contentType}${
          contentId ? ` (ID: ${contentId})` : ""
        }`
      );

      // Revalidate specific content type tags
      revalidateTag("wordpress");

      if (contentType === "post") {
        revalidateTag("posts");
        if (contentId) {
          revalidateTag(`post-${contentId}`);
        }
        // Clear all post pages when any post changes
        revalidateTag("posts-page-1");
      } else if (contentType === "category") {
        revalidateTag("categories");
        if (contentId) {
          revalidateTag(`posts-category-${contentId}`);
          revalidateTag(`category-${contentId}`);
        }
      } else if (contentType === "tag") {
        revalidateTag("tags");
        if (contentId) {
          revalidateTag(`posts-tag-${contentId}`);
          revalidateTag(`tag-${contentId}`);
        }
      } else if (contentType === "author" || contentType === "user") {
        revalidateTag("authors");
        if (contentId) {
          revalidateTag(`posts-author-${contentId}`);
          revalidateTag(`author-${contentId}`);
        }
      } else if (contentType === "options" || contentType === "options-page") {
        revalidateTag("options-pages");
        if (contentId) {
          revalidateTag(`options-page-${contentId}`);
        }
      } else {
        // Generic CPT revalidation
        revalidateTag(`cpt-${contentType}`);
        if (contentId) {
          revalidateTag(`cpt-${contentType}-${contentId}`);
        }
      }

      // Revalidate content types discovery (handles new CPT registration)
      revalidateTag("content-types");

      // Also revalidate the entire layout for safety
      revalidatePath("/", "layout");

      return NextResponse.json({
        revalidated: true,
        message: `Revalidated ${contentType} and related content`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error revalidating path:", error);
      return NextResponse.json(
        {
          revalidated: false,
          message: "Failed to revalidate site",
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Revalidation error:", error);
    return NextResponse.json(
      {
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
