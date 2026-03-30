// Requires cdsc-form-utils.js to be loaded first

window.openCorporateModal = openCorporateModal;

const corporateForm = {
    currentStep: 0,  // 0=checklist, 1-4=form steps, 5=review, 6=confirmation
    totalSteps: 4,
    DEV_MODE: false
};


// =============================================
//  MODAL OPEN / CLOSE
// =============================================

function openCorporateModal() {
    document.getElementById('corpModalOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
    corporateForm.currentStep = 0;
    corpUpdateProgress();

    setTimeout(() => initSignatureCanvas('corp-signatureCanvas'), 300);
    setTimeout(() => initSignatureCanvas('corp-signatureCanvas2'), 300);

    populateCountryDropdown('corp-countryOfRegistration');
    populateCountryDropdown('corp-sig1Nationality');
    populateCountryDropdown('corp-sig1CountryOfResidence');
    populateCountryDropdown('corp-sig2Nationality');
    populateCountryDropdown('corp-sig2CountryOfResidence');
}

function closeCorporateModal() {
    document.getElementById('corpModalOverlay').classList.remove('active');
    document.body.style.overflow = 'auto';
}


// =============================================
//  PROGRESS + STEP VISIBILITY
// =============================================

function corpUpdateProgress() {
    const progressFill = document.getElementById('corpProgressFill');
    if (progressFill) {
        const pct = corporateForm.currentStep >= 1 && corporateForm.currentStep <= corporateForm.totalSteps
            ? ((corporateForm.currentStep - 1) / (corporateForm.totalSteps - 1)) * 100
            : corporateForm.currentStep > corporateForm.totalSteps ? 100 : 0;
        progressFill.style.width = pct + '%';
    }

    // Update step indicators
    document.querySelectorAll('[data-corp-step]').forEach(stepEl => {
        const n = parseInt(stepEl.getAttribute('data-corp-step'));
        if (!stepEl.classList.contains('progress-step')) return; // skip form-step divs
        if (n < corporateForm.currentStep) {
            stepEl.classList.add('completed');
            stepEl.classList.remove('active');
        } else if (n === corporateForm.currentStep) {
            stepEl.classList.add('active');
            stepEl.classList.remove('completed');
        } else {
            stepEl.classList.remove('active', 'completed');
        }
    });

    // Show/hide progress bar
    const progressContainer = document.getElementById('corpProgressContainer');
    if (progressContainer) {
        progressContainer.style.display =
            (corporateForm.currentStep === 0 || corporateForm.currentStep >= 5) ? 'none' : '';
    }

    // Show/hide form steps
    const specialIds = new Set(['corp-checklistPage', 'corp-reviewPage', 'corp-confirmationPage']);
    const formSteps = Array.from(document.querySelectorAll('#corpModalOverlay .form-step'))
        .filter(s => !specialIds.has(s.id));
    formSteps.forEach((step, index) => {
        step.classList.toggle('active', index + 1 === corporateForm.currentStep);
    });

    const checklistPage = document.getElementById('corp-checklistPage');
    if (checklistPage) checklistPage.classList.toggle('active', corporateForm.currentStep === 0);
    const reviewPage = document.getElementById('corp-reviewPage');
    if (reviewPage) reviewPage.classList.toggle('active', corporateForm.currentStep === 5);
    const confirmationPage = document.getElementById('corp-confirmationPage');
    if (confirmationPage) confirmationPage.classList.toggle('active', corporateForm.currentStep === 6);

    // Buttons
    const prevBtn = document.getElementById('corp-prevBtn');
    const nextBtn = document.getElementById('corp-nextBtn');

    prevBtn.style.display = (corporateForm.currentStep === 0 || corporateForm.currentStep === 6) ? 'none' : 'block';

    if (corporateForm.currentStep === 0) {
        nextBtn.style.display = 'block';
        nextBtn.textContent = 'Begin Application';
    } else if (corporateForm.currentStep === corporateForm.totalSteps) {
        nextBtn.style.display = 'block';
        nextBtn.textContent = 'Review';
    } else if (corporateForm.currentStep === 5) {
        nextBtn.style.display = 'block';
        nextBtn.textContent = 'Submit Application';
    } else if (corporateForm.currentStep === 6) {
        nextBtn.style.display = 'none';
    } else {
        nextBtn.style.display = 'block';
        nextBtn.textContent = 'Next';
    }
}


// =============================================
//  NAVIGATION
// =============================================

async function corpNextStep() {
    const modalBody = document.getElementById('corpModalBody');

    if (corporateForm.currentStep === 0) {
        corporateForm.currentStep = 1;
        corpUpdateProgress();
        if (modalBody) modalBody.scrollTop = 0;
        return;
    }

    if (corporateForm.currentStep === 5) {
        await corpSubmitApplication();
        return;
    }

    if (!corpValidateCurrentStep()) return;

    if (corporateForm.currentStep < corporateForm.totalSteps) {
        corporateForm.currentStep++;
        corpUpdateProgress();
        if (modalBody) modalBody.scrollTop = 0;
    } else {
        corpBuildReviewPage();
        corporateForm.currentStep = 5;
        corpUpdateProgress();
        if (modalBody) modalBody.scrollTop = 0;
    }
}

function corpPreviousStep() {
    if (corporateForm.currentStep > 0) {
        if (corporateForm.currentStep >= 1 && corporateForm.currentStep <= corporateForm.totalSteps) {
            const stepEl = document.querySelector(`#corpModalOverlay .form-step[data-corp-step="${corporateForm.currentStep}"]`);
            if (stepEl) clearStepValidation(stepEl);
        }
        corporateForm.currentStep--;
        corpUpdateProgress();
        const modalBody = document.getElementById('corpModalBody');
        if (modalBody) modalBody.scrollTop = 0;
    }
}


// =============================================
//  VALIDATION
// =============================================

function corpValidateCurrentStep() {
    if (corporateForm.DEV_MODE) return true;

    const stepEl = document.querySelector(`#corpModalOverlay .form-step[data-corp-step="${corporateForm.currentStep}"]`);
    if (!stepEl) return true;

    clearStepValidation(stepEl);

    let invalidCount = 0;
    let firstInvalidField = null;

    const hasSecondSignatory = document.getElementById('corp-addSecondSignatory')?.checked;

    function shouldSkip(field) {
        if (field.offsetParent === null) return true;
        // Skip second signatory fields if not adding a second signatory
        if (!hasSecondSignatory && field.closest('#corp-secondSignatorySection')) return true;
        return false;
    }

    function flagInvalid(el, message, isUpload = false) {
        const marked = isUpload ? markUploadInvalid(el, message) : markFieldInvalid(el, message);
        invalidCount++;
        if (!firstInvalidField) firstInvalidField = marked || el;
    }

    // --- Text / select / textarea fields ---
    stepEl.querySelectorAll('input[required], select[required], textarea[required]').forEach(field => {
        if (shouldSkip(field)) return;
        if (field.type === 'radio' || field.type === 'checkbox' || field.type === 'file') return;
        if (!field.value || field.value.trim() === '') {
            flagInvalid(field, 'This field is required.');
        }
    });

    // --- Step 1: KRA PIN format, email confirm match ---
    if (corporateForm.currentStep === 1) {
        const kraPin = document.getElementById('corp-kraPin');
        if (kraPin && kraPin.value && !KRA_REGEX.test(kraPin.value.trim())) {
            flagInvalid(kraPin, 'Invalid KRA PIN — must be 11 characters starting and ending with a letter.');
        }

        corpCheckEmailMatch('corp-email', 'corp-emailConfirm', flagInvalid);
    }

    // --- Step 2: payment/tax uploads ---
    if (corporateForm.currentStep === 2) {
        const taxExempt = document.querySelector('input[name="corp-taxExempt"]:checked')?.value;
        if (taxExempt === 'yes') {
            const taxCertInput = document.getElementById('corp-taxExemptionCertInput');
            const taxCertContainer = taxCertInput?.closest('.photo-upload-container');
            if (taxCertInput && taxCertContainer && taxCertInput.files.length === 0) {
                flagInvalid(taxCertContainer, 'Please upload your tax exemption certificate.', true);
            }
        }
    }

    // --- Step 3: signatory uploads, KRA PINs, passport expiry ---
    if (corporateForm.currentStep === 3) {
        const sig1Photo = document.getElementById('corp-sig1PhotoInput');
        const sig1PhotoContainer = sig1Photo?.closest('.photo-upload-container');
        if (sig1Photo && sig1PhotoContainer && sig1Photo.files.length === 0) {
            flagInvalid(sig1PhotoContainer, 'Please upload a passport photo for the primary signatory.', true);
        }

        const sig1Kra = document.getElementById('corp-sig1KraCertInput');
        const sig1KraContainer = sig1Kra?.closest('.photo-upload-container');
        if (sig1Kra && sig1KraContainer && sig1Kra.files.length === 0) {
            flagInvalid(sig1KraContainer, 'Please upload the KRA PIN certificate for the primary signatory.', true);
        }

        const sig1KraPin = document.getElementById('corp-sig1KraPin');
        if (sig1KraPin && sig1KraPin.value && !KRA_REGEX.test(sig1KraPin.value.trim())) {
            flagInvalid(sig1KraPin, 'Invalid KRA PIN — must be 11 characters starting and ending with a letter.');
        }

        const sig1IdType = document.getElementById('corp-sig1IdType');
        const sig1Expiry = document.getElementById('corp-sig1PassportExpiry');
        if (sig1IdType && sig1Expiry && ['ea', 'passport', 'alien'].includes(sig1IdType.value)) {
            if (!sig1Expiry.value) {
                flagInvalid(sig1Expiry, 'Passport/ID expiry date is required for this ID type.');
            }
        }

        if (hasSecondSignatory) {
            const sig2Photo = document.getElementById('corp-sig2PhotoInput');
            const sig2PhotoContainer = sig2Photo?.closest('.photo-upload-container');
            if (sig2Photo && sig2PhotoContainer && sig2Photo.files.length === 0) {
                flagInvalid(sig2PhotoContainer, 'Please upload a passport photo for the secondary signatory.', true);
            }

            const sig2Kra = document.getElementById('corp-sig2KraCertInput');
            const sig2KraContainer = sig2Kra?.closest('.photo-upload-container');
            if (sig2Kra && sig2KraContainer && sig2Kra.files.length === 0) {
                flagInvalid(sig2KraContainer, 'Please upload the KRA PIN certificate for the secondary signatory.', true);
            }

            const sig2KraPin = document.getElementById('corp-sig2KraPin');
            if (sig2KraPin && sig2KraPin.value && !KRA_REGEX.test(sig2KraPin.value.trim())) {
                flagInvalid(sig2KraPin, 'Invalid KRA PIN — must be 11 characters starting and ending with a letter.');
            }

            const sig2IdType = document.getElementById('corp-sig2IdType');
            const sig2Expiry = document.getElementById('corp-sig2PassportExpiry');
            if (sig2IdType && sig2Expiry && ['ea', 'passport', 'alien'].includes(sig2IdType.value)) {
                if (!sig2Expiry.value) {
                    flagInvalid(sig2Expiry, 'Passport/ID expiry date is required for this ID type.');
                }
            }
        }
    }

    // --- Step 4: signatures, PEP details, checkbox ---
    if (corporateForm.currentStep === 4) {
        const canvas = document.getElementById('corp-signatureCanvas');
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
                msg.textContent = 'Please provide the primary signatory\'s signature.';
                canvas.parentNode.appendChild(msg);
            }
            invalidCount++;
            if (!firstInvalidField) firstInvalidField = canvas;
        }

        const mandate = document.getElementById('corp-signingAuthority')?.value;
        const secSigSection = document.getElementById('corp-secondarySignatureSection');
        const secSigVisible = secSigSection && secSigSection.style.display !== 'none';
        if (secSigVisible && mandate !== 'either') {
            const canvas2 = document.getElementById('corp-signatureCanvas2');
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
                    msg2.textContent = 'Please provide the secondary signatory\'s signature.';
                    canvas2.parentNode.appendChild(msg2);
                }
                invalidCount++;
            }
        }

        const pep = document.querySelector('input[name="corp-pep"]:checked')?.value;
        const pepText = document.getElementById('corp-pepDetailsText');
        if (pep === 'yes' && pepText && pepText.value.trim() === '') {
            flagInvalid(pepText, 'Please provide details of the PEP status.');
        }
    }

    // --- Radio groups ---
    const requiredRadiosByStep = {
        2: ['corp-paymentMethod', 'corp-taxExempt'],
        4: ['corp-pep']
    };
    const radioNamesToCheck = requiredRadiosByStep[corporateForm.currentStep] || [];
    radioNamesToCheck.forEach(name => {
        const allRadios = stepEl.querySelectorAll(`input[type="radio"][name="${name}"]`);
        if (allRadios.length === 0) return;
        const anyChecked = Array.from(allRadios).some(r => r.checked);
        if (!anyChecked) {
            const container = allRadios[0].closest('.form-group');
            const radioGroupEl = container?.querySelector('.form-radio-group');
            if (radioGroupEl) {
                const el = markRadioGroupInvalid(radioGroupEl, radioGroupEl);
                invalidCount++;
                if (!firstInvalidField) firstInvalidField = el;
            }
        }
    });

    // --- Terms checkbox ---
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

    if (invalidCount > 0) {
        showValidationBanner(stepEl, invalidCount);
        if (firstInvalidField) firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return false;
    }

    return true;
}

// Helper: check email confirm match and call flagInvalid if needed
function corpCheckEmailMatch(mainId, confirmId, flagInvalid) {
    const main = document.getElementById(mainId);
    const confirm = document.getElementById(confirmId);
    if (!main || !confirm) return;

    if (main.value && !EMAIL_REGEX.test(main.value.trim())) {
        flagInvalid(main, 'Please enter a valid email address.');
    }
    if (!confirm.value || confirm.value.trim() === '') {
        flagInvalid(confirm, 'Please confirm your email address.');
    } else if (confirm.value.trim() !== main.value.trim()) {
        flagInvalid(confirm, 'Email addresses do not match.');
    }
}


// =============================================
//  REVIEW PAGE
// =============================================

function corpBuildReviewPage() {
    const container = document.getElementById('corp-reviewContent');
    if (!container) return;

    const hasSecondSignatory = document.getElementById('corp-addSecondSignatory')?.checked;

    function val(id) { return document.getElementById(id)?.value?.trim() || '—'; }
    function radioVal(name) { return document.querySelector(`input[name="${name}"]:checked`)?.value || '—'; }

    function section(title, rows) {
        const visibleRows = rows.filter(r => r[1] && r[1] !== '—' && r[1] !== null);
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

    const mandateMap = { single: 'Single', either: 'Either to sign', joint: 'All of us jointly', two: 'Any two to sign' };
    const paymentMap = { domestic: 'Domestic Bank', international: 'International Bank' };

    let html = '';

    html += section('Company Details', [
        ['Registered Name', val('corp-registeredName')],
        ['Registration Number', val('corp-registrationNumber')],
        ['Date of Registration', val('corp-dateOfRegistration')],
        ['Investor Category', val('corp-investorCategory')],
        ['Country of Registration', val('corp-countryOfRegistration')],
        ['KRA PIN', val('corp-kraPin')],
        ['Phone', val('corp-countryCode') + ' ' + val('corp-phone')],
        ['Email', val('corp-email')],
        ['Physical Location', val('corp-physicalPlot') + ', ' + val('corp-physicalRoad')],
        ['Town/City', val('corp-townCity')],
        ['Postal Address', val('corp-postalAddress')],
        ['Source of Funds', val('corp-fundSource')],
        ['CDS Account Number', val('corp-cdsAccountNumber')],
    ]);

    const payMethod = radioVal('corp-paymentMethod');
    html += section('Payment Details', [
        ['Payment Method', paymentMap[payMethod] || payMethod],
        ['Bank Name', val('corp-bankNameInput')],
        ['Account Number', val('corp-bankAccountNumber')],
        ['Account Name', val('corp-accountName')],
        ['Branch Code', val('corp-branchCode')],
        ['SWIFT Code', val('corp-swiftCode')],
        ['Currency', Array.from(document.querySelectorAll('#corp-currencyField input[type="checkbox"]:checked')).map(cb => cb.value).join(', ') || '—'],
        ['Tax Exempt', radioVal('corp-taxExempt') === 'yes' ? 'Yes' : 'No'],
    ]);

    html += section('Primary Signatory', [
        ['Name', val('corp-sig1OtherNames') + ' ' + val('corp-sig1Surname')],
        ['Designation', val('corp-sig1Designation')],
        ['Date of Birth', val('corp-sig1Dob')],
        ['Nationality', val('corp-sig1Nationality')],
        ['Country of Residence', val('corp-sig1CountryOfResidence')],
        ['ID Number', val('corp-sig1IdNumber')],
        ['KRA PIN', val('corp-sig1KraPin')],
        ['Phone', val('corp-sig1CountryCode') + ' ' + val('corp-sig1Phone')],
        ['Email', val('corp-sig1Email')],
        ['Address', val('corp-sig1Address')],
    ]);

    if (hasSecondSignatory) {
        html += section('Secondary Signatory', [
            ['Name', val('corp-sig2OtherNames') + ' ' + val('corp-sig2Surname')],
            ['Designation', val('corp-sig2Designation')],
            ['Date of Birth', val('corp-sig2Dob')],
            ['Nationality', val('corp-sig2Nationality')],
            ['ID Number', val('corp-sig2IdNumber')],
            ['KRA PIN', val('corp-sig2KraPin')],
            ['Phone', val('corp-sig2CountryCode') + ' ' + val('corp-sig2Phone')],
            ['Email', val('corp-sig2Email')],
        ]);
    }

    const mandate = document.getElementById('corp-signingAuthority')?.value || '';
    html += section('Declaration', [
        ['PEP Status', radioVal('corp-pep') === 'yes' ? 'Yes — Politically Exposed Person' : 'No'],
        ['Signing Mandate', mandateMap[mandate] || mandate],
        ['Primary Signatory Name', val('corp-signName1')],
        ['Secondary Signatory Name', val('corp-signName2') !== '—' ? val('corp-signName2') : null],
    ]);

    container.innerHTML = html;
}


// =============================================
//  SUBMISSION
// =============================================

async function corpSubmitApplication() {
    const canvas  = document.getElementById('corp-signatureCanvas');
    const canvas2 = document.getElementById('corp-signatureCanvas2');
    const hasSecondSignatory = document.getElementById('corp-addSecondSignatory')?.checked;

    const submitBtn = document.getElementById('corp-nextBtn');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    try {
        const formData = new FormData();

        const applicationData = {
            account_type: 'corporate',
            cda_code: val('corp-cdaCode'),
            cds_account_number: val('corp-cdsAccountNumber'),

            registered_name: val('corp-registeredName'),
            registration_number: val('corp-registrationNumber'),
            date_of_registration: val('corp-dateOfRegistration'),
            investor_category: val('corp-investorCategory'),
            country_of_registration: val('corp-countryOfRegistration'),
            kra_pin: val('corp-kraPin'),
            country_code: val('corp-countryCode'),
            phone: val('corp-phone'),
            email: val('corp-email'),
            physical_plot: val('corp-physicalPlot'),
            physical_road: val('corp-physicalRoad'),
            town_city: val('corp-townCity'),
            postal_code: val('corp-postalCode'),
            postal_address: formatPostalAddress(val('corp-postalAddress')),
            fund_source: val('corp-fundSource'),

            payment_method: radioVal('corp-paymentMethod'),
            bank_name: val('corp-bankNameInput'),
            account_number: val('corp-bankAccountNumber'),
            account_name: val('corp-accountName'),
            branch_code: val('corp-branchCode'),
            swift_code: val('corp-swiftCode'),
            currency: Array.from(document.querySelectorAll('#corp-currencyField input[type="checkbox"]:checked')).map(cb => cb.value).join(', '),
            other_currency: val('corp-otherCurrency'),
            is_tax_exempt: radioVal('corp-taxExempt') === 'yes' ? 'Yes' : 'No',

            sig1_surname: val('corp-sig1Surname'),
            sig1_other_names: val('corp-sig1OtherNames'),
            sig1_designation: val('corp-sig1Designation'),
            sig1_dob: val('corp-sig1Dob'),
            sig1_nationality: val('corp-sig1Nationality'),
            sig1_country_of_residence: val('corp-sig1CountryOfResidence'),
            sig1_id_type: val('corp-sig1IdType'),
            sig1_id_number: val('corp-sig1IdNumber'),
            sig1_passport_expiry: val('corp-sig1PassportExpiry'),
            sig1_kra_pin: val('corp-sig1KraPin'),
            sig1_country_code: val('corp-sig1CountryCode'),
            sig1_phone: val('corp-sig1Phone'),
            sig1_email: val('corp-sig1Email'),
            sig1_address: val('corp-sig1Address'),
            sig1_postal_address: formatPostalAddress(val('corp-sig1PostalAddress')),
            sig1_postal_code: val('corp-sig1PostalCode'),
            sig1_town_city: val('corp-sig1TownCity'),

            is_pep: radioVal('corp-pep') === 'yes' ? 'Yes' : 'No',
            pep_details: document.getElementById('corp-pepDetailsText')?.value || '',
            signing_mandate: val('corp-signingAuthority'),
            signer_names: val('corp-signName1'),
        };

        if (hasSecondSignatory) {
            applicationData.sig2_surname = val('corp-sig2Surname');
            applicationData.sig2_other_names = val('corp-sig2OtherNames');
            applicationData.sig2_designation = val('corp-sig2Designation');
            applicationData.sig2_dob = val('corp-sig2Dob');
            applicationData.sig2_nationality = val('corp-sig2Nationality');
            applicationData.sig2_country_of_residence = val('corp-sig2CountryOfResidence');
            applicationData.sig2_id_type = val('corp-sig2IdType');
            applicationData.sig2_id_number = val('corp-sig2IdNumber');
            applicationData.sig2_passport_expiry = val('corp-sig2PassportExpiry');
            applicationData.sig2_kra_pin = val('corp-sig2KraPin');
            applicationData.sig2_country_code = val('corp-sig2CountryCode');
            applicationData.sig2_phone = val('corp-sig2Phone');
            applicationData.sig2_email = val('corp-sig2Email');
            applicationData.sig2_address = val('corp-sig2Address');
            applicationData.sig2_postal_address = formatPostalAddress(val('corp-sig2PostalAddress'));
            applicationData.sig2_postal_code = val('corp-sig2PostalCode');
            applicationData.sig2_town_city = val('corp-sig2TownCity');
            applicationData.secondary_signer_names = val('corp-signName2');
        }

        if (applicationData.is_tax_exempt === 'No') {
            applicationData.tax_cert_path = '';
        }

        formData.append('data', JSON.stringify(applicationData));

        // Signatures
        canvas.toBlob(function(blob) {
            formData.append('signatureImage', blob, 'signature.png');

            const secSigSection = document.getElementById('corp-secondarySignatureSection');
            const secSigVisible = secSigSection && secSigSection.style.display !== 'none';
            if (secSigVisible && canvas2) {
                canvas2.toBlob(function(blob2) {
                    formData.append('secondarySignatureImage', blob2, 'signature2.png');
                    corpAppendAndSubmitFiles(formData, submitBtn, originalText, hasSecondSignatory);
                }, 'image/png');
            } else {
                corpAppendAndSubmitFiles(formData, submitBtn, originalText, hasSecondSignatory);
            }
        }, 'image/png');

    } catch (error) {
        console.error('Error preparing corporate application:', error);
        corpShowSubmissionResult(false, 'Error preparing application. Please try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

function corpAppendAndSubmitFiles(formData, submitBtn, originalText, hasSecondSignatory) {
    const corpKraCert = document.getElementById('corp-kraPinCertInput')?.files[0];
    if (corpKraCert) formData.append('corpKraCertificate', corpKraCert);

    const taxCert = document.getElementById('corp-taxExemptionCertInput')?.files[0];
    if (taxCert) formData.append('taxCertificate', taxCert);

    const sig1Photo = document.getElementById('corp-sig1PhotoInput')?.files[0];
    if (sig1Photo) formData.append('sig1PassportPhoto', sig1Photo);

    const sig1Kra = document.getElementById('corp-sig1KraCertInput')?.files[0];
    if (sig1Kra) formData.append('sig1KraCertificate', sig1Kra);

    if (hasSecondSignatory) {
        const sig2Photo = document.getElementById('corp-sig2PhotoInput')?.files[0];
        if (sig2Photo) formData.append('sig2PassportPhoto', sig2Photo);

        const sig2Kra = document.getElementById('corp-sig2KraCertInput')?.files[0];
        if (sig2Kra) formData.append('sig2KraCertificate', sig2Kra);
    }

    fetch('/api/cdsc/corporate/submit', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            corpShowSubmissionResult(true, null, result.applicationId);
        } else {
            corpShowSubmissionResult(false, result.message || 'An unexpected error occurred. Please try again.');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        corpShowSubmissionResult(false, 'A network error occurred. Please check your connection and try again.');
    })
    .finally(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    });
}

function corpShowSubmissionResult(success, errorMessage, applicationId) {
    corporateForm.currentStep = 6;
    corpUpdateProgress();

    const successBlock = document.getElementById('corp-confirmSuccess');
    const errorBlock   = document.getElementById('corp-confirmError');
    const idDisplay    = document.getElementById('corp-confirmAppId');
    const errorMsg     = document.getElementById('corp-confirmErrorMsg');

    if (success) {
        successBlock.style.display = '';
        errorBlock.style.display   = 'none';
        if (idDisplay) idDisplay.textContent = applicationId || '—';

        clearSignature('corp-signatureCanvas');
        clearSignature('corp-signatureCanvas2');
        Object.keys(signatureSnapshots).forEach(k => {
            if (k.startsWith('corp-')) delete signatureSnapshots[k];
        });
        document.querySelectorAll('#corpModalOverlay input, #corpModalOverlay select, #corpModalOverlay textarea').forEach(field => {
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

    const modalBody = document.getElementById('corpModalBody');
    if (modalBody) modalBody.scrollTop = 0;
}

function corpRetrySubmission() {
    corporateForm.currentStep = 5;
    corpUpdateProgress();
}


// =============================================
//  HELPER — val/radioVal scoped to corporate modal
// =============================================

function val(id) {
    return document.getElementById(id)?.value?.trim() || '';
}
function radioVal(name) {
    return document.querySelector(`input[name="${name}"]:checked`)?.value || '—';
}


// =============================================
//  FIELD TOGGLES
// =============================================

function corpTogglePaymentFields() {
    const method = document.querySelector('input[name="corp-paymentMethod"]:checked')?.value;
    const branchField  = document.getElementById('corp-branchCodeField');
    const swiftField   = document.getElementById('corp-swiftCodeField');
    const currencyField = document.getElementById('corp-currencyField');

    branchField.style.display  = method === 'domestic' ? 'block' : 'none';
    swiftField.style.display   = method === 'international' ? 'block' : 'none';
    currencyField.style.display = method === 'international' ? 'block' : 'none';
}

function corpToggleTaxExemptUpload() {
    const taxExempt = document.querySelector('input[name="corp-taxExempt"]:checked')?.value;
    const uploadField = document.getElementById('corp-taxCertificateUpload');
    if (uploadField) uploadField.style.display = taxExempt === 'yes' ? 'block' : 'none';
}

function corpTogglePepDetails() {
    const pep = document.querySelector('input[name="corp-pep"]:checked')?.value;
    const details = document.getElementById('corp-pepDetails');
    if (details) details.style.display = pep === 'yes' ? '' : 'none';
}

function corpToggleSecondSignatory() {
    const section = document.getElementById('corp-secondSignatorySection');
    if (section) section.style.display = this.checked ? 'block' : 'none';
}

function corpSetupSigningMandate() {
    const select = document.getElementById('corp-signingAuthority');
    const secSigSection = document.getElementById('corp-secondarySignatureSection');
    const signName1 = document.getElementById('corp-signName1');
    const signName2 = document.getElementById('corp-signName2');
    if (!select) return;

    select.addEventListener('change', function() {
        const mandate = this.value;
        const hasTwoSignatories = document.getElementById('corp-addSecondSignatory')?.checked;

        if (mandate === 'single' || mandate === 'either' || !hasTwoSignatories) {
            if (secSigSection) secSigSection.style.display = 'none';
        } else {
            if (secSigSection) secSigSection.style.display = '';
        }

        // Autofill name fields
        const sig1Name = [
            document.getElementById('corp-sig1OtherNames')?.value?.trim(),
            document.getElementById('corp-sig1Surname')?.value?.trim()
        ].filter(Boolean).join(' ');

        const sig2Name = [
            document.getElementById('corp-sig2OtherNames')?.value?.trim(),
            document.getElementById('corp-sig2Surname')?.value?.trim()
        ].filter(Boolean).join(' ');

        if (mandate === 'single' || mandate === 'joint') {
            if (signName1) { signName1.value = sig1Name; signName1.readOnly = true; }
        } else if (mandate === 'either') {
            if (signName1) { signName1.value = ''; signName1.readOnly = false; }
        }

        if (mandate === 'joint') {
            if (signName2) { signName2.value = sig2Name; signName2.readOnly = true; }
        } else {
            if (signName2) { signName2.value = ''; signName2.readOnly = false; }
        }
    });
}


// =============================================
//  INITIALISATION
// =============================================

corpUpdateProgress();

// Upload zones
setupUploadZone('corp-kraPinCertInput',      'corp-kraPinCertPreview',      'corp-pre-kra-cert-upload',      false);
setupUploadZone('corp-taxExemptionCertInput', 'corp-taxCertificatePreview',  'corp-pre-cert-upload',          false);
setupUploadZone('corp-sig1PhotoInput',        'corp-sig1PhotoPreview',        'corp-pre-sig1-photo-upload',    true);
setupUploadZone('corp-sig1KraCertInput',      'corp-sig1KraCertPreview',      'corp-pre-sig1-kra-upload',      false);
setupUploadZone('corp-sig2PhotoInput',        'corp-sig2PhotoPreview',        'corp-pre-sig2-photo-upload',    true);
setupUploadZone('corp-sig2KraCertInput',      'corp-sig2KraCertPreview',      'corp-pre-sig2-kra-upload',      false);

// Button listeners
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('corp-nextBtn')?.addEventListener('click', corpNextStep);
    document.getElementById('corp-prevBtn')?.addEventListener('click', corpPreviousStep);
    document.getElementById('corp-closeConfirmBtn')?.addEventListener('click', closeCorporateModal);
    document.getElementById('corp-closeErrorBtn')?.addEventListener('click', closeCorporateModal);
    document.getElementById('corp-retrySubmitBtn')?.addEventListener('click', corpRetrySubmission);
    document.getElementById('corpCloseModal')?.addEventListener('click', closeCorporateModal);
    document.getElementById('corp-copyAppIdBtn')?.addEventListener('click', () =>
        copyApplicationId('corp-confirmAppId', 'corp-copyConfirmMsg')
    );

    // Field toggle listeners
    document.querySelectorAll('input[name="corp-paymentMethod"]').forEach(r =>
        r.addEventListener('change', corpTogglePaymentFields)
    );
    document.querySelectorAll('input[name="corp-taxExempt"]').forEach(r =>
        r.addEventListener('change', corpToggleTaxExemptUpload)
    );
    document.querySelectorAll('input[name="corp-pep"]').forEach(r =>
        r.addEventListener('change', corpTogglePepDetails)
    );
    document.getElementById('corp-addSecondSignatory')?.addEventListener('change', corpToggleSecondSignatory);

    // Branch code
    document.getElementById('corp-branchCode')?.addEventListener('input', function() {
        validateBranchCode('corp-bankNameInput', 'corp-branchCode', 'corp-branchCodeResult');
    });

    // Bank autocomplete - set up when step 2 is reached (handled in corpUpdateProgress step 2 init)
    // Country code autocompletes
    setupCountryCodeAutocomplete('corp-countryCode');
    setupCountryCodeAutocomplete('corp-sig1CountryCode');
    setupCountryCodeAutocomplete('corp-sig2CountryCode');

    // KRA PIN live validation
    setupKraPinValidation('corp-kraPin');
    setupKraPinValidation('corp-sig1KraPin');
    setupKraPinValidation('corp-sig2KraPin');

    // Signing mandate setup (on step 4 entry — also wire now for safety)
    corpSetupSigningMandate();

    // Signature clear + upload buttons
    document.getElementById('corp-clearSignature')?.addEventListener('click', () => {
        clearSignature('corp-signatureCanvas');
        resetSignatureUpload('corp-sigUploadZone1', 'corp-sigUploadInput1');
    });
    document.getElementById('corp-uploadSignatureBtn')?.addEventListener('click', () =>
        toggleSignatureUpload('corp-sigUploadZone1')
    );
    document.getElementById('corp-sigUploadInput1')?.addEventListener('change', function() {
        loadSignatureImage(this, 'corp-signatureCanvas', 'corp-sigUploadZone1');
    });

    document.getElementById('corp-clearSignature2')?.addEventListener('click', () => {
        clearSignature('corp-signatureCanvas2');
        resetSignatureUpload('corp-sigUploadZone2', 'corp-sigUploadInput2');
    });
    document.getElementById('corp-uploadSignatureBtn2')?.addEventListener('click', () =>
        toggleSignatureUpload('corp-sigUploadZone2')
    );
    document.getElementById('corp-sigUploadInput2')?.addEventListener('change', function() {
        loadSignatureImage(this, 'corp-signatureCanvas2', 'corp-sigUploadZone2');
    });

    // Auto-clear validation errors on correction
    document.getElementById('corpModalOverlay')?.addEventListener('input', function(e) {
        const field = e.target;
        if (field.classList.contains('form-input') || field.classList.contains('form-select') || field.classList.contains('form-textarea')) {
            if (field.value && field.value.trim() !== '') {
                field.style.borderColor = '';
                field.style.boxShadow = '';
                const errorMsg = field.nextElementSibling;
                if (errorMsg && errorMsg.classList.contains('field-error-msg')) errorMsg.remove();
            }
        }
    });

    document.getElementById('corpModalOverlay')?.addEventListener('change', function(e) {
        const field = e.target;
        if (field.type === 'radio') {
            const radioGroup = field.closest('.form-radio-group');
            if (radioGroup) {
                radioGroup.style.outline = '';
                radioGroup.style.padding = '';
                const errorMsg = radioGroup.nextElementSibling;
                if (errorMsg && errorMsg.classList.contains('field-error-msg')) errorMsg.remove();
            }
        }
        if (field.type === 'checkbox' && field.checked) {
            const label = field.closest('label') || field.parentElement;
            label.style.outline = '';
            label.style.padding = '';
            const errorMsg = label.nextElementSibling;
            if (errorMsg && errorMsg.classList.contains('field-error-msg')) errorMsg.remove();
        }
        if (field.classList.contains('form-select') && field.value) {
            field.style.borderColor = '';
            field.style.boxShadow = '';
            const errorMsg = field.nextElementSibling;
            if (errorMsg && errorMsg.classList.contains('field-error-msg')) errorMsg.remove();
        }
    });
});

// Bank autocomplete initialised when step 2 becomes active
const _corpOrigUpdateProgress = corpUpdateProgress;
// Patch corpUpdateProgress to also init bank autocomplete on step 2
(function() {
    const orig = corpUpdateProgress;
    window.corpUpdateProgress = function() {
        orig();
        if (corporateForm.currentStep === 2) {
            setTimeout(() => setupBankAutocomplete('corp-bankNameInput', 'corp-bankSuggestions','corp-paymentMethod'), 100);
        }
        if (corporateForm.currentStep === 4) {
            setTimeout(() => initSignatureCanvas('corp-signatureCanvas'), 300);
            setTimeout(() => initSignatureCanvas('corp-signatureCanvas2'), 300);
            setTimeout(corpSetupSigningMandate, 50);
        }
    };
    // Replace corpUpdateProgress reference used internally
    corpUpdateProgress = window.corpUpdateProgress;
})();