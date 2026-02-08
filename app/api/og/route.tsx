import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 500;

// Strip HTML tags (lightweight, edge-compatible)
function stripTags(str: string): string {
  return str.replace(/<[^>]*>/g, "");
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Validate and sanitize inputs
    const rawTitle = searchParams.get("title") || "";
    const rawDescription = searchParams.get("description") || "";

    const title = stripTags(rawTitle).slice(0, MAX_TITLE_LENGTH) || null;
    const description = stripTags(rawDescription).slice(0, MAX_DESCRIPTION_LENGTH) || null;

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            justifyContent: "center",
            padding: "80px",
            backgroundColor: "white",
            backgroundImage:
              "radial-gradient(circle at 25px 25px, lightgray 2%, transparent 0%), radial-gradient(circle at 75px 75px, lightgray 2%, transparent 0%)",
            backgroundSize: "100px 100px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 60,
              fontStyle: "normal",
              color: "black",
              marginBottom: 30,
              whiteSpace: "pre-wrap",
              lineHeight: 1.2,
              maxWidth: "800px",
            }}
          >
            {title}
          </div>
          {description && (
            <div
              style={{
                fontSize: 30,
                fontStyle: "normal",
                color: "gray",
                whiteSpace: "pre-wrap",
                lineHeight: 1.2,
                maxWidth: "800px",
                display: "-webkit-box",
                WebkitLineClamp: "2",
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {description}
            </div>
          )}
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e) {
    console.log(e instanceof Error ? e.message : "OG image generation failed");
    return new Response("Failed to generate the image", {
      status: 500,
    });
  }
}
