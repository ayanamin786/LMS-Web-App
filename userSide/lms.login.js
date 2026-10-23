
const loginForm = document.getElementById('loginForm');
const rollInput = document.getElementById('roll');
const loginButton = document.getElementById('login');
const toastContainer = document.getElementById('toastContainer');

if (sessionStorage.getItem('volexaStudentRoll')) {
    window.location.replace('lms.portal.html');
}

function showToast(title, message, type) {
    toastContainer.replaceChildren();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.setAttribute('role', 'alert');

    const icon = document.createElement('i');
    icon.className = type === 'success'
        ? 'ph ph-check-circle toast-icon'
        : 'ph ph-x-circle toast-icon';

    icon.setAttribute('aria-hidden', 'true');

    const content = document.createElement('div');
    content.className = 'toast-content';

    const titleText = document.createElement('div');
    titleText.className = 'toast-title';
    titleText.textContent = title;

    const messageText = document.createElement('div');
    messageText.className = 'toast-message';
    messageText.textContent = message;

    content.append(titleText, messageText);
    toast.append(icon, content);
    toastContainer.append(toast);

    setTimeout(() => {
        if (toast.isConnected) {
            toast.remove();
        }
    }, 5000);
}

function getErrorMessage(error) {
    const code = error?.code || 'no error code';
    const message = error?.message || String(error);

    console.error('Firebase error details:', {
        code,
        message,
        name: error?.name,
        error
    });

    if (
        code.includes('PERMISSION_DENIED') ||
        code.includes('permission-denied')
    ) {
        return 'Firebase rules denied access. Check your Realtime Database rules.';
    }

    if (
        code.includes('NETWORK') ||
        code.includes('unavailable') ||
        /network|offline|fetch failed/i.test(message)
    ) {
        return 'Network error. Check your internet connection and Firebase database URL.';
    }

    if (
        /index.*not defined|requires an index/i.test(message)
    ) {
        return 'The rollNum index must be inside "enrollStudents", not at the root. Add "enrollStudents": { ".indexOn": ["rollNum"] } in Realtime Database → Rules, then Publish.';
    }

    return `Code: ${code}. Details: ${message}`;
}

loginForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const rollNumber = rollInput.value.trim();

    if (!/^\d+$/.test(rollNumber)) {
        showToast(
            'Invalid Roll Number',
            'Enter a roll number containing digits only.',
            'error'
        );
        return;
    }

    if (
        typeof firebase === 'undefined' ||
        !firebase.apps.length ||
        !firebase.database
    ) {
        showToast(
            'Firebase Not Initialized',
            'Check your Firebase SDK scripts and configuration.',
            'error'
        );
        return;
    }

    loginButton.disabled = true;
    loginButton.querySelector('span').textContent = 'Checking roll number…';

    try {
        const studentsRef = firebase.database().ref('enrollStudents');

        let snapshot = await studentsRef
            .orderByChild('rollNum')
            .equalTo(rollNumber)
            .once('value');

        if (!snapshot.exists()) {
            snapshot = await studentsRef
                .orderByChild('rollNum')
                .equalTo(Number(rollNumber))
                .once('value');
        }

        if (!snapshot.exists()) {
            showToast(
                'Student Not Found',
                'No matching roll number was found in enrollStudents.',
                'error'
            );
            return;
        }

        if (snapshot.numChildren() > 1) {
            showToast(
                'Duplicate Roll Number',
                'Multiple students have this roll number. Contact the administrator.',
                'error'
            );
            return;
        }

        let student = null;

        snapshot.forEach(function (childSnapshot) {
            student = childSnapshot.val();
        });

        if (!student || typeof student !== 'object') {
            showToast(
                'Invalid Student Data',
                'The matching database record is empty or invalid.',
                'error'
            );
            return;
        }

        sessionStorage.setItem('volexaStudentRoll', rollNumber);
        window.location.assign('lms.portal.html');
    } catch (error) {
        const message = getErrorMessage(error);

        showToast(
            'Search Failed',
            message,
            'error'
        );
    } finally {
        loginButton.disabled = false;
        loginButton.querySelector('span').textContent = 'Open my portal';
    }
});
