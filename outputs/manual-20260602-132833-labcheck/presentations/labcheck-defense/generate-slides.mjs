import fs from "node:fs/promises";
import path from "node:path";

const root = "/Users/lin/Desktop/LabCheck/outputs/manual-20260602-132833-labcheck/presentations/labcheck-defense";
const slidesDir = path.join(root, "slides");

await fs.mkdir(slidesDir, { recursive: true });

for (let index = 1; index <= 20; index += 1) {
  const num = String(index).padStart(2, "0");
  const code = `import { renderSlideByNumber } from "../shared.mjs";

export async function slide${num}(presentation) {
  return renderSlideByNumber(presentation, ${index});
}
`;
  await fs.writeFile(path.join(slidesDir, `slide-${num}.mjs`), code, "utf8");
}

