// LGP Easter-Themed Parking Page with Flight Lookup

const FLIGHT_API = "https://flight.dock-yard.io";

// Airport name lookup
const AIRPORT_NAMES = {
  LHR: "Heathrow", LGW: "Gatwick", MAN: "Manchester", STN: "Stansted",
  LTN: "Luton", BHX: "Birmingham", EDI: "Edinburgh", BRS: "Bristol",
  NCL: "Newcastle", LBA: "Leeds Bradford", EMA: "East Midlands",
  LPL: "Liverpool", GLA: "Glasgow", EXT: "Exeter", LCY: "London City",
};

// Date helpers
function datePlus(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function defaultInFromOut(outDateStr) {
  const d = new Date(outDateStr);
  d.setDate(d.getDate() + 8);
  return d.toISOString().split("T")[0];
}

let inDateManuallyChanged = false;
let selectedFlight = null;

// Resolve airport and update page titles
function resolveAirport() {
  const urlParams = new URLSearchParams(window.location.search);
  const locationParam = (urlParams.get("Location") || urlParams.get("location") || "").toUpperCase();

  // If Location param is set and valid, hide airport select and use it
  if (locationParam && AIRPORT_NAMES[locationParam]) {
    document.getElementById("airportSelectField").style.display = "none";
    const airportName = AIRPORT_NAMES[locationParam];

    document.title = `${airportName} Parking - Easter Special`;
    document.getElementById("siteTitle").textContent = `${airportName} Parking`;
    document.getElementById("bannerHeadline").textContent = `Hop into savings at ${airportName} this Easter!`;
    document.getElementById("searchTitle").textContent = `Search ${airportName} parking`;

    return locationParam;
  } else {
    // No valid Location param - show airport dropdown
    document.getElementById("airportSelectField").style.display = "block";
    document.title = "Airport Parking - Easter Special";
    return null;
  }
}

// Fetch destinations for selected airport
async function fetchDestinations(depart, departDate) {
  const loading = document.getElementById("destinationsLoading");
  const select = document.getElementById("destinationSelect");

  loading.style.display = "block";
  select.innerHTML = '<option value="">Select destination...</option>';

  try {
    const response = await fetch(
      `${FLIGHT_API}/destinations?location=${depart}&departDate=${departDate}`
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const destinations = await response.json();
    loading.style.display = "none";

    if (destinations && destinations.length > 0) {
      destinations.forEach(dest => {
        const option = document.createElement("option");
        option.value = dest.airports.join(",");
        option.textContent = `${dest.city}, ${dest.country} (${dest.count} flights)`;
        select.appendChild(option);
      });
    } else {
      select.innerHTML = '<option value="">No destinations available</option>';
    }
  } catch (error) {
    console.error("Error fetching destinations:", error);
    loading.style.display = "none";
    select.innerHTML = '<option value="">Error loading destinations</option>';
  }
}

// Fetch flights for selected destination
async function fetchFlights(depart, departDate, destination) {
  const container = document.getElementById("flightListContainer");
  const loading = document.getElementById("flightsLoading");
  const list = document.getElementById("flightList");

  container.style.display = "block";
  loading.style.display = "block";
  list.innerHTML = "";

  try {
    const response = await fetch(
      `${FLIGHT_API}/searchDayFlights?location=${depart}&departDate=${departDate}&destination=${destination}&fullResults=false`
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const flights = await response.json();
    loading.style.display = "none";

    if (flights && flights.length > 0) {
      flights.forEach(f => {
        const row = document.createElement("div");
        row.className = "flight-row";

        const code = (f.flight && f.flight.code) || "";
        const depTime = (f.departure && f.departure.time) || "";
        const arrTime = (f.arrival && f.arrival.time) || "";
        const depIata = (f.departure && f.departure.airport_iata) || "";
        const arrIata = (f.arrival && f.arrival.airport_iata) || "";
        const stops = (f.flight && f.flight.connectingFlights && f.flight.connectingFlights.amount) || 0;
        const stopsText = stops === 0 ? "Direct" : `${stops} stop${stops > 1 ? 's' : ''}`;

        row.innerHTML = `
          <div class="flight-code">${code}</div>
          <div class="flight-time">${depTime}</div>
          <div class="flight-route">${depIata} → ${arrIata}</div>
          <div class="flight-time">${arrTime}</div>
          <div class="flight-stops">${stopsText}</div>
        `;

        row.addEventListener("click", () => {
          // Deselect previous
          document.querySelectorAll(".flight-row").forEach(r => r.classList.remove("selected"));

          // Select this one
          row.classList.add("selected");
          selectedFlight = code;
          document.getElementById("flight").value = code;
        });

        list.appendChild(row);
      });
    } else {
      list.innerHTML = '<div class="flight-loading">No flights found for this destination</div>';
    }
  } catch (error) {
    console.error("Error fetching flights:", error);
    loading.style.display = "none";
    list.innerHTML = '<div class="flight-loading">Error loading flights</div>';
  }
}

// Initialize
document.addEventListener("DOMContentLoaded", function() {
  // Resolve airport from URL or use dropdown
  const departFromUrl = resolveAirport();

  // Set default dates
  const outDateInput = document.getElementById("outDate");
  const inDateInput = document.getElementById("inDate");
  outDateInput.value = datePlus(1);
  inDateInput.value = datePlus(9);

  // Auto-recalculate inDate when outDate changes
  outDateInput.addEventListener("change", function() {
    if (!inDateManuallyChanged) {
      inDateInput.value = defaultInFromOut(this.value);
    }

    // Re-fetch destinations when date changes
    const depart = departFromUrl || document.getElementById("airportSelect").value;
    if (depart) {
      fetchDestinations(depart, this.value);
    }
  });

  inDateInput.addEventListener("change", function() {
    inDateManuallyChanged = true;
  });

  // Airport select change handler
  const airportSelect = document.getElementById("airportSelect");
  airportSelect.addEventListener("change", function() {
    const depart = this.value;
    const departDate = outDateInput.value;

    if (depart && departDate) {
      fetchDestinations(depart, departDate);
    }
  });

  // Destination select change handler
  const destinationSelect = document.getElementById("destinationSelect");
  destinationSelect.addEventListener("change", function() {
    const destination = this.value;
    if (!destination) {
      document.getElementById("flightListContainer").style.display = "none";
      return;
    }

    const depart = departFromUrl || airportSelect.value;
    const departDate = outDateInput.value;

    if (depart && departDate) {
      fetchFlights(depart, departDate, destination);
    }
  });

  // Load destinations on page load if airport is set
  if (departFromUrl) {
    fetchDestinations(departFromUrl, outDateInput.value);
  }

  // Form submission
  document.getElementById("searchForm").addEventListener("submit", function(e) {
    e.preventDefault();

    const outDate = outDateInput.value;
    const outTime = document.getElementById("outTime").value;
    const inDate = inDateInput.value;
    const inTime = document.getElementById("inTime").value;
    const depart = departFromUrl || airportSelect.value;

    if (!depart) {
      alert("Please select an airport");
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const agent = urlParams.get("agent") || "WY992";
    const flight = selectedFlight || "default";
    const adcode = urlParams.get("adcode") || "";
    const promotionCode = urlParams.get("promotionCode") || "";

    // Domain resolution (LGP swaps www -> app)
    const host = window.location.host;
    const isLocal = host.startsWith("127") || host.includes("github.io");
    const basedomain = isLocal ? "www.holidayextras.com" : host.replace("www", "app");

    // Build search URL
    const searchUrl = `https://${basedomain}/static/?selectProduct=cp&#/categories?agent=${agent}&ppts=&customer_ref=&lang=en&adults=2&depart=${depart}&terminal=&arrive=&flight=${flight}&in=${inDate}&out=${outDate}&park_from=${outTime}&park_to=${inTime}&filter_meetandgreet=&filter_parkandride=&children=0&infants=0&redirectReferal=carpark&from_categories=true&adcode=${adcode}&promotionCode=${promotionCode}`;

    window.location.href = searchUrl;
  });
});
