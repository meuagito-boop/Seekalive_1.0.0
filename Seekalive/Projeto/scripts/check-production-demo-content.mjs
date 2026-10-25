import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const assetsDirectory = join(projectRoot, "Aplicativo/front/dist/public/assets");
const entries = await readdir(assetsDirectory, { withFileTypes: true });
const javascriptFiles = entries
  .filter((entry) => entry.isFile() && entry.name.endsWith(".js"))
  .map((entry) => entry.name);

if (javascriptFiles.length === 0) {
  throw new Error("A build não gerou arquivos JavaScript para verificar.");
}

const fixtureMarkers = [
  "Marcos Reformas",
  "Show de Jazz ao Vivo",
  "Tênis Runner Pro",
  "Alex Rivera",
  "demo_mercado_vila",
];
const leaks = [];

for (const filename of javascriptFiles) {
  const content = await readFile(join(assetsDirectory, filename), "utf8");
  for (const marker of fixtureMarkers) {
    if (content.includes(marker)) leaks.push({ filename, marker });
  }
}

if (leaks.length > 0) {
  const details = leaks.map(({ filename, marker }) => `${filename}: ${marker}`).join("\n");
  throw new Error(`Dados demonstrativos foram encontrados na build de produção:\n${details}`);
}

console.log(`Verificação aprovada: ${javascriptFiles.length} chunks JavaScript sem dados demonstrativos conhecidos.`);
