export default class getMyLocation {
    constructor() {
        this.location = window.navigator && window.navigator.geolocation;
        this.latitude = '';
        this.longitude = '';
        this.getLocation();
    }
    assignLocation(position) {
        this.latitude = position.coords.latitude;
        this.longitude = position.coords.longitude;
    }
    async getLocation() {
        if (this.location) {
            await this.location.getCurrentPosition(
                (position) => {
                    this.assignLocation(position);
                },
                (error) => {
                    return {
                        latitude: 'err-latitude',
                        longitude: 'err-longitude',
                    };
                }
            );
        }
    }
}
