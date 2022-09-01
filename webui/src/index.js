// @ts-check
import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import registerServiceWorker from './registerServiceWorker';
import { ThemeProvider } from '@mui/material/styles';
import { BrowserRouter } from 'react-router-dom';
import User from './User';
import App from './App';
import theme from './theme';

ReactDOM.render(
	<ThemeProvider theme={theme}>
		<BrowserRouter basename="/web">
			<User>
				<App />
			</User>
		</BrowserRouter>
	</ThemeProvider>
	, document.getElementById('root'));
registerServiceWorker();