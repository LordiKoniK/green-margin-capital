const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');

/**
 * Fill the CDSC PDF form with application data
 * @param {Object} applicationData - The application data from database
 * @param {string} outputPath - Where to save the filled PDF
 * @returns {Promise<string>} - Path to the generated PDF
 * 
 */

/**
 * Draw a checkmark at specific coordinates on a PDF page
 * @param {PDFPage} page - The PDF page to draw on
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} size - Size of the checkmark (default: 10)
 */

// For checkboxes (not named in the code of the PDF document)
function drawCheckmark(page, x, y, size = 10) {
  // Draw a tick (checkmark)
  // Start at bottom left, go to middle, then up to top right
  const start = { x: x - size / 2, y: y };
  const mid = { x: x - size / 8, y: y - size / 3 };
  const end = { x: x + size / 2, y: y + size / 2 };
  page.drawLine({
    start: start,
    end: mid,
    thickness: 2,
    color: rgb(0, 0, 0),
  });
  page.drawLine({
    start: mid,
    end: end,
    thickness: 2,
    color: rgb(0, 0, 0),
  });
}

/**
 * Draw date in individual boxes (DD-MM-YYYY format)
 * @param {PDFPage} page - The PDF page to draw on
 * @param {PDFFont} font - The font to use
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @param {number} startX - Starting X coordinate (left edge of first box)
 * @param {number} y - Y coordinate (baseline of text)
 * @param {number} boxWidth - Width of each individual box (default: 12)
 * @param {number} boxSpacing - Spacing between boxes (default: 2)
 * @param {number} fontSize - Font size (default: 10)
 */

function drawDateInBoxes(page, font, dateStr, startX, y, boxWidth = 12, boxSpacing = 2, fontSize = 10) {
  if (!dateStr) return;
  
  // Convert YYYY-MM-DD to DD-MM-YYYY
  let formattedDate;
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      // YYYY-MM-DD to DD-MM-YYYY
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
    // Read the template PDF
    const templatePath = path.join(__dirname, 'public', 'assets', 'CDS_1_1_INDIVIDUAL-JOINT_ACCOUNT_OPENING_FORM_1.pdf');
    const existingPdfBytes = await fs.readFile(templatePath);
    
    // Load the PDF
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const form = pdfDoc.getForm();

    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica); // Embed Helvetica font for drawing dates

    // Helper function to safely set field value
    const setField = (fieldName, value) => {
      try {
        const field = form.getTextField(fieldName);
        if (field && value) {
          field.setText(String(value));
        }
      } catch (error) {
        console.log(`Field ${fieldName} not found or cannot be set`);
      }
    };

    const setCheckbox = (fieldName, isChecked) => {
      try {
        const field = form.getCheckBox(fieldName);
        if (field) {
          if (isChecked) {
            field.check();
          } else {
            field.uncheck();
          }
        }
      } catch (error) {
        console.log(`Checkbox ${fieldName} not found`);
      }
    };

    const setRadio = (fieldName, value) => {
      try {
        const field = form.getRadioGroup(fieldName);
        if (field && value) {
          field.select(String(value));
        }
      } catch (error) {
        console.log(`Radio ${fieldName} not found`);
      }
    };

    // Fill Account Type
    setRadio('AccountType', applicationData.account_type);
    setField('CDA Code', applicationData.cda_code);
    setField('CDS ACCOUNT NUMBER NEWEXISTING', applicationData.cds_account_number);

    // Fill Primary Client Details
    setField('Surname', applicationData.primary_surname);
    setField('Other Names', applicationData.primary_other_names);
    // setField('Date223_af_date', applicationData.primary_dob);
    setRadio('PrimaryGender', applicationData.primary_gender);
    setRadio('PrimaryInvestorCategory', applicationData.primary_investor_category);
    setRadio('PrimaryIDType', applicationData.primary_id_type);
    setField('IDPassport Number', applicationData.primary_id_number);
    // setField('Date223_af_date', applicationData.primary_passport_expiry);
    setField('NationalityCitizenship', applicationData.primary_nationality);
    setField('Country of Residence', applicationData.primary_country_residence);
    setField('KRA PIN', applicationData.primary_kra_pin);

    // Fill Primary Contact Information
    setField('Country Code', applicationData.primary_country_code);
    setField('Telephone Number', applicationData.primary_phone);
    setField('Email Address', applicationData.primary_email);
    setField('CityTown', applicationData.primary_town_city);
    setField('Physical Location TownCity', applicationData.primary_physical_location);
    setField('Postal Code', applicationData.primary_postal_code);
    setField('Postal Address', applicationData.primary_postal_address);

    // Fill Primary Employment/Business
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

    // Fill Secondary Client Details (if joint account)
    if (applicationData.account_type === 'joint') {
      setField('Surname_2', applicationData.secondary_surname);
      setField('Other Names_2', applicationData.secondary_other_names);
      // setField('Date220_af_date', applicationData.secondary_dob);
      setRadio('SecondaryGender', applicationData.secondary_gender);
      setRadio('SecondaryInvestorCategory', applicationData.secondary_investor_category);
      setRadio('SecondaryIDType', applicationData.secondary_id_type);
      setField('IDPassport Number_2', applicationData.secondary_id_number);
      // setField('Date221_af_date', applicationData.secondary_passport_expiry);
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

    // Fill PEP Status
    setRadio('IsPEP', applicationData.is_pep ? 'yes' : 'no');
    if (applicationData.is_pep) {
      setField('If yes specify the name of the person and the relationship', applicationData.pep_details);
    }

    // Fill Payment Details
    setRadio('PaymentMethod', applicationData.payment_method);
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

    // Fill Tax Status
    setRadio('TaxExempt', applicationData.is_tax_exempt ? 'yes' : 'no');

    // Fill Declaration
    setField('SigningMandate', applicationData.signing_mandate);
    setField('Name', applicationData.signer_names);
    // setField('Date218_af_date', applicationData.signature_date);
    // setField('Date219_af_date', applicationData.signature_date);

    setField('Name_3', applicationData.signer_names);



    // Get pages for drawing checkmarks (before flattening)
    const pages = pdfDoc.getPages();
    form.flatten(); // Flatten the form so images on top of field spaces
    const page1 = pages[0];
    const page2 = pages.length > 1 ? pages[1] : page1;
    const page3 = pages.length > 2 ? pages[2] : page1;

    form.flatten(); // Flatten the form so images on top of field spaces

    // DRAW CHECKMARKS FOR UNNAMED CHECKBOX FIELDS
 
    console.log('Drawing checkmarks for checkboxes...');
    
    // Account Type checkboxes 
    if (applicationData.account_type === 'individual') {
      drawCheckmark(page1, 212, 697, 8); // Example: Individual checkbox
    } else if (applicationData.account_type === 'joint') {
      drawCheckmark(page1, 338, 697, 8); // Example: Joint checkbox
    }
    
    // Primary Gender 
    if (applicationData.primary_gender === 'male') {
      drawCheckmark(page1, 114, 630, 8); // Example: Male
    } else if (applicationData.primary_gender === 'female') {
      drawCheckmark(page1, 174, 630, 8); // Example: Female
    }
    
    // Investor Category 
    if (applicationData.primary_investor_category === 'LI') {
      drawCheckmark(page1, 258, 564, 8);
    } else if (applicationData.primary_investor_category === 'FI') {
      drawCheckmark(page1, 367, 564, 8);
    } else if (applicationData.primary_investor_category === 'EI') {
      drawCheckmark(page1, 488, 564, 8);
    }
    
    // Primary ID Type 
    const primaryIdTypeCoords = {
      'national': { x: 203, y: 580 },
      'ea': { x: 298, y: 580 },
      'passport': { x: 393, y: 580 },
      'alien': { x: 488, y: 580 }
    };
    if (primaryIdTypeCoords[applicationData.primary_id_type]) {
      const coords = primaryIdTypeCoords[applicationData.primary_id_type];
      drawCheckmark(page1, coords.x, coords.y, 8);
    }
    
    // PEP Status 
    if (applicationData.is_pep === 'Yes' || applicationData.is_pep === true) {
      drawCheckmark(page2, 51, 307, 8); // Yes
    } else {
      drawCheckmark(page2, 116, 307, 8); // No
    }
    
    // Payment Method 
    const paymentCoords = {
      'domestic': { x: 254 , y: 655 },
      'international': { x: 403, y: 655 },
      'mobile': { x: 578, y: 655 }
    };
    if (paymentCoords[applicationData.payment_method]) {
      const coords = paymentCoords[applicationData.payment_method];
      drawCheckmark(page2, coords.x, coords.y, 8);
    }

    const currencyCoords = {
      'EUR': { x: 218, y: 563 },
      'USD': { x: 275, y: 563 },
      'GBP': { x: 335, y: 563 },
      'KES': { x: 394, y: 563 },
      'USH': { x: 454, y: 563 },
      'TZSH': { x: 514, y: 563 },
      'RFRANC': { x: 578, y: 563 }
    };

    if (applicationData.currency) {
      // Support multiple currencies separated by comma or comma+space
      const selectedCurrencies = applicationData.currency.split(',').map(c => c.trim().toUpperCase());
      selectedCurrencies.forEach(curr => {
        if (currencyCoords[curr]) {
          const coords = currencyCoords[curr];
          drawCheckmark(page2, coords.x, coords.y, 8);
        }
      });
    }
    
    // Tax Exempt Status 
    if (applicationData.is_tax_exempt === 'Yes' || applicationData.is_tax_exempt === true) {
      drawCheckmark(page2, 123, 712, 8); // Yes
    } else {
      drawCheckmark(page2, 194, 712, 8); // No
    }
    
    // Signing Mandate 
    const mandateCoords = {
      'single': { x: 63, y: 444 },
      'either': { x: 226, y: 444 },
      'joint': { x: 397, y: 444 },
      'two': { x: 574, y: 444 }
    };
    if (mandateCoords[applicationData.signing_mandate]) {
      const coords = mandateCoords[applicationData.signing_mandate];
      drawCheckmark(page2, coords.x, coords.y, 8);
    }
    
    // If joint account, add secondary client checkboxes
    if (applicationData.account_type === 'joint') {
      // Secondary Gender
      if (applicationData.secondary_gender === 'male') {
        drawCheckmark(page1, 114, 309, 8);
      } else if (applicationData.secondary_gender === 'female') {
        drawCheckmark(page1, 174, 309, 8);
      }
      
      // Secondary Investor Category
      if (applicationData.secondary_investor_category === 'LI') {
        drawCheckmark(page1, 258, 243, 8);
      } else if (applicationData.secondary_investor_category === 'FI') {
        drawCheckmark(page1, 367, 243, 8);
      } else if (applicationData.secondary_investor_category === 'EI') {
        drawCheckmark(page1, 488, 243, 8);
      }
    }

    // Secondary ID Type 
    const secondaryIdTypeCoords = {
      'national': { x: 203, y: 259 },
      'ea': { x: 298, y: 259 },
      'passport': { x: 393, y: 259 },
      'alien': { x: 488, y: 259 }
    };
    if (secondaryIdTypeCoords[applicationData.secondary_id_type]) {
      const coords = secondaryIdTypeCoords[applicationData.secondary_id_type];
      drawCheckmark(page1, coords.x, coords.y, 8);
    }

    // Handle box-by-box date fields
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


    // Embed signature image if available
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

    // Embed passport photos if available
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
        
        // Add passport photo (adjust coordinates for the form)
        // Define bounding box for the image
        const boxLeft = 500;
        const boxBottom = 517;
        const boxRight = 586;
        const boxTop = 633;
        const maxWidth = boxRight - boxLeft; // 87
        const maxHeight = boxTop - boxBottom; // 116

        // Calculate scale to fit image within bounding box
        const widthScale = maxWidth / photoImage.width;
        const heightScale = maxHeight / photoImage.height;
        const scale = Math.min(widthScale, heightScale, 1); // Never upscale

        const photoWidth = photoImage.width * scale;
        const photoHeight = photoImage.height * scale;

        // Center the image in the box
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

    if (applicationData.secondary_passport_photo_path) {
      try {
        const photoPath = path.join(__dirname, applicationData.secondary_passport_photo_path);
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
        
        // Add passport photo (adjust coordinates for the form)
        // Define bounding box for the image
        const boxLeft = 500;
        const boxBottom = 196;
        const boxRight = 586;
        const boxTop = 311;
        const maxWidth = boxRight - boxLeft; // 87
        const maxHeight = boxTop - boxBottom; // 116

        // Calculate scale to fit image within bounding box
        const widthScale = maxWidth / photoImage.width;
        const heightScale = maxHeight / photoImage.height;
        const scale = Math.min(widthScale, heightScale, 1); // Never upscale

        const photoWidth = photoImage.width * scale;
        const photoHeight = photoImage.height * scale;

        // Center the image in the box
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
    
    console.log('Town/City field value:', applicationData.primary_physical_location);
    console.log(`PDF filled successfully: ${outputPath}`);
    return outputPath;

  } catch (error) {
    console.error('Error filling PDF:', error);
    throw error;
  }
}

module.exports = {
  fillCDSCForm
};
