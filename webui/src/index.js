import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import registerServiceWorker from './registerServiceWorker';

// import { Provider } from 'react-redux'
// import { createStore } from 'redux'
// import mmsReducers from './reducers';

// let store = createStore(mmsReducers);

ReactDOM.render(
    // <Provider store={store}>
        <App />
    // </Provider>
    , document.getElementById('root'));
registerServiceWorker();
