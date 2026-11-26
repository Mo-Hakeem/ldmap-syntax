# Linker Map (GNU LD)

Syntax highlighting, outline symbols, and size hover for GNU LD linker map files (`.map`).

## Features

- **Interactive Linker Map Analyzer** (opens `.map` files by default, with a one-click **Open Raw Text** toggle):
  - **Memory Regions** — visual utilization bars (`Used / Length`, `%`, and `Free` bytes) for `FLASH`, `RAM`, `CCMRAM`, etc.
  - **Output & Input Sections** — expandable output sections (`.isr_vector`, `.text`, `.rodata`, `.data`, `.bss`, etc.) showing VMA, LMA, size, input sections, `*fill*` padding, object files, and symbols.
  - **Object File Breakdown** — sortable per-`.o`/`.a` size table (`Code`, `.rodata`, `.data`, `.bss`, `Total`).
  - **Symbols, Discarded Sections & Cross References** — searchable symbol table, `--gc-sections` discarded space summary, archive members included, and cross-reference table.
- **Syntax highlighting** — major map headings, section names, `*fill*`, `COMMON`, `LOAD`, `START GROUP` / `END GROUP`, `PROVIDE`, hex/decimal numbers, memory attributes, and object/archive paths when viewing raw text.
- **Outline & Smart Hover** — `Ctrl+Shift+O` navigation and hex byte/KiB/MiB hover in raw text mode.

## Companion Extensions

- **[Linker Script (GNU LD)](https://marketplace.visualstudio.com/items?itemName=MohamedHakeem.ldscript-linker)** — syntax highlighting, outline, and hover for `.ld` / `.lds` scripts.
- **[HexMap — Hex Viewer](https://marketplace.visualstudio.com/items?itemName=MohamedHakeem.hexmap-viewer)** — inspect `.hex`, `.srec`, and `.bin` build artifacts.

## Building from source

```sh
npm install
npm run compile
```

Package an OPC-compliant `.vsix`:

```powershell
.\make_icon.ps1
.\make_vsix.ps1
```

## License

MIT — see [LICENSE](LICENSE).
