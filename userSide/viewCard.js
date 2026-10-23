const cardStatus = document.getElementById('cardStatus');
const enrollmentId = new URLSearchParams(window.location.search).get('id');
const cardWrapper = document.getElementById('cardWrapper');
const flipButton = document.getElementById('flipButton');
const downloadButton = document.getElementById('downloadButton');
const currentYear = new Date().getFullYear();

document.getElementById('validYear').textContent = currentYear;
document.getElementById('validFooter').textContent = `VALID · ${currentYear}`;

if (flipButton && cardWrapper) {
    flipButton.addEventListener('click', function () {
        const isFlipped = cardWrapper.classList.toggle('flipped');
        flipButton.setAttribute('aria-pressed', String(isFlipped));
    });
}

if (downloadButton) {
    downloadButton.addEventListener('click', downloadStudentCard);
}

function setCardStatus(message) {
    if (cardStatus) cardStatus.textContent = message;
}

async function downloadStudentCard() {
    if (!enrollmentId) {
        setCardStatus('Student card is not ready to download.');
        return;
    }

    if (typeof html2canvas !== 'function' || !window.jspdf) {
        setCardStatus('PDF tools could not be loaded. Please refresh the page and try again.');
        return;
    }

    downloadButton.disabled = true;
    setCardStatus('Preparing both sides of your card...');
    cardWrapper.classList.add('pdf-mode');

    try {
        const faces = [...cardWrapper.querySelectorAll('.id-card')];
        const pdf = new window.jspdf.jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        for (let i = 0; i < faces.length; i += 1) {
            const canvas = await html2canvas(faces[i], {
                scale: 2,
                backgroundColor: '#ffffff',
                useCORS: true
            });
            const image = canvas.toDataURL('image/jpeg', 0.95);
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const imageWidth = 190;
            const imageHeight = imageWidth * canvas.height / canvas.width;

            if (i > 0) pdf.addPage();
            pdf.addImage(
                image,
                'JPEG',
                (pageWidth - imageWidth) / 2,
                (pageHeight - imageHeight) / 2,
                imageWidth,
                imageHeight
            );
        }

        const rollNumber = document.getElementById('cardRoll').textContent;
        const safeName = (rollNumber || 'student-card').replace(/[^a-z0-9-_]/gi, '-');
        pdf.save(`${safeName}-card.pdf`);
        setCardStatus('Your two-sided card PDF has been downloaded.');
    } catch (error) {
        console.error('Card PDF download error:', error);
        setCardStatus('Could not create the PDF. Please try again.');
    } finally {
        cardWrapper.classList.remove('pdf-mode');
        downloadButton.disabled = false;
    }
}

function createStudentQRCode(student, fullName) {
    const qrCode = document.getElementById('qrCode');
    if (!qrCode) return;

    if (typeof QRCode !== 'function') {
        setCardStatus('QR code could not be loaded. Please refresh the page to try again.');
        return;
    }

    qrCode.replaceChildren();

    const verificationUrl = new URL(window.location.href);
    verificationUrl.searchParams.set('id', enrollmentId);

    const qrData = JSON.stringify({
        type: 'STUDENT_ID',
        uid: enrollmentId,
        name: fullName,
        rollNumber: student.rollNum || '',
        email: student.email || '',
        course: student.course || '',
        verify: verificationUrl.href
    });

    new QRCode(qrCode, {
        text: qrData,
        width: 250,
        height: 250,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
    });
}

function displayStudentCard(student) {
    const fullName = [student.firstName, student.lastName]
        .filter(value => typeof value === 'string' && value.trim())
        .join(' ') || 'Student';
    const initials = fullName
        .split(/\s+/)
        .map(part => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
    const studentPic = document.getElementById('cardImage');
    const cardInitials = document.getElementById('cardInitials');

    document.getElementById('cardName').textContent = fullName;
    document.getElementById('cardEmail').textContent = student.email || 'Not provided';
    document.getElementById('cardRoll').textContent = student.rollNum || 'Not available';
    document.getElementById('cardCourse').textContent = student.course || 'Not specified';
    document.getElementById('cardPhone').textContent = student.phone || 'Not provided';
    document.getElementById('cardExperience').textContent = student.experience || 'Not specified';

    const enrollmentDate = student.createdAt ? new Date(student.createdAt) : null;
    document.getElementById('cardCreatedAt').textContent = enrollmentDate && !Number.isNaN(enrollmentDate.getTime())
        ? enrollmentDate.toLocaleDateString()
        : 'Not available';

    document.getElementById('cardMessage').textContent = student.message
        ? student.message.slice(0, 48)
        : 'Student learning record';
    document.getElementById('cardId').textContent = `ID: ${student.rollNum || enrollmentId}`;
    createStudentQRCode(student, fullName);

    cardInitials.textContent = initials || '?';
    if (typeof student.imageUrl === 'string' && student.imageUrl.trim()) {
        studentPic.crossOrigin = 'anonymous';
        studentPic.src = student.imageUrl;
        studentPic.hidden = false;
        cardInitials.hidden = true;
        studentPic.addEventListener('error', function () {
            studentPic.hidden = true;
            cardInitials.hidden = false;
        }, { once: true });
    } else {
        studentPic.hidden = true;
        cardInitials.hidden = false;
    }


}

async function loadStudentCard(user) {
    if (!enrollmentId) {
        document.getElementById('cardName').textContent = 'Student card unavailable';
        setCardStatus('Open this card using the View Card button after enrolling.');
        return;
    }

    try {
        const database = firebase.database();
        let snapshot = await database
            .ref('users')
            .child(user.uid)
            .child('enrollments')
            .child(enrollmentId)
            .get();

        if (!snapshot.exists()) {
            snapshot = await database
                .ref('enrollStudents')
                .child(enrollmentId)
                .get();
        }

        if (!snapshot.exists()) {
            document.getElementById('cardName').textContent = 'Student card unavailable';
            setCardStatus('No enrollment record was found for this card.');
            return;
        }

        const student = snapshot.val();
        if (!student || student.userId !== user.uid) {
            document.getElementById('cardName').textContent = 'Student card unavailable';
            setCardStatus('This card belongs to a different account or is not available.');
            return;
        }

        displayStudentCard(student);
    } catch (error) {
        console.error('Error loading student card:', error);
        document.getElementById('cardName').textContent = 'Unable to load student card';
        setCardStatus('Please refresh the page and try again.');
    }
}

firebase.auth().onAuthStateChanged(user => {
    if (!user) {
        const nextPage = `viewCard.html?id=${encodeURIComponent(enrollmentId || '')}`;
        window.location.replace(`./login.html?next=${encodeURIComponent(nextPage)}`);
        return;
    }

    loadStudentCard(user);
});
