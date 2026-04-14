// tweak.ts — the file the agent edits.
// Exports extractPhoneNL and extractPhoneNLCandidates.
// Everything is fair game: regex, scoring logic, tokenization, number words, etc.


export function transform(input: string): string | null {
  return extractPhoneNLCandidates(input)[0] ?? null;
}

export function extractPhoneNL(text: string): string | null {
  const candidates = extractPhoneNLCandidates(text);
  return candidates[0] ?? null;
}

export function extractPhoneNLCandidates(text: string): string[] {
  if (!text) return [];

  const tokens = tokenize(text);

  const splitIdx = findLastRepetitionMarkerEnd(tokens);
  if (splitIdx > 0) {
    const tail = candidatesFromTokens(tokens.slice(splitIdx), text);
    if (tail.length > 0) return tail;
  }

  return candidatesFromTokens(tokens, text);
}

const REPETITION_MARKERS = [
  ["ik", "herhaal"],
  ["nog", "een", "keer"],
  ["nogmaals"],
];

function findLastRepetitionMarkerEnd(tokens: string[]): number {
  let lastEnd = -1;
  for (let i = 0; i < tokens.length; i++) {
    for (const marker of REPETITION_MARKERS) {
      if (i + marker.length <= tokens.length &&
          marker.every((t, k) => tokens[i + k] === t)) {
        let end = i + marker.length;
        if (tokens[end] === "langzaam") end++;
        if (end > lastEnd) lastEnd = end;
      }
    }
  }
  return lastEnd;
}

function candidatesFromTokens(tokens: string[], rawText: string): string[] {
  const fragments = tokensToDigitFragments(tokens);
  if (fragments.length === 0) return [];

  const digitStr = fragments.join("");
  const rawStrings = buildCandidateStrings(fragments);
  const normalized = normalizeCandidates(rawStrings);

  const scored = [...normalized]
    .map((value) => ({ value, score: scoreCandidate(value, rawText.toLowerCase()) }))
    .filter((x) => x.score > -999)
    .sort((a, b) =>
      b.score - a.score ||
      a.value.length - b.value.length ||
      digitStr.lastIndexOf(b.value) - digitStr.lastIndexOf(a.value)
    );

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
      if (next?.length === 1) { out.push(next + next); i++; continue; }
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
  if (DIGIT_WORDS[tok] !== undefined) return DIGIT_WORDS[tok];
  if (/^\d+$/.test(tok)) return tok;
  if (tok === "eenendertig") return "31";
  const n = parseDutchNumberWord(tok);
  return n !== null ? String(n) : null;
}

function parseDutchNumberWord(word: string): number | null {
  let s = word;

  // quick exits
  if (!/[a-z]/.test(s)) return null;
  if (DIGIT_WORDS[s] !== undefined) return Number(DIGIT_WORDS[s]);
  if (SIMPLE_NUMBER_WORDS[s] !== undefined) return SIMPLE_NUMBER_WORDS[s];

  // tens standalone and units-before-tens: twintig, vierentwintig, tweeenveertig, etc.
  for (const [tensWord, tens] of Object.entries({
    twintig: 20, dertig: 30, veertig: 40, vijftig: 50,
    zestig: 60, zeventig: 70, tachtig: 80, negentig: 90,
  })) {
    if (s === tensWord) return tens;
    for (const [unitWord, unit] of Object.entries({
      een: 1, twee: 2, drie: 3, vier: 4, vijf: 5, zes: 6, zeven: 7, acht: 8, negen: 9,
    })) {
      if (s === `${unitWord}en${tensWord}` || s === `${unitWord}${tensWord}`) {
        return unit + tens;
      }
    }
  }

  // hundreds / thousands / millions
  for (const [word, mult, implicitOne] of [
    ["miljoen", 1_000_000, false],
    ["duizend", 1000, true],
    ["honderd", 100, true],
  ] as [string, number, boolean][]) {
    const idx = s.indexOf(word);
    if (idx < 0) continue;
    const left = s.slice(0, idx);
    const right = s.slice(idx + word.length);
    const leftVal = left ? parseDutchNumberWord(left) : (implicitOne ? 1 : null);
    const rightVal = right ? parseDutchNumberWord(right) : 0;
    if (leftVal !== null && rightVal !== null) return leftVal * mult + rightVal;
  }

  return null;
}

function buildCandidateStrings(fragments: string[]): string[] {
  const pieces = fragments.filter(Boolean);
  const out = new Set<string>();

  for (let i = 0; i < pieces.length; i++) {
    let acc = "";
    for (let j = i; j < pieces.length && j < i + 20; j++) {
      acc += pieces[j];
      out.add(acc);
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

    // some STT says 001 when it likely meant 0031 (exactly 001 + 9 digits)
    if (/^001\d{9}$/.test(v)) {
      out.add("0031" + v.slice(3));
    }

    // raw
    out.add(v);

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
  let score = /^\+31\d{9}$/.test(value) ? 120 : /^0031\d{9}$/.test(value) ? 115 : /^0\d{9}$/.test(value) ? 110 : -1000;
  if (score < 0) return score;
  if (rawText.includes("plus")) {
    if (value.startsWith("+31")) score += 20;
    if (value.startsWith("0031")) score -= 8;
    if (value.startsWith("0")) score -= 20;
  } else if (value.startsWith("+31")) score -= 10;
  if (rawText.includes("mobiel") || rawText.includes("gsm")) {
    if (/^(06|\+316|00316)/.test(value)) score += 10;
  }
  if (/^0[1-9]/.test(value)) score += 3;
  return score;
}
