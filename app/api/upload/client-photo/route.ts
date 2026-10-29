import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { generateClientAssetPath } from "@/lib/storage-utils";
import { getLoggedInUser } from "@/lib/actions/user.actions";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "application/pdf",
]);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * POST /api/upload/client-photo
 *
 * Accepts multipart/form-data with:
 *   - file: the image/document file
 *   - clientId: the client ID used for the storage path
 *
 * Returns: { path: string }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getLoggedInUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized: You must be logged in to upload files." },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const clientId = formData.get("clientId") as string | null;

    if (!file || !clientId) {
      return NextResponse.json(
        { error: "Missing required fields: file, clientId" },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type. Only JPG, PNG, WEBP, AVIF, and PDF are allowed." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File exceeds maximum size limit of 10MB." },
        { status: 400 }
      );
    }

    // Sanitize filename to prevent directory traversal
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const arrayBuffer = await file.arrayBuffer();
    const path = generateClientAssetPath(clientId.replace(/[^a-zA-Z0-9-]/g, ""), "profile", safeName);

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.storage
      .from("client-assets")
      .upload(path, arrayBuffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: true,
      });

    if (error) {
      console.error("[upload/client-photo] Supabase storage error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ path: data.path });
  } catch (err: any) {
    console.error("[upload/client-photo] Unexpected error:", err);
    return NextResponse.json({ error: err?.message ?? "Upload failed" }, { status: 500 });
  }
}
