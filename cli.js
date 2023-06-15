#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const findNodeModules = require('find-node-modules');
const ts = require('typescript');
const minimist = require('minimist');
const http = require('http');
const pkg = require('./package.json');

function reportDiagnostic(diagnostic) {
  console.log(
    'TS Error',
    diagnostic.code,
    ':',
    ts.flattenDiagnosticMessageText(diagnostic.messageText, ts.sys.newLine),
  );
}

//@TODO: takes actual url address from remote app
const getFederationTypesUrl = (remotesUrl) => {
  const fileName = remotesUrl.split('@')[0];
  remotesUrl = remotesUrl.split('@')[1];

  if (!remotesUrl) {
    console.error('URL addres must contain @');
    process.exit(1);
  }

  return remotesUrl.replace(/remoteEntry.js/, `federated-types/${fileName}.d.ts`);
};

const findFederationConfig = (base) => {
  let files = fs.readdirSync(base);
  let queue = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const newBase = path.join(base, file);
    if (file === 'federation.config.json') {
      return path.resolve('./', newBase);
    } else if (fs.statSync(newBase).isDirectory() && !newBase.includes('node_modules')) {
      queue.push(newBase);
    }
  }

  for (let i = 0; i < queue.length; i++) {
    return findFederationConfig(queue[i]);
  }
};

function getModuleDeclareName(exposeName) {
  // windows paths
  return path.join(federationConfig.name, exposeName).replace(/[\\/]/g, '/');
}

function generateTypes(config, outputDir) {
  if (!config.exposes) return;

  const files = Object.values(config.exposes);
  const keys = Object.keys(config.exposes);

  const outFile = path.resolve(outputDir, `${config.name}.d.ts`);

  if (fs.existsSync(outFile)) {
    fs.unlinkSync(outFile);
  }

  //@TODO: write the typings file
  const program = ts.createProgram(files, {
    outFile,
    declaration: true,
    emitDeclarationOnly: true,
    skipLibCheck: true,
    jsx: 'react',
    esModuleInterop: true,
  });

  const { emitSkipped, diagnostics } = program.emit();

  diagnostics.forEach(reportDiagnostic);

  if (emitSkipped) {
    process.exit(0);
  }

  let typing = fs.readFileSync(outFile, { encoding: 'utf8', flag: 'r' });

  const moduleRegex = RegExp(/declare module "(.*)"/, 'g');
  const moduleNames = [];

  while ((execResults = moduleRegex.exec(typing)) !== null) {
    moduleNames.push(execResults[1]);
  }

  moduleNames.forEach((name) => {
    // exposeName - relative name of exposed component (if not found - just take moduleName)
    const [exposeName = name, ...aliases] = keys.filter((key) => federationConfig.exposes[key].endsWith(name));
    const regex = RegExp(`"${name}"`, 'g');

    const moduleDeclareName = getModuleDeclareName(exposeName);

    const createAliasModule = (name) => `
            declare module "${getModuleDeclareName(name)}" {
                export * from "${moduleDeclareName}"
            }
        `;

    typing = [typing.replace(regex, `"${moduleDeclareName}"`), ...aliases.map(createAliasModule)].join('\n');
  });

  outputDirs.forEach((_outputDir) => {
    const _outFile = path.resolve(_outputDir, `${federationConfig.name}.d.ts`);
    console.log('writing typing file:', _outFile);

    fs.writeFileSync(_outFile, typing);
    console.debug(`using output dir: ${_outputDir}`);

    //@TODO: write/update the index.d.ts file
    const indexPath = path.resolve(_outputDir, 'index.d.ts');
    const importStatement = `export * from './${federationConfig.name}';`;

    if (!fs.existsSync(indexPath)) {
      console.log('creating index.d.ts file');
      fs.writeFileSync(indexPath, `${importStatement}\n`);
    } else {
      console.log('updating index.d.ts file');
      const contents = fs.readFileSync(indexPath);
      if (!contents.includes(importStatement)) {
        fs.writeFileSync(indexPath, `${contents}${importStatement}\n`);
      }
    }
  });
}

//@TODO: download type files from all remote apps for all outputDirs
function downloadTypes(remotes) {
  if (!remotes || remotes.length === 0) return;

  Object.entries(remotes).forEach(([key, val]) => {
    const url = getFederationTypesUrl(val);
    console.log('GET: ', url);

    http.get(url, (response) => {
      const { statusCode } = response;

      if (statusCode !== 200) {
        console.error(`Request with url: ${url} Failed.\n` + `Status Code: ${statusCode}`);
        return;
      }
      outputDirs.forEach((_outputDir) => {
        const _outFile = path.resolve(_outputDir, `${key}.d.ts`);
        console.log('writing typing file:', _outFile);

        if (!fs.existsSync(_outputDir)) {
          fs.mkdirSync(_outputDir);
          console.log(`${_outputDir} dir`);
        }
        const file = fs.createWriteStream(_outFile);
        response.pipe(file);

        file.on('finish', () => {
          file.close();
          console.log('Download Completed');
        });
      });
    });
  });
}

//@TODO: return config file
function federationConfigFile(config) {
  const configPath = config ? path.resolve(config) : null;
  if (configPath && !fs.existsSync(configPath)) {
    console.error(`ERROR: Unable to find a provided config: ${configPath}`);
    process.exit(1);
  }

  const federationConfigPath = configPath || findFederationConfig('./');

  if (federationConfigPath === undefined) {
    console.error(`ERROR: Unable to find a federation.config.json file in this package`);
    process.exit(1);
  }

  console.log(`Using config file: ${federationConfigPath}`);
  return require(federationConfigPath);
}

const [nodeModules] = findNodeModules({ cwd: process.argv[1], relative: false });
const nodeModulesOutputDir = path.resolve(nodeModules, '@types/__federated_types/');

const args = process.argv.slice(2);
const argv = minimist(args, {
  string: ['outputDir', 'config'],
  boolean: ['saveToNodeModules', 'help'],
  alias: {
    outputDir: ['o'],
    config: ['c'],
    saveToNodeModules: ['s'],
    registry: ['r'],
    help: ['h'],
  },
  default: {
    saveToNodeModules: false,
    config: null,
    outputDir: nodeModulesOutputDir,
  },
});

if (argv.help) {
  console.log(
    [
      `Version: ${pkg.version}`,
      'Example: download-types -o my-dir -c my-config.json',
      '',
      'Usage: download-types [options]',
      'Options:',
      '  -h, --help                        Print this message',
      '  -o, --outputDir                   Write into this dir',
      '  -c, --config PATH_TO_FILE         Use specified config file',
      '  -s, --saveToNodeModules           To save in node_modules and output-dir',
    ].join('\n'),
  );
  process.exit(0);
}

const outputDir = argv.outputDir ? path.resolve('./', argv.outputDir) : nodeModulesOutputDir;

const outputDirs =
  argv.outputDir !== nodeModulesOutputDir && argv.saveToNodeModules
    ? [nodeModulesOutputDir, argv.outputDir]
    : [argv.outputDir];

const federationConfig = federationConfigFile(argv.config);

function main() {
  try {
    generateTypes(federationConfig, outputDir);
    downloadTypes(federationConfig.remotes);
    console.debug('Success!');
  } catch (e) {
    console.error(`ERROR:`, e);
    process.exit(1);
  }
}

main();
