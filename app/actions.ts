"use server";

export interface WeatherMetadata {
  modelrun_updatetime_utc: string;
  name: string;
  height: number;
  timezone_abbrevation: string;
  latitude: number;
  longitude: number;
  utc_timeoffset?: number;
  modelrun_utc?: string;
}

export interface WeatherUnits {
  time?: string;
  predictability: string;
  precipitation: string;
  windspeed: string;
  precipitation_probability: string;
  relativehumidity: string;
  temperature?: string;
  pressure?: string;
  winddirection?: string;
  [key: string]: string | undefined;
}

export interface HourlyData {
  time: string[];
  temperature: number[];
  windspeed: number[];
  snowfraction: number[];
  precipitation_probability: number[];
  precipitation?: number[];
  relativehumidity?: number[];
  felttemperature?: number[];
  winddirection?: number[];
  pictocode?: number[];
  isdaylight?: number[];
  uvindex?: number[];
  sealevelpressure?: number[];
  pressure?: number[]; // تم الإضافة هنا لحل خطأ الـ TypeScript
}

export interface DailyData {
  time: string[];
  temperature_instant: number[];
  temperature_max: number[];
  precipitation: number[];
  predictability: number[];
  temperature_min?: number[];
  temperature_mean?: number[];
  felttemperature_max?: number[];
  felttemperature_min?: number[];
  precipitation_probability?: number[];
  windspeed_mean?: number[];
  windspeed_max?: number[];
  relativehumidity_mean?: number[];
  pictocode?: number[];
  uvindex?: number[];
  sunrise?: string[]; // تم الإضافة هنا لحل خطأ الـ TypeScript
  sunset?: string[];  // تم الإضافة هنا لحل خطأ الـ TypeScript
}

export interface WeatherData {
  metadata: WeatherMetadata;
  units: WeatherUnits;
  data_1h: HourlyData;
  data_day: DailyData;
}

export interface CitySuggestion {
  id: number;
  name: string;
  country?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  elevation?: number;
}

const arabicCityMapping: Record<string, string> = {
  "طنطا": "Tanta",
  "القاهرة": "Cairo",
  "الإسكندرية": "Alexandria",
  "الجيزة": "Giza",
  "المنصورة": "Mansoura",
  "أسوان": "Aswan",
  "الأقصر": "Luxor",
  "الإسماعيلية": "Ismailia",
  "السويس": "Suez",
  "بورسعيد": "Port Said",
  "الإمارات": "United Arab Emirates",
  "دبي": "Dubai",
  "الرياض": "Riyadh",
  "جدة": "Jeddah",
  "مكة": "Mecca",
  "المدينة": "Medina",
  "المنامة": "Manama",
  "الدوحة": "Doha",
  "عمّان": "Amman",
  "بيروت": "Beirut",
};

export async function searchCities(query: string): Promise<CitySuggestion[]> {
  try {
    const q = query.trim();
    if (q.length < 2) return [];

    const apiQuery = arabicCityMapping[q] || q;

    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        apiQuery
      )}&count=10&language=ar&format=json`
    );
    const geo = await res.json();

    let results = geo.results ?? [];
    if (results.length === 0 && apiQuery !== q) {
      const resFallback = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          q
        )}&count=10&language=en&format=json`
      );
      const geoFallback = await resFallback.json();
      results = geoFallback.results ?? [];
    }

    return results.map(
      (p: {
        id: number;
        name: string;
        country?: string;
        admin1?: string;
        latitude: number;
        longitude: number;
        elevation?: number;
      }) => ({
        id: p.id,
        name: p.name,
        country: p.country,
        admin1: p.admin1,
        latitude: p.latitude,
        longitude: p.longitude,
        elevation: p.elevation,
      })
    );
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function getCityByCoordinates(lat: number, lon: number): Promise<CitySuggestion | null> {
  try {
    if (lat === 0 && lon === 0) return null;

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=ar`,
      {
        headers: {
          "User-Agent": "WeatherApp-FrontEndProject",
        },
      }
    );
    const data = await res.json();

    if (data && data.address) {
      const cityName =
        data.address.city ||
        data.address.town ||
        data.address.village ||
        data.address.state ||
        "موقعي";

      return {
        id: Date.now(),
        name: cityName,
        country: data.address.country || "مصر",
        admin1: data.address.state,
        latitude: lat,
        longitude: lon,
      };
    }

    return null;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function getWeatherData(
  place: CitySuggestion
): Promise<{ data?: WeatherData }> {
  try {
    if (!process.env.METEOBLUE_API_KEY) {
      console.error("METEOBLUE_API_KEY is missing");
      return {};
    }

    const res = await fetch(
      `https://my.meteoblue.com/packages/basic-1h_basic-day?apikey=${
        process.env.METEOBLUE_API_KEY
      }&lat=${place.latitude}&lon=${place.longitude}&asl=${Math.round(
        place.elevation ?? 0
      )}&format=json`,
      { cache: "no-store" }
    );
    const data: WeatherData = await res.json();

    if (!data.data_1h || !data.data_day) {
      console.error("Meteoblue error:", res.status, JSON.stringify(data));
      return {};
    }

    data.metadata.name = place.country
      ? `${place.name}, ${place.country}`
      : place.name;

    return { data };
  } catch (error) {
    console.error(error);
    return {};
  }
}