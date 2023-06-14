# module-federation-types-loader

[![npm version](https://badge.fury.io/js/module-federation-types-loader.svg)](https://badge.fury.io/js/module-federation-types-loader)

This package exposes a node CLI command called `download-types`. Once installed, you can run that command within a package, and it will downloads types from child apps specified in `federation.config.json`

## Prerequisites

In order to use this plugin, you'll need to have the following:

- Webpack 5
- TypeScript
- Module Federation plugin (version 5 or later)

#

You need to place a `federation.config.json` in each package being federated. It will contain the remote name and exported members. These properties are used in Webpack's `ModuleFederationPlugin` configuration object. An example:

```javascript
//federation.config.json

{
  "name": "app2",
  "exposes": {
    "./Button": "./app2/Button"
  },
  "remotes": {
    "app1": "app1@http://localhost:3001/remoteEntry.js",
    "app2": "app2@http://localhost:3002/remoteEntry.js"
  }
}
```

It's recommended that you spread these properties into your ModuleFederationPlugin configuration, like so:

```javascript
//webpack.config.js

const deps = require('../package.json').dependencies;
const federationConfig = require('./federation.config.json');

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      ...federationConfig,
      filename: 'remoteEntry.js',
      shared: {
        ...deps,
      },
    }),
  ],
};
```

Then you can call `npm run download-types` from your `scripts` block in your package's `package.json` file:

> NOTE: Apps from `federation.config.json` must be up

```javascript
//package.json

scripts: {
  "download-types": "lerna run download-types",
},
```

If you would like to specify custom path to the config or custom output dir, you can pass `--config` and `--outputDir` parameter like so:

```javascript
//package.json

scripts: {
    "download-types": "download-types --outputDir my-dir --config my-config.json"
}
```

This script will generate `index.d.ts` and package named file (in our case `webpackApp.d.ts`) files and resulting bundle file is ready to be deployed on a server.

```typescript
//webpackApp.d.ts

/// <reference types="react" />
declare module 'webpackApp/UI/Button/Button' {
  import React from 'react';
  interface IButton {
    children: string | React.ReactNode;
  }
  export default function Button({ children }: IButton): React.JSX.Element;
}
declare module 'webpackApp/App' {
  import React from 'react';
  import './App.scss';
  const App: () => React.JSX.Element;
  export default App;
}
```

This file will be able by `localhost:3003/federated-types/yourModuleName`

Where yourModuleName - `webpackApp.d.ts`

# Conclusion

By using this plugin, you can easily generate TypeScript types for your microfrontends without having to manually maintain them. This makes it easier to safely import components and modules from remote entries and improves the overall developer experience.

# References

https://github.com/TouK/federated-types/

https://webpack.js.org/plugins/module-federation-plugin/

https://github.com/originjs/vite-plugin-federation/
