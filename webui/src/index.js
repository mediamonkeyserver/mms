import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import registerServiceWorker from './registerServiceWorker';

import { MuiThemeProvider, createMuiTheme } from 'material-ui/styles';

import { BrowserRouter } from 'react-router-dom';

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

ReactDOM.render(
	<MuiThemeProvider theme={theme}>
		<BrowserRouter>
			<App />
		</BrowserRouter>
	</MuiThemeProvider>
	, document.getElementById('root'));
registerServiceWorker();