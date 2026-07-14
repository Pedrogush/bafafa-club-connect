import { supabase } from "@/integrations/supabase/client";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function validateImageFile(file: File) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Use uma imagem JPG, PNG, WEBP ou GIF.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("A imagem deve ter no máximo 10 MB.");
  }
}

export async function uploadPublicImage({
  bucket,
  folder,
  file,
}: {
  bucket: "event-images" | "avatars";
  folder: string;
  file: File;
}) {
  validateImageFile(file);
  const extension = safeExtension(file);
  const path = `${folder}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

export async function removePublicImage(bucket: "event-images" | "avatars", url: string | null) {
  if (!url) return;
  const marker = `/storage/v1/object/public/${bucket}/`;
  const index = url.indexOf(marker);
  if (index < 0) return;
  const encodedPath = url.slice(index + marker.length).split("?")[0];
  const path = decodeURIComponent(encodedPath);
  if (!path) return;
  await supabase.storage.from(bucket).remove([path]);
}

function safeExtension(file: File) {
  const fromName = file.name
    .split(".")
    .pop()
    ?.toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  if (fromName && ["jpg", "jpeg", "png", "webp", "gif"].includes(fromName)) return fromName;
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";
  return "jpg";
}
