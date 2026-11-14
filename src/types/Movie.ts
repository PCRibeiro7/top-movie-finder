export type Movie = {
    b2BEventId: null;
    cities: any[];
    id: string;
    title: string;
    originalTitle: string;
    type: string;
    movieIdUrl: string;
    ancineId: string;
    countryOrigin: string;
    priority: number;
    contentRating: string;
    duration: string;
    rating: number;
    synopsis: string;
    cast: string;
    director: string;
    distributor: string;
    inPreSale: boolean;
    isReexhibition: boolean;
    urlKey: string;
    isPlaying: boolean;
    countIsPlaying: number;
    premiereDate: PremiereDate;
    creationDate: Date;
    city: string;
    siteURL: string;
    nationalSiteURL: string;
    images: Image[];
    genres: string[];
    ratingDescriptors: string[];
    accessibilityHubs: any[];
    completeTags: any[];
    tags: any[];
    trailers: Trailer[];
    partnershipType: string;
};

export type Image = {
    url: string;
    type: string;
};

export type PremiereDate = {
    localDate: Date;
    isToday: boolean;
    dayOfWeek: string;
    dayAndMonth: string;
    hour: string;
    year: string;
};

export type Trailer = {
    type: string;
    url: string;
    embeddedUrl: string;
};
