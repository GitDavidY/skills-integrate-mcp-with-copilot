document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const signupSubmit = document.getElementById("signup-submit");
  const signupInfo = document.getElementById("signup-info");
  const messageDiv = document.getElementById("message");

  const teacherMenuButton = document.getElementById("teacher-menu-button");
  const teacherMenuPanel = document.getElementById("teacher-menu-panel");
  const teacherAuthAction = document.getElementById("teacher-auth-action");
  const authStatus = document.getElementById("auth-status");

  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const cancelLogin = document.getElementById("cancel-login");
  const teacherUsername = document.getElementById("teacher-username");
  const teacherPassword = document.getElementById("teacher-password");

  let authToken = localStorage.getItem("teacherAuthToken") || "";
  let teacherName = localStorage.getItem("teacherUsername") || "";

  function showMessage(text, type = "info") {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  function updateAuthUI() {
    const isLoggedIn = Boolean(authToken);

    authStatus.textContent = isLoggedIn
      ? `Logged in as ${teacherName}`
      : "Not logged in";

    teacherAuthAction.textContent = isLoggedIn ? "Logout" : "Teacher Login";

    signupSubmit.disabled = !isLoggedIn;
    signupInfo.textContent = isLoggedIn
      ? "You can now register or unregister students."
      : "Teachers can register and unregister students after logging in.";

    fetchActivities();
  }

  function getAuthHeaders() {
    if (!authToken) {
      return {};
    }
    return {
      Authorization: `Bearer ${authToken}`,
    };
  }

  async function checkAuthStatus() {
    if (!authToken) {
      updateAuthUI();
      return;
    }

    try {
      const response = await fetch("/auth/status", {
        headers: getAuthHeaders(),
      });
      const result = await response.json();

      if (!result.authenticated) {
        authToken = "";
        teacherName = "";
        localStorage.removeItem("teacherAuthToken");
        localStorage.removeItem("teacherUsername");
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
    }

    updateAuthUI();
  }

  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map((email) => {
                    const deleteButton = authToken
                      ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>`
                      : "";
                    return `<li><span class="participant-email">${email}</span>${deleteButton}</li>`;
                  })
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  async function handleUnregister(event) {
    if (!authToken) {
      showMessage("Only teachers can unregister students.", "error");
      return;
    }

    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        fetchActivities();
      } else {
        if (response.status === 401) {
          authToken = "";
          teacherName = "";
          localStorage.removeItem("teacherAuthToken");
          localStorage.removeItem("teacherUsername");
          updateAuthUI();
        }
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!authToken) {
      showMessage("Only teachers can sign up students.", "error");
      return;
    }

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: getAuthHeaders(),
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();
        fetchActivities();
      } else {
        if (response.status === 401) {
          authToken = "";
          teacherName = "";
          localStorage.removeItem("teacherAuthToken");
          localStorage.removeItem("teacherUsername");
          updateAuthUI();
        }
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  teacherMenuButton.addEventListener("click", () => {
    teacherMenuPanel.classList.toggle("hidden");
  });

  teacherAuthAction.addEventListener("click", async () => {
    if (authToken) {
      try {
        await fetch("/auth/logout", {
          method: "POST",
          headers: getAuthHeaders(),
        });
      } catch (error) {
        console.error("Logout request failed:", error);
      }

      authToken = "";
      teacherName = "";
      localStorage.removeItem("teacherAuthToken");
      localStorage.removeItem("teacherUsername");
      teacherMenuPanel.classList.add("hidden");
      updateAuthUI();
      showMessage("Logged out", "success");
      return;
    }

    teacherMenuPanel.classList.add("hidden");
    loginModal.classList.remove("hidden");
    teacherUsername.focus();
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: teacherUsername.value.trim(),
          password: teacherPassword.value,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        showMessage(result.detail || "Login failed.", "error");
        return;
      }

      authToken = result.token;
      teacherName = result.username;
      localStorage.setItem("teacherAuthToken", authToken);
      localStorage.setItem("teacherUsername", teacherName);

      loginForm.reset();
      loginModal.classList.add("hidden");
      updateAuthUI();
      showMessage(`Welcome, ${teacherName}!`, "success");
    } catch (error) {
      showMessage("Failed to log in. Please try again.", "error");
      console.error("Error logging in:", error);
    }
  });

  cancelLogin.addEventListener("click", () => {
    loginForm.reset();
    loginModal.classList.add("hidden");
  });

  loginModal.addEventListener("click", (event) => {
    if (event.target === loginModal) {
      loginForm.reset();
      loginModal.classList.add("hidden");
    }
  });

  checkAuthStatus();
});
