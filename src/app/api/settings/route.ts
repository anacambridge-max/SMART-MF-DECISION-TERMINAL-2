import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { appSettings, funds } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DEFAULT_FUNDS } from "@/lib/fundConfig";

export async function GET() {
  try {
    const settingsRows = await db.select().from(appSettings);
    const fundsRows = await db
      .select()
      .from(funds)
      .where(eq(funds.isActive, true));

    const settings = Object.fromEntries(
      settingsRows.map((r) => [r.key, r.value])
    );

    let activeFunds = fundsRows;
    if (activeFunds.length === 0) {
      // Return defaults
      activeFunds = DEFAULT_FUNDS.map((f) => ({
        id: f.id,
        name: f.name,
        amfiCode: f.amfiCode,
        proxyIndex: f.proxyIndex,
        category: f.category,
        isActive: true,
        createdAt: new Date(),
      }));
    }

    return NextResponse.json({
      settings: {
        strategic_weight: settings["strategic_weight"] ?? "0.6",
        opportunity_weight: settings["opportunity_weight"] ?? "0.4",
        tactical_sip_amount: settings["tactical_sip_amount"] ?? "",
      },
      funds: activeFunds,
    });
  } catch (error) {
    console.error("Settings GET error:", error);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      settings?: Record<string, string>;
      funds?: Array<{
        id?: number;
        name: string;
        amfiCode: string;
        proxyIndex: string;
        category: string;
      }>;
    };

    // Update settings
    if (body.settings) {
      for (const [key, value] of Object.entries(body.settings)) {
        const existing = await db
          .select()
          .from(appSettings)
          .where(eq(appSettings.key, key))
          .limit(1);
        if (existing.length > 0) {
          await db
            .update(appSettings)
            .set({ value: String(value), updatedAt: new Date() })
            .where(eq(appSettings.key, key));
        } else {
          await db
            .insert(appSettings)
            .values({ key, value: String(value) });
        }
      }
    }

    // Update funds if provided
    if (body.funds) {
      // Deactivate all, then re-insert/activate provided list
      await db.update(funds).set({ isActive: false });
      for (const fund of body.funds) {
        if (fund.id) {
          await db
            .update(funds)
            .set({
              name: fund.name,
              amfiCode: fund.amfiCode,
              proxyIndex: fund.proxyIndex,
              category: fund.category,
              isActive: true,
            })
            .where(eq(funds.id, fund.id));
        } else {
          await db.insert(funds).values({
            name: fund.name,
            amfiCode: fund.amfiCode,
            proxyIndex: fund.proxyIndex,
            category: fund.category,
            isActive: true,
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Settings POST error:", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
