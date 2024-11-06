'use client';

import {
    Grid,
    IconButton,
    Paper,
    Switch,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import FilterHdrIcon from '@mui/icons-material/FilterHdr';
import HelpIcon from '@mui/icons-material/Help';
import InsertEmoticonIcon from '@mui/icons-material/InsertEmoticon';
import LocalFloristIcon from '@mui/icons-material/LocalFlorist';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import SearchIcon from '@mui/icons-material/Search';
import SentimentVeryDissatisfiedIcon from '@mui/icons-material/SentimentVeryDissatisfied';
import SportsKabaddiIcon from '@mui/icons-material/SportsKabaddi';
import ToysIcon from '@mui/icons-material/Toys';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import React from 'react';
import GenreHelpList from './GenreHelpList';
import { HomeState } from '../../pages';
import dynamic from 'next/dynamic';

type Props = {
    state: HomeState;
    setState: React.Dispatch<React.SetStateAction<HomeState>>;
};

const Filter = ({ state, setState }: Props) => {
    function handleFilterGenreButtonClick(genre: string) {
        let newFilter = { ...state.filter };
        if (state.filter.genre === genre) {
            newFilter.genre = '';
        } else {
            newFilter.genre = genre;
        }
        updateFilters(newFilter);
    }

    function handleFilterTitleTextFieldChange(movieTitle: string) {
        let newFilter = { ...state.filter };
        newFilter.title = movieTitle;
        updateFilters(newFilter);
    }

    function updateFilters(newFilter: HomeState['filter']) {
        let cardTotalNumber = state.availableMovies
            .filter((movie) => {
                if (newFilter.genre !== '') {
                    return movie.genres.includes(newFilter.genre);
                }
                return true;
            })
            .filter((movie) => {
                if (newFilter.title !== '') {
                    return movie.title
                        .toLowerCase()
                        .includes(newFilter.title.toLowerCase());
                }
                return true;
            }).length;
        setState((prevState: HomeState) => ({
            ...prevState,
            cardTotal: cardTotalNumber,
            cardFirst: 0,
            filter: newFilter,
        }));
    }

    function handleFilterSwitchChange() {
        setState((prevState: HomeState) => ({
            ...prevState,
            showFilter: !state.showFilter,
        }));
    }

    return (
        <Grid item xs={12} style={{ margin: '1%' }}>
            <Paper style={{ padding: '1%' }}>
                <Grid container>
                    <Grid item xs={12}>
                        <Typography
                            display="inline"
                            style={{ margin: '1%' }}
                            variant="h6"
                        >
                            Quer dar uma filtrada?
                        </Typography>
                        <Switch
                            checked={state.showFilter}
                            onChange={handleFilterSwitchChange}
                        />
                    </Grid>
                    {state.showFilter && (
                        <Grid container>
                            <Grid item xs={6}>
                                <Grid container alignItems="center">
                                    <Grid item>
                                        <Typography
                                            display="inline"
                                            style={{
                                                paddingRight: '20px',
                                                margin: '12%',
                                            }}
                                            variant="h6"
                                        >
                                            Gêneros:
                                        </Typography>
                                    </Grid>
                                    <Grid item>
                                        <Tooltip
                                            open={state.genreHelpListOpen}
                                            onClose={() =>
                                                setState(
                                                    (prevState: HomeState) => ({
                                                        ...prevState,
                                                        genreHelpListOpen:
                                                            false,
                                                    })
                                                )
                                            }
                                            onClick={() =>
                                                setState(
                                                    (prevState: HomeState) => ({
                                                        ...prevState,
                                                        genreHelpListOpen: true,
                                                    })
                                                )
                                            }
                                            placement="right"
                                            title={
                                                <React.Fragment>
                                                    <div
                                                        style={{
                                                            width: '150px',
                                                        }}
                                                    >
                                                        {GenreHelpList(state)}
                                                    </div>
                                                </React.Fragment>
                                            }
                                        >
                                            <HelpIcon />
                                        </Tooltip>
                                    </Grid>
                                </Grid>
                                <IconButton>
                                    <Tooltip title="Em Alta">
                                        <WhatshotIcon
                                            color={
                                                state.filter.genre === 'Em Alta'
                                                    ? 'secondary'
                                                    : undefined
                                            }
                                            onClick={() =>
                                                handleFilterGenreButtonClick(
                                                    'Em Alta'
                                                )
                                            }
                                        />
                                    </Tooltip>
                                </IconButton>
                                <IconButton>
                                    <Tooltip title="Comédia">
                                        <InsertEmoticonIcon
                                            color={
                                                state.filter.genre === 'Comédia'
                                                    ? 'secondary'
                                                    : undefined
                                            }
                                            onClick={() =>
                                                handleFilterGenreButtonClick(
                                                    'Comédia'
                                                )
                                            }
                                        />
                                    </Tooltip>
                                </IconButton>
                                <IconButton>
                                    <Tooltip title="Ação">
                                        <SportsKabaddiIcon
                                            color={
                                                state.filter.genre === 'Ação'
                                                    ? 'secondary'
                                                    : undefined
                                            }
                                            onClick={() =>
                                                handleFilterGenreButtonClick(
                                                    'Ação'
                                                )
                                            }
                                        />
                                    </Tooltip>
                                </IconButton>
                                <IconButton>
                                    <Tooltip title="Drama">
                                        <SentimentVeryDissatisfiedIcon
                                            color={
                                                state.filter.genre === 'Drama'
                                                    ? 'secondary'
                                                    : undefined
                                            }
                                            onClick={() =>
                                                handleFilterGenreButtonClick(
                                                    'Drama'
                                                )
                                            }
                                        />
                                    </Tooltip>
                                </IconButton>
                                <IconButton>
                                    <Tooltip title="Romance">
                                        <LocalFloristIcon
                                            color={
                                                state.filter.genre === 'Romance'
                                                    ? 'secondary'
                                                    : undefined
                                            }
                                            onClick={() =>
                                                handleFilterGenreButtonClick(
                                                    'Romance'
                                                )
                                            }
                                        />
                                    </Tooltip>
                                </IconButton>
                                <IconButton>
                                    <Tooltip title="Animação">
                                        <ToysIcon
                                            color={
                                                state.filter.genre ===
                                                'Animação'
                                                    ? 'secondary'
                                                    : undefined
                                            }
                                            onClick={() =>
                                                handleFilterGenreButtonClick(
                                                    'Animação'
                                                )
                                            }
                                        />
                                    </Tooltip>
                                </IconButton>
                                <IconButton>
                                    <Tooltip title="Musical">
                                        <MusicNoteIcon
                                            color={
                                                state.filter.genre === 'Musical'
                                                    ? 'secondary'
                                                    : undefined
                                            }
                                            onClick={() =>
                                                handleFilterGenreButtonClick(
                                                    'Musical'
                                                )
                                            }
                                        />
                                    </Tooltip>
                                </IconButton>
                                <IconButton>
                                    <Tooltip title="Biografia">
                                        <MenuBookIcon
                                            color={
                                                state.filter.genre ===
                                                'Biografia'
                                                    ? 'secondary'
                                                    : undefined
                                            }
                                            onClick={() =>
                                                handleFilterGenreButtonClick(
                                                    'Biografia'
                                                )
                                            }
                                        />
                                    </Tooltip>
                                </IconButton>
                                <IconButton>
                                    <Tooltip title="Aventura">
                                        <FilterHdrIcon
                                            color={
                                                state.filter.genre ===
                                                'Aventura'
                                                    ? 'secondary'
                                                    : undefined
                                            }
                                            onClick={() =>
                                                handleFilterGenreButtonClick(
                                                    'Aventura'
                                                )
                                            }
                                        />
                                    </Tooltip>
                                </IconButton>
                                <IconButton>
                                    <Tooltip title="Suspense">
                                        <SearchIcon
                                            color={
                                                state.filter.genre ===
                                                'Suspense'
                                                    ? 'secondary'
                                                    : undefined
                                            }
                                            onClick={() =>
                                                handleFilterGenreButtonClick(
                                                    'Suspense'
                                                )
                                            }
                                        />
                                    </Tooltip>
                                </IconButton>
                            </Grid>
                            <Grid item xs={6}>
                                <Typography
                                    style={{ margin: '1%' }}
                                    variant="h6"
                                >
                                    Nome do Filme:
                                </Typography>
                                <TextField
                                    margin="normal"
                                    style={{ width: '60%', margin: '1%' }}
                                    onChange={(e) =>
                                        handleFilterTitleTextFieldChange(
                                            e.target.value
                                        )
                                    }
                                ></TextField>
                            </Grid>
                        </Grid>
                    )}
                </Grid>
            </Paper>
        </Grid>
    );
};

export default dynamic(() => Promise.resolve(Filter), { ssr: false });
