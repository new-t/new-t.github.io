import { createRoot } from 'react-dom/client';
import './index.css';
import './fonts_7/icomoon.css';
import App from './App';
//import {elevate} from './infrastructure/elevator';
import registerServiceWorker from './registerServiceWorker';

//elevate();
const container = document.getElementById('root');
const root = createRoot(container); // createRoot(container!) if you use TypeScript
root.render(<App tab="home" />);

registerServiceWorker();
