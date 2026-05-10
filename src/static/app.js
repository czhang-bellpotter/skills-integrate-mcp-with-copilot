document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const teacherGateMessage = document.getElementById("teacher-gate-message");
  const userMenuToggle = document.getElementById("user-menu-toggle");
  const userMenuPanel = document.getElementById("user-menu-panel");
  const authStatusText = document.getElementById("auth-status-text");
  const authActionButton = document.getElementById("auth-action-button");
  const loginModal = document.getElementById("login-modal");
  const closeLoginModal = document.getElementById("close-login-modal");
  const loginForm = document.getElementById("login-form");

  let authState = {
    authenticated: false,
    username: null,
  };

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  function openLoginModal() {
    loginModal.classList.remove("hidden");
  }

  function closeLoginDialog() {
    loginModal.classList.add("hidden");
    loginForm.reset();
  }

  function renderAuthState() {
    if (authState.authenticated) {
      authStatusText.textContent = `Logged in as ${authState.username}`;
      authActionButton.textContent = "Log Out";
      teacherGateMessage.classList.add("hidden");
      signupForm.classList.remove("hidden");
    } else {
      authStatusText.textContent = "Viewing as student";
      authActionButton.textContent = "Teacher Login";
      teacherGateMessage.classList.remove("hidden");
      signupForm.classList.add("hidden");
    }
  }

  async function fetchAuthState() {
    const response = await fetch("/auth/session");
    authState = await response.json();
    renderAuthState();
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span>${
                        authState.authenticated
                          ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">Remove</button>`
                          : ""
                      }</li>`
                  )
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

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
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
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
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
          username: document.getElementById("username").value,
          password: document.getElementById("password").value,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        showMessage(result.detail || "Login failed", "error");
        return;
      }

      authState = {
        authenticated: true,
        username: result.username,
      };
      renderAuthState();
      closeLoginDialog();
      fetchActivities();
      showMessage(result.message, "success");
    } catch (error) {
      showMessage("Failed to log in. Please try again.", "error");
      console.error("Error logging in:", error);
    }
  });

  authActionButton.addEventListener("click", async () => {
    if (!authState.authenticated) {
      openLoginModal();
      userMenuPanel.classList.add("hidden");
      return;
    }

    try {
      const response = await fetch("/auth/logout", { method: "POST" });
      const result = await response.json();

      if (!response.ok) {
        showMessage(result.detail || "Logout failed", "error");
        return;
      }

      authState = {
        authenticated: false,
        username: null,
      };
      renderAuthState();
      fetchActivities();
      showMessage(result.message, "success");
    } catch (error) {
      showMessage("Failed to log out. Please try again.", "error");
      console.error("Error logging out:", error);
    }
  });

  userMenuToggle.addEventListener("click", () => {
    userMenuPanel.classList.toggle("hidden");
  });

  closeLoginModal.addEventListener("click", closeLoginDialog);

  loginModal.addEventListener("click", (event) => {
    if (event.target === loginModal) {
      closeLoginDialog();
    }
  });

  // Initialize app
  fetchAuthState().then(fetchActivities);
});
