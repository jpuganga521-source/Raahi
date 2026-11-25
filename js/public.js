const menuToggle = document.getElementById("menu-toggle");
const siteNav = document.getElementById("site-nav");
const authDialog = document.getElementById("auth-dialog");
const authForm = document.getElementById("auth-form");
const authNameField = document.getElementById("name-field");
const authRoleField = document.getElementById("role-field");
const authDescription = document.getElementById("auth-description");
const authFeedback = document.getElementById("auth-feedback");
const otpField = document.getElementById("otp-field");
let otpPhone = "";
let otpStep = "phone";
const toast = document.getElementById("toast");
let toastTimeout;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => toast.classList.remove("visible"), 2800);
}

function setAuthMode(mode) {
  const isSignup = mode === "signup";
  document.getElementById("login-tab").classList.toggle("active", !isSignup);
  document.getElementById("signup-tab").classList.toggle("active", isSignup);
  document.getElementById("login-tab").setAttribute("aria-selected", String(!isSignup));
  document.getElementById("signup-tab").setAttribute("aria-selected", String(isSignup));
  authNameField.hidden = !isSignup;
  authNameField.querySelector("input").required = isSignup;
  authRoleField.hidden = !isSignup;
  document.getElementById("auth-eyebrow").textContent = isSignup ? "LET'S GET YOU MOVING" : "WELCOME TO RAAHI";
  document.getElementById("auth-title").textContent = isSignup ? "Your next chapter starts here." : "Good to have you here.";
  authDescription.textContent = isSignup ? "Create your Raahi account to get started." : "Log in to continue your journey.";
  document.getElementById("auth-submit-label").textContent = isSignup ? "Create account" : "Log in";
  otpStep = "phone";
  otpPhone = "";
  otpField.hidden = true;
  otpField.querySelector("input").required = false;
  authForm.elements.phone.disabled = false;
  document.getElementById("auth-submit-label").textContent = isSignup ? "Send verification code" : "Send verification code";
  authFeedback.textContent = isSignup
    ? "Sign up with a mobile number. We'll send a one-time code."
    : "Enter your mobile number. We'll send a one-time code.";
}

document.querySelectorAll("[data-auth]").forEach((button) => {
  button.addEventListener("click", () => {
    setAuthMode(button.dataset.auth);
    authDialog.showModal();
  });
});

document.querySelectorAll("[data-auth-tab]").forEach((button) => {
  button.addEventListener("click", () => setAuthMode(button.dataset.authTab));
});

document.querySelector(".dialog-close").addEventListener("click", () => authDialog.close());
authDialog.addEventListener("click", (event) => {
  if (event.target === authDialog) authDialog.close();
});
authDialog.querySelector(".dialog-brand").addEventListener("click", () => authDialog.close());

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = authForm.querySelector(".auth-submit");
  submitButton.disabled = true;

  try {
    if (otpStep === "phone") {
      const rawPhone = authForm.elements.phone.value.trim();
      if (!/^\+[1-9]\d{7,14}$/.test(rawPhone)) {
        throw new Error("Enter your mobile number in international format, for example +919876543210.");
      }
      otpPhone = rawPhone;
      const response = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone: otpPhone }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not send the verification code.");

      otpStep = "code";
      otpField.hidden = false;
      otpField.querySelector("input").required = true;
      authForm.elements.phone.disabled = true;
      document.getElementById("auth-submit-label").textContent = "Verify and continue";
      authFeedback.textContent = "Code sent. Enter the six-digit code from SMS.";
      otpField.querySelector("input").focus();
    } else {
      const code = authForm.elements.code.value.trim();
      const response = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone: otpPhone, code }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Verification failed.");

      localStorage.setItem("raahiAuth", JSON.stringify({
        token: data.token,
        tokenType: data.tokenType,
        expiresIn: data.expiresIn,
        user: data.user,
      }));
      authFeedback.textContent = "Verified successfully.";
      window.location.href =
        data.user.role === "rider"
          ? "pages/rider/dashboard.html"
          : data.user.role === "admin"
            ? "pages/admin/dashboard.html"
            : "pages/passenger/dashboard.html";
    }
  } catch (error) {
    authFeedback.textContent = error instanceof Error ? error.message : "Authentication failed.";
  } finally {
    submitButton.disabled = false;
  }
});

menuToggle.addEventListener("click", () => {
  const isOpen = menuToggle.getAttribute("aria-expanded") !== "true";
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
  siteNav.classList.toggle("open", isOpen);
});

siteNav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    siteNav.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation");
  });
});

document.getElementById("contact-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const feedback = document.getElementById("contact-feedback");
  feedback.hidden = false;
  feedback.textContent = "Thanks for reaching out! This demo form isn't connected to a support inbox yet.";
  event.currentTarget.reset();
});
