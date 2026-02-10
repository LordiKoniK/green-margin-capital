window.openModal = openModal;
let currentStep = 1;
const totalSteps = 5;

function openModal() {
    document.getElementById('modalOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
    // Initialize signature canvas after modal is fully rendered
    setTimeout(initSignatureCanvas, 300);
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
        setTimeout(initSignatureCanvas, 100);
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

function nextStep() {
    if (currentStep < totalSteps) {
        currentStep++;
        updateProgress();
    } else {
        // Submit form - convert signature to PNG
        const canvas = document.getElementById('signatureCanvas');

        // Check if signature is empty
        const context = canvas.getContext('2d');
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        let isEmpty = true;
        
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] !== 0) { // Check alpha channel
                isEmpty = false;
                break;
            }
        }
        
        if (isEmpty) {
            alert('Please provide your signature before submitting.');
            return;
        }
        
        // Convert canvas (signature) to PNG 
        canvas.toBlob(function(blob) {
            // Create download link for testing
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'signature_' + Date.now() + '.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            // In production, you would send this blob to your backend:
            // const formData = new FormData();
            // formData.append('signature', blob, 'signature.png');
            // fetch('/api/submit-application', {
            //     method: 'POST',
            //     body: formData
            // });
            
            alert('Application submitted successfully! Signature downloaded for testing.');
            closeModal();
            currentStep = 1;
            updateProgress();
            clearSignature();
        }, 'image/png');
    }
}

function previousStep() {
    if (currentStep > 1) {
        currentStep--;
        updateProgress();
    }
}

// Close modal on overlay click
// document.getElementById('modalOverlay').addEventListener('click', function(e) {
//     if (e.target === this) {
//         closeModal();
//     }
// });

// Close modal on Escape key
// document.addEventListener('keydown', function(e) {
//     if (e.key === 'Escape') {
//         closeModal();
//     }
// });

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

// Attach file input listeners for previews
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
    const clearSignatureBtn = document.querySelector('.btn-clear-signature');
    if (clearSignatureBtn) {
        clearSignatureBtn.addEventListener('click', clearSignature);
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
                // Add remove (X) button
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
                // Add remove (X) button
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
    if (fundSource === 'employment') {
        employmentFields.style.display = 'contents';
        // Clear business fields
        businessFields.querySelectorAll('input').forEach(input => input.value = '');
    } else if (fundSource === 'business') {
        businessFields.style.display = 'contents';
        // Clear employment fields
        employmentFields.querySelectorAll('input').forEach(input => input.value = '');
    }
}

function toggleFundSourceFields2() {
    const fundSource = document.getElementById('fundSource2').value;
    const employmentFields = document.getElementById('employmentFields2');
    const businessFields = document.getElementById('businessFields2');
    
    // Hide both sections first
    employmentFields.style.display = 'none';
    businessFields.style.display = 'none';
    
    // Show relevant section based on selection
    if (fundSource === 'employment') {
        employmentFields.style.display = 'contents';
        // Clear business fields
        businessFields.querySelectorAll('input').forEach(input => input.value = '');
    } else if (fundSource === 'business') {
        businessFields.style.display = 'contents';
        // Clear employment fields
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
                // Add remove (X) button
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

// Fetch the JSON file
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
        
        // Get unique bank names
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
        // --- NUMERIC MODE: look up branch name by code ---
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
        // --- TEXT MODE: search branch names, show dropdown ---
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





//
//      DECLARATION PAGE
//      DECLARATION PAGE
//
//





// Signature Canvas Setup
let isDrawing = false;
let lastX = 0;
let lastY = 0;

function initSignatureCanvas() {
    const canvas = document.getElementById('signatureCanvas');
    if (!canvas) return;
    
    // Set explicit dimensions
    canvas.width = 800;
    canvas.height = 200;
    
    const ctx = canvas.getContext('2d');
    
    // Set drawing style
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Remove old event listeners if any
    const newCanvas = canvas.cloneNode(true);
    canvas.parentNode.replaceChild(newCanvas, canvas);
    
    // Get the new canvas reference
    const freshCanvas = document.getElementById('signatureCanvas');
    freshCanvas.width = 800;
    freshCanvas.height = 200;
    
    // Mouse events
    freshCanvas.addEventListener('mousedown', startDrawing);
    freshCanvas.addEventListener('mousemove', draw);
    freshCanvas.addEventListener('mouseup', stopDrawing);
    freshCanvas.addEventListener('mouseout', stopDrawing);
    
    // Touch events for mobile
    freshCanvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    freshCanvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    freshCanvas.addEventListener('touchend', stopDrawing);
}

function getCanvasCoordinates(canvas, clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: clientX - rect.left,
        y: clientY - rect.top
    };
}

function startDrawing(e) {
    isDrawing = true;
    const canvas = document.getElementById('signatureCanvas');
    const coords = getCanvasCoordinates(canvas, e.clientX, e.clientY);
    lastX = coords.x;
    lastY = coords.y;
}

function draw(e) {
    if (!isDrawing) return;
    
    const canvas = document.getElementById('signatureCanvas');
    const ctx = canvas.getContext('2d');
    const coords = getCanvasCoordinates(canvas, e.clientX, e.clientY);
    
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    
    lastX = coords.x;
    lastY = coords.y;
}

function stopDrawing() {
    isDrawing = false;
}

function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const canvas = document.getElementById('signatureCanvas');
    const coords = getCanvasCoordinates(canvas, touch.clientX, touch.clientY);
    isDrawing = true;
    lastX = coords.x;
    lastY = coords.y;
}

function handleTouchMove(e) {
    e.preventDefault();
    if (!isDrawing) return;
    
    const touch = e.touches[0];
    const canvas = document.getElementById('signatureCanvas');
    const ctx = canvas.getContext('2d');
    const coords = getCanvasCoordinates(canvas, touch.clientX, touch.clientY);
    
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    
    lastX = coords.x;
    lastY = coords.y;
}

function clearSignature() {
    const canvas = document.getElementById('signatureCanvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}


// Payment Page
