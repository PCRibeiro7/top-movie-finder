export default async function cityIdRequest(
    stateName = 'SP',
    cityName = 'São Paulo'
) {
    const url = `https://api-content.ingresso.com/v0/states/${stateName}`;
    const response = await fetch(url);
    const data = await response.json();

    let cityArray = data.cities.filter((city: { name: string; }) => {
        if (city.name === cityName) {
            return true;
        }
        return false;
    });
    return cityArray[0].id;
}
