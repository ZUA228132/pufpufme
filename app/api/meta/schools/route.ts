import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cityId = searchParams.get("cityId");

  if (!cityId) {
    return NextResponse.json({ schools: [] });
  }

  const { data, error } = await supabaseAdmin
    .from("schools")
    .select("id, name")
    .eq("city_id", cityId)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error loading schools", error);
    return NextResponse.json({ schools: [] }, { status: 500 });
  }

  return NextResponse.json({ schools: data ?? [] });
}
