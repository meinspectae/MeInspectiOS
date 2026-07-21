/**
 * Comprehensive countries and cities data for MeInspect location selection.
 * Focused on property inspection markets but covers all major countries.
 */

export interface CountryCity {
  country: string;
  cities: string[];
}

export const COUNTRIES_AND_CITIES: CountryCity[] = [
  // Middle East (primary market)
  {
    country: 'United Arab Emirates',
    cities: [
      'Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah',
      'Fujairah', 'Umm Al Quwain', 'Al Ain',
      'Dubai Marina', 'Downtown Dubai', 'Palm Jumeirah', 'JBR',
      'Business Bay', 'Deira', 'Bur Dubai', 'Jumeirah', 'Al Barsha',
      'Motor City', 'Sports City', 'Dubai Hills', 'Arabian Ranches',
      'Mirdif', 'Dubai Silicon Oasis', 'Dubai Investment Park', 'JLT', 'DIFC',
    ],
  },
  {
    country: 'Saudi Arabia',
    cities: [
      'Riyadh', 'Jeddah', 'Mecca', 'Medina', 'Dammam',
      'Khobar', 'Dhahran', 'Tabuk', 'Buraidah', 'Khamis Mushait',
    ],
  },
  {
    country: 'Qatar',
    cities: ['Doha', 'Al Wakrah', 'Al Khor', 'Lusail', 'Dukhan'],
  },
  {
    country: 'Bahrain',
    cities: ['Manama', 'Riffa', 'Muharraq', 'Hamad Town', 'Isa Town'],
  },
  {
    country: 'Kuwait',
    cities: ['Kuwait City', 'Hawalli', 'Salmiya', 'Al Ahmadi', 'Jahra'],
  },
  {
    country: 'Oman',
    cities: ['Muscat', 'Salalah', 'Sohar', 'Nizwa', 'Sur'],
  },
  {
    country: 'Jordan',
    cities: ['Amman', 'Zarqa', 'Irbid', 'Aqaba', 'Madaba'],
  },
  {
    country: 'Lebanon',
    cities: ['Beirut', 'Tripoli', 'Sidon', 'Tyre', 'Jounieh'],
  },

  // Europe
  {
    country: 'United Kingdom',
    cities: [
      'London', 'Manchester', 'Birmingham', 'Liverpool', 'Leeds',
      'Edinburgh', 'Glasgow', 'Bristol', 'Cambridge', 'Oxford',
    ],
  },
  {
    country: 'France',
    cities: ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Bordeaux', 'Strasbourg'],
  },
  {
    country: 'Germany',
    cities: ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne', 'Düsseldorf', 'Stuttgart'],
  },
  {
    country: 'Spain',
    cities: ['Madrid', 'Barcelona', 'Valencia', 'Seville', 'Málaga', 'Bilbao'],
  },
  {
    country: 'Italy',
    cities: ['Rome', 'Milan', 'Naples', 'Turin', 'Florence', 'Venice', 'Genoa'],
  },
  {
    country: 'Netherlands',
    cities: ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht', 'Eindhoven'],
  },
  {
    country: 'Portugal',
    cities: ['Lisbon', 'Porto', 'Braga', 'Faro', 'Coimbra'],
  },
  {
    country: 'Switzerland',
    cities: ['Zurich', 'Geneva', 'Basel', 'Bern', 'Lausanne'],
  },
  {
    country: 'Belgium',
    cities: ['Brussels', 'Antwerp', 'Ghent', 'Bruges', 'Liège'],
  },
  {
    country: 'Ireland',
    cities: ['Dublin', 'Cork', 'Galway', 'Limerick', 'Waterford'],
  },
  {
    country: 'Turkey',
    cities: ['Istanbul', 'Ankara', 'Izmir', 'Antalya', 'Bursa', 'Adana'],
  },

  // North America
  {
    country: 'United States',
    cities: [
      'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix',
      'San Francisco', 'Miami', 'Seattle', 'Boston', 'Washington DC',
      'Dallas', 'Atlanta', 'Denver', 'Las Vegas', 'San Diego',
    ],
  },
  {
    country: 'Canada',
    cities: ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa', 'Edmonton', 'Quebec City'],
  },

  // Asia
  {
    country: 'India',
    cities: [
      'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai',
      'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Lucknow',
    ],
  },
  {
    country: 'Singapore',
    cities: ['Singapore'],
  },
  {
    country: 'Malaysia',
    cities: ['Kuala Lumpur', 'Penang', 'Johor Bahru', 'Malacca', 'Ipoh'],
  },
  {
    country: 'Thailand',
    cities: ['Bangkok', 'Chiang Mai', 'Pattaya', 'Phuket', 'Hat Yai'],
  },
  {
    country: 'Japan',
    cities: ['Tokyo', 'Osaka', 'Yokohama', 'Nagoya', 'Kyoto', 'Sapporo'],
  },
  {
    country: 'South Korea',
    cities: ['Seoul', 'Busan', 'Incheon', 'Daegu', 'Daejeon'],
  },
  {
    country: 'Philippines',
    cities: ['Manila', 'Cebu', 'Davao', 'Quezon City', 'Makati'],
  },
  {
    country: 'Indonesia',
    cities: ['Jakarta', 'Surabaya', 'Bandung', 'Medan', 'Bali'],
  },
  {
    country: 'China',
    cities: ['Beijing', 'Shanghai', 'Hong Kong', 'Shenzhen', 'Guangzhou', 'Chengdu'],
  },

  // Africa
  {
    country: 'South Africa',
    cities: ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Port Elizabeth'],
  },
  {
    country: 'Egypt',
    cities: ['Cairo', 'Alexandria', 'Giza', 'Luxor', 'Aswan'],
  },
  {
    country: 'Nigeria',
    cities: ['Lagos', 'Abuja', 'Kano', 'Ibadan', 'Port Harcourt'],
  },
  {
    country: 'Kenya',
    cities: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret'],
  },

  // Oceania
  {
    country: 'Australia',
    cities: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Gold Coast', 'Canberra'],
  },
  {
    country: 'New Zealand',
    cities: ['Auckland', 'Wellington', 'Christchurch', 'Hamilton', 'Tauranga'],
  },
];

/**
 * Get all country names sorted alphabetically
 */
export function getCountryNames(): string[] {
  return COUNTRIES_AND_CITIES.map((c) => c.country).sort();
}

/**
 * Get city list for a given country, or empty array if not found
 */
export function getCitiesForCountry(country: string): string[] {
  const entry = COUNTRIES_AND_CITIES.find(
    (c) => c.country.toLowerCase() === country.toLowerCase()
  );
  return entry ? entry.cities : [];
}
