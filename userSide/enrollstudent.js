const CLOUDINARY_CLOUD_NAME = 'dwes3qupj';
const CLOUDINARY_UPLOAD_PRESET = 'quizapp_upload';

const enrollmentForm = document.getElementById('enrollmentForm');
const courseContainer = document.getElementById('allcoursesCard');
const emailInput = document.getElementById('email');
const submitButton = document.getElementById('submit-btn');
const viewCardButton = document.getElementById('viewCard');
const successMessage = document.getElementById('successMessage');
const enrollmentError = document.getElementById('enrollmentError');
const toastContainer = document.getElementById('toastContainer');
const imageInput = document.getElementById('imageUpload');
let currentUser = null;
let coursesLoaded = false;

function showToast(type, title, message) {
    const toast = document.createElement('div');
    toast.className = `enrollment-toast ${type}`;
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');

    const icon = document.createElement('i');
    icon.className = type === 'success'
        ? 'ph ph-check-circle'
        : type === 'warning'
            ? 'ph ph-warning-circle'
            : 'ph ph-x-circle';
    icon.setAttribute('aria-hidden', 'true');

    const content = document.createElement('div');
    content.className = 'enrollment-toast-content';
    const titleElement = document.createElement('strong');
    titleElement.textContent = title;
    const messageElement = document.createElement('span');
    messageElement.textContent = message;
    content.append(titleElement, messageElement);

    const closeButton = document.createElement('button');
    closeButton.className = 'enrollment-toast-close';
    closeButton.type = 'button';
    closeButton.setAttribute('aria-label', 'Dismiss notification');
    closeButton.textContent = '×';
    closeButton.addEventListener('click', () => toast.remove());

    toast.append(icon, content, closeButton);
    toastContainer.replaceChildren(toast);
    window.setTimeout(() => {
        if (toast.isConnected) toast.remove();
    }, 5000);
}

function showEnrollmentError(message) {
    enrollmentError.textContent = message;
    enrollmentError.hidden = false;
}

function clearEnrollmentError() {
    enrollmentError.textContent = '';
    enrollmentError.hidden = true;
}

function showCardButton(enrollmentId) {
    viewCardButton.dataset.enrollmentId = enrollmentId;
    viewCardButton.hidden = false;
}

function redirectToLogin() {
    window.location.replace('./login.html?next=studentEnroll.html');
}

function renderCourses(courses) {
    courseContainer.replaceChildren();
    coursesLoaded = false;

    if (!courses.length) {
        courseContainer.textContent = 'No courses are available right now.';
        return;
    }

    courses.forEach(({ id, course }) => {
        const label = document.createElement('label');
        label.className = 'course-card';

        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'course';
        radio.value = id;
        radio.dataset.courseName = course.CourseName.trim();
        radio.required = true;
        radio.id = `course-${id}`;

        const content = document.createElement('span');
        content.className = 'course-content';

        const info = document.createElement('span');
        info.className = 'course-info';

        const title = document.createElement('span');
        title.className = 'course-title';
        title.textContent = course.CourseName.trim();

        const details = document.createElement('span');
        details.className = 'course-details';
        [
            course.teacherName && `Instructor: ${course.teacherName}`,
            course.duration && `Duration: ${course.duration}`,
            course.fees && `Fee: ${course.fees}`
        ].filter(Boolean).forEach(detail => {
            const item = document.createElement('span');
            item.textContent = detail;
            details.append(item);
        });

        const radioCustom = document.createElement('span');
        radioCustom.className = 'radio-custom';
        radioCustom.setAttribute('aria-hidden', 'true');

        info.append(title, details);
        content.append(info, radioCustom);
        label.append(radio, content);
        courseContainer.append(label);
    });

    coursesLoaded = true;
}

async function loadCourses() {
    try {
        const snapshot = await firebase.database().ref('allCourses').get();
        const records = snapshot.val();
        const courses = records && typeof records === 'object'
            ? Object.entries(records)
                .filter(([, course]) => course && typeof course.CourseName === 'string' && course.CourseName.trim())
                .map(([id, course]) => ({ id, course }))
            : [];
        renderCourses(courses);
        if (!courses.length) {
            showToast('warning', 'No courses available', 'Please try again after courses have been added.');
        }
    } catch (error) {
        console.error('Unable to load courses for enrollment:', error);
        courseContainer.textContent = 'Courses could not be loaded. Please refresh and try again.';
        showEnrollmentError('Course list could not be loaded from Firebase. Please refresh the page and try again.');
        showToast('error', 'Courses unavailable', 'Could not load courses from Firebase.');
    }
}

async function loadExistingCard(user) {
    try {
        const snapshot = await firebase.database()
            .ref(`users/${user.uid}/enrollments`)
            .get();
        if (!snapshot.exists()) return;

        const records = snapshot.val();
        const sortedRecords = Object.entries(records)
            .sort(([, first], [, second]) => Date.parse(second.createdAt || '') - Date.parse(first.createdAt || ''));
        if (sortedRecords.length) showCardButton(sortedRecords[0][0]);
    } catch (error) {
        console.error('Unable to load the signed-in user enrollment:', error);
        showToast('error', 'Saved card unavailable', 'Your existing card could not be checked. You can still submit an enrollment.');
    }
}

async function uploadProfileImage(file) {
    if (!file) return { imageUrl: '', imagePublicId: '' };

    if (!file.type.startsWith('image/')) {
        throw new Error('Choose a valid image file.');
    }
    if (file.size > 5 * 1024 * 1024) {
        throw new Error('Profile image must be 5 MB or smaller.');
    }

    const uploadData = new FormData();
    uploadData.append('file', file);
    uploadData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    uploadData.append('folder', 'volexa/student-profiles');

    const response = await fetch(
        `https://api.cloudinary.com/v1_1/${encodeURIComponent(CLOUDINARY_CLOUD_NAME)}/image/upload`,
        { method: 'POST', body: uploadData }
    );
    const result = await response.json();
    if (!response.ok || !result.secure_url) {
        console.error('Cloudinary upload failed:', result);
        throw new Error(result.error && result.error.message
            ? `Image upload failed: ${result.error.message}`
            : 'Image upload failed. Please try again.');
    }

    return {
        imageUrl: result.secure_url,
        imagePublicId: result.public_id || ''
    };
}

viewCardButton.addEventListener('click', function () {
    const enrollmentId = viewCardButton.dataset.enrollmentId;
    if (!enrollmentId) {
        showToast('error', 'Card unavailable', 'Your card link is not available. Refresh the page and try again.');
        return;
    }
    window.location.assign(`./viewCard.html?id=${encodeURIComponent(enrollmentId)}`);
});

enrollmentForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    clearEnrollmentError();
    successMessage.style.display = 'none';

    if (!currentUser) {
        showToast('error', 'Sign in required', 'Please sign in before completing your enrollment.');
        return;
    }
    if (!coursesLoaded) {
        showToast('warning', 'Courses are loading', 'Wait for the course list to finish loading, then try again.');
        return;
    }

    const selectedCourse = enrollmentForm.querySelector('input[name="course"]:checked');
    if (!selectedCourse) {
        showToast('error', 'Choose a course', 'Select a course before completing enrollment.');
        return;
    }

    submitButton.disabled = true;
    const submitText = submitButton.querySelector('span');
    const originalSubmitText = submitText ? submitText.textContent : '→';
    if (submitText) submitText.textContent = 'Uploading and saving...';
    showToast('warning', 'Saving enrollment', 'Uploading your image and saving your details securely.');

    try {
        const imageDetails = await uploadProfileImage(imageInput.files[0]);
        const now = new Date().toISOString();
        const nameParts = currentUser.displayName ? currentUser.displayName.trim().split(/\s+/) : [];
        const enrollment = {
            userId: currentUser.uid,
            firstName: document.getElementById('firstName').value.trim() || nameParts[0] || '',
            lastName: document.getElementById('lastName').value.trim() || nameParts.slice(1).join(' '),
            email: currentUser.email || emailInput.value.trim(),
            phone: document.getElementById('phone').value.trim(),
            course: selectedCourse.dataset.courseName,
            courseId: selectedCourse.value,
            experience: document.getElementById('experience').value,
            message: document.getElementById('message').value.trim(),
            newsletter: document.getElementById('newsletter').checked,
            imageUrl: imageDetails.imageUrl,
            imagePublicId: imageDetails.imagePublicId,
            createdAt: now,
            updatedAt: now,
            rollNum: Math.floor(100000 + Math.random() * 900000),
        };

        const database = firebase.database();
        const enrollmentRef = database.ref('enrollStudents').push();
        if (!enrollmentRef.key) throw new Error('Firebase could not create an enrollment ID.');

        const updates = {};
        updates[`enrollStudents/${enrollmentRef.key}`] = enrollment;
        updates[`users/${currentUser.uid}/enrollments/${enrollmentRef.key}`] = enrollment;
        await database.ref().update(updates);

        showCardButton(enrollmentRef.key);
        successMessage.style.display = 'block';
        successMessage.textContent = 'Enrollment saved successfully. Select “View Your Card” to open your student card.';
        showToast('success', 'Enrolled successfully!', 'Your details and Cloudinary image URL are saved. Use “View Your Card” to open your card.');
    } catch (error) {
        console.error('Unable to complete student enrollment:', error);
        const message = error instanceof Error
            ? error.message
            : 'Enrollment could not be saved. Please try again.';
        showEnrollmentError(message);
        showToast('error', 'Enrollment failed', message);
    } finally {
        submitButton.disabled = false;
        if (submitText) submitText.textContent = originalSubmitText;
    }
});

firebase.auth().onAuthStateChanged(user => {
    if (!user) {
        redirectToLogin();
        return;
    }

    currentUser = user;
    if (user.email) {
        emailInput.value = user.email;
        emailInput.readOnly = true;
    }

    if (user.displayName) {
        const nameParts = user.displayName.trim().split(/\s+/);
        document.getElementById('firstName').value = nameParts.shift() || '';
        document.getElementById('lastName').value = nameParts.join(' ');
    }

    loadCourses();
    loadExistingCard(user);
});
