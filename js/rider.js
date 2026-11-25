const riderToast = document.getElementById("toast");
let riderToastTimeout;

function showRiderToast(message) {
  if (!riderToast) return;
  riderToast.textContent = message;
  riderToast.classList.add("visible");
  window.clearTimeout(riderToastTimeout);
  riderToastTimeout = window.setTimeout(() => riderToast.classList.remove("visible"), 2800);
}

document.querySelectorAll("[data-online-toggle]").forEach((toggle) => {
  toggle.addEventListener("click", () => {
    const isOnline = toggle.getAttribute("aria-pressed") !== "true";
    toggle.setAttribute("aria-pressed", String(isOnline));
    toggle.classList.toggle("offline", !isOnline);
    toggle.querySelector("[data-online-label]").textContent = isOnline ? "You're online" : "You're offline";
    showRiderToast(isOnline ? "You're available for sample ride requests." : "You're offline and won't receive sample requests.");
  });
});

document.querySelectorAll(".rider-request").forEach((request) => {
  const actions = request.querySelectorAll(".request-card-actions button");
  const feedback = request.querySelector(".request-feedback");

  request.querySelector(".accept-request").addEventListener("click", () => {
    sessionStorage.setItem("raahi-demo-active-ride", request.dataset.requestId);
    actions.forEach((button) => {
      button.disabled = true;
    });
    feedback.hidden = false;
    feedback.textContent = "Sample ride accepted. Open Active ride to continue the trip demo.";
    const link = document.createElement("a");
    link.className = "request-next-link";
    link.href = "active-ride.html";
    link.textContent = "Open active ride →";
    feedback.append(" ", link);
  });

  request.querySelector(".decline-request").addEventListener("click", () => {
    request.hidden = true;
    const remaining = document.querySelectorAll(".rider-request:not([hidden])").length;
    document.querySelectorAll(".nav-count").forEach((count) => {
      count.textContent = String(remaining);
      count.hidden = remaining === 0;
    });
    showRiderToast("Sample request declined.");
    if (remaining === 0) {
      const empty = document.getElementById("no-requests");
      if (empty) empty.hidden = false;
    }
  });
});

const rideStepButton = document.getElementById("ride-step-button");
if (rideStepButton) {
  let step = 0;
  const rideStatusTitle = document.getElementById("ride-status-title");
  const rideStatusLabel = document.getElementById("ride-status-label");
  const pickupEta = document.getElementById("pickup-eta");
  const stepHelp = document.getElementById("ride-step-help");
  rideStepButton.addEventListener("click", () => {
    step += 1;
    if (step === 1) {
      rideStatusTitle.textContent = "Passenger on board";
      rideStatusLabel.textContent = "Ride in progress";
      pickupEta.textContent = "Picked up";
      stepHelp.textContent = "Follow the route to the drop-off and confirm when the trip is complete.";
      rideStepButton.innerHTML = "Complete ride <span aria-hidden=\"true\">✓</span>";
      return;
    }
    rideStatusTitle.textContent = "Ride completed";
    rideStatusLabel.textContent = "Completed";
    document.getElementById("ride-status-pill").classList.remove("status-in-progress");
    document.getElementById("ride-status-pill").classList.add("status-approved");
    pickupEta.textContent = "Arrived";
    stepHelp.textContent = "This sample ride is complete. Thanks for keeping the journey safe.";
    rideStepButton.disabled = true;
    rideStepButton.textContent = "Trip complete";
    sessionStorage.removeItem("raahi-demo-active-ride");
  });
}

document.querySelectorAll("[data-rider-action]").forEach((button) => {
  button.addEventListener("click", () => {
    showRiderToast(button.dataset.riderAction === "call"
      ? "Calling is not connected in this demo."
      : "Passenger messaging is not connected in this demo.");
  });
});

document.querySelectorAll("[data-rider-toast]").forEach((button) => {
  button.addEventListener("click", () => showRiderToast(button.dataset.riderToast));
});

document.querySelectorAll("[data-period]").forEach((button) => {
  button.addEventListener("click", () => {
    const periods = {
      week: { total: "₹1,240", rides: "8", average: "₹155", bars: [37, 59, 44, 80, 52, 94, 65], labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] },
      month: { total: "₹7,840", rides: "42", average: "₹187", bars: [44, 68, 53, 84, 60, 95, 49], labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] },
      year: { total: "₹84,620", rides: "468", average: "₹181", bars: [50, 39, 67, 55, 76, 62, 92], labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"] },
    };
    const period = periods[button.dataset.period];
    document.querySelectorAll("[data-period]").forEach((tab) => {
      const isActive = tab === button;
      tab.classList.toggle("active", isActive);
      tab.setAttribute("aria-pressed", String(isActive));
    });
    document.getElementById("earnings-total").textContent = period.total;
    document.getElementById("earnings-rides").textContent = period.rides;
    document.getElementById("earnings-average").textContent = period.average;
    document.getElementById("chart-total").textContent = period.total;
    document.querySelectorAll("#chart-bars > span").forEach((bar, index) => {
      bar.style.setProperty("--bar-height", `${period.bars[index]}%`);
      bar.dataset.label = period.labels[index];
      bar.querySelector("small").textContent = period.labels[index];
    });
  });
});

const riderTicketForm = document.getElementById("rider-ticket-form");
if (riderTicketForm) {
  riderTicketForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const issue = riderTicketForm.elements.issue.value;
    const details = riderTicketForm.elements.details.value.trim();
    if (details.length < 10) return;
    const requestCount = document.querySelectorAll(".rider-ticket-row").length + 1;
    const ticketId = `#RS-${1100 + requestCount}`;
    const row = document.createElement("article");
    row.className = "rider-ticket-row";
    const icon = document.createElement("span");
    icon.className = "rider-ticket-icon";
    icon.textContent = "?";
    const copy = document.createElement("span");
    const title = document.createElement("strong");
    title.textContent = issue;
    const meta = document.createElement("small");
    const ride = riderTicketForm.elements.ride.value;
    meta.textContent = `${ticketId}${ride === "none" ? "" : ` · Ride #${ride}`} · Just now`;
    copy.append(title, meta);
    const status = document.createElement("span");
    status.className = "status status-investigating";
    status.textContent = "Submitted";
    row.append(icon, copy, status);
    document.getElementById("rider-tickets").prepend(row);
    document.getElementById("rider-ticket-count").textContent = `${requestCount} request${requestCount === 1 ? "" : "s"}`;
    const feedback = document.getElementById("rider-ticket-feedback");
    feedback.hidden = false;
    feedback.textContent = `${ticketId} added to this demo. It wasn't sent to support.`;
    riderTicketForm.reset();
  });
}

const riderRegistrationForm = document.getElementById("rider-registration-form");
if (riderRegistrationForm) {
  riderRegistrationForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const feedback = document.getElementById("registration-feedback");
    feedback.hidden = false;
    feedback.textContent = "Your sample profile is submitted and now shows pending review. Admin verification is not connected in this demo.";
    const bannerTitle = document.querySelector(".verification-banner strong");
    bannerTitle.textContent = "Sample profile pending review";
    document.querySelector(".verification-banner").classList.add("verification-pending");
    const status = document.querySelector(".page-heading .status");
    status.classList.remove("status-approved");
    status.classList.add("status-investigating");
    status.textContent = "◷ Pending review";
  });
}
