const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');

// PARAMETERS
/**
 * Main CDSC form params
 * @param {Object} applicationData - Individual application data from database
 * @param {string} outputPath - Where to save the filled PDF
 * @returns {Promise<string>} - Path to the generated PDF
 * 
 */

/**
 * Date drawing params
 * @param {PDFPage} page - The PDF page to draw on
 * @param {PDFFont} font - The font to use
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @param {number} startX - Starting X coordinate (left edge of first box)
 * @param {number} y - Y coordinate (baseline of text)
 * @param {number} boxWidth - Width of each individual box (default: 12)
 * @param {number} boxSpacing - Spacing between boxes (default: 2)
 * @param {number} fontSize - Font size (default: 10)
 */

// Date fields are digit-split boxes, hence also must be drawn manually
function drawDateInBoxes(page, font, dateStr, startX, y, boxWidth = 11.2, boxSpacing = 0, fontSize = 10) {
  if (dateStr instanceof Date) {
    // Convert SQL date object
    dateStr = dateStr.toISOString().slice(0, 10);
  } else if (typeof dateStr === 'string' && dateStr.match(/^[A-Za-z]{3} /)) {
    const parsed = new Date(dateStr);
    if (!isNaN(parsed)) {
      dateStr = parsed.toISOString().slice(0, 10);
    }
  } else {
    dateStr = String(dateStr || '');
  }

  if (!dateStr) return;

  // Convert YYYY-MM-DD to DD-MM-YYYY
  let formattedDate;
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      formattedDate = `${parts[2]}${parts[1]}${parts[0]}`;
    } else {
      formattedDate = dateStr.replace(/-/g, '');
    }
  } else {
    formattedDate = dateStr;
  }

  // Remove any non-numeric characters
  formattedDate = formattedDate.replace(/\D/g, '');

  // Ensure we have 8 digits (DDMMYYYY)
  if (formattedDate.length !== 8) {
    console.log(`Warning: Invalid date format for ${dateStr}, expected 8 digits, got ${formattedDate.length}`);
    return;
  }

  // Draw each digit in its box
  let currentX = startX;
  for (let i = 0; i < formattedDate.length; i++) {
    const digit = formattedDate[i];

    // Center the digit in the box
    const digitWidth = font.widthOfTextAtSize(digit, fontSize);
    const xOffset = (boxWidth - digitWidth) / 2;

    page.drawText(digit, {
      x: currentX + xOffset,
      y: y,
      size: fontSize,
      font: font,
      color: rgb(0, 0, 0),
    });

    currentX += boxWidth + boxSpacing;
  }
}



async function fillCDSCForm(applicationData, outputPath) {
  try {
    // Read form template file
    const templatePath = path.join(__dirname, 'public', 'assets', 'CDS_1_1_INDIVIDUAL-JOINT_ACCOUNT_OPENING_FORM_1.pdf');
    const existingPdfBytes = await fs.readFile(templatePath);
    
    // Load the document
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const form = pdfDoc.getForm();

    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica); // Embed Helvetica font for drawing dates

    // Helper: set a text field by name
    const setField = (fieldName, value) => {
      try {
        const field = form.getTextField(fieldName);
        if (field && value) {
          field.setText(String(value));
        }
      } catch (error) {
        console.log(`Error`, error);
      }
    };

    // ── Helper: tick a checkbox by field name ──
    const tickCheckbox = (fieldName) => {
      try {
        const field = form.getCheckBox(fieldName);
        if (field) field.check();
      } catch (error) {
        console.log(`tickCheckbox: field "${fieldName}" not found or not a checkbox — use drawCheckmark fallback`);
      }
    };


    // Account Type
    setField('CDA CODE', applicationData.cda_code);
    setField('CDS ACCOUNT NUMBER NEWEXISTING', applicationData.cds_account_number);

    // Primary Client Details
    setField('Surname', applicationData.primary_surname);
    setField('Other Names', applicationData.primary_other_names);
    setField('IDPassport Number', applicationData.primary_id_number);
    setField('NationalityCitizenship', applicationData.primary_nationality);
    setField('Country of Residence', applicationData.primary_country_residence);
    setField('KRA PIN', applicationData.primary_kra_pin);

    // Primary Contact Information
    setField('Country Code', applicationData.primary_country_code);
    setField('Telephone Number', applicationData.primary_phone);
    setField('Email Address', applicationData.primary_email);
    setField('CityTown', applicationData.primary_town_city);
    setField('Physical Location TownCity', applicationData.primary_physical_location);
    setField('Postal Code', applicationData.primary_postal_code);
    setField('Postal Address', applicationData.primary_postal_address);

    // Primary Employment/Business
    setField('Source of Investment Funds', applicationData.primary_fund_source);
    if (applicationData.primary_fund_source === 'Employment') {
      setField('Name of Employer', applicationData.primary_employer_name);
      setField('Employer Postal Address', applicationData.primary_employer_postal);
      setField('Employer Telephone Number', applicationData.primary_employer_phone);
      setField('Employer Email Address', applicationData.primary_employer_email);
    } else if (applicationData.primary_fund_source === 'Business') {
      setField('If business provide name of business', applicationData.primary_business_name);
      setField('RegistrationIncorporation Certificate Number', applicationData.primary_business_reg_number);
      setField('Postal Address_2', applicationData.primary_business_postal);
      setField('Telephone Number_2', applicationData.primary_business_phone);
      setField('Email Address_2', applicationData.primary_business_email);
      setField('Registered Office', applicationData.primary_business_office);
    }

    // Secondary Client Details (if joint account)
    if (applicationData.account_type === 'joint') {
      setField('Surname_2', applicationData.secondary_surname);
      setField('Other Names_2', applicationData.secondary_other_names);
      setField('IDPassport Number_2', applicationData.secondary_id_number);
      setField('NationalityCitizenship_2', applicationData.secondary_nationality);
      setField('Country of Residence_2', applicationData.secondary_country_residence);
      setField('KRA PIN_2', applicationData.secondary_kra_pin);
      setField('Name_2', applicationData.secondary_signer_names);
      setField('Name_4', applicationData.secondary_signer_names);

      // Secondary Contact
      setField('Country Code_2', applicationData.secondary_country_code);
      setField('Telephone Number_3', applicationData.secondary_phone);
      setField('Email Address_3', applicationData.secondary_email);
      setField('CityTown_2', applicationData.secondary_town_city);
      setField('Physical Location TownCity_2', applicationData.secondary_physical_location);
      setField('Postal Code_2', applicationData.secondary_postal_code);
      setField('Postal Address_3', applicationData.secondary_postal_address);
      

      // Secondary Employment/Business
      setField('Source of Investment Funds_2', applicationData.secondary_fund_source);
      if (applicationData.secondary_fund_source === 'Employment') {
        setField('Name of Employer_2', applicationData.secondary_employer_name);
        setField('Employer Postal Address_2', applicationData.secondary_employer_postal);
        setField('Employer Telephone Number_2', applicationData.secondary_employer_phone);
        setField('Employer Email Address_2', applicationData.secondary_employer_email);
      } else if (applicationData.secondary_fund_source === 'Business') {
        setField('If business provide name of business_2', applicationData.secondary_business_name);
        setField('RegistrationIncorporation Certificate Number_2', applicationData.secondary_business_reg_number);
        setField('Postal Address_4', applicationData.secondary_business_postal);
        setField('Telephone Number_4', applicationData.secondary_business_phone);
        setField('Email Address_4', applicationData.secondary_business_email);
        setField('Registered Office_2', applicationData.secondary_business_office);
      }
    }

    // PEP Status
    if (applicationData.is_pep) {
      setField('If yes specify the name of the person and the relationship', applicationData.pep_details);
    }

    // Payment Details
    if (applicationData.payment_method !== 'mobile') {
      setField('Bank Name', applicationData.bank_name);
      setField('Account Number', applicationData.account_number);
      setField('Account Name', applicationData.account_name);
      
      if (applicationData.payment_method === 'domestic') {
        setField('Branch Code Domestic Banks', applicationData.branch_code);
      } else {
        setField('Bank Swift Code International Banks', applicationData.swift_code);
        setField('Indicate any other currency', applicationData.other_currency);
      }
    } else {
      setField('Phone Number', applicationData.mobile_money_phone);
    }

    // Declaration
    setField('Name', applicationData.signer_names);
    setField('Name_3', applicationData.signer_names);

    // ====================================
    // CHECKBOX FIELDS
    // ====================================
     
    // Account Type 
    if (applicationData.account_type === 'individual') {
      tickCheckbox('Check Box232'); 
    } else if (applicationData.account_type === 'joint') {
      tickCheckbox('Check Box233'); 
      }
    
    // Primary Gender 
    if (applicationData.primary_gender === 'male') {
      tickCheckbox('Check Box234'); 
    } else if (applicationData.primary_gender === 'female') {
      tickCheckbox('Check Box235'); 
    }
    
    // Investor Category 
    if (applicationData.primary_investor_category === 'LI') {
      tickCheckbox('Check Box238'); 
    } else if (applicationData.primary_investor_category === 'FI') {
      tickCheckbox('Check Box239'); 
    } else if (applicationData.primary_investor_category === 'EI') {
      tickCheckbox('Check Box242'); 
    }
    
    // Primary ID Type 
    if (applicationData.primary_id_type === 'national') {
      tickCheckbox('Check Box236');
    } else if (applicationData.primary_id_type === 'ea') {
      tickCheckbox('Check Box237');
    } else if (applicationData.primary_id_type === 'passport') {
      tickCheckbox('Check Box240');
    } else if (applicationData.primary_id_type === 'alien') {
      tickCheckbox('Check Box241');
    }
    
    // PEP Status 
    if (applicationData.is_pep === 'Yes' || applicationData.is_pep === true) {
      tickCheckbox('Check Box268');
    } else {
      tickCheckbox('Check Box269'); // No
    }
    
    // Payment Method 
    if (applicationData.payment_method === 'domestic') {
      tickCheckbox('Check Box254');
    } else if (applicationData.payment_method === 'international') {
      tickCheckbox('Check Box255');
    } else if (applicationData.payment_method === 'mobile') {
      tickCheckbox('Check Box256');
    }


    // International bank currencies
    const currencyBoxes = {
      'EUR': 'Check Box257',
      'USD': 'Check Box258',
      'GBP': 'Check Box259',
      'KES': 'Check Box260',
      'USH': 'Check Box261',
      'TZSH': 'Check Box262',
      'RFRANC': 'Check Box263'
    };

    if (applicationData.currency) {
      const selectedCurrencies = applicationData.currency.split(',').map(c => c.trim().toUpperCase());
      selectedCurrencies.forEach(curr => {
        if (currencyBoxes[curr]) {
          const box = currencyBoxes[curr];
          tickCheckbox(box);
        }
      });
    }
    
    // Tax Exemption Status 
    if (applicationData.is_tax_exempt === 'Yes' || applicationData.is_tax_exempt === true) {
      tickCheckbox('Check Box252'); // Yes
    } else {
      tickCheckbox('Check Box253'); // No
    }
    
    // Signing Mandate 
    if (applicationData.signing_mandate === 'single') {
      tickCheckbox('Check Box264');
    } else if (applicationData.signing_mandate === 'either') {
      tickCheckbox('Check Box265');
    } else if (applicationData.signing_mandate === 'joint') {
      tickCheckbox('Check Box266');
    } else if (applicationData.signing_mandate === 'two') {
      tickCheckbox('Check Box267');
    }
    
    // If joint account, add secondary client checkboxes
    if (applicationData.account_type === 'joint') {
      // Secondary Gender
      if (applicationData.secondary_gender === 'male') {
        tickCheckbox('Check Box243');
      } else if (applicationData.secondary_gender === 'female') {
        tickCheckbox('Check Box244');
      }
      
      // Secondary Investor Category
      if (applicationData.secondary_investor_category === 'LI') {
        tickCheckbox('Check Box246');
      } else if (applicationData.secondary_investor_category === 'FI') {
        tickCheckbox('Check Box248');
      } else if (applicationData.secondary_investor_category === 'EI') {
        tickCheckbox('Check Box251');
      }
    }

    // Secondary ID Type 
    if (applicationData.secondary_id_type === 'national') {
      tickCheckbox('Check Box245');
    } else if (applicationData.secondary_id_type === 'ea') {
      tickCheckbox('Check Box247');
    } else if (applicationData.secondary_id_type === 'passport') {
      tickCheckbox('Check Box249');
    } else if (applicationData.secondary_id_type === 'alien') {
      tickCheckbox('Check Box250');
    }
    
    // Get pages for manual item drawing (before flattening)
    const pages = pdfDoc.getPages();
    const page1 = pages[0];
    const page2 = pages.length > 1 ? pages[1] : page1;
    const page3 = pages.length > 2 ? pages[2] : page1;

    form.flatten(); // Flatten the form to prevent images appearing behind fields

    // Handle date fields
    // Format: drawDateInBoxes(page, font, dateStr, startX, y, boxWidth, boxSpacing, fontSize)

    // Primary Date of Birth
    if (applicationData.primary_dob) {
      drawDateInBoxes(page1, helveticaFont, applicationData.primary_dob, 94, 544.5, 11.2, 0, 10);
    }
    
    // Primary Passport Expiry 
    if (applicationData.primary_passport_expiry) {
      drawDateInBoxes(page1, helveticaFont, applicationData.primary_passport_expiry, 405, 593.5, 11.2, 0, 10);
    }
    
    // Secondary Date of Birth (if joint account) 
    if (applicationData.account_type === 'joint' && applicationData.secondary_dob) {
      drawDateInBoxes(page1, helveticaFont, applicationData.secondary_dob, 94, 223, 11.2, 0, 10);
    }
    
    // Secondary Passport Expiry (if joint account) 
    if (applicationData.account_type === 'joint' && applicationData.secondary_passport_expiry) {
      drawDateInBoxes(page1, helveticaFont, applicationData.secondary_passport_expiry, 405, 272.5, 11.2, 0, 10);
    }
    
    // Signature Date 
    if (applicationData.signature_date) {
      drawDateInBoxes(page3, helveticaFont, applicationData.signature_date, 460, 691.5, 11.2, 0, 10);
      if (applicationData.account_type === 'joint') {
        drawDateInBoxes(page3, helveticaFont, applicationData.signature_date, 460, 639, 11.2, 0, 10);
      }
    }


    // =========================
    // SIGNATURES
    // =========================
    // Primary applicant
    if (applicationData.signature_path) {
      try {
        const signaturePath = path.join(__dirname, applicationData.signature_path);
        const signatureImageBytes = await fs.readFile(signaturePath);
        const signatureImage = await pdfDoc.embedPng(signatureImageBytes);
        
        const pages = pdfDoc.getPages();
        const secondlastPage = pages[pages.length - 2];
        const lastPage = pages[pages.length - 1];    

        // Add signature image 
        const signatureScale = 0.2;
        secondlastPage.drawImage(signatureImage, {
          x: 440,
          y: 390,
          width: signatureImage.width * signatureScale,
          height: signatureImage.height * signatureScale,
        });

        lastPage.drawImage(signatureImage, {
          x: 274,
          y: 670,
          width: signatureImage.width * signatureScale,
          height: signatureImage.height * signatureScale,
        });
      } catch (error) {
        console.error('Error embedding signature:', error);
      }
    }

    // Secondary applicant (if joint account)
    if (applicationData.secondary_signature_path) {
      try {
        const secondarySignaturePath = path.join(__dirname, applicationData.secondary_signature_path);
        const secondarySignatureImageBytes = await fs.readFile(secondarySignaturePath);
        const secondarySignatureImage = await pdfDoc.embedPng(secondarySignatureImageBytes);
        
        const pages = pdfDoc.getPages();
        const secondlastPage = pages[pages.length - 2];
        const lastPage = pages[pages.length - 1];
        
        // Add signature image 
        const secondarySignatureScale = 0.2;

        secondlastPage.drawImage(secondarySignatureImage, {
          x: 440,
          y: 350,
          width: secondarySignatureImage.width * secondarySignatureScale,
          height: secondarySignatureImage.height * secondarySignatureScale,
        });

        lastPage.drawImage(secondarySignatureImage, {
          x: 274,
          y: 618,
          width: secondarySignatureImage.width * secondarySignatureScale,
          height: secondarySignatureImage.height * secondarySignatureScale,
        });
      } catch (error) {
        console.error('Error embedding secondary signature:', error);
      }
    }


    // =================================
    // PASSPORT PHOTOS
    // ================================
    // Primary applicant
    if (applicationData.primary_passport_photo_path) {
      try {
        const photoPath = path.join(__dirname, applicationData.primary_passport_photo_path);
        const photoBytes = await fs.readFile(photoPath);
        
        // Determine image type
        let photoImage;
        if (photoPath.toLowerCase().endsWith('.png')) {
          photoImage = await pdfDoc.embedPng(photoBytes);
        } else {
          photoImage = await pdfDoc.embedJpg(photoBytes);
        }
        
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];
        
        // Define bounding box for the image
        const boxLeft = 500;
        const boxBottom = 517;
        const boxRight = 586;
        const boxTop = 633;
        const maxWidth = boxRight - boxLeft;
        const maxHeight = boxTop - boxBottom;

        // Calculate scale to fit image within bounding box
        const widthScale = maxWidth / photoImage.width;
        const heightScale = maxHeight / photoImage.height;
        const scale = Math.min(widthScale, heightScale, 1); // Never upscale

        const photoWidth = photoImage.width * scale;
        const photoHeight = photoImage.height * scale;

        // Center image in box
        const centerX = boxLeft + maxWidth / 2;
        const centerY = boxBottom + maxHeight / 2;

        firstPage.drawImage(photoImage, {
          x: centerX - photoWidth / 2,
          y: centerY - photoHeight / 2,
          width: photoWidth,
          height: photoHeight,
        });
      } catch (error) {
        console.error('Error embedding primary passport photo:', error);
      }
    }

    // Secondary applicant (if joint account)
    if (applicationData.secondary_passport_photo_path) {
      try {
        const photoPath = path.join(__dirname, applicationData.secondary_passport_photo_path);
        const photoBytes = await fs.readFile(photoPath);
        
        let photoImage;
        if (photoPath.toLowerCase().endsWith('.png')) {
          photoImage = await pdfDoc.embedPng(photoBytes);
        } else {
          photoImage = await pdfDoc.embedJpg(photoBytes);
        }
        
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];
        
        const boxLeft = 500;
        const boxBottom = 196;
        const boxRight = 586;
        const boxTop = 311;
        const maxWidth = boxRight - boxLeft;
        const maxHeight = boxTop - boxBottom;

        const widthScale = maxWidth / photoImage.width;
        const heightScale = maxHeight / photoImage.height;
        const scale = Math.min(widthScale, heightScale, 1); 

        const photoWidth = photoImage.width * scale;
        const photoHeight = photoImage.height * scale;

        const centerX = boxLeft + maxWidth / 2;
        const centerY = boxBottom + maxHeight / 2;

        firstPage.drawImage(photoImage, {
          x: centerX - photoWidth / 2,
          y: centerY - photoHeight / 2,
          width: photoWidth,
          height: photoHeight,
        });
      } catch (error) {
        console.error('Error embedding secondary passport photo:', error);
      }
    }

    // Save the filled PDF
    const pdfBytes = await pdfDoc.save();
    await fs.writeFile(outputPath, pdfBytes);
    
    console.log(`PDF filled successfully: ${outputPath}`);
    return outputPath;

  } catch (error) {
    console.error('Error filling PDF:', error);
    throw error;
  }
}


async function fillCorporateForm(applicationData, outputPath) {
  try {
    const templatePath = path.join(__dirname, 'public', 'assets', 'CDS_1_3_CORPORATE_ACCOUNT_OPENING_FORM_1.pdf');
    const existingPdfBytes = await fs.readFile(templatePath);

    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const form = pdfDoc.getForm();
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // ── Helper: set a text field by name ──
    const setField = (fieldName, value) => {
      try {
        const field = form.getTextField(fieldName);
        if (field && value) field.setText(String(value));
      } catch (error) {
        console.log(`setField error for "${fieldName}":`, error.message);
      }
    };

    // ── Helper: tick a checkbox by field name ──
    const tickCheckbox = (fieldName) => {
      try {
        const field = form.getCheckBox(fieldName);
        if (field) field.check();
      } catch (error) {
        console.log(`tickCheckbox: field "${fieldName}" not found or not a checkbox — use drawCheckmark fallback`);
      }
    };


    // ── Company Details ──
    setField('CDA CODE', applicationData.cda_code);
    setField('CDS ACCOUNT NUMBER NEWEXISTING', applicationData.cds_account_number);
    setField('Registered Name', applicationData.registered_name);
    setField('Registration Number', applicationData.registration_number);
    setField('KRA PIN', applicationData.kra_pin);
    setField('Email Address', applicationData.email);
    setField('Telephone Number', applicationData.phone);
    setField('Country of Registration', applicationData.country_of_registration);
    setField('Physical Location PlotBuilding Name', applicationData.physical_plot);
    setField('Physical Location RoadStreet', applicationData.physical_road);
    setField('Physical Location TownCity', applicationData.town_city);
    setField('Postal Code', applicationData.postal_code);
    setField('Postal Address', applicationData.postal_address);
    setField('Source of Investment Funds', applicationData.fund_source);

    // ── Payment Details ──
    setField('Bank Name', applicationData.bank_name);
    setField('Account Number', applicationData.account_number);
    setField('Account Name', applicationData.account_name);

    if (applicationData.payment_method === 'domestic') {
      setField('Branch Code Domestic Banks', applicationData.branch_code);
    } else if (applicationData.payment_method === 'international') {
      setField('Bank Swift Code International Banks', applicationData.swift_code);
      setField('Indicate any other currency', applicationData.other_currency);
    }

    // ── Primary Signatory ──
    setField('Surname', applicationData.sig1_surname);
    setField('Other Names', applicationData.sig1_other_names);
    setField('Text299', applicationData.sig1_designation);
    setField('IDPassport Number', applicationData.sig1_id_number);
    setField('NationalityCitizenship', applicationData.sig1_nationality);
    setField('Country of Residence', applicationData.sig1_country_of_residence);
    setField('KRA PIN_2', applicationData.sig1_kra_pin);
    setField('Country Code', applicationData.sig1_country_code);
    setField('Telephone Number_2', applicationData.sig1_phone);
    setField('Email Address_2', applicationData.sig1_email);
    setField('Physical Residential Address CountyState EstateCourt RoadStreet HouseFlat Number', applicationData.sig1_address);
    setField('Postal Address_2', applicationData.sig1_postal_address);
    setField('Postal Code_2', applicationData.sig1_postal_code);
    setField('CityTown', applicationData.sig1_town_city);

    // ── Secondary Signatory (if present) ──
    if (applicationData.sig2_surname) {
      setField('Surname_2', applicationData.sig2_surname);
      setField('Other Names_2', applicationData.sig2_other_names);
      setField('Text298', applicationData.sig2_designation);
      setField('IDPassport Number_2', applicationData.sig2_id_number);
      setField('NationalityCitizenship_2', applicationData.sig2_nationality);
      setField('Country of Residence_2', applicationData.sig2_country_of_residence);
      setField('KRA PIN_3', applicationData.sig2_kra_pin);
      setField('Country Code_2', applicationData.sig2_country_code);
      setField('Telephone Number_3', applicationData.sig2_phone);
      setField('Email Address_3', applicationData.sig2_email);
      setField('ARE YOU OR ANY OTHER PERSON CONNECTED WITH THE APPLICATION CLASSIFIED AS A POLITICALLY', applicationData.sig2_address);
      setField('Postal Address_3', applicationData.sig2_postal_address);
      setField('Postal Code_3', applicationData.sig2_postal_code);
      setField('CityTown_2', applicationData.sig2_town_city);
    }

    // ── Declaration signer names ──
    setField('Text295', applicationData.signer_names);
    setField('Text297', applicationData.secondary_signer_names || '');

    // ── PEP details ──
    if (applicationData.is_pep === 'Yes') {
      setField('If yes specify the name of the person and the relationship', applicationData.pep_details);
    }


    // =================================
    // CHECKBOX FIELDS 
    // =================================

    // ── Investor Category ──
    if (applicationData.investor_category === 'LC') {
      tickCheckbox('Check Box317');
    } else if (applicationData.investor_category === 'FC') {
      tickCheckbox('Check Box319');
    } else if (applicationData.investor_category === 'EC') {
      tickCheckbox('Check Box320');
    }

    // ── Payment Method ──
    if (applicationData.payment_method === 'domestic') {
      tickCheckbox('Check Box324');
    } else if (applicationData.payment_method === 'international') {
      tickCheckbox('Check Box325');
    }

    // ── International bank currencies ──
    if (applicationData.currency) {
      const selectedCurrencies = applicationData.currency.split(',').map(c => c.trim().toUpperCase());
      const currencyCheckboxNames = {
        'EUR':    'Check Box332',
        'USD':    'Check Box331',
        'GBP':    'Check Box330',
        'KES':    'Check Box329',
        'USH':    'Check Box328',
        'TZSH':   'Check Box327',
        'RFRANC': 'Check Box326'
      };
      selectedCurrencies.forEach(curr => {
        if (currencyCheckboxNames[curr]) {
          tickCheckbox(currencyCheckboxNames[curr]);
        }
      });
    }

    // ── Tax Exempt ──
    if (applicationData.is_tax_exempt === 'Yes') {
      tickCheckbox('Check Box321');
    } else {
      tickCheckbox('Check Box323');
    }

    // ── Primary signatory ID type ──
    const sig1IdTypeCheckboxes = {
      'national': 'Check Box333',
      'ea':       'Check Box334',
      'passport': 'Check Box335',
      'alien':    'Check Box336'
    };
    if (sig1IdTypeCheckboxes[applicationData.sig1_id_type]) {
      tickCheckbox(sig1IdTypeCheckboxes[applicationData.sig1_id_type]);
    }

    // ── Secondary signatory ID type ──
    if (applicationData.sig2_id_type) {
      const sig2IdTypeCheckboxes = {
        'national': 'Check Box337',
        'ea':       'Check Box338',
        'passport': 'Check Box339',
        'alien':    'Check Box340'
      };
      if (sig2IdTypeCheckboxes[applicationData.sig2_id_type]) {
        tickCheckbox(sig2IdTypeCheckboxes[applicationData.sig2_id_type]);
      }
    }

    // ── PEP status ──
    if (applicationData.is_pep === 'Yes') {
      tickCheckbox('Check Box341');
    } else {
      tickCheckbox('Check Box342');
    }

    // =================================
    // NON-SETTABLE FIELDS 
    // =================================


    const pages = pdfDoc.getPages();
    const page1 = pages[0];
    const page2 = pages.length > 1 ? pages[1] : page1;
    const page3 = pages.length > 2 ? pages[2] : page1;

    form.flatten();

    // ── Date fields ──
    if (applicationData.date_of_registration) {
      drawDateInBoxes(page1, helveticaFont, applicationData.date_of_registration, 495, 583); 
    }
    if (applicationData.sig1_dob) {
      drawDateInBoxes(page1, helveticaFont, applicationData.sig1_dob, 90, 138); 
    }
    if (applicationData.sig1_passport_expiry) {
      drawDateInBoxes(page1, helveticaFont, applicationData.sig1_passport_expiry, 401, 170); 
    }
    if (applicationData.sig2_dob) {
      drawDateInBoxes(page2, helveticaFont, applicationData.sig2_dob, 90, 627); 
    }
    if (applicationData.sig2_passport_expiry) {
      drawDateInBoxes(page2, helveticaFont, applicationData.sig2_passport_expiry, 401, 659); 
    }
    if (applicationData.signature_date) {
      drawDateInBoxes(page2, helveticaFont, applicationData.signature_date, 495, 158); 
      if (applicationData.sig2_surname) {
        drawDateInBoxes(page2, helveticaFont, applicationData.signature_date, 495, 109); 
      }
    }

    // ── Signatures ──
    if (applicationData.signature_path) {
      try {
        const sigBytes = await fs.readFile(path.join(__dirname, applicationData.signature_path));
        const sigImage = await pdfDoc.embedPng(sigBytes);
        const sigScale = 0.2;
        page2.drawImage(sigImage, {
          x: 271, y: 129, 
          width: sigImage.width * sigScale,
          height: sigImage.height * sigScale,
        });
      } catch (error) {
        console.error('Error embedding primary signature:', error);
      }
    }

    if (applicationData.secondary_signature_path) {
      try {
        const sig2Bytes = await fs.readFile(path.join(__dirname, applicationData.secondary_signature_path));
        const sig2Image = await pdfDoc.embedPng(sig2Bytes);
        const sig2Scale = 0.2;
        page2.drawImage(sig2Image, {
          x: 271, y: 83, 
          width: sig2Image.width * sig2Scale,
          height: sig2Image.height * sig2Scale,
        });
      } catch (error) {
        console.error('Error embedding secondary signature:', error);
      }
    }

    // ── Signatory passport photos ──
    const photoFields = [
      { pathKey: 'sig1_passport_photo_path', page: page1, boxLeft: 499, boxBottom: 120, boxRight: 587, boxTop: 230 },  
      { pathKey: 'sig2_passport_photo_path', page: page2, boxLeft: 499, boxBottom: 610, boxRight: 587, boxTop: 719 }, 
    ];

    for (const { pathKey, page: targetPage, boxLeft, boxBottom, boxRight, boxTop } of photoFields) {
      if (applicationData[pathKey]) {
        try {
          const photoPath = path.join(__dirname, applicationData[pathKey]);
          const photoBytes = await fs.readFile(photoPath);
          const photoImage = photoPath.toLowerCase().endsWith('.png')
            ? await pdfDoc.embedPng(photoBytes)
            : await pdfDoc.embedJpg(photoBytes);

          const maxWidth  = boxRight - boxLeft;
          const maxHeight = boxTop - boxBottom;
          const scale     = Math.min(maxWidth / photoImage.width, maxHeight / photoImage.height, 1);
          const photoW    = photoImage.width  * scale;
          const photoH    = photoImage.height * scale;

          targetPage.drawImage(photoImage, {
            x: boxLeft + (maxWidth - photoW) / 2,
            y: boxBottom + (maxHeight - photoH) / 2,
            width:  photoW,
            height: photoH,
          });
        } catch (error) {
          console.error(`Error embedding photo (${pathKey}):`, error);
        }
      }
    }

    const pdfBytes = await pdfDoc.save();
    await fs.writeFile(outputPath, pdfBytes);
    console.log(`Corporate PDF filled successfully: ${outputPath}`);
    return outputPath;

  } catch (error) {
    console.error('Error filling corporate PDF:', error);
    throw error;
  }
}

module.exports = {
  fillCDSCForm,
  fillCorporateForm
};
