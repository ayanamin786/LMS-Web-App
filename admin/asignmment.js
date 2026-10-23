  const form = document.getElementById('assignmentForm');
        const submitButton = document.getElementById('submitButton');
        const courseInput = document.getElementById('course');
        const rollInput = document.getElementById('rollNumber');
        const dueDateInput = document.getElementById('dueDate');
        const descriptionInput = document.getElementById('description');
        const toast = document.getElementById('toast');
        const studentsByRoll = new Map();
        let toastTimer;

        function localDateInputValue(date) {
            const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
            return localDate.toISOString().slice(0, 10);
        }

        dueDateInput.min = localDateInputValue(new Date());
        dueDateInput.value = dueDateInput.min;

        function showToast(message, isError) {
            window.clearTimeout(toastTimer);
            document.getElementById('toastMessage').textContent = message;
            document.getElementById('toastIcon').className = isError
                ? 'ph ph-warning-circle'
                : 'ph ph-check-circle';
            toast.classList.toggle('error', Boolean(isError));
            toast.hidden = false;
            toastTimer = window.setTimeout(() => {
                toast.hidden = true;
            }, 5500);
        }

        function normalizedCourse(value) {
            return String(value || '').trim().toLocaleLowerCase();
        }

        function studentRoll(student) {
            return student && student.rollNum !== undefined && student.rollNum !== null
                ? String(student.rollNum).trim()
                : '';
        }

        function updatePreview() {
            const title = document.getElementById('assignmentTitle').value.trim();
            const course = courseInput.value.trim();
            const dueDate = dueDateInput.value;
            const points = document.getElementById('points').value;
            document.getElementById('previewTitle').textContent = title || 'Your assignment title';
            document.getElementById('previewDescription').textContent =
                descriptionInput.value.trim() || 'Your instructions will appear here so students know exactly where to begin.';
            document.getElementById('previewCourse').textContent = course || 'Course not selected';
            document.getElementById('previewDue').textContent = dueDate
                ? new Date(`${dueDate}T00:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                : 'No due date set';
            document.getElementById('previewPoints').textContent = `${points || '0'} points`;
            document.getElementById('descriptionCount').textContent = String(descriptionInput.value.length);
            updateTargetSummary();
        }

        function updateTargetSummary() {
            const course = courseInput.value.trim();
            const roll = rollInput.value.trim();
            const courseStudents = [...studentsByRoll.entries()].filter(([, student]) =>
                normalizedCourse(student.course) === normalizedCourse(course)
            );
            if (roll) {
                const match = studentsByRoll.get(roll);
                document.getElementById('targetSummary').textContent = match
                    ? `Assignment will go to ${[match.firstName, match.lastName].filter(Boolean).join(' ') || `roll no. ${roll}`}`
                    : 'Assignment will go to one student';
                document.getElementById('targetHelp').textContent = match
                    ? `Roll no. ${roll} · ${match.course || 'Course not listed'}`
                    : `The student with roll number ${roll} must be enrolled in the selected course.`;
                document.getElementById('rosterCount').textContent = match ? '1 student' : 'Check roll';
                return;
            }
            document.getElementById('targetSummary').textContent = course
                ? `Assignment will go to ${course}`
                : 'Assignment will go to the selected course';
            document.getElementById('targetHelp').textContent = course
                ? `${courseStudents.length} enrolled ${courseStudents.length === 1 ? 'student' : 'students'} match this course.`
                : 'Choose a course above. An individual roll number limits delivery to just that student.';
            document.getElementById('rosterCount').textContent = studentsByRoll.size
                ? `${courseStudents.length} ${courseStudents.length === 1 ? 'student' : 'students'}`
                : 'Roster unavailable';
        }

        async function loadRosterAndCourses() {
            const count = document.getElementById('rosterCount');
            try {
                const database = firebase.database();
                const [studentSnapshot, courseSnapshot] = await Promise.all([
                    database.ref('enrollStudents').get(),
                    database.ref('allCourses').get()
                ]);
                const courseNames = new Set();
                if (studentSnapshot.exists()) {
                    studentSnapshot.forEach((child) => {
                        const student = child.val();
                        const roll = studentRoll(student);
                        if (roll && student && typeof student === 'object') {
                            studentsByRoll.set(roll, student);
                            if (student.course) {
                                courseNames.add(String(student.course).trim());
                            }
                        }
                    });
                }
                if (courseSnapshot.exists()) {
                    courseSnapshot.forEach((child) => {
                        const course = child.val();
                        if (course && course.CourseName) {
                            courseNames.add(String(course.CourseName).trim());
                        }
                    });
                }
                const options = [...courseNames].filter(Boolean).sort((a, b) => a.localeCompare(b))
                    .map((name) => {
                        const option = document.createElement('option');
                        option.value = name;
                        return option;
                    });
                document.getElementById('courseOptions').replaceChildren(...options);
                count.textContent = `${studentsByRoll.size} ${studentsByRoll.size === 1 ? 'student' : 'students'}`;
                updatePreview();
            } catch (error) {
                console.error('Unable to load assignment course roster:', error);
                count.textContent = 'Unavailable';
                document.getElementById('targetHelp').textContent =
                    'Could not load the roster. Check Firebase read permissions, then refresh this page.';
            }
        }

        form.querySelectorAll('input, textarea').forEach((field) => {
            field.addEventListener('input', updatePreview);
            field.addEventListener('change', updatePreview);
        });

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!form.reportValidity()) {
                return;
            }

            const title = document.getElementById('assignmentTitle').value.trim();
            const description = descriptionInput.value.trim();
            const course = courseInput.value.trim();
            const roll = rollInput.value.trim();
            const dueDate = dueDateInput.value;
            const points = Number(document.getElementById('points').value);

            if (!/^\d+$/.test(roll) && roll) {
                showToast('Roll number should contain digits only.', true);
                rollInput.focus();
                return;
            }
            if (!dueDate || dueDate < localDateInputValue(new Date())) {
                showToast('Choose a due date that is today or later.', true);
                dueDateInput.focus();
                return;
            }

            let recipients;
            if (roll) {
                const student = studentsByRoll.get(roll);
                if (!student) {
                    showToast(`No student with roll number ${roll} was found. Check the roll number and reload the roster.`, true);
                    return;
                }
                if (normalizedCourse(student.course) !== normalizedCourse(course)) {
                    showToast('That student is not enrolled in the selected course.', true);
                    return;
                }
                recipients = [roll];
            } else {
                recipients = [...studentsByRoll.entries()]
                    .filter(([, student]) => normalizedCourse(student.course) === normalizedCourse(course))
                    .map(([studentNumber]) => studentNumber);
                if (!recipients.length) {
                    showToast('No enrolled students match this course. Check the course name or choose one student by roll number.', true);
                    return;
                }
            }

            submitButton.disabled = true;
            submitButton.querySelector('span').textContent = 'Publishing…';
            try {
                const database = firebase.database();
                const assignmentId = database.ref('studentAssignments').push().key;
                if (!assignmentId) {
                    throw new Error('Firebase did not create an assignment ID.');
                }
                const createdAt = new Date().toISOString();
                const updates = {};
                recipients.forEach((recipientRoll) => {
                    updates[`studentAssignments/${recipientRoll}/${assignmentId}`] = {
                        assignmentId,
                        title,
                        description,
                        course,
                        dueDate,
                        points,
                        status: 'assigned',
                        createdAt
                    };
                });
                await database.ref().update(updates);
                showToast(`Assignment published for ${recipients.length} ${recipients.length === 1 ? 'student' : 'students'}.`);
                form.reset();
                dueDateInput.value = dueDateInput.min;
                document.getElementById('points').value = '100';
                updatePreview();
            } catch (error) {
                console.error('Unable to publish assignment:', error);
                showToast('Could not publish the assignment. Check Firebase write permissions and try again.', true);
            } finally {
                submitButton.disabled = false;
                submitButton.querySelector('span').textContent = 'Publish assignment';
            }
        });

        loadRosterAndCourses();
        updatePreview();