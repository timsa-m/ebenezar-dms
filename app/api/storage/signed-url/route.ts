import { NextRequest, NextResponse } from "next/server";
import { getLoggedInUser } from "@/lib/actions/user.actions";
import { generateSignedUrl } from "@/lib/supabase-storage";

/**
 * GET /api/storage/signed-url?bucket=loan-documents&path=loan-docs/xxx.pdf
 *
 * Generates a short-lived (60s) signed URL for a private Supabase Storage file.
 *
 * Security:
 *  - Requires an authenticated session (validated via Supabase cookie).
 *  - Only authenticated STAFF/MANAGER/ADMIN users can access documents.
 *  - The URL expires in 60 seconds — no permanent public link is ever returned.
 *  - The bucket and path are validated server-side to prevent path traversal.
 *
 * Usage (in a React component):
 *   const res = await fetch(`/api/storage/signed-url?bucket=loan-documents&path=${encodeURIComponent(loan.documentUrl)}`);
 *   const { signedUrl } = await res.json();
 *   window.open(signedUrl);
 */

const ALLOWED_BUCKETS = new Set(["loan-documents", "client-assets"]);
const SIGNED_URL_TTL_SECONDS = 60; // 60-second expiry

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate the user — no session = no file
    const user = await getLoggedInUser();
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED: You must be logged in to access documents." },
        { status: 401 }
      );
    }

    // 2. Parse and validate query params
    const { searchParams } = new URL(request.url);
    const bucket = searchParams.get("bucket");
    const path = searchParams.get("path");

    if (!bucket || !path) {
      return NextResponse.json(
        { error: "Missing required query parameters: bucket, path" },
        { status: 400 }
      );
    }

    // 3. Allowlist check — prevent arbitrary bucket access
    if (!ALLOWED_BUCKETS.has(bucket)) {
      return NextResponse.json(
        { error: "FORBIDDEN: Access to this bucket is not permitted." },
        { status: 403 }
      );
    }

    // 4. Basic path traversal guard — reject paths with ".." sequences
    if (path.includes("..") || path.startsWith("/")) {
      return NextResponse.json(
        { error: "Invalid file path." },
        { status: 400 }
      );
    }

    // 5. Generate the signed URL (expires in 60 seconds)
    const signedUrl = await generateSignedUrl(bucket, path, SIGNED_URL_TTL_SECONDS);

    if (!signedUrl) {
      return NextResponse.json(
        { error: "Failed to generate signed URL. The file may not exist." },
        { status: 404 }
      );
    }

    // 6. Return the signed URL with a short cache to prevent duplicate requests
    return NextResponse.json(
      { signedUrl, expiresIn: SIGNED_URL_TTL_SECONDS },
      {
        status: 200,
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    );
  } catch (error: any) {
    console.error("[API/storage/signed-url] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
