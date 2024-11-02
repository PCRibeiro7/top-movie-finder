import React from 'react';
import { AppBar, Toolbar, Typography } from '@material-ui/core';

const MovieAppBar = () => (
    <AppBar position="static" style={{ background: 'black' }}>
        <Toolbar>
            <img
                alt="Sem Imagem"
                style={{ margin: '1%', width: '30px' }}
                src={
                    'http://icons.iconarchive.com/icons/dtafalonso/android-lollipop/256/Movie-Studio-icon.png'
                }
            />
            <Typography variant="h6">Vai ver o que?</Typography>
        </Toolbar>
    </AppBar>
);

export default MovieAppBar;
