import { createAdminClient } from "@/lib/db/client";
import { slugify } from "@/lib/utils/slug";
import type { ModelEntity } from "@/lib/db/schema";

export const modelRepo = {
  async listAll(): Promise<ModelEntity[]> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("models")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw new Error(`modelRepo.listAll failed: ${error.message}`);
    
    // Map snake_case to camelCase
    return (data ?? []).map((row: Record<string, unknown>) => ({
      slug: row.slug as string,
      name: row.name as string,
      shortName: row.short_name as string,
    }));
  },

  async create(name: string, shortName: string): Promise<ModelEntity> {
    const supabase = createAdminClient();
    const slug = slugify(name);
    
    const { data, error } = await supabase
      .from("models")
      .insert({ slug, name, short_name: shortName })
      .select()
      .single();

    if (error || !data) throw new Error(`modelRepo.create failed: ${error?.message}`);

    return {
      slug: data.slug,
      name: data.name,
      shortName: data.short_name,
    };
  }
};
