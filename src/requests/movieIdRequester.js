export default function movieIdRequest(movieTitle, cityId = '2') {
    return fetch(
        `https://cors-anywhere.herokuapp.com/https://api-content.ingresso.com/v0/events/city/${cityId}`
    )
        .then(function (response) {
            return response.json();
        })
        .then((response) => {
            let movieArray = response.filter((movie) => {
                if (movie.title.trim() === movieTitle.trim()) {
                    return true;
                }
                return false;
            });
            return movieArray.length !== 0 ? movieArray[0].id : null;
        });
}
