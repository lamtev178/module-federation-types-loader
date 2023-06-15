import React from 'react';

const ChildApp = React.lazy(() => import('app1/App'));

const App = () => (
  <div>
    <h1>Parent App</h1>
    <React.Suspense fallback="Loading Button">
      <ChildApp />
    </React.Suspense>
  </div>
);

export default App;
