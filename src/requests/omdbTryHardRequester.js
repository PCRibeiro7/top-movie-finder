function getLongerMovieTitle(movieTitleArray, failedTries) {
    let longerMovieTitle = '';
    movieTitleArray.forEach((movieTitleWord, index) => {
        if (index <= failedTries) {
            longerMovieTitle = longerMovieTitle + ' ' + movieTitleWord;
            longerMovieTitle = longerMovieTitle.trim();
        }
    });
    return longerMovieTitle;
}
