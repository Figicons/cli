import path from "path";

const state = {
  dir: "",
  get iconsDir() {
    return path.join(state.dir, "icons");
  },
  get iconsJson() {
    return path.join(state.dir, "figicons.json");
  },
};

export default state;
