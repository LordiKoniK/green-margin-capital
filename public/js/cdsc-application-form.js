window.openModal = openModal;
let currentStep = 1;
const totalSteps = 5;

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

async function nextStep() {
    if (currentStep < totalSteps) {
        currentStep++;
        updateProgress();
    } else {
        // Submit form
        await submitApplication();
    }
}

function previousStep() {
    if (currentStep > 1) {
        currentStep--;
        updateProgress();
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
            primary_passport_expiry: document.querySelectorAll('.form-step[data-step="2"] input[type="date"]')[1].value,
            primary_nationality: document.getElementById('nationality').value,
            primary_country_residence: document.getElementById('countryOfResidence').value,
            primary_kra_pin: document.querySelectorAll('.form-step[data-step="2"] input')[7].value,
            
            // Primary Contact
            primary_country_code: document.querySelectorAll('.form-step[data-step="3"] input')[0].value,
            primary_phone: document.querySelectorAll('.form-step[data-step="3"] input[type="tel"]')[0].value,
            primary_email: document.querySelectorAll('.form-step[data-step="3"] input[type="email"]')[0].value,
            primary_town_city: document.querySelectorAll('.form-step[data-step="3"] input')[3].value,
            primary_physical_location: document.querySelectorAll('.form-step[data-step="3"] input')[4].value,
            primary_postal_code: document.querySelectorAll('.form-step[data-step="3"] input')[5].value,
            primary_postal_address: document.querySelectorAll('.form-step[data-step="3"] input')[6].value,
            
            // Primary Employment/Business
            primary_fund_source: document.getElementById('fundSource').value,
            primary_employer_name: document.getElementById('employerName')?.value || '',
            primary_employer_postal: document.getElementById('employerPostal')?.value || '',
            primary_employer_phone: document.getElementById('employerPhone')?.value || '',
            primary_employer_email: document.getElementById('employerEmail')?.value || '',
            primary_business_name: document.getElementById('businessName')?.value || '',
            primary_business_reg_number: document.getElementById('businessRegNumber')?.value || '',
            primary_business_postal: document.getElementById('businessPostal')?.value || '',
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
            signature_date: document.getElementById('signDate')?.value || ''
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
            applicationData.secondary_postal_address = document.getElementById('secondaryPostalAddress')?.value;
            applicationData.secondary_fund_source = document.getElementById('fundSource2')?.value;
            applicationData.secondary_employer_name = document.getElementById('employerName2')?.value;
            applicationData.secondary_employer_postal = document.getElementById('employerPostal2')?.value;
            applicationData.secondary_employer_phone = document.getElementById('employerPhone2')?.value;
            applicationData.secondary_employer_email = document.getElementById('employerEmail2')?.value;
            applicationData.secondary_business_name = document.getElementById('businessName2')?.value;
            applicationData.secondary_business_reg_number = document.getElementById('businessRegNumber2')?.value;
            applicationData.secondary_business_postal = document.getElementById('businessPostal2')?.value;
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

// QOL IMPROVEMENTS 

// Close modal on overlay click
// document.getElementById('modalOverlay').addEventListener('click', function(e) {
//     if (e.target === this) {
//         closeModal();
//     }
// });

// Close modal on Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeModal();
    }
});

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



function replacePassportPhotoIcon() {
    const photoInput = document.getElementById('passportPhotoInput');
    const photoPreview = document.getElementById('passportPhotoPreview');
    const defaultPreImg = document.getElementById('pre-img-upload');
    if (photoInput && photoPreview) {
        photoInput.addEventListener('change', function(event) {
            defaultPreImg.style.display = 'none';
            photoPreview.innerHTML = '';
            const file = event.target.files[0];
            if (file) {
                if (file.type.startsWith('image/')) {
                    const img = document.createElement('img');
                    img.src = URL.createObjectURL(file);
                    img.style.maxWidth = '150px';
                    img.style.maxHeight = '150px';
                    img.style.display = 'block';
                    img.style.marginTop = '8px';
                    photoPreview.appendChild(img);
                }
                // Remove (X) button
                const removeBtn = document.createElement('button');
                removeBtn.textContent = '×';
                removeBtn.setAttribute('type', 'button');
                removeBtn.style.marginLeft = '30px';
                removeBtn.style.background = 'transparent';
                removeBtn.style.border = 'none';
                removeBtn.style.color = '#ff0000';
                removeBtn.style.fontSize = '2em';
                removeBtn.style.cursor = 'pointer';
                removeBtn.title = 'Remove file';
                removeBtn.onclick = function(e) {
                    e.stopPropagation();
                    photoInput.value = '';
                    photoPreview.innerHTML = '';
                    defaultPreImg.style.display = '';
                };
                removeBtn.onmousedown = function(e) {
                    e.stopPropagation();
                };
                photoPreview.appendChild(removeBtn);
            }
        });
    }
}

function replacePassportPhotoIcon2() {
    const photoInput2 = document.getElementById('passportPhotoInput2');
    const photoPreview2 = document.getElementById('passportPhotoPreview2');
    const defaultPreImg2 = document.getElementById('pre-img-upload2');
    if (photoInput2 && photoPreview2) {
        photoInput2.addEventListener('change', function(event) {
            defaultPreImg2.style.display = 'none';
            photoPreview2.innerHTML = '';
            const file = event.target.files[0];
            if (file) {
                if (file.type.startsWith('image/')) {
                    const img = document.createElement('img');
                    img.src = URL.createObjectURL(file);
                    img.style.maxWidth = '150px';
                    img.style.maxHeight = '150px';
                    img.style.display = 'block';
                    img.style.marginTop = '8px';
                    photoPreview2.appendChild(img);
                }
                // Remove (X) button
                const removeBtn = document.createElement('button');
                removeBtn.textContent = '×';
                removeBtn.setAttribute('type', 'button');
                removeBtn.style.marginLeft = '30px';
                removeBtn.style.background = 'transparent';
                removeBtn.style.border = 'none';
                removeBtn.style.color = '#ff0000';
                removeBtn.style.fontSize = '2em';
                removeBtn.style.cursor = 'pointer';
                removeBtn.title = 'Remove file';
                removeBtn.onclick = function(e) {
                    e.stopPropagation();
                    photoInput2.value = '';
                    photoPreview2.innerHTML = '';
                    defaultPreImg2.style.display = '';
                };
                removeBtn.onmousedown = function(e) {
                    e.stopPropagation();
                };
                photoPreview2.appendChild(removeBtn);
            }
        });
    }
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

function replaceTaxCertIcon() {
    const certInput = document.getElementById('taxExemptionCertInput');
    const certPreview = document.getElementById('taxCertificatePreview');
    const defPreImg = document.getElementById('pre-cert-upload');
    if (certInput && certPreview) {
        certInput.addEventListener('change', function(event) {
            defPreImg.style.display = 'none';
            certPreview.innerHTML = '';
            const file = event.target.files[0];
            if (file) {
                const filename = document.createElement('div');
                filename.textContent = file.name;
                filename.style.fontSize = '0.95em';
                filename.style.marginTop = '4px';
                certPreview.appendChild(filename);

                // Remove (X) button
                const removeBtn = document.createElement('button');
                removeBtn.textContent = '×';
                removeBtn.setAttribute('type', 'button');
                removeBtn.style.marginLeft = '30px';
                removeBtn.style.background = 'transparent';
                removeBtn.style.border = 'none';
                removeBtn.style.fontSize = '2em';
                removeBtn.style.color = '#ff0000';
                removeBtn.style.cursor = 'pointer';
                removeBtn.title = 'Remove file';
                removeBtn.onclick = function(e) {
                    e.stopPropagation();
                    certInput.value = '';
                    certPreview.innerHTML = '';
                    defPreImg.style.display = '';
                };
                removeBtn.onmousedown = function(e) {
                    e.stopPropagation();
                };
                certPreview.appendChild(removeBtn);
            }
        });
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
