const studentRoll = sessionStorage.getItem('volexaStudentRoll');
const portal = document.getElementById('portal');
const portalError = document.getElementById('portalError');
const loadNotice = document.getElementById('loadNotice');

if (!studentRoll || !/^\d+$/.test(studentRoll)) {
    window.location.replace('lms.login.html');
} else {
    portal.hidden = false;
    loadStudentPortal(studentRoll);
}

document.getElementById('signOut').addEventListener('click', () => {
    sessionStorage.removeItem('volexaStudentRoll');
    window.location.replace('lms.login.html');
});

document.querySelectorAll('.side-link').forEach((link) => {
    link.addEventListener('click', () => {
        document.querySelectorAll('.side-link').forEach((item) => {
            item.classList.toggle('is-active', item === link);
        });
    });
});

function normalizeRecords(value) {
    if (Array.isArray(value)) {
        return value.filter((item) => item && typeof item === 'object');
    }
    if (!value || typeof value !== 'object') {
        return [];
    }

    const recordFields = ['title', 'name', 'assignmentName', 'quizName', 'status', 'score', 'date'];
    if (recordFields.some((field) => Object.prototype.hasOwnProperty.call(value, field))) {
        return [value];
    }

    return Object.values(value).filter((item) => item && typeof item === 'object');
}

function getField(record, fields) {
    for (const field of fields) {
        if (record[field] !== undefined && record[field] !== null && record[field] !== '') {
            return record[field];
        }
    }
    return '';
}

function formatDate(value) {
    if (!value) {
        return '';
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? String(value)
        : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function setText(id, value) {
    document.getElementById(id).textContent = value;
}

function showEmptyState(container, icon, title, description) {
    const state = document.createElement('div');
    state.className = 'empty-state';
    const glyph = document.createElement('i');
    glyph.className = `ph ${icon}`;
    glyph.setAttribute('aria-hidden', 'true');
    const heading = document.createElement('strong');
    heading.textContent = title;
    const note = document.createElement('span');
    note.textContent = description;
    state.append(glyph, heading, note);
    container.replaceChildren(state);
}

function renderRecords(containerId, records, type) {
    const container = document.getElementById(containerId);
    const isQuiz = type === 'quiz';
    const emptyTitle = isQuiz ? 'No quizzes just yet' : 'Nothing assigned yet';
    const emptyDescription = isQuiz
        ? 'Your quiz activity will show up here.'
        : 'New work from your instructor will appear here.';

    if (!records.length) {
        showEmptyState(
            container,
            isQuiz ? 'ph-seal-question' : 'ph-notebook',
            emptyTitle,
            emptyDescription
        );
        return;
    }

    const items = records.map((record) => {
        const item = document.createElement('div');
        item.className = 'record-item';

        const icon = document.createElement('span');
        icon.className = 'record-icon';
        const iconGlyph = document.createElement('i');
        iconGlyph.className = isQuiz ? 'ph ph-seal-question' : 'ph ph-file-text';
        iconGlyph.setAttribute('aria-hidden', 'true');
        icon.append(iconGlyph);

        const copy = document.createElement('span');
        copy.className = 'record-copy';
        const title = document.createElement('strong');
        title.textContent = String(getField(record, isQuiz
            ? ['title', 'name', 'quizName', 'topic']
            : ['title', 'name', 'assignmentName', 'task']) || (isQuiz ? 'Quiz' : 'Assignment'));
        const detail = document.createElement('small');
        const dueDate = formatDate(getField(record, ['dueDate', 'deadline', 'date']));
        const score = getField(record, ['score', 'marks', 'result']);
        const detailParts = [];
        if (dueDate) {
            detailParts.push(`${isQuiz ? 'Completed' : 'Due'} ${dueDate}`);
        }
        if (score !== '') {
            detailParts.push(`Score: ${score}`);
        }
        detail.textContent = detailParts.join(' · ') || (isQuiz ? 'Quiz activity' : 'No due date set');
        copy.append(title, detail);

        const status = String(getField(record, ['status', 'state']) || (score !== '' ? 'completed' : 'assigned'));
        const badge = document.createElement('span');
        badge.className = 'record-status';
        if (/complete|submitted|graded|passed|done|present/i.test(status)) {
            badge.classList.add('is-done');
        } else if (/pending|assigned|upcoming|late/i.test(status)) {
            badge.classList.add('is-open');
        }
        badge.textContent = status;
        item.append(icon, copy, badge);
        return item;
    });

    container.replaceChildren(...items);
}

function renderAttendance(records) {
    const container = document.getElementById('attendanceList');
    if (!records.length) {
        showEmptyState(
            container,
            'ph-calendar-check',
            'Attendance will appear here',
            'Once your classes are recorded, you can keep track here.'
        );
        setText('attendanceSummary', 'No attendance records yet');
        return;
    }

    let presentCount = 0;
    let markedCount = 0;
    const items = records.map((record) => {
        const statusValue = getField(record, ['status', 'attendance', 'state']);
        const isPresent = record.present === true
            || String(statusValue).toLowerCase() === 'present'
            || String(statusValue).toLowerCase() === 'attended';
        const isAbsent = record.present === false
            || String(statusValue).toLowerCase() === 'absent';
        if (isPresent || isAbsent) {
            markedCount += 1;
        }
        if (isPresent) {
            presentCount += 1;
        }

        const item = document.createElement('div');
        item.className = 'attendance-record';
        const date = document.createElement('strong');
        date.textContent = formatDate(getField(record, ['date', 'day', 'createdAt'])) || 'Class';
        const status = document.createElement('span');
        status.textContent = String(statusValue || (isPresent ? 'Present' : isAbsent ? 'Absent' : 'Recorded'));
        if (isAbsent) {
            status.classList.add('is-absent');
        }
        item.append(date, status);
        return item;
    });

    container.replaceChildren(...items);
    if (markedCount) {
        const rate = Math.round((presentCount / markedCount) * 100);
        setText('attendanceSummary', `${presentCount} of ${markedCount} classes · ${rate}%`);
        setText('attendanceValue', `${rate}%`);
        setText('attendanceNote', `${presentCount} present out of ${markedCount} marked`);
    } else {
        setText('attendanceSummary', `${records.length} ${records.length === 1 ? 'record' : 'records'}`);
        setText('attendanceNote', 'Attendance records available');
    }
}

function readProgress(student, progressData) {
    const fields = ['progressPercent', 'courseProgress', 'progress', 'completion'];
    const studentProgress = getField(student, fields);
    const nestedStudentProgress = studentProgress && typeof studentProgress === 'object'
        ? getField(studentProgress, ['percent', 'percentage', 'progressPercent', 'completion', 'value'])
        : '';
    const fromProgress = typeof progressData === 'number' || typeof progressData === 'string'
        ? progressData
        : getField(progressData || {}, ['percent', 'percentage', 'progressPercent', 'completion', 'value']);
    const rawValue = studentProgress !== '' && typeof studentProgress !== 'object'
        ? studentProgress
        : nestedStudentProgress !== '' ? nestedStudentProgress : fromProgress;
    if (rawValue === '' || rawValue === null || rawValue === undefined || typeof rawValue === 'object') {
        return null;
    }
    const percentage = Number(String(rawValue).replace('%', '').trim());
    return Number.isFinite(percentage) ? Math.max(0, Math.min(100, percentage)) : null;
}

function updateSummary(student, assignments, quizzes, attendance, progressData) {
    const completed = assignments.filter((item) =>
        /complete|submitted|graded|done/i.test(String(getField(item, ['status', 'state'])))
    ).length;
    setText('assignmentCount', String(assignments.length));
    if (assignments.length) {
        setText('assignmentValue', `${completed}/${assignments.length}`);
        setText('assignmentNote', `${completed} completed · ${assignments.length - completed} to go`);
    }

    const quizScores = quizzes
        .map((item) => Number(getField(item, ['score', 'percentage', 'marksObtained'])))
        .filter((score) => Number.isFinite(score));
    setText('quizCount', String(quizzes.length));
    if (quizScores.length) {
        const average = Math.round(quizScores.reduce((total, score) => total + score, 0) / quizScores.length);
        setText('quizValue', `${average}%`);
        setText('quizNote', `Average across ${quizScores.length} scored ${quizScores.length === 1 ? 'quiz' : 'quizzes'}`);
    }

    const percentage = readProgress(student, progressData);
    if (percentage !== null) {
        setText('progressValue', `${Math.round(percentage)}%`);
        document.getElementById('progressBar').style.width = `${percentage}%`;
        setText('progressNote', 'Course completion reported by your instructor');
    }
    renderAttendance(attendance);
}

function showPortalError(message) {
    portal.hidden = true;
    portalError.hidden = false;
    portalError.textContent = message;
}

async function readStudentRecords(database, path, roll) {
    try {
        const snapshot = await database.ref(path).child(roll).get();
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error(`Unable to load ${path} for this student:`, error);
        loadNotice.hidden = false;
        loadNotice.textContent = 'Some learning records could not be loaded. Check the database read permissions for your student account.';
        return null;
    }
}

async function loadStudentPortal(roll) {
    const database = firebase.database();
    try {
        const studentsRef = database.ref('enrollStudents');
        let snapshot = await studentsRef.orderByChild('rollNum').equalTo(roll).get();
        if (!snapshot.exists()) {
            snapshot = await studentsRef.orderByChild('rollNum').equalTo(Number(roll)).get();
        }
        if (!snapshot.exists()) {
            sessionStorage.removeItem('volexaStudentRoll');
            showPortalError('We could not find a student record for this roll number. Please sign in again or contact your course team.');
            return;
        }
        if (snapshot.numChildren() > 1) {
            sessionStorage.removeItem('volexaStudentRoll');
            showPortalError('More than one student record uses this roll number. Please contact your course team to resolve it.');
            return;
        }

        let student = null;
        snapshot.forEach((child) => {
            student = child.val();
        });
        if (!student || typeof student !== 'object') {
            sessionStorage.removeItem('volexaStudentRoll');
            showPortalError('Your student record could not be read. Please contact your course team.');
            return;
        }

        const [assignmentData, quizData, attendanceData, progressData] = await Promise.all([
            readStudentRecords(database, 'studentAssignments', roll),
            readStudentRecords(database, 'studentQuizzes', roll),
            readStudentRecords(database, 'studentAttendance', roll),
            readStudentRecords(database, 'studentProgress', roll)
        ]);
        const assignments = normalizeRecords(assignmentData ?? student.assignments);
        const quizzes = normalizeRecords(quizData ?? student.quizzes);
        const attendance = normalizeRecords(attendanceData ?? student.attendance);

        const name = [student.firstName, student.lastName].filter(Boolean).join(' ')
            || student.name
            || 'Student';
        const initials = name.split(/\s+/).filter(Boolean).slice(0, 2)
            .map((part) => part[0].toUpperCase()).join('') || 'S';
        setText('studentName', name);
        setText('chipName', name);
        setText('chipRoll', `Roll no. ${roll}`);
        setText('avatar', initials);
        setText('courseLine', student.course
            ? `You're enrolled in ${student.course}. Keep your momentum going.`
            : 'Your next step starts right here.');
        setText('todayLine', new Date().toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
        }).toUpperCase());

        renderRecords('assignmentList', assignments, 'assignment');
        renderRecords('quizList', quizzes, 'quiz');
        updateSummary(student, assignments, quizzes, attendance, progressData ?? student.progress);
    } catch (error) {
        console.error('Unable to load the student portal:', error);
        const code = error && error.code ? error.code : '';
        const detail = error && error.message ? error.message : '';
        let message = 'We could not load your student portal. Check your connection and try signing in again.';
        if (code.includes('PERMISSION_DENIED') || code.includes('permission-denied')) {
            message = 'Database access was denied. Please ask your administrator to check Firebase read permissions for the student portal.';
        } else if (/index.*not defined|requires an index/i.test(detail)) {
            message = 'Index is in the wrong place. In Firebase Console → Realtime Database → Rules, move ".indexOn": ["rollNum"] inside "enrollStudents", then Publish and reload. Example: "enrollStudents": { ".indexOn": ["rollNum"] }. A root-level index will not index records under /enrollStudents.';
        }
        showPortalError(message);
    }
}
