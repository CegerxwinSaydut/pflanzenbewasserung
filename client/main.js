const API_URL = `http://${window.location.hostname}:3000`;

let currentState = null;

const setMessage = (text) => {
  const messageElement = document.querySelector("#message");
  messageElement.innerText = text;
};

const updateDom = (state) => {
  document.querySelector("#moisture").innerText = `${state.moisture} %`;
  document.querySelector("#pump").innerText = state.pumpOn ? "EIN" : "AUS";
  document.querySelector("#auto-mode").innerText = state.autoMode ? "EIN" : "AUS";
  document.querySelector("#threshold").innerText = `${state.threshold} %`;
  
  document.querySelector("#temperature").innerText =
  	state.temperature === null ? "-- °C" : `${state.temperature} °C`;

  document.querySelector("#humidity").innerText =
  	state.humidity === null ? "-- %" : `${state.humidity} %`;
 
 if (state.weather === null) {
    document.querySelector("#outside-temperature").innerText = "-- °C";
    document.querySelector("#outside-humidity").innerText = "-- %";
    document.querySelector("#rain").innerText = "-- mm";
    document.querySelector("#wind").innerText = "-- km/h";
    document.querySelector("#clouds").innerText = "-- %";
  } else {
    document.querySelector("#outside-temperature").innerText =
      `${state.weather.outsideTemperature} °C`;

    document.querySelector("#outside-humidity").innerText =
      `${state.weather.outsideHumidity} %`;

    document.querySelector("#rain").innerText =
      `${state.weather.precipitation.toFixed(2)} mm`;

    document.querySelector("#wind").innerText =
      `${state.weather.windSpeed} km/h`;

    document.querySelector("#clouds").innerText =
      `${state.weather.cloudCover} %`;
  }

 // document.querySelector("#threshold-input").value = state.threshold;
};

const refreshStatus = async () => {
  const response = await fetch(`${API_URL}/api/status`);
  const json = await response.json();

  currentState = json;
  updateDom(json);
};

const startWatering = async () => {
  const response = await fetch(`${API_URL}/api/water`, {
    method: "POST",
  });

  const json = await response.json();
  setMessage(json.message);

  await refreshStatus();
};

const toggleAutoMode = async () => {
  const newAutoMode = !currentState.autoMode;

  await fetch(`${API_URL}/api/auto`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      autoMode: newAutoMode,
    }),
  });

  setMessage("Automatikmodus wurde geändert.");
  await refreshStatus();
};

const saveThreshold = async () => {
  const input = document.querySelector("#threshold-input");
  const threshold = Number(input.value);

  const response = await fetch(`${API_URL}/api/threshold`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      threshold,
    }),
  });

  const json = await response.json();

  if (json.status === "error") {
    setMessage(json.message);
    return;
  }

  setMessage("Grenzwert wurde gespeichert.");
  await refreshStatus();
};

const simulateMoisture = async () => {
  const input = document.querySelector("#moisture-input");
  const moisture = Number(input.value);

  const response = await fetch(`${API_URL}/api/moisture`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      moisture,
    }),
  });

  const json = await response.json();

  if (json.status === "error") {
    setMessage(json.message);
    return;
  }

  setMessage("Feuchtigkeit wurde simuliert.");
  await refreshStatus();
};

window.onload = async () => {
  document.querySelector("#water-btn").onclick = startWatering;
  document.querySelector("#auto-btn").onclick = toggleAutoMode;
  document.querySelector("#threshold-btn").onclick = saveThreshold;
  document.querySelector("#moisture-btn").onclick = simulateMoisture;

  await refreshStatus();

  setInterval(refreshStatus, 2000);
};
