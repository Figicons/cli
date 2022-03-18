import chalkPipe from "chalk-pipe";
import inquirer from "inquirer";
import state from "./state.mjs";

const ui = new inquirer.ui.BottomBar();

let loadingTimer = 0;

export function startLoading(str) {
  clearInterval(loadingTimer);

  const loader = [`${str} ⠏`, `${str} ⠹`, `${str} ⠼`, `${str} ⠧`];
  const length = loader.length;
  let i = 0;

  loadingTimer = setInterval(() => {
    ui.updateBottomBar(`${loader[i++ % length]}\n`);
  }, 300);
}

export function endLoading(str, type) {
  clearInterval(loadingTimer);
  ui.updateBottomBar("");

  if (str) {
    log(`${str}.`, type);
  }
}

export function log(str, type) {
  switch (type) {
    case "success":
      str = str.replace("%s", chalkPipe("greenBright.bold")("success"));
      break;
    case "error":
      str = str.replace("%s", chalkPipe("redBright.bold")("error"));
      break;
    case "info":
      str = str.replace("%s", chalkPipe("cyanBright.bold")("info"));
      break;
  }

  ui.log.write(str);
}

export function startCommand() {
  state.startDate = Date.now();
}

export function endCommand() {
  const msTaken = Date.now() - state.startDate;
  const timeTaken = (msTaken / 1000).toFixed(2);
  log(`⚡️  Done in ${isNaN(timeTaken) ? 0 : timeTaken}s.`);
  process.exit(1);
}
