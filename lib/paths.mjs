import path from "path";
import { fileURLToPath } from "url";

export const FILENAME_PATH = fileURLToPath(import.meta.url);
export const DIRNAME_PATH = path.dirname(FILENAME_PATH);
export const FIGICONS_CONFIG_PATH = path.join(process.cwd(), ".figiconsrc");
export const SVGO_CONFIG_PATH = path.join(
  process.cwd(),
  "configs",
  "svgo.json"
);
