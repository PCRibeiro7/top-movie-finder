// src/ui/theme/index.js

import { createMuiTheme } from '@material-ui/core/styles';

const palette = {
    type: 'dark',
    primary: { main: '#212121' },
    secondary: { main: '#FDD835' },
};
const themeName = 'Mine Shaft Bright Sun Black-footed Cat';

export default createMuiTheme({ palette, themeName });
