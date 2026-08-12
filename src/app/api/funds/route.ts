import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { funds } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DEFAULT_FUNDS } from "@/lib/fundConfig";

export async function GET() {
  try {
    const rows = await db.select().from(funds).where(eq(funds.isActive, true));
    if (rows.length === 0) {
      // Seed defaults
      await db.insert(funds).values(
        DEFAULT_FUNDS.map((f) => ({
          name: f.name,
          amfiCode: f.amfiCode,
          proxyIndex: f.proxyIndex,
          category: f.category,
          isActive: true,
        }))
      );
      const seeded = await db.select().from(funds).where(eq(funds.isActive, true));
      return NextResponse.json({ funds: seeded });
    }
    return NextResponse.json({ funds: rows });
  } catch (error) {
    console.error("Funds GET error:", error);
    return NextResponse.json({ funds: DEFAULT_FUNDS });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      name: string;
      amfiCode: string;
      proxyIndex: string;
      category: string;
    };
    const [inserted] = await db
      .insert(funds)
      .values({
        name: body.name,
        amfiCode: body.amfiCode,
        proxyIndex: body.proxyIndex,
        category: body.category,
        isActive: true,
      })
      .returning();
    return NextResponse.json({ fund: inserted });
  } catch (error) {
    console.error("Fund POST error:", error);
    return NextResponse.json({ error: "Failed to add fund" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get("id") ?? "0");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await db.update(funds).set({ isActive: false }).where(eq(funds.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Fund DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete fund" }, { status: 500 });
  }
}
