/**
 * Builds a portable, self-contained HTML reader for the backend documentation.
 * Run: node docs/api/backend/render-docs.mjs [--check]
 */
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const files = [
  "README.md",
  "analysis-of-reference-documents.md",
  "frontend-readiness-audit.md",
  "architecture-and-security.md",
  "frontend-integration.md",
  "endpoints.md",
  "feed-route-validation.md",
  "routes.generated.md",
  "data-dictionary.md",
  "development-database-catalog-2026-10-31.md",
  "external-services-and-operations.md",
  "implementation-and-tests.md",
];
const sectionTitles = [
  "Visão geral",
  "Análise dos documentos de referência",
  "Auditoria de prontidão do frontend",
  "Arquitetura e segurança",
  "Integração do frontend",
  "Endpoints",
  "Auditoria das rotas do Feed",
  "Rotas montadas",
  "Dicionário de dados",
  "Catálogo físico do banco de desenvolvimento — 31/10/2026",
  "Serviços externos e operação",
  "Implementação e testes",
];
const esc = (s) =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
function inline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^ )]+)\)/g,
      '<a href="$2" rel="noopener noreferrer">$1</a>',
    );
}
function render(md) {
  const lines = md.split(/\r?\n/);
  const out = [];
  let i = 0,
    code = false,
    codeLines = [],
    list = null;
  const closeList = () => {
    if (list) {
      out.push(`</${list}>`);
      list = null;
    }
  };
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("```")) {
      closeList();
      if (code) {
        out.push(`<pre><code>${esc(codeLines.join("\n"))}</code></pre>`);
        codeLines = [];
      }
      code = !code;
      i++;
      continue;
    }
    if (code) {
      codeLines.push(line);
      i++;
      continue;
    }
    if (!line.trim()) {
      closeList();
      i++;
      continue;
    }
    if (
      /^\|/.test(line) &&
      i + 1 < lines.length &&
      /^\|[\s|:-]+\|?$/.test(lines[i + 1])
    ) {
      closeList();
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) {
        const cells = lines[i]
          .split("|")
          .slice(1, -1)
          .map((c) => c.trim());
        if (!cells.every((c) => /^:?-{3,}:?$/.test(c))) rows.push(cells);
        i++;
      }
      if (rows.length) {
        out.push('<div class="table-wrap"><table>');
        rows.forEach((row, ri) =>
          out.push(
            `<tr>${row.map((c) => (ri === 0 ? `<th>${inline(c)}</th>` : `<td>${inline(c)}</td>`)).join("")}</tr>`,
          ),
        );
        out.push("</table></div>");
      }
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      closeList();
      const n = heading[1].length;
      out.push(`<h${n}>${inline(heading[2])}</h${n}>`);
      i++;
      continue;
    }
    if (/^---+$/.test(line.trim())) {
      closeList();
      out.push("<hr>");
      i++;
      continue;
    }
    if (/^>\s?/.test(line)) {
      closeList();
      out.push(`<blockquote>${inline(line.replace(/^>\s?/, ""))}</blockquote>`);
      i++;
      continue;
    }
    const ul = line.match(/^\s*[-*]\s+(.*)$/),
      ol = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ul || ol) {
      const type = ul ? "ul" : "ol";
      if (list !== type) {
        closeList();
        list = type;
        out.push(`<${type}>`);
      }
      out.push(`<li>${inline((ul || ol)[1])}</li>`);
      i++;
      continue;
    }
    closeList();
    out.push(`<p>${inline(line)}</p>`);
    i++;
  }
  closeList();
  if (code) out.push(`<pre><code>${esc(codeLines.join("\n"))}</code></pre>`);
  return out.join("\n");
}
const parts = [];
const documents = [];
for (const [index, file] of files.entries()) {
  const source = await readFile(join(dir, file), "utf8");
  documents.push({ file, source, title: sectionTitles[index] });
  parts.push(
    `<section id="${file.replace(".md", "")}">${render(source)}</section>`,
  );
}
const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Seekalive — documentação do backend</title>
<style>
:root{color-scheme:dark;--bg:#0b0d12;--panel:#12151d;--text:#eef0f5;--muted:#a9adba;--accent:#ff851b;--line:#292e39}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.65 system-ui,-apple-system,Segoe UI,sans-serif}
header{padding:30px max(20px,calc((100% - 1120px)/2));background:#10141c;border-bottom:1px solid var(--line);position:sticky;top:0;z-index:2}
header strong{color:var(--accent);letter-spacing:.04em}nav{display:flex;gap:12px;overflow:auto;margin-top:12px;white-space:nowrap}nav a{color:var(--muted);font-size:13px}
main{max-width:1120px;margin:0 auto;padding:28px 22px 80px}section{padding:20px 0 42px;border-bottom:1px solid var(--line)}
h1{font-size:2rem;line-height:1.2}h2{font-size:1.55rem;margin-top:2.1em}h3{font-size:1.15rem;margin-top:1.6em}
p,li{color:#d7dae2}a{color:#ffad5c}code{background:#1c2029;padding:2px 5px;border-radius:4px;color:#ffd0a1}
pre{overflow:auto;background:#10141b;padding:16px;border:1px solid var(--line);border-radius:10px;white-space:pre-wrap}
blockquote{margin:16px 0;padding:12px 16px;border-left:3px solid var(--accent);background:var(--panel);color:var(--muted)}
.table-wrap{overflow:auto;margin:14px 0}table{border-collapse:collapse;width:100%;min-width:600px;background:var(--panel)}
th,td{text-align:left;vertical-align:top;padding:9px 11px;border:1px solid var(--line)}th{color:#ffd0a1;background:#191d26}
hr{border:0;border-top:1px solid var(--line);margin:22px 0}@media(max-width:640px){header{position:static;padding:20px}main{padding:16px}}
</style></head><body>
<header><strong>SEEKALIVE · DOCUMENTAÇÃO TÉCNICA</strong><nav>
<a href="#README">Visão geral</a><a href="#analysis-of-reference-documents">Análise dos PDFs</a><a href="#frontend-readiness-audit">Auditoria frontend</a><a href="#architecture-and-security">Arquitetura</a><a href="#frontend-integration">Telas</a><a href="#endpoints">Endpoints</a><a href="#routes.generated">Rotas montadas</a><a href="#data-dictionary">Dados</a><a href="#development-database-catalog-2026-10-31">Catálogo físico</a><a href="#external-services-and-operations">Serviços</a><a href="#implementation-and-tests">Implementação</a>
</nav></header><main>${parts.join("\n")}</main></body></html>`;
const markdown = [
  "# Seekalive — documentação do backend",
  "",
  "Edição consolidada das fontes Markdown listadas abaixo. Regenere este arquivo com `node docs/api/backend/render-docs.mjs` depois de atualizar as fontes.",
  "",
  "## Índice",
  ...documents.map(
    ({ file, title }, index) =>
      `- [${title}](#secao-${index + 1}) — \`${file}\``,
  ),
  ...documents.flatMap(({ file, source, title }, index) => [
    "",
    "---",
    "",
    `<a id="secao-${index + 1}"></a>`,
    `## ${index + 1}. ${title}`,
    "",
    `Fonte: [\`${file}\`](${file}).`,
    "",
    source.replace(/^# .+\r?\n/, "").trim(),
  ]),
].join("\n");
const outputs = [
  { path: join(dir, "index.html"), content: html },
  {
    path: join(dir, "Seekalive-backend-documentation.md"),
    content: `${markdown}\n`,
  },
];
const checkOnly = process.argv.includes("--check");
if (checkOnly) {
  for (const output of outputs) {
    const current = await readFile(output.path, "utf8");
    if (current !== output.content) {
      throw new Error(
        `Generated backend documentation is stale: ${output.path}. Run node docs/api/backend/render-docs.mjs.`,
      );
    }
  }
} else {
  await Promise.all(
    outputs.map(({ path, content }) => writeFile(path, content)),
  );
}
console.log(
  `Documentação consolidada ${checkOnly ? "validada" : "gerada"}: HTML ${html.length.toLocaleString("pt-BR")} caracteres e Markdown ${markdown.length.toLocaleString("pt-BR")} caracteres (${files.length} fontes).`,
);
