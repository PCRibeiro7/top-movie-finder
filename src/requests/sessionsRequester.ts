export default function sessionRequest(movieId, cityId = '1') {
    return fetch(
        `https://api-content.ingresso.com/v0/sessions/city/${cityId}/event/${movieId}/partnership/1`
    )
        .then(function (response) {
            return response.json();
        })
        .catch((err) => {
            return err;
        });
}
