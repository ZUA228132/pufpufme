import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

const BUCKET_NAME = "puff-media";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { ok: false, error: "Файл не получен" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const safeExt = ext.split("?")[0].split("#")[0] || "jpg";
    const filePath = `images/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${safeExt}`;

    const { error: uploadErr } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: file.type || "image/jpeg",
        upsert: false,
      });

    if (uploadErr) {
      console.error("upload-image error", uploadErr);
      return NextResponse.json(
        { ok: false, error: "Ошибка загрузки файла" },
        { status: 500 }
      );
    }

    const { data: publicData } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    const publicUrl = publicData?.publicUrl;
    if (!publicUrl) {
      return NextResponse.json(
        { ok: false, error: "Не удалось получить публичный URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, url: publicUrl });
  } catch (e: any) {
    console.error("upload-image exception", e);
    return NextResponse.json(
      { ok: false, error: "Внутренняя ошибка загрузки" },
      { status: 500 }
    );
  }
}
