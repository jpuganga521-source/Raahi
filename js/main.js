const navButtons = document.querySelectorAll("button.nav-link[data-view]");
const views = document.querySelectorAll(".view");
const breadcrumb = document.getElementById("breadcrumb-current");
const toast = document.getElementById("toast");
let toastTimeout;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => toast.classList.remove("visible"), 2800);
}

function switchView(viewName) {
  navButtons.forEach((button) => {
    const isActive = button.dataset.view === viewName;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-current", isActive ? "page" : "false");
  });
  views.forEach((view) => {
    const isActive = view.id === `${viewName}-view`;
    view.classList.toggle("active", isActive);
    view.hidden = !isActive;
  });
  breadcrumb.textContent = {
    passenger: "Book a ride",
    rider: "Rider desk",
    admin: "Admin console",
  }[viewName];
}

navButtons.forEach((button) => {
  button.addEventListener("click", () => switchView(button.dataset.view));
});

document.querySelectorAll("[data-help]").forEach((button) => {
  button.addEventListener("click", () => showToast("Raahi support is here for you, 24/7."));
});

document.querySelectorAll("[data-toast]").forEach((button) => {
  button.addEventListener("click", () => showToast(button.dataset.toast));
});

let selectedRide = document.querySelector(".ride-option.selected");
const fareEstimate = document.getElementById("fare-estimate");
document.querySelectorAll(".ride-option").forEach((button) => {
  button.addEventListener("click", () => {
    selectedRide.classList.remove("selected");
    selectedRide.setAttribute("aria-pressed", "false");
    selectedRide = button;
    selectedRide.classList.add("selected");
    selectedRide.setAttribute("aria-pressed", "true");
    fareEstimate.innerHTML = `₹${selectedRide.dataset.price} <small>· Pay on ride</small>`;
  });
});

const bookingButton = document.getElementById("book-ride");
const bookingConfirmation = document.getElementById("ride-confirmation");
bookingButton.addEventListener("click", () => {
  const pickup = document.getElementById("pickup").value.trim();
  const dropoff = document.getElementById("dropoff").value.trim();
  if (!pickup || !dropoff) {
    bookingConfirmation.hidden = false;
    bookingConfirmation.textContent = "Add your pickup and drop-off locations to find a ride.";
    bookingConfirmation.style.background = "#fff6e8";
    bookingConfirmation.style.borderColor = "#f4e3c3";
    bookingConfirmation.style.color = "#9c6b21";
    if (!dropoff) document.getElementById("dropoff").focus();
    return;
  }
  bookingConfirmation.hidden = false;
  bookingConfirmation.style.background = "";
  bookingConfirmation.style.borderColor = "";
  bookingConfirmation.style.color = "";
  bookingConfirmation.textContent = `${selectedRide.dataset.ride} ride requested from ${pickup} to ${dropoff}. Looking for a nearby rider…`;
  bookingButton.innerHTML = "Request sent <span aria-hidden=\"true\">✓</span>";
  bookingButton.disabled = true;
});

const onlineToggle = document.getElementById("online-toggle");
onlineToggle.addEventListener("click", () => {
  const isOnline = onlineToggle.getAttribute("aria-pressed") !== "true";
  onlineToggle.setAttribute("aria-pressed", String(isOnline));
  onlineToggle.classList.toggle("offline", !isOnline);
  document.getElementById("online-label").textContent = isOnline ? "You're online" : "You're offline";
  showToast(isOnline ? "You're now available for ride requests." : "You're offline and won't receive new requests.");
});

document.getElementById("accept-request").addEventListener("click", () => {
  const confirmation = document.getElementById("rider-confirmation");
  confirmation.hidden = false;
  confirmation.textContent = "Ride accepted. Head to Rajiv Chowk Metro Gate 4 to pick up Meera.";
  document.getElementById("accept-request").disabled = true;
  document.getElementById("decline-request").disabled = true;
});

document.getElementById("decline-request").addEventListener("click", () => {
  const confirmation = document.getElementById("rider-confirmation");
  confirmation.hidden = false;
  confirmation.textContent = "Request declined. You can keep receiving new ride requests.";
  confirmation.style.background = "#f6f7f9";
  confirmation.style.borderColor = "#edf0f5";
  confirmation.style.color = "#717b8c";
  document.getElementById("accept-request").disabled = true;
  document.getElementById("decline-request").disabled = true;
});

document.getElementById("refresh-dashboard").addEventListener("click", () => {
  showToast("Dashboard data is up to date.");
});

document.getElementById("tickets-body").addEventListener("click", (event) => {
  const button = event.target.closest(".resolve-button");
  if (!button) return;
  const row = button.closest("tr");
  const status = row.querySelector(".status");
  if (status.classList.contains("status-resolved")) return;
  status.classList.remove("status-open");
  status.classList.add("status-resolved");
  status.textContent = "Resolved";
  button.textContent = "Resolved";
  button.disabled = true;
  const openCount = document.querySelectorAll("#tickets-body .status-open").length;
  document.getElementById("open-tickets-count").textContent = String(openCount);
  document.getElementById("ticket-heading-count").textContent = `${openCount} open`;
  document.getElementById("nav-ticket-count").textContent = String(openCount);
  showToast(`${row.querySelector("td strong").textContent} marked as resolved.`);
});
