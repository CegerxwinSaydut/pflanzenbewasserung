import express from "express";
import fs from "fs";
import { readSensorTL } from "./TemLuf_sensor.js";

const app = express();
const port = 3000;
const dataFile = new URL("./data.json", import.meta.url);

app.use(express.json());

let cachedWeather = null;
let lastWeatherUpdate = 0;

const WEATHER_UPDATE_INTERVAL =  1*3600 * 1000; // 1 hour

const getCachedInternetWeather = async () => {
  const now = Date.now();

  if (
    cachedWeather === null ||
    now - lastWeatherUpdate > WEATHER_UPDATE_INTERVAL
  ) {
    cachedWeather = await readInternetWeather();
    lastWeatherUpdate = now;
  }

  return cachedWeather;

};

const readInternetWeather = async () => {
  //   Koordinaten 
  // Basel / Schweiz 
 const latitude = 47.5596;
 const longitude = 7.5886;
  // Fur Brugg FHNW
  //const latitude = 47.4822746;
  //const longitude = 8.2113469

  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${latitude}` +
    `&longitude=${longitude}` +
    `&current=temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m` +
    `&timezone=Europe%2FZurich`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Internet weather API error");
  }

  const json = await response.json();

  return {
    outsideTemperature: json.current.temperature_2m,
    outsideHumidity: json.current.relative_humidity_2m,
    rain: json.current.rain,
    precipitation: json.current.precipitation,
    cloudCover: json.current.cloud_cover,
    windSpeed: json.current.wind_speed_10m,
    windDirection: json.current.wind_direction_10m,
    weatherCode: json.current.weather_code,
    weatherTime: json.current.time,
  };
};

app.use((_, res, next) => {
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader(
    "access-control-allow-headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  res.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
  return next();
});

const defaultData = {
  moisture: 42,
  pumpOn: false,
  autoMode: true,
  threshold: 35,
  lastWatering: null,
};

const loadData = () => {
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, JSON.stringify(defaultData, null, 2));
    return defaultData;
  }

  const text = fs.readFileSync(dataFile);
  return JSON.parse(text);
};

const saveData = (data) => {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
};

let state = loadData();

const checkAutomaticWatering = () => {
  if (state.autoMode && state.moisture < state.threshold && !state.pumpOn) {
    state.pumpOn = true;
    state.lastWatering = new Date().toISOString();

    setTimeout(() => {
      state.pumpOn = false;
      state.moisture = Math.min(state.moisture + 15, 100);
      saveData(state);
    }, 3000);
  }

  saveData(state);
};

app.get("/", (_, res) => {
  res.send("Plant watering server is running");
});

app.get("/api/status", async (_, res) => {
  checkAutomaticWatering();

  let sensorData = null;
  let sensorError = null;

  let internetWeather = null;
  let weatherError = null;

  try {
    sensorData = await readSensorTL();
  } catch (error) {
    console.log("Temperatur und Luft sensor read error:", error.message);
    sensorError = "Temperatur und Luft sensor could not be read";
  }

  try {
   internetWeather = await getCachedInternetWeather();
  } catch (error) {
    console.log("Internet weather read error:", error.message);
    weatherError = "Internet weather could not be read";
  }

  res.send({
    ...state,

    temperature: sensorData ? sensorData.tC : null,
    humidity: sensorData ? sensorData.rhPct : null,
    sensorError,

    weather: internetWeather,
    weatherError,
  });
});

app.post("/api/water", (_, res) => {
  if (!state.pumpOn) {
    state.pumpOn = true;
    state.lastWatering = new Date().toISOString();

    setTimeout(() => {
      state.pumpOn = false;
      state.moisture = Math.min(state.moisture + 15, 100);
      saveData(state);
    }, 3000);
  }

  saveData(state);

  res.send({
    status: "ok",
    message: "Manual watering started",
  });
});

app.post("/api/auto", (req, res) => {
  const body = req.body;

  if (typeof body.autoMode !== "boolean") {
    res.status(400).send({
      status: "error",
      message: "autoMode must be true or false",
    });
    return;
  }

  state.autoMode = body.autoMode;
  saveData(state);

  res.send({
    status: "ok",
    autoMode: state.autoMode,
  });
});

app.post("/api/threshold", (req, res) => {
  const body = req.body;
  const threshold = Number(body.threshold);

  if (Number.isNaN(threshold) || threshold < 0 || threshold > 100) {
    res.status(400).send({
      status: "error",
      message: "threshold must be a number between 0 and 100",
    });
    return;
  }

  state.threshold = threshold;
  saveData(state);

  res.send({
    status: "ok",
    threshold: state.threshold,
  });
});

app.post("/api/moisture", (req, res) => {
  const body = req.body;
  const moisture = Number(body.moisture);

  if (Number.isNaN(moisture) || moisture < 0 || moisture > 100) {
    res.status(400).send({
      status: "error",
      message: "moisture must be a number between 0 and 100",
    });
    return;
  }

  state.moisture = moisture;
  checkAutomaticWatering();
  saveData(state);

  res.send({
    status: "ok",
    moisture: state.moisture,
  });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Plant watering server available on port ${port}`);
});
