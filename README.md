## Prerequisites

In order to use this plugin, you'll need to have the following:

- Webpack 5
- TypeScript
- Module Federation plugin (version 5 or later)

## How is this used?

You'll need to install this module then execute type-generator for parent App with `npm run download-types` and start:

```
npm install
npm run create-types
npm run start
```

You'll also need to place a `federation.config.json` in each package being federated. It will contain the remote name and exported members. These properties are used in Webpack's `ModuleFederationPlugin` configuration object. An example:

```json
//federation.config.json

{
  "name": "app2",
  "exposes": {
    "./Button": "./app2/Button"
  }
}
```

It's recommended that you spread these properties into your ModuleFederationPlugin configuration, like so:

```javascript
//webpack.config.js

const deps = require('../package.json').dependencies;
const federationConfig = require('./federation.config.json');

module.exports = {
    ...

    plugins: [
        new ModuleFederationPlugin({
            ...federationConfig,
            filename: "remoteEntry.js",
            shared: {
                ...deps,
            },
        }),
    ],

    ...
}

```

Then you can call `npm run test:webpack` from your `scripts` block in your package's `package.json` file:

```javascript
//package.json

scripts: {
    "start:webpack": "npm run start -workspaces --if-present"
},
```

This script will generate `index.d.ts` and package named file (in our case `webpackApp.d.ts`) files and resulting bundle file is ready to be deployed on a server.

```typescript
//webpackApp.d.ts

/// <reference types="react" />
declare module "webpackApp/UI/Button/Button" {
  import React from "react";
  interface IButton {
    children: string | React.ReactNode;
  }
  export default function Button({ children }: IButton): React.JSX.Element;
}
declare module "webpackApp/App" {
  import React from "react";
  import "./App.scss";
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
