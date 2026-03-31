export const MOROCCO_CITIES = [
    'Agadir',
    'Al Hoceima',
    'Azemmour',
    'Beni Mellal',
    'Ben Guerir',
    'Berkane',
    'Berrechid',
    'Casablanca',
    'Chefchaouen',
    'Dakhla',
    'El Jadida',
    'Errachidia',
    'Essaouira',
    'Fes',
    'Fnideq',
    'Guelmim',
    'Ifrane',
    'Kenitra',
    'Khemisset',
    'Khenifra',
    'Khouribga',
    'Laayoune',
    'Larache',
    'Marrakech',
    'Meknes',
    'Mohammedia',
    'Nador',
    'Ouarzazate',
    'Oujda',
    'Rabat',
    'Safi',
    'Sale',
    'Settat',
    'Sidi Bennour',
    'Sidi Kacem',
    'Sidi Slimane',
    'Tanger',
    'Taroudant',
    'Taourirt',
    'Taza',
    'Temara',
    'Tetouan',
    'Tiflet',
]

export const filterCities = (term) => {
    const normalized = term.trim().toLowerCase()
    if (!normalized) return MOROCCO_CITIES.slice(0, 8)
    return MOROCCO_CITIES.filter((city) => city.toLowerCase().includes(normalized)).slice(0, 8)
}

export const isKnownCity = (value) =>
    MOROCCO_CITIES.some((city) => city.toLowerCase() === value.trim().toLowerCase())
