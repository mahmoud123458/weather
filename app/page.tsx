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
  Gauge,
  Sunset,
  Sunrise,
  Umbrella,
  Volume2,
  VolumeX,
  LocateFixed,
} from "lucide-react";
import { getWeatherData, searchCities, getCityByCoordinates } from "./actions";
import { useEffect, useMemo, useRef, useState } from "react";
import { CitySuggestion, WeatherData } from "@/types/weather";
import { Card, CardContent } from "@/components/ui/card";

const STORAGE_KEY = "weather:last";
const FAVORITES_KEY = "weather:favorites";
const CACHE_TTL = 30 * 60 * 1000;

const saveLast = (place: CitySuggestion, data: WeatherData) => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ place, data, savedAt: Date.now() }),
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
      Array.from({ length: 70 }, (_, i) => ({
        id: i,
        top: Math.random() * 100,
        left: Math.random() * 100,
        size: Math.random() * 2 + 1,
        delay: Math.random() * 4,
        duration: Math.random() * 3 + 2,
      })),
    [],
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

function RainEffect() {
  const drops = useMemo(
    () =>
      Array.from({ length: 100 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * -100,
        duration: Math.random() * 0.5 + 0.5,
        delay: Math.random() * 2,
        opacity: Math.random() * 0.7 + 0.3,
        width: Math.random() * 1.5 + 1,
        height: Math.random() * 25 + 15,
      })),
    [],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
      <style>{`
        @keyframes fall {
          0% { transform: translateY(-50px) rotate(10deg); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: translateY(105vh) rotate(10deg); opacity: 0.2; }
        }
      `}</style>
      {drops.map((d) => (
        <div
          key={d.id}
          className="absolute bg-linear-to-b from-transparent via-blue-200 to-white rounded-full shadow-xs"
          style={{
            left: `${d.left}%`,
            top: `${d.top}px`,
            width: `${d.width}px`,
            height: `${d.height}px`,
            opacity: d.opacity,
            animation: `fall ${d.duration}s linear ${d.delay}s infinite`,
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
    case 8:
    case 14:
      return { Icon: CloudRain, description: "Rain", color: "text-blue-500" };
    case 7:
    case 12:
    case 16:
      return { Icon: CloudDrizzle, description: "Light rain", color: "text-sky-400" };
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
  new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" });

const getFullDayLabel = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

const formatHour = (timeStr: string) => {
  try {
    const timePart = timeStr.includes(" ") ? timeStr.split(" ")[1] : timeStr;
    const [hoursStr] = timePart.split(":");
    let hours = parseInt(hoursStr, 10);
    if (isNaN(hours)) return timeStr;
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours} ${ampm}`;
  } catch {
    return timeStr;
  }
};

const formatTime12h = (timeStr?: string, defaultTime = "05:45 AM") => {
  if (!timeStr) return defaultTime;
  try {
    let timePart = timeStr;
    if (timeStr.includes("T")) {
      timePart = timeStr.split("T")[1];
    } else if (timeStr.includes(" ")) {
      timePart = timeStr.split(" ")[1];
    }
    const parts = timePart.split(":");
    if (parts.length < 2) return timeStr;

    let hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    if (isNaN(hours)) return defaultTime;

    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes} ${ampm}`;
  } catch {
    return defaultTime;
  }
};

function SubmitButton({ loading, isDay }: { loading: boolean; isDay: boolean }) {
  return (
    <Button 
      type="submit" 
      disabled={loading}
      className={!isDay ? "bg-white/20 text-white hover:bg-white/30 border-white/10 shrink-0" : "shrink-0"}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
    </Button>
  );
}

export default function Home() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [open, setOpen] = useState(false);

  const [favorites, setFavorites] = useState<CitySuggestion[]>([]);
  const [currentPlace, setCurrentPlace] = useState<CitySuggestion | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDraggingWeek, setIsDraggingWeek] = useState(false);
  const [startXWeek, setStartXWeek] = useState(0);
  const [scrollLeftWeek, setScrollLeftWeek] = useState(0);

  const hourlyScrollRef = useRef<HTMLDivElement>(null);
  const [isDraggingHourly, setIsDraggingHourly] = useState(false);
  const [startXHourly, setStartXHourly] = useState(0);
  const [scrollLeftHourly, setScrollLeftHourly] = useState(0);

  const requestId = useRef(0);
  const selectedName = useRef("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    try {
      const favsRaw = localStorage.getItem(FAVORITES_KEY);
      const favs: CitySuggestion[] = favsRaw ? JSON.parse(favsRaw) : [];
      setFavorites(favs);

      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved: { place: CitySuggestion; data: WeatherData; savedAt: number } = JSON.parse(raw);
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
        selectPlace(favs[0]);
      }
    } catch {}
  }, []);

  const isRaining = useMemo(() => {
    if (!weather) return false;
    const code = weather.data_day.pictocode?.[selectedDay] ?? 0;
    return [6, 7, 8, 12, 14, 16].includes(code);
  }, [weather, selectedDay]);

  useEffect(() => {
    if (isRaining && soundEnabled) {
      if (!audioRef.current) {
        audioRef.current = new Audio("https://actions.google.com/sounds/v1/weather/rain_heavy_loud.ogg");
        audioRef.current.loop = true;
      }
      audioRef.current.play().catch(() => {});
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [isRaining, soundEnabled]);

  useEffect(() => {
    const id = ++requestId.current;
    const q = query.trim();

    if (q.length === 0) {
      setWeather(null);
      setCurrentPlace(null);
      selectedName.current = "";
      setSuggestions([]);
      setOpen(false);
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
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

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("البيانات الجغرافية غير مدعومة في متصفحك");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        try {
          const place = await getCityByCoordinates(lat, lon);
          if (place) {
            selectPlace(place);
          } else {
            alert("تعذر معرفة اسم الموقع الحالي");
          }
        } catch (error) {
          console.error(error);
        } finally {
          setLocating(false);
        }
      },
      (error) => {
        console.error(error);
        alert("تعرّف على الموقع فشل، تأكد من تفعيل صلاحيات الموقع.");
        setLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
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
      const updated = exists
        ? favorites.filter((f) => f.id !== currentPlace.id)
        : [...favorites, currentPlace];
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
  const viewIdx = weather && selectedDay > 0 ? getDayIndex(weather, selectedDay) : nowIdx;

  const isDay = weather ? weather.data_1h.isdaylight?.[nowIdx] !== 0 : true;
  const viewIsDay = weather ? weather.data_1h.isdaylight?.[viewIdx] !== 0 : true;

  const code = weather?.data_day.pictocode?.[selectedDay] ?? 0;
  const { Icon, description, color } = getWeatherInfo(code, viewIsDay);

  const selectedDate = weather?.data_day.time[selectedDay];
  const dayMax = weather?.data_day.temperature_max[selectedDay];
  const dayMin = weather?.data_day.temperature_min?.[selectedDay];

  const precipitationProb = weather?.data_1h.precipitation_probability?.[viewIdx] ?? weather?.data_day.precipitation_probability?.[selectedDay] ?? 0;
  const pressure = weather?.data_1h.pressure?.[viewIdx] ?? weather?.data_1h.sealevelpressure?.[viewIdx] ?? 1013;
  
  const sunriseTime = formatTime12h(weather?.data_day.sunrise?.[selectedDay], "05:45 AM");
  const sunsetTime = formatTime12h(weather?.data_day.sunset?.[selectedDay], "06:15 PM");

  const textMuted = isDay ? "text-gray-500" : "text-gray-300";

  return (
    <div
      className={`relative min-h-screen overflow-x-hidden p-3 sm:p-6 flex items-center justify-center ${
        isDay ? "bg-linear-to-b from-sky-400 to-blue-500" : "bg-black"
      }`}
    >
      {!isDay && <Stars />}
      {isRaining && <RainEffect />}

      {isRaining && (
        <button
          type="button"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30 flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-full text-xs backdrop-blur transition"
        >
          {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          <span>{soundEnabled ? "Rain Sound" : "Muted"}</span>
        </button>
      )}

      <div className="relative z-10 w-full max-w-sm sm:max-w-md space-y-3 sm:space-y-4 my-auto">
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
              dir="auto"
              placeholder="ابحث عن مدينة (Search city)..."
              className="bg-white/90 text-right rtl:text-right ltr:text-left text-sm sm:text-base"
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
                className="absolute z-20 mt-1 max-h-[250px] sm:max-h-[350px] w-full overflow-y-auto overscroll-contain rounded-lg bg-white text-gray-900 shadow-lg text-sm"
              >
                {suggestions.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => selectPlace(s)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-sky-50"
                    >
                      <MapPin className="h-4 w-4 shrink-0 text-gray-400" />
                      <span className="truncate">
                        <span className="font-medium">{s.name}</span>
                        <span className="text-gray-500 text-xs">
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

          <Button
            type="button"
            variant="outline"
            title="تحديد موقعي الحالي"
            onClick={handleCurrentLocation}
            disabled={locating}
            className="bg-white/90 hover:bg-white text-gray-700 shrink-0"
          >
            {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
          </Button>

          {currentPlace && (
            <Button
              type="button"
              variant="outline"
              title={isCurrentFavorite ? "Remove from favorites" : "Add to favorites"}
              onClick={toggleFavorite}
              className={`bg-white/90 hover:bg-white shrink-0 ${
                isCurrentFavorite ? "text-yellow-500 border-yellow-400" : "text-gray-700"
              }`}
            >
              {isCurrentFavorite ? <Star className="h-4 w-4 fill-current" /> : <Plus className="h-4 w-4" />}
            </Button>
          )}

          <SubmitButton loading={loading} isDay={isDay} />
        </form>

        {notFound && (
          <div className="rounded-lg bg-white/80 px-4 py-3 text-center text-xs sm:text-sm text-red-600">
            City not found / المدينة غير موجودة
          </div>
        )}

        {weather && (
          <div>
            <Card className={`backdrop-blur shadow-xl ${isDay ? "bg-white/50" : "bg-white/10 border-white/10"}`}>
              <CardContent className={`p-4 sm:p-6 ${isDay ? "" : "text-white"}`}>
                <div className="text-center mb-3 sm:mb-4">
                  <h2 className="text-xl sm:text-2xl font-bold truncate">{weather.metadata.name}</h2>
                  <div className={`text-xs sm:text-sm ${textMuted}`}>
                    {selectedDay === 0 || !selectedDate ? "Now" : `${getFullDayLabel(selectedDate)} · midday`}
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <Icon className={`h-12 w-12 sm:h-15 sm:w-15 drop-shadow-md ${color}`} />
                    <div className="text-4xl sm:text-5xl font-bold">
                      {Math.round(weather.data_1h.temperature[viewIdx])}°C
                    </div>
                  </div>
                  <div className={`mt-1 capitalize text-sm sm:text-base ${textMuted}`}>{description}</div>
                  {dayMax !== undefined && (
                    <div className={`mt-1 text-xs sm:text-sm ${textMuted}`}>
                      High {Math.round(dayMax)}° {dayMin !== undefined && ` · Low ${Math.round(dayMin)}°`}
                    </div>
                  )}
                </div>

                <div className={`mb-4 border-t pt-3 ${isDay ? "border-black/10" : "border-white/10"}`}>
                  <h3 className={`mb-2 text-xs sm:text-sm font-semibold ${textMuted}`}>Hourly Forecast</h3>
                  <div 
                    ref={hourlyScrollRef}
                    className="flex gap-2 overflow-x-auto pb-2 scrollbar-none cursor-grab active:cursor-grabbing select-none"
                    onWheel={(e) => {
                      if (e.deltaY !== 0) {
                        e.currentTarget.scrollLeft += e.deltaY;
                        e.preventDefault();
                      }
                    }}
                    onMouseDown={(e) => {
                      setIsDraggingHourly(true);
                      setStartXHourly(e.pageX - hourlyScrollRef.current!.offsetLeft);
                      setScrollLeftHourly(hourlyScrollRef.current!.scrollLeft);
                    }}
                    onMouseLeave={() => setIsDraggingHourly(false)}
                    onMouseUp={() => setIsDraggingHourly(false)}
                    onMouseMove={(e) => {
                      if (!isDraggingHourly) return;
                      e.preventDefault();
                      const x = e.pageX - hourlyScrollRef.current!.offsetLeft;
                      const walk = (x - startXHourly) * 1.5;
                      hourlyScrollRef.current!.scrollLeft = scrollLeftHourly - walk;
                    }}
                  >
                    {weather.data_1h.time.slice(nowIdx, nowIdx + 24).map((timeStr, idx) => {
                      const actualIdx = nowIdx + idx;
                      const temp = weather.data_1h.temperature[actualIdx];
                      const code1h = weather.data_1h.pictocode?.[actualIdx] ?? 1;
                      const isHourDay = weather.data_1h.isdaylight?.[actualIdx] !== 0;
                      const hourInfo = getWeatherInfo(code1h, isHourDay);
                      const HourIcon = hourInfo.Icon;

                      return (
                        <div
                          key={timeStr}
                          className={`flex flex-col shrink-0 items-center justify-between p-2 rounded-xl w-16 sm:w-18 ${
                            isDay ? "bg-white/30 text-gray-800" : "bg-white/10 text-white"
                          }`}
                        >
                          <span className="text-[10px] sm:text-xs font-medium">{formatHour(timeStr)}</span>
                          <HourIcon className={`h-5 w-5 my-1 ${hourInfo.color}`} />
                          <div className="text-xs font-semibold">{Math.round(temp)}°</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <div className="text-center bg-white/10 p-2 rounded-lg">
                    <Thermometer className="w-4 h-4 sm:w-5 sm:h-5 mx-auto text-orange-500" />
                    <div className={`mt-1 text-[10px] sm:text-xs ${textMuted}`}>Feels like</div>
                    <div className="font-semibold text-xs sm:text-sm">
                      {Math.round(weather.data_1h.felttemperature?.[viewIdx] ?? 0)}°C
                    </div>
                  </div>

                  <div className="text-center bg-white/10 p-2 rounded-lg">
                    <Droplets className="w-4 h-4 sm:w-5 sm:h-5 mx-auto text-blue-500" />
                    <div className={`mt-1 text-[10px] sm:text-xs ${textMuted}`}>Humidity</div>
                    <div className="font-semibold text-xs sm:text-sm">
                      {Math.round(weather.data_1h.relativehumidity?.[viewIdx] ?? 0)}%
                    </div>
                  </div>

                  <div className="text-center bg-white/10 p-2 rounded-lg">
                    <Wind className="w-4 h-4 sm:w-5 sm:h-5 mx-auto text-teal-500" />
                    <div className={`mt-1 text-[10px] sm:text-xs ${textMuted}`}>Wind</div>
                    <div className="font-semibold text-xs sm:text-sm">
                      {Math.round(weather.data_1h.windspeed?.[viewIdx] ?? 0)} km/h
                    </div>
                  </div>

                  <div className="text-center bg-white/10 p-2 rounded-lg">
                    <Umbrella className="w-4 h-4 sm:w-5 sm:h-5 mx-auto text-sky-400" />
                    <div className={`mt-1 text-[10px] sm:text-xs ${textMuted}`}>Rain Chance</div>
                    <div className="font-semibold text-xs sm:text-sm">{Math.round(precipitationProb)}%</div>
                  </div>

                  <div className="text-center bg-white/10 p-2 rounded-lg">
                    <Gauge className="w-4 h-4 sm:w-5 sm:h-5 mx-auto text-purple-400" />
                    <div className={`mt-1 text-[10px] sm:text-xs ${textMuted}`}>Pressure</div>
                    <div className="font-semibold text-xs sm:text-sm">{Math.round(pressure)} hPa</div>
                  </div>

                  <div className="text-center bg-white/10 p-2 rounded-lg">
                    <Sunrise className="w-4 h-4 sm:w-5 sm:h-5 mx-auto text-yellow-400" />
                    <div className={`mt-1 text-[10px] sm:text-xs ${textMuted}`}>Sunrise</div>
                    <div className="font-semibold text-xs sm:text-sm">{sunriseTime}</div>
                  </div>

                  <div className="text-center bg-white/10 p-2 rounded-lg col-span-3 flex items-center justify-center gap-2">
                    <Sunset className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                    <span className={`text-[10px] sm:text-xs ${textMuted}`}>Sunset:</span>
                    <span className="font-semibold text-xs sm:text-sm">{sunsetTime}</span>
                  </div>
                </div>

                <div className={`mt-4 sm:mt-6 border-t pt-3 sm:pt-4 ${isDay ? "border-black/10" : "border-white/10"}`}>
                  <h3 className={`mb-2 sm:mb-3 text-xs sm:text-sm font-semibold ${textMuted}`}>7-Day Forecast</h3>
                  
                  <div 
                    ref={scrollContainerRef}
                    className="flex gap-2 overflow-x-auto pb-2 scrollbar-none cursor-grab active:cursor-grabbing select-none"
                    onWheel={(e) => {
                      if (e.deltaY !== 0) {
                        e.currentTarget.scrollLeft += e.deltaY;
                        e.preventDefault();
                      }
                    }}
                    onMouseDown={(e) => {
                      setIsDraggingWeek(true);
                      setStartXWeek(e.pageX - scrollContainerRef.current!.offsetLeft);
                      setScrollLeftWeek(scrollContainerRef.current!.scrollLeft);
                    }}
                    onMouseLeave={() => setIsDraggingWeek(false)}
                    onMouseUp={() => setIsDraggingWeek(false)}
                    onMouseMove={(e) => {
                      if (!isDraggingWeek) return;
                      e.preventDefault();
                      const x = e.pageX - scrollContainerRef.current!.offsetLeft;
                      const walk = (x - startXWeek) * 1.5;
                      scrollContainerRef.current!.scrollLeft = scrollLeftWeek - walk;
                    }}
                  >
                    {weather.data_day.time.map((date, i) => {
                      const info = getWeatherInfo(weather.data_day.pictocode?.[i] ?? 0, true);
                      const DayIcon = info.Icon;
                      const max = weather.data_day.temperature_max[i];
                      const min = weather.data_day.temperature_min?.[i];
                      const active = selectedDay === i;

                      return (
                        <button
                          key={date}
                          type="button"
                          onClick={() => setSelectedDay(i)}
                          className={`flex flex-col shrink-0 items-center justify-between p-2 rounded-xl w-18 sm:w-20 transition-all ${
                            active
                              ? isDay
                                ? "bg-white text-gray-900 shadow-md font-bold scale-105"
                                : "bg-white/30 text-white shadow-md font-bold scale-105"
                              : isDay
                              ? "bg-white/30 hover:bg-white/50 text-gray-800"
                              : "bg-white/10 hover:bg-white/20 text-white"
                          }`}
                        >
                          <span className="text-[11px] sm:text-xs font-medium">{i === 0 ? "Today" : getDayName(date)}</span>
                          <DayIcon className={`h-5 w-5 sm:h-6 sm:w-6 my-1 drop-shadow-sm ${info.color}`} />
                          <div className="text-[11px] sm:text-xs text-center">
                            <div className="font-semibold">{Math.round(max)}°</div>
                            {min !== undefined && <span className={`text-[9px] sm:text-[10px] ${textMuted}`}>{Math.round(min)}°</span>}
                          </div>
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