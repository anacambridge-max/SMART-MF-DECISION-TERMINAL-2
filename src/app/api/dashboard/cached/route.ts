import { NextResponse } from "next/server";
import { db } from "@/db";
import { dashboardCache } from "@/db/schema";

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(dashboardCache)
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ success: false, data: null });
    }

    return NextResponse.json({
      success: true,
      fromCache: true,
      data: rows[0].payload,
      cachedAt: rows[0].updatedAt,
    });
  } catch (error) {
    console.error("Cache GET error:", error);
    return NextResponse.json({ success: false, data: null });
  }
}
