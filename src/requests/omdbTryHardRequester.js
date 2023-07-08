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

export default async function omdbTryHardRequest(movieTitle) {
    let api_key = '8620470f';
    let page = 1;
    movieTitle = movieTitle.replace('-', ' ').replace(':', ' ');
    let movieTitleArray = movieTitle.split(' ');
    movieTitleArray = movieTitleArray.filter((word) => word.length > 3);
    let failedTries = 0;
    let finalResponse = '';

    await fetch(
        `https://www.omdbapi.com/?s=${movieTitleArray[0]}&page=${page}&apikey=${api_key}`
    )
        .then(function (response) {
            return response.json();
        })
        .then((res) => {
            if (res.totalResults > 10) {
                failedTries += 1;
            }
        })
        .catch((err) => {
            return err;
        });

    while (failedTries < 5 && failedTries > 0 && finalResponse === '') {
        let longerMovieTitle = getLongerMovieTitle(
            movieTitleArray,
            failedTries
        );
        await fetch(
            `https://www.omdbapi.com/?s=${longerMovieTitle}&page=${page}&apikey=${api_key}`
        )
            .then(function (response) {
                return response.json();
            })
            // eslint-disable-next-line
            .then((res) => {
                if (res.totalResults > 10 || res.Response === 'False') {
                    failedTries += 1;
                } else {
                    failedTries += 1;
                    finalResponse = res.Search[0];
                }
            })
            .catch((err) => {
                return err;
            });
    }
    return finalResponse;
}
