import assert from "node:assert/strict"
import test from "node:test"
import { toCsv } from "../src/lib/csv"

test("csv escapes commas and quotes", () => {
  const csv = toCsv([{ place: "Paris, France", note: 'He said "rain"' }])
  assert.equal(csv, 'place,note\n"Paris, France","He said ""rain"""')
})

test("csv keeps empty cells for missing values", () => {
  const csv = toCsv([{ temperature: null, condition: "Clear" }])
  assert.equal(csv, "temperature,condition\n,Clear")
})
