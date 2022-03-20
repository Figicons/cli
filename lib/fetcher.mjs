import fs from "fs";
import request from "request";
import state from "./state.mjs";
import { logBeingLoader, logEndLoader } from "./logger.mjs";

const fetchStream = (url) => {
  return request.get(url);
};

function streamToString(stream, iconName) {
  let content = "";
  return new Promise((resolve, reject) => {
    stream.on("data", (chunk) => (content += chunk.toString()));
    stream.on("error", (err) => reject(err));
    stream.on("end", () =>
      resolve({
        name: iconName,
        content,
      })
    );
  });
}

export async function getFigmaProject(key) {
  logBeingLoader(`🔎 Inspecting file with Figma API`);
  const figmaData = await getApiData(`files/${key}`);
  logEndLoader(`📚 %s Read file data from Figma`, "success");

  return figmaData;
}

export function grabImageFiles(images, iconMap) {
  return Object.entries(iconMap).map(([key, icon]) => {
    const stream = fetchStream(images[key]);

    // stream.pipe(
    //   fs.createWriteStream(path.join(state.iconsDir, `${icon.name}.svg`))
    // );

    return streamToString(stream, icon.name);
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

function isValidIcon(data) {
  let isValid = true;
  if (state.iconSize > 0) {
    isValid =
      data.absoluteBoundingBox.width === state.iconSize &&
      data.absoluteBoundingBox.height === state.iconSize;
  }

  if (state.iconPrefix && isValid) {
    isValid = data.name.startsWith(state.prefix);
  }

  return isValid;
}

export async function getImageData(figmaData) {
  const perChunk = 20;
  const iconMap = {};
  const firstPage = figmaData.document.children[0];
  const foundPage = figmaData.document.children.find(
    (c) => c.type === "CANVAS" && c.name === state.page
  );

  const page = state.page ? foundPage : firstPage;

  const children = page.children;

  const icons = children.filter(
    (c) =>
      isValidIcon(c) &&
      c.absoluteBoundingBox.width === c.absoluteBoundingBox.height
  );

  logBeingLoader(`🐕 Fetching ${icons.length} icons from Figma`);

  const frameChunks = icons.reduce((chunks, icon, i) => {
    const chunkIndex = Math.floor(i / perChunk);
    const baseName = icon.name.split("/").pop();
    let name = baseName;

    let hasDuplicateName = Object.values(iconMap).some((i) => i.name === name);
    let index = 0;

    while (hasDuplicateName === true) {
      index++;
      name = `${baseName}-${index}`;
      hasDuplicateName = Object.values(iconMap).some((i) => i.name === name);
    }

    chunks[chunkIndex] = chunks[chunkIndex] || [];
    chunks[chunkIndex].push(icon.id);

    iconMap[icon.id] = {
      id: icon.id,
      name: name,
      originalName: icon.name,
    };

    return chunks;
  }, []);

  const chunkPromises = frameChunks.map((chunk) =>
    getApiData(`images/${state.key}?ids=${chunk.join(",")}&format=svg`)
  );

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

  const iconArray = await Promise.all(grabImageFiles(images, iconMap));

  logEndLoader(
    `🗺  %s Got ${icons.length} icons from page: ${figmaData.name}`,
    "success"
  );

  return iconArray;
}
