export default function sessionRequest(movieId, cityId = '2') {
    return fetch(
        `https://cors-anywhere.herokuapp.com/https://api-content.ingresso.com/v0/sessions/city/${cityId}/event/${movieId}`
    )
        .then(function (response) {
            return response.json();
        })
        .then((response) => {
            return response;
        })
        .catch((err) => {
            return err;
        });
}
