import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("cities")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) {
    console.error(error);
    return NextResponse.json({ cities: [] }, { status: 500 });
  }

  return NextResponse.json({ cities: data ?? [] });
}
