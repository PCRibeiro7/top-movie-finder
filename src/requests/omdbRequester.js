import omdbTryHardRequest from '../requests/omdbTryHardRequester';

export default async function omdbRequest(movieTitle) {
    let api_key = '8620470f';
    movieTitle = movieTitle.replace('-', ' ').replace(':', ' ');

    return fetch(`https://www.omdbapi.com/?t=${movieTitle}&apikey=${api_key}`)
        .then(function (response) {
            let responseJSON = response.json();
            let errorFlag = '';
            return responseJSON
                .then((res) => {
                    errorFlag = res.Response;
                })
                .then((res) => {
                    if (errorFlag === 'False') {
                        return omdbTryHardRequest(movieTitle).then(
                            (res) =>
                                omdbRequest(res.Title, 1).then((res) => res)
                            // res
                        );
                    }
                    return responseJSON;
                });
        })
        .catch((err) => {
            return err;
        });
}
