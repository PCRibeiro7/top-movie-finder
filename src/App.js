import React, { Component } from 'react';

import Routes from './routes';

import { MuiThemeProvider } from '@material-ui/core/styles';
import CssBaseline from '@material-ui/core/CssBaseline';
import createMuiTheme from './ui/theme/index';

const theme = createMuiTheme;

class App extends Component {
    render() {
        return (
            <div>
                <MuiThemeProvider theme={theme}>
                    <CssBaseline>
                        <Routes />
                    </CssBaseline>
                </MuiThemeProvider>
            </div>
        );
    }
}

export default App;
