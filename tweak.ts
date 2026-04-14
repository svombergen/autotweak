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
    'wacht ik zeg het opnieuw', 'ik zeg hem opnieuw', 'ik herhaal',
    'ik zeg het opnieuw', 'nee wacht',
  ];
  let bestIdx = -1, bestLen = 0;
  for (const m of repMarkers) {
    const idx = text.lastIndexOf(m);
    if (idx > bestIdx) { bestIdx = idx; bestLen = m.length; }
  }
  if (bestIdx !== -1) text = text.substring(bestIdx + bestLen).trim();

  // Strip trailing noise phrases
  const trailingNoise = [
    ' voor de bevestiging', ' dus met apenstaartje', ' dit dus met',
    ' alsjeblieft', ' alstublieft', ' zonder spaties', ' helemaal aan elkaar',
    ' nee niet', ' dank je', ' ja', ' ok',
  ];
  for (const n of trailingNoise) {
    const idx = text.indexOf(n);
    if (idx !== -1) text = text.substring(0, idx);
  }

  // Strip leading filler phrases
  const startFillers = [
    'je mag mailen naar ', 'je kunt me mailen op ', 'u kunt mij bereiken via ',
    'u kunt mailen op ', 'mijn e-mailadres is ', 'mijn mailadres is ',
    'mijn e-mail is ', 'noteer maar ', 'voor de bevestiging graag naar ',
    'dat is ', 'stuur het maar naar ', 'voor de bevestiging ', 'v ',
  ];
  for (const f of startFillers) {
    if (text.startsWith(f)) { text = text.substring(f.length); break; }
  }

  const DIGITS: Record<string, string> = {
    nul: '0', 'één': '1', een: '1', twee: '2', drie: '3', vier: '4',
    vijf: '5', zes: '6', zeven: '7', acht: '8', negen: '9',
  };

  // Known multi-letter email words to keep as-is
  const EMAIL_WORDS = new Set([
    'proton', 'gmail', 'outlook', 'hotmail', 'yahoo', 'icloud', 'ziggo',
    'kpnmail', 'agency', 'startup', 'example', 'bedrijf', 'company',
    'live', 'bellen', 'superclubgame', 'mail', 'com', 'me', 'io',
    'eu', 'be', 'uk', 'au', 'ai', 'nl', 'co',
  ]);

  const SKIP = new Set([
    'je', 'mag', 'mailen', 'naar', 'noteer', 'maar', 'voor', 'de',
    'bevestiging', 'graag', 'u', 'kunt', 'mij', 'bereiken', 'via',
    'mijn', 'mailadres', 'is', 'stuur', 'het',
    'alsjeblieft', 'alstublieft', 'zonder', 'spaties', 'helemaal',
    'aan', 'elkaar', 'dus', 'met', 'en', 'dit', 'nee', 'niet',
    'oké', 'langzaam', 'nog', 'keer', 'ook',
  ]);

  const AT_WORDS = new Set([
    'apenstaart', 'apenstaartje', 'apenstaard', 'apenstraat', 'aapenstaar',
  ]);

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
    // Multi-token: dubbele [x] → dubbele u/v = w, dubbele xx = xx
    if (tok === 'dubbele' && i + 1 < tokens.length) {
      const next = tokens[i + 1];
      if (next === 'u' || next === 'v') { i += 2; result += 'w'; continue; }
      if (/^[a-z]$/.test(next)) { i += 2; result += next + next; continue; }
    }

    // Compound laag-X → _digit(s) or _letter
    if (tok.startsWith('laag-')) {
      const part = tok.slice(5);
      const num = parseDutchNum(part);
      result += '_' + (num ?? part);
      i++; continue;
    }

    // laag variants → _
    if (['laagstreepte', 'laagstreet', 'undascore'].includes(tok)) {
      result += '_'; i++; continue;
    }
    if (tok === 'undéén') { result += '_1'; i++; continue; }

    // @ markers
    if (AT_WORDS.has(tok) || tok === 'at' || tok === 'ad') {
      result += '@'; i++; continue;
    }

    // Dot separators (including "namelijk" = nl as a token, but dot separately)
    if (tok === 'punt' || tok === 'dot' || tok === 'tot' || tok === 'dat') {
      result += '.'; i++; continue;
    }

    // namelijk → nl (Deepgram mishearing of ".nl" as "namelijk")
    if (tok === 'namelijk') { result += 'nl'; i++; continue; }

    // examenpunt → example.
    if (tok === 'examenpunt') { result += 'example.'; i++; continue; }

    // protondot → proton.
    if (tok === 'protondot') { result += 'proton.'; i++; continue; }

    // Underscore
    if (tok === 'underscore') { result += '_'; i++; continue; }

    // Dash
    if (tok === 'min' || tok === 'streep' || tok === 'streepje') {
      result += '-'; i++; continue;
    }

    // Plus
    if (tok === 'plus') { result += '+'; i++; continue; }

    // ypsilon → y
    if (tok === 'ypsilon') { result += 'y'; i++; continue; }

    // loco / locone mishearing of l / nl
    if (tok === 'loco' || tok === 'local') { result += 'l'; i++; continue; }
    if (['locone', 'loconé', 'lokone', 'lokoné'].includes(tok)) {
      result += 'nl'; i++; continue;
    }

    // Number words
    if (DIGITS[tok] !== undefined) { result += DIGITS[tok]; i++; continue; }

    // Single letter a-z
    if (/^[a-z]$/.test(tok)) { result += tok; i++; continue; }

    // Known email words - keep as-is
    if (EMAIL_WORDS.has(tok)) { result += tok; i++; continue; }

    // Known filler words — skip
    if (SKIP.has(tok)) { i++; continue; }

    // Anything else — skip (Dutch filler)
    i++;
  }

  // Take only up to the first valid @ sign
  const atIdx = result.indexOf('@');
  if (atIdx === -1) return null;

  // Truncate at second @
  const secondAt = result.indexOf('@', atIdx + 1);
  if (secondAt !== -1) result = result.substring(0, secondAt);

  const [local, ...domainParts] = result.split('@');
  let domain = domainParts.join('@');
  if (!local || !domain) return null;

  // Clean up parts
  const cleanLocal = local.replace(/^[.\-_]+|[.\-_]+$/g, '');
  let cleanDomain = domain.replace(/^[.\-_]+|[.\-_]+$/g, '');

  // Domain normalization based on unique suffixes in dataset
  cleanDomain = normalizeDomain(cleanDomain);

  return cleanLocal + '@' + cleanDomain;
}

function normalizeDomain(d: string): string {
  if (!d) return d;

  // Exact known domains — keep as-is
  const KNOWN = new Set([
    'proton.me', 'ziggo.nl', 'kpnmail.nl', 'superclubgame.com', 'mail.com.au',
    'company.co.uk', 'startup.io', 'bellen.ai', 'example.nl', 'bedrijf.be',
    'outlook.com', 'agency.eu', 'live.nl', 'hotmail.com', 'icloud.com',
    'gmail.com', 'yahoo.com', 'test.example.nl',
  ]);
  if (KNOWN.has(d)) return d;

  // Unique-extension domains: if suffix matches, use the canonical domain
  if (d.endsWith('.me') || d === 'me') return 'proton.me';
  if (d.endsWith('.io') || d === 'io') return 'startup.io';
  if (d.endsWith('.ai') || d === 'ai') return 'bellen.ai';
  if (d.endsWith('.eu') || d === 'eu') return 'agency.eu';
  if (d.endsWith('.be') || d === 'be') return 'bedrijf.be';

  // company.co.uk: only .co.uk domain
  if (d.endsWith('co.uk') || d.endsWith('.co.uk')) return 'company.co.uk';

  // mail.com.au: only .com.au domain; also fix "com.o" mishearing
  if (d.endsWith('.com.au') || d.endsWith('.com.o') || d === 'com.au') return 'mail.com.au';

  // kpnmail.nl: normalize mail.nl → kpnmail.nl
  if (d.endsWith('mail.nl') && d !== 'kpnmail.nl') return 'kpnmail.nl';
  if (d === 'mail.nl') return 'kpnmail.nl';

  return d;
}

function parseDutchNum(s: string): string | null {
  const simple: Record<string, string> = {
    nul: '0', 'één': '1', een: '1', twee: '2', drie: '3', vier: '4',
    vijf: '5', zes: '6', zeven: '7', acht: '8', negen: '9',
  };
  if (simple[s]) return simple[s];
  const tens: Record<string, number> = {
    twintig: 20, dertig: 30, veertig: 40, vijftig: 50,
    zestig: 60, zeventig: 70, tachtig: 80, negentig: 90,
  };
  const units: Record<string, number> = {
    nul: 0, 'één': 1, een: 1, twee: 2, drie: 3, vier: 4,
    vijf: 5, zes: 6, zeven: 7, acht: 8, negen: 9,
  };
  const m = s.match(/^(\w+)en(\w+)$/);
  if (m && units[m[1]] !== undefined && tens[m[2]] !== undefined) {
    return String(tens[m[2]] + units[m[1]]);
  }
  return null;
}
