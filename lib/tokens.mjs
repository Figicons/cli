import fs from "fs";
import { program } from "commander";
import { log } from "../lib/logger.mjs";
import { FIGICONS_CONFIG_PATH } from "../lib/paths.mjs";

export function getKeyAndToken() {
  const options = program.opts();
  const configExists = fs.existsSync(FIGICONS_CONFIG_PATH);
  const configFile = configExists ? fs.readFileSync(FIGICONS_CONFIG_PATH) : {};
  const configData = JSON.parse(configFile);

  const cliToken = options.token;
  const fileToken =
    configExists && configData.figmaConfig?.token
      ? configData.figmaConfig?.token
      : undefined;

  const cliKey = options.key;
  const fileKey =
    configExists && configData.figmaConfig?.project
      ? configData.figmaConfig?.project
      : undefined;

  if (configExists && fileToken && !cliKey && !fileKey) {
    log(`😬 %s 'figmaConfig.project' not found in .figiconsrc`, "error");
  }

  if (configExists && fileKey && !cliToken && !fileToken) {
    log(`😬 %s 'figmaConfig.token' not found in .figiconsrc`, "error");
  }

  return { key: cliKey || fileKey, token: cliToken || fileToken };
}
