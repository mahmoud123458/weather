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
  pressure?: number[]; // تم الإضافة هنا
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
  sunrise?: string[]; // تم الإضافة هنا
  sunset?: string[];  // تم الإضافة هنا
}

export interface WeatherData {
  metadata: WeatherMetadata;
  units: WeatherUnits;
  data_1h: HourlyData;
  data_day: DailyData;
}

// نتيجة اقتراح مدينة من الـ geocoding
export interface CitySuggestion {
  id: number;
  name: string;
  country?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  elevation?: number;
}