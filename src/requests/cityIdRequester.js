export default function cityIdRequest(
    stateName = 'rj',
    cityName = 'Rio de Janeiro'
) {
    return fetch(
        `https://cors-anywhere.herokuapp.com/https://api-content.ingresso.com/v0/states/${stateName}`
    )
        .then(function (response) {
            return response.json();
        })
        .then((response) => {
            let cityArray = response.cities.filter((city) => {
                if (city.name === cityName) {
                    return true;
                }
                return false;
            });
            return cityArray[0].id;
        });
}
