// prepare.ts — fixed evaluation harness. Do not modify.
// Loads the dataset, runs extractPhoneNLCandidates from tweak.ts, and reports val_score.
// Run: npx tsx prepare.ts

import * as fs from "fs";
import * as path from "path";
import { extractPhoneNLCandidates } from "./tweak";

function parseCSV(file: string): Record<string, string>[] {
  const content = fs.readFileSync(file, "utf-8");
  const lines = content.split("\n").filter(Boolean);

  const headers = lines[0].split(",");

  return lines.slice(1).map(line => {
    const cols: string[] = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const c = line[i];

      if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === "," && !inQuotes) {
        cols.push(cur);
        cur = "";
      } else {
        cur += c;
      }
    }
    cols.push(cur);

    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = cols[i];
    });
    return obj;
  });
}

function evaluate(): { correct: number; total: number } {
  const file = path.resolve("./metadata.deepgram.csv");
  const rows = parseCSV(file);

  let total = 0;
  let correct = 0;

  for (const r of rows) {
    const input = r["deepgram_transcript"];
    const expected = r["normalized_phone_number"];

    const candidates = extractPhoneNLCandidates(input);
    const predicted = candidates[0] ?? null;

    const ok = predicted === expected;

    if (ok) correct++;
    total++;

    if (!ok) {
      console.log("MISMATCH");
      console.log("text      :", input);
      console.log("expected  :", expected);
      console.log("predicted :", predicted);
      console.log("candidates:", candidates.slice(0, 5));
      console.log("---");
    }
  }

  return { correct, total };
}

const t0 = Date.now();
const { correct, total } = evaluate();
const totalSeconds = ((Date.now() - t0) / 1000).toFixed(2);
const pct = ((correct / total) * 100).toFixed(2);

console.log("---");
console.log(`val_score:        ${correct}/${total} (${pct}%)`);
console.log(`total_seconds:    ${totalSeconds}`);
