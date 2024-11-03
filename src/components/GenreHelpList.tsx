import React from 'react';

import WhatshotIcon from '@mui/icons-material/Whatshot';
import InsertEmoticonIcon from '@mui/icons-material/InsertEmoticon';
import SportsKabaddiIcon from '@mui/icons-material/SportsKabaddi';
import SentimentVeryDissatisfiedIcon from '@mui/icons-material/SentimentVeryDissatisfied';
import LocalFloristIcon from '@mui/icons-material/LocalFlorist';
import ToysIcon from '@mui/icons-material/Toys';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import FilterHdrIcon from '@mui/icons-material/FilterHdr';
import SearchIcon from '@mui/icons-material/Search';

import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

export default function GenreHelpList(state) {
    return (
        <div style={{ margin: '2%' }}>
            <Grid container alignItems="center">
                <Grid item xs={4}>
                    <WhatshotIcon
                        color={
                            state.filter.genre === 'Em Alta' ? 'secondary' : ''
                        }
                    />
                </Grid>
                <Grid item xs={8}>
                    <Typography display="inline">{'Em Alta'}</Typography>
                </Grid>
            </Grid>
            <Grid container alignItems="center">
                <Grid item xs={4}>
                    <InsertEmoticonIcon
                        color={
                            state.filter.genre === 'Comédia' ? 'secondary' : ''
                        }
                    />
                </Grid>
                <Grid item xs={8}>
                    <Typography display="inline">{'Comédia'}</Typography>
                </Grid>
            </Grid>
            <Grid container alignItems="center">
                <Grid item xs={4}>
                    <SportsKabaddiIcon
                        color={state.filter.genre === 'Ação' ? 'secondary' : ''}
                    />
                </Grid>
                <Grid item xs={8}>
                    <Typography display="inline">{'Ação'}</Typography>
                </Grid>
            </Grid>
            <Grid container alignItems="center">
                <Grid item xs={4}>
                    <SentimentVeryDissatisfiedIcon
                        color={
                            state.filter.genre === 'Drama' ? 'secondary' : ''
                        }
                    />
                </Grid>
                <Grid item xs={8}>
                    <Typography display="inline">{'Drama'}</Typography>
                </Grid>
            </Grid>
            <Grid container alignItems="center">
                <Grid item xs={4}>
                    <LocalFloristIcon
                        color={
                            state.filter.genre === 'Romance' ? 'secondary' : ''
                        }
                    />
                </Grid>
                <Grid item xs={8}>
                    <Typography display="inline">{'Romance'}</Typography>
                </Grid>
            </Grid>
            <Grid container alignItems="center">
                <Grid item xs={4}>
                    <ToysIcon
                        color={
                            state.filter.genre === 'Animação' ? 'secondary' : ''
                        }
                    />
                </Grid>
                <Grid item xs={8}>
                    <Typography display="inline">{'Animação'}</Typography>
                </Grid>
            </Grid>
            <Grid container alignItems="center">
                <Grid item xs={4}>
                    <MusicNoteIcon
                        color={
                            state.filter.genre === 'Musical' ? 'secondary' : ''
                        }
                    />
                </Grid>
                <Grid item xs={8}>
                    <Typography display="inline">{'Musical'}</Typography>
                </Grid>
            </Grid>
            <Grid container alignItems="center">
                <Grid item xs={4}>
                    <MenuBookIcon
                        color={
                            state.filter.genre === 'Biografia'
                                ? 'secondary'
                                : ''
                        }
                    />
                </Grid>
                <Grid item xs={8}>
                    <Typography display="inline">{'Biografia'}</Typography>
                </Grid>
            </Grid>
            <Grid container alignItems="center">
                <Grid item xs={4}>
                    <FilterHdrIcon
                        color={
                            state.filter.genre === 'Aventura' ? 'secondary' : ''
                        }
                    />
                </Grid>
                <Grid item xs={8}>
                    <Typography display="inline">{'Aventura'}</Typography>
                </Grid>
            </Grid>
            <Grid container alignItems="center">
                <Grid item xs={4}>
                    <SearchIcon
                        color={
                            state.filter.genre === 'Suspense' ? 'secondary' : ''
                        }
                    />
                </Grid>
                <Grid item xs={8}>
                    <Typography display="inline">{'Suspense'}</Typography>
                </Grid>
            </Grid>
        </div>
    );
}
