#!/usr/bin/env node --experimental-json-modules

import pkg from "../package.json";
import fs from "fs";
import { program } from "commander";
import chalkPipe from "chalk-pipe";

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
import { FIGICONS_CONFIG_PATH } from "../lib/paths.mjs";

async function main() {
  program
    .version(pkg.version)
    .option("-K, --key <type>", "Figma project key")
    .option("-T, --token <type>", "Figma personal access token")
    .option("-D, --dim <type>", "Dimensions of Figma icons to filter")
    .option("-N, --name <type>", "Start name to filter Figma icons", "")
    .option(
      "-P, --page <type>",
      "Name of page in Figma project to fetch from",
      ""
    );

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

  const options = program.opts();
  const configExists = fs.existsSync(FIGICONS_CONFIG_PATH);
  const configFile = configExists ? fs.readFileSync(FIGICONS_CONFIG_PATH) : {};
  const configData = JSON.parse(configFile);

  const cliToken = options.token;
  const fileToken =
    configExists && configData?.token ? configData?.token : undefined;

  const cliKey = options.key;
  const fileKey =
    configExists && configData?.project ? configData?.project : undefined;

  const cliDim = options.dim;
  const fileDim = configExists && configData?.dim ? configData?.dim : undefined;

  const cliPrefix = options.prefix;
  const filePrefix =
    configExists && configData?.prefix ? configData?.prefix : undefined;

  const cliPage = options.page;
  const filePage =
    configExists && configData?.page ? configData?.page : undefined;

  const config = {
    key: cliKey || fileKey,
    token: cliToken || fileToken,
    prefix: cliPrefix || filePrefix,
    dim: cliDim || fileDim,
    page: cliPage || filePage,
  };

  if (!config.key) {
    const message = configExists
      ? `😬 %s .project' not found in .figiconsrc`
      : `😬 %s Project key is missing. Set with -K, --key <type>`;
    log(message, "error");
  }

  if (!config.token) {
    const message = configExists
      ? `😬 %s .token' not found in .figiconsrc`
      : `😬 %s Token is missing. Set with -T, --token <type>`;
    log(message, "error");
  }

  if (config.key) {
    const figmaLinkRegexPattern =
      /^(?:https:\/\/)?(?:www\.)?figma\.com\/(file|proto)\/([0-9a-zA-Z]{22,128})(?:\/.*)?node-id=([^&]*)$/;
    const matched = config.key.match(figmaLinkRegexPattern);
    const matchKey = matched && matched.length > 2 ? matched[2] : config.key;

    state.key = matchKey;
  }

  if (config.token) {
    state.token = config.token;
  }

  if (config.dim) {
    state.iconSize = parseInt(config.dim);
  }

  if (config.prefix) {
    state.iconPrefix = config.prefix;
  }

  if (config.page) {
    state.page = config.page;
  }

  log(`👉 ${chalkPipe("cyanBright.bold")("Figma project key")}: ${state.key}`);

  if (state.iconPrefix) {
    log(
      `👉 ${chalkPipe("cyanBright.bold")("Name filter")}: ${state.iconPrefix}`
    );
  }

  if (state.iconSize > 0) {
    log(
      `👉 ${chalkPipe("cyanBright.bold")("Size filter")}: ${state.iconSize}x${
        state.iconSize
      }`
    );
  }

  if (state.page) {
    log(`👉 ${chalkPipe("cyanBright.bold")("Page")}: ${state.page}`);
  }

  if (state.key && state.token) {
    await fetchIcons();
  }

  logEndTimer();
}

async function fetchIcons() {
  logBeginTimer();

  createDefaultFolders("figicons");

  try {
    const figmaData = await getFigmaProject(state.key);
    const iconArray = await getImageData(figmaData);
    const iconMap = await optimizeIcons(iconArray);
    await bundleIcons(iconMap);
  } catch (error) {
    logEndLoader(`💔 %s ${error.message}`, "error");
  }
}

main();
