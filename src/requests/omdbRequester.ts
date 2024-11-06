export default async function omdbRequest(movieTitle: string) {
    let api_key = process.env.OMDB_API_KEY;
    movieTitle = movieTitle.replaceAll('-', ' ').replaceAll(':', ' ');

    return fetch(`https://www.omdbapi.com/?t=${movieTitle}&apikey=${api_key}`)
        .then(function (response) {
            let responseJSON = response.json();
            return responseJSON;
        })
        .catch((err) => {
            return err;
        });
}
