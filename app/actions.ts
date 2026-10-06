"use server";

import { WeatherData } from "@/types/weather";

export async function getWeatherData(
  city: string
): Promise<{ data?: WeatherData }> {
  try {
    // 1) تحويل اسم المدينة لإحداثيات
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        city.trim()
      )}&count=1&language=en`
    );
    const geo = await geoRes.json();
    const place = geo.results?.[0];

    if (!place) {
      return {};
    }

    const { latitude, longitude, elevation, name, country } = place;

    // 2) جلب الطقس من Meteoblue
    const res = await fetch(
      `https://my.meteoblue.com/packages/basic-1h_basic-day?apikey=${
        process.env.METEOBLUE_API_KEY
      }&lat=${latitude}&lon=${longitude}&asl=${Math.round(
        elevation ?? 0
      )}&format=json`,
      { cache: "no-store" }
    );
    const data: WeatherData = await res.json();

    if (!data.data_1h || !data.data_day) {
      return {};
    }

    // Meteoblue بيرجع metadata.name فاضي، فبنحط الاسم والبلد من الـ geocoding
    data.metadata.name = country ? `${name}, ${country}` : name;

    return { data };
  } catch (error) {
    console.log(error);
    return {};
  }
}