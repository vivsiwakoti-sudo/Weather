const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

const form = document.getElementById("search-form");
const input = document.getElementById("city-input");
const suggestionsEl = document.getElementById("suggestions");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const unitFBtn = document.getElementById("unit-f");
const unitCBtn = document.getElementById("unit-c");

let unit = "f"; // "f" or "c"
let lastPlace = null;
let lastData = null;

function celsiusToFahrenheit(c) {
  return (c * 9) / 5 + 32;
}

function formatTemp(celsius) {
  return unit === "f"
    ? `${Math.round(celsiusToFahrenheit(celsius))}°F`
    : `${Math.round(celsius)}°C`;
}

unitFBtn.addEventListener("click", () => setUnit("f"));
unitCBtn.addEventListener("click", () => setUnit("c"));

function setUnit(newUnit) {
  if (unit === newUnit) return;
  unit = newUnit;
  unitFBtn.classList.toggle("active", unit === "f");
  unitCBtn.classList.toggle("active", unit === "c");
  if (lastPlace && lastData) {
    renderWeather(lastPlace, lastData);
  }
}

// WMO weather codes -> [emoji icon, description]
const WEATHER_CODES = {
  0: ["☀️", "Clear sky"],
  1: ["🌤️", "Mainly clear"],
  2: ["⛅", "Partly cloudy"],
  3: ["☁️", "Overcast"],
  45: ["🌫️", "Fog"],
  48: ["🌫️", "Depositing rime fog"],
  51: ["🌦️", "Light drizzle"],
  53: ["🌦️", "Moderate drizzle"],
  55: ["🌧️", "Dense drizzle"],
  56: ["🌧️", "Freezing drizzle"],
  57: ["🌧️", "Freezing drizzle"],
  61: ["🌦️", "Slight rain"],
  63: ["🌧️", "Moderate rain"],
  65: ["🌧️", "Heavy rain"],
  66: ["🌧️", "Freezing rain"],
  67: ["🌧️", "Freezing rain"],
  71: ["🌨️", "Slight snow"],
  73: ["🌨️", "Moderate snow"],
  75: ["❄️", "Heavy snow"],
  77: ["❄️", "Snow grains"],
  80: ["🌦️", "Slight showers"],
  81: ["🌧️", "Moderate showers"],
  82: ["⛈️", "Violent showers"],
  85: ["🌨️", "Slight snow showers"],
  86: ["❄️", "Heavy snow showers"],
  95: ["⛈️", "Thunderstorm"],
  96: ["⛈️", "Thunderstorm with hail"],
  99: ["⛈️", "Thunderstorm with hail"],
};

function weatherInfo(code) {
  return WEATHER_CODES[code] || ["❓", "Unknown"];
}

let debounceTimer;
let selectedPlace = null;

input.addEventListener("input", () => {
  selectedPlace = null;
  clearTimeout(debounceTimer);
  const query = input.value.trim();
  if (query.length < 2) {
    hideSuggestions();
    return;
  }
  debounceTimer = setTimeout(() => fetchSuggestions(query), 300);
});

document.addEventListener("click", (e) => {
  if (!suggestionsEl.contains(e.target) && e.target !== input) {
    hideSuggestions();
  }
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (selectedPlace) {
    loadWeather(selectedPlace);
  } else {
    fetchSuggestions(input.value.trim(), true);
  }
});

async function fetchSuggestions(query, autoPick = false) {
  if (!query) return;
  try {
    const url = `${GEOCODE_URL}?name=${encodeURIComponent(
      query
    )}&count=8&language=en&format=json&country_code=US`;
    const res = await fetch(url);
    const data = await res.json();
    const places = data.results || [];

    if (places.length === 0) {
      showStatus(`No US city found matching "${query}".`);
      hideSuggestions();
      return;
    }

    if (autoPick) {
      loadWeather(places[0]);
      hideSuggestions();
      return;
    }

    renderSuggestions(places);
  } catch (err) {
    showStatus("Something went wrong searching for that city. Please try again.");
  }
}

function renderSuggestions(places) {
  suggestionsEl.innerHTML = "";
  places.forEach((place) => {
    const li = document.createElement("li");
    const region = place.admin1 ? `${place.admin1}, ` : "";
    li.textContent = `${place.name}, ${region}${place.country_code}`;
    li.addEventListener("click", () => {
      input.value = `${place.name}, ${place.admin1 || place.country_code}`;
      selectedPlace = place;
      hideSuggestions();
      loadWeather(place);
    });
    suggestionsEl.appendChild(li);
  });
  suggestionsEl.classList.remove("hidden");
}

function hideSuggestions() {
  suggestionsEl.classList.add("hidden");
  suggestionsEl.innerHTML = "";
}

function showStatus(message) {
  statusEl.textContent = message;
  statusEl.classList.remove("hidden");
  resultsEl.classList.add("hidden");
}

function hideStatus() {
  statusEl.classList.add("hidden");
}

async function loadWeather(place) {
  showStatus("Loading forecast...");
  try {
    const url =
      `${FORECAST_URL}?latitude=${place.latitude}&longitude=${place.longitude}` +
      `&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
      `&wind_speed_unit=mph&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Forecast request failed");
    const data = await res.json();
    lastPlace = place;
    lastData = data;
    renderWeather(place, data);
    hideStatus();
  } catch (err) {
    showStatus("Could not load the forecast for that location. Please try again.");
  }
}

function renderWeather(place, data) {
  const region = place.admin1 ? `${place.admin1}, ` : "";
  document.getElementById("location-name").textContent = place.name;
  document.getElementById(
    "location-detail"
  ).textContent = `${region}${place.country_code}`;

  const current = data.current;
  const [icon, desc] = weatherInfo(current.weather_code);

  document.getElementById("current-temp").textContent = formatTemp(
    current.temperature_2m
  );
  document.getElementById("current-icon").textContent = icon;
  document.getElementById("current-desc").textContent = desc;
  document.getElementById(
    "feels-like"
  ).textContent = formatTemp(current.apparent_temperature);
  document.getElementById(
    "humidity"
  ).textContent = `${current.relative_humidity_2m}%`;
  document.getElementById(
    "wind"
  ).textContent = `${Math.round(current.wind_speed_10m)} mph`;

  const forecastEl = document.getElementById("forecast");
  forecastEl.innerHTML = "";
  const days = data.daily.time;
  days.forEach((dateStr, i) => {
    const [dayIcon] = weatherInfo(data.daily.weather_code[i]);
    const date = new Date(dateStr + "T00:00:00");
    const dayName = i === 0 ? "Today" : date.toLocaleDateString("en-US", { weekday: "short" });

    const card = document.createElement("div");
    card.className = "forecast-day";
    card.innerHTML = `
      <div class="day-name">${dayName}</div>
      <div class="day-icon">${dayIcon}</div>
      <div class="day-temps">
        <span class="high">${formatTemp(data.daily.temperature_2m_max[i])}</span>
        /
        <span class="low">${formatTemp(data.daily.temperature_2m_min[i])}</span>
      </div>
    `;
    forecastEl.appendChild(card);
  });

  resultsEl.classList.remove("hidden");
}
