import fs from "fs";
import path from "path";
import state from "./state.mjs";

export function createDefaultFolders(dir) {
  const newDir = path.join("./", dir);
  state.dir = newDir;

  deleteFolder(newDir);
  fs.mkdirSync(state.dir);
  fs.mkdirSync(state.iconsDir);
}

export function deleteFolder(path) {
  if (!fs.existsSync(path)) return;

  fs.readdirSync(path).forEach((file) => {
    const curPath = path + "/" + file;
    if (fs.lstatSync(curPath).isDirectory()) {
      deleteFolder(curPath);
    } else {
      fs.unlinkSync(curPath);
    }
  });

  fs.rmdirSync(path);
}
