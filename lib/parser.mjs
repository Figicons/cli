import fs from "fs";
import path from "path";
import { load } from "cheerio";
import { optimize, loadConfig } from "svgo";
import state from "./state.mjs";
import { DIRNAME_PATH, SVGO_CONFIG_PATH } from "./paths.mjs";
import { log, logBeingLoader, logEndLoader } from "./logger.mjs";

export async function optimizeIcons(iconArray) {
  const length = Object.values(iconArray).length;
  logBeingLoader(`🚀 Cleaning & optimizing ${length} icons`);

  await loadConfig(SVGO_CONFIG_PATH);

  const iconMap = iconArray.reduce((obj, { name, content }) => {
    const result = optimize(content);
    const optimizedSvgString = result.data;

    const $ = load(content);
    const inner = $("svg");

    let height = inner.attr("height");
    let width = inner.attr("width");

    try {
      height = parseInt(height);
      width = parseInt(width);
    } catch {}

    inner.find("*").each((_, e) => {
      const element = $(e);

      element.attr("stroke", function (i, id) {
        if (id) return "currentColor";
        return null;
      });

      element.attr("fill", function (i, id) {
        if (id) return "currentColor";
        return null;
      });
    });

    if (typeof optimizedSvgString !== "string") {
      log(`⏩ %s Skipping icon: ${filename.split(".")[0]}`, "info");
    } else {
      obj[name] = { height, width, content: inner.html().trim() };
    }

    return obj;
  }, {});

  logEndLoader(`🚀 %s Cleaned & optimized ${length} icons`, "success");

  return iconMap;
}

export async function optimizeIconsOld() {
  await loadConfig(SVGO_CONFIG_PATH);

  const filenames = fs.readdirSync(state.iconsDir);

  logBeingLoader(`🚀 Cleaning & optimizing ${filenames.length} icons`);

  const promises = filenames.map((filename) => {
    return new Promise((resolve) => {
      const iconPath = path.join(state.iconsDir, filename);
      const iconData = fs.readFileSync(iconPath, "utf-8");
      const result = optimize(iconData, { path: iconPath });
      const optimizedSvgString = result.data;

      if (typeof optimizedSvgString !== "string") {
        log(`⏩ %s Skipping icon: ${filename.split(".")[0]}`, "info");
        return resolve("none");
      }

      fs.writeFile(iconPath, optimizedSvgString, resolve);
    });
  });

  await Promise.all(promises);

  logEndLoader(`🚀 %sCleaned & optimized ${filenames.length} icons`, "success");
}

export async function bundleIcons(iconMap) {
  logBeingLoader(`🛠  Bundling ${iconMap.length} icons`);

  const data = JSON.stringify(iconMap, null, 2);

  // Write to local json for components to read
  // fs.writeFileSync(
  //   path.join(DIRNAME_PATH, "..", "figicons.json"),
  //   data,
  //   "utf-8"
  // );

  // Write to public json for user
  fs.writeFileSync(state.iconsJson, data, "utf-8");

  logEndLoader(`📦 %s Bundled ${Object.keys(iconMap).length} icons`, "success");
}
