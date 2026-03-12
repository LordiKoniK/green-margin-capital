window.openModal = openModal;
let currentStep = 1;
const totalSteps = 5;

// =============================================
// DEV MODE — set to true to bypass step validation
// during testing. Set to false for production.
const DEV_MODE = true;
// =============================================

function openModal() {
    document.getElementById('modalOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
    // Initialize signature canvas after modal is fully rendered
    setTimeout(() => initSignatureCanvas("signatureCanvas"), 300);
    setTimeout(() => initSignatureCanvas("signatureCanvas2"), 300);
    populateCountryDropdowns();

}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
    document.body.style.overflow = 'auto';
}

function updateProgress() {
    // Update progress bar
    const progressFill = document.getElementById('progressFill');
    const progressPercent = ((currentStep - 1) / (totalSteps - 1)) * 100;
    progressFill.style.width = progressPercent + '%';

    // Update step indicators
    document.querySelectorAll('.progress-step').forEach((step, index) => {
        const stepNumber = index + 1;
        if (stepNumber < currentStep) {
            step.classList.add('completed');
            step.classList.remove('active');
        } else if (stepNumber === currentStep) {
            step.classList.add('active');
            step.classList.remove('completed');
        } else {
            step.classList.remove('active', 'completed');
        }
    });

    // Update form steps
    document.querySelectorAll('.form-step').forEach((step, index) => {
        if (index + 1 === currentStep) {
            step.classList.add('active');
        } else {
            step.classList.remove('active');
        }
    });

    // Initialize bank autocomplete at step 4:
    if (currentStep === 4) {
        setTimeout(setupBankAutocomplete, 100);
    }

    // Initialize canvas when reaching step 5
    if (currentStep === 5) {
        setTimeout(() => initSignatureCanvas("signatureCanvas"), 300);
        setTimeout(() => initSignatureCanvas("signatureCanvas2"), 300);
    }

    // Update buttons
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    if (currentStep === 1) {
        prevBtn.style.display = 'none';
    } else {
        prevBtn.style.display = 'block';
    }

    if (currentStep === totalSteps) {
        nextBtn.textContent = 'Submit Application';
    } else {
        nextBtn.textContent = 'Next';
    }
}

// =============================================
//  PER-STEP VALIDATION
// =============================================

/**
 * Marks a field as invalid with a red border and shows an error message below it.
 */
function markFieldInvalid(field, message) {
    field.style.borderColor = 'var(--error-red)';
    field.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.15)';

    // Avoid duplicate error messages
    if (!field.nextElementSibling || !field.nextElementSibling.classList.contains('field-error-msg')) {
        const msg = document.createElement('span');
        msg.className = 'field-error-msg';
        msg.style.cssText = 'color: var(--error-red); font-size: 0.82rem; margin-top: 4px; display: block;';
        msg.textContent = message || 'This field is required.';
        field.parentNode.insertBefore(msg, field.nextSibling);
    }
}

/**
 * Clears validation styling from all fields in the current step.
 */
function clearStepValidation(stepEl) {
    stepEl.querySelectorAll('.form-input, .form-select, .form-textarea').forEach(field => {
        field.style.borderColor = '';
        field.style.boxShadow = '';
    });
    // Clear upload zone error styling
    stepEl.querySelectorAll('.photo-upload-container').forEach(zone => {
        zone.style.borderColor = '';
        zone.style.boxShadow = '';
    });
    // Clear radio group outlines
    stepEl.querySelectorAll('.form-radio-group').forEach(group => {
        group.style.outline = '';
        group.style.padding = '';
        group.style.borderRadius = '';
    });
    // Clear signature area errors
    stepEl.querySelectorAll('.signature-area').forEach(area => {
        area.style.borderColor = '';
        area.style.boxShadow = '';
    });
    stepEl.querySelectorAll('.field-error-msg').forEach(msg => msg.remove());
    // Also clear any step-level banner
    const banner = stepEl.querySelector('.step-validation-banner');
    if (banner) banner.remove();
}


/**
 * Shows a banner at the top of the step with a summary error message.
 */
function showValidationBanner(stepEl, count) {
    // Remove existing banner first
    const existing = stepEl.querySelector('.step-validation-banner');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.className = 'step-validation-banner';
    banner.style.cssText = `
        background: rgba(239, 68, 68, 0.08);
        border: 1.5px solid var(--error-red);
        border-radius: 8px;
        padding: 12px 16px;
        margin-bottom: 20px;
        color: var(--error-red);
        font-size: 0.92rem;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 10px;
    `;
    banner.innerHTML = `
        <svg width="18" height="18" fill="currentColor" viewBox="0 0 20 20" style="flex-shrink:0;">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
        </svg>
        Please complete ${count} required field${count !== 1 ? 's' : ''} before continuing.
    `;
    stepEl.insertBefore(banner, stepEl.firstChild);

    // Scroll banner into view
    banner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Validates all required fields on the current step.
 * Returns true if valid, false if there are errors.
 * Skips joint-account sections when account type is individual.
 */
function validateCurrentStep() {
    if (DEV_MODE) return true;

    const stepEl = document.querySelector(`.form-step[data-step="${currentStep}"]`);
    if (!stepEl) return true;

    // Clear previous validation state on this step
    clearStepValidation(stepEl);

    const isJoint = document.querySelector('input[name="accountType"]:checked')?.value === 'joint';
    let invalidCount = 0;
    let firstInvalidField = null;

    // Helper: should we skip this field (inside a joint-only section when not joint)?
    function shouldSkip(field) {
        if (!isJoint && field.closest('.jointAccountSection')) return true;
        // Skip hidden fields (e.g. employer/business blocks that aren't shown)
        if (field.offsetParent === null) return true;
        return false;
    }

    // Helper: mark a radio group container as invalid
    function markRadioGroupInvalid(groupEl, containerEl) {
        groupEl.style.outline = '2px solid var(--error-red)';
        groupEl.style.borderRadius = '6px';
        groupEl.style.padding = '6px';
        if (!groupEl.nextElementSibling || !groupEl.nextElementSibling.classList.contains('field-error-msg')) {
            const msg = document.createElement('span');
            msg.className = 'field-error-msg';
            msg.style.cssText = 'color: var(--error-red); font-size: 0.82rem; margin-top: 4px; display: block;';
            msg.textContent = 'Please select an option.';
            groupEl.parentNode.insertBefore(msg, groupEl.nextSibling);
        }
        invalidCount++;
        if (!firstInvalidField) firstInvalidField = containerEl;
    }

    // Helper: mark an upload zone as invalid
    function markUploadInvalid(container, message) {
        container.style.borderColor = 'var(--error-red)';
        container.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.15)';
        if (!container.nextElementSibling || !container.nextElementSibling.classList.contains('field-error-msg')) {
            const msg = document.createElement('span');
            msg.className = 'field-error-msg';
            msg.style.cssText = 'color: var(--error-red); font-size: 0.82rem; margin-top: 4px; display: block;';
            msg.textContent = message || 'Please upload a file.';
            container.parentNode.insertBefore(msg, container.nextSibling);
        }
        invalidCount++;
        if (!firstInvalidField) firstInvalidField = container;
    }

    // --- Text / select / textarea fields ---
    stepEl.querySelectorAll('input[required], select[required], textarea[required]').forEach(field => {
        if (shouldSkip(field)) return;
        if (field.type === 'radio' || field.type === 'checkbox' || field.type === 'file') return; // handled separately

        if (!field.value || field.value.trim() === '') {
            markFieldInvalid(field, 'This field is required.');
            invalidCount++;
            if (!firstInvalidField) firstInvalidField = field;
        }
    });

    // --- KRA PIN format validation (step 2) ---
    // 11 characters: starts with a letter, 9 alphanumeric in middle, ends with a letter
    const KRA_REGEX = /^[A-Za-z][A-Za-z0-9]{9}[A-Za-z]$/;
    if (currentStep === 2) {
        const kraPinIds = ['primaryKraPin'];
        if (isJoint) kraPinIds.push('secondaryKraPin');
        kraPinIds.forEach(id => {
            const field = document.getElementById(id);
            if (!field || shouldSkip(field)) return;
            if (field.value && !KRA_REGEX.test(field.value.trim())) {
                markFieldInvalid(field, 'Invalid KRA PIN — must be 11 characters starting and ending with a letter (e.g. A123456789B).');
                invalidCount++;
                if (!firstInvalidField) firstInvalidField = field;
            }
        });

        // Require passport expiry if ID type is not National ID
        const idType = document.getElementById('idType');
        const expiry = document.getElementById('primaryPassportExpiry');
        if (idType && expiry && ['ea', 'passport', 'alien'].includes(idType.value)) {
            if (!expiry.value || expiry.value.trim() === '') {
                markFieldInvalid(expiry, 'Passport/ID expiry date is required for this ID type.');
                invalidCount++;
                if (!firstInvalidField) firstInvalidField = expiry;
            }
        }
        if (isJoint) {
            const idType2 = document.getElementById('secondaryIdType');
            const expiry2 = document.getElementById('secondaryPassportExpiry');
            if (idType2 && expiry2 && ['ea', 'passport', 'alien'].includes(idType2.value)) {
                if (!expiry2.value || expiry2.value.trim() === '') {
                    markFieldInvalid(expiry2, 'Passport/ID expiry date is required for this ID type.');
                    invalidCount++;
                    if (!firstInvalidField) firstInvalidField = expiry2;
                }
            }
        }
    }

    // --- Email format + confirm-match validation (step 3) ---
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (currentStep === 3) {
        const emailPairs = [
            { mainId: 'primaryEmail', confirmId: 'primary_email_confirm', joint: false },
            { mainId: 'secondaryEmail', confirmId: 'secondary_email_confirm', joint: true  }
        ];
        emailPairs.forEach(({ mainId, confirmId, joint }) => {
            const mainField = document.getElementById(mainId);
            if (!mainField || (joint && !isJoint) || shouldSkip(mainField)) return;

            // Format check on main field (only if it has a value — emptiness is caught above)
            if (mainField.value && !EMAIL_REGEX.test(mainField.value.trim())) {
                markFieldInvalid(mainField, 'Please enter a valid email address.');
                invalidCount++;
                if (!firstInvalidField) firstInvalidField = mainField;
            }

            // Confirm field check
            const confirmField = document.getElementById(confirmId);
            if (!confirmField) return;
            if (!confirmField.value || confirmField.value.trim() === '') {
                markFieldInvalid(confirmField, 'Please confirm your email address.');
                invalidCount++;
                if (!firstInvalidField) firstInvalidField = confirmField;
            } else if (confirmField.value.trim() !== mainField.value.trim()) {
                markFieldInvalid(confirmField, 'Email addresses do not match.');
                invalidCount++;
                if (!firstInvalidField) firstInvalidField = confirmField;
            }
        });

        // Also validate employer/business emails (format only, no confirmation field)
        const extraEmailIds = ['employerEmail', 'employerEmail2', 'businessEmail', 'businessEmail2'];
        extraEmailIds.forEach(id => {
            const field = document.getElementById(id);
            if (!field || shouldSkip(field)) return;
            if (field.value && !EMAIL_REGEX.test(field.value.trim())) {
                markFieldInvalid(field, 'Please enter a valid email address.');
                invalidCount++;
                if (!firstInvalidField) firstInvalidField = field;
            }
        });
    }

    // --- Radio groups: checked by explicit group name per step, not by [required] attribute ---
    // This is necessary because radio inputs often don't carry required on every option in the DOM.
    // Define which radio group names are required on each step.
    const requiredRadiosByStep = {
        1: [], // accountType has a default checked value, no need to validate
        2: ['gender'],
        3: ['pep'],
        4: ['paymentMethod', 'taxExempt'],
        5: ['signingAuthority'] // signing mandate select is handled by text validation; skip here
    };
    const radioNamesToCheck = requiredRadiosByStep[currentStep] || [];

    // Also dynamically collect any joint-account radio groups on step 2/3
    if (isJoint && currentStep === 2) {
        radioNamesToCheck.push('secondaryGender');
    }

    radioNamesToCheck.forEach(name => {
        // Find all radios with this name anywhere in the step (including joint sections if applicable)
        const allRadios = stepEl.querySelectorAll(`input[type="radio"][name="${name}"]`);
        if (allRadios.length === 0) return;

        // If these radios are inside a joint section and we're not joint, skip
        if (allRadios[0].closest('.jointAccountSection') && !isJoint) return;

        const anyChecked = Array.from(allRadios).some(r => r.checked);
        if (!anyChecked) {
            const container = allRadios[0].closest('.form-group');
            const radioGroupEl = container?.querySelector('.form-radio-group');
            if (radioGroupEl) {
                markRadioGroupInvalid(radioGroupEl, radioGroupEl);
            }
        }
    });

    // --- Checkbox (e.g. agree to terms on step 5) ---
    stepEl.querySelectorAll('input[type="checkbox"][required]').forEach(checkbox => {
        if (shouldSkip(checkbox)) return;
        if (!checkbox.checked) {
            const label = checkbox.closest('label') || checkbox.parentElement;
            label.style.outline = '2px solid var(--error-red)';
            label.style.borderRadius = '6px';
            label.style.padding = '4px 6px';
            if (!label.nextElementSibling || !label.nextElementSibling.classList.contains('field-error-msg')) {
                const msg = document.createElement('span');
                msg.className = 'field-error-msg';
                msg.style.cssText = 'color: var(--error-red); font-size: 0.82rem; margin-top: 4px; display: block;';
                msg.textContent = 'You must agree to the terms and conditions.';
                label.parentNode.insertBefore(msg, label.nextSibling);
            }
            invalidCount++;
            if (!firstInvalidField) firstInvalidField = checkbox;
        }
    });

    // --- Upload fields: check required file inputs have a file ---
    // Step 2: primary passport photo (always required); secondary passport photo if joint
    if (currentStep === 2) {
        const primaryPhoto = document.getElementById('passportPhotoInput');
        const primaryContainer = primaryPhoto?.closest('.photo-upload-container');
        if (primaryPhoto && primaryContainer && primaryPhoto.files.length === 0) {
            markUploadInvalid(primaryContainer, 'Please upload a passport photo.');
        }

        const kraCertInput = document.getElementById('kraPinCertInput');
        const kraCertContainer = kraCertInput?.closest('.photo-upload-container');
        if (kraCertInput && kraCertContainer && kraCertInput.files.length === 0) {
            markUploadInvalid(kraCertContainer, 'Please upload your KRA PIN certificate.');
        }

        if (isJoint) {
            const secondaryPhoto = document.getElementById('passportPhotoInput2');
            const secondaryContainer = secondaryPhoto?.closest('.photo-upload-container');
            if (secondaryPhoto && secondaryContainer && secondaryPhoto.files.length === 0) {
                markUploadInvalid(secondaryContainer, 'Please upload a passport photo for the secondary applicant.');
            }

            const kraCertInput2 = document.getElementById('kraPinCertInput2');
            const kraCertContainer2 = kraCertInput2?.closest('.photo-upload-container');
            if (kraCertInput2 && kraCertContainer2 && kraCertInput2.files.length === 0) {
                markUploadInvalid(kraCertContainer2, 'Please upload your KRA PIN certificate.');
            }
        }
    }

    // Step 4: tax exemption certificate (only if tax exempt = yes and the upload is visible)
    if (currentStep === 4) {
        const taxExempt = document.querySelector('input[name="taxExempt"]:checked')?.value;
        if (taxExempt === 'yes') {
            const taxCertInput = document.getElementById('taxExemptionCertInput');
            const taxCertContainer = taxCertInput?.closest('.photo-upload-container');
            if (taxCertInput && taxCertContainer && taxCertInput.files.length === 0) {
                markUploadInvalid(taxCertContainer, 'Please upload your tax exemption certificate.');
            }
        }
    }

    // --- Step 5: check signature canvas is not empty ---
    if (currentStep === 5) {
        const canvas = document.getElementById('signatureCanvas');
        if (canvas && isCanvasEmpty(canvas)) {
            const signatureArea = canvas.closest('.signature-area');
            if (signatureArea) {
                signatureArea.style.borderColor = 'var(--error-red)';
                signatureArea.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.15)';
            }
            if (!canvas.parentNode.querySelector('.field-error-msg')) {
                const msg = document.createElement('span');
                msg.className = 'field-error-msg';
                msg.style.cssText = 'color: var(--error-red); font-size: 0.82rem; margin-top: 4px; display: block;';
                msg.textContent = 'Please provide your signature.';
                canvas.parentNode.appendChild(msg);
            }
            invalidCount++;
            if (!firstInvalidField) firstInvalidField = canvas;
        }

        if (isJoint) {
            const canvas2 = document.getElementById('signatureCanvas2');
            if (canvas2 && isCanvasEmpty(canvas2)) {
                const signatureArea2 = canvas2.closest('.signature-area');
                if (signatureArea2) {
                    signatureArea2.style.borderColor = 'var(--error-red)';
                    signatureArea2.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.15)';
                }
                if (!canvas2.parentNode.querySelector('.field-error-msg')) {
                    const msg2 = document.createElement('span');
                    msg2.className = 'field-error-msg';
                    msg2.style.cssText = 'color: var(--error-red); font-size: 0.82rem; margin-top: 4px; display: block;';
                    msg2.textContent = 'Please provide the secondary signature.';
                    canvas2.parentNode.appendChild(msg2);
                }
                invalidCount++;
            }
        }
    }

    if (invalidCount > 0) {
        showValidationBanner(stepEl, invalidCount);
        if (firstInvalidField) {
            firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return false;
    }

    return true;
}

/**
 * Returns true if a signature canvas has no drawn content.
 */
function isCanvasEmpty(canvas) {
    const ctx = canvas.getContext('2d');
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 3; i < data.length; i += 4) {
        if (data[i] !== 0) return false;
    }
    return true;
}

// =============================================
//  NAVIGATION
// =============================================

async function nextStep() {
    if (!validateCurrentStep()) return; // Block navigation if validation fails

    if (currentStep < totalSteps) {
        currentStep++;
        updateProgress();
        // Scroll modal body back to top when changing steps
        const modalBody = document.querySelector('.modal-body');
        if (modalBody) modalBody.scrollTop = 0;
    } else {
        await submitApplication();
    }
}

function previousStep() {
    if (currentStep > 1) {
        // Clear validation state when going back
        const stepEl = document.querySelector(`.form-step[data-step="${currentStep}"]`);
        if (stepEl) clearStepValidation(stepEl);

        currentStep--;
        updateProgress();
        const modalBody = document.querySelector('.modal-body');
        if (modalBody) modalBody.scrollTop = 0;
    }
}


async function submitApplication() {

    // Check for empty required fields and collect all empty ones, excluding joint fields if not joint account
    const accountType = document.querySelector('input[name="accountType"]:checked')?.value;
    const requiredFields = document.querySelectorAll('[required]');
    let emptyFields = [];
    requiredFields.forEach(field => {
        // Exclude jointAccountSection fields if not joint
        if (accountType !== 'joint' && field.closest('.jointAccountSection')) {
            return;
        }
        if (field.type === 'checkbox' || field.type === 'radio') {
            // For radio/checkbox, check if any in group is checked
            if (field.type === 'radio') {
                const group = document.getElementsByName(field.name);
                const checked = Array.from(group).some(r => r.checked);
                if (!checked && !emptyFields.some(f => f.name === field.name)) emptyFields.push(field);
            } else if (field.type === 'checkbox') {
                if (!field.checked) emptyFields.push(field);
            }
        } else if (!field.value) {
            emptyFields.push(field);
        }
    });
    if (emptyFields.length > 0) {
        const fieldNames = emptyFields.map(field => {
            let label = '';
            if (field.labels && field.labels.length > 0) {
                label = field.labels[0].innerText.trim();
            } else if (field.getAttribute('aria-label')) {
                label = field.getAttribute('aria-label');
            } else if (field.placeholder) {
                label = field.placeholder;
            } else if (field.name) {
                label = field.name;
            } else if (field.id) {
                label = field.id;
            } else {
                label = 'Unnamed field';
            }
            return label;
        });
        alert('Please fill all required fields before submitting.\n\nMissing: ' + fieldNames.join(', '));
        return;
    }
    

    // Check if signatures are empty
    const canvas = document.getElementById('signatureCanvas');
    const canvas2 = document.getElementById('signatureCanvas2');

    const context = canvas.getContext('2d');
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    let isEmpty = true;
    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] !== 0) {
            isEmpty = false;
            break;
        }
    }
    if (isEmpty) {
        alert('Please provide your signature before submitting.');
        return;
    }

    // If joint account signature 
    if (accountType === 'joint' && canvas2) {
        const context2 = canvas2.getContext('2d');
        const imageData2 = context2.getImageData(0, 0, canvas2.width, canvas2.height);
        const data2 = imageData2.data;
        let isEmpty2 = true;
        for (let i = 0; i < data2.length; i += 4) {
            if (data2[i + 3] !== 0) {
                isEmpty2 = false;
                break;
            }
        }
        if (isEmpty2) {
            alert('Please provide the secondary signature before submitting.');
            return;
        }
    }

    // Show loading indicator
    const submitBtn = document.getElementById('nextBtn');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    try {
        // Prepare form data
        const formData = new FormData();
        
        // Collect all form data
        const applicationData = {
            // Account Type
            account_type: document.querySelector('input[name="accountType"]:checked').value,
            cda_code: document.querySelector('input[placeholder="Enter CDA code if applicable"]').value,
            cds_account_number: document.querySelector('input[placeholder="Leave blank for new account"]').value,
            
            // Primary Client Details
            primary_surname: document.querySelectorAll('.form-step[data-step="2"] input')[0].value,
            primary_other_names: document.querySelectorAll('.form-step[data-step="2"] input')[1].value,
            primary_dob: document.querySelectorAll('.form-step[data-step="2"] input[type="date"]')[0].value,
            primary_gender: document.querySelector('.form-step[data-step="2"] input[name="gender"]:checked')?.value,
            primary_investor_category: document.querySelectorAll('.form-step[data-step="2"] select')[0].value,
            primary_id_type: document.querySelectorAll('.form-step[data-step="2"] select')[1].value,
            primary_id_number: document.querySelectorAll('.form-step[data-step="2"] input')[5].value,
            primary_passport_expiry: document.getElementById('primaryPassportExpiry')?.value || '',
            primary_nationality: document.getElementById('nationality').value,
            primary_country_residence: document.getElementById('countryOfResidence').value,
            primary_kra_pin: document.getElementById('primaryKraPin')?.value || '',
            
            // Primary Contact
            primary_country_code: document.getElementById('primaryCountryCode').value,
            primary_phone: document.querySelectorAll('.form-step[data-step="3"] input[type="tel"]')[0].value,
            primary_email: document.getElementById('primaryEmail')?.value || '',
            primary_town_city: document.querySelectorAll('.form-step[data-step="3"] input')[3].value,
            primary_physical_location: document.querySelectorAll('.form-step[data-step="3"] input')[4].value,
            primary_postal_code: document.querySelectorAll('.form-step[data-step="3"] input')[5].value,
            primary_postal_address: formatPostalAddress(document.getElementById('primaryPostalAddress')?.value || ''),
            
            // Primary Employment/Business
            primary_fund_source: document.getElementById('fundSource').value,
            primary_employer_name: document.getElementById('employerName')?.value || '',
            primary_employer_postal: formatPostalAddress(document.getElementById('employerPostal')?.value || ''),
            primary_employer_phone: document.getElementById('employerPhone')?.value || '',
            primary_employer_email: document.getElementById('employerEmail')?.value || '',
            primary_business_name: document.getElementById('businessName')?.value || '',
            primary_business_reg_number: document.getElementById('businessRegNumber')?.value || '',
            primary_business_postal: formatPostalAddress(document.getElementById('businessPostal')?.value || ''),
            primary_business_phone: document.getElementById('businessPhone')?.value || '',
            primary_business_email: document.getElementById('businessEmail')?.value || '',
            primary_business_office: document.getElementById('businessOffice')?.value || '',
            
            // PEP Status
            is_pep: document.querySelector('input[name="pep"]:checked').value === 'yes' ? "Yes" : "No",
            pep_details: document.querySelector('.form-step[data-step="3"] textarea').value,
            
            // Payment Details
            payment_method: document.querySelector('input[name="paymentMethod"]:checked').value,
            bank_name: document.getElementById('bankNameInput')?.value || '',
            account_number: document.getElementById('bankAccountNumber')?.value || '',
            account_name: document.getElementById('accountName')?.value || '',
            branch_code: document.getElementById('branchCode')?.value || '',
            swift_code: document.getElementById('swiftCode')?.value || '',
            currency: Array.from(document.querySelectorAll('#currencyField input[type="checkbox"]:checked')).map(cb => cb.value).join(', '),
            other_currency: document.getElementById('otherCurrency')?.value || '',
            mobile_money_phone: document.getElementById('mobileMoneyPhone')?.value || '',
            
            // Tax Status
            is_tax_exempt: document.querySelector('input[name="taxExempt"]:checked').value === 'yes' ? "Yes" : "No",
            
            // Declaration
            signing_mandate: document.querySelectorAll('.form-step[data-step="5"] select')[0].value,
            signer_names: document.getElementById('signName1')?.value || '',
        };


        // Secondary fields
        if (applicationData.account_type === 'joint') {

            // Map joint account fields to for secondary applicant
            applicationData.secondary_surname = document.getElementById('secondarySurname')?.value;
            applicationData.secondary_other_names = document.getElementById('secondaryOtherNames')?.value;
            applicationData.secondary_dob = document.getElementById('secondaryDob')?.value;
            applicationData.secondary_gender = document.querySelector('.form-step[data-step="2"] input[name="secondaryGender"]:checked')?.value;
            applicationData.secondary_investor_category = document.getElementById('secondaryInvestorCategory')?.value;
            applicationData.secondary_id_type = document.getElementById('secondaryIdType')?.value;
            applicationData.secondary_id_number = document.getElementById('secondaryIdNumber')?.value;
            applicationData.secondary_passport_expiry = document.getElementById('secondaryPassportExpiry')?.value;
            applicationData.secondary_nationality = document.getElementById('secondaryNationality')?.value;
            applicationData.secondary_country_residence = document.getElementById('secondaryCountryResidence')?.value;
            applicationData.secondary_kra_pin = document.getElementById('secondaryKraPin')?.value;
            applicationData.secondary_country_code = document.getElementById('secondaryCountryCode')?.value;
            applicationData.secondary_phone = document.getElementById('secondaryPhone')?.value;
            applicationData.secondary_email = document.getElementById('secondaryEmail')?.value;
            applicationData.secondary_town_city = document.getElementById('secondaryTownCity')?.value;
            applicationData.secondary_physical_location = document.getElementById('secondaryPhysicalLocation')?.value;
            applicationData.secondary_postal_code = document.getElementById('secondaryPostalCode')?.value;
            applicationData.secondary_postal_address = formatPostalAddress(document.getElementById('secondaryPostalAddress')?.value || '');
            applicationData.secondary_fund_source = document.getElementById('fundSource2')?.value;
            applicationData.secondary_employer_name = document.getElementById('employerName2')?.value;
            applicationData.secondary_employer_postal = formatPostalAddress(document.getElementById('employerPostal2')?.value || '');
            applicationData.secondary_employer_phone = document.getElementById('employerPhone2')?.value;
            applicationData.secondary_employer_email = document.getElementById('employerEmail2')?.value;
            applicationData.secondary_business_name = document.getElementById('businessName2')?.value;
            applicationData.secondary_business_reg_number = document.getElementById('businessRegNumber2')?.value;
            applicationData.secondary_business_postal = formatPostalAddress(document.getElementById('businessPostal2')?.value || '');
            applicationData.secondary_business_phone = document.getElementById('businessPhone2')?.value;
            applicationData.secondary_business_email = document.getElementById('businessEmail2')?.value;
            applicationData.secondary_business_office = document.getElementById('businessOffice2')?.value;
            applicationData.secondary_signer_names = document.getElementById('signName2')?.value || '';
        } else { // If not joint application, set everything to empty
            applicationData.secondary_surname = '';
            applicationData.secondary_other_names = '';
            applicationData.secondary_dob = '';
            applicationData.secondary_gender = '';
            applicationData.secondary_investor_category = '';
            applicationData.secondary_id_type = '';
            applicationData.secondary_id_number = '';
            applicationData.secondary_passport_expiry = '';
            applicationData.secondary_nationality = '';
            applicationData.secondary_country_residence = '';
            applicationData.secondary_kra_pin = '';
            applicationData.secondary_passport_photo_path = '';
            applicationData.secondary_country_code = '';
            applicationData.secondary_phone = '';
            applicationData.secondary_email = '';
            applicationData.secondary_town_city = '';
            applicationData.secondary_physical_location = '';
            applicationData.secondary_postal_code = '';
            applicationData.secondary_postal_address = '';
            applicationData.secondary_fund_source = '';
            applicationData.secondary_employer_name = '';
            applicationData.secondary_employer_postal = '';
            applicationData.secondary_employer_phone = '';
            applicationData.secondary_employer_email = '';
            applicationData.secondary_business_name = '';
            applicationData.secondary_business_reg_number = '';
            applicationData.secondary_business_postal = '';
            applicationData.secondary_business_phone = '';
            applicationData.secondary_business_email = '';
            applicationData.secondary_business_office = '';
            applicationData.secondary_signer_names = '';
            applicationData.secondary_signature_path = '';
        }

        // Empty strings for missing optional fields 
        if (applicationData.is_tax_exempt === 'No') {
            applicationData.tax_cert_path = '';
        }

        // Add the main data as JSON
        formData.append('data', JSON.stringify(applicationData));

        // Convert signature to blob and add to form data
        canvas.toBlob(function(blob) {
            formData.append('signatureImage', blob, 'signature.png');

            // If joint account, add secondary signature
            if (accountType === 'joint' && canvas2) {
                canvas2.toBlob(function(blob2) {
                    formData.append('secondarySignatureImage', blob2, 'signature2.png');
                    appendAndSubmitFiles();
                }, 'image/png');
            } else {
                // Only primary signature needed
                appendAndSubmitFiles();
            }
            }, 'image/png');
            
            function appendAndSubmitFiles() {
            // Add passport photos if uploaded
            const primaryPhoto = document.getElementById('passportPhotoInput').files[0];
            if (primaryPhoto) {
                formData.append('primaryPassportPhoto', primaryPhoto);
            }

            const secondaryPhoto = document.getElementById('passportPhotoInput2')?.files[0];
            if (secondaryPhoto) {
                formData.append('secondaryPassportPhoto', secondaryPhoto);
            }

            // Add tax certificate if uploaded
            const taxCert = document.getElementById('taxExemptionCertInput')?.files[0];
            if (taxCert) {
                formData.append('taxCertificate', taxCert);
            }

            const kraPinCert = document.getElementById('kraPinCertInput')?.files[0];
            if (kraPinCert) {
                formData.append('kraPinCertificate', kraPinCert);
            }

            const kraPinCert2 = document.getElementById('kraPinCertInput2')?.files[0];
            if (kraPinCert2) {
                formData.append('kraPinCertificate2', kraPinCert2);
            }

            // Submit to server
            fetch('/api/cdsc/submit', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    alert(`Application submitted successfully! Your application ID is #${result.applicationId}. You will be contacted via email regarding the status of your application.`);
                    closeModal();
                    
                    // Reset form
                    currentStep = 1;
                    updateProgress();
                    clearSignature("signatureCanvas");
                    clearSignature("signatureCanvas2");
                    document.querySelectorAll('input, select, textarea').forEach(field => {
                        if (field.type !== 'radio' && field.type !== 'checkbox') {
                            field.value = '';
                        } else {
                            field.checked = false;
                        }
                    });
                } else {
                    alert('Error submitting application: ' + (result.message || 'Unknown error'));
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error submitting application. Please try again.');
            })
            .finally(() => {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            });

        }

    } catch (error) {
        console.error('Error preparing application:', error);
        alert('Error preparing application. Please try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

// Scroll back to top with call to action button
function scrollToTop() {
  const btn = document.querySelector('.btn-cta-large');
  if (btn) {
    btn.addEventListener("click", function() {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "smooth"
      });
    });
  }
}


// Initialize
updateProgress();

// File input listeners for previews
replacePassportPhotoIcon();
replacePassportPhotoIcon2();
replaceTaxCertIcon();
replaceKraPinCertIcon();
replaceKraPinCertIcon2();

// Button event listeners
document.addEventListener('DOMContentLoaded', scrollToTop);

// Open application form
document.addEventListener('DOMContentLoaded', function() {
    const openAccountBtn = document.querySelector('.btn-hero');
    if (openAccountBtn) {
        openAccountBtn.addEventListener('click', openModal);
    }
});

// Close application form
document.addEventListener('DOMContentLoaded', function() {
    const closeAccountBtn = document.querySelector('.close-modal');
    if (closeAccountBtn) {
        closeAccountBtn.addEventListener('click', closeModal);
    }
});

// Next page
document.addEventListener('DOMContentLoaded', function() {
    const openAccountBtn = document.getElementById('nextBtn');
    if (openAccountBtn) {
        openAccountBtn.addEventListener('click', nextStep);
    }
});

// Previous page
document.addEventListener('DOMContentLoaded', function() {
    const prevAccountBtn = document.getElementById('prevBtn');
    if (prevAccountBtn) {
        prevAccountBtn.addEventListener('click', previousStep);
    }
});

// Account type radio buttons
document.addEventListener('DOMContentLoaded', function() {
    const accountTypeRadios = document.querySelectorAll('input[name="accountType"]');
    accountTypeRadios.forEach(function(radio) {
        radio.addEventListener('change', toggleJointAccountFields);
    });
});

// Tax Exempt radio buttons
document.addEventListener('DOMContentLoaded', function() {
    const taxExemptRadios = document.querySelectorAll('input[name="taxExempt"]');
    taxExemptRadios.forEach(function(radio) {
        radio.addEventListener('change', toggleTaxCertificateUpload);
    });
});

// Payment Method radio buttons
document.addEventListener('DOMContentLoaded', function() {
    const paymentMethodRadios = document.querySelectorAll('input[name="paymentMethod"]');
    paymentMethodRadios.forEach(function(radio) {
        radio.addEventListener('change', togglePaymentFields);
    });
});

// Branch code input validation
document.addEventListener('DOMContentLoaded', function() {
    const branchCodeInput = document.getElementById('branchCode');
    if (branchCodeInput) {
        branchCodeInput.addEventListener('input', validateBranchCode);
    }
});

// Fund source select dropdowns
document.addEventListener('DOMContentLoaded', function() {
    const fundSourceSelect = document.getElementById('fundSource');
    if (fundSourceSelect) {
        fundSourceSelect.addEventListener('change', toggleFundSourceFields);
    }
});

document.addEventListener('DOMContentLoaded', function() {
    const fundSourceSelect = document.getElementById('fundSource2');
    if (fundSourceSelect) {
        fundSourceSelect.addEventListener('change', toggleFundSourceFields2);
    }
});

// Show/hide PEP details textarea based on selection
document.addEventListener('DOMContentLoaded', function() {
    const pepRadios = document.querySelectorAll('input[name="pep"]');
    const pepDetails = document.getElementById('pepTrue');
    if (!pepRadios.length || !pepDetails) return;
    function updatePepDetails() {
        const selected = document.querySelector('input[name="pep"]:checked');
        if (selected && selected.value === 'yes') {
            pepDetails.style.display = '';
        } else {
            pepDetails.style.display = 'none';
        }
    }
    pepRadios.forEach(radio => {
        radio.addEventListener('change', updatePepDetails);
    });
    updatePepDetails(); // Set initial state
});

// Clear signature button
document.addEventListener('DOMContentLoaded', function() {
    const clearSignatureBtn = document.getElementById('clearSignature');
    if (clearSignatureBtn) {
        clearSignatureBtn.addEventListener('click', () => clearSignature("signatureCanvas"));
    }
});
    
// Clear secondary signature 
document.addEventListener('DOMContentLoaded', function() {
    const clearSignatureBtn2 = document.getElementById('clearSignature2');
    if (clearSignatureBtn2) {
        clearSignatureBtn2.addEventListener('click', () => clearSignature("signatureCanvas2"));
    }
});

// KRA PIN live validation
document.addEventListener('DOMContentLoaded', function() {
    setupKraPinValidation('primaryKraPin');
    setupKraPinValidation('secondaryKraPin');
});

// Email confirm fields — inject dynamically after each main email input and wire up
document.addEventListener('DOMContentLoaded', function() {
    injectEmailConfirmField('primaryEmail', false);
    injectEmailConfirmField('secondaryEmail', true);
});

document.addEventListener('DOMContentLoaded', function() {
    setupCountryCodeAutocomplete('primaryCountryCode');
    setupCountryCodeAutocomplete('secondaryCountryCode');
});

// Auto-clear validation errors when a field is corrected
document.addEventListener('input', function(e) {
    const field = e.target;
    if (field.classList.contains('form-input') || field.classList.contains('form-select') || field.classList.contains('form-textarea')) {
        if (field.value && field.value.trim() !== '') {
            field.style.borderColor = '';
            field.style.boxShadow = '';
            const errorMsg = field.nextElementSibling;
            if (errorMsg && errorMsg.classList.contains('field-error-msg')) {
                errorMsg.remove();
            }
        }
    }
});

document.addEventListener('change', function(e) {
    const field = e.target;
    // Clear radio group errors on change
    if (field.type === 'radio') {
        const radioGroup = field.closest('.form-radio-group');
        if (radioGroup) {
            radioGroup.style.outline = '';
            radioGroup.style.padding = '';
            const errorMsg = radioGroup.nextElementSibling;
            if (errorMsg && errorMsg.classList.contains('field-error-msg')) errorMsg.remove();
        }
    }
    // Clear checkbox errors on change
    if (field.type === 'checkbox' && field.checked) {
        const label = field.closest('label') || field.parentElement;
        label.style.outline = '';
        label.style.padding = '';
        const errorMsg = label.nextElementSibling;
        if (errorMsg && errorMsg.classList.contains('field-error-msg')) errorMsg.remove();
    }
    // Clear select errors on change
    if (field.classList.contains('form-select') && field.value) {
        field.style.borderColor = '';
        field.style.boxShadow = '';
        const errorMsg = field.nextElementSibling;
        if (errorMsg && errorMsg.classList.contains('field-error-msg')) errorMsg.remove();
    }
});




//
//      CLIENT DETAILS PAGE
//      CLIENT DETAILS PAGE
//
//



function toggleJointAccountFields() {
    const accountType = document.querySelector('input[name="accountType"]:checked').value;
    const jointAccountSections = document.querySelectorAll('.jointAccountSection');
    jointAccountSections.forEach(section => {
        section.style.display = (accountType === 'joint') ? 'block' : 'none';
        if (accountType !== 'joint') {
            section.querySelectorAll('input, select, textarea').forEach(field => {
                if (field.type === 'radio' || field.type === 'checkbox') {
                    field.checked = false;
                } else {
                    field.value = '';
                }
            });
        }
    });
}



// =============================================
//  UPLOAD ZONES — shared handler for click + drag-and-drop
// =============================================

/**
 * Sets up a file upload zone with:
 *  - Click-to-browse (existing behaviour)
 *  - Drag-and-drop support
 *  - Image preview (for image files) or filename display
 *  - Remove (×) button
 *  - Clears validation error styling when a file is provided
 *
 * @param {string} inputId       - id of the <input type="file">
 * @param {string} previewId     - id of the preview container div
 * @param {string} defaultIconId - id of the default placeholder element to hide/show
 * @param {boolean} isImage      - true → show img preview; false → show filename only
 */
function setupUploadZone(inputId, previewId, defaultIconId, isImage) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    const defaultIcon = document.getElementById(defaultIconId);
    if (!input || !preview || !defaultIcon) return;

    const dropZone = input.closest('.photo-upload-container');

    // Shared handler: given a File object, render preview + remove button
    function handleFile(file) {
        if (!file) return;

        defaultIcon.style.display = 'none';
        preview.innerHTML = '';

        if (isImage && file.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            img.style.cssText = 'max-width:150px; max-height:150px; display:block; margin-top:8px; border-radius:6px;';
            preview.appendChild(img);
        } else {
            // For non-image files (e.g. PDF tax cert) show the filename
            const nameEl = document.createElement('div');
            nameEl.textContent = file.name;
            nameEl.style.cssText = 'font-size:0.95em; margin-top:4px; word-break:break-all;';
            preview.appendChild(nameEl);
        }

        // Remove (×) button
        const removeBtn = document.createElement('button');
        removeBtn.textContent = '×';
        removeBtn.type = 'button';
        removeBtn.title = 'Remove file';
        removeBtn.style.cssText = 'margin-left:20px; background:transparent; border:none; color:#ff0000; font-size:2em; cursor:pointer; line-height:1; vertical-align:middle;';
        removeBtn.onclick = function(e) {
            e.stopPropagation();
            input.value = '';
            preview.innerHTML = '';
            defaultIcon.style.display = '';
            // Reset drop zone border back to default dashed style
            if (dropZone) {
                dropZone.style.borderColor = '';
                dropZone.style.boxShadow = '';
                dropZone.style.borderStyle = 'dashed';
            }
        };
        removeBtn.onmousedown = function(e) { e.stopPropagation(); };
        preview.appendChild(removeBtn);

        // Clear any validation error on this upload zone
        if (dropZone) {
            dropZone.style.borderColor = '';
            dropZone.style.boxShadow = '';
            const errMsg = dropZone.nextElementSibling;
            if (errMsg && errMsg.classList.contains('field-error-msg')) errMsg.remove();
        }
    }

    // --- Existing click-to-browse behaviour ---
    input.addEventListener('change', function(e) {
        handleFile(e.target.files[0]);
    });

    if (!dropZone) return;

    // --- Drag-and-drop ---
    dropZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.style.borderColor = 'var(--primary-green)';
        dropZone.style.borderStyle = 'solid';
        dropZone.style.background = 'rgba(45, 95, 63, 0.05)';
    });

    dropZone.addEventListener('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        // Only reset if we've actually left the zone (not just moved to a child element)
        if (!dropZone.contains(e.relatedTarget)) {
            dropZone.style.borderColor = '';
            dropZone.style.borderStyle = 'dashed';
            dropZone.style.background = '';
        }
    });

    dropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.style.borderColor = '';
        dropZone.style.borderStyle = 'dashed';
        dropZone.style.background = '';

        const files = e.dataTransfer.files;
        if (!files || files.length === 0) return;

        // Validate file type against the input's accept attribute
        const acceptedTypes = input.accept ? input.accept.split(',').map(t => t.trim()) : [];
        const file = files[0];

        if (acceptedTypes.length > 0) {
            const isAccepted = acceptedTypes.some(type => {
                if (type.startsWith('.')) {
                    return file.name.toLowerCase().endsWith(type.toLowerCase());
                }
                // e.g. "image/*"
                const [mainType, subType] = type.split('/');
                const [fileMain, fileSub] = file.type.split('/');
                return mainType === fileMain && (subType === '*' || subType === fileSub);
            });

            if (!isAccepted) {
                // Show a brief error and bail out
                dropZone.style.borderColor = 'var(--error-red)';
                dropZone.style.borderStyle = 'solid';
                const tempMsg = document.createElement('span');
                tempMsg.className = 'field-error-msg';
                tempMsg.style.cssText = 'color: var(--error-red); font-size: 0.82rem; margin-top: 4px; display: block;';
                tempMsg.textContent = 'Invalid file type. Please upload a ' + (isImage ? 'image' : 'PDF, JPG, or PNG') + ' file.';
                // Remove after 3s
                const existing = dropZone.nextElementSibling;
                if (existing && existing.classList.contains('field-error-msg')) existing.remove();
                dropZone.parentNode.insertBefore(tempMsg, dropZone.nextSibling);
                setTimeout(() => tempMsg.remove(), 3000);
                return;
            }
        }

        // Transfer file to the hidden input via DataTransfer
        try {
            const dt = new DataTransfer();
            dt.items.add(file);
            input.files = dt.files;
        } catch (err) {
            // DataTransfer not supported in some older browsers — fall back gracefully
            console.warn('DataTransfer assignment not supported:', err);
        }

        handleFile(file);
    });
}

function replacePassportPhotoIcon() {
    setupUploadZone('passportPhotoInput', 'passportPhotoPreview', 'pre-img-upload', true);
}

function replacePassportPhotoIcon2() {
    setupUploadZone('passportPhotoInput2', 'passportPhotoPreview2', 'pre-img-upload2', true);
}

function replaceTaxCertIcon() {
    setupUploadZone('taxExemptionCertInput', 'taxCertificatePreview', 'pre-cert-upload', false);
}

function replaceKraPinCertIcon() {
    setupUploadZone('kraPinCertInput', 'kraPinCertPreview', 'pre-kra-cert-upload', false);
}

function replaceKraPinCertIcon2() {
    setupUploadZone('kraPinCertInput2', 'kraPinCertPreview2', 'pre-kra-cert-upload2', false);
}




//
//      ADDITIONAL INFO PAGE
//      ADDITIONAL INFO PAGE
//
//




function toggleFundSourceFields() {
    const fundSource = document.getElementById('fundSource').value;
    const employmentFields = document.getElementById('employmentFields');
    const businessFields = document.getElementById('businessFields');

    // Hide both sections first
    employmentFields.style.display = 'none';
    businessFields.style.display = 'none';
    
    // Show relevant section based on selection
    if (fundSource === 'Employment') {
        employmentFields.style.display = 'contents';
        // Clear business fields
        businessFields.querySelectorAll('input').forEach(input => input.value = '');
    } else if (fundSource === 'Business') {
        businessFields.style.display = 'contents';
        // Clear employment fields
        employmentFields.querySelectorAll('input').forEach(input => input.value = '');
    }
}

function toggleFundSourceFields2() {
    const fundSource = document.getElementById('fundSource2').value;
    const employmentFields = document.getElementById('employmentFields2');
    const businessFields = document.getElementById('businessFields2');
    
    employmentFields.style.display = 'none';
    businessFields.style.display = 'none';
    
    if (fundSource === 'Employment') {
        employmentFields.style.display = 'contents';
        businessFields.querySelectorAll('input').forEach(input => input.value = '');
    } else if (fundSource === 'Business') {
        businessFields.style.display = 'contents';
        employmentFields.querySelectorAll('input').forEach(input => input.value = '');
    }
}



//
//      PAYMENT PAGE
//      PAYMENT PAGE
//
//



function togglePaymentFields() {
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
    const branchCodeField = document.getElementById('branchCodeField');
    const swiftCodeField = document.getElementById('swiftCodeField');
    const currencyField = document.getElementById('currencyField');
    const mobileMoneySection = document.getElementById('mobileMoneySection');
    const banksGroup = document.getElementById('banks-group');
    const branchCodeResult = document.getElementById('branchCodeResult');
    
    // Hide all fields first
    branchCodeField.style.display = 'none';
    swiftCodeField.style.display = 'none';
    currencyField.style.display = 'none';
    mobileMoneySection.style.display = 'none';
    branchCodeResult.style.display = 'none';
    
    // Show relevant fields based on selection
    if (paymentMethod === 'domestic') {
        banksGroup.style.display = 'block';
        branchCodeField.style.display = 'block';
        branchCodeResult.style.display = 'block';
    } else if (paymentMethod === 'international') {
        banksGroup.style.display = 'block';
        swiftCodeField.style.display = 'block';
        currencyField.style.display = 'block';
    } else if (paymentMethod === 'mobile') {
        banksGroup.style.display = 'none';
        mobileMoneySection.style.display = 'block';
    }
}

function toggleTaxCertificateUpload() {
    const taxExempt = document.querySelector('input[name="taxExempt"]:checked').value;
    const uploadField = document.getElementById('taxCertificateUpload');
    
    if (taxExempt === 'yes') {
        uploadField.style.display = 'block';
    } else {
        uploadField.style.display = 'none';
    }
}

// Load bank data
let bankData = [];

// Fetch JSON file with bank list
fetch('../assets/KenyaBanks.json')
    .then(response => response.json())
    .then(data => {
        bankData = data;
    })
    .catch(error => console.error('Error loading bank data:', error));

// Bank autocomplete functionality
function setupBankAutocomplete() {
    const bankInput = document.getElementById('bankNameInput');
    const suggestionsList = document.getElementById('bankSuggestions');
    let selectingSuggestion = false;

    bankInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        suggestionsList.innerHTML = '';
        
        if (searchTerm.length < 2) {
            suggestionsList.style.display = 'none';
            return;
        }
        
        // Get bank names
        const uniqueBanks = [...new Set(bankData.map(item => item['Bank Name']))];
        
        // Filter banks that match the search term
        const matches = uniqueBanks.filter(bank => 
            bank.toLowerCase().includes(searchTerm)
        ).slice(0, 8); // Limit to 8 suggestions
        
        if (matches.length > 0) {
            matches.forEach(bank => {
                const li = document.createElement('li');
                li.textContent = bank;
                li.classList.add('bank-suggestion-item');
                li.addEventListener('mousedown', function(e) {
                    selectingSuggestion = true;
                });
                li.addEventListener('click', function() {
                    bankInput.value = bank;
                    suggestionsList.style.display = 'none';
                    suggestionsList.innerHTML = '';
                });
                suggestionsList.appendChild(li);
            });
            suggestionsList.style.display = 'block';
        } else {
            suggestionsList.style.display = 'none';
        }
    });

    // Prevent users from moving on without selecting a valid bank
    bankInput.addEventListener('blur', function() {
        setTimeout(function() {
            if (selectingSuggestion) {
                selectingSuggestion = false;
                return;
            }
            const uniqueBanks = [...new Set(bankData.map(item => item['Bank Name']))];
            if (!uniqueBanks.includes(bankInput.value)) {
                bankInput.value = '';
            }
            suggestionsList.style.display = 'none';
        }, 100);
    });

    // Close suggestions when clicking outside
    document.addEventListener('click', function(e) {
        if (e.target !== bankInput && e.target !== suggestionsList) {
            suggestionsList.style.display = 'none';
        }
    });
}

// Branch code validation
function validateBranchCode() {
    const bankName = document.getElementById('bankNameInput').value;
    const branchInput = document.getElementById('branchCode');
    const branchValue = branchInput.value.trim();
    const resultDiv = document.getElementById('branchCodeResult');
    
    // Clear previous results
    resultDiv.innerHTML = '';
    removeBranchDropdown();
    
    if (!bankName || !branchValue) return;
    
    const isNumeric = /^\d+$/.test(branchValue);
    
    if (isNumeric) {
        // Number mode: Check branch name by code 
        const match = bankData.find(item =>
            item['Bank Name'] === bankName &&
            item['Branch Code'] == branchValue
        );
        
        if (match) {
            resultDiv.innerHTML = `
                <div style="color: var(--success-green); font-weight: 500; padding: 12px; background: rgba(16, 185, 129, 0.1); border-radius: 6px; display: flex; align-items: center; gap: 8px;">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                    </svg>
                    <span>${match['Branch Name']}</span>
                </div>
            `;
        } else if (branchValue.length >= 2) {
            resultDiv.innerHTML = `
                <div style="color: var(--error-red); font-weight: 500; padding: 12px; background: rgba(239, 68, 68, 0.1); border-radius: 6px; display: flex; align-items: center; gap: 8px;">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                    </svg>
                    <span>Branch code not found for this bank</span>
                </div>
            `;
        }
        
    } else {
        // Text mode: If the client doesnt know their branch code, they can search by name instead
        if (branchValue.length < 2) return;
        
        const matches = bankData.filter(item =>
            item['Bank Name'] === bankName &&
            item['Branch Name'].toLowerCase().includes(branchValue.toLowerCase())
        ).slice(0, 8);
        
        if (matches.length > 0) {
            showBranchDropdown(matches, branchInput);
        }
    }
}

function showBranchDropdown(matches, inputEl) {
    removeBranchDropdown();
    
    const dropdown = document.createElement('ul');
    dropdown.id = 'branchSuggestions';
    dropdown.style.cssText = `
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: white;
        border: 2px solid var(--primary-blue);
        border-top: none;
        border-radius: 0 0 8px 8px;
        max-height: 240px;
        overflow-y: auto;
        z-index: 100;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        list-style: none;
        margin: 0;
        padding: 0;
    `;
    
    matches.forEach(branch => {
        const li = document.createElement('li');
        li.style.cssText = 'padding: 12px 16px; cursor: pointer; font-size: 0.95rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color);';
        li.innerHTML = `
            <span>${branch['Branch Name']}</span>
            <span style="font-family: monospace; color: var(--text-light); font-size: 0.85rem;">Code: ${branch['Branch Code']}</span>
        `;
        
        li.addEventListener('mouseenter', () => li.style.background = 'var(--bg-light)');
        li.addEventListener('mouseleave', () => li.style.background = 'white');
        
        li.addEventListener('click', () => {
            // Fill the input with the branch code and show the branch name as confirmation
            inputEl.value = branch['Branch Code'];
            removeBranchDropdown();
            
            // Trigger numeric validation to display the confirmation label
            validateBranchCode();
        });
        
        dropdown.appendChild(li);
    });
    
    // Position relative to input
    inputEl.parentElement.style.position = 'relative';
    inputEl.parentElement.appendChild(dropdown);
    
    // Close on outside click
    document.addEventListener('click', handleBranchOutsideClick);
}

function removeBranchDropdown() {
    const existing = document.getElementById('branchSuggestions');
    if (existing) existing.remove();
    document.removeEventListener('click', handleBranchOutsideClick);
}

function handleBranchOutsideClick(e) {
    const dropdown = document.getElementById('branchSuggestions');
    const input = document.getElementById('branchCode');
    if (dropdown && e.target !== input && !dropdown.contains(e.target)) {
        removeBranchDropdown();
    }
}

// Country code selection
function setupCountryCodeAutocomplete(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    input.addEventListener('input', function () {
        const val = this.value.trim();
        removeCountryCodeDropdown();

        if (!val) return;

        const isNumeric = /^[\d+]/.test(val);
        const search = val.replace(/^\+/, '').toLowerCase();

        let matches;
        if (isNumeric) {
            // Search by dial code — strip leading + from both sides
            matches = COUNTRY_DIAL_CODES.filter(c =>
                c.dial.replace('+', '').startsWith(search)
            ).slice(0, 8);
        } else {
            // Search by country name
            matches = COUNTRY_DIAL_CODES.filter(c =>
                c.name.toLowerCase().includes(search)
            ).slice(0, 8);
        }

        if (matches.length > 0) {
            showCountryCodeDropdown(matches, input);
        }
    });

    // Clear dropdown on blur (slight delay so click registers first)
    input.addEventListener('blur', function () {
        setTimeout(removeCountryCodeDropdown, 180);
    });
}

function showCountryCodeDropdown(matches, inputEl) {
    removeCountryCodeDropdown();

    const dropdown = document.createElement('ul');
    dropdown.id = 'countryCodeSuggestions';
    dropdown.style.cssText = `
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: white;
        border: 2px solid var(--primary-blue);
        border-top: none;
        border-radius: 0 0 8px 8px;
        max-height: 240px;
        overflow-y: auto;
        z-index: 100;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        list-style: none;
        margin: 0;
        padding: 0;
    `;

    matches.forEach(country => {
        const li = document.createElement('li');
        li.style.cssText = 'padding: 12px 16px; cursor: pointer; font-size: 0.95rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color);';
        li.innerHTML = `
            <span>${country.name}</span>
            <span style="font-family: monospace; color: var(--text-light); font-size: 0.85rem;">${country.dial}</span>
        `;

        li.addEventListener('mouseenter', () => li.style.background = 'var(--bg-light)');
        li.addEventListener('mouseleave', () => li.style.background = 'white');

        li.addEventListener('click', () => {
            inputEl.value = country.dial;
            removeCountryCodeDropdown();
            // Clear any validation error on the field
            inputEl.style.borderColor = '';
            inputEl.style.boxShadow = '';
            const err = inputEl.parentElement.querySelector('.field-error-msg');
            if (err) err.remove();
        });

        dropdown.appendChild(li);
    });

    inputEl.parentElement.style.position = 'relative';
    inputEl.parentElement.appendChild(dropdown);

    document.addEventListener('click', handleCountryCodeOutsideClick);
}

function removeCountryCodeDropdown() {
    const existing = document.getElementById('countryCodeSuggestions');
    if (existing) existing.remove();
    document.removeEventListener('click', handleCountryCodeOutsideClick);
}

function handleCountryCodeOutsideClick(e) {
    const dropdown = document.getElementById('countryCodeSuggestions');
    const inputs = ['primaryCountryCode', 'secondaryCountryCode'].map(id => document.getElementById(id));
    if (dropdown && !inputs.includes(e.target) && !dropdown.contains(e.target)) {
        removeCountryCodeDropdown();
    }
}




const COUNTRY_DIAL_CODES = [
    { name: "Afghanistan", dial: "+93", code: "AF" },
    { name: "Albania", dial: "+355", code: "AL" },
    { name: "Algeria", dial: "+213", code: "DZ" },
    { name: "Andorra", dial: "+376", code: "AD" },
    { name: "Angola", dial: "+244", code: "AO" },
    { name: "Antigua and Barbuda", dial: "+1268", code: "AG" },
    { name: "Argentina", dial: "+54", code: "AR" },
    { name: "Armenia", dial: "+374", code: "AM" },
    { name: "Australia", dial: "+61", code: "AU" },
    { name: "Austria", dial: "+43", code: "AT" },
    { name: "Azerbaijan", dial: "+994", code: "AZ" },
    { name: "Bahamas", dial: "+1242", code: "BS" },
    { name: "Bahrain", dial: "+973", code: "BH" },
    { name: "Bangladesh", dial: "+880", code: "BD" },
    { name: "Barbados", dial: "+1246", code: "BB" },
    { name: "Belarus", dial: "+375", code: "BY" },
    { name: "Belgium", dial: "+32", code: "BE" },
    { name: "Belize", dial: "+501", code: "BZ" },
    { name: "Benin", dial: "+229", code: "BJ" },
    { name: "Bhutan", dial: "+975", code: "BT" },
    { name: "Bolivia", dial: "+591", code: "BO" },
    { name: "Bosnia and Herzegovina", dial: "+387", code: "BA" },
    { name: "Botswana", dial: "+267", code: "BW" },
    { name: "Brazil", dial: "+55", code: "BR" },
    { name: "Brunei", dial: "+673", code: "BN" },
    { name: "Bulgaria", dial: "+359", code: "BG" },
    { name: "Burkina Faso", dial: "+226", code: "BF" },
    { name: "Burundi", dial: "+257", code: "BI" },
    { name: "Cambodia", dial: "+855", code: "KH" },
    { name: "Cameroon", dial: "+237", code: "CM" },
    { name: "Canada", dial: "+1", code: "CA" },
    { name: "Cape Verde", dial: "+238", code: "CV" },
    { name: "Central African Republic", dial: "+236", code: "CF" },
    { name: "Chad", dial: "+235", code: "TD" },
    { name: "Chile", dial: "+56", code: "CL" },
    { name: "China", dial: "+86", code: "CN" },
    { name: "Colombia", dial: "+57", code: "CO" },
    { name: "Comoros", dial: "+269", code: "KM" },
    { name: "Congo", dial: "+242", code: "CG" },
    { name: "DR Congo", dial: "+243", code: "CD" },
    { name: "Costa Rica", dial: "+506", code: "CR" },
    { name: "Cote d'Ivoire", dial: "+225", code: "CI" },
    { name: "Croatia", dial: "+385", code: "HR" },
    { name: "Cuba", dial: "+53", code: "CU" },
    { name: "Cyprus", dial: "+357", code: "CY" },
    { name: "Czech Republic", dial: "+420", code: "CZ" },
    { name: "Denmark", dial: "+45", code: "DK" },
    { name: "Djibouti", dial: "+253", code: "DJ" },
    { name: "Dominica", dial: "+1767", code: "DM" },
    { name: "Dominican Republic", dial: "+1849", code: "DO" },
    { name: "Ecuador", dial: "+593", code: "EC" },
    { name: "Egypt", dial: "+20", code: "EG" },
    { name: "El Salvador", dial: "+503", code: "SV" },
    { name: "Equatorial Guinea", dial: "+240", code: "GQ" },
    { name: "Eritrea", dial: "+291", code: "ER" },
    { name: "Estonia", dial: "+372", code: "EE" },
    { name: "Ethiopia", dial: "+251", code: "ET" },
    { name: "Fiji", dial: "+679", code: "FJ" },
    { name: "Finland", dial: "+358", code: "FI" },
    { name: "France", dial: "+33", code: "FR" },
    { name: "Gabon", dial: "+241", code: "GA" },
    { name: "Gambia", dial: "+220", code: "GM" },
    { name: "Georgia", dial: "+995", code: "GE" },
    { name: "Germany", dial: "+49", code: "DE" },
    { name: "Ghana", dial: "+233", code: "GH" },
    { name: "Greece", dial: "+30", code: "GR" },
    { name: "Grenada", dial: "+1473", code: "GD" },
    { name: "Guatemala", dial: "+502", code: "GT" },
    { name: "Guinea", dial: "+224", code: "GN" },
    { name: "Guinea-Bissau", dial: "+245", code: "GW" },
    { name: "Guyana", dial: "+595", code: "GY" },
    { name: "Haiti", dial: "+509", code: "HT" },
    { name: "Vatican City", dial: "+379", code: "VA" },
    { name: "Honduras", dial: "+504", code: "HN" },
    { name: "Hungary", dial: "+36", code: "HU" },
    { name: "Iceland", dial: "+354", code: "IS" },
    { name: "India", dial: "+91", code: "IN" },
    { name: "Indonesia", dial: "+62", code: "ID" },
    { name: "Iran", dial: "+98", code: "IR" },
    { name: "Iraq", dial: "+964", code: "IQ" },
    { name: "Ireland", dial: "+353", code: "IE" },
    { name: "Israel", dial: "+972", code: "IL" },
    { name: "Italy", dial: "+39", code: "IT" },
    { name: "Jamaica", dial: "+1876", code: "JM" },
    { name: "Japan", dial: "+81", code: "JP" },
    { name: "Jordan", dial: "+962", code: "JO" },
    { name: "Kazakhstan", dial: "+77", code: "KZ" },
    { name: "Kenya", dial: "+254", code: "KE" },
    { name: "Kiribati", dial: "+686", code: "KI" },
    { name: "North Korea", dial: "+850", code: "KP" },
    { name: "South Korea", dial: "+82", code: "KR" },
    { name: "Kuwait", dial: "+965", code: "KW" },
    { name: "Kyrgyzstan", dial: "+996", code: "KG" },
    { name: "Laos", dial: "+856", code: "LA" },
    { name: "Latvia", dial: "+371", code: "LV" },
    { name: "Lebanon", dial: "+961", code: "LB" },
    { name: "Lesotho", dial: "+266", code: "LS" },
    { name: "Liberia", dial: "+231", code: "LR" },
    { name: "Libya", dial: "+218", code: "LY" },
    { name: "Liechtenstein", dial: "+423", code: "LI" },
    { name: "Lithuania", dial: "+370", code: "LT" },
    { name: "Luxembourg", dial: "+352", code: "LU" },
    { name: "North Macedonia", dial: "+389", code: "MK" },
    { name: "Madagascar", dial: "+261", code: "MG" },
    { name: "Malawi", dial: "+265", code: "MW" },
    { name: "Malaysia", dial: "+60", code: "MY" },
    { name: "Maldives", dial: "+960", code: "MV" },
    { name: "Mali", dial: "+223", code: "ML" },
    { name: "Malta", dial: "+356", code: "MT" },
    { name: "Marshall Islands", dial: "+692", code: "MH" },
    { name: "Mauritania", dial: "+222", code: "MR" },
    { name: "Mauritius", dial: "+230", code: "MU" },
    { name: "Mexico", dial: "+52", code: "MX" },
    { name: "Micronesia", dial: "+691", code: "FM" },
    { name: "Moldova", dial: "+373", code: "MD" },
    { name: "Monaco", dial: "+377", code: "MC" },
    { name: "Mongolia", dial: "+976", code: "MN" },
    { name: "Montenegro", dial: "+382", code: "ME" },
    { name: "Montserrat", dial: "+1664", code: "MS" },
    { name: "Morocco", dial: "+212", code: "MA" },
    { name: "Mozambique", dial: "+258", code: "MZ" },
    { name: "Myanmar", dial: "+95", code: "MM" },
    { name: "Namibia", dial: "+264", code: "NA" },
    { name: "Nauru", dial: "+674", code: "NR" },
    { name: "Nepal", dial: "+977", code: "NP" },
    { name: "Netherlands", dial: "+31", code: "NL" },
    { name: "New Zealand", dial: "+64", code: "NZ" },
    { name: "Nicaragua", dial: "+505", code: "NI" },
    { name: "Niger", dial: "+227", code: "NE" },
    { name: "Nigeria", dial: "+234", code: "NG" },
    { name: "Niue", dial: "+683", code: "NU" },
    { name: "Norway", dial: "+47", code: "NO" },
    { name: "Oman", dial: "+968", code: "OM" },
    { name: "Pakistan", dial: "+92", code: "PK" },
    { name: "Palau", dial: "+680", code: "PW" },
    { name: "Palestinian Territory, Occupied", dial: "+970", code: "PS" },
    { name: "Panama", dial: "+507", code: "PA" },
    { name: "Papua New Guinea", dial: "+675", code: "PG" },
    { name: "Paraguay", dial: "+595", code: "PY" },
    { name: "Peru", dial: "+51", code: "PE" },
    { name: "Philippines", dial: "+63", code: "PH" },
    { name: "Poland", dial: "+48", code: "PL" },
    { name: "Portugal", dial: "+351", code: "PT" },
    { name: "Qatar", dial: "+974", code: "QA" },
    { name: "Romania", dial: "+40", code: "RO" },
    { name: "Russia", dial: "+7", code: "RU" },
    { name: "Rwanda", dial: "+250", code: "RW" },
    { name: "Saint Kitts and Nevis", dial: "+1869", code: "KN" },
    { name: "Saint Lucia", dial: "+1758", code: "LC" },
    { name: "Saint Vincent and the Grenadines", dial: "+1784", code: "VC" },
    { name: "Samoa", dial: "+685", code: "WS" },
    { name: "San Marino", dial: "+378", code: "SM" },
    { name: "Sao Tome and Principe", dial: "+239", code: "ST" },
    { name: "Saudi Arabia", dial: "+966", code: "SA" },
    { name: "Senegal", dial: "+221", code: "SN" },
    { name: "Serbia", dial: "+381", code: "RS" },
    { name: "Seychelles", dial: "+248", code: "SC" },
    { name: "Sierra Leone", dial: "+232", code: "SL" },
    { name: "Singapore", dial: "+65", code: "SG" },
    { name: "Slovakia", dial: "+421", code: "SK" },
    { name: "Slovenia", dial: "+386", code: "SI" },
    { name: "Solomon Islands", dial: "+677", code: "SB" },
    { name: "Somalia", dial: "+252", code: "SO" },
    { name: "South Africa", dial: "+27", code: "ZA" },
    { name: "South Sudan", dial: "+211", code: "SS" },
    { name: "Spain", dial: "+34", code: "ES" },
    { name: "Sri Lanka", dial: "+94", code: "LK" },
    { name: "Sudan", dial: "+249", code: "SD" },
    { name: "Suriname", dial: "+597", code: "SR" },
    { name: "Swaziland", dial: "+268", code: "SZ" },
    { name: "Sweden", dial: "+46", code: "SE" },
    { name: "Switzerland", dial: "+41", code: "CH" },
    { name: "Syria", dial: "+963", code: "SY" },
    { name: "Taiwan", dial: "+886", code: "TW" },
    { name: "Tajikistan", dial: "+992", code: "TJ" },
    { name: "Tanzania", dial: "+255", code: "TZ" },
    { name: "Thailand", dial: "+66", code: "TH" },
    { name: "Timor-Leste", dial: "+670", code: "TL" },
    { name: "Togo", dial: "+228", code: "TG" },
    { name: "Tonga", dial: "+676", code: "TO" },
    { name: "Trinidad and Tobago", dial: "+1868", code: "TT" },
    { name: "Tunisia", dial: "+216", code: "TN" },
    { name: "Turkey", dial: "+90", code: "TR" },
    { name: "Turkmenistan", dial: "+993", code: "TM" },
    { name: "Tuvalu", dial: "+688", code: "TV" },
    { name: "Uganda", dial: "+256", code: "UG" },
    { name: "Ukraine", dial: "+380", code: "UA" },
    { name: "United Arab Emirates", dial: "+971", code: "AE" },
    { name: "United Kingdom", dial: "+44", code: "GB" },
    { name: "United States", dial: "+1", code: "US" },
    { name: "Uruguay", dial: "+598", code: "UY" },
    { name: "Uzbekistan", dial: "+998", code: "UZ" },
    { name: "Vanuatu", dial: "+678", code: "VU" },
    { name: "Venezuela", dial: "+58", code: "VE" },
    { name: "Vietnam", dial: "+84", code: "VN" },
    { name: "Yemen", dial: "+967", code: "YE" },
    { name: "Zambia", dial: "+260", code: "ZM" },
    { name: "Zimbabwe", dial: "+263", code: "ZW" },
];


// For nationality/country of residence fields
const countries = [
    "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", 
    "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", 
    "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", 
    "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", 
    "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia", "Cameroon", "Canada", 
    "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", 
    "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic", 
    "Democratic Republic of the Congo", "Denmark", "Djibouti", "Dominica", 
    "Dominican Republic", "East Timor", "Ecuador", "Egypt", "El Salvador", 
    "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", 
    "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", 
    "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", 
    "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", 
    "Italy", "Ivory Coast", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", 
    "Kiribati", "Kosovo", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", 
    "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", 
    "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", 
    "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", 
    "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", 
    "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", 
    "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", "Palestine", "Panama", 
    "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", 
    "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", 
    "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", 
    "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", 
    "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", 
    "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", 
    "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Togo", "Tonga", 
    "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda", 
    "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", 
    "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", 
    "Zimbabwe"
];


function populateCountryDropdowns() {
    const nationalitySelect = document.getElementById('nationality');
    const residenceSelect = document.getElementById('countryOfResidence');
    const nationalitySelect2 = document.getElementById('secondaryNationality');
    const residenceSelect2 = document.getElementById('secondaryCountryOfResidence');
    
    // Clear existing options except the placeholder
    [nationalitySelect, residenceSelect, nationalitySelect2, residenceSelect2].forEach(select => {
        if (select) {
            select.innerHTML = '<option value="">Select country</option>';
        }
    });
    
    // Add country options
    countries.forEach(country => {
        [nationalitySelect, residenceSelect, nationalitySelect2, residenceSelect2].forEach(select => {
            if (select) {
                const option = document.createElement('option');
                option.value = country;
                option.textContent = country;
                
                // Pre-select Kenya for Kenyan users
                if (country === 'Kenya') {
                    option.selected = true;
                }
                
                select.appendChild(option);
            }
        });
    });
}



//
//      DECLARATION PAGE
//      DECLARATION PAGE
//
//



// --- Signature Canvas Logic ---
const signatureStates = new Map(); // canvasId -> { isDrawing, lastX, lastY }

function resizeCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
}

function getCanvasCoordinates(canvas, clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: clientX - rect.left,
        y: clientY - rect.top
    };
}

function startDrawing(e) {
    if (e.type.startsWith('touch')) e.preventDefault();
    const canvas = e.currentTarget;
    const id = canvas.id;
    let state = signatureStates.get(id) || { isDrawing: false, lastX: 0, lastY: 0 };
    let coords;
    if (e.type.startsWith('touch')) {
        const touch = e.touches[0];
        coords = getCanvasCoordinates(canvas, touch.clientX, touch.clientY);
    } else {
        coords = getCanvasCoordinates(canvas, e.clientX, e.clientY);
    }
    state.isDrawing = true;
    state.lastX = coords.x;
    state.lastY = coords.y;
    signatureStates.set(id, state);
}

function draw(e) {
    if (e.type.startsWith('touch')) e.preventDefault();
    const canvas = e.currentTarget;
    const id = canvas.id;
    let state = signatureStates.get(id);
    if (!state || !state.isDrawing) return;
    let coords;
    if (e.type.startsWith('touch')) {
        const touch = e.touches[0];
        coords = getCanvasCoordinates(canvas, touch.clientX, touch.clientY);
    } else {
        coords = getCanvasCoordinates(canvas, e.clientX, e.clientY);
    }
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(state.lastX, state.lastY);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    state.lastX = coords.x;
    state.lastY = coords.y;
    signatureStates.set(id, state);
}

function stopDrawing(e) {
    const canvas = e.currentTarget;
    const id = canvas.id;
    let state = signatureStates.get(id);
    if (state) {
        state.isDrawing = false;
        signatureStates.set(id, state);
    }
}

function clearSignature(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function initSignatureCanvas(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    resizeCanvas(canvas);
    window.addEventListener('resize', () => resizeCanvas(canvas));
    // Remove old event listeners by cloning
    const newCanvas = canvas.cloneNode(true);
    canvas.parentNode.replaceChild(newCanvas, canvas);
    const freshCanvas = document.getElementById(canvasId);
    resizeCanvas(freshCanvas);
    window.addEventListener('resize', () => resizeCanvas(freshCanvas));
    // Mouse events
    freshCanvas.addEventListener('mousedown', startDrawing);
    freshCanvas.addEventListener('mousemove', draw);
    freshCanvas.addEventListener('mouseup', stopDrawing);
    freshCanvas.addEventListener('mouseout', stopDrawing);
    // Touch events for mobile
    freshCanvas.addEventListener('touchstart', startDrawing, { passive: false });
    freshCanvas.addEventListener('touchmove', draw, { passive: false });
    freshCanvas.addEventListener('touchend', stopDrawing);
}


// =============================================
//  POSTAL ADDRESS PREFIX
// =============================================

/**
 * Prepends "P.O. Box " to a postal address value, stripping any prefix
 * the user may have already typed so it never gets doubled.
 * Returns an empty string unchanged (optional field).
 */
function formatPostalAddress(value) {
    if (!value || !value.trim()) return '';
    // Regex to match any variation of 'po box' at the start, with/without dots/spaces/case
    // Examples: po box, p.o box, p o box, p.o. box, POBOX, etc.
    const poBoxPattern = /^(p\s*\.?\s*o\s*\.?\s*box\b)/i;
    let trimmed = value.trim();
    if (poBoxPattern.test(trimmed)) {
        // Replace the detected prefix with 'P.O. Box'
        trimmed = trimmed.replace(poBoxPattern, 'P.O. Box');
        return trimmed;
    }
    // If no PO Box prefix, return as-is
    return trimmed;
}


// =============================================
//  KRA PIN VALIDATION
// =============================================

const KRA_PIN_REGEX = /^[A-Za-z][A-Za-z0-9]{9}[A-Za-z]$/;

/**
 * Attaches live (blur + input) KRA PIN format validation to a field by ID.
 * Shows an inline error message beneath the field if invalid.
 */
function setupKraPinValidation(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    function validate() {
        // Remove any existing KRA error on this field
        const existingErr = field.parentNode.querySelector('.kra-error-msg');
        if (existingErr) existingErr.remove();
        field.style.borderColor = '';
        field.style.boxShadow = '';

        const val = field.value.trim();
        if (!val) return; // Empty is handled by required validation

        if (!KRA_PIN_REGEX.test(val)) {
            field.style.borderColor = 'var(--error-red)';
            field.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.15)';
            const msg = document.createElement('span');
            msg.className = 'kra-error-msg field-error-msg';
            msg.style.cssText = 'color: var(--error-red); font-size: 0.82rem; margin-top: 4px; display: block;';
            msg.textContent = 'Invalid KRA PIN — must be 11 characters, starting and ending with a letter (e.g. A123456789B).';
            field.parentNode.insertBefore(msg, field.nextSibling);
        } else {
            // Valid — show a brief green confirmation
            field.style.borderColor = 'var(--success-green)';
            field.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.15)';
        }
    }

    field.addEventListener('blur', validate);
    // Re-validate on input so the error clears as soon as the format is met
    field.addEventListener('input', function() {
        const existingErr = field.parentNode.querySelector('.kra-error-msg');
        if (existingErr) validate(); // Only re-run if there's already an error showing
    });
}


// =============================================
//  EMAIL CONFIRM FIELD
// =============================================

const EMAIL_REGEX_LIVE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Dynamically injects a "Confirm Email Address" field directly after the
 * given email input's .form-group, and wires up:
 *  - Paste blocking on the confirm field
 *  - Live match checking on blur of either field
 *
 * @param {string}  emailFieldId  - id of the original email <input>
 * @param {boolean} isJointField  - true if this field is inside .jointAccountSection
 */
function injectEmailConfirmField(emailFieldId, isJointField) {
    const emailField = document.getElementById(emailFieldId);
    if (!emailField) return;

    const confirmId = isJointField ? 'secondary_email_confirm' : 'primary_email_confirm';

    // Don't inject twice
    if (document.getElementById(confirmId)) return;

    // Build the confirm group, mirroring the style of the original
    const confirmGroup = document.createElement('div');
    confirmGroup.className = 'form-group full-width';
    if (isJointField) confirmGroup.classList.add('email-confirm-joint');

    const label = document.createElement('label');
    label.className = 'form-label required';
    label.setAttribute('for', confirmId);
    label.textContent = 'Confirm Email Address';

    const input = document.createElement('input');
    input.type = 'email';
    input.id = confirmId;
    input.className = 'form-input';
    input.placeholder = 'Re-enter email address';
    input.autocomplete = 'off';

    // Block paste
    input.addEventListener('paste', function(e) {
        e.preventDefault();
        // Brief visual feedback
        input.style.borderColor = 'var(--accent-orange)';
        input.style.boxShadow = '0 0 0 3px rgba(255, 140, 0, 0.15)';
        const tip = document.createElement('span');
        tip.className = 'field-error-msg paste-blocked-msg';
        tip.style.cssText = 'color: var(--accent-orange); font-size: 0.82rem; margin-top: 4px; display: block;';
        tip.textContent = 'Please type your email — pasting is disabled for this field.';
        const existing = input.nextElementSibling;
        if (!existing || !existing.classList.contains('paste-blocked-msg')) {
            input.parentNode.insertBefore(tip, input.nextSibling);
            setTimeout(() => { tip.remove(); input.style.borderColor = ''; input.style.boxShadow = ''; }, 2500);
        }
    });

    confirmGroup.appendChild(label);
    confirmGroup.appendChild(input);

    // Insert immediately after the original email field's .form-group
    const originalGroup = emailField.closest('.form-group');
    if (originalGroup && originalGroup.parentNode) {
        originalGroup.parentNode.insertBefore(confirmGroup, originalGroup.nextSibling);
    }

    // Live match validation on blur of either field
    function checkMatch() {
        // Remove old match error
        const existingErr = input.parentNode.querySelector('.email-match-msg');
        if (existingErr) existingErr.remove();
        input.style.borderColor = '';
        input.style.boxShadow = '';
        emailField.style.borderColor = '';
        emailField.style.boxShadow = '';

        if (!input.value) return;

        if (input.value.trim() !== emailField.value.trim()) {
            input.style.borderColor = 'var(--error-red)';
            input.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.15)';
            const msg = document.createElement('span');
            msg.className = 'email-match-msg field-error-msg';
            msg.style.cssText = 'color: var(--error-red); font-size: 0.82rem; margin-top: 4px; display: block;';
            msg.textContent = 'Email addresses do not match.';
            input.parentNode.insertBefore(msg, input.nextSibling);
        } else {
            // Both match and confirm has a value — show green on confirm
            input.style.borderColor = 'var(--success-green)';
            input.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.15)';
        }
    }

    input.addEventListener('blur', checkMatch);
    // If the user goes back to fix the original email, re-check
    emailField.addEventListener('blur', function() {
        if (input.value) checkMatch();
    });
}