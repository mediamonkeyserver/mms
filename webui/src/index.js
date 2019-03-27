// @ts-check
import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import registerServiceWorker from './registerServiceWorker';

import { MuiThemeProvider, createMuiTheme } from '@material-ui/core/styles';

import { BrowserRouter } from 'react-router-dom';
import User from './User';

const theme = createMuiTheme({
	typography: {
		useNextVariants: true,
	},
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
		<BrowserRouter basename="/web">
			<User />
		</BrowserRouter>
	</MuiThemeProvider>
	, document.getElementById('root'));
registerServiceWorker();