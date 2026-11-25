const adminToast = document.getElementById("toast");
let adminToastTimeout;

const adminNavigation = document.querySelector(".primary-nav");
if (adminNavigation && !adminNavigation.querySelector('a[href="events.html"]')) {
  const ridesLink = adminNavigation.querySelector('a[href="rides.html"]');
  if (ridesLink) {
    const eventsLink = document.createElement("a");
    eventsLink.className = "nav-link";
    eventsLink.href = "events.html";
    eventsLink.innerHTML = '<span class="nav-icon">✦</span> Event bookings';
    ridesLink.insertAdjacentElement("afterend", eventsLink);
  }
}

function showAdminToast(message) {
  if (!adminToast) return;
  adminToast.textContent = message;
  adminToast.classList.add("visible");
  window.clearTimeout(adminToastTimeout);
  adminToastTimeout = window.setTimeout(() => adminToast.classList.remove("visible"), 2800);
}

document.querySelectorAll("[data-admin-toast]").forEach((button) => {
  button.addEventListener("click", () => showAdminToast(button.dataset.adminToast));
});

const tableBody = document.querySelector(".management-table tbody");
if (tableBody) {
  const search = document.querySelector("[data-table-search]");
  const filter = document.querySelector("[data-table-filter]");
  const tableRows = [...tableBody.querySelectorAll("tr")];
  const tableEmpty = document.querySelector(".table-empty");
  const tableCount = document.querySelector("[data-table-count]");

  function filterRows() {
    const query = search.value.trim().toLowerCase();
    const status = filter.value;
    let visibleRows = 0;
    tableRows.forEach((row) => {
      const matchesSearch = row.textContent.toLowerCase().includes(query);
      const matchesStatus = status === "all" || row.dataset.status === status;
      const isVisible = matchesSearch && matchesStatus;
      row.hidden = !isVisible;
      if (isVisible) visibleRows += 1;
    });
    tableEmpty.hidden = visibleRows > 0;
    tableCount.textContent = `Showing ${visibleRows} of ${tableRows.length} sample ${tableRows.length === 1 ? "record" : "records"}`;
  }

  search.addEventListener("input", filterRows);
  filter.addEventListener("change", filterRows);

  tableBody.addEventListener("click", (event) => {
    const accountButton = event.target.closest("[data-account-action]");
    if (accountButton) {
      const row = accountButton.closest("tr");
      const status = row.querySelector(".status");
      if (accountButton.dataset.accountAction === "review") {
        row.dataset.status = "active";
        status.className = "status status-active";
        status.textContent = "Reviewed";
        accountButton.textContent = "Block";
        accountButton.dataset.accountAction = "block";
        filterRows();
        showAdminToast("Sample passenger marked reviewed. No account data was changed.");
        return;
      }
      const isBlocked = accountButton.dataset.accountAction !== "unblock";
      row.dataset.status = isBlocked ? "blocked" : "active";
      status.className = `status ${isBlocked ? "status-blocked" : "status-active"}`;
      status.textContent = isBlocked ? "Blocked" : "Active";
      accountButton.dataset.accountAction = isBlocked ? "unblock" : "block";
      accountButton.textContent = isBlocked ? "Unblock" : "Block";
      filterRows();
      showAdminToast(`Sample account ${isBlocked ? "blocked" : "unblocked"}. No account access was changed.`);
      return;
    }

  });
}

const riderReviewDialog = document.getElementById("rider-review-dialog");
if (riderReviewDialog && tableBody) {
  let selectedRiderRow;
  tableBody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-rider-review]");
    if (!button) return;
    selectedRiderRow = button.closest("tr");
    const cells = selectedRiderRow.querySelectorAll("td");
    document.getElementById("rider-review-name").textContent = cells[0].querySelector(".table-person").textContent.trim();
    document.getElementById("rider-review-vehicle").textContent = cells[1].textContent.trim();
    document.getElementById("rider-review-context").textContent = `Sample application ${cells[0].querySelector("small").textContent}. The document uploads are not available in this preview.`;
    riderReviewDialog.showModal();
  });

  riderReviewDialog.querySelectorAll("[data-rider-decision]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!selectedRiderRow) return;
      const approved = button.dataset.riderDecision === "approve";
      const status = selectedRiderRow.querySelector(".status");
      const action = selectedRiderRow.querySelector("[data-rider-review]");
      selectedRiderRow.dataset.status = approved ? "active" : "blocked";
      status.className = `status ${approved ? "status-active" : "status-blocked"}`;
      status.textContent = approved ? "Approved demo" : "Rejected demo";
      action.textContent = "Review";
      action.disabled = true;
      const pending = document.querySelectorAll("tr[data-status=\"review\"]").length;
      document.querySelectorAll("[data-pending-riders]").forEach((count) => {
        count.textContent = String(pending);
      });
      riderReviewDialog.close();
      showAdminToast(`Sample rider ${approved ? "approved" : "rejected"}. No documents were reviewed or account access changed.`);
    });
  });
}

const firstComplaint = document.querySelector("tr[data-ticket]");
const complaintTable = firstComplaint ? firstComplaint.parentElement : null;
const reviewDialog = document.getElementById("review-dialog");
if (complaintTable && reviewDialog) {
  const reviewContext = {
    "RH-2048": {
      title: "Fare charged twice",
      reporter: "Priya Kapoor · Passenger",
      other: "Vikram Singh · Rider",
      context: "Passenger reports a duplicate fare for ride R-891. Review the trip and payment records before deciding.",
    },
    "RH-2047": {
      title: "Passenger no-show",
      reporter: "Rahul Verma · Rider",
      other: "Aisha Sharma · Passenger",
      context: "Rider reports the passenger did not arrive at the pickup point for ride R-876. Review both accounts and trip context.",
    },
    "RH-2046": {
      title: "Lost item in ride",
      reporter: "Aisha Sharma · Passenger",
      other: "Aman Malik · Rider",
      context: "Passenger reports a lost item after ride R-862. Ask both parties for relevant trip details.",
    },
    "RH-2045": {
      title: "Pickup location dispute",
      reporter: "Aman Malik · Rider",
      other: "Priya Kapoor · Passenger",
      context: "Rider and passenger disagree about the pickup point for ride R-858. Review the trip notes fairly.",
    },
  };
  let selectedComplaintRow;

  complaintTable.addEventListener("click", (event) => {
    const button = event.target.closest("[data-review-ticket]");
    if (!button) return;
    selectedComplaintRow = button.closest("tr");
    const id = selectedComplaintRow.dataset.ticket;
    const details = reviewContext[id];
    document.getElementById("review-ticket-id").textContent = `· #${id}`;
    document.getElementById("review-dialog-title").textContent = details.title;
    document.getElementById("review-dialog-context").textContent = details.context;
    document.getElementById("review-reporter").textContent = details.reporter;
    document.getElementById("review-other-party").textContent = details.other;
    reviewDialog.showModal();
  });

  reviewDialog.querySelectorAll("[data-case-action]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!selectedComplaintRow) return;
      const action = button.dataset.caseAction;
      const status = selectedComplaintRow.querySelector(".status");
      const nextStatus = action === "resolve" ? "resolved" : "investigating";
      selectedComplaintRow.dataset.status = nextStatus;
      status.className = `status ${action === "resolve" ? "status-resolved" : "status-investigating"}`;
      status.textContent = action === "resolve" ? "Resolved" : "Investigating";
      reviewDialog.close();
      updateComplaintCounts(complaintTable);
      showAdminToast(`${selectedComplaintRow.dataset.ticket} ${action === "resolve" ? "marked resolved" : "moved to investigation"} in this demo.`);
    });
  });
}

function updateComplaintCounts(tableBody) {
  const rows = [...tableBody.querySelectorAll("tr[data-ticket]")];
  const openCount = rows.filter((row) => row.dataset.status === "open").length;
  const investigatingCount = rows.filter((row) => row.dataset.status === "investigating").length;
  const resolvedCount = rows.filter((row) => row.dataset.status === "resolved").length;
  document.querySelectorAll("[data-open-count]").forEach((node) => {
    node.textContent = String(openCount);
  });
  document.querySelectorAll("[data-investigating-count]").forEach((node) => {
    node.textContent = String(investigatingCount);
  });
  document.querySelectorAll("[data-resolved-count]").forEach((node) => {
    node.textContent = String(resolvedCount);
  });
  document.querySelectorAll("[data-complaint-count]").forEach((node) => {
    node.textContent = node.classList.contains("ticket-count") ? `${openCount} open` : String(openCount);
  });
}

const fareForm = document.getElementById("fare-form");
if (fareForm) {
  fareForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const fareInputs = [...fareForm.querySelectorAll(".fare-table input[type=\"number\"]")];
    const hasBelowMinimum = ["bike", "auto", "cab", "erickshaw", "pickup"].some((service) => {
      const base = Number(document.getElementById(`${service}-base`).value);
      const minimum = Number(document.getElementById(`${service}-min`).value);
      return minimum < base;
    });
    if (fareInputs.some((input) => !input.value || Number(input.value) < 0) || hasBelowMinimum) {
      const feedback = document.getElementById("fare-feedback");
      feedback.hidden = false;
      feedback.classList.add("feedback-error");
      feedback.textContent = hasBelowMinimum
        ? "Minimum fare should be at least the base fare for every service."
        : "Enter a valid non-negative amount for each fare.";
      return;
    }
    const feedback = document.getElementById("fare-feedback");
    feedback.hidden = false;
    feedback.classList.remove("feedback-error");
    feedback.textContent = "Demo fare settings saved for this page. The passenger fare estimates are not connected.";
    showAdminToast("Sample fare settings saved.");
  });
}

const reportPeriod = document.getElementById("report-period");
if (reportPeriod) {
  const metrics = {
    today: { bookings: "1,892", completion: "96.7%", cancellations: "3.4%", value: "₹142" },
    week: { bookings: "9,842", completion: "96.7%", cancellations: "3.4%", value: "₹142" },
    month: { bookings: "38,416", completion: "95.9%", cancellations: "4.1%", value: "₹146" },
  };
  reportPeriod.addEventListener("change", () => {
    const selected = metrics[reportPeriod.value];
    document.querySelector("[data-report-bookings]").textContent = selected.bookings;
    document.querySelector("[data-report-completion]").textContent = selected.completion;
    document.querySelector("[data-report-cancellations]").textContent = selected.cancellations;
    document.querySelector("[data-report-value]").textContent = selected.value;
  });
}

const settingsForm = document.getElementById("settings-form");
if (settingsForm) {
  settingsForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const feedback = document.getElementById("settings-feedback");
    feedback.hidden = false;
    feedback.classList.remove("feedback-error");
    feedback.textContent = "Your sample settings are saved for this page only. No live service or notification settings changed.";
    showAdminToast("Demo settings saved.");
  });
}
