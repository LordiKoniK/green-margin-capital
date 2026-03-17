// GENERIC FUNCTIONS/DATA TO BE USED BY ALL APPLICATION FORMS

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


// =============================================
//  Validation messages (invalid fields)
// =============================================

// Marks a field as invalid with a red border and shows an error message below it
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

// Clear validation styling from all fields in the current step
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

// Show banner at the top of the step with total invalid field count
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



// =============================================
//  Regex/Format patterns
// =============================================

const KRA_REGEX = /^[A-Za-z][A-Za-z0-9]{9}[A-Za-z]$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


// =============================================
//  KRA PIN Validation
// =============================================
// Attaches live (blur + input) KRA PIN format validation to a field by ID
// Shows an inline error message beneath the field if invalid

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

        if (!KRA_REGEX.test(val)) {
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
//  Email Confirmation
// =============================================

/**
 * Dynamically injects a "Confirm Email Address" field directly after the given email input, with:
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

// =============================================
//  Postal Address Formatting
// =============================================
// Match any variation of 'po box' typed by the user, with/without dots/spaces/case,
// and replace it with a properly formatted 'P.O. Box' prefix. 

function formatPostalAddress(value) {
    if (!value || !value.trim()) return '';
    // Match examples: po box, p.o box, p o box, p.o. box, POBOX, P.O.B.O.X., etc.
    const poBoxPattern = /^(p[\s.]*o[\s.]*b[\s.]*o[\s.]*x\b)/i;
    let trimmed = value.trim();
    if (poBoxPattern.test(trimmed)) {
        // Replace the detected prefix with 'P.O. Box'
        trimmed = trimmed.replace(poBoxPattern, 'P.O. Box');
        return trimmed;
    }
    // If no PO Box, return as-is
    return trimmed;
}


// =============================================
//  Bank checking functionality
// =============================================

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
function setupBankAutocomplete(bankInputId, bankSuggestionList) {
    const bankInput = document.getElementById(bankInputId);
    const suggestionsList = document.getElementById(bankSuggestionList);
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

function validateBranchCode(bankInputId, branchInputId, resultDivId) {
    const bankName = document.getElementById(bankInputId).value;
    const branchInput = document.getElementById(branchInputId);
    const branchValue = branchInput.value.trim();
    const resultDiv = document.getElementById(resultDivId);

    resultDiv.innerHTML = '';
    removeBranchDropdown();

    if (!bankName || !branchValue) return;

    const isNumeric = /^\d+$/.test(branchValue);

    if (isNumeric) {
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
                </div>`;
        } else if (branchValue.length >= 2) {
            resultDiv.innerHTML = `
                <div style="color: var(--error-red); font-weight: 500; padding: 12px; background: rgba(239, 68, 68, 0.1); border-radius: 6px; display: flex; align-items: center; gap: 8px;">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                    </svg>
                    <span>Branch code not found for this bank</span>
                </div>`;
        }
    } else {
        if (branchValue.length < 2) return;

        const matches = bankData.filter(item =>
            item['Bank Name'] === bankName &&
            item['Branch Name'].toLowerCase().includes(branchValue.toLowerCase())
        ).slice(0, 8);

        if (matches.length > 0) {
            // Pass a callback so showBranchDropdown can re-trigger validation
            // without needing to know the argument names itself
            showBranchDropdown(matches, branchInput, () => {
                validateBranchCode(bankInputId, branchInputId, resultDivId);
            });
        }
    }
}

function showBranchDropdown(matches, inputEl, onSelect) {
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
            inputEl.value = branch['Branch Code'];
            removeBranchDropdown();
            onSelect(); // call back into validateBranchCode with the original arguments already baked in
        });

        dropdown.appendChild(li);
    });

    inputEl.parentElement.style.position = 'relative';
    inputEl.parentElement.appendChild(dropdown);

    document.addEventListener('click', (e) => handleBranchOutsideClick(e, inputEl.id));
}

function removeBranchDropdown() {
    const existing = document.getElementById('branchSuggestions');
    if (existing) existing.remove();
    document.removeEventListener('click', handleBranchOutsideClick);
}

function handleBranchOutsideClick(e, branchInputId) {
    const dropdown = document.getElementById('branchSuggestions');
    const input = document.getElementById(branchInputId);
    if (dropdown && e.target !== input && !dropdown.contains(e.target)) {
        removeBranchDropdown();
    }
}

// =============================================
//  Country and Country Code Dropdowns
// =============================================


function populateCountryDropdown(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;

    // Clear existing options except the placeholder
    select.innerHTML = '<option value="">Select country</option>';

    countries.forEach(country => {
        const option = document.createElement('option');
        option.value = country;
        option.textContent = country;

        // Pre-select Kenya for Kenyan users
        if (country === 'Kenya') {
            option.selected = true;
        }
        select.appendChild(option);
    });
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

        li.addEventListener('mousedown', (e) => {
            e.preventDefault(); // Prevents input blur before selection
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



// =============================================
//  UPLOAD ZONES — shared handler for click + drag-and-drop
// =============================================

/**
 * Sets up a file upload zone with:
 *  - Click-to-browse
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



// =============================================
//  Signature canvas functions
// =============================================

const signatureStates = new Map(); // canvasId -> { isDrawing, lastX, lastY }

function isCanvasEmpty(canvas) {
    const ctx = canvas.getContext('2d');
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 3; i < data.length; i += 4) {
        if (data[i] !== 0) return false;
    }
    return true;
}

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

// Toggles the visibility of a signature upload zone.
function toggleSignatureUpload(zoneId) {
    const zone = document.getElementById(zoneId);
    if (!zone) return;
    const isHidden = zone.style.display === 'none' || zone.style.display === '';
    zone.style.display = isHidden ? 'block' : 'none';
}


// Draw an uploaded image file onto the specified canvas
function loadSignatureImage(inputEl, canvasId, zoneId) {
    const file = inputEl.files[0];
    if (!file) return;

    // Validate it's an image
    if (!file.type.startsWith('image/')) {
        showToast('Please upload an image file (PNG, JPG, etc.)', 'error');
        inputEl.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;
            const ctx = canvas.getContext('2d');

            // Clear any existing drawing
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Scale image to fill canvas while preserving aspect ratio (contain)
            const canvasW = canvas.width;
            const canvasH = canvas.height;
            const scale   = Math.min(canvasW / img.width, canvasH / img.height);
            const drawW   = img.width  * scale;
            const drawH   = img.height * scale;
            const offsetX = (canvasW - drawW) / 2;
            const offsetY = (canvasH - drawH) / 2;

            ctx.drawImage(img, offsetX, offsetY, drawW, drawH);

            // Hide the upload zone — preview is the canvas itself
            const zone = document.getElementById(zoneId);
            if (zone) zone.style.display = 'none';

            // Clear any validation error on the signature area
            const signatureArea = canvas.closest('.signature-area');
            if (signatureArea) {
                signatureArea.style.borderColor = '';
                signatureArea.style.boxShadow   = '';
            }
            const errMsg = canvas.parentNode.querySelector('.field-error-msg');
            if (errMsg) errMsg.remove();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Reset a signature upload zone: hide it and clear file input.
function resetSignatureUpload(zoneId, inputId) {
    const zone  = document.getElementById(zoneId);
    const input = document.getElementById(inputId);
    if (zone)  zone.style.display  = 'none';
    if (input) input.value = '';
}

function clearSignature(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// Stores snapshots across step navigation, keyed by canvas ID
const signatureSnapshots = {};

function initSignatureCanvas(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    // Snapshot before anything clears it
    if (canvas.width > 0 && canvas.height > 0 && !isCanvasEmpty(canvas)) {
        signatureSnapshots[canvasId] = canvas.toDataURL();
    }

    const hasSnapshot = !!signatureSnapshots[canvasId];

    // Only resize if there's no content to preserve — resizing always clears the canvas
    if (!hasSnapshot) {
        resizeCanvas(canvas);
    }

    // Remove old event listeners by cloning the node
    const newCanvas = canvas.cloneNode(true);
    canvas.parentNode.replaceChild(newCanvas, canvas);
    const freshCanvas = document.getElementById(canvasId);

    // Same: only resize the fresh canvas if no snapshot to restore
    if (!hasSnapshot) {
        resizeCanvas(freshCanvas);
    }

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

    // Restore snapshot — no resize happened so dimensions are identical
    if (hasSnapshot) {
        const savedSnapshot = signatureSnapshots[canvasId];
        const img = new Image();
        img.onload = function() {
            const ctx = freshCanvas.getContext('2d');
            ctx.drawImage(img, 0, 0, freshCanvas.width, freshCanvas.height);
        };
        img.src = savedSnapshot;
    }
}

// Copy GMC ID after successful application

function copyApplicationId(appIdEl, confirmMsgEl) {
    const id = document.getElementById(appIdEl)?.textContent?.trim();
    if (!id) return;
    navigator.clipboard.writeText(id).then(() => {
        const msg = document.getElementById(confirmMsgEl);
        if (msg) {
            msg.textContent = '✓ Copied to clipboard';
            setTimeout(() => { msg.textContent = ''; }, 3000);
        }
    }).catch(() => {
        // Fallback for older browsers
        const tmp = document.createElement('textarea');
        tmp.value = id;
        document.body.appendChild(tmp);
        tmp.select();
        document.execCommand('copy');
        document.body.removeChild(tmp);
        const msg = document.getElementById(confirmMsgEl);
        if (msg) { msg.textContent = '✓ Copied'; setTimeout(() => { msg.textContent = ''; }, 3000); }
    });
}

// =============================================
//  Dropdown data
// =============================================

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

