const email = document.getElementById('email');
const password = document.getElementById('password');

function getPostLoginDestination() {
    const nextPage = new URLSearchParams(window.location.search).get('next');
    if (!nextPage) return './dashboard.html';

    const destination = new URL(nextPage, window.location.href);
    const allowedPaths = [
        new URL('./studentEnroll.html', window.location.href).pathname,
        new URL('./viewCard.html', window.location.href).pathname
    ];

    return destination.origin === window.location.origin && allowedPaths.includes(destination.pathname)
        ? destination.href
        : './dashboard.html';
}


// ================================
// CUSTOM TOAST
// ================================

function showtoast(type, title, message) {

    const container = document.getElementById("toastContainer");

    // Remove any existing toast
    container.innerHTML = "";

    const toast = document.createElement("div");

    const icon = type === "success" ? "ph-check-circle" : "ph-x-circle";

    toast.className = `toast ${type}`;

    toast.innerHTML = `
        <div class="toast-icon">
            <i class="ph ${icon}" aria-hidden="true"></i>
        </div>

        <div class="toast-content">
            <div class="toast-title">
                ${title}
            </div>

            <div class="toast-message">
                ${message}
            </div>
        </div>

        <button class="toast-close" type="button">
            ×
        </button>

        <div class="toast-progress"></div>
    `;

    container.appendChild(toast);


    // Close button
    const closeBtn = toast.querySelector(".toast-close");

    closeBtn.onclick = function () {
        removeToast(toast);
    };


    // Auto remove
    const timeout = setTimeout(() => {
        removeToast(toast);
    }, 4000);


    function removeToast(element) {

        clearTimeout(timeout);

        if (!element) return;

        element.style.animation =
            "toastOut 0.35s cubic-bezier(.22, 1, .36, 1) forwards";

        setTimeout(() => {

            if (element.parentNode) {
                element.remove();
            }

        }, 350);
    }
}


// ================================
// SIGN UP
// ================================

async function signIn() {

    // Prevent empty fields
    if (
        email.value.trim() === "" ||
        password.value.trim() === ""
    ) {

        showtoast(
            "error",
            "Missing Information",
            "Please enter your email and password."
        );

        return;
    }


    try {

        await firebase.auth().signInWithEmailAndPassword(
            email.value.trim(),
            password.value
        );


        // ONLY ONE SUCCESS TOAST
        showtoast(
            "success",
            "Welcome back!",
            "You are signed in. Redirecting to your courses."
        );


        // Change panel after 2 seconds
        setTimeout(() => {

           window.location.replace(getPostLoginDestination())

        }, 2000);


    } catch (e) {

        console.error("Sign-in failed.", e);


        let errorMessage =
            "Something went wrong. Please try again.";


        if (e.code === "auth/invalid-email") {

            errorMessage =
                "Please enter a valid email address.";

        }

        else if (e.code === "auth/invalid-credential" || e.code === "auth/wrong-password" || e.code === "auth/user-not-found") {

            errorMessage =
                "The email address or password is incorrect.";

        }

        else if (e.code === "auth/network-request-failed") {

            errorMessage =
                "Network error. Check your internet connection.";
        }


        // ONLY ONE ERROR TOAST
        showtoast(
            "error",
            "Sign In Failed",
            errorMessage
        );
    }
}

const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", (event) => {
        event.preventDefault();
        signIn();
    });
}