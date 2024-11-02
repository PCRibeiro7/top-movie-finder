export default function availableMoviesRequest(cityId = '2') {
    return fetch(
        `https://api-content.ingresso.com/v0/events/city/${cityId}`
    )
        .then(function (response) {
            return response.json();
        })
        .then((response) => {
            return response;
        });
}
