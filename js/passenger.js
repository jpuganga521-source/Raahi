const passengerToast = document.getElementById("toast");
let passengerToastTimeout;

function showPassengerToast(message) {
  if (!passengerToast) return;
  passengerToast.textContent = message;
  passengerToast.classList.add("visible");
  window.clearTimeout(passengerToastTimeout);
  passengerToastTimeout = window.setTimeout(() => passengerToast.classList.remove("visible"), 2800);
}

document.querySelectorAll("[data-demo-toast]").forEach((button) => {
  button.addEventListener("click", () => showPassengerToast(button.dataset.demoToast));
});

document.querySelectorAll("[data-passenger-action]").forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.passengerAction === "call") {
      showPassengerToast("Calling is not connected in this demo.");
      return;
    }

    const confirmed = window.confirm("Cancel this sample ride?");
    if (!confirmed) return;

    const status = document.getElementById("active-ride-status");
    status.classList.remove("status-in-progress");
    status.classList.add("status-cancelled");
    status.textContent = "Cancelled";
    document.querySelectorAll("[data-passenger-action]").forEach((action) => {
      action.disabled = true;
    });
    showPassengerToast("Sample ride cancelled.");
  });
});

const rideFilters = document.querySelectorAll("[data-filter]");
const historyItems = document.querySelectorAll(".history-item");
if (rideFilters.length) {
  rideFilters.forEach((filter) => {
    filter.addEventListener("click", () => {
      rideFilters.forEach((button) => {
        const isActive = button === filter;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
      });

      let visibleCount = 0;
      historyItems.forEach((item) => {
        const isVisible = filter.dataset.filter === "all" || item.dataset.status === filter.dataset.filter;
        item.hidden = !isVisible;
        if (isVisible) visibleCount += 1;
      });
      document.getElementById("empty-rides").hidden = visibleCount > 0;
    });
  });
}

const profileForm = document.getElementById("profile-form");
if (profileForm) {
  profileForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = profileForm.elements.name.value.trim();
    if (!name) return;
    document.getElementById("profile-display-name").textContent = name;
    const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0].toUpperCase()).join("");
    document.querySelectorAll(".profile-large-avatar, .profile-button .avatar, .top-avatar").forEach((avatar) => {
      avatar.textContent = initials;
    });
    document.querySelector(".profile-copy strong").textContent = name;
    const feedback = document.getElementById("profile-feedback");
    feedback.hidden = false;
    feedback.textContent = "Your profile changes are shown in this demo.";
  });
}

const ticketForm = document.getElementById("ticket-form");
if (ticketForm) {
  ticketForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const issue = ticketForm.elements.issue.value;
    const details = ticketForm.elements.details.value.trim();
    if (details.length < 10) return;

    const requestCount = document.querySelectorAll(".passenger-ticket").length + 1;
    const ticketId = `#RH-${2100 + requestCount}`;
    const ticket = document.createElement("article");
    ticket.className = "passenger-ticket";

    const icon = document.createElement("span");
    icon.className = "ticket-type-icon ticket-payment";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "?";

    const copy = document.createElement("span");
    const title = document.createElement("strong");
    title.textContent = issue;
    const meta = document.createElement("small");
    const relatedRide = ticketForm.elements.ride.value;
    meta.textContent = `${ticketId}${relatedRide === "none" ? "" : ` · Ride #${relatedRide}`} · Just now`;
    copy.append(title, meta);

    const status = document.createElement("span");
    status.className = "status status-investigating";
    status.textContent = "Submitted";

    ticket.append(icon, copy, status);
    document.getElementById("passenger-tickets").prepend(ticket);
    document.getElementById("ticket-total").textContent = `${requestCount} requests`;

    const feedback = document.getElementById("ticket-feedback");
    feedback.hidden = false;
    feedback.textContent = `${ticketId} added to this demo. It's not been sent to support.`;
    ticketForm.reset();
  });
}
