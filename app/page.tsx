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
  Loader2,
  MapPin,
  Plus,
  Star,
  X,
} from "lucide-react";
import { getWeatherData, searchCities } from "./actions";
import { useEffect, useMemo, useRef, useState } from "react";
import { CitySuggestion, WeatherData } from "@/types/weather";
import { Card, CardContent } from "@/components/ui/card";

const STORAGE_KEY = "weather:last";
const FAVORITES_KEY = "weather:favorites";
const CACHE_TTL = 30 * 60 * 1000; // 30 دقيقة

const saveLast = (place: CitySuggestion, data: WeatherData) => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ place, data, savedAt: Date.now() })
    );
  } catch {}
};

function MoonFilled({ className }: { className?: string }) {
  return <Moon className={className} fill="currentColor" />;
}

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

function Stars() {
  const stars = useMemo(
    () =>
      Array.from({ length: 90 }, (_, i) => ({
        id: i,
        top: Math.random() * 100,
        left: Math.random() * 100,
        size: Math.random() * 2 + 1,
        delay: Math.random() * 4,
        duration: Math.random() * 3 + 2,
      })),
    []
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 1; }
        }
      `}</style>
      {stars.map((s) => (
        <div
          key={s.id}
          className="absolute rounded-full bg-white"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: s.size,
            height: s.size,
            animation: `twinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}
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

const getDayIndex = (w: WeatherData, dayIndex: number) => {
  const date = w.data_day.time[dayIndex];
  if (!date) return 0;
  const noon = w.data_1h.time.findIndex((t) => t.startsWith(`${date} 12`));
  if (noon !== -1) return noon;
  const first = w.data_1h.time.findIndex((t) => t.startsWith(date));
  return first === -1 ? 0 : first;
};

const getDayName = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
  });

const getFullDayLabel = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

function SubmitButton({ loading }: { loading: boolean }) {
  return (
    <Button type="submit" disabled={loading}>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Search className="h-4 w-4" />
      )}
    </Button>
  );
}

export default function Home() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [open, setOpen] = useState(false);

  const [favorites, setFavorites] = useState<CitySuggestion[]>([]);
  const [currentPlace, setCurrentPlace] = useState<CitySuggestion | null>(null);

  const requestId = useRef(0);
  const selectedName = useRef("");

  // تحميل المفضلة وإعطاء الأولوية لآخر بحث أو أول عنصر في المفضلة
  useEffect(() => {
    try {
      const favsRaw = localStorage.getItem(FAVORITES_KEY);
      const favs: CitySuggestion[] = favsRaw ? JSON.parse(favsRaw) : [];
      setFavorites(favs);

      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved: {
          place: CitySuggestion;
          data: WeatherData;
          savedAt: number;
        } = JSON.parse(raw);

        selectedName.current = saved.place.name;
        setQuery(saved.place.name);
        setCurrentPlace(saved.place);
        setWeather(saved.data);

        if (Date.now() - saved.savedAt > CACHE_TTL) {
          getWeatherData(saved.place).then(({ data }) => {
            if (data) {
              setWeather(data);
              saveLast(saved.place, data);
            }
          });
        }
      } else if (favs.length > 0) {
        // لو مفيش آخر بحث، افتح أول بلد اتضاف في المفضلة مباشرة
        selectPlace(favs[0]);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const id = ++requestId.current;
    const q = query.trim();

    if (q.length === 0) {
      setWeather(null);
      setCurrentPlace(null);
      selectedName.current = "";
      setSuggestions([]);
      setOpen(false);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
      return;
    }

    if (q.length < 2 || q === selectedName.current) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      const results = await searchCities(q);
      if (id === requestId.current) {
        setSuggestions(results);
        setOpen(results.length > 0);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const selectPlace = async (place: CitySuggestion) => {
    selectedName.current = place.name;
    setQuery(place.name);
    setCurrentPlace(place);
    setOpen(false);
    setSuggestions([]);
    setLoading(true);

    const { data } = await getWeatherData(place);
    setWeather(data ?? null);
    setNotFound(!data);
    setSelectedDay(0);
    setLoading(false);

    if (data) saveLast(place, data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    if (suggestions.length > 0) {
      selectPlace(suggestions[0]);
      return;
    }

    setLoading(true);
    const results = await searchCities(q);
    if (results.length > 0) {
      selectPlace(results[0]);
    } else {
      setWeather(null);
      setNotFound(true);
      setLoading(false);
      setCurrentPlace(null);
    }
  };

  const toggleFavorite = () => {
    if (!currentPlace) return;
    try {
      const exists = favorites.some((f) => f.id === currentPlace.id);
      let updated: CitySuggestion[];
      if (exists) {
        updated = favorites.filter((f) => f.id !== currentPlace.id);
      } else {
        updated = [...favorites, currentPlace];
      }
      setFavorites(updated);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
    } catch {}
  };

  const removeFavorite = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      const updated = favorites.filter((f) => f.id !== id);
      setFavorites(updated);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
    } catch {}
  };

  const isCurrentFavorite = currentPlace
    ? favorites.some((f) => f.id === currentPlace.id)
    : false;

  const nowIdx = weather ? getCurrentIndex(weather) : 0;
  const viewIdx =
    weather && selectedDay > 0 ? getDayIndex(weather, selectedDay) : nowIdx;

  const isDay = weather?.data_1h.isdaylight?.[nowIdx] !== 0;
  const viewIsDay = weather?.data_1h.isdaylight?.[viewIdx] !== 0;

  const code = weather?.data_day.pictocode?.[selectedDay] ?? 0;
  const { Icon, description, color } = getWeatherInfo(code, viewIsDay);

  const selectedDate = weather?.data_day.time[selectedDay];
  const dayMax = weather?.data_day.temperature_max[selectedDay];
  const dayMin = weather?.data_day.temperature_min?.[selectedDay];

  const textMuted = isDay ? "text-gray-500" : "text-gray-300";

  return (
    <div
      className={`relative min-h-screen overflow-hidden p-4 flex items-center justify-center ${
        isDay ? "bg-linear-to-b from-sky-400 to-blue-500" : "bg-black"
      }`}
    >
      {!isDay && <Stars />}

      <div className="relative z-10 w-full max-w-md space-y-4">
        {favorites.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {favorites.map((fav) => {
              const isSelected = currentPlace?.id === fav.id;
              return (
                <button
                  key={fav.id}
                  type="button"
                  onClick={() => selectPlace(fav)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors shadow-sm ${
                    isSelected
                      ? "bg-white text-gray-900 font-semibold"
                      : isDay
                      ? "bg-white/40 text-white hover:bg-white/60"
                      : "bg-white/15 text-white hover:bg-white/25"
                  }`}
                >
                  <MapPin className="h-3 w-3" />
                  <span>{fav.name}</span>
                  <span
                    onClick={(e) => removeFavorite(e, fav.id)}
                    className="ml-1 rounded-full p-0.5 hover:bg-black/10"
                  >
                    <X className="h-3 w-3" />
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              name="city"
              type="text"
              autoComplete="off"
              placeholder="Enter city name..."
              className="bg-white/90"
              value={query}
              onChange={(e) => {
                selectedName.current = "";
                setQuery(e.target.value);
              }}
              onFocus={() => suggestions.length > 0 && setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
              required
            />

            {open && suggestions.length > 0 && (
              <ul
                onMouseDown={(e) => e.preventDefault()}
                className="absolute z-20 mt-1 max-h-[350px] w-full overflow-y-auto overscroll-contain rounded-lg bg-white text-gray-900 shadow-lg"
              >
                {suggestions.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => selectPlace(s)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-sky-50"
                    >
                      <MapPin className="h-4 w-4 shrink-0 text-gray-400" />
                      <span className="text-sm">
                        <span className="font-medium">{s.name}</span>
                        <span className="text-gray-500">
                          {[s.admin1, s.country].filter(Boolean).length > 0 &&
                            `, ${[s.admin1, s.country].filter(Boolean).join(", ")}`}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {currentPlace && (
            <Button
              type="button"
              variant="outline"
              title={isCurrentFavorite ? "Remove from favorites" : "Add to favorites"}
              onClick={toggleFavorite}
              className={`bg-white/90 hover:bg-white ${
                isCurrentFavorite ? "text-yellow-500 border-yellow-400" : "text-gray-700"
              }`}
            >
              {isCurrentFavorite ? (
                <Star className="h-4 w-4 fill-current" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          )}

          <SubmitButton loading={loading} />
        </form>

        {notFound && (
          <div className="rounded-lg bg-white/80 px-4 py-3 text-center text-sm text-red-600">
            City not found
          </div>
        )}

        {weather && (
          <div>
            <Card
              className={`backdrop-blur ${
                isDay ? "bg-white/50" : "bg-white/10 border-white/10"
              }`}
            >
              <CardContent className={`p-6 ${isDay ? "" : "text-white"}`}>
                <div className="text-center mb-4">
                  <h2 className="text-2xl font-bold">
                    {weather.metadata.name}
                  </h2>
                  <div className={`text-sm ${textMuted}`}>
                    {selectedDay === 0 || !selectedDate
                      ? "Now"
                      : `${getFullDayLabel(selectedDate)} · midday`}
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <Icon className={`h-15 w-15 drop-shadow-md ${color}`} />
                    <div className="text-5xl font-bold">
                      {Math.round(weather.data_1h.temperature[viewIdx])}°C
                    </div>
                  </div>
                  <div className={`mt-1 capitalize ${textMuted}`}>
                    {description}
                  </div>
                  {dayMax !== undefined && (
                    <div className={`mt-1 text-sm ${textMuted}`}>
                      High {Math.round(dayMax)}°
                      {dayMin !== undefined && ` · Low ${Math.round(dayMin)}°`}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className="text-center">
                    <Thermometer className="w-6 h-6 mx-auto text-orange-500" />
                    <div className={`mt-2 text-sm ${textMuted}`}>
                      Feels like
                    </div>
                    <div className="font-semibold">
                      {Math.round(
                        weather.data_1h.felttemperature?.[viewIdx] ?? 0
                      )}
                      °C
                    </div>
                  </div>

                  <div className="text-center">
                    <Droplets className="w-6 h-6 mx-auto text-blue-500" />
                    <div className={`mt-2 text-sm ${textMuted}`}>Humidity</div>
                    <div className="font-semibold">
                      {Math.round(
                        weather.data_1h.relativehumidity?.[viewIdx] ?? 0
                      )}
                      %
                    </div>
                  </div>

                  <div className="text-center">
                    <Wind className="w-6 h-6 mx-auto text-teal-500" />
                    <div className={`mt-2 text-sm ${textMuted}`}>
                      Wind Speed
                    </div>
                    <div className="font-semibold">
                      {Math.round(weather.data_1h.windspeed?.[viewIdx] ?? 0)}
                      km/h
                    </div>
                  </div>
                </div>

                {/* توقعات الأسبوع */}
                <div
                  className={`mt-6 border-t pt-4 ${
                    isDay ? "border-black/10" : "border-white/10"
                  }`}
                >
                  <h3 className={`mb-2 text-sm font-semibold ${textMuted}`}>
                    7-Day Forecast
                  </h3>
                  <div className="space-y-1">
                    {weather.data_day.time.map((date, i) => {
                      const info = getWeatherInfo(
                        weather.data_day.pictocode?.[i] ?? 0,
                        true
                      );
                      const DayIcon = info.Icon;
                      const max = weather.data_day.temperature_max[i];
                      const min = weather.data_day.temperature_min?.[i];
                      const active = selectedDay === i;

                      return (
                        <button
                          key={date}
                          type="button"
                          onClick={() => setSelectedDay(i)}
                          className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-2 py-1 transition-colors ${
                            active
                              ? isDay
                                ? "bg-white/60"
                                : "bg-white/20"
                              : isDay
                              ? "hover:bg-white/30"
                              : "hover:bg-white/10"
                          }`}
                        >
                          <span className="w-16 text-left text-sm font-medium">
                            {i === 0 ? "Today" : getDayName(date)}
                          </span>
                          <DayIcon
                            className={`h-7 w-7 drop-shadow-sm ${info.color}`}
                          />
                          <span className="w-24 text-right text-sm">
                            {min !== undefined && (
                              <span className={textMuted}>
                                {Math.round(min)}°{" "}
                              </span>
                            )}
                            <span className="font-semibold">
                              {Math.round(max)}°
                            </span>
                          </span>
                        </button>
                      );
                    })}
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