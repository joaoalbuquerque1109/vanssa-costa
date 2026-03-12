import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { getPortalSession } from "@/lib/portal";

const BUCKET_NAME = "portal-assets";

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export async function POST(request: Request) {
  const session = await getPortalSession();
  if (!session || (session.profile.role !== "funcionario" && session.profile.role !== "administrador")) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const adminClient = createSupabaseAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Supabase admin não configurado." }, { status: 500 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const folder = String(formData.get("folder") ?? "misc");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo não enviado." }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Envie apenas imagens." }, { status: 400 });
  }

  const listBuckets = await adminClient.storage.listBuckets();
  if (!listBuckets.error) {
    const exists = (listBuckets.data ?? []).some((bucket) => bucket.name === BUCKET_NAME);
    if (!exists) {
      await adminClient.storage.createBucket(BUCKET_NAME, { public: true, fileSizeLimit: "5MB" });
    }
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = sanitizeFilename(file.name || "image");
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}-${filename}`;

  const upload = await adminClient.storage.from(BUCKET_NAME).upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  });

  if (upload.error) {
    return NextResponse.json({ error: `Falha ao enviar imagem: ${upload.error.message}` }, { status: 500 });
  }

  const { data: publicData } = adminClient.storage.from(BUCKET_NAME).getPublicUrl(path);

  return NextResponse.json({ ok: true, path, publicUrl: publicData.publicUrl });
}
