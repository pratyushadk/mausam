import type { NextFunction, Request, Response } from "express"
import { ZodError } from "zod"

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message)
  }
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    res.status(422).json({
      error: {
        code: "VALIDATION",
        message: "Check the entered values.",
        details: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
    })
    return
  }

  if (error instanceof ApiError) {
    res.status(error.status).json({
      error: { code: error.code, message: error.message, details: error.details ?? null },
    })
    return
  }

  console.error(error)
  res.status(500).json({
    error: { code: "SERVER_ERROR", message: "Something went wrong. Try again.", details: null },
  })
}
