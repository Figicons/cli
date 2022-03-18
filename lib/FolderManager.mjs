import fs from "fs";
import path from "path";

export default class FolderManager {
  static async createDefault(dir) {
    dir = path.join("./", dir);
    FolderManager.dir = dir;
    FolderManager.del(dir);
    fs.mkdirSync(FolderManager.dirs.dir);
    fs.mkdirSync(FolderManager.dirs.iconsDir);
  }

  static del(path) {
    if (fs.existsSync(path)) {
      fs.readdirSync(path).forEach(function (file, index) {
        const curPath = path + "/" + file;
        if (fs.lstatSync(curPath).isDirectory()) {
          FolderManager.del(curPath);
        } else {
          fs.unlinkSync(curPath);
        }
      });
      fs.rmdirSync(path);
    }
  }

  static get dirs() {
    return {
      dir: FolderManager.dir,
      iconsDir: path.join(FolderManager.dir, "icons"),
      iconsJson: path.join(FolderManager.dir, "figicons.json"),
    };
  }
}