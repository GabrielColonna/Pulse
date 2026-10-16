(function () {
  const form = document.getElementById("loginForm");
  const button = document.getElementById("loginButton");
  const message = document.getElementById("loginMessage");
  const digits = Array.from(document.querySelectorAll(".login-pin-digit"));
  let isSubmitting = false;

  function pin() {
    return digits.map((digit) => digit.value).join("");
  }

  function showMessage(text, isError) {
    message.textContent = text;
    message.className = `login-message${isError ? " login-message-error" : " login-message-success"}`;
  }

  digits.forEach((digit, index) => {
    digit.addEventListener("input", () => {
      digit.value = digit.value.replace(/\D/g, "").slice(-1);
      if (digit.value && index < digits.length - 1) {
        digits[index + 1].focus();
      } else if (digit.value && index === digits.length - 1) {
        form.requestSubmit();
      }
    });
    digit.addEventListener("keydown", (event) => {
      if (event.key === "Backspace" && !digit.value && index > 0) {
        digits[index - 1].focus();
      }
      if (event.key === "ArrowLeft" && index > 0) {
        digits[index - 1].focus();
      }
      if (event.key === "ArrowRight" && index < digits.length - 1) {
        digits[index + 1].focus();
      }
    });
    digit.addEventListener("paste", (event) => {
      const pasted = (event.clipboardData || window.clipboardData).getData("text").replace(/\D/g, "").slice(0, 4);
      if (!pasted) return;
      event.preventDefault();
      pasted.split("").forEach((value, pastedIndex) => {
        if (digits[pastedIndex]) digits[pastedIndex].value = value;
      });
      digits[Math.min(pasted.length, digits.length) - 1].focus();
      if (pasted.length === digits.length) {
        form.requestSubmit();
      }
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }
    if (pin().length !== 4) {
      showMessage("Enter all four digits to continue.", true);
      digits.find((digit) => !digit.value)?.focus();
      return;
    }

    isSubmitting = true;
    button.disabled = true;
    button.classList.add("is-loading");
    showMessage("Verifying your secure session…", false);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ pin: pin() })
      });
      if (!response.ok) {
        showMessage(response.status === 429 ? "Too many attempts. Try again later." : "That PIN was not recognized. Try again.", true);
        digits.forEach((digit) => { digit.value = ""; });
        digits[0].focus();
        return;
      }
      showMessage("Access confirmed. Opening your dashboard…", false);
      document.body.classList.add("login-success");
      window.setTimeout(() => window.location.replace("/dashboard"), 900);
    } catch {
      showMessage("Unable to connect. Check your connection and try again.", true);
    } finally {
      isSubmitting = false;
      button.disabled = false;
      button.classList.remove("is-loading");
    }
  });

  digits[0].focus();
})();
