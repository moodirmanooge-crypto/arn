import { supabase } from "./supabaseClient.js";

// Bucket-ka Supabase Storage (waxaa sameeya supabase/04_storage_and_fixes.sql)
export const MEDIA_BUCKET = "medvora-media";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Upload fayl (sawir / PDF) una kaydi Supabase Storage.
 * Path: <organizationId>/<folder>/<uuid>.<ext>
 * Wuxuu soo celinayaa { path, url }.
 */
export async function uploadMedia(file, organizationId, folder) {
  if (!file) throw new Error("Fayl lama dooran.");
  if (!organizationId) throw new Error("Organization lama helin — ma upload gareyn kartid.");
  if (file.size > MAX_BYTES) throw new Error("Faylku wuxuu ka weyn yahay 5 MB.");

  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const path = `${organizationId}/${folder}/${id}.${ext}`;

  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return { path, url: data.publicUrl };
}

/** Tirtir fayl Storage-ka ka (haddii path la hayo). Khaladka waa la iska dhaafaa. */
export async function deleteMedia(path) {
  if (!path) return;
  const { error } = await supabase.storage.from(MEDIA_BUCKET).remove([path]);
  if (error) console.warn("Storage delete:", error.message);
}
