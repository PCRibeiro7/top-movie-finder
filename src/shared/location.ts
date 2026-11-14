export type CitySelection = { city: string; state: string };

export type Coordinates = { latitude: number; longitude: number };

export type CatalogLocation = CitySelection & {
    cityId: string;
    coordinates: Coordinates | null;
};
