import assert from "node:assert/strict"
import test from "node:test"
import { ApiError } from "../src/lib/errors"
import { inclusiveDays, validateRange } from "../src/lib/dates"

const today = "2026-11-13"

test("a past search can cover 31 days", () => {
  assert.equal(inclusiveDays("2026-10-01", "2026-10-31"), 31)
  assert.doesNotThrow(() => validateRange("2026-10-14", "2026-11-13", today))
})

test("a past search cannot cover 32 days", () => {
  assert.throws(() => validateRange("2026-10-01", "2026-11-01", today), (error: unknown) => {
    return error instanceof ApiError && error.code === "DATE_RANGE_INVALID"
  })
})

test("a future search can end on the 16th forecast day", () => {
  assert.doesNotThrow(() => validateRange("2026-11-13", "2026-11-28", today))
})

test("a future search cannot pass the forecast window", () => {
  assert.throws(() => validateRange("2026-11-13", "2026-11-29", today), ApiError)
})

test("a search that includes a future day stays within 16 days", () => {
  assert.throws(() => validateRange("2026-10-20", "2026-11-14", today), ApiError)
  assert.doesNotThrow(() => validateRange("2026-11-10", "2026-11-20", today))
})

test("the start date cannot be after the end date", () => {
  assert.throws(() => validateRange("2026-11-15", "2026-11-13", today), ApiError)
})
