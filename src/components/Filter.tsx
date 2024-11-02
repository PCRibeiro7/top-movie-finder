import {
    Grid,
    IconButton,
    Paper,
    Switch,
    TextField,
    Tooltip,
    Typography,
} from '@material-ui/core';
import FilterHdrIcon from '@material-ui/icons/FilterHdr';
import HelpIcon from '@material-ui/icons/Help';
import InsertEmoticonIcon from '@material-ui/icons/InsertEmoticon';
import LocalFloristIcon from '@material-ui/icons/LocalFlorist';
import MenuBookIcon from '@material-ui/icons/MenuBook';
import MusicNoteIcon from '@material-ui/icons/MusicNote';
import SearchIcon from '@material-ui/icons/Search';
import SentimentVeryDissatisfiedIcon from '@material-ui/icons/SentimentVeryDissatisfied';
import SportsKabaddiIcon from '@material-ui/icons/SportsKabaddi';
import ToysIcon from '@material-ui/icons/Toys';
import WhatshotIcon from '@material-ui/icons/Whatshot';
import React from 'react';
import GenreHelpList from './GenreHelpList';
import { HomeState } from '../../pages';

type Props = {
    state: HomeState;
    setState: any;
    handleFilterSwitchChange: any;
};

const Filter = ({ state, setState, handleFilterSwitchChange }: Props) => {
    function handleFilterGenreButtonClick(genre) {
        let newFilter = { ...state.filter };
        if (state.filter.genre === genre) {
            newFilter.genre = '';
        } else {
            newFilter.genre = genre;
        }
        updateTotalCardNumber({
            newFilter: newFilter,
            cardFirst: 0,
        });
    }

    function handleFilterTitleTextFieldChange(movieTitle) {
        let newFilter = { ...state.filter };
        newFilter.title = movieTitle;
        updateTotalCardNumber({
            newFilter: newFilter,
            cardFirst: 0,
        });
    }

    function updateTotalCardNumber({
        newFilter,
        cardFirst,
    }: {
        newFilter?: HomeState['filter'];
        cardFirst?: HomeState['cardFirst'];
    }) {
        let cardTotalNumber = state.availableMovies
            .filter((movie) => {
                if (state.filter.genre !== '') {
                    return movie.genres.includes(state.filter.genre);
                }
                return true;
            })
            .filter((movie) => {
                if (state.filter.title !== '') {
                    return movie.title
                        .toLowerCase()
                        .includes(state.filter.title.toLowerCase());
                }
                return true;
            }).length;
        setState((prevState) => ({
            ...prevState,
            cardTotal: cardTotalNumber,
            filter: newFilter,
            cardFirst,
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
                            inputProps={{ 'aria-label': 'secondary checkbox' }}
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
                                                setState({
                                                    genreHelpListOpen: false,
                                                })
                                            }
                                            onClick={() =>
                                                setState({
                                                    genreHelpListOpen: true,
                                                })
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
                                                    : ''
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
                                                    : ''
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
                                                    : ''
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
                                                    : ''
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
                                                    : ''
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
                                                    : ''
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
                                                    : ''
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
                                                    : ''
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
                                                    : ''
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
                                                    : ''
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

export default Filter;
