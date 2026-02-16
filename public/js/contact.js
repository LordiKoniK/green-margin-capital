// ==========================================
// Contact Form Handler
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contactForm');
    const formStatus = document.getElementById('formStatus');

    if (contactForm) {
        contactForm.addEventListener('submit', handleContactFormSubmit);
    }
});

// Reactive scroll to map after clicking location info
document.addEventListener('DOMContentLoaded', function() {
    var locationInfo = document.getElementById('location-info');
    var mapIframe = document.querySelector('.map-section iframe');
    if (locationInfo && mapIframe) {
        locationInfo.style.cursor = 'pointer';
        locationInfo.title = 'Click to view map';
        locationInfo.addEventListener('click', function() {
            mapIframe.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }
});

async function handleContactFormSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const submitBtn = form.querySelector('.btn-submit');
    const formStatus = document.getElementById('formStatus');
    const originalBtnText = submitBtn.textContent;

    // Disable button and show loading state
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
    formStatus.style.display = 'none';

    // Get form data
    const formData = {
        firstName: form.firstName.value.trim(),
        lastName: form.lastName.value.trim(),
        email: form.email.value.trim(),
        phone: form.phone.value.trim(),
        subject: form.subject.value,
        message: form.message.value.trim()
    };

    // Basic client-side validation
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.subject || !formData.message) {
        showFormStatus('error', 'Please fill in all required fields.');
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
        return;
    }

    if (!isValidEmail(formData.email)) {
        showFormStatus('error', 'Please enter a valid email address.');
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
        return;
    }

    try {
        // Send to server
        const response = await fetch('/api/contact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            showFormStatus('success', 'Thank you for contacting us! We\'ll get back to you within 24 hours.');
            form.reset();
        } else {
            showFormStatus('error', result.message || 'Something went wrong. Please try again or call us directly.');
        }
    } catch (error) {
        console.error('Contact form error:', error);
        showFormStatus('error', 'Unable to send message. Please try again or contact us directly at info@greenmargincapital.com');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
    }
}

function showFormStatus(type, message) {
    const formStatus = document.getElementById('formStatus');
    formStatus.className = `form-status ${type}`;
    formStatus.textContent = message;
    formStatus.style.display = 'block';

    // Auto-hide after 8 seconds
    setTimeout(() => {
        formStatus.style.display = 'none';
    }, 8000);
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
