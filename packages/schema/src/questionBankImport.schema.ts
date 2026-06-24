import { z } from "zod";

export const questionBankJsonItemSchema = z.object({
  question_number: z.union([z.string(), z.number()]).optional(),
  questionNumber: z.union([z.string(), z.number()]).optional(),
  number: z.union([z.string(), z.number()]).optional(),
  question: z.string().min(1),
  options: z
    .union([
      z.record(z.string(), z.string()),
      z.array(z.object({ label: z.string(), text: z.string() }))
    ])
    .optional(),
  answer: z.string().optional(),
  explanation: z.string().optional(),
  subject: z.string().optional(),
  difficulty: z.string().optional(),
  type: z.string().optional()
});

export type QuestionBankJsonItem = z.infer<typeof questionBankJsonItemSchema>;

export const questionBankJsonFileSchema = z.union([
  z.array(questionBankJsonItemSchema),
  z.object({ questions: z.array(questionBankJsonItemSchema) })
]);

export type QuestionBankJsonFile = z.infer<typeof questionBankJsonFileSchema>;

export const questionBankImportJobSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  status: z.enum(["pending", "done", "failed"]),
  totalRecords: z.number().int(),
  validRecords: z.number().int(),
  invalidRecords: z.number().int(),
  resultJson: z.string().nullable(),
  errorMessage: z.string().nullable(),
  createdAt: z.string()
});

export type QuestionBankImportJob = z.infer<typeof questionBankImportJobSchema>;

export const questionBankImportResultSchema = z.object({
  jobId: z.string(),
  fileName: z.string(),
  status: z.enum(["done", "failed"]),
  totalRecords: z.number().int(),
  validRecords: z.number().int(),
  invalidRecords: z.number().int(),
  errors: z.array(
    z.object({
      index: z.number().int(),
      message: z.string()
    })
  )
});

export type QuestionBankImportResult = z.infer<typeof questionBankImportResultSchema>;
