export default function cityNameRequest(cityId = '2') {
    API_KEY = 'AIzaSyDprnBktio47EetA2Qy_oCXiZEvhsj5EoA';
    return fetch(
        `https://cors-anywhere.herokuapp.com/https://api-content.ingresso.com/v0/events/city/${cityId}`
    )
        .then(function (response) {
            return response.json();
        })
        .then((response) => {
            return response;
        });
}
