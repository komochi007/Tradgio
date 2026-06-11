import { z } from "zod"

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
})

export const searchQuerySchema = z.object({
  keyword: z.string().optional(),
  ...paginationSchema.shape,
})

export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
):
  | {
      success: true
      data: T
    }
  | {
      success: false
      errors: string[]
    } {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return {
    success: false,
    errors: result.error.issues.map((i) => i.message),
  }
}

export type { z }
