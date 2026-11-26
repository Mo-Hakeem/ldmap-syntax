import * as path from 'path';
import * as vscode from 'vscode';
import { parseLinkerMap } from './parser';
import { getMapWebviewContent } from './webview';

const MAP_KEYWORD_DOCS: Record<string, string> = {
  '*fill*': 'Padding bytes inserted by the linker to satisfy alignment requirements.',
  COMMON: 'Uninitialized global symbols merged into `.bss` (tentative definitions).',
  LOAD: 'Object file or archive loaded by the linker.',
  'START GROUP': 'Beginning of a `--start-group` archive search cycle.',
  'END GROUP': 'End of an `--end-group` archive search cycle.',
  PROVIDE: 'Symbol defined by the linker script only if referenced and not defined by an object file.',
  PROVIDE_HIDDEN: 'Hidden symbol defined by the linker script if referenced and undefined.',
  ASSERT: 'Linker script assertion evaluated at link time.',
  FILL: 'Fill pattern applied to gaps within an output section.',
  NOLOAD: 'Section not loaded into Flash/file image (e.g. `.bss`, `.noinit`).',
};

const MAJOR_HEADERS = new Set([
  'Archive member included to satisfy reference by file (symbol)',
  'As-needed library included to satisfy reference by file (symbol)',
  'Allocating common symbols',
  'Discarded input sections',
  'Memory Configuration',
  'Linker script and memory map',
  'Cross Reference Table',
]);

function formatByteSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  const parts = [`${bytes.toLocaleString()} bytes`];
  if (bytes >= 1073741824) parts.push(`${(bytes / 1073741824).toFixed(2)} GiB`);
  else if (bytes >= 1048576) parts.push(`${(bytes / 1048576).toFixed(2)} MiB`);
  else if (bytes >= 1024) parts.push(`${(bytes / 1024).toFixed(1)} KiB`);
  return parts.join(' — ');
}

class LdMapSymbolProvider implements vscode.DocumentSymbolProvider {
  public provideDocumentSymbols(document: vscode.TextDocument): vscode.DocumentSymbol[] {
    const symbols: vscode.DocumentSymbol[] = [];
    let currentHeader: vscode.DocumentSymbol | null = null;
    let inMemoryMap = false;

    for (let i = 0; i < document.lineCount; i++) {
      const lineText = document.lineAt(i).text;
      const trimmed = lineText.trim();
      if (!trimmed) continue;

      if (MAJOR_HEADERS.has(trimmed)) {
        if (currentHeader) {
          currentHeader.range = new vscode.Range(currentHeader.range.start, document.lineAt(i - 1).range.end);
        }
        const range = document.lineAt(i).range;
        currentHeader = new vscode.DocumentSymbol(trimmed, 'section', vscode.SymbolKind.Namespace, range, range);
        symbols.push(currentHeader);
        inMemoryMap = trimmed === 'Linker script and memory map';
        continue;
      }

      if (inMemoryMap && currentHeader && /^(\.[A-Za-z0-9_.*-]+|\/DISCARD\/)\b/.test(lineText)) {
        const m = /^(\.[A-Za-z0-9_.*-]+|\/DISCARD\/)\s*(0x[0-9a-fA-F]+)?\s*(0x[0-9a-fA-F]+)?/.exec(lineText);
        if (m) {
          const range = document.lineAt(i).range;
          const detail = [m[2], m[3]].filter(Boolean).join(' ');
          currentHeader.children.push(
            new vscode.DocumentSymbol(m[1], detail || 'output section', vscode.SymbolKind.Struct, range, range)
          );
        }
      }
    }

    if (currentHeader && document.lineCount > 0) {
      currentHeader.range = new vscode.Range(
        currentHeader.range.start,
        document.lineAt(document.lineCount - 1).range.end
      );
    }

    return symbols;
  }
}

class LdMapHoverProvider implements vscode.HoverProvider {
  public provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.Hover | undefined {
    const wordRange = document.getWordRangeAtPosition(position, /\*fill\*|0x[0-9a-fA-F]+|[A-Za-z_]+(?:\s+GROUP)?/);
    if (!wordRange) return undefined;
    const word = document.getText(wordRange);

    if (MAP_KEYWORD_DOCS[word]) {
      return new vscode.Hover(new vscode.MarkdownString(`**${word}** — ${MAP_KEYWORD_DOCS[word]}`), wordRange);
    }

    if (/^0x[0-9a-fA-F]+$/.test(word)) {
      const val = parseInt(word, 16);
      if (Number.isFinite(val)) {
        return new vscode.Hover(
          new vscode.MarkdownString(`**${word}** = \`${val.toLocaleString()}\` (${formatByteSize(val)})`),
          wordRange
        );
      }
    }

    return undefined;
  }
}

class MapViewProvider implements vscode.CustomReadonlyEditorProvider {
  public static readonly viewType = 'ldmap.mapView';

  public openCustomDocument(
    uri: vscode.Uri,
    _openContext: vscode.CustomDocumentOpenContext,
    _token: vscode.CancellationToken
  ): vscode.CustomDocument {
    return { uri, dispose: () => {} };
  }

  public async resolveCustomEditor(
    document: vscode.CustomDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    webviewPanel.webview.options = { enableScripts: true };
    const fsPath = document.uri.fsPath;
    const baseName = path.basename(fsPath) || fsPath;
    webviewPanel.title = `${baseName} (map)`;

    let initialized = false;
    const load = async () => {
      try {
        const raw = await vscode.workspace.fs.readFile(document.uri);
        const text = Buffer.from(raw).toString('utf8');
        const parsed = parseLinkerMap(text);
        if (!initialized) {
          initialized = true;
          webviewPanel.webview.html = getMapWebviewContent(parsed, baseName);
        } else {
          void webviewPanel.webview.postMessage({
            type: 'update',
            payload: { fileName: baseName, ...parsed },
          });
        }
      } catch (err) {
        initialized = false;
        webviewPanel.webview.html = `<!DOCTYPE html><body style="font-family:sans-serif;padding:16px;color:#f48771">
          Failed to parse map file: ${String(err)}</body>`;
      }
    };

    await load();

    const msgSub = webviewPanel.webview.onDidReceiveMessage(async (msg) => {
      if (msg && msg.type === 'openRaw') {
        await vscode.commands.executeCommand('vscode.openWith', document.uri, 'default');
      }
    });

    let timer: ReturnType<typeof setTimeout> | undefined;
    const scheduleLoad = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { void load(); }, 250);
    };
    const watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(vscode.Uri.file(path.dirname(fsPath)), baseName)
    );
    watcher.onDidChange(scheduleLoad);
    watcher.onDidCreate(scheduleLoad);

    webviewPanel.onDidDispose(() => {
      if (timer) clearTimeout(timer);
      watcher.dispose();
      msgSub.dispose();
    });
  }
}

export function activate(context: vscode.ExtensionContext): void {
  const selector: vscode.DocumentSelector = { language: 'ldmap' };
  context.subscriptions.push(
    vscode.languages.registerDocumentSymbolProvider(selector, new LdMapSymbolProvider()),
    vscode.languages.registerHoverProvider(selector, new LdMapHoverProvider()),
    vscode.window.registerCustomEditorProvider(MapViewProvider.viewType, new MapViewProvider(), {
      webviewOptions: { retainContextWhenHidden: true },
    }),
    vscode.commands.registerCommand('ldmap.openAnalyzer', async (uri?: vscode.Uri) => {
      const target = uri ?? vscode.window.activeTextEditor?.document.uri;
      if (target) {
        await vscode.commands.executeCommand('vscode.openWith', target, MapViewProvider.viewType);
      }
    })
  );
}

export function deactivate(): void {}
