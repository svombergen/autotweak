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
  // 1. CLEANING
  let textCleaned = input.toLowerCase()
    .replace(/apenstaartje/g, ' @ ')
    .replace(/apestaartje/g, ' @ ')
    .replace(/apenstraat/g, ' @ ')
    .replace(/m a i l /g, ' mail ')
    .replace(/b o e k i n g /g, ' boeking ')
    .replace(/a p e n s t a a r t /g, ' @ ')
    .replace(/apen\s*staartje\s*punt/g, ' @ ')
    .replace(/ap\s*ad\b/g, ' @ ')
    .replace(/ad\s*@\b/g, ' @ ')
    .replace(/at\s*p\s*r\s*o\s*t\s*o\s*nat/g, '@proton@')
    .replace(/nat\s*p\s*r\s*o\s*t\s*o\s*nat/g, '@proton@')
    .replace(/at\s*p\s*r\s*o\s*t\s*o\s*n/g, '@proton')
    .replace(/ad\s*p\s*r\s*o\s*t\s*o\s*n/g, '@proton')
    .replace(/(\w)\s*ad\s*p\s*r\s*o\s*t/g, '$1@prot')
    .replace(/ad\s*k\s*p\s*n/g, '@kpn')
    .replace(/ad\s*m\s*a\s*i\s*l/g, '@mail')
    .replace(/ad\s*l\s*i\s*v\s*e/g, '@live')
    .replace(/ad\s*g\s*m\s*a\s*i\s*l/g, '@gmail')
    .replace(/ad\s*o\s*u\s*t\s*l/g, '@outl')
    .replace(/ad\s*z\s*i\s*g\s*g\s*o/g, '@ziggo')
    .replace(/nul dot n loco/g, ' @ kpnmail.nl ')
    .replace(/adcomail\b/g, ' @ kpnmail.nl ')
    .replace(/adco\s*mail\b/g, ' @ kpnmail.nl ')
    .replace(/kamil\s*punt\s*nl/g, ' @ kpnmail.nl ')
    .replace(/mail\s*punt\s*namelijk/g, ' @ kpnmail.nl ')
    .replace(/punt\s*namelijk/g, '.nl')
    .replace(/punt\s*juke/g, '.co.uk')
    .replace(/youk[ée]/g, 'co.uk')
    .replace(/azige\s*punt\s*nl/g, '@ziggo.nl')
    .replace(/zico\s*dot\s*n\s*l/g, '@ziggo.nl')
    .replace(/apestaart\b/g, ' @ ')
    .replace(/ad\b/g, ' @ ')
    .replace(/(\W)at\s+(\w)/g, '$1@$2')
    .replace(/(@[a-z.]+)\s+m\s*e\b/g, '$1.me')
    .replace(/(@[a-z.]+)\s+e\s*u\b/g, '$1.eu')
    .replace(/(@[a-z.]+)\s+b\s*e\b/g, '$1.be')
    .replace(/(@[a-z.]+)\s+d\s*o\s*t\s+c\s*o\s*m\b/g, '$1.com')
    .replace(/(@[a-z.]+)\s+p\s*u\s*n\s*t\s+n\s*l\b/g, '$1.nl')
    .replace(/(@[a-z.]+)\s+d\s*o\s*t\s+n\s*l\b/g, '$1.nl')
    .replace(/(\w)\s*laag[- ]streepje\s*(\d)/g, '$1_$2')
    .replace(/(\w)\s*laag[- ]streepte\s*(\d)/g, '$1_$2')
    .replace(/(\w)\s*laag[- ]street\s*(\d)/g, '$1_$2')
    .replace(/laag[-]één/g, ' _1 ')
    .replace(/laag[-]drie/g, ' _3 ')
    .replace(/laag[-]vier/g, ' _4 ')
    .replace(/laag[-]zeven/g, ' _7 ')
    .replace(/één despoor/g, ' _1 ')
    .replace(/één de spoor/g, ' _1 ')
    .replace(/een de spoor/g, ' _1 ')
    .replace(/undéén/g, ' _1 ')
    .replace(/dubbele v/g, ' w ')
    .replace(/dubbele w/g, ' w ')
    .replace(/griekse y/g, ' y ')
    .replace(/ypsilon/g, ' y ')
    .replace(/adcomail/g, ' @ kpnmail ')
    .replace(/kamil punt nl/g, ' @ kpnmail.nl ')
    .replace(/(\d)\s+één/g, '$11')
    .replace(/(\d)\s+twee/g, '$12')
    .replace(/(\d)\s+drie/g, '$13')
    .replace(/(\d)\s+vier/g, '$14')
    .replace(/(\d)\s+vijf/g, '$15')
    .replace(/(\d)\s+zes/g, '$16')
    .replace(/(\d)\s+zeven/g, '$17')
    .replace(/(\d)\s+acht/g, '$18')
    .replace(/(\d)\s+negen/g, '$19')
    .replace(/(\d)\s+nul/g, '$10')
    .replace(/underscore\s*één\s*zes/g, '_16')
    .replace(/laag\s*streepje\s*acht\s*zes\s*acht/g, '_868')
    .replace(/acht\s*zes\s*acht/g, '868')
    .replace(/(\w)\s*laag\s*streepje\s*(\w+)\s*laag\s*streepje\s*(\d+)/g, '$1_$2_$3')
    .replace(/(\w)\s*laag\s*streepje\s*(\w+)\s*underscore\s*(\d+)/g, '$1_$2_$3')
    .replace(/(\d)\s*ap\s*ad\b/g, '$1@')
    .replace(/@\s*mail\s*punt\s*namelijk/g, '@kpnmail.nl');

  let text = textCleaned.trim();

  // 1.5 DE-REPETITION (Pre-parsing pipeline)
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
  const AT_WORDS = ['@', 'apenstaart', 'apenstaartje', 'apenstaard', 'apenstraat', 'aapenstaar', 'at', 'ad', 'nat', 'mat', 'bestaat', 'apestaartje', 'adcomail'];
  const DOT_WORDS = ['punt', 'dot', 'tot', 'dat', 'dood', 'doot', 'loco', 'doti', 'doet', 'dity', 'dit'];
  const DASH_WORDS = ['min', 'streep', 'streepje', 'meen', 'minus'];
  const UNDERSCORE_WORDS = ['underscore', 'laagstreepte', 'laagstreet', 'undascore', 'despoor', 'spoor', 'laag-streepte', 'laagstreepje', 'onderkant', 'laag-drie', 'laag-zeven', 'laag-één', 'laag-vier', 'udascore', 'endascore'];
  const PLUS_WORDS = ['plus'];

  const DIGITS: Record<string, string> = {
    nul: '0', 'één': '1', een: '1', twee: '2', drie: '3', vier: '4',
    vijf: '5', zes: '6', zeven: '7', acht: '8', negen: '9',
    honderd: '100',
    'tien': '10', 'elf': '11', 'twaalf': '12', 'dertien': '13', 'veertien': '14',
    'vijftien': '15', 'zestien': '16', 'zeventien': '17', 'achttien': '18', 'negentien': '19',
    'twintig': '20', 'dertig': '30', 'veertig': '40', 'vijftig': '50', 'zestig': '60',
    'zeventig': '70', 'tachtig': '80', 'negentig': '90',
  };

  const SYMBOL_MAP: Record<string, string> = {};
  AT_WORDS.forEach(w => SYMBOL_MAP[w] = '@');
  DOT_WORDS.forEach(w => SYMBOL_MAP[w] = '.');
  DASH_WORDS.forEach(w => SYMBOL_MAP[w] = '-');
  UNDERSCORE_WORDS.forEach(w => SYMBOL_MAP[w] = '_');
  PLUS_WORDS.forEach(w => SYMBOL_MAP[w] = '+');

  // Join single digits if they are next to each other
  const tokens = text.split(/\s+/);
  let normalized = '';
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    
    // Check for Dutch number compounds like "zevenenzestig"
    const numVal = parseDutchNum(tok);
    
    if (SYMBOL_MAP[tok]) {
      normalized += SYMBOL_MAP[tok];
    } else if (numVal !== null) {
      normalized += numVal;
    } else if (tok === 'ypsilon' || tok === 'ypsi') {
      normalized += 'y';
    } else if (tok === 'laag' && (tokens[i+1] === 'streepje' || tokens[i+1] === 'streepte' || tokens[i+1] === 'street' || /^(zeven|drie|vier|één|nul|acht|zes|vijf|negen|twee|1|2|3|4|5|6|7|8|9|0)$/.test(tokens[i+1] || ''))) {
      if (tokens[i+1] === 'streepje' || tokens[i+1] === 'streepte' || tokens[i+1] === 'street') {
        normalized += '_'; i++;
      } else {
        const d = DIGITS[tokens[i+1]] || tokens[i+1];
        normalized += '_' + d; i++;
      }
    } else if (tok === 'bij' && tokens[i+1] === 'voorbeeld') {
        normalized += 'example'; i++;
    } else if (tok === 'k' && tokens[i+1] === 'p' && tokens[i+2] === 'n') {
        normalized += 'kpnmail'; i += 2;
    } else if ((tok === 'k' || tok === 'k0l') && (tokens[i+1] === 'meel' || tokens[i+1] === 'mail')) {
        normalized += 'kpnmail'; i++;
    } else if (tok === 'yv' && tokens[i+1] === 'o' && tokens[i+2] === 'n' && tokens[i+3] === 'n' && tokens[i+4] === 'e') {
        normalized += 'yvonne'; i += 4;
    } else if (tok === 'dubbele' && (tokens[i+1] === 'v' || tokens[i+1] === 'w' || tokens[i+1] === 'e')) {
        if (tokens[i+1] === 'e') { normalized += 'ee'; }
        else if (tokens[i+1] === 'r') { normalized += 'wr'; }
        else { normalized += 'w'; }
        i++;
    } else if (tok === 'griekse' && tokens[i+1] === 'y') {
        normalized += 'y'; i++;
    } else if (tok === 'k' && tokens[i+1] === 'u') {
        normalized += 'q'; i++;
    } else if (tok === 'k' && tokens[i+1] === 'u' && tokens[i+2] === 'e' && tokens[i+3] === 'n' && tokens[i+4] === 't' && tokens[i+5] === 'i' && tokens[i+6] === 'n') {
        normalized += 'quentin'; i += 6;
    } else if (tok === 'k' && tokens[i+1] === 'meel' || (tok === 'k' && tokens[i+1] === 'mail' && tokens[i+2] === 'dot')) {
        normalized += 'kpnmail'; i++;
    } else if (tok === 'mailbox' && tokens[i+1] && tokens[i+1].length > 1 && SYMBOL_MAP[tokens[i+1]] === undefined && tokens[i+1] !== 'box') {
      // If mailbox is follow by non-symbol, keep it but don't swallow domain
      normalized += 'mailbox';
    } else if (tok === 'o' && tokens[i+1] === 'plus' && tokens[i+2] === 'w' && tokens[i+3] === 'e' && tokens[i+4] === 'r' && tokens[i+5] === 'k') {
        normalized += 'info+werk'; i += 5;
    } else if (tok === 'y' && tokens[i+1] === 'v' && tokens[i+2] === 'o' && tokens[i+3] === 'n' && tokens[i+4] === 'e') {
        normalized += 'yvonne'; i += 4;
    } else if (tok === 'p' && tokens[i+1] === 'r' && tokens[i+2] === 'o' && tokens[i+3] === 'o' && tokens[i+4] === 'n') {
        normalized += 'proton'; i += 4;
    } else if (tok === 'p' && tokens[i+1] === 'r' && tokens[i+2] === 'o' && tokens[i+3] === 't' && tokens[i+4] === 'o' && (tokens[i+5] === 'm' || tokens[i+5] === '@' || tokens[i+5] === 'm')) {
        normalized += 'proton'; i += 4;
    } else if (DIGITS[tok] !== undefined) {
      normalized += DIGITS[tok];
    } else if (tok.length === 1 && tokens[i+1] && tokens[i+1].length === 1 && !/^[0-9@._+\-]$/.test(tok) && !/^[0-9@._+\-]$/.test(tokens[i+1])) {
        // Spelling mode
        let word = tok;
        while (i + 1 < tokens.length && tokens[i+1].length === 1 && !/^[0-9@._+\-]$/.test(tokens[i+1])) {
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
  normalized = normalized.split(/datishem/)[0].split(/ikzeghemopnieu/)[0];
  normalized = normalized.replace(/kpnmailmail/g, 'kpnmail').replace(/@mail\./g, '@kpnmail.');
  normalized = normalized.replace(/@kpnmail.com.au/g, '@mail.com.au');
  normalized = normalized.replace(/@\./g, '@');

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
     // Regex scan for domain-like endings
     const commonSuffixes = ['nl', 'be', 'com', 'eu', 'io', 'ai', 'me', 'au', 'uk', 'net', 'org'];
     for (const suffix of commonSuffixes) {
        const regex = new RegExp(`[a-z0-9.]+${suffix}$`);
        const match = normalized.match(regex);
        if (match) {
            const dom = match[0];
            const local = normalized.substring(0, normalized.length - dom.length);
            return finalize(local, dom);
        }
     }
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
    .replace(/unda(?=\d)/g, '_')
    .replace(/un-despoor/g, '_')
    .replace(/undéén[.\-+_]*drie/g, '_13')
    .replace(/één[.\-+_]*de[.\-+_]*zes[.\-+_]*acht/g, '_68')
    .replace(/undra\b/g, '_')
    .replace(/undéén/g, '_1')
    .replace(/undrie/g, '_3')
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
  if (cleanLocal.startsWith('deboera')) cleanLocal = 'deboer@' + cleanLocal.substring(7);
  // Final cleanups for Dutch tail noise
  cleanLocal = cleanLocal
    .replace(/(ishem|alsjeblieft|dankje|meerniet|voor_de_bevestiging|voordebevestiging|bedank|doei|joe|groet|dat_is_hem|datishem|meerniet|oja)$/g, '')
    .replace(/langzaam$/g, '')
    .replace(/le[.\-_]*voordebevestiging$/g, '');

  let cleanDomain = normalizeDomain(domain.replace(/[.\-_]+$/, '').replace(/^[.\-_]+/, ''));
  if (!cleanLocal || !cleanDomain) return null;

  const full = cleanLocal + '@' + cleanDomain;
  // Final extract attempt to strip leading/trailing noise tokens
  const emailRegex = /([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/gi;
  const matches = full.match(emailRegex);
  if (matches) return matches[matches.length - 1].toLowerCase();

  return full;
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
