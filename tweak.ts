// tweak.ts — the file the agent edits.
// Exports transform as the entry point for email parsing experiments.

export function transform(input: string): string | null {
  return parseEmail(input);
}

export function parseEmail(input: string): string | null {
  let text = input.toLowerCase().trim();

  // Take text after last repetition marker
  const repMarkers = [
    'nog een keer langzaam', 'nee wacht ik zeg het opnieuw',
    'wacht ik zeg het opnieuw', 'ik zeg hem opnieuw', 'ik herhaal', 'nee wacht',
  ];
  let bestIdx = -1, bestLen = 0;
  for (const m of repMarkers) {
    const idx = text.lastIndexOf(m);
    if (idx > bestIdx) { bestIdx = idx; bestLen = m.length; }
  }
  if (bestIdx !== -1) text = text.substring(bestIdx + bestLen).trim();

  // Strip leading filler phrases
  const startFillers = [
    'je mag mailen naar ', 'je kunt me mailen op ', 'u kunt mij bereiken via ',
    'mijn e-mailadres is ', 'mijn mailadres is ', 'mijn e-mail is ',
    'noteer maar ', 'voor de bevestiging graag naar ', 'dat is ',
    'stuur het maar naar ', 'voor de bevestiging ',
  ];
  for (const f of startFillers) {
    if (text.startsWith(f)) { text = text.substring(f.length); break; }
  }

  const DIGITS: Record<string, string> = {
    nul: '0', 'één': '1', een: '1', twee: '2', drie: '3', vier: '4',
    vijf: '5', zes: '6', zeven: '7', acht: '8', negen: '9',
  };

  const SKIP = new Set([
    'je', 'mag', 'mailen', 'naar', 'noteer', 'maar', 'voor', 'de',
    'bevestiging', 'graag', 'u', 'kunt', 'mij', 'bereiken', 'via',
    'mijn', 'mailadres', 'is', 'stuur', 'het',
    'alsjeblieft', 'alstublieft', 'zonder', 'spaties', 'helemaal',
    'aan', 'elkaar', 'dus', 'met', 'en', 'dit', 'dat', 'nee', 'niet',
    'oké', 'namelijk', 'langzaam', 'nog', 'keer',
  ]);

  const AT_WORDS = new Set([
    'apenstaart', 'apenstaartje', 'apenstaard', 'apenstraat', 'aapenstaar',
  ]);
  const DOT_WORDS = new Set(['punt', 'dot', 'tot']);
  const DASH_WORDS = new Set(['min', 'streep', 'streepje']);

  const tokens = text.split(/\s+/);
  let result = '';
  let i = 0;

  while (i < tokens.length) {
    const tok = tokens[i];

    // Multi-token: griekse y → y
    if (tok === 'griekse' && i + 1 < tokens.length) {
      i += 2; result += 'y'; continue;
    }
    // Multi-token: laag streepje / laag streepte → _
    if (tok === 'laag' && i + 1 < tokens.length &&
        (tokens[i + 1] === 'streepje' || tokens[i + 1] === 'streepte')) {
      i += 2; result += '_'; continue;
    }
    // Multi-token: dubbele [x] → xx (dubbele u = uu but we want w)
    if (tok === 'dubbele' && i + 1 < tokens.length) {
      const next = tokens[i + 1];
      if (next === 'u' || next === 'v') { i += 2; result += 'w'; continue; }
      if (/^[a-z]$/.test(next)) { i += 2; result += next + next; continue; }
    }

    // Compound laag-X → _digit(s)
    if (tok.startsWith('laag-')) {
      const part = tok.slice(5);
      // Handle compound like zevenenzestig=67
      const num = parseDutchNumber(part, DIGITS);
      result += '_' + (num ?? part);
      i++; continue;
    }

    // laag variants → _
    if (['laagstreepte', 'laagstreet', 'undascore'].includes(tok)) {
      result += '_'; i++; continue;
    }
    // undéén → _1
    if (tok === 'undéén') { result += '_1'; i++; continue; }

    // @ markers
    if (AT_WORDS.has(tok) || tok === 'at' || tok === 'ad') {
      result += '@'; i++; continue;
    }

    // Dot separators
    if (DOT_WORDS.has(tok)) { result += '.'; i++; continue; }

    // Underscore
    if (tok === 'underscore') { result += '_'; i++; continue; }

    // Dash
    if (DASH_WORDS.has(tok)) { result += '-'; i++; continue; }

    // Plus
    if (tok === 'plus') { result += '+'; i++; continue; }

    // ypsilon → y
    if (tok === 'ypsilon') { result += 'y'; i++; continue; }

    // loco / locone mishearing of l / nl
    if (tok === 'loco' || tok === 'local') { result += 'l'; i++; continue; }
    if (tok === 'locone' || tok === 'loconé' || tok === 'lokone' || tok === 'lokoné') {
      result += 'nl'; i++; continue;
    }

    // Number words
    if (DIGITS[tok] !== undefined) { result += DIGITS[tok]; i++; continue; }

    // Single letter a-z
    if (/^[a-z]$/.test(tok)) { result += tok; i++; continue; }

    // Known filler words — skip
    if (SKIP.has(tok)) { i++; continue; }

    // Multi-letter tokens that are NOT email parts — skip
    // (filler, Dutch words we don't know)
    i++;
  }

  if (!result.includes('@')) return null;

  // Basic cleanup: remove leading/trailing dots/dashes from parts
  const [local, ...domainParts] = result.split('@');
  const domain = domainParts.join('@');
  if (!local || !domain) return null;

  return local.replace(/^[.\-_]+|[.\-_]+$/g, '') + '@' +
         domain.replace(/^[.\-_]+|[.\-_]+$/g, '');
}

function parseDutchNumber(s: string, DIGITS: Record<string, string>): string | null {
  if (DIGITS[s] !== undefined) return DIGITS[s];
  // Handle compound: zevenenzestig = 67
  const tens: Record<string, number> = {
    twintig: 20, dertig: 30, veertig: 40, vijftig: 50,
    zestig: 60, zeventig: 70, tachtig: 80, negentig: 90,
  };
  const units: Record<string, number> = {
    nul: 0, 'één': 1, een: 1, twee: 2, drie: 3, vier: 4,
    vijf: 5, zes: 6, zeven: 7, acht: 8, negen: 9,
  };
  // Try "Xenzestig" pattern
  const m = s.match(/^(\w+)en(\w+)$/);
  if (m) {
    const u = units[m[1]];
    const t = tens[m[2]];
    if (u !== undefined && t !== undefined) return String(t + u);
  }
  return null;
}
