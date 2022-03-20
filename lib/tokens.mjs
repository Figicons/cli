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
    configExists && configData.token ? configData.token : undefined;

  const cliKey = options.key;
  const fileKey =
    configExists && configData.project ? configData.project : undefined;

  if (configExists && fileToken && !cliKey && !fileKey) {
    log(`😬 %s 'project' not found in .figiconsrc`, "error");
  }

  if (configExists && fileKey && !cliToken && !fileToken) {
    log(`😬 %s 'token' not found in .figiconsrc`, "error");
  }

  return { key: cliKey || fileKey, token: cliToken || fileToken };
}
