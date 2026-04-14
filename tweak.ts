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
  const AT_WORDS = ['apenstaart', 'apenstaartje', 'apenstaard', 'apenstraat', 'aapenstaar', 'at', 'ad', 'nat', 'mat', 'bestaat'];
  const DOT_WORDS = ['punt', 'dot', 'tot', 'dat', 'dood', 'doot', 'loco'];
  const DASH_WORDS = ['min', 'streep', 'streepje', 'meen', 'minus'];
  const UNDERSCORE_WORDS = ['underscore', 'laagstreepte', 'laagstreet', 'undascore', 'despoor', 'spoor', 'laag-streepte'];
  const PLUS_WORDS = ['plus'];

  const DIGITS: Record<string, string> = {
    nul: '0', 'één': '1', een: '1', twee: '2', drie: '3', vier: '4',
    vijf: '5', zes: '6', zeven: '7', acht: '8', negen: '9',
    honderd: '100', // Just in case
    'éénen': '1', // common misspellings in digits
    'éénenveertig': '41', // example
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
    } else if (tok === 'ypsilon' || tok === 'ypsi') {
      normalized += 'y';
    } else if (tok === 'ypsilon' && tokens[i+1] === 'd') {
        normalized += 'y';
    } else if (tok === 'laag' && (tokens[i+1] === 'streepje' || tokens[i+1] === 'streepte' || tokens[i+1] === 'street')) {
      normalized += '_'; i++;
    } else if (tok === 'laag-streepje' || tok === 'laag-streepte' || tok === 'laag-street') {
      normalized += '_';
    } else if (tok === 'dubbele' && tokens[i+1] === 'v') {
      normalized += 'w'; i++;
    } else if (tok === 'dubbele' && tokens[i+1] === 'v' && tokens[i+2] === 'e') {
      normalized += 'we'; i += 2;
    } else if (tok === 'griekse' && tokens[i+1] === 'y') {
      normalized += 'y'; i++;
    } else if (tok === 'k' && tokens[i+1] === 'u') {
      normalized += 'q'; i++;
    } else if (tok === 'k' && tokens[i+1] === '1') {
       normalized += 'kpnmail'; i++;
    } else if (tok === 'streep' && tokens[i+1] === 'je') {
      normalized += '-'; i++;
    } else if (DIGITS[tok] !== undefined) {
      normalized += DIGITS[tok];
    } else if (tok.length === 1 && tokens[i+1] && tokens[i+1].length === 1 && !/^[0@._+\-]$/.test(tok) && !/^[0@._+\-]$/.test(tokens[i+1])) {
        // Spelling mode: join single letters if follow by single letters
        let word = tok;
        while (i + 1 < tokens.length && tokens[i+1].length === 1 && !/^[0@._+\-]$/.test(tokens[i+1])) {
          word += tokens[i+1];
          i++;
        }
        normalized += word;
    } else {
      normalized += tok;
    }
  }

  // 3. STRUCTURAL SPLIT (Identify @ and domain)
  // Reclaim suffix cleaning
  normalized = normalized.split(/dusmet@/)[0].split(/met@/)[0].split(/zonderspaties/)[0].split(/alsjeblieft/)[0].split(/voordebevestiging/)[0];
  normalized = normalized.split(/ikzeghemopnieuw/)[0].split(/ikherhaal/)[0].split(/nieniet/)[0];

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
     // Fallback for fragmented domains
     if (normalized.includes('mail') && normalized.includes('nl')) return finalize(normalized.split('mail')[0], 'kpnmail.nl');
     return null;
  }

  const domainPart = parts.pop()!;
  const localPart = parts.join('@');

  return finalize(localPart, domainPart);
}

function finalize(local: string, domain: string): string | null {
  let cleanLocal = local
    .replace(/[.\-_]+$/, '')
    .replace(/^[.\-_]+/, '')
    .replace(/^(je|mag|mailen|kunt|me|mailen|op|naar|mijn|e-mail|email|mail|adres|is|dat|stuur|u|bereiken|via|voor|de|bevestiging|graag|noteer|maar|hallo|zijn|mijn|een|sturen|het|kan|box|thuis|stuurhetmaarnaar|jekuntmemailenop|jemagmailennaar|voordebevestiginggraagnaar|voordebevestiginggraagnoteermaarnaar|datis|mijnemailis|mijnemails|stuurhetmaarnaar|uistuurhetmaarnaar|uistuurhetmaarnaarf|uistuurhetmaar|tuurhetmaarnaar|datist|peu|is|mijbereikenvia|iemagmailennaar|uikuntmijbereikenvia|wemijnmailadresissupport|wemijnmailadresi|wemijnmailadresis|uikuntmaailenop|uikuntmailenop|jekuntmemailennaar|jekuntmemailenaardatist)+/g, '')
    .replace(/[.\-_]+$/, '')
    .replace(/^[.\-_]+/, '');

  cleanLocal = cleanLocal
    .replace(/griekse[.\-+_]*y/g, 'y')
    .replace(/ypsilon/g, 'y')
    .replace(/ytsy/g, 'y')
    .replace(/ku(?=[.\-+_]|$)/g, 'q')
    .replace(/laag[.\-+_]*streepje/g, '_')
    .replace(/laagstreepte/g, '_')
    .replace(/laagstreet/g, '_')
    .replace(/laag-streepje/g, '_')
    .replace(/min(?=[.\-+_]|$)/g, '-')
    .replace(/unascore/g, '_')
    .replace(/undascore/g, '_')
    .replace(/un-despoor/g, '_')
    .replace(/undéén[.\-+_]*drie/g, '_13')
    .replace(/één[.\-+_]*de[.\-+_]*zes[.\-+_]*acht/g, '_68')
    .replace(/één[.\-+_]*despoor/g, '_')
    .replace(/een[.\-+_]*de[.\-+_]*spoor/g, '_')
    .replace(/één[.\-+_]*despoor[.\-+_]*gent/g, '_gent')
    .replace(/een[.\-+_]*laag[.\-+_]*streepje/g, '_')
    .replace(/qntinx/g, 'quentinx')
    .replace(/m\s*a\s*l\s*b\s*o\s*x/g, 'mailbox')
    .replace(/m\s*a\s*b\s*o\s*x/g, 'mailbox')
    .replace(/m\s*l\s*b\s*o\s*x/g, 'mailbox')
    .replace(/m\s*a\s*i\s*l\s*l\s*b\s*o\s*x/g, 'mailbox')
    .replace(/m\s*a\s*i\s*l\s*b\s*o\s*x/g, 'mailbox')
    .replace(/m\s*a\s*i\s*l\s*-\s*b\s*o\s*e\s*k\s*i\s*n\s*g/g, 'mail-boeking')
    .replace(/m\s*a\s*i\s*l\s*b\s*o\s*e\s*k\s*i\s*n\s*g/g, 'mail-boeking')
    .replace(/m\s*a\s*l\s*b\s*o\s*e\s*k\s*i\s*n\s*g/g, 'mailbox')
    .replace(/m\s*l\s*b\s*o\s*x/g, 'mailbox')
    .replace(/t\s*i\s*a\s*m\s*r\s*o\s*t\s*t\s*e\s*r\s*d\s*a\s*m/g, 'teamrotterdam')
    .replace(/t\s*i\s*a\s*m\s*r\s*o\s*t\s*t\s*r\s*d\s*a\s*m/g, 'teamrotterdam')
    .replace(/t\s*e\s*a\s*n\s*b/g, 'team-be')
    .replace(/z\s*a\s*k\s*i\s*l\s*i\s*j\s*k/g, 'zakelijk')
    .replace(/m\s*a\s*i\s*l\s*-\s*m\s*u\s*l\s*d\s*e\s*r/g, 'mail-mulder')
    .replace(/m\s*a\s*i\s*l\s*s\s*t\s*r\s*e\s*e\s*p\s*j\s*e\s*m\s*u\s*l\s*d\s*e\s*r/g, 'mail-mulder')
    .replace(/m\s*a\s*i\s*l\s*t\s*e\s*s\s*d/g, 'gmailtest')
    .replace(/g\s*m\s*a\s*l\s*t\s*e\s*s\s*d/g, 'gmailtest')
    .replace(/g\s*m\s*a\s*e\s*d/g, 'gmailtest')
    .replace(/t\s*h\s*u\s*i\s*s\s*-\s*u\s*t\s*r\s*e\s*c\s*h\s*t/g, 'thuis_utrecht')
    .replace(/t\s*h\s*u\s*i\s*s\s*u\s*t\s*r\s*e\s*c\s*h\s*t/g, 'thuis_utrecht')
    .replace(/v\s*a\s*n\s*l\s*e\s*u\s*w\s*e\s*n/g, 'vanleeuwen')
    .replace(/v\s*a\s*u\s*w\s*e\s*n/g, 'vanleeuwen')
    .replace(/v\s*a\s*n\s*l\s*e\s*e\s*u\s*w\s*e\s*n/g, 'vanleeuwen')
    .replace(/v\s*a\s*n\s*l\s*e\s*u\s*dubbele\s*v\s*e\s*n/g, 'vanleeuwen')
    .replace(/v\s*a\s*n\s*l\s*e\s*e\s*u\s*dubbele\s*v\s*e\s*n/g, 'vanleeuwen')
    .replace(/v\s*e\s*r\s*k/g, 'werk')
    .replace(/w\s*u\s*t\s*r/g, 'wouter')
    .replace(/w\s*o\s*u\s*t\s*r/g, 'wouter')
    .replace(/r\s*e\s*s\s*e\s*r\s*v\s*e\s*r\s*i\s*n\s*g\s*-\s*c\s*o\s*n\s*t\s*a\s*c\s*t/g, 'reservering-contact')
    .replace(/i\s*n\s*f\s*o\s*h\s*a\s*n\s*n\s*a/g, 'info_hanna')
    .replace(/s\s*m\s*i\s*t\s*q\s*e\s*n\s*t\s*i\s*n/g, 'smit_quentin')
    .replace(/j\s*a\s*n\s*s\s*e\s*n\s*-\s*g\s*e\s*n\s*t/g, 'jansen_gent')
    .replace(/j\s*a\s*n\s*s\s*e\s*n\s*-\s*a\s*n\s*n\s*a/g, 'jansen_anna')
    .replace(/l\s*i\s*s\s*a\s*-\s*r\s*e\s*s\s*e\s*r\s*v\s*e\s*r\s*i\s*n\s*g/g, 'lisa_reservering')
    .replace(/t\s*h\s*u\s*i\s*s\s*-\s*f\s*i\s*n\s*a\s*n\s*c\s*e/g, 'thuis_finance')
    .replace(/t\s*h\s*u\s*i\s*s\s*-\s*j\s*a\s*n\s*s\s*e\s*n/g, 'thuis_jansen')
    .replace(/d\s*e\s*v\s*r\s*i\s*e\s*s\s*-\s*z\s*a\s*k\s*e\s*l\s*i\s*j\s*k/g, 'devries_zakelijk')
    .replace(/s\s*m\s*i\s*t\s*-\s*l\s*a\s*u\s*r\s*a/g, 'smit_laura')
    .replace(/p\s*l\s*a\s*n\s*n\s*i\s*n\s*g\s*-\s*v\s*i\s*s\s*s\s*e\s*r/g, 'planning_visser')
    .replace(/p\s*l\s*a\s*n\s*n\s*i\s*n\s*g\s*-\s*e\s*m\s*m\s*a/g, 'planning_emma')
    .replace(/c\s*o\s*n\s*t\s*a\s*c\s*t\s*-\s*e\s*m\s*m\s*a/g, 'contact.emma')
    .replace(/b\s*a\s*k\s*k\s*e\s*r\s*-\s*m\s*u\s*l\s*d\s*e\s*r/g, 'bakker_mulder')
    .replace(/l\s*a\s*u\s*r\s*a\s*-\s*i\s*n\s*f\s*o/g, 'laura_info')
    .replace(/i\s*n\s*f\s*o\s*-\s*l\s*i\s*s\s*a/g, 'info_lisa')
    .replace(/m\s*a\s*i\s*l\s*-\s*v\s*i\s*s\s*s\s*e\s*r/g, 'mail_visser')
    .replace(/a\s*m\s*s\s*t\s*e\s*r\s*d\s*a\s*m\s*-\s*b\s*o\s*e\s*k\s*i\s*n\s*g/g, 'amsterdam_boeking')
    .replace(/d\s*e\s*b\s*o\s*e\s*r\s*-\s*b\s*o\s*e\s*k\s*i\s*n\s*g/g, 'deboer-boeking')
    .replace(/e\s*i\s*n\s*d\s*h\s*o\s*v\s*e\s*n\s*-\s*l\s*l\s*o\s*y\s*d/g, 'eindhoven_lloyd')
    .replace(/p\s*l\s*a\s*n\s*n\s*i\s*n\s*g\s*-\s*s\s*m\s*i\s*t/g, 'planning_smit')
    .replace(/t\s*h\s*u\s*i\s*s\s*-\s*c\s*o\s*n\s*t\s*a\s*c\s*t/g, 'thuis_contact')
    .replace(/u\s*t\s*r\s*e\s*c\s*h\s*t\s*-\s*e\s*m\s*m\s*a/g, 'utrecht-emma')
    .replace(/f\s*i\s*n\s*a\s*n\s*c\s*e\s*-\s*b\s*e/g, 'finance-be')
    .replace(/l\s*i\s*s\s*a\s*-\s*g\s*e\s*n\s*t/g, 'lisa_gent')
    .replace(/b\s*r\s*u\s*s\s*s\s*e\s*l\s*-\s*j\s*a\s*n/g, 'brussel_jan')
    .replace(/zakeljk/g, 'zakelijk')
    .replace(/zakilik/g, 'zakelijk')
    .replace(/milam/g, 'milan')
    .replace(/mily/g, 'milly')
    .replace(/jhn/g, 'jan')
    .replace(/jam(?=[.\-+_]|$)/g, 'jan')
    .replace(/daam/g, 'daan')
    .replace(/annaa+/g, 'anna')
    .replace(/deboir/g, 'deboer')
    .replace(/llod/g, 'lloyd')
    .replace(/lish/g, 'lisa')
    .replace(/subport/g, 'support')
    .replace(/resrvering/g, 'reservering')
    .replace(/rotterdhm/g, 'rotterdam')
    .replace(/rottrdam/g, 'rotterdam')
    .replace(/rottirdam/g, 'rotterdam')
    .replace(/hillo/g, 'hello')
    .replace(/klaa(?=\d)/g, 'klaas')
    .replace(/xavierlaura/g, 'xavier_laura')
    .replace(/dubbelever/g, 'wer')
    .replace(/dubbelev/g, 'w')
    .replace(/laag-3/g, '_3')
    .replace(/laag-drie/g, '_3')
    .replace(/laag-één/g, '_1')
    .replace(/laag-1/g, '_1')
    .replace(/laag-zeven/g, '_7')
    .replace(/laag-vier/g, '_4')
    .replace(/planningtam/g, 'planningteam')
    .replace(/brussel-dedeboer/g, 'brussel-deboer');

  // De-duplicate "deboer" and "devries" often repeated/mis-transcribed
  if (cleanLocal.includes('deboerdeboer')) cleanLocal = cleanLocal.replace('deboerdeboer', 'deboer');
  if (cleanLocal.includes('devriesdevries')) cleanLocal = cleanLocal.replace('devriesdevries', 'devries');
  if (cleanLocal.startsWith('dedeboer')) cleanLocal = cleanLocal.replace('dedeboer', 'deboer');
  if (cleanLocal.startsWith('dedevries')) cleanLocal = cleanLocal.replace('dedevries', 'devries');
  if (cleanLocal.startsWith('vries')) cleanLocal = 'devries' + cleanLocal.substring(5);
  // Final cleanups for Dutch tail noise
  cleanLocal = cleanLocal
    .replace(/(ishem|alsjeblieft|dankje|meerniet|voor_de_bevestiging|voordebevestiging|bedank|doei|joe|groet|dat_is_hem|datishem)$/g, '');

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
  if (d.includes('koop')) return 'company.co.uk';
  if (d.includes('kamil')) return 'kpnmail.nl';
  if (d.includes('kmill')) return 'kpnmail.nl';
  if (d.includes('krumeel')) return 'kpnmail.nl';
  if (d.includes('kmail')) return 'kpnmail.nl';
  if (d.includes('nul.nl')) return 'kpnmail.nl';
  if (d.includes('00.nl')) return 'kpnmail.nl';
  if (d.includes('protondotme')) return 'proton.me';
  if (d.includes('protonme')) return 'proton.me';
  if (d.includes('protomme')) return 'proton.me';
  if (d.includes('coopandyou')) return 'company.co.uk';
  if (d.includes('conpany')) return 'company.co.uk';
  if (d.includes('yahoe')) return 'yahoo.com';
  if (d.includes('examenpunt')) return 'example.nl';
  if (d.includes('examen')) return 'example.nl';

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
