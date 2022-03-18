import request from "request";
import fs from "fs";
import path from "path";
import { logBeingLoader, logEndLoader } from "./logger.mjs";
import state from "./state.mjs";

const fetchStream = (url) => {
  return request.get(url);
};

function streamToPromise(stream) {
  return new Promise(function (resolve, reject) {
    stream.on("end", resolve);
    stream.on("error", reject);
  });
}

export async function getFigmaProject(key) {
  logBeingLoader(`🔎  Inspecting file with Figma API`);
  const figmaData = await getApiData(`files/${key}`);
  logEndLoader(`📚  %s Read file data from Figma`, "success");

  return figmaData;
}

export function grabImageFiles(images, iconMap) {
  return Object.entries(iconMap).map(([key, icon]) => {
    const stream = fetchStream(images[key]);

    stream.pipe(
      fs.createWriteStream(path.join(state.iconsDir, `${icon.name}.svg`))
    );

    return streamToPromise(stream);
  });
}

export async function getApiData(url) {
  const options = {
    url: `https://api.figma.com/v1/${url}`,
    headers: {
      "Content-Type": "application/json",
      "X-Figma-Token": state.token,
    },
  };

  return new Promise((resolve, reject) => {
    request(options, (_, response, body) => {
      switch (response.statusCode) {
        case 200:
          return resolve(JSON.parse(body));
        case 400:
        case 403:
          return reject({
            code: response.statusCode,
            message:
              "Couldn't fetch file from Figma. Maybe you're unauthorized or file doesn't exist.",
          });
        default:
          return reject({
            code: response.statusCode,
            message: "Something went wrong with the request, try again later.",
          });
      }
    });
  });
}

export async function getImageData(figmaData) {
  const perChunk = 20;
  const iconMap = {};
  const icons = figmaData.document.children[0].children;

  logBeingLoader(`🐕  Fetching ${icons.length} icons from Figma`);

  const frameChunks = icons.reduce((chunks, icon, i) => {
    const chunkIndex = Math.floor(i / perChunk);

    chunks[chunkIndex] = chunks[chunkIndex] || [];
    chunks[chunkIndex].push(icon.id);

    iconMap[icon.id] = {
      id: icon.id,
      name: icon.name,
    };

    return chunks;
  }, []);

  const chunkPromises = frameChunks.map((frameChunk, i) => {
    const prom = getApiData(
      `images/${state.key}?ids=${frameChunk.join(",")}&format=svg`
    );
    // prom.then(() => console.log(`Completed chunk ${i}`));

    return prom;
  });

  const res = await Promise.all(chunkPromises);
  let images = {};

  res
    .filter((e) => e.images)
    .forEach((e) => {
      images = { ...images, ...e.images };
    });

  if (!fs.existsSync(state.iconsDir)) {
    fs.mkdirSync(state.iconsDir);
  }

  await Promise.all(grabImageFiles(images, iconMap));

  logEndLoader(
    `👏  %s Got ${icons.length} icons from: ${figmaData.name}`,
    "success"
  );
}
