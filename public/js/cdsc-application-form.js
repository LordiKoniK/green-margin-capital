window.openModal = openModal;

// Form-specific namespaces to prevent conflicts
const individualForm = {
    currentStep: 0,  // 0=pre-form checklist, 1-5=form, 6=review
    totalSteps: 5,
    DEV_MODE: true   // DEV MODE — set to true to bypass field validation during testing. Set to false for production.
};



function openModal() {
    document.getElementById('modalOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
    individualForm.currentStep = 0;
    updateProgress();

    // Initialize signature canvas after modal is fully rendered
    setTimeout(() => initSignatureCanvas("signatureCanvas"), 300);
    setTimeout(() => initSignatureCanvas("signatureCanvas2"), 300);

    populateCountryDropdown('nationality');
    populateCountryDropdown('countryOfResidence');
    populateCountryDropdown('secondaryNationality');
    populateCountryDropdown('secondaryCountryOfResidence');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
    document.body.style.overflow = 'auto';
}

function updateProgress() {
    // Update progress bar (only meaningful for steps 1-5)
    const progressFill = document.getElementById('progressFill');
    if (progressFill) {
        const pct = individualForm.currentStep >= 1 && individualForm.currentStep <= individualForm.totalSteps
            ? ((individualForm.currentStep - 1) / (individualForm.totalSteps - 1)) * 100
            : individualForm.currentStep === 6 ? 100 : 0;
        progressFill.style.width = pct + '%';
    }

    // Update step indicators
    document.querySelectorAll('.progress-step').forEach((step, index) => {
        const stepNumber = index + 1;
        if (stepNumber < individualForm.currentStep) {
            step.classList.add('completed');
            step.classList.remove('active');
        } else if (stepNumber === individualForm.currentStep) {
            step.classList.add('active');
            step.classList.remove('completed');
        } else {
            step.classList.remove('active', 'completed');
        }
    });

    // Initialize bank autocomplete at step 4:
    if (individualForm.currentStep === 4) {
        setTimeout(() => setupBankAutocomplete('bankNameInput','bankSuggestions','paymentMethod'), 100);
    }

    // Initialize canvas when reaching step 5
    if (individualForm.currentStep === 5) {
        setTimeout(() => initSignatureCanvas("signatureCanvas"), 300);
        setTimeout(() => initSignatureCanvas("signatureCanvas2"), 300);
        setTimeout(setupDeclarationPage, 50);
    }

    // Hide progress bar on checklist (0) and review (6)
    const progressContainer = document.querySelector('.progress-container');
    if (progressContainer) {
        progressContainer.style.display = (individualForm.currentStep === 0 || individualForm.currentStep === 6) ? 'none' : '';
    }

    // Show/hide form steps — checklist and review pages are handled separately
    const specialIds = new Set(['checklistPage', 'reviewPage', 'confirmationPage']);
    const formSteps = Array.from(document.querySelectorAll('.form-step'))
        .filter(s => !specialIds.has(s.id));
    formSteps.forEach((step, index) => {
        step.classList.toggle('active', index + 1 === individualForm.currentStep);
    });

    const checklistPage = document.getElementById('checklistPage');
    if (checklistPage) checklistPage.classList.toggle('active', individualForm.currentStep === 0);
    const reviewPage = document.getElementById('reviewPage');
    if (reviewPage) reviewPage.classList.toggle('active', individualForm.currentStep === 6);
    const confirmationPage = document.getElementById('confirmationPage');
    if (confirmationPage) confirmationPage.classList.toggle('active', individualForm.currentStep === 7);

    // Update buttons
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    prevBtn.style.display = (individualForm.currentStep === 0 || individualForm.currentStep === 7) ? 'none' : 'block';

    if (individualForm.currentStep === 0) {
        nextBtn.textContent = 'Begin Application';
    } else if (individualForm.currentStep === individualForm.totalSteps) {
        nextBtn.textContent = 'Review';
    } else if (individualForm.currentStep === 6) {
        nextBtn.textContent = 'Submit Application';
    } else {
        nextBtn.textContent = 'Next';
    }

    const modalBody = document.querySelector('.modal-body');
if (modalBody) {
    if (individualForm.currentStep === 7) {
        modalBody.style.paddingTop = '0';
        modalBody.style.paddingBottom = '0';
    } else {
        modalBody.style.paddingTop = '';
        modalBody.style.paddingBottom = '';
    }
}
}


// =============================================
//  PER-STEP VALIDATION
// =============================================

function validateCurrentStep() {
    if (individualForm.DEV_MODE) return true;

    const stepEl = document.querySelector(`.form-step[data-step="${individualForm.currentStep}"]`);
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

    // Helper: mark special non-text fields as invalid (help call util functions while maintaining invalid count)
    function flagInvalid(el, message, isUpload = false) {
    const marked = isUpload 
        ? markUploadInvalid(el, message) 
        : markRadioGroupInvalid(el, el);
    invalidCount++;
    if (!firstInvalidField) firstInvalidField = marked;
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
    if (individualForm.currentStep === 2) {
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
    if (individualForm.currentStep === 3) {
        const emailPairs = [
            { mainId: 'primaryEmail', confirmId: 'primaryEmailConfirm', joint: false },
            { mainId: 'secondaryEmail', confirmId: 'secondaryEmailConfirm', joint: true  }
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

    // Define which radio group names are required on each step.
    const requiredRadiosByStep = {
        1: [], // accountType has a default checked value, no need to validate
        2: ['gender'],
        3: ['pep'],
        4: ['paymentMethod', 'taxExempt'],
        5: ['signingAuthority'] // signing mandate select is handled by text validation; skip here
    };
    const radioNamesToCheck = requiredRadiosByStep[individualForm.currentStep] || [];

    // Also dynamically collect any joint-account radio groups on step 2/3
    if (isJoint && individualForm.currentStep === 2) {
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
                flagInvalid(radioGroupEl, radioGroupEl, false);
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
    if (individualForm.currentStep === 2) {
        const primaryPhoto = document.getElementById('passportPhotoInput');
        const primaryContainer = primaryPhoto?.closest('.photo-upload-container');
        if (primaryPhoto && primaryContainer && primaryPhoto.files.length === 0) {
            flagInvalid(primaryContainer, 'Please upload a passport photo.', true);
        }

        const kraCertInput = document.getElementById('kraPinCertInput');
        const kraCertContainer = kraCertInput?.closest('.photo-upload-container');
        if (kraCertInput && kraCertContainer && kraCertInput.files.length === 0) {
            flagInvalid(kraCertContainer, 'Please upload your KRA PIN certificate.', true);
        }

        if (isJoint) {
            const secondaryPhoto = document.getElementById('passportPhotoInput2');
            const secondaryContainer = secondaryPhoto?.closest('.photo-upload-container');
            if (secondaryPhoto && secondaryContainer && secondaryPhoto.files.length === 0) {
                flagInvalid(secondaryContainer, 'Please upload a passport photo.', true);
            }

            const kraCertInput2 = document.getElementById('kraPinCertInput2');
            const kraCertContainer2 = kraCertInput2?.closest('.photo-upload-container');
            if (kraCertInput2 && kraCertContainer2 && kraCertInput2.files.length === 0) {
                flagInvalid(kraCertContainer2, 'Please upload your KRA PIN certificate.', true);
            }
        }
    }

    // Step 3: Pep declaration details (only if PEP = yes)
    if (individualForm.currentStep === 3) {
        const pep = document.querySelector('input[name="pep"]:checked')?.value;
        const textarea = document.querySelector('.form-textarea');
        if (pep === 'yes' && textarea && textarea.value.trim() === '') { 
            markFieldInvalid(textarea, 'Please provide details of your PEP status.');
        }
    }        

    // Step 4: tax exemption certificate (only if tax exempt = yes and the upload is visible)
    if (individualForm.currentStep === 4) {
        const taxExempt = document.querySelector('input[name="taxExempt"]:checked')?.value;
        if (taxExempt === 'yes') {
            const taxCertInput = document.getElementById('taxExemptionCertInput');
            const taxCertContainer = taxCertInput?.closest('.photo-upload-container');
            if (taxCertInput && taxCertContainer && taxCertInput.files.length === 0) {
                flagInvalid(taxCertContainer, 'Please upload your tax exemption certificate.', true);
            }
        }
    }

    // --- Step 5: check signature canvas is not empty ---
    if (individualForm.currentStep === 5) {
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

        // Secondary canvas: only required when mandate shows both signers (jointly or any-two)
        const mandate = document.getElementById('signingAuthority')?.value;
        const secondarySection = document.getElementById('secondarySignatureSection');
        const secondaryVisible = secondarySection && secondarySection.style.display !== 'none';
        if (isJoint && secondaryVisible && mandate !== 'either') {
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


// =============================================
//  NAVIGATION
// =============================================

async function nextStep() {
    const modalBody = document.querySelector('.modal-body');

    // Checklist page — validate all checkboxes are ticked
    if (individualForm.currentStep === 0) {
        individualForm.currentStep = 1;
        updateProgress();
        if (modalBody) modalBody.scrollTop = 0;
        return;
    }

    // Review page — submit
    if (individualForm.currentStep === 6) {
        await submitApplication();
        return;
    }

    if (!validateCurrentStep()) return;
    if (individualForm.currentStep < individualForm.totalSteps) {
        individualForm.currentStep++;
        updateProgress();
        // Scroll modal body back to top when changing steps
        const modalBody = document.querySelector('.modal-body');
        if (modalBody) modalBody.scrollTop = 0;
    } else {
        // Step 5 (Declaration) — build review then advance to step 6
        buildReviewPage();
        individualForm.currentStep = 6;
        updateProgress();
        if (modalBody) modalBody.scrollTop = 0;
    }
}

function previousStep() {
    if (individualForm.currentStep > 0) {
        // Clear validation on current form step (not applicable for step 6 review)
        if (individualForm.currentStep >= 1 && individualForm.currentStep <= individualForm.totalSteps) {
            const stepEl = document.querySelector(`.form-step[data-step="${individualForm.currentStep}"]`);
            if (stepEl) clearStepValidation(stepEl);
        }
        individualForm.currentStep--;
        updateProgress();
        const modalBody = document.querySelector('.modal-body');
        if (modalBody) modalBody.scrollTop = 0;
    }
}

// =============================================
//      CLIENT DETAILS PAGE
// =============================================


function toggleJointAccountFields() {
    const accountType = document.querySelector('input[name="accountType"]:checked').value;
    const jointAccountSections = document.querySelectorAll('.jointAccountSection');
    jointAccountSections.forEach(section => {
        if (accountType === 'joint') {
            section.classList.add('show');
        } else {
            section.classList.remove('show');
            // Clear fields if not joint
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
//     ADDITIONAL INFO PAGE
// =============================================


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


// =============================================
//      PAYMENT PAGE
// =============================================


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

function toggleTaxExemptUpload() {
    const taxExempt = document.querySelector('input[name="taxExempt"]:checked').value;
    const uploadField = document.getElementById('taxCertificateUpload');
    
    if (taxExempt === 'yes') {
        uploadField.style.display = 'block';
    } else {
        uploadField.style.display = 'none';
    }
}


// =============================================
//      DECLARATION PAGE
// =============================================


function setupDeclarationPage() {
    const isJoint = document.querySelector('input[name="accountType"]:checked')?.value === 'joint';
    const select   = document.getElementById('signingAuthority');
    const section2 = document.getElementById('secondarySignatureSection');

    if (!select) return;

    // ── Filter mandate options based on account type ──
    // Remove all non-placeholder options first, then add back only valid ones
    const optionDefs = [
        { value: 'single', label: 'Single',           joint: false },
        { value: 'either', label: 'Either to sign',   joint: true  },
        { value: 'joint',  label: 'All of us jointly',joint: true  },
        { value: 'two',    label: 'Any two to sign',  joint: true  },
    ];

    // Preserve current value if still valid
    const prevValue = select.value;
    select.innerHTML = '<option value="">Select signing mandate</option>';
    optionDefs.forEach(def => {
        if (isJoint ? def.joint : !def.joint) {
            const opt = document.createElement('option');
            opt.value = def.value;
            opt.textContent = def.label;
            select.appendChild(opt);
        }
    });

    // Restore previous value if it's still available
    if (prevValue && select.querySelector(`option[value="${prevValue}"]`)) {
        select.value = prevValue;
    }

    // ── Apply initial state based on current selection ──
    applyMandateBehaviour(select.value, isJoint);

    // ── Listen for mandate changes ──
    // Remove old listener before adding (prevent duplicates on re-entry)
    select.removeEventListener('change', _mandateChangeHandler);
    _mandateChangeHandler = function() {
        applyMandateBehaviour(this.value, isJoint);
    };
    select.addEventListener('change', _mandateChangeHandler);
}

// Module-level reference so we can remove the old listener on re-entry
let _mandateChangeHandler = null;

function applyMandateBehaviour(mandate, isJoint) {
    const section2  = document.getElementById('secondarySignatureSection');
    const signName1 = document.getElementById('signName1');
    const signName2 = document.getElementById('signName2');

    // ── Read applicant names ──
    const primarySurname    = document.getElementById('primarySurname')?.value?.trim()    || '';
    const primaryOtherNames = document.getElementById('primaryOtherNames')?.value?.trim() || '';
    const primaryFullName   = [primaryOtherNames, primarySurname].filter(Boolean).join(' ');

    const secondarySurname    = document.getElementById('secondarySurname')?.value?.trim()    || '';
    const secondaryOtherNames = document.getElementById('secondaryOtherNames')?.value?.trim() || '';
    const secondaryFullName   = [secondaryOtherNames, secondarySurname].filter(Boolean).join(' ');

    // ── Helper: make a name field autofilled (readonly + green tint) ──
    function autofill(input, name) {
        if (!input) return;
        input.value    = name;
        input.readOnly = true;
        input.style.background   = 'rgba(16, 185, 129, 0.07)';
        input.style.borderColor  = 'var(--success-green)';
        input.style.color        = 'var(--text-dark)';
        input.style.cursor       = 'default';
    }

    // ── Helper: make a name field editable (clear autofill styles) ──
    function clearAutofill(input) {
        if (!input) return;
        input.readOnly = false;
        input.style.background  = '';
        input.style.borderColor = '';
        input.style.color       = '';
        input.style.cursor      = '';
        // Only wipe the value if it was previously autofilled
        if (input.dataset.wasAutofilled === 'true') {
            input.value = '';
            input.dataset.wasAutofilled = '';
        }
    }

    // ── Non-joint: only "Single" is available — autofill name, hide secondary ──
    if (!isJoint) {
        autofill(signName1, primaryFullName);
        signName1.dataset.wasAutofilled = 'true';
        if (section2) section2.classList.remove('show');
        return;
    }

    // ── Joint: behaviour depends on selected mandate ──
    switch (mandate) {
        case 'either':
            autofill(signName1, primaryFullName);
            signName1.dataset.wasAutofilled = 'false';
            clearAutofill(signName1);
            if (section2) section2.classList.remove('show');
            break;
        case 'joint':
            autofill(signName1, primaryFullName);
            signName1.dataset.wasAutofilled = 'true';
            if (section2) {
                section2.classList.add('show');
                autofill(signName2, secondaryFullName);
                if (signName2) signName2.dataset.wasAutofilled = 'true';
            }
            break;
        case 'two':
            clearAutofill(signName1);
            if (section2) {
                section2.classList.add('show');
                clearAutofill(signName2);
            }
            break;
        default:
            clearAutofill(signName1);
            if (section2) section2.classList.remove('show');
            break;
    }
}


// =============================================
//  REVIEW PAGE BUILDER
// =============================================

function buildReviewPage() {
    const isJoint = document.querySelector('input[name="accountType"]:checked')?.value === 'joint';
    const container = document.getElementById('reviewContent');
    if (!container) return;

    // Helper: read a field value safely
    function val(id) {
        return document.getElementById(id)?.value?.trim() || '—';
    }
    function qval(selector) {
        return document.querySelector(selector)?.value?.trim() || '—';
    }
    function radioVal(name) {
        return document.querySelector(`input[name="${name}"]:checked`)?.value || '—';
    }

    // Helper: build a review section as HTML
    function section(title, rows) {
        const visibleRows = rows.filter(r => r[1] && r[1] !== '—');
        if (visibleRows.length === 0) return '';
        return `
            <div class="review-section">
                <h4 class="review-section-title">${title}</h4>
                <div class="review-grid">
                    ${visibleRows.map(([label, value]) => `
                        <div class="review-row">
                            <span class="review-label">${label}</span>
                            <span class="review-value">${value}</span>
                        </div>`).join('')}
                </div>
            </div>`;
    }

    const idTypeMap = { national_id: 'National ID', passport: 'Passport', alien: 'Alien Card', ea: 'EA Pass' };
    const mandateMap = { single: 'Single', either: 'Either to sign', joint: 'All of us jointly', two: 'Any two to sign' };
    const paymentMap = { bank: 'Bank Transfer', mobile: 'Mobile Money' };

    let html = '';

    // ── Account Type ──
    html += section('Account', [
        ['Account Type', radioVal('accountType') === 'joint' ? 'Joint Account' : 'Individual Account'],
        ['CDS Account Number', qval('input[placeholder="Leave blank for new account"]') || '—'],
    ]);

    // ── Primary Applicant ──
    const primaryIdType = qval('.form-step[data-step="2"] select');
    html += section('Primary Applicant', [
        ['Surname', val('primarySurname')],
        ['Other Names', val('primaryOtherNames')],
        ['Date of Birth', document.querySelectorAll('.form-step[data-step="2"] input[type="date"]')[0]?.value || '—'],
        ['Gender', radioVal('gender')],
        ['Investor Category', document.querySelectorAll('.form-step[data-step="2"] select')[0]?.value || '—'],
        ['ID Type', idTypeMap[primaryIdType] || primaryIdType],
        ['ID Number', document.querySelectorAll('.form-step[data-step="2"] input')[5]?.value || '—'],
        ['Passport/ID Expiry', val('primaryPassportExpiry')],
        ['Nationality', val('nationality')],
        ['Country of Residence', val('countryOfResidence')],
        ['KRA PIN', val('primaryKraPin')],
    ]);

    // ── Primary Contact ──
    html += section('Primary Contact', [
        ['Phone', (val('primaryCountryCode') !== '—' ? val('primaryCountryCode') + ' ' : '') + (document.querySelectorAll('.form-step[data-step="3"] input[type="tel"]')[0]?.value || '—')],
        ['Email', val('primaryEmail')],
        ['Town / City', document.querySelectorAll('.form-step[data-step="3"] input')[3]?.value || '—'],
        ['Physical Location', document.querySelectorAll('.form-step[data-step="3"] input')[4]?.value || '—'],
        ['Postal Code', document.querySelectorAll('.form-step[data-step="3"] input')[5]?.value || '—'],
        ['Postal Address', val('primaryPostalAddress')],
    ]);

    // ── Primary Employment ──
    html += section('Primary Employment / Business', [
        ['Source of Funds', val('fundSource')],
        ['Employer Name', val('employerName')],
        ['Employer Phone', val('employerPhone')],
        ['Employer Email', val('employerEmail')],
        ['Business Name', val('businessName')],
        ['Business Reg. No.', val('businessRegNumber')],
        ['PEP Status', radioVal('pep') === 'yes' ? 'Yes — Politically Exposed Person' : 'No'],
    ]);

    // ── Secondary Applicant (joint only) ──
    if (isJoint) {
        const secIdType = val('secondaryIdType');
        html += section('Secondary Applicant', [
            ['Surname', val('secondarySurname')],
            ['Other Names', val('secondaryOtherNames')],
            ['Date of Birth', val('secondaryDob')],
            ['Gender', radioVal('secondaryGender')],
            ['ID Type', idTypeMap[secIdType] || secIdType],
            ['ID Number', val('secondaryIdNumber')],
            ['Passport/ID Expiry', val('secondaryPassportExpiry')],
            ['Nationality', val('secondaryNationality')],
            ['Country of Residence', val('secondaryCountryResidence')],
            ['KRA PIN', val('secondaryKraPin')],
        ]);

        html += section('Secondary Contact', [
            ['Phone', (val('secondaryCountryCode') !== '—' ? val('secondaryCountryCode') + ' ' : '') + val('secondaryPhone')],
            ['Email', val('secondaryEmail')],
            ['Town / City', val('secondaryTownCity')],
            ['Physical Location', val('secondaryPhysicalLocation')],
            ['Postal Address', val('secondaryPostalAddress')],
        ]);
    }

    // ── Payment ──
    const payMethod = radioVal('paymentMethod');
    html += section('Payment Details', [
        ['Payment Method', paymentMap[payMethod] || payMethod],
        ['Bank Name', val('bankNameInput')],
        ['Account Number', val('bankAccountNumber')],
        ['Account Name', val('accountName')],
        ['Branch Code', val('branchCode')],
        ['Swift Code', val('swiftCode')],
        ['Currency', Array.from(document.querySelectorAll('#currencyField input[type="checkbox"]:checked')).map(cb => cb.value).join(', ') || '—'],
        ['Mobile Money Phone', val('mobileMoneyPhone')],
    ]);

    // ── Tax & Declaration ──
    const mandate = document.getElementById('signingAuthority')?.value || '';
    html += section('Tax & Declaration', [
        ['Tax Exempt', document.querySelector('input[name="taxExempt"]:checked')?.value === 'yes' ? 'Yes' : 'No'],
        ['Signing Mandate', mandateMap[mandate] || mandate],
        ['Primary Signatory Name', val('signName1')],
        ['Secondary Signatory Name', isJoint ? val('signName2') : null],
    ]);

    container.innerHTML = html;
}

// =============================================
//  SUBMISSION RESULT PAGE
// =============================================
 
function showSubmissionResult(success, errorMessage, applicationId) {
    // Advance to step 7 (confirmation page)
    individualForm.currentStep = 7;
 
    // Hide progress bar and both nav buttons
    const progressContainer = document.querySelector('.progress-container');
    if (progressContainer) progressContainer.style.display = 'none';
    document.getElementById('prevBtn').style.display = 'none';
    document.getElementById('nextBtn').style.display = 'none';
 
    const page = document.getElementById('confirmationPage');
    if (!page) return;
    updateProgress();
 
    const successBlock = document.getElementById('confirmSuccess');
    const errorBlock   = document.getElementById('confirmError');
    const idDisplay    = document.getElementById('confirmAppId');
    const errorMsg     = document.getElementById('confirmErrorMsg');
 
    if (success) {
        successBlock.style.display = '';
        errorBlock.style.display   = 'none';
        if (idDisplay) idDisplay.textContent = applicationId || '—';
 
        // Reset form state so a fresh application can be started
        clearSignature('signatureCanvas');
        clearSignature('signatureCanvas2');
        Object.keys(signatureSnapshots).forEach(k => delete signatureSnapshots[k]);
        document.querySelectorAll('input, select, textarea').forEach(field => {
            if (field.type !== 'radio' && field.type !== 'checkbox') {
                field.value = '';
            } else {
                field.checked = false;
            }
        });
    } else {
        successBlock.style.display = 'none';
        errorBlock.style.display   = '';
        if (errorMsg) errorMsg.textContent = errorMessage || 'An unexpected error occurred.';
    }
 
    const modalBody = document.querySelector('.modal-body');
    if (modalBody) modalBody.scrollTop = 0;
}

async function submitApplication() {
    const accountType = document.querySelector('input[name="accountType"]:checked')?.value;
    const canvas  = document.getElementById('signatureCanvas');
    const canvas2 = document.getElementById('signatureCanvas2');

    const submitBtn = document.getElementById('nextBtn');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    try {
        const formData = new FormData();

        const applicationData = {
            // Account Type
            account_type: accountType,
            cda_code: document.querySelector('input[placeholder="Enter CDA code if applicable"]').value,
            cds_account_number: document.querySelector('input[placeholder="Leave blank for new account"]').value,

            // Primary Client Details
            primary_surname: document.getElementById('primarySurname')?.value || '',
            primary_other_names: document.getElementById('primaryOtherNames')?.value || '',
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
            primary_phone: document.getElementById('primaryTelephone')?.value || '',
            primary_email: document.getElementById('primaryEmail')?.value || '',
            primary_town_city: document.getElementById('primaryTownCity')?.value || '',
            primary_physical_location: document.getElementById('primaryPhysicalLocation')?.value || '',
            primary_postal_code: document.getElementById('primaryPostalCode')?.value || '',
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
            is_pep: document.querySelector('input[name="pep"]:checked').value === 'yes' ? 'Yes' : 'No',
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
            is_tax_exempt: document.querySelector('input[name="taxExempt"]:checked').value === 'yes' ? 'Yes' : 'No',

            // Declaration
            signing_mandate: document.getElementById('signingAuthority')?.value || '',
            signer_names: document.getElementById('signName1')?.value || '',
        };

        // Secondary applicant fields
        if (accountType === 'joint') {
            applicationData.secondary_surname = document.getElementById('secondarySurname')?.value || '';
            applicationData.secondary_other_names = document.getElementById('secondaryOtherNames')?.value || '';
            applicationData.secondary_dob = document.getElementById('secondaryDob')?.value || '';
            applicationData.secondary_gender = document.querySelector('.form-step[data-step="2"] input[name="secondaryGender"]:checked')?.value || '';
            applicationData.secondary_investor_category = document.getElementById('secondaryInvestorCategory')?.value || '';
            applicationData.secondary_id_type = document.getElementById('secondaryIdType')?.value || '';
            applicationData.secondary_id_number = document.getElementById('secondaryIdNumber')?.value || '';
            applicationData.secondary_passport_expiry = document.getElementById('secondaryPassportExpiry')?.value || '';
            applicationData.secondary_nationality = document.getElementById('secondaryNationality')?.value || '';
            applicationData.secondary_country_residence = document.getElementById('secondaryCountryResidence')?.value || '';
            applicationData.secondary_kra_pin = document.getElementById('secondaryKraPin')?.value || '';
            applicationData.secondary_country_code = document.getElementById('secondaryCountryCode')?.value || '';
            applicationData.secondary_phone = document.getElementById('secondaryPhone')?.value || '';
            applicationData.secondary_email = document.getElementById('secondaryEmail')?.value || '';
            applicationData.secondary_town_city = document.getElementById('secondaryTownCity')?.value || '';
            applicationData.secondary_physical_location = document.getElementById('secondaryPhysicalLocation')?.value || '';
            applicationData.secondary_postal_code = document.getElementById('secondaryPostalCode')?.value || '';
            applicationData.secondary_postal_address = formatPostalAddress(document.getElementById('secondaryPostalAddress')?.value || '');
            applicationData.secondary_fund_source = document.getElementById('fundSource2')?.value || '';
            applicationData.secondary_employer_name = document.getElementById('employerName2')?.value || '';
            applicationData.secondary_employer_postal = formatPostalAddress(document.getElementById('employerPostal2')?.value || '');
            applicationData.secondary_employer_phone = document.getElementById('employerPhone2')?.value || '';
            applicationData.secondary_employer_email = document.getElementById('employerEmail2')?.value || '';
            applicationData.secondary_business_name = document.getElementById('businessName2')?.value || '';
            applicationData.secondary_business_reg_number = document.getElementById('businessRegNumber2')?.value || '';
            applicationData.secondary_business_postal = formatPostalAddress(document.getElementById('businessPostal2')?.value || '');
            applicationData.secondary_business_phone = document.getElementById('businessPhone2')?.value || '';
            applicationData.secondary_business_email = document.getElementById('businessEmail2')?.value || '';
            applicationData.secondary_business_office = document.getElementById('businessOffice2')?.value || '';
            applicationData.secondary_signer_names = document.getElementById('signName2')?.value || '';
        }

        // Empty strings for missing optional fields 
        if (applicationData.is_tax_exempt === 'No') {
            applicationData.tax_cert_path = '';
        }

        formData.append('data', JSON.stringify(applicationData));

        // Attach signatures
        canvas.toBlob(function(blob) {
            formData.append('signatureImage', blob, 'signature.png');

            if (accountType === 'joint' && canvas2) {
                canvas2.toBlob(function(blob2) {
                    formData.append('secondarySignatureImage', blob2, 'signature2.png');
                    appendAndSubmitFiles();
                }, 'image/png');
            } else {
                appendAndSubmitFiles();
            }
        }, 'image/png');

        function appendAndSubmitFiles() {
            //Passport photos
            const primaryPhoto = document.getElementById('passportPhotoInput').files[0];
            if (primaryPhoto) formData.append('primaryPassportPhoto', primaryPhoto);

            const secondaryPhoto = document.getElementById('passportPhotoInput2')?.files[0];
            if (secondaryPhoto) formData.append('secondaryPassportPhoto', secondaryPhoto);

            // Tax exemption and KRA certificates
            const taxCert = document.getElementById('taxExemptionCertInput')?.files[0];
            if (taxCert) formData.append('taxCertificate', taxCert);

            const kraPinCert = document.getElementById('kraPinCertInput')?.files[0];
            if (kraPinCert) formData.append('kraPinCertificate', kraPinCert);

            const kraPinCert2 = document.getElementById('kraPinCertInput2')?.files[0];
            if (kraPinCert2) formData.append('kraPinCertificate2', kraPinCert2);

            fetch('/api/cdsc/submit', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    showSubmissionResult(true, null, result.applicationId);
                } else {
                    showSubmissionResult(false, result.message || 'An unexpected error occurred. Please try again.');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showSubmissionResult(false, 'A network error occurred. Please check your connection and try again.');
            })
            .finally(() => {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            });
        }

    } catch (error) {
        console.error('Error preparing application:', error);
        showSubmissionResult(false, 'Error preparing application. Please try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

function retrySubmission() {
    // Go back to the review page so the user can re-submit
    individualForm.currentStep = 6;
    document.getElementById('confirmationPage')?.classList.remove('active');
    document.getElementById('reviewPage')?.classList.add('active');
    document.getElementById('prevBtn').style.display = 'block';
    document.getElementById('nextBtn').style.display = 'block';
    document.getElementById('nextBtn').textContent = 'Submit Application';
    const progressContainer = document.querySelector('.progress-container');
    if (progressContainer) progressContainer.style.display = 'none';
}



// Initialize
updateProgress();

// Upload zones for files
setupUploadZone('passportPhotoInput', 'passportPhotoPreview', 'pre-img-upload', true);
setupUploadZone('passportPhotoInput2', 'passportPhotoPreview2', 'pre-img-upload2', true);
setupUploadZone('taxExemptionCertInput', 'taxCertificatePreview', 'pre-cert-upload', false);
setupUploadZone('kraPinCertInput', 'kraPinCertPreview', 'pre-kra-cert-upload', false);
setupUploadZone('kraPinCertInput2', 'kraPinCertPreview2', 'pre-kra-cert-upload2', false);


// BUTTON EVENT LISTENERS

document.addEventListener('DOMContentLoaded', scrollToTop);

// Close application form
document.addEventListener('DOMContentLoaded', function() {
    const closeAccountBtn = document.querySelectorAll('.close-modal');
    closeAccountBtn.forEach(function(btn) {
        btn.addEventListener('click', closeModal);
    });
});

document.addEventListener('DOMContentLoaded', function() {
    const closeConfirmBtn = document.getElementById('closeConfirmBtn');  
    if (closeConfirmBtn) {
        closeConfirmBtn.addEventListener('click', closeModal);
    }
});

document.addEventListener('DOMContentLoaded', function() {
    const closeErrorBtn = document.getElementById('closeErrorBtn');
    if (closeErrorBtn) {
        closeErrorBtn.addEventListener('click', closeModal);
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

// Copy application ID button
document.addEventListener('DOMContentLoaded', function() {
    const copyIdBtn = document.getElementById('copyAppIdBtn');
    if (copyIdBtn) {        
        copyIdBtn.addEventListener('click', () => copyApplicationId('confirmAppId', 'copyConfirmMsg'));
    }
});

// Retry submission button
document.addEventListener('DOMContentLoaded', function() {
    const retryBtn = document.getElementById('retrySubmitBtn');
    if (retryBtn) {
        retryBtn.addEventListener('click', retrySubmission);
    }
}); 


// FORM FIELD EVENT LISTENERS
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
        radio.addEventListener('change', toggleTaxExemptUpload);
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
        branchCodeInput.addEventListener('input', function() {
            validateBranchCode('bankNameInput', 'branchCode', 'branchCodeResult');
        });
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

// Clear signature button + upload toggle
document.addEventListener('DOMContentLoaded', function() {
    const clearSignatureBtn = document.getElementById('clearSignature');
    if (clearSignatureBtn) {
        clearSignatureBtn.addEventListener('click', () => {
            clearSignature('signatureCanvas');
            // Also reset the upload zone if it's visible
            resetSignatureUpload('sigUploadZone1', 'sigUploadInput1');
        });
    }

    const uploadSigBtn = document.getElementById('uploadSignatureBtn');
    if (uploadSigBtn) {
        uploadSigBtn.addEventListener('click', () => toggleSignatureUpload('sigUploadZone1'));
    }

    const sigUploadInput1 = document.getElementById('sigUploadInput1');
    if (sigUploadInput1) {
        sigUploadInput1.addEventListener('change', function() {
            loadSignatureImage(this, 'signatureCanvas', 'sigUploadZone1');
        });
    }
});

// Clear secondary signature + upload toggle
document.addEventListener('DOMContentLoaded', function() {
    const clearSignatureBtn2 = document.getElementById('clearSignature2');
    if (clearSignatureBtn2) {
        clearSignatureBtn2.addEventListener('click', () => {
            clearSignature('signatureCanvas2');
            resetSignatureUpload('sigUploadZone2', 'sigUploadInput2');
        });
    }

    const uploadSigBtn2 = document.getElementById('uploadSignatureBtn2');
    if (uploadSigBtn2) {
        uploadSigBtn2.addEventListener('click', () => toggleSignatureUpload('sigUploadZone2'));
    }

    const sigUploadInput2 = document.getElementById('sigUploadInput2');
    if (sigUploadInput2) {
        sigUploadInput2.addEventListener('change', function() {
            loadSignatureImage(this, 'signatureCanvas2', 'sigUploadZone2');
        });
    }
});

// KRA PIN live validation
document.addEventListener('DOMContentLoaded', function() {
    setupKraPinValidation('primaryKraPin');
    setupKraPinValidation('secondaryKraPin');
});

// Email confirm fields — inject dynamically after each main email input and wire up
document.addEventListener('DOMContentLoaded', function() {
    confirmEmail('primaryEmail', 'primaryEmailConfirm');
    confirmEmail('secondaryEmail', 'secondaryEmailConfirm');
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


