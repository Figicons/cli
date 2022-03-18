#!/usr/bin/env node --experimental-json-modules

import inquirer from "inquirer";
import storage from "node-persist";
import pkg from "../package.json";
import { program } from "commander";

import {
  log,
  logBeginTimer,
  logEndTimer,
  logEndLoader,
} from "../lib/logger.mjs";
import state from "../lib/state.mjs";
import { createDefaultFolders } from "../lib/folder.mjs";
import { optimizeIcons, bundleIcons } from "../lib/parser.mjs";
import { getFigmaProject, getImageData } from "../lib/fetcher.mjs";
import { KEYSTORE_PATH } from "../lib/paths.mjs";
import { getKeyAndToken } from "../lib/tokens.mjs";

let keyStore;

async function main() {
  keyStore = storage.create({ dir: KEYSTORE_PATH });
  await keyStore.init();

  program
    .version(pkg.version)
    .option("-K, --key <type>", "Your Figma project key")
    .option("-T, --token <type>", "Your Figma personal access token");

  program.parse(process.argv);

  program.command("clean").action(async (cmd, options) => {
    await optimizeIcons();
    process.exit(1);
  });

  program.on("command:*", function () {
    console.error(
      "Invalid command: %s\nSee --help for a list of available commands.",
      program.args.join(" ")
    );
    process.exit(1);
  });

  const keys = await keyStore.keys();
  const values = await keyStore.values();

  await keyStore.setItem("eIOdDEWeiHETuccK5xpfNhEc", {
    name: "Sample icons",
    token: "6742-59554322-f562-4177-8848-f7125dce459a",
  });

  const keyChoices =
    keys.length > 0
      ? keys.reduce((a, k, i) => {
          const val = values[i];
          a.push({ name: `${val.name} (${k})`, value: k });
          return a;
        }, [])
      : [
          {
            name: "No saved projects found",
            disabled: "Create a new one below",
          },
        ];

  const config = getKeyAndToken();
  const hasAllCliOptions = config.key && config.token;
  let shouldSave = hasAllCliOptions;

  if (!hasAllCliOptions) {
    const prompts = [];

    if (!config.key && !config.token) {
      prompts.push({
        type: "list",
        name: "selectedKey",
        message: "Select a saved Figma project, or a enter a new project key",
        choices: [...keyChoices, new inquirer.Separator(), "New project"],
      });
    }

    if (!config.key) {
      prompts.push({
        type: "input",
        name: "key",
        message: "Enter a Figma project key:",
        when: (answers) => answers.selectedKey === "New project",
      });
    }

    if (!config.token) {
      prompts.push({
        type: "input",
        name: "token",
        message: "Enter a Figma personal access token:",
        when: (answers) => answers.selectedKey === "New project",
      });
    }

    const promptAnswers = await inquirer.prompt(prompts);

    shouldSave =
      promptAnswers.selectedKey === "New project" ||
      (config.key && config.token);

    if (promptAnswers.key) {
      config.key = promptAnswers.key;
    }

    if (promptAnswers.token) {
      config.token = promptAnswers.token;
    }

    if (promptAnswers.selectedKey !== "New project") {
      const { token } = await keyStore.getItem(promptAnswers.selectedKey);
      config.key = promptAnswers.selectedKey;
      config.token = token;
    }
  }

  if (config.key && config.token) {
    await fetchIcons(config, shouldSave);
  } else {
    log(
      `👀  %s You didn't provide a personal access token from Figma.`,
      "error"
    );
    log(
      `🤔  %s This might help you: https://figicons.com/custom-icons`,
      "info"
    );
  }

  logEndTimer();
}

async function fetchIcons(config, shouldSave) {
  logBeginTimer();

  createDefaultFolders("figicons");

  state.key = config.key;
  state.token = config.token;

  try {
    const figmaData = await getFigmaProject(config.key);
    await getImageData(figmaData);
    await optimizeIcons();
    await bundleIcons();

    if (shouldSave) {
      const keyExists = await keyStore.getItem(config.key);
      await keyStore.setItem(config.key, {
        name: figmaData.name,
        token: config.token,
      });

      if (keyExists) return;
      log(`⏰  %s Saved project key to recents.`, "success");
    }
  } catch (error) {
    logEndLoader(`💔  %s ${error.message}`, "error");
  }
}

main();
