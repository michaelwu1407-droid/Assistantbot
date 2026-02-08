"use server";

interface WeatherData {
  temperature: number;
  condition: string; // "Sunny", "Cloudy", "Rain", etc.
  location: string;
}

/**
 * Fetch current weather for a location (lat/lng).
 * Uses Open-Meteo API (Free, no key required).
 */
export async function getWeather(
  latitude: number,
  longitude: number,
  locationName: string = "Current Location"
): Promise<WeatherData | null> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    );

    if (!res.ok) return null;

    const data = await res.json();
    const current = data.current;

    if (!current) return null;

    return {
      temperature: Math.round(current.temperature_2m),
      condition: getWeatherCondition(current.weather_code),
      location: locationName,
    };
  } catch (error) {
    console.error("Weather fetch failed:", error);
    return null;
  }
}

/**
 * Map WMO Weather interpretation codes (WW) to human readable strings.
 * https://open-meteo.com/en/docs
 */
function getWeatherCondition(code: number): string {
  if (code === 0) return "Sunny";
  if (code >= 1 && code <= 3) return "Partly Cloudy";
  if (code === 45 || code === 48) return "Foggy";
  if (code >= 51 && code <= 55) return "Drizzle";
  if (code >= 61 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Showers";
  if (code >= 95 && code <= 99) return "Thunderstorm";
  return "Clear";
}
