#!/usr/bin/env node --harmony

const program = require('commander');
const inquirer = require('inquirer');
const path = require('path');
const fs = require('fs');
const Fetcher = require('../scripts/Fetcher');
const Parser = require('../scripts/Parser');
const Messager = require('../scripts/Messager');
const FolderManager = require('../scripts/FolderManager');
const storage = require('node-persist');
const package = require('../package.json');
const keyStoreDir = path.join(__dirname, './store');
const figiconsConfig = path.join(process.cwd(), '.figiconsrc');

(async function run() {
    let validConfig = true;
    const parser = new Parser();
    const keyStore = storage.create({ dir: keyStoreDir });
    const configExists = fs.existsSync(figiconsConfig);
    console.log(keyStoreDir);

    await keyStore.init();

    program
        .version(package.version)
        .option('-K, --key', 'Your Figma project key')
        .option('-T, --token', 'Your Figma personal access token');

    program.parse(process.argv);

    program.command('clean').action(async (cmd, options) => {
        await parser.clean();
        process.exit(1);
    });

    program.on('command:*', function() {
        console.error('Invalid command: %s\nSee --help for a list of available commands.', program.args.join(' '));
        process.exit(1);
    });

    const fetchIcons = async (config, saveKeys) => {
        FolderManager.createDefault('figicons');

        const fetcher = new Fetcher({
            key: config.key,
            token: config.token,
        });

        try {
            const figmaData = await fetcher.getFigmaProject(config.key);

            if (saveKeys) {
                await keyStore.setItem(config.key, {
                    name: figmaData.name,
                    token: config.token,
                });
                Messager.log(`⏰  %s Saved project key to recents.`, 'success');
            }

            await fetcher.grabImageData(figmaData);
            await parser.clean();
            await parser.bundle();
        } catch (error) {
            Messager.endLoading(`💔  %s ${error.message}`, 'error');
        }
    };

    if (configExists) {
        const configFile = fs.readFileSync(figiconsConfig);
        const configData = JSON.parse(configFile);

        if (configData.figmaConfig) {
            if (!configData.figmaConfig.project) {
                validConfig = false;
                Messager.log(`😬 %s 'figmaConfig.project' not found in .figiconsrc`, 'error');
            }

            if (!configData.figmaConfig.token) {
                validConfig = false;
                Messager.log(`😬 %s 'figmaConfig.token' not found in .figiconsrc`, 'error');
            }

            if (validConfig) {
                Messager.log(`🦄  %s Got a project key & token. Skipping selection...`, 'success');
                await fetchIcons({ key: configData.figmaConfig.project, token: configData.figmaConfig.token });
            }
        }
    }

    if (program.args.length < 1 && validConfig && !configExists) {
        Messager.startCommand();

        const keys = await keyStore.keys();
        const values = await keyStore.values();

        await keyStore.setItem('eIOdDEWeiHETuccK5xpfNhEc', {
            name: 'Sample icons',
            token: '6742-59554322-f562-4177-8848-f7125dce459a',
        });

        const keyChoices =
            keys.length > 0
                ? keys.reduce((a, k, i) => {
                      const val = values[i];
                      a.push({ name: `${val.name} (${k})`, value: k });
                      return a;
                  }, [])
                : [{ name: 'No saved projects found', disabled: 'Create a new one below' }];

        const promptAnswers = await inquirer.prompt([
            {
                type: 'list',
                name: 'selectedKey',
                message: 'Select a saved Figma project, or a enter a new project key',
                choices: [...keyChoices, new inquirer.Separator(), 'New project'],
            },
            {
                type: 'input',
                name: 'key',
                message: 'Enter a Figma project key:',
                when: answers => {
                    return answers.selectedKey === 'New project';
                },
            },
            {
                type: 'input',
                name: 'token',
                message: 'Enter a Figma personal access token:',
                when: answers => {
                    return answers.selectedKey === 'New project';
                },
            },
        ]);

        let config = { key: promptAnswers.key };
        let isSaved = true;

        if (promptAnswers.selectedKey !== 'New project') {
            const { token } = await keyStore.getItem(promptAnswers.selectedKey);
            config.key = promptAnswers.selectedKey;
            config.token = token;
        } else if (promptAnswers.key && promptAnswers.token) {
            isSaved = false;
            config.key = promptAnswers.key;
            config.token = promptAnswers.token;
        }

        if (config.key && config.token) {
            await fetchIcons(config, !isSaved);
        } else {
            Messager.log(`👀  %s You didn't provide a personal access toke from Figma.`, 'error');
            Messager.log(`🤔  %s This might help you: https://figicons.com/custom-icons`, 'info');
        }
    }

    Messager.endCommand();
})();
