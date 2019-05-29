const chalkPipe = require('chalk-pipe');
const inquirer = require('inquirer');
const ui = new inquirer.ui.BottomBar();

class Messager {
    static startLoading(str) {
        clearInterval(Messager.loadingTimer);

        const loader = [`${str} ⠏`, `${str} ⠹`, `${str} ⠼`, `${str} ⠧`];
        const length = loader.length;
        let i = 0;

        Messager.loadingTimer = setInterval(() => {
            ui.updateBottomBar(`${loader[i++ % length]}\n`);
        }, 300);
    }

    static endLoading(str, type) {
        clearInterval(Messager.loadingTimer);
        ui.updateBottomBar('');

        if (str) {
            Messager.log(`${str}.`, type);
        }
    }

    static log(str, type) {
        if (type === 'success') {
            str = str.replace('%s', chalkPipe('greenBright.bold')('success'));
        }

        if (type === 'error') {
            str = str.replace('%s', chalkPipe('redBright.bold')('error'));
        }

        if (type === 'info') {
            str = str.replace('%s', chalkPipe('cyanBright.bold')('info'));
        }

        ui.log.write(str);
    }

    static startCommand() {
        Messager.startDate = Date.now();
    }

    static endCommand() {
        const msTaken = Date.now() - Messager.startDate;
        const timeTaken = (msTaken / 1000).toFixed(2);
        Messager.log(`⚡️  Done in ${isNaN(timeTaken) ? 0 : timeTaken}s.`);
        process.exit(1);
    }
}

module.exports = Messager;
