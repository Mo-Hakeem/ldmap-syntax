# Linker Map (GNU LD)

Syntax highlighting, outline symbols, and size hover for GNU LD linker map files (`.map`).

## Features

- **Syntax highlighting** — major map sections (`Memory Configuration`, `Linker script and memory map`, `Discarded input sections`, `Cross Reference Table`), output & input section names (`.isr_vector`, `.text`, `.rodata`, `.data`, `.bss`, `.debug_*`), `*fill*`, `COMMON`, `LOAD`, `START GROUP` / `END GROUP`, `PROVIDE`, hex addresses & sizes, object/archive file paths, and symbol names.
- **Outline & Breadcrumbs (`Ctrl+Shift+O`)** — jump directly to major map sections and output sections (`.text`, `.data`, `.bss`, etc.).
- **Smart Hover** — hover over any hex literal (e.g. `0x0001a4c0`) to see its exact byte count and KiB/MiB size, or hover over map keywords (`*fill*`, `COMMON`, `LOAD`, `PROVIDE`, etc.).

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
