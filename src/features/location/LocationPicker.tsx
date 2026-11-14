import styles from './LocationPicker.module.css';
import { FormEvent, useEffect, useState } from 'react';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import MyLocationRounded from '@mui/icons-material/MyLocationRounded';
import PlaceOutlined from '@mui/icons-material/PlaceOutlined';

type Props = {
    onCitySubmit: (city: string, region: string) => void;
    onLocate: () => void;
    loading: boolean;
    location: string;
    selectedLocation: { city: string; state: string } | null;
};

const regions = [
    'AC',
    'AL',
    'AP',
    'AM',
    'BA',
    'CE',
    'DF',
    'ES',
    'GO',
    'MA',
    'MT',
    'MS',
    'MG',
    'PA',
    'PB',
    'PR',
    'PE',
    'PI',
    'RJ',
    'RN',
    'RS',
    'RO',
    'RR',
    'SC',
    'SP',
    'SE',
    'TO',
];

export default function LocationPicker({
    onCitySubmit,
    onLocate,
    loading,
    location,
    selectedLocation,
}: Props) {
    const [city, setCity] = useState('');
    const [region, setRegion] = useState('');

    useEffect(() => {
        if (selectedLocation) {
            setCity(selectedLocation.city);
            setRegion(selectedLocation.state);
        }
    }, [selectedLocation]);

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (city.trim() && region) onCitySubmit(city.trim(), region);
    }

    return (
        <section
            className={styles['location-ticket']}
            aria-labelledby="location-title"
        >
            <div className={styles['ticket-topline']}>
                <span>PASSAPORTE PARA O CINEMA</span>
                <PlaceOutlined />
            </div>
            <h2 id="location-title">
                O cinema está
                <br />
                mais perto do que você pensa.
            </h2>
            <p>
                {location
                    ? `Explorando ${location}. Vamos mudar de ares?`
                    : 'Conte onde você está. A gente encontra os filmes.'}
            </p>
            <form onSubmit={submit} className={styles['location-form']}>
                <div className={styles['location-fields']}>
                    <label className={styles['city-field']} htmlFor="city">
                        Sua cidade
                        <input
                            id="city"
                            name="city"
                            placeholder="Ex.: São Paulo"
                            autoComplete="address-level2"
                            required
                            value={city}
                            onChange={(event) => setCity(event.target.value)}
                        />
                    </label>
                    <label className={styles['region-field']} htmlFor="region">
                        Estado
                        <select
                            id="region"
                            name="region"
                            autoComplete="address-level1"
                            required
                            value={region}
                            onChange={(event) => setRegion(event.target.value)}
                        >
                            <option value="" disabled>
                                UF
                            </option>
                            {regions.map((value) => (
                                <option key={value} value={value}>
                                    {value}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>
                <button
                    className={['button', styles['button-dark']].join(' ')}
                    type="submit"
                    disabled={loading}
                >
                    {loading ? 'Buscando filmes...' : 'Encontrar filmes'}{' '}
                    <ArrowForwardRounded />
                </button>
            </form>
            <div className={styles['ticket-perforation']}>
                <span>ou</span>
            </div>
            <button
                className={styles['geolocation-button']}
                onClick={onLocate}
                disabled={loading}
            >
                <MyLocationRounded /> Usar minha localização
            </button>
        </section>
    );
}
