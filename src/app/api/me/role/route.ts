import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { adminApiCall } from "@/lib/api/client";
import type { ApiAdminContext } from "@/lib/api/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ role: "admin" }, { status: 401 });
  }

  try {
    const context = await adminApiCall<ApiAdminContext>("/v1/admin/me/context");
    return NextResponse.json({ role: context.role }, { status: 200 });
  } catch (error) {
    console.error("[api/me/role] context fetch failed", error);
    return NextResponse.json({ role: "admin" }, { status: 200 });
  }
}
