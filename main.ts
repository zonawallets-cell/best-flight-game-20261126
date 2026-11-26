// Meridian Air Rally — hand-in program (Node 22, standard library only).
// Copies game/ and screenshots/ to /output and writes /output/dossier.json
// with buildDossier from vendor/makefun-game.ts. Deterministic: two runs
// write the same bytes.
import { cpSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-game.ts";

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

// Clear the output directory's contents without removing the directory
// itself: in the grader /output is a bind mount, and removing a mount
// point fails with EBUSY. The directory starts empty there, so this is
// a no-op in the grader and a clean slate anywhere else.
mkdirSync(outDir, { recursive: true });
for (const entry of readdirSync(outDir)) {
  rmSync(join(outDir, entry), { recursive: true, force: true });
}
cpSync(join(repoRoot, "game"), join(outDir, "game"), { recursive: true });
cpSync(join(repoRoot, "screenshots"), join(outDir, "screenshots"), { recursive: true });

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, "dossier.json"), dossier);

console.log(`meridian-air-rally: wrote ${outDir} (dossier ${dossier.length} bytes)`);
