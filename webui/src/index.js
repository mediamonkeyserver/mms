import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import registerServiceWorker from './registerServiceWorker';

import { MuiThemeProvider, createMuiTheme } from 'material-ui/styles';

const theme = createMuiTheme({
	// palette: {
	// 	primary: {
	// 		light: '#d05ce3',
	// 		main: '#9c27b0',
	// 		dark: '#6a0080',
	// 		contrastText: '#fff',
	// 	},
	// 	secondary: {
	// 		light: '#9fffe0',
	// 		main: '#69f0ae',
	// 		dark: '#2bbd7e',
	// 		contrastText: '#000',
	// 	},
	// 	type: 'dark',
	// }
});

// import { Provider } from 'react-redux'
// import { createStore } from 'redux'
// import mmsReducers from './reducers';

// let store = createStore(mmsReducers);

ReactDOM.render(
	// <Provider store={store}>
	<MuiThemeProvider theme={theme}>
		<App />
	</MuiThemeProvider>
	// </Provider>
	, document.getElementById('root'));
registerServiceWorker();