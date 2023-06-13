import React from 'react';

const ChildApp = React.lazy(() => import('app1/App'));
const Button = React.lazy(() => import('app2/Button'));

const App = () => (
  <div>
    <h1>Parent App</h1>
    <React.Suspense fallback="Loading Button">
      <ChildApp />
      <h1>Button from app2</h1>
      <Button size="large"></Button>
    </React.Suspense>
  </div>
);

export default App;
