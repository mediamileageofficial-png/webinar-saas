import { z } from "zod";
import { slugify } from "@/lib/utils/slugify";

export { slugify };


export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  slug: z
    .string()
    .trim()
    .min(2, "Slug must be at least 2 characters")
    .max(60)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers, and hyphens only"
    ),
});
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
