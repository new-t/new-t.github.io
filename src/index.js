import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import './fonts_7/icomoon.css';
import App from './App';
//import {elevate} from './infrastructure/elevator';
import registerServiceWorker from './registerServiceWorker';

//elevate();

ReactDOM.render(<App />, document.getElementById('root'));
registerServiceWorker();
