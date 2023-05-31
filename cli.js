#!/usr/bin/env node

const path = require("path");
const fs = require("fs");
const http = require("http");

const getArg = (argName) => {
  const argIndex = process.argv.indexOf(argName);
  return argIndex !== -1 ? process.argv[argIndex + 1] : null;
};

function getFederationTypesUrl(remotesUrl) {
  //app1@http://localhost:3001/remoteEntry.js -> http://localhost:3001/federated-types/app1.d.ts

  const fileName = remotesUrl.split("@")[0];
  remotesUrl = remotesUrl.split("@")[1];

  if (!remotesUrl) {
    console.error("URL addres must contain @");
    process.exit(1);
  }

  return remotesUrl.replace(
    /remoteEntry.js/,
    `federated-types/${fileName}.d.ts`
  );
}

const findRemotesConfig = (base) => {
  let files = fs.readdirSync(base);
  let queue = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const newBase = path.join(base, file);
    if (file === "remotes.config.json") {
      return path.resolve("./", newBase);
    } else if (
      fs.statSync(newBase).isDirectory() &&
      !newBase.includes("node_modules")
    ) {
      queue.push(newBase);
    }
  }

  for (let i = 0; i < queue.length; i++) {
    return findRemotesConfig(queue[i]);
  }
};

const configPathArg = getArg("--config");
const configPath = configPathArg ? path.resolve(configPathArg) : null;

const remotesConfigPath = configPath || findRemotesConfig("./");

if (remotesConfigPath === undefined) {
  console.error(
    `ERROR: Unable to find a remotes.config.json file in this package`
  );
  process.exit(1);
}

console.log(`Using config file: ${remotesConfigPath}`);

const remotesConfig = require(remotesConfigPath);

try {
  Object.entries(remotesConfig.remotes).forEach(([key, val]) => {
    const filePath = `federated-types/${key}.d.ts`;

    if (!fs.existsSync("federated-types/")) {
      fs.mkdirSync("federated-types/");
      console.log("Create federated-types dir");
    }
    const file = fs.createWriteStream(filePath);

    const url = getFederationTypesUrl(val);

    console.log("GET: ", url);

    http.get(url, (response) => {
      response.pipe(file);

      file.on("finish", () => {
        file.close();
        console.log("Download Completed");
      });
    });
  });

  console.log("Success!");
} catch (e) {
  console.error("ERROR: ", e);
}
