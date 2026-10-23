// ================================
// GET INPUTS
// ================================

const sname = document.getElementById("username");
const semail = document.getElementById("semail");
const spassword = document.getElementById("spassword");


// ================================
// TOAST FUNCTION
// ================================

function showToast(type, title, message) {

    const container = document.getElementById("toastContainer");

    // Remove old toast
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

    closeBtn.addEventListener("click", () => {

        removeToast(toast);

    });


    // Auto remove
    setTimeout(() => {

        removeToast(toast);

    }, 4000);


    function removeToast(element) {

        if (!element || !element.parentNode) {
            return;
        }

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

async function signUp() {

    const name = sname.value.trim();
    const email = semail.value.trim();
    const password = spassword.value;


    // ================================
    // VALIDATION
    // ================================

    if (name === "") {

        showToast(
            "error",
            "Name Required",
            "Please enter your name."
        );

        return;
    }


    if (email === "") {

        showToast(
            "error",
            "Email Required",
            "Please enter your email address."
        );

        return;
    }


    if (password === "") {

        showToast(
            "error",
            "Password Required",
            "Please enter your password."
        );

        return;
    }


    if (password.length < 6) {

        showToast(
            "error",
            "Weak Password",
            "Password must be at least 6 characters."
        );

        return;
    }


    // Disable button while creating account
    const signupButton =
        document.querySelector(".sign-up-container button");

    if (signupButton) {
        signupButton.disabled = true;
        signupButton.innerText = "Creating...";
    }


    // ================================
    // FIREBASE AUTHENTICATION
    // ================================

    try {

        const userCredential =
            await firebase
                .auth()
                .createUserWithEmailAndPassword(
                    email,
                    password
                );


        // Get Firebase User
        const user = userCredential.user;

        // Get unique Firebase UID
        const uid = user.uid;


        console.log("Authentication successful!");
        console.log("User UID:", uid);


        // ================================
        // SAVE USER TO REALTIME DATABASE
        // ================================

        try {

            await firebase
                .database()
                .ref("users/" + uid)
                .set({

                    uid: uid,

                    name: name,

                    email: email,

                    createdAt: new Date().toISOString()

                });


            console.log("Database data saved successfully!");


            // ================================
            // FINAL SUCCESS
            // ================================

            showToast(
                "success",
                "Account Created!",
                "Your account and profile were created successfully."
            );


            // Clear inputs
            sname.value = "";
            semail.value = "";
            spassword.value = "";


            // Change panel
            setTimeout(() => {

                container.classList.remove(
                    "right-panel-active"
                );

            }, 2000);


        } catch (databaseError) {

            console.error(
                "DATABASE ERROR:",
                databaseError
            );


            // IMPORTANT:
            // Authentication already succeeded
            showToast(
                "error",
                "Profile Save Failed",
                "Account was created, but your profile could not be saved."
            );


            console.error(
                "Database error code:",
                databaseError.code
            );

            console.error(
                "Database error message:",
                databaseError.message
            );
        }


    } catch (authError) {

        console.error(
            "AUTHENTICATION ERROR:",
            authError
        );


        let errorMessage =
            "Something went wrong. Please try again.";


        // ================================
        // FIREBASE AUTH ERRORS
        // ================================

        if (
            authError.code ===
            "auth/email-already-in-use"
        ) {

            errorMessage =
                "This email is already registered.";

        }

        else if (
            authError.code ===
            "auth/invalid-email"
        ) {

            errorMessage =
                "Please enter a valid email address.";

        }

        else if (
            authError.code ===
            "auth/weak-password"
        ) {

            errorMessage =
                "Password must be at least 6 characters.";

        }

        else if (
            authError.code ===
            "auth/network-request-failed"
        ) {

            errorMessage =
                "Network connection failed.";

        }

        else if (
            authError.code ===
            "auth/operation-not-allowed"
        ) {

            errorMessage =
                "Email/Password authentication is not enabled.";

        }


        showToast(
            "error",
            "Sign Up Failed",
            errorMessage
        );
    }


    // Enable button again
    if (signupButton) {

        signupButton.disabled = false;

        signupButton.innerText = "Sign Up";

    }
}