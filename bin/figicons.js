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
        .option('-K, --key', 'Figma project key')
        .option('-T, --token', 'Figma account token');

    program.command('clean').action(async function(cmd, options) {
        Messager.startCommand();
        await parser.clean();
        Messager.endCommand();
    });

    program.on('command:*', function() {
        console.error('Invalid command: %s\nSee --help for a list of available commands.', program.args.join(' '));
        process.exit(1);
    });

    program.parse(process.argv);

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

            // await Packager.package();
        } catch (error) {
            Messager.log(error.message);
        }
    };

    if (configExists) {
        const configFile = fs.readFileSync(figiconsConfig);
        const configData = JSON.parse(configFile);

        if (configData.figmaConfig) {
            if (!configData.figmaConfig.project) {
                validConfig = false;
                Messager.log(`😬 %s 'figmaconfig.project' not found in .figiconsrc`, 'error');
            }

            if (!configData.figmaConfig.token) {
                validConfig = false;
                Messager.log(`😬 %s 'figmaconfig.token' not found in .figiconsrc`, 'error');
            }

            if (validConfig) {
                Messager.log(`🦄  %s Got a project & token. Skipping selection...`, 'success');
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
                : [{ name: 'No saved project found', disabled: 'Create a new one below' }];

        const { key, token, selectedKey } = await inquirer.prompt([
            {
                type: 'list',
                name: 'selectedKey',
                message: 'Select a saved Figma project, or a enter a new project key',
                choices: [...keyChoices, new inquirer.Separator(), 'New project'],
            },
            {
                type: 'input',
                name: 'key',
                message: 'Enter the file key of your Figma project',
                when: function(answers) {
                    return answers.selectedKey === 'New project';
                },
            },
            {
                type: 'input',
                name: 'token',
                message: 'Enter a personal access token',
                when: function(answers) {
                    return answers.selectedKey === 'New project';
                },
            },
        ]);

        let config = { key, token };
        let isSaved = true;

        if (key && token) {
            isSaved = false;
            config.key = key;
            config.token = token;
        } else {
            const { token: selectedToken } = await keyStore.getItem(selectedKey);
            config.key = selectedKey;
            config.token = selectedToken;
        }

        await fetchIcons(config, !isSaved);
    }

    Messager.endCommand();
})();
