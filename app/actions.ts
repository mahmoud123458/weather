"use server";

import { CitySuggestion, WeatherData } from "@/types/weather";

// اقتراحات المدن أثناء الكتابة
export async function searchCities(query: string): Promise<CitySuggestion[]> {
  try {
    const q = query.trim();
    if (q.length < 2) return [];

    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        q
      )}&count=100&language=en&format=json`
    );
    const geo = await res.json();

    return (geo.results ?? []).map(
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

// جلب الطقس للمدينة المختارة
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