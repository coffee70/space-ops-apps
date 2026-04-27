import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();

for (const relativePath of [".next/dev/types", ".next/types"]) {
  fs.rmSync(path.join(projectRoot, relativePath), {
    recursive: true,
    force: true,
  });
}
