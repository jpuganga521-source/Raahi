const eventStorageKey = "raahiEventBookings";
const vehicleList = document.getElementById("vehicle-request-list");
const customerRequests = document.getElementById("event-request-list");
const bookingForm = document.getElementById("event-booking-form");
const formFeedback = document.getElementById("event-form-feedback");
const statusLabels = {
  "request-submitted": "Request submitted",
  "under-review": "Under review",
  "quotation-sent": "Quotation sent",
  "waiting-confirmation": "Waiting for confirmation",
  "booking-confirmed": "Booking confirmed",
  "payment-pending": "Payment pending",
  completed: "Completed",
  cancelled: "Cancelled",
};

function readEventBookings() {
  try {
    const saved = localStorage.getItem(eventStorageKey);
    if (!saved) return [];
    const bookings = JSON.parse(saved);
    if (!Array.isArray(bookings)) throw new Error("Saved event requests are not a list.");
    return bookings;
  } catch (error) {
    console.error("Could not read event requests from browser storage.", error);
    throw new Error("Saved event requests could not be loaded. Please check browser storage and reload.");
  }
}

function saveEventBookings(bookings) {
  try {
    localStorage.setItem(eventStorageKey, JSON.stringify(bookings));
  } catch (error) {
    console.error("Could not save event requests to browser storage.", error);
    throw new Error("This browser could not save your request. Please check browser storage and try again.");
  }
}

function escapeEventText(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function formatEventDate(value) {
  if (!value) return "Date not set";
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function renderCustomerBookings() {
  if (!customerRequests) return;
  let bookings;
  try {
    bookings = readEventBookings();
  } catch (error) {
    customerRequests.innerHTML = `<div class="empty-event-state">${escapeEventText(error.message)}</div>`;
    return;
  }
  if (!bookings.length) {
    customerRequests.innerHTML = '<div class="empty-event-state">No event requests yet. Submit the form above to start planning.</div>';
    return;
  }
  customerRequests.innerHTML = bookings.map((booking) => {
    const status = statusLabels[booking.status] || "Request submitted";
    const vehicles = booking.vehicles.map((vehicle) => `${escapeEventText(vehicle.quantity)} × ${escapeEventText(vehicle.type)}`).join(", ");
    const quote = booking.quote
      ? `<div class="event-quote-box"><strong>Custom quotation: ₹${escapeEventText(Number(booking.quote).toLocaleString("en-IN"))}</strong>${booking.alternative ? `<p>${escapeEventText(booking.alternative)}</p>` : ""}${booking.status === "quotation-sent" || booking.status === "waiting-confirmation" ? `<div class="event-customer-actions"><button type="button" data-customer-decision="accept" data-booking-id="${escapeEventText(booking.id)}">Accept quotation</button><button type="button" data-customer-decision="decline" data-booking-id="${escapeEventText(booking.id)}">Decline</button></div>` : ""}</div>`
      : "";
    return `<article class="customer-event-card">
      <div class="customer-event-top"><h3>${escapeEventText(booking.eventType)} · ${formatEventDate(booking.eventDate)}</h3><span class="event-status-pill status-${escapeEventText(booking.status)}">${escapeEventText(status)}</span></div>
      <div class="customer-event-details"><span><strong>Request:</strong> ${escapeEventText(booking.id)}</span><span><strong>Route:</strong> ${escapeEventText(booking.pickup)} → ${escapeEventText(booking.destination)}</span><span><strong>Start:</strong> ${escapeEventText(booking.startTime)} · ${escapeEventText(booking.durationLabel)}</span><span><strong>Contact:</strong> ${escapeEventText(booking.phone)}</span></div>
      <p class="event-vehicle-list"><strong>Requested vehicles:</strong> ${vehicles}</p>
      ${booking.requirements ? `<p class="event-vehicle-list"><strong>Special requirements:</strong> ${escapeEventText(booking.requirements)}</p>` : ""}
      ${quote}
    </article>`;
  }).join("");
}

if (vehicleList) {
  vehicleList.addEventListener("click", (event) => {
    const removeButton = event.target.closest(".remove-vehicle");
    if (removeButton && vehicleList.querySelectorAll(".vehicle-request-row").length > 1) {
      removeButton.closest(".vehicle-request-row").remove();
      refreshVehicleRows();
    }
  });

  document.getElementById("add-vehicle").addEventListener("click", () => {
    const row = vehicleList.querySelector(".vehicle-request-row").cloneNode(true);
    row.querySelector("select").selectedIndex = 0;
    row.querySelector('input[type="number"]').value = "1";
    vehicleList.append(row);
    refreshVehicleRows();
    row.querySelector("select").focus();
  });
}

function refreshVehicleRows() {
  const rows = [...vehicleList.querySelectorAll(".vehicle-request-row")];
  rows.forEach((row) => {
    row.querySelector(".remove-vehicle").disabled = rows.length === 1;
  });
}

if (bookingForm) {
  const dateInput = bookingForm.elements.eventDate;
  dateInput.min = new Date().toISOString().slice(0, 10);
  bookingForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(bookingForm);
    const vehicles = [...vehicleList.querySelectorAll(".vehicle-request-row")].map((row) => ({
      type: row.querySelector('select[name="vehicleType"]').value,
      quantity: Number(row.querySelector('input[name="vehicleQuantity"]').value),
    }));
    if (vehicles.some((vehicle) => !Number.isInteger(vehicle.quantity) || vehicle.quantity < 1)) {
      formFeedback.hidden = false;
      formFeedback.textContent = "Enter a whole number of at least 1 for every vehicle type.";
      return;
    }
    const duration = formData.get("duration");
    const durationLabel = bookingForm.elements.duration.selectedOptions[0].textContent;
    const booking = {
      id: `EV-${Date.now().toString().slice(-7)}`,
      customerName: formData.get("customerName").trim(),
      phone: formData.get("phone").trim(),
      eventType: formData.get("eventType"),
      eventDate: formData.get("eventDate"),
      startTime: formData.get("startTime"),
      duration: Number(duration),
      durationLabel,
      pickup: formData.get("pickup").trim(),
      destination: formData.get("destination").trim(),
      vehicles,
      requirements: formData.get("requirements").trim(),
      status: "request-submitted",
      quote: "",
      alternative: "",
      createdAt: new Date().toISOString(),
    };
    try {
      const bookings = readEventBookings();
      bookings.unshift(booking);
      saveEventBookings(bookings);
      bookingForm.reset();
      dateInput.min = new Date().toISOString().slice(0, 10);
      vehicleList.innerHTML = vehicleList.querySelector(".vehicle-request-row")?.outerHTML || "";
      refreshVehicleRows();
      formFeedback.hidden = false;
      formFeedback.textContent = `Request ${booking.id} submitted. The admin team can now review your vehicle requirements and send a quotation.`;
      renderCustomerBookings();
      document.getElementById("my-event-requests").scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      formFeedback.hidden = false;
      formFeedback.textContent = error.message;
    }
  });

  customerRequests.addEventListener("click", (event) => {
    const decisionButton = event.target.closest("[data-customer-decision]");
    if (!decisionButton) return;
    try {
      const bookings = readEventBookings();
      const booking = bookings.find((item) => item.id === decisionButton.dataset.bookingId);
      if (!booking || !["quotation-sent", "waiting-confirmation"].includes(booking.status)) return;
      booking.status = decisionButton.dataset.customerDecision === "accept" ? "booking-confirmed" : "cancelled";
      saveEventBookings(bookings);
      renderCustomerBookings();
    } catch (error) {
      formFeedback.hidden = false;
      formFeedback.textContent = error.message;
    }
  });

  window.addEventListener("storage", (event) => {
    if (event.key === eventStorageKey) renderCustomerBookings();
  });
  refreshVehicleRows();
  renderCustomerBookings();
}

const adminEventList = document.getElementById("admin-event-list");
if (adminEventList) {
  const adminFeedback = document.getElementById("admin-event-feedback");
  function renderAdminBookings() {
    let bookings;
    try {
      bookings = readEventBookings();
    } catch (error) {
      adminEventList.innerHTML = `<div class="event-admin-empty">${escapeEventText(error.message)}</div>`;
      return;
    }
    document.querySelectorAll("[data-event-total]").forEach((node) => { node.textContent = String(bookings.length); });
    document.querySelectorAll("[data-event-open]").forEach((node) => {
      node.textContent = String(bookings.filter((booking) => !["booking-confirmed", "completed", "cancelled"].includes(booking.status)).length);
    });
    document.querySelectorAll("[data-event-quoted]").forEach((node) => {
      node.textContent = String(bookings.filter((booking) => Boolean(booking.quote)).length);
    });
    if (!bookings.length) {
      adminEventList.innerHTML = '<div class="event-admin-empty">No event requests yet. New customer requests from this browser will appear here.</div>';
      return;
    }
    adminEventList.innerHTML = bookings.map((booking) => {
      const vehicles = booking.vehicles.map((vehicle) => `${escapeEventText(vehicle.quantity)} × ${escapeEventText(vehicle.type)}`).join(", ");
      const status = statusLabels[booking.status] || "Request submitted";
      return `<article class="admin-event-card" data-admin-event="${escapeEventText(booking.id)}">
        <header class="admin-event-header"><div><h2>${escapeEventText(booking.eventType)} · ${formatEventDate(booking.eventDate)}</h2><small>Request ${escapeEventText(booking.id)} · Received ${new Date(booking.createdAt).toLocaleString()}</small></div><span class="event-status-pill status-${escapeEventText(booking.status)}">${escapeEventText(status)}</span></header>
        <div class="admin-event-body">
          <div class="admin-event-details"><span><strong>CUSTOMER</strong>${escapeEventText(booking.customerName)} · ${escapeEventText(booking.phone)}</span><span><strong>EVENT TIME</strong>${escapeEventText(booking.startTime)} · ${escapeEventText(booking.durationLabel)}</span><span><strong>PICKUP</strong>${escapeEventText(booking.pickup)}</span><span><strong>DESTINATION</strong>${escapeEventText(booking.destination)}</span><span class="admin-event-vehicles"><strong>VEHICLES REQUESTED</strong>${vehicles}</span>${booking.requirements ? `<span class="admin-event-note"><strong>SPECIAL REQUIREMENTS</strong><br />${escapeEventText(booking.requirements)}</span>` : ""}
          </div>
          <form class="admin-event-actions" data-event-form="${escapeEventText(booking.id)}">
            <label class="admin-field">Custom package price (₹)<input name="quote" type="number" min="1" step="1" value="${escapeEventText(booking.quote)}" placeholder="Enter total quote" /></label>
            <label class="admin-field">Alternative / quotation note<textarea name="alternative" rows="2" placeholder="Availability, suggested alternatives, or quote details">${escapeEventText(booking.alternative)}</textarea></label>
            <button class="primary-button" type="submit">Send quotation <span aria-hidden="true">→</span></button>
            <label class="admin-field">Update booking status<select name="status">${Object.entries(statusLabels).map(([value, label]) => `<option value="${value}"${booking.status === value ? " selected" : ""}>${label}</option>`).join("")}</select></label>
            <button class="secondary-button" type="button" data-save-status>Save status</button>
          </form>
        </div>
      </article>`;
    }).join("");
  }

  adminEventList.addEventListener("submit", (event) => {
    const form = event.target.closest("[data-event-form]");
    if (!form) return;
    event.preventDefault();
    const quote = Number(form.elements.quote.value);
    if (!Number.isFinite(quote) || quote < 1) {
      adminFeedback.hidden = false;
      adminFeedback.textContent = "Enter a package quotation greater than zero before sending.";
      form.elements.quote.focus();
      return;
    }
    try {
      const bookings = readEventBookings();
      const booking = bookings.find((item) => item.id === form.dataset.eventForm);
      if (!booking) throw new Error("This event request could not be found. Refresh the page and try again.");
      booking.quote = quote;
      booking.alternative = form.elements.alternative.value.trim();
      booking.status = "quotation-sent";
      saveEventBookings(bookings);
      renderAdminBookings();
      adminFeedback.hidden = false;
      adminFeedback.textContent = `Quotation saved for request ${booking.id}. It will appear in the customer demo on this browser.`;
    } catch (error) {
      adminFeedback.hidden = false;
      adminFeedback.textContent = error.message;
    }
  });

  adminEventList.addEventListener("click", (event) => {
    const saveButton = event.target.closest("[data-save-status]");
    if (!saveButton) return;
    const form = saveButton.closest("[data-event-form]");
    try {
      const bookings = readEventBookings();
      const booking = bookings.find((item) => item.id === form.dataset.eventForm);
      if (!booking) throw new Error("This event request could not be found. Refresh the page and try again.");
      booking.status = form.elements.status.value;
      saveEventBookings(bookings);
      renderAdminBookings();
      adminFeedback.hidden = false;
      adminFeedback.textContent = `Status updated for request ${booking.id}.`;
    } catch (error) {
      adminFeedback.hidden = false;
      adminFeedback.textContent = error.message;
    }
  });

  window.addEventListener("storage", (event) => {
    if (event.key === eventStorageKey) renderAdminBookings();
  });
  renderAdminBookings();
}
