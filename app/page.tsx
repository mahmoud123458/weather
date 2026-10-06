"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Sun,
  Moon,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  CloudDrizzle,
  Thermometer,
  Droplets,
  Wind,
} from "lucide-react";
import { getWeatherData } from "./actions";
import { useState } from "react";
import { WeatherData } from "@/types/weather";
import { Card, CardContent } from "@/components/ui/card";

// قمر مملي من جوا
function MoonFilled({ className }: { className?: string }) {
  return <Moon className={className} fill="currentColor" />;
}

// شمس صفراء + سحابة بيضا
function CloudSunColored({ className }: { className?: string }) {
  return (
    <div className={`relative ${className ?? ""}`}>
      <Sun className="absolute left-0 top-0 h-3/5 w-3/5 text-yellow-400" />
      <Cloud
        className="absolute bottom-0 right-0 h-4/5 w-4/5 text-white"
        fill="white"
      />
    </div>
  );
}

// قمر مملي + سحابة بيضا
function CloudMoonColored({ className }: { className?: string }) {
  return (
    <div className={`relative ${className ?? ""}`}>
      <Moon
        className="absolute left-0 top-0 h-3/5 w-3/5 text-yellow-200"
        fill="currentColor"
      />
      <Cloud
        className="absolute bottom-0 right-0 h-4/5 w-4/5 text-white"
        fill="white"
      />
    </div>
  );
}

const getWeatherInfo = (code: number, isDay: boolean) => {
  switch (code) {
    case 1:
      return isDay
        ? { Icon: Sun, description: "Clear sky", color: "text-yellow-400" }
        : { Icon: MoonFilled, description: "Clear sky", color: "text-yellow-200" };
    case 2:
    case 3:
      return {
        Icon: isDay ? CloudSunColored : CloudMoonColored,
        description: code === 2 ? "Partly cloudy" : "Mostly cloudy",
        color: "",
      };
    case 4:
      return { Icon: Cloud, description: "Overcast", color: "text-white" };
    case 5:
      return { Icon: CloudFog, description: "Fog", color: "text-gray-300" };
    case 6:
    case 14:
      return { Icon: CloudRain, description: "Rain", color: "text-blue-600" };
    case 7:
    case 12:
    case 16:
      return {
        Icon: CloudDrizzle,
        description: "Light rain",
        color: "text-sky-500",
      };
    case 8:
      return {
        Icon: CloudLightning,
        description: "Thunderstorms",
        color: "text-yellow-400",
      };
    case 9:
    case 10:
    case 11:
    case 13:
    case 15:
    case 17:
      return { Icon: CloudSnow, description: "Snow", color: "text-cyan-200" };
    default:
      return { Icon: Cloud, description: "Unknown", color: "text-white" };
  }
};

// بيرجع index الساعة الحالية في توقيت المدينة
const getCurrentIndex = (w: WeatherData) => {
  const offset = w.metadata.utc_timeoffset ?? 0;
  const local =
    new Date(Date.now() + offset * 3600 * 1000)
      .toISOString()
      .slice(0, 13)
      .replace("T", " ") + ":00";
  const i = w.data_1h.time.findIndex((t) => t >= local);
  return i === -1 ? 0 : i;
};

function SubmitButton() {
  return (
    <Button type="submit">
      <Search className="mr-2 h-4 w-4" />
    </Button>
  );
}

export default function Home() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [city, setCity] = useState("");
  const [notFound, setNotFound] = useState(false);

  const handleSearch = async (formData: FormData) => {
    const cityName = formData.get("city") as string;
    const { data } = await getWeatherData(cityName);
    setWeather(data ?? null);
    setNotFound(!data);
    if (data) setCity(cityName);
  };

  const hour = weather ? getCurrentIndex(weather) : 0;
  const code = weather?.data_day.pictocode?.[0] ?? 0;
  const isDay = weather?.data_1h.isdaylight?.[hour] !== 0;
  const { Icon, description, color } = getWeatherInfo(code, isDay);

  return (
    <div className="min-h-screen bg-linear-to-b from-sky-400 to-blue-500 p-4 flex items-center justify-center">
      <div className="w-full max-w-md space-y-4">
        <form action={handleSearch} className="flex items-center gap-2">
          <Input
            name="city"
            type="text"
            placeholder="Enter city name..."
            className="bg-white/90"
            required
          />
          <SubmitButton />
        </form>

        {notFound && (
          <div className="rounded-lg bg-white/80 px-4 py-3 text-center text-sm text-red-600">
            City not found
          </div>
        )}

        {weather && (
          <div>
            <Card className="bg-white/50 backdrop-blur">
              <CardContent className="p-6">
                <div className="text-center mb-4">
                  <h2 className="text-2xl font-bold">
                    {weather.metadata.name || city}
                  </h2>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <Icon className={`h-15 w-15 drop-shadow-md ${color}`} />
                    <div className="text-5xl font-bold">
                      {Math.round(weather.data_1h.temperature[hour])}°C
                    </div>
                  </div>
                  <div className="text-gray-500 mt-1 capitalize">
                    {description}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className="text-center">
                    <Thermometer className="w-6 h-6 mx-auto text-orange-500" />
                    <div className="mt-2 text-sm text-gray-500">Feels like</div>
                    <div className="font-semibold">
                      {Math.round(weather.data_1h.felttemperature?.[hour] ?? 0)}
                      °C
                    </div>
                  </div>

                  <div className="text-center">
                    <Droplets className="w-6 h-6 mx-auto text-blue-500" />
                    <div className="mt-2 text-sm text-gray-500">Humidity</div>
                    <div className="font-semibold">
                      {Math.round(weather.data_1h.relativehumidity?.[hour] ?? 0)}
                      %
                    </div>
                  </div>

                  <div className="text-center">
                    <Wind className="w-6 h-6 mx-auto text-teal-500" />
                    <div className="mt-2 text-sm text-gray-500">Wind Speed</div>
                    <div className="font-semibold">
                      {Math.round(weather.data_1h.windspeed?.[hour] ?? 0)}
                      km/h
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}