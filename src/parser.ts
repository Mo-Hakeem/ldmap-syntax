export interface MemoryRegion {
  name: string;
  origin: number;
  length: number;
  attributes: string;
  used: number;
}

export interface MapSymbol {
  name: string;
  addr: number;
  section: string;
  file: string;
  size: number;
}

export interface InputSection {
  name: string;
  addr: number;
  size: number;
  file: string;
  isFill: boolean;
  symbols: { name: string; addr: number }[];
}

export interface OutputSection {
  name: string;
  addr: number;
  size: number;
  lma?: number;
  region: string;
  inputs: InputSection[];
}

export interface ObjectSummary {
  file: string;
  text: number;
  rodata: number;
  data: number;
  bss: number;
  other: number;
  total: number;
  count: number;
}

export interface DiscardedSection {
  name: string;
  size: number;
  file: string;
}

export interface ArchiveMember {
  member: string;
  referencedBy: string;
  symbol: string;
}

export interface CrossRefEntry {
  symbol: string;
  definedIn: string;
  referencedIn: string[];
}

export interface ParsedMap {
  regions: MemoryRegion[];
  outputSections: OutputSection[];
  objects: ObjectSummary[];
  symbols: MapSymbol[];
  discarded: DiscardedSection[];
  archiveMembers: ArchiveMember[];
  crossRefs: CrossRefEntry[];
  discardedBytes: number;
}

function parseHex(s: string): number {
  return parseInt(s, 16);
}

function findRegion(regions: MemoryRegion[], addr: number): string {
  for (const r of regions) {
    if (r.name === '*default*') continue;
    if (addr >= r.origin && addr < r.origin + r.length) {
      return r.name;
    }
  }
  return '';
}

function classifyBucket(outName: string, inName: string): 'text' | 'rodata' | 'data' | 'bss' | 'other' {
  const i = inName.toLowerCase();
  if (i.startsWith('.rodata')) return 'rodata';
  if (i.startsWith('.text') || i.startsWith('.isr_vector') || i.startsWith('.fixed_vectors') || i.startsWith('.application_vectors') || i.startsWith('.init') || i.startsWith('.fini') || i.includes('_code')) return 'text';
  if (i.startsWith('.data') || i.startsWith('.ram_from_')) return 'data';
  if (i.startsWith('.bss') || i === 'common' || i.startsWith('.noinit') || i.startsWith('.stack') || i.startsWith('.heap')) return 'bss';

  const o = outName.toLowerCase();
  if (o.startsWith('.rodata')) return 'rodata';
  if (o.startsWith('.text') || o.includes('readonly') || o.includes('vectors')) return 'text';
  if (o.startsWith('.data') || o.includes('ram_from_')) return 'data';
  if (o.startsWith('.bss') || o.includes('zero') || o.includes('noinit') || o.includes('stack') || o.includes('heap')) return 'bss';
  return 'other';
}

function isAllocatableOutputSection(sec: OutputSection): boolean {
  if (sec.size === 0) return false;
  if (sec.name.startsWith('.debug_') || sec.name === '.comment' || sec.name === '.ARM.attributes') return false;
  return true;
}

export function parseLinkerMap(text: string): ParsedMap {
  const lines = text.split(/\r?\n/);
  const regions: MemoryRegion[] = [];
  const outputSections: OutputSection[] = [];
  const symbols: MapSymbol[] = [];
  const discarded: DiscardedSection[] = [];
  const archiveMembers: ArchiveMember[] = [];
  const crossRefs: CrossRefEntry[] = [];

  type Phase = 'none' | 'archive' | 'common' | 'discarded' | 'memory' | 'map' | 'xref';
  let phase: Phase = 'none';

  let currentOut: OutputSection | null = null;
  let currentIn: InputSection | null = null;
  let pendingSectionName: string | null = null;
  let pendingArchiveMember: string | null = null;
  let currentXref: CrossRefEntry | null = null;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();

    if (trimmed === 'Archive member included to satisfy reference by file (symbol)' ||
        trimmed === 'As-needed library included to satisfy reference by file (symbol)') {
      phase = 'archive';
      pendingArchiveMember = null;
      continue;
    }
    if (trimmed === 'Allocating common symbols') {
      phase = 'common';
      pendingSectionName = null;
      continue;
    }
    if (trimmed === 'Discarded input sections') {
      phase = 'discarded';
      pendingSectionName = null;
      continue;
    }
    if (trimmed === 'Memory Configuration') {
      phase = 'memory';
      continue;
    }
    if (trimmed === 'Linker script and memory map') {
      phase = 'map';
      currentOut = null;
      currentIn = null;
      pendingSectionName = null;
      continue;
    }
    if (trimmed === 'Cross Reference Table') {
      phase = 'xref';
      currentXref = null;
      continue;
    }

    if (!trimmed) continue;

    if (phase === 'memory') {
      if (trimmed.startsWith('Name')) continue;
      const m = /^(\S+)\s+(0x[0-9a-fA-F]+)\s+(0x[0-9a-fA-F]+)(?:\s+(\S+))?/.exec(trimmed);
      if (m) {
        regions.push({
          name: m[1],
          origin: parseHex(m[2]),
          length: parseHex(m[3]),
          attributes: m[4] || '',
          used: 0,
        });
      }
      continue;
    }

    if (phase === 'archive') {
      if (!raw.startsWith(' ') && !raw.startsWith('\t')) {
        const sameLine = /^(\S+)\s+(\S+\s+\([^)]+\))$/.exec(trimmed);
        if (sameLine) {
          const refM = /^(\S+)\s+\(([^)]+)\)$/.exec(sameLine[2]);
          archiveMembers.push({
            member: sameLine[1],
            referencedBy: refM ? refM[1] : sameLine[2],
            symbol: refM ? refM[2] : '',
          });
          pendingArchiveMember = null;
        } else {
          pendingArchiveMember = trimmed;
        }
      } else if (pendingArchiveMember) {
        const refM = /^(\S+)\s+\(([^)]+)\)$/.exec(trimmed);
        archiveMembers.push({
          member: pendingArchiveMember,
          referencedBy: refM ? refM[1] : trimmed,
          symbol: refM ? refM[2] : '',
        });
        pendingArchiveMember = null;
      }
      continue;
    }

    if (phase === 'discarded') {
      // Single-line:  .text.foo   0x00000000   0x14 file.o
      const single = /^\s*(\S+)\s+(0x[0-9a-fA-F]+)\s+(0x[0-9a-fA-F]+)\s+(.+)$/.exec(raw);
      if (single) {
        discarded.push({
          name: single[1],
          size: parseHex(single[3]),
          file: single[4].trim(),
        });
        pendingSectionName = null;
        continue;
      }
      // Wrapped first line:  .text.very_long_name
      if (/^\s+\S+$/.test(raw)) {
        pendingSectionName = trimmed;
        continue;
      }
      // Wrapped second line:                 0x00000000       0x14 file.o
      if (pendingSectionName) {
        const cont = /^\s+(0x[0-9a-fA-F]+)\s+(0x[0-9a-fA-F]+)\s+(.+)$/.exec(raw);
        if (cont) {
          discarded.push({
            name: pendingSectionName,
            size: parseHex(cont[2]),
            file: cont[3].trim(),
          });
        }
        pendingSectionName = null;
      }
      continue;
    }

    if (phase === 'common') {
      if (trimmed.startsWith('Common symbol')) continue;
      const single = /^(\S+)\s+(0x[0-9a-fA-F]+)\s+(.+)$/.exec(trimmed);
      if (single) {
        symbols.push({
          name: single[1],
          addr: 0,
          size: parseHex(single[2]),
          section: 'COMMON',
          file: single[3].trim(),
        });
        pendingSectionName = null;
      } else if (!raw.startsWith(' ')) {
        pendingSectionName = trimmed;
      } else if (pendingSectionName) {
        const cont = /^(0x[0-9a-fA-F]+)\s+(.+)$/.exec(trimmed);
        if (cont) {
          symbols.push({
            name: pendingSectionName,
            addr: 0,
            size: parseHex(cont[1]),
            section: 'COMMON',
            file: cont[2].trim(),
          });
        }
        pendingSectionName = null;
      }
      continue;
    }

    if (phase === 'xref') {
      if (trimmed.startsWith('Symbol')) continue;
      if (!raw.startsWith(' ') && !raw.startsWith('\t')) {
        const m = /^(\S+)\s+(.+)$/.exec(trimmed);
        if (m) {
          currentXref = { symbol: m[1], definedIn: m[2].trim(), referencedIn: [] };
          crossRefs.push(currentXref);
        } else {
          currentXref = { symbol: trimmed, definedIn: '', referencedIn: [] };
          crossRefs.push(currentXref);
        }
      } else if (currentXref) {
        if (!currentXref.definedIn) currentXref.definedIn = trimmed;
        else currentXref.referencedIn.push(trimmed);
      }
      continue;
    }

    if (phase === 'map') {
      // Top-level output section (column 0, not LOAD/START GROUP/END GROUP/OUTPUT/etc.)
      if (/^([A-Za-z_.$][A-Za-z0-9_.*$-]*|\/DISCARD\/)(?:\s|$)/.test(raw) &&
          !/^(LOAD|START GROUP|END GROUP|OUTPUT|AS_NEEDED|INPUT|GROUP)\b/.test(raw)) {
        pendingSectionName = null;
        currentIn = null;
        const m = /^([A-Za-z_.$][A-Za-z0-9_.*$-]*|\/DISCARD\/)\s+(0x[0-9a-fA-F]+)\s+(0x[0-9a-fA-F]+)(?:\s+load address\s+(0x[0-9a-fA-F]+))?/.exec(raw);
        if (m) {
          const addr = parseHex(m[2]);
          const size = parseHex(m[3]);
          currentOut = {
            name: m[1],
            addr,
            size,
            lma: m[4] ? parseHex(m[4]) : undefined,
            region: findRegion(regions, addr),
            inputs: [],
          };
          outputSections.push(currentOut);
        } else if (!raw.includes('=')) {
          // Wrapped output section name on its own line
          pendingSectionName = trimmed;
          currentOut = {
            name: trimmed,
            addr: 0,
            size: 0,
            region: '',
            inputs: [],
          };
          outputSections.push(currentOut);
        }
        continue;
      }

      // Continuation of wrapped output section header
      if (pendingSectionName && currentOut && currentOut.name === pendingSectionName && /^\s+(0x[0-9a-fA-F]+)\s+(0x[0-9a-fA-F]+)/.test(raw)) {
        const m = /^\s+(0x[0-9a-fA-F]+)\s+(0x[0-9a-fA-F]+)(?:\s+load address\s+(0x[0-9a-fA-F]+))?/.exec(raw);
        if (m) {
          currentOut.addr = parseHex(m[1]);
          currentOut.size = parseHex(m[2]);
          currentOut.lma = m[3] ? parseHex(m[3]) : undefined;
          currentOut.region = findRegion(regions, currentOut.addr);
        }
        pendingSectionName = null;
        continue;
      }

      // Input section: *fill* 0xaddr 0xsize
      const fillM = /^\s+\*fill\*\s+(0x[0-9a-fA-F]+)\s+(0x[0-9a-fA-F]+)/.exec(raw);
      if (fillM && currentOut) {
        currentIn = {
          name: '*fill*',
          addr: parseHex(fillM[1]),
          size: parseHex(fillM[2]),
          file: '*fill*',
          isFill: true,
          symbols: [],
        };
        currentOut.inputs.push(currentIn);
        pendingSectionName = null;
        continue;
      }

      // Input section single-line:  .text.foo   0x08000100   0x40 path/file.o
      const inSingle = /^\s(\S+)\s+(0x[0-9a-fA-F]+)\s+(0x[0-9a-fA-F]+)\s+(.+)$/.exec(raw);
      if (inSingle && currentOut && !inSingle[1].startsWith('0x')) {
        currentIn = {
          name: inSingle[1],
          addr: parseHex(inSingle[2]),
          size: parseHex(inSingle[3]),
          file: inSingle[4].trim(),
          isFill: false,
          symbols: [],
        };
        currentOut.inputs.push(currentIn);
        pendingSectionName = null;
        continue;
      }

      // Input section wrapped line 1:  .text.very_long_section_name
      if (/^\s(\.[A-Za-z0-9_.*-]+|COMMON)\s*$/.test(raw) && currentOut) {
        pendingSectionName = trimmed;
        continue;
      }

      // Input section wrapped line 2:                 0x08000100       0x40 path/file.o
      if (pendingSectionName && currentOut) {
        const inCont = /^\s+(0x[0-9a-fA-F]+)\s+(0x[0-9a-fA-F]+)\s+(.+)$/.exec(raw);
        if (inCont) {
          currentIn = {
            name: pendingSectionName,
            addr: parseHex(inCont[1]),
            size: parseHex(inCont[2]),
            file: inCont[3].trim(),
            isFill: false,
            symbols: [],
          };
          currentOut.inputs.push(currentIn);
          pendingSectionName = null;
          continue;
        }
        pendingSectionName = null;
      }

      // Symbol line inside an input section:                 0x08000100                Reset_Handler
      const symM = /^\s{4,}(0x[0-9a-fA-F]+)\s+([A-Za-z_.$][A-Za-z0-9_.$]*)\s*$/.exec(raw);
      if (symM && currentOut) {
        const addr = parseHex(symM[1]);
        const name = symM[2];
        if (currentIn) {
          currentIn.symbols.push({ name, addr });
        }
        symbols.push({
          name,
          addr,
          section: currentOut.name,
          file: currentIn ? currentIn.file : '',
          size: currentIn ? currentIn.size : 0,
        });
      }
    }
  }

  // Compute memory region usage
  for (const sec of outputSections) {
    if (!isAllocatableOutputSection(sec)) continue;
    const isNoLoad = /(?:^\.bss|^\.noinit|zero|noinit|stack|heap)/i.test(sec.name);
    for (const r of regions) {
      if (r.name === '*default*') continue;
      const inVma = sec.addr >= r.origin && sec.addr < r.origin + r.length;
      const inLma = !isNoLoad && sec.lma !== undefined && sec.lma >= r.origin && sec.lma < r.origin + r.length;
      if (inVma || inLma) {
        r.used += sec.size;
      }
    }
  }

  // Aggregate per-object breakdown (allocatable sections only)
  const objMap = new Map<string, ObjectSummary>();
  for (const sec of outputSections) {
    if (!isAllocatableOutputSection(sec)) continue;
    for (const inp of sec.inputs) {
      if (inp.size === 0) continue;
      const bucket = classifyBucket(sec.name, inp.name);
      const key = inp.file;
      let obj = objMap.get(key);
      if (!obj) {
        obj = { file: key, text: 0, rodata: 0, data: 0, bss: 0, other: 0, total: 0, count: 0 };
        objMap.set(key, obj);
      }
      obj[bucket] += inp.size;
      obj.total += inp.size;
      obj.count += 1;
    }
  }

  const objects = Array.from(objMap.values()).sort((a, b) => b.total - a.total);
  const discardedBytes = discarded.reduce((acc, d) => acc + d.size, 0);

  return {
    regions,
    outputSections,
    objects,
    symbols,
    discarded,
    archiveMembers,
    crossRefs,
    discardedBytes,
  };
}
