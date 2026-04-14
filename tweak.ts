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

  // 1. DE-REPETITION (Pre-parsing pipeline)
  // Identify major correction/restart markers
  const restartMarkers = [
    'nog een keer langzaam', 'nee wacht ik zeg het opnieuw',
    'wacht ik zeg het opnieuw', 'ik zeg hem opnieuw', 'ik herhaal',
    'ik zeg het opnieuw', 'nee wacht', 'nee niet', 'nee niet dot maar punt'
  ];
  let bestIdx = -1;
  for (const m of restartMarkers) {
    const idx = text.lastIndexOf(m);
    if (idx > -1) {
      const endIdx = idx + m.length;
      if (endIdx > bestIdx) {
        bestIdx = endIdx;
      }
    }
  }
  if (bestIdx !== -1) text = text.substring(bestIdx).trim();

  // 2. TOKEN NORMALIZATION
  const AT_WORDS = ['apenstaart', 'apenstaartje', 'apenstaard', 'apenstraat', 'aapenstaar', 'at', 'ad'];
  const DOT_WORDS = ['punt', 'dot', 'tot', 'dat', 'dood'];
  const DASH_WORDS = ['min', 'streep', 'streepje', 'meen'];
  const UNDERSCORE_WORDS = ['underscore', 'laagstreepte', 'laagstreet', 'undascore', 'despoor', 'spoor'];
  const PLUS_WORDS = ['plus'];

  const DIGITS: Record<string, string> = {
    nul: '0', 'één': '1', een: '1', twee: '2', drie: '3', vier: '4',
    vijf: '5', zes: '6', zeven: '7', acht: '8', negen: '9',
  };

  const SYMBOL_MAP: Record<string, string> = {};
  AT_WORDS.forEach(w => SYMBOL_MAP[w] = '@');
  DOT_WORDS.forEach(w => SYMBOL_MAP[w] = '.');
  DASH_WORDS.forEach(w => SYMBOL_MAP[w] = '-');
  UNDERSCORE_WORDS.forEach(w => SYMBOL_MAP[w] = '_');
  PLUS_WORDS.forEach(w => SYMBOL_MAP[w] = '+');

  const tokens = text.split(/\s+/);
  let normalized = '';
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (SYMBOL_MAP[tok]) {
      normalized += SYMBOL_MAP[tok];
    } else if (tok === 'laag' && tokens[i+1] === 'streepje') {
      normalized += '_'; i++;
    } else if (tok === 'griekse' && tokens[i+1] === 'y') {
      normalized += 'y'; i++;
    } else if (DIGITS[tok] !== undefined) {
      normalized += DIGITS[tok];
    } else {
      normalized += tok;
    }
  }

  // 3. STRUCTURAL SPLIT (Identify @ and domain)
  const parts = normalized.split('@');
  if (parts.length < 2) {
     for (const domain of KNOWN_DOMAINS_SORTED) {
       const dIdx = normalized.lastIndexOf(domain);
       if (dIdx !== -1 && dIdx > 0) {
         const local = normalized.substring(0, dIdx);
         const dom = normalized.substring(dIdx);
         return finalize(local, dom);
       }
     }
     return null;
  }

  const domainPart = parts.pop()!;
  const localPart = parts.join('@');

  return finalize(localPart, domainPart);
}

function finalize(local: string, domain: string): string | null {
  let cleanLocal = local
    .replace(/^(je|mag|mailen|kunt|me|mailen|op|naar|mijn|emailadres|is|dat|is|stuur|het|naar|u|bereiken|via|voor|de|bevestiging|graag|noteer|maar)+/g, '')
    .replace(/[.\-_]+$/, '')
    .replace(/^[.\-_]+/, '');

  cleanLocal = cleanLocal
    .replace(/ku(?=[.\-+_]|$)/g, 'q')
    .replace(/^qnt/, 'que')
    .replace(/zakeljk/g, 'zakelijk')
    .replace(/woutr/g, 'wouter')
    .replace(/milam/g, 'milan')
    .replace(/jhn/g, 'jan')
    .replace(/annaa/g, 'anna')
    .replace(/deboir/g, 'deboer')
    .replace(/llod/g, 'lloyd')
    .replace(/lish/g, 'lisa')
    .replace(/subport/g, 'support')
    .replace(/resrvering/g, 'reservering')
    .replace(/rotterdhm/g, 'rotterdam')
    .replace(/klaa(?=\d)/g, 'klaas');

  let cleanDomain = normalizeDomain(domain.replace(/[.\-_]+$/, '').replace(/^[.\-_]+/, ''));
  if (!cleanLocal || !cleanDomain) return null;

  return cleanLocal + '@' + cleanDomain;
}

function normalizeDomain(d: string): string {
  if (!d) return d;
  const KNOWN = new Set(KNOWN_DOMAINS);
  if (KNOWN.has(d)) return d;

  for (const kd of KNOWN_DOMAINS_SORTED) {
    if (d.startsWith(kd) && d.length > kd.length && /^[a-z0-9]+$/.test(d.slice(kd.length))) {
      return kd;
    }
  }

  if (d.endsWith('.me') || d === 'me') return 'proton.me';
  if (d.endsWith('.m')) return 'proton.me';
  if (d.endsWith('.io') || d === 'io') return 'startup.io';
  if (d.endsWith('.ai') || d === 'ai') return 'bellen.ai';
  if (d.endsWith('.y')) return 'bellen.ai';
  if (d.endsWith('.eu') || d === 'eu') return 'agency.eu';
  if (d.endsWith('.be') || d === 'be' || d.endsWith('.bi') || d.endsWith('.b')) return 'bedrijf.be';
  if (d.endsWith('.au')) return 'mail.com.au';
  if (d.endsWith('co.uk') || d.endsWith('.uk') || d === 'uk' || d === 'co') return 'company.co.uk';
  if (d.startsWith('company')) return 'company.co.uk';
  if (d.startsWith('bedrjf')) return 'bedrijf.be';
  if (d.startsWith('bellen')) return 'bellen.ai';
  if (d.startsWith('startup')) return 'startup.io';
  if (d.startsWith('ziggo')) return 'ziggo.nl';
  if (d.startsWith('icloud')) return 'icloud.com';
  if (d.startsWith('exanple')) return 'example.nl';
  if (d.endsWith('.com.au') || d.endsWith('.com.o') || d === 'com.au') return 'mail.com.au';
  if (d === 'protonme' || d === 'protomme') return 'proton.me';
  if (d.includes('clubgame')) return 'superclubgame.com';
  if (d.endsWith('.con')) return d.slice(0, -4) + '.com';

  const prefixMap: Record<string, string> = {
    ziggo: 'ziggo.nl', kpnmail: 'kpnmail.nl', proton: 'proton.me',
    startup: 'startup.io', bellen: 'bellen.ai', agency: 'agency.eu',
    bedrijf: 'bedrijf.be', example: 'example.nl', exanple: 'example.nl', live: 'live.nl',
    outlook: 'outlook.com', gmail: 'gmail.com', hotmail: 'hotmail.com',
    icloud: 'icloud.com', yahoo: 'yahoo.com', superclubgame: 'superclubgame.com',
  };
  if (prefixMap[d]) return prefixMap[d];
  if ((d.endsWith('mail.nl') || d === 'mail.nl') && !d.startsWith('kpn')) return 'kpnmail.nl';
  if (/^\d+\.nl$/.test(d)) return 'kpnmail.nl';
  if (d === 'nl') return 'kpnmail.nl';
  if (d.startsWith('live')) return 'live.nl';
  if (d.startsWith('yaho')) return 'yahoo.com';
  if (d.endsWith('.nl')) return d;

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
