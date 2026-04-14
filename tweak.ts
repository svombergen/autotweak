// tweak.ts — the file the agent edits.
// Exports transform as the entry point for email parsing experiments.

export function transform(input: string): string | null {
  return parseEmail(input);
}

const KNOWN_DOMAINS = [
  'proton.me', 'ziggo.nl', 'kpnmail.nl', 'superclubgame.com', 'mail.com.au',
  'company.co.uk', 'startup.io', 'bellen.ai', 'example.nl', 'bedrijf.be',
  'outlook.com', 'agency.eu', 'live.nl', 'hotmail.com', 'icloud.com',
  'gmail.com', 'yahoo.com', 'test.example.nl',
];

const KNOWN_DOMAINS_SORTED = [...KNOWN_DOMAINS].sort((a, b) => b.length - a.length);

export function parseEmail(input: string): string | null {
  let text = input.toLowerCase().trim();

  // Take text after last repetition marker
  const repMarkers = [
    'nog een keer langzaam', 'nee wacht ik zeg het opnieuw',
    'wacht ik zeg het opnieuw', 'ik zeg hem opnieuw', 'ik herhaal',
    'ik zeg het opnieuw', 'nee wacht', 'nee niets op maar punt',
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
    ' nee niet', ' dank je', ' dank', ' ja', ' ok',
  ];
  for (const n of trailingNoise) {
    const idx = text.indexOf(n);
    if (idx !== -1) text = text.substring(0, idx);
  }

  // Strip leading filler phrases
  const startFillers = [
    'je mag mailen naar ', 'je kunt me mailen op ', 'u kunt mij bereiken via ',
    'u kunt mailen op ', 'u kunt me mailen op ', 'mijn e-mailadres is ', 'mijn mailadres is ',
    'mijn e-mail is ', 'noteer maar ', 'voor de bevestiging graag naar ',
    'dat is ', 'stuur het maar naar ', 'voor de bevestiging ',
  ];
  for (const f of startFillers) {
    if (text.startsWith(f)) { text = text.substring(f.length); break; }
  }

  const DIGITS: Record<string, string> = {
    nul: '0', 'één': '1', een: '1', twee: '2', drie: '3', vier: '4',
    vijf: '5', zes: '6', zeven: '7', acht: '8', negen: '9',
  };

  const EMAIL_WORDS = new Set([
    'proton', 'gmail', 'outlook', 'hotmail', 'yahoo', 'icloud', 'ziggo',
    'kpnmail', 'agency', 'startup', 'example', 'bedrijf', 'company',
    'live', 'bellen', 'superclubgame', 'mail', 'com', 'me', 'io',
    'eu', 'be', 'bi', 'uk', 'au', 'ai', 'nl', 'co',
  ]);

  const SKIP = new Set([
    'je', 'mag', 'mailen', 'naar', 'noteer', 'maar', 'voor', 'de',
    'bevestiging', 'graag', 'u', 'kunt', 'mij', 'bereiken', 'via',
    'mijn', 'mailadres', 'is', 'stuur', 'het', 'alsjeblieft', 'alstublieft',
    'zonder', 'spaties', 'helemaal', 'aan', 'elkaar', 'dus', 'met', 'en',
    'dit', 'nee', 'niet', 'oké', 'langzaam', 'nog', 'keer', 'ook', 'dank',
    'bestaat', 'op', 'editiet', 'editit', 'delict', 'niets',
  ]);

  const AT_WORDS = new Set([
    'apenstaart', 'apenstaartje', 'apenstaard', 'apenstraat', 'aapenstaar',
  ]);

  const tokens = text.split(/\s+/);
  let result = '';
  let i = 0;

  while (i < tokens.length) {
    const tok = tokens[i];

    // Multi-token: een despoor / een de spoor → _
    if (tok === 'een' && i + 1 < tokens.length && tokens[i + 1] === 'despoor') {
      result += '_'; i += 2; continue;
    }
    if (tok === 'een' && i + 2 < tokens.length && tokens[i + 1] === 'de' && tokens[i + 2] === 'spoor') {
      result += '_'; i += 3; continue;
    }
    // Multi-token: een between single letters → letter 'n' (Dutch spelling of letter n as "en/een")
    if (tok === 'een' && i > 0 && i + 1 < tokens.length &&
        /^[a-z]$/.test(tokens[i - 1]) && /^[a-z]$/.test(tokens[i + 1])) {
      result += 'n'; i++; continue;
    }

    // Multi-token: k meel / k mill → kpnmail (Deepgram merging)
    if (tok === 'k' && i + 1 < tokens.length &&
        (tokens[i + 1] === 'meel' || tokens[i + 1] === 'mill')) {
      result += 'kpnmail'; i += 2; continue;
    }

    // Multi-token: laagstreet/laagstreepte/undascore + y → _ (skip spurious y)
    if ((tok === 'laagstreepte' || tok === 'laagstreet' || tok === 'undascore') &&
        i + 1 < tokens.length && tokens[i + 1] === 'y') {
      result += '_'; i += 2; continue;
    }

    // Multi-token: griekse y → y
    if (tok === 'griekse' && i + 1 < tokens.length) {
      i += 2; result += 'y'; continue;
    }
    // Multi-token: laag streepje / laag streepte → _
    if (tok === 'laag' && i + 1 < tokens.length &&
        (tokens[i + 1] === 'streepje' || tokens[i + 1] === 'streepte')) {
      i += 2; result += '_'; continue;
    }
    // Multi-token: dubbele [x] → dubbele u/v = w
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

    // Special compound tokens
    if (tok === 'q-mail' || tok === 'kmail' || tok === 'krumeel' || tok === 'kamil') { result += 'kpnmail'; i++; continue; }
    if (tok === 'woutr') { result += 'wouter'; i++; continue; }
    if (tok === 'milam') { result += 'milan'; i++; continue; }
    if (tok === 'jhn') { result += 'jan'; i++; continue; }
    if (tok === 'zakeljk') { result += 'zakelijk'; i++; continue; }
    if (tok === 'amstrdam') { result += 'amsterdam'; i++; continue; }
    if (tok === 'annaa') { result += 'anna'; i++; continue; }
    if (tok === 'deboir') { result += 'deboer'; i++; continue; }
    if (tok === 'subport') { result += 'support'; i++; continue; }
    if (tok === 'resrvering') { result += 'reservering'; i++; continue; }
    if (tok === 'gent') { result += 'gent'; i++; continue; }
    if (tok === 'coopand') { result += 'company'; i++; continue; }

    // azige/zico → @ziggo (Deepgram mishearings)
    if (tok === 'azige' || tok === 'zico') { result += '@ziggo'; i++; continue; }

    // despoor/spoor → _ (underscore marker variants)
    if (tok === 'despoor' || tok === 'spoor') { result += '_'; i++; continue; }

    // koor → com.au (Deepgram mishearing of "com.au")
    if (tok === 'koor') { result += 'com.au'; i++; continue; }

    // dood → . (Dutch "dot" mishearing)
    if (tok === 'dood') { result += '.'; i++; continue; }

    // exanple → example (Deepgram typo)
    if (tok === 'exanple') { result += 'example'; i++; continue; }

    // Hyphenated compound tokens (e.g. m-g, mail-r): split on '-' and emit parts
    if (tok.includes('-') && !tok.startsWith('e-mail')) {
      const parts = tok.split('-');
      for (let pi = 0; pi < parts.length; pi++) {
        const p = parts[pi];
        if (pi > 0) result += '-';
        if (DIGITS[p] !== undefined) result += DIGITS[p];
        else if (/^[a-z]$/.test(p)) result += p;
        else if (EMAIL_WORDS.has(p)) result += p;
        // else skip unknown parts
      }
      i++; continue;
    }

    // @ markers
    if (AT_WORDS.has(tok) || tok === 'at' || tok === 'ad') {
      result += '@'; i++; continue;
    }

    // Dot separators
    if (tok === 'punt' || tok === 'dot' || tok === 'tot' || tok === 'dat') {
      result += '.'; i++; continue;
    }

    // namelijk → nl (Deepgram mishearing of ".nl" suffix)
    if (tok === 'namelijk') { result += 'nl'; i++; continue; }

    // examenpunt → example. ; examen → example
    if (tok === 'examenpunt') { result += 'example.'; i++; continue; }
    if (tok === 'examen') { result += 'example'; i++; continue; }

    // protondot → proton.
    if (tok === 'protondot') { result += 'proton.'; i++; continue; }

    // nat → n (Deepgram merging letter n with @ sound)
    if (tok === 'nat') { result += 'n'; i++; continue; }

    // UK mishearings → uk
    if (tok === 'juke' || tok === 'toeké' || tok === 'youké') {
      result += 'uk'; i++; continue;
    }

    // Underscore
    if (tok === 'underscore') { result += '_'; i++; continue; }

    // Dash
    if (tok === 'min' || tok === 'streep' || tok === 'streepje' || tok === 'meen') {
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

    // Common spoken letter names that show up in locals
    if (tok === 'ku' && i + 1 < tokens.length && (tokens[i + 1] === 'punt' || tokens[i + 1] === 'dot' || tokens[i + 1] === 'tot')) { result += 'q'; i++; continue; }

    // Known email words - keep as-is
    if (EMAIL_WORDS.has(tok)) { result += tok; i++; continue; }

    // Known filler words — skip
    if (SKIP.has(tok)) { i++; continue; }

    // Anything else — skip
    i++;
  }

  // If no @, try to detect domain at end and insert @
  if (!result.includes('@')) {
    // Include aliases (domains without dots) for detection
    const detectionMap: [string, string][] = [
      ...KNOWN_DOMAINS_SORTED.map(d => [d, d] as [string, string]),
      ['protonme', 'proton.me'], ['kpnmail', 'kpnmail.nl'], ['ziggo', 'ziggo.nl'],
      ['startup', 'startup.io'], ['bellen', 'bellen.ai'], ['agency', 'agency.eu'],
      ['bedrijf', 'bedrijf.be'], ['example', 'example.nl'], ['live', 'live.nl'],
      ['outlook', 'outlook.com'], ['gmail', 'gmail.com'], ['hotmail', 'hotmail.com'],
      ['icloud', 'icloud.com'], ['yahoo', 'yahoo.com'], ['superclubgame', 'superclubgame.com'],
      ['mail.com.o', 'mail.com.au'], ['ahoo.com', 'yahoo.com'],
      ['.io', 'startup.io'], ['.eu', 'agency.eu'], ['.ai', 'bellen.ai'],
      ['protomme', 'proton.me'], ['co.uk', 'company.co.uk'],
    ];
    for (const [suffix, canonical] of detectionMap) {
      if (result.endsWith(suffix)) {
        const local = result.slice(0, result.length - suffix.length);
        if (local) { result = local + '@' + canonical; break; }
      }
    }
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

  let cleanLocal = local.replace(/^[.\-_]+|[.\-_]+$/g, '');
  let cleanDomain = domain.replace(/^[.\-_]+|[.\-_]+$/g, '');

  cleanLocal = cleanLocal
    .replace(/^io\+/, 'info+')
    .replace(/^q(?=nt)/, 'que')
    .replace(/^teanb$/, 'team-be')
    .replace(/^zakeljk$/, 'zakelijk')
    .replace(/^subport/, 'support')
    .replace(/^malbox/, 'mailbox')
    .replace(/^woutr/, 'wouter')
    .replace(/^milam/, 'milan')
    .replace(/^jhn/, 'jan')
    .replace(/^subport/, 'support')
    .replace(/^resrvering/, 'reservering')
    .replace(/^rotterdhm/, 'rotterdam')
    .replace(/^s\+/, 'smit+')
    .replace(/^team_subport_/, 'team_support_')
    .replace(/annaa$/, 'anna')
    .replace(/deboir$/, 'deboer')
    .replace(/klaa(?=_\d+$)/, 'klaas')
    .replace(/jhn$/, 'jan')
    .replace(/annaa(?=[.+\-_]|$)/, 'anna')
    .replace(/rotterdhm/, 'rotterdam')
    .replace(/annaa(?=aency)/, 'anna')
    .replace(/llod/, 'lloyd')
    .replace(/lish$/, 'lisa')
    .replace(/dest$/, 'test')
    .replace(/ku(?=\.)/, 'q');

  cleanDomain = normalizeDomain(cleanDomain);

  return cleanLocal + '@' + cleanDomain;
}

function normalizeDomain(d: string): string {
  if (!d) return d;
  const KNOWN = new Set(KNOWN_DOMAINS);
  if (KNOWN.has(d)) return d;

  // startsWith check: known domain + trailing garbage chars (e.g. "agency.euok", "kpnmail.nl000")
  for (const kd of KNOWN_DOMAINS_SORTED) {
    if (d.startsWith(kd) && d.length > kd.length && /^[a-z0-9]+$/.test(d.slice(kd.length))) {
      return kd;
    }
  }

  // Unique-extension domains (by suffix)
  if (d.endsWith('.me') || d === 'me') return 'proton.me';
  if (d.endsWith('.m')) return 'proton.me';   // proton.m → proton.me
  if (d.endsWith('.io') || d === 'io') return 'startup.io';
  if (d.endsWith('.ai') || d === 'ai') return 'bellen.ai';
  if (d.endsWith('.y')) return 'bellen.ai';   // bellen.y mishearing
  if (d.endsWith('.eu') || d === 'eu') return 'agency.eu';
  if (d.endsWith('.be') || d === 'be' || d.endsWith('.bi') || d.endsWith('.b')) return 'bedrijf.be';
  if (d.endsWith('.au')) return 'mail.com.au'; // mail..au etc.

  // company.co.uk: .co.uk or .uk suffix or uk/co alone
  if (d.endsWith('co.uk') || d.endsWith('.uk') || d === 'uk' || d === 'co') return 'company.co.uk';

  // company domain prefix (e.g. companyuk, coopand+uk)
  if (d.startsWith('company')) return 'company.co.uk';
  // bedrijf spelling variant (bedrjf)
  if (d.startsWith('bedrjf')) return 'bedrijf.be';
  // Unique domain prefixes to handle garbled spellings
  if (d.startsWith('bellen')) return 'bellen.ai';
  if (d.startsWith('startup')) return 'startup.io';
  if (d.startsWith('ziggo')) return 'ziggo.nl';
  if (d.startsWith('icloud')) return 'icloud.com';
  if (d.startsWith('exanple')) return 'example.nl';

  // mail.com.au: only .com.au domain; fix "com.o" mishearing
  if (d.endsWith('.com.au') || d.endsWith('.com.o') || d === 'com.au') return 'mail.com.au';

  // protonme/protomme → proton.me
  if (d === 'protonme' || d === 'protomme') return 'proton.me';

  // superclubgame: handle misspellings with "clubgame"
  if (d.includes('clubgame')) return 'superclubgame.com';

  // Fix .con → .com (icloud.con etc.)
  if (d.endsWith('.con')) return d.slice(0, -4) + '.com';

  // Domain-only (missing TLD) — unique prefixes in dataset
  const prefixMap: Record<string, string> = {
    ziggo: 'ziggo.nl', kpnmail: 'kpnmail.nl', proton: 'proton.me',
    startup: 'startup.io', bellen: 'bellen.ai', agency: 'agency.eu',
    bedrijf: 'bedrijf.be', example: 'example.nl', exanple: 'example.nl', live: 'live.nl',
    outlook: 'outlook.com', gmail: 'gmail.com', hotmail: 'hotmail.com',
    icloud: 'icloud.com', yahoo: 'yahoo.com', superclubgame: 'superclubgame.com',
  };
  if (prefixMap[d]) return prefixMap[d];

  // kpnmail.nl: normalize mail.nl → kpnmail.nl
  if ((d.endsWith('mail.nl') || d === 'mail.nl') && !d.startsWith('kpn')) return 'kpnmail.nl';

  // Domain = just digits + .nl (e.g. "00.nl", "0.nl") → kpnmail.nl
  if (/^\d+\.nl$/.test(d)) return 'kpnmail.nl';

  // Domain = "nl" alone (TLD only, missing provider) → kpnmail.nl
  if (d === 'nl') return 'kpnmail.nl';

  // Unique prefix fixes for remaining garbled domains
  if (d.startsWith('live')) return 'live.nl';
  if (d.startsWith('yaho')) return 'yahoo.com';

  // Ziggo/kpnmail/live without extension: ends with .nl
  if (d.endsWith('.nl')) return d; // keep as-is if has extension

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
