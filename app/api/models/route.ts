import { NextResponse } from "next/server";
import { modelService } from "@/lib/services/modelService";
import { z } from "zod";
import { errors } from "@/lib/observability/errors";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const models = await modelService.listAll();
    return NextResponse.json(models);
  } catch (error) {
    errors.capture(error, { context: "GET /api/models" });
    return NextResponse.json({ error: "Failed to fetch models" }, { status: 500 });
  }
}

const CreateModelSchema = z.object({
  name: z.string().min(1),
  shortName: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    // Basic auth check
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      }
    );
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await request.json();
    const parsed = CreateModelSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const model = await modelService.create(parsed.data.name, parsed.data.shortName);
    return NextResponse.json(model);
  } catch (error) {
    errors.capture(error, { context: "POST /api/models" });
    return NextResponse.json({ error: "Failed to create model" }, { status: 500 });
  }
}
