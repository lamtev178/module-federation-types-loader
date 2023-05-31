/// <reference types="react" />
declare module "app2/Button" {
    import React from 'react';
    type ButtonProps = {
        size: 'small' | 'large';
    };
    const Button: React.FC<ButtonProps>;
    export default Button;
}
declare module "app2/App" {
    const App: () => JSX.Element;
    export default App;
}
