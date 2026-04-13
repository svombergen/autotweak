// test_phone_extract.ts
// Run: npx ts-node test_phone_extract.ts

import * as fs from "fs";
import * as path from "path";

// === function under test ===
export function extractPhoneNL(text: string): string | null {
  const candidates = extractPhoneNLCandidates(text);
  return candidates[0] ?? null;
}

export function extractPhoneNLCandidates(text: string): string[] {
  if (!text) return [];

  const tokens = tokenize(text);
  const fragments = tokensToDigitFragments(tokens);

  if (fragments.length === 0) return [];

  const rawStrings = buildCandidateStrings(fragments);
  const normalized = normalizeCandidates(rawStrings);

  const scored = [...normalized]
    .map((value) => ({ value, score: scoreCandidate(value, text.toLowerCase()) }))
    .filter((x) => x.score > -999)
    .sort((a, b) => b.score - a.score || a.value.length - b.value.length);

  return [...new Set(scored.map((x) => x.value))];
}

function tokenize(input: string): string[] {
  let s = input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/\+/g, " plus ")
    .replace(/-/g, " ")
    .replace(/[/.,;:!?()[\]{}]/g, " ")
    // split glued o6 / o7 / e9 / 06zes / zes06
    .replace(/([a-z])(\d)/g, "$1 $2")
    .replace(/(\d)([a-z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();

  return s ? s.split(" ") : [];
}

const DIGIT_WORDS: Record<string, string> = {
  nul: "0",
  o: "0",
  oh: "0",
  een: "1",
  e: "1", // only really safe inside number-like context; handled later by scoring
  twee: "2",
  drie: "3",
  vier: "4",
  vijf: "5",
  zes: "6",
  zeven: "7",
  acht: "8",
  negen: "9",
};

const SIMPLE_NUMBER_WORDS: Record<string, number> = {
  nul: 0,
  een: 1,
  twee: 2,
  drie: 3,
  vier: 4,
  vijf: 5,
  zes: 6,
  zeven: 7,
  acht: 8,
  negen: 9,
  tien: 10,
  elf: 11,
  twaalf: 12,
  dertien: 13,
  veertien: 14,
  vijftien: 15,
  zestien: 16,
  zeventien: 17,
  achttien: 18,
  negentien: 19,
  twintig: 20,
  dertig: 30,
  veertig: 40,
  vijftig: 50,
  zestig: 60,
  zeventig: 70,
  tachtig: 80,
  negentig: 90,
};

function tokensToDigitFragments(tokens: string[]): string[] {
  const out: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];

    if (tok === "plus") {
      out.push("+");
      continue;
    }

    if (/^\d+$/.test(tok)) {
      out.push(tok);
      continue;
    }

    if (tok === "dubbel" && i + 1 < tokens.length) {
      const next = parseSingleTokenToDigits(tokens[i + 1]);
      if (next && next.length === 1) {
        out.push(next + next);
        i++;
        continue;
      }
    }

    const parsed = parseSingleTokenToDigits(tok);
    if (parsed) {
      out.push(parsed);
    }
  }

  return out;
}

function parseSingleTokenToDigits(tok: string): string | null {
  if (!tok) return null;

  if (DIGIT_WORDS[tok] !== undefined) {
    return DIGIT_WORDS[tok];
  }

  if (/^\d+$/.test(tok)) {
    return tok;
  }

  // common Dutch country code phrase
  if (tok === "eenendertig") return "31";

  // parse concatenated number words like:
  // negenhonderdtweeenveertig -> 942
  // negenhonderdvierentwintigduizend -> 924000
  // tweehonderd -> 200
  const n = parseDutchNumberWord(tok);
  if (n !== null) return String(n);

  return null;
}

function parseDutchNumberWord(word: string): number | null {
  let s = word;

  // quick exits
  if (!/[a-z]/.test(s)) return null;
  if (DIGIT_WORDS[s] !== undefined) return Number(DIGIT_WORDS[s]);
  if (SIMPLE_NUMBER_WORDS[s] !== undefined) return SIMPLE_NUMBER_WORDS[s];

  // units before tens: vierentwintig, tweeenveertig, etc.
  for (const [unitWord, unit] of Object.entries({
    een: 1, twee: 2, drie: 3, vier: 4, vijf: 5, zes: 6, zeven: 7, acht: 8, negen: 9,
  })) {
    for (const [tensWord, tens] of Object.entries({
      twintig: 20, dertig: 30, veertig: 40, vijftig: 50,
      zestig: 60, zeventig: 70, tachtig: 80, negentig: 90,
    })) {
      if (s === `${unitWord}en${tensWord}` || s === `${unitWord}${tensWord}`) {
        return unit + tens;
      }
      if (unitWord === "twee" && (s === `tweeen${tensWord}` || s === `tweeen${tensWord}`)) {
        return 2 + tens;
      }
    }
  }

  // hundreds / thousands / millions
  let total = 0;
  let matched = false;

  const miljoenIdx = s.indexOf("miljoen");
  if (miljoenIdx >= 0) {
    const left = s.slice(0, miljoenIdx);
    const right = s.slice(miljoenIdx + "miljoen".length);
    const leftVal = parseDutchNumberWord(left);
    const rightVal = right ? parseDutchNumberWord(right) : 0;
    if (leftVal !== null && rightVal !== null) return leftVal * 1_000_000 + rightVal;
  }

  const duizendIdx = s.indexOf("duizend");
  if (duizendIdx >= 0) {
    const left = s.slice(0, duizendIdx);
    const right = s.slice(duizendIdx + "duizend".length);
    const leftVal = left ? parseDutchNumberWord(left) : 1;
    const rightVal = right ? parseDutchNumberWord(right) : 0;
    if (leftVal !== null && rightVal !== null) return leftVal * 1000 + rightVal;
  }

  const honderdIdx = s.indexOf("honderd");
  if (honderdIdx >= 0) {
    const left = s.slice(0, honderdIdx);
    const right = s.slice(honderdIdx + "honderd".length);
    const leftVal = left ? parseDutchNumberWord(left) : 1;
    const rightVal = right ? parseDutchNumberWord(right) : 0;
    if (leftVal !== null && rightVal !== null) return leftVal * 100 + rightVal;
  }

  return matched ? total : null;
}

function buildCandidateStrings(fragments: string[]): string[] {
  const joined = fragments.join(" ");
  const pieces = joined.split(/\s+/).filter(Boolean);

  const out = new Set<string>();

  // full joined
  out.add(pieces.join(""));

  // contiguous windows
  for (let i = 0; i < pieces.length; i++) {
    let acc = "";
    for (let j = i; j < pieces.length && j < i + 20; j++) {
      acc += pieces[j];
      out.add(acc);
    }
  }

  // dedupe repeated exact halves
  for (const v of [...out]) {
    if (v.length % 2 === 0) {
      const h = v.length / 2;
      if (v.slice(0, h) === v.slice(h)) out.add(v.slice(0, h));
    }
  }

  return [...out];
}

function normalizeCandidates(values: string[]): string[] {
  const out = new Set<string>();

  for (let v of values) {
    if (!v) continue;

    // keep plus only in front
    v = v.replace(/(?!^)\+/g, "");

    // some STT says 001 when it likely meant 0031
    if (v.startsWith("001") && v.length >= 12) {
      out.add("0031" + v.slice(3));
    }

    // raw
    out.add(v);

    // repeated halves
    if (v.length % 2 === 0) {
      const h = v.length / 2;
      if (v.slice(0, h) === v.slice(h)) out.add(v.slice(0, h));
    }

    // keep possible substrings of target lengths
    for (let i = 0; i < v.length; i++) {
      const rem = v.slice(i);

      // local
      if (/^0\d{9}/.test(rem)) out.add(rem.slice(0, 10));

      // intl raw
      if (/^0031\d{9}/.test(rem)) out.add(rem.slice(0, 13));

      // intl plus
      if (/^\+31\d{9}/.test(rem)) out.add(rem.slice(0, 12));
      if (/^31\d{9}/.test(rem)) out.add("+" + rem.slice(0, 11));
    }
  }

  return [...out];
}

function scoreCandidate(value: string, rawText: string): number {
  let score = 0;

  if (/^\+31\d{9}$/.test(value)) score += 120;
  else if (/^0031\d{9}$/.test(value)) score += 115;
  else if (/^0\d{9}$/.test(value)) score += 110;
  else return -1000;

  // prefer plus if plus was spoken
  if (rawText.includes("plus")) {
    if (value.startsWith("+31")) score += 20;
    if (value.startsWith("0031")) score -= 8;
    if (value.startsWith("0")) score -= 20;
  } else {
    if (value.startsWith("+31")) score -= 10;
  }

  // prefer mobile-like Dutch numbers if transcript mentions mobiel
  if (rawText.includes("mobiele") || rawText.includes("mobiel")) {
    if (/^(06|\+316|00316)/.test(value)) score += 10;
  }

  // prefer candidates appearing earlier in raw digit stream shape
  if (/^(06|07|01|02|03|04|05|08|09)/.test(value)) score += 3;

  return score;
}

// === simple CSV parser (handles quotes) ===
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

// === test runner ===
function run() {
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
      console.log("❌ MISMATCH");
      console.log("text      :", input);
      console.log("expected  :", expected);
      console.log("predicted :", predicted);
      console.log("candidates:", candidates.slice(0, 5));
      console.log("---");
    }
  }

  console.log(`\nResult: ${correct}/${total} correct (${((correct/total)*100).toFixed(2)}%)`);
}

run();