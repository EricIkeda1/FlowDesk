import { z } from "zod";
export const taskSchema = z.object({
  title: z.string().trim().min(3).max(140),
  description: z.string().max(2000).default(""),
  project: z.enum(["Website", "Mobile", "Plataforma"]),
  priority: z.enum(["baixa", "média", "alta"]),
  status: z.enum(["backlog", "progress", "review", "done"]),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((v) => !Number.isNaN(Date.parse(v)))
    .nullable()
    .default(null),
});
