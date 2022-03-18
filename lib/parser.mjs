import path from "path";
import fs from "fs";
import { load } from "cheerio";
import { optimize, loadConfig } from "svgo";
import state from "./state.mjs";
import { DIRNAME_PATH, SVGO_CONFIG_PATH } from "./paths.mjs";
import { log, logBeingLoader, logEndLoader } from "./logger.mjs";

async function read() {
  const filenames = fs.readdirSync(state.iconsDir);
  const promises = filenames.map((filename) => {
    return new Promise((resolve) => {
      fs.readFile(
        path.join(state.iconsDir, filename),
        "utf-8",
        (_, content) => {
          const $ = load(content);
          const inner = $("svg");

          inner.find("*").each((i, e) => {
            $(e).attr("stroke", "currentColor");
          });

          resolve({
            name: path.parse(filename).name,
            file: filename,
            content: inner.html().trim(),
          });
        }
      );
    });
  });

  return Promise.all(promises);
}

export async function optimizeIcons() {
  await loadConfig(SVGO_CONFIG_PATH);

  const filenames = fs.readdirSync(state.iconsDir);

  logBeingLoader(`🚀  Cleaning & optimizing ${filenames.length} icons`);

  const promises = filenames.map((filename) => {
    return new Promise((resolve) => {
      const iconPath = path.join(state.iconsDir, filename);
      const iconData = fs.readFileSync(iconPath, "utf-8");
      const result = optimize(iconData, { path: iconPath });
      const optimizedSvgString = result.data;

      if (typeof optimizedSvgString !== "string") {
        log(`⏩  %s Skipping icon: ${filename.split(".")[0]}`, "info");
        return resolve("none");
      }

      fs.writeFile(iconPath, optimizedSvgString, resolve);
    });
  });

  await Promise.all(promises);

  logEndLoader(
    `🚀  %s Cleaned & optimized ${filenames.length} icons`,
    "success"
  );
}

export async function bundleIcons() {
  const iconData = await read();

  logBeingLoader(`🛠  Bundling ${iconData.length} icons`);

  const icons = iconData.reduce((ob, icon) => {
    ob[icon.name] = {
      name: icon.name,
      file: icon.file,
      content: icon.content,
    };

    return ob;
  }, {});

  // Write to local json for components to read
  fs.writeFileSync(
    path.join(DIRNAME_PATH, "..", "figicons.json"),
    JSON.stringify(icons, null, 2),
    "utf-8"
  );

  // Write to public json for user
  fs.writeFileSync(state.iconsJson, JSON.stringify(icons, null, 2), "utf-8");

  logEndLoader(`📦  %s Bundled ${iconData.length} icons`, "success");
}
