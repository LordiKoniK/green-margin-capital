const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');

/**
 * Fill the CDSC PDF form with application data
 * @param {Object} applicationData - The application data from database
 * @param {string} outputPath - Where to save the filled PDF
 * @returns {Promise<string>} - Path to the generated PDF
 */
async function fillCDSCForm(applicationData, outputPath) {
  try {
    // Read the template PDF
    const templatePath = path.join(__dirname, 'public', 'assets', 'CDS_1_1_INDIVIDUAL-JOINT_ACCOUNT_OPENING_FORM_1.pdf');
    const existingPdfBytes = await fs.readFile(templatePath);
    
    // Load the PDF
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const form = pdfDoc.getForm();

    console.log('Form fields found:', form.getFields().map(f => f.getName()));
    console.log('Filling PDF with application data:', applicationData);
    
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
    setField('PrimaryDOB', applicationData.primary_dob);
    setRadio('PrimaryGender', applicationData.primary_gender);
    setRadio('PrimaryInvestorCategory', applicationData.primary_investor_category);
    setRadio('PrimaryIDType', applicationData.primary_id_type);
    setField('IDPassport Number', applicationData.primary_id_number);
    setField('PrimaryPassportExpiry', applicationData.primary_passport_expiry);
    setField('NationalityCitizenship', applicationData.primary_nationality);
    setField('Country of Residence', applicationData.primary_country_residence);
    setField('KRA PIN', applicationData.primary_kra_pin);

    // Fill Primary Contact Information
    setField('Country Code', applicationData.primary_country_code);
    setField('Telephone Number', applicationData.primary_phone);
    setField('Email Address', applicationData.primary_email);
    setField('Physical Location TownCity', applicationData.primary_physical_location);
    setField('Postal Code', applicationData.primary_postal_code);
    setField('Postal Address', applicationData.primary_postal_address);

    // Fill Primary Employment/Business
    setField('Source of Investment Funds', applicationData.primary_fund_source);
    if (applicationData.primary_fund_source === 'employment') {
      setField('Name of Employer', applicationData.primary_employer_name);
      setField('Employer Postal Address', applicationData.primary_employer_postal);
      setField('Employer Telephone Number', applicationData.primary_employer_phone);
      setField('Employer Email Address', applicationData.primary_employer_email);
    } else if (applicationData.primary_fund_source === 'business') {
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
      setField('SecondaryDOB', applicationData.secondary_dob);
      setRadio('SecondaryGender', applicationData.secondary_gender);
      setRadio('SecondaryInvestorCategory', applicationData.secondary_investor_category);
      setRadio('SecondaryIDType', applicationData.secondary_id_type);
      setField('IDPassport Number_2', applicationData.secondary_id_number);
      setField('SecondaryPassportExpiry', applicationData.secondary_passport_expiry);
      setField('NationalityCitizenship_2', applicationData.secondary_nationality);
      setField('Country of Residence_2', applicationData.secondary_country_residence);
      setField('KRA PIN_2', applicationData.secondary_kra_pin);

      // Secondary Contact
      setField('Country Code_2', applicationData.secondary_country_code);
      setField('Telephone Number_3', applicationData.secondary_phone);
      setField('Email Address_3', applicationData.secondary_email);
      setField('Physical Location TownCity_2', applicationData.secondary_physical_location);
      setField('Postal Code_2', applicationData.secondary_postal_code);
      setField('Postal Address_3', applicationData.secondary_postal_address);

      // Secondary Employment/Business
      if (applicationData.secondary_fund_source === 'employment') {
        setField('Name of Employer_2', applicationData.secondary_employer_name);
        setField('Employer Postal Address_2', applicationData.secondary_employer_postal);
        setField('Employer Telephone Number_2', applicationData.secondary_employer_phone);
        setField('Employer Email Address_2', applicationData.secondary_employer_email);
      } else if (applicationData.secondary_fund_source === 'business') {
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
        setField('Currency', applicationData.currency);
      }
    } else {
      setField('Phone Number', applicationData.mobile_money_phone);
    }

    // Fill Tax Status
    setRadio('TaxExempt', applicationData.is_tax_exempt ? 'yes' : 'no');

    // Fill Declaration
    setField('SigningMandate', applicationData.signing_mandate);
    setField('Name', applicationData.signer_names);
    setField('SignatureDate', applicationData.signature_date);


    form.flatten(); // Flatten the form so images on top of field spaces

    // Embed signature image if available
    if (applicationData.signature_path) {
      try {
        const signaturePath = path.join(__dirname, applicationData.signature_path);
        const signatureImageBytes = await fs.readFile(signaturePath);
        const signatureImage = await pdfDoc.embedPng(signatureImageBytes);
        
        // Get the first page to add signature
        const pages = pdfDoc.getPages();
        const lastPage = pages[pages.length - 2];
        
        // Add signature image (adjust coordinates as needed)
        const signatureScale = 0.2;
        lastPage.drawImage(signatureImage, {
          x: 440,
          y: 385,
          width: signatureImage.width * signatureScale,
          height: signatureImage.height * signatureScale,
        });
      } catch (error) {
        console.error('Error embedding signature:', error);
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
        const photoScale = 0.15;
        firstPage.drawImage(photoImage, {
          x: 499, // Adjust based on form layout
          y: 510,
          width: photoImage.width * photoScale,
          height: photoImage.height * photoScale,
        });
      } catch (error) {
        console.error('Error embedding primary passport photo:', error);
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




/* -----------------------------------------

 BACKUP IN CASE TEMPLATE AUTOFILL DOESNT WORK

  ---------------------------------------- */





async function generateCDSCFormPDF(applicationData, outputPath) {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontSize = 10;
    const lineHeight = 15;

    let yPosition = height - 50;

    // Helper to add text
    const addText = (text, x = 50, bold = false) => {
      page.drawText(text, {
        x,
        y: yPosition,
        size: fontSize,
        font: bold ? boldFont : font,
        color: rgb(0, 0, 0),
      });
      yPosition -= lineHeight;
    };

    // Title
    addText('CDSC ACCOUNT OPENING FORM', 50, true);
    addText(`Application ID: ${applicationData.id}`, 50, true);
    addText(`Submission Date: ${new Date(applicationData.submission_date).toLocaleDateString()}`, 50);
    yPosition -= 10;

    // Account Type
    addText('ACCOUNT TYPE', 50, true);
    addText(`Type: ${applicationData.account_type.toUpperCase()}`);
    if (applicationData.cda_code) addText(`CDA Code: ${applicationData.cda_code}`);
    if (applicationData.cds_account_number) addText(`CDS Account: ${applicationData.cds_account_number}`);
    yPosition -= 10;

    // Primary Client Details
    addText('PRIMARY CLIENT DETAILS', 50, true);
    addText(`Name: ${applicationData.primary_surname}, ${applicationData.primary_other_names}`);
    addText(`Date of Birth: ${applicationData.primary_dob}`);
    addText(`Gender: ${applicationData.primary_gender}`);
    addText(`Investor Category: ${applicationData.primary_investor_category}`);
    addText(`ID Type: ${applicationData.primary_id_type} | Number: ${applicationData.primary_id_number}`);
    addText(`Nationality: ${applicationData.primary_nationality} | Residence: ${applicationData.primary_country_residence}`);
    addText(`KRA PIN: ${applicationData.primary_kra_pin}`);
    yPosition -= 10;

    // Contact Information
    addText('CONTACT INFORMATION', 50, true);
    addText(`Phone: ${applicationData.primary_country_code} ${applicationData.primary_phone}`);
    addText(`Email: ${applicationData.primary_email}`);
    addText(`Location: ${applicationData.primary_physical_location}`);
    if (applicationData.primary_postal_address) {
      addText(`Postal: ${applicationData.primary_postal_address}${applicationData.primary_postal_code ? ' - ' + applicationData.primary_postal_code : ''}`);
    }
    yPosition -= 10;

    // Employment/Business
    addText('SOURCE OF FUNDS', 50, true);
    addText(`Source: ${applicationData.primary_fund_source.toUpperCase()}`);
    if (applicationData.primary_fund_source === 'employment') {
      if (applicationData.primary_employer_name) addText(`Employer: ${applicationData.primary_employer_name}`);
      if (applicationData.primary_employer_phone) addText(`Employer Phone: ${applicationData.primary_employer_phone}`);
    } else {
      if (applicationData.primary_business_name) addText(`Business: ${applicationData.primary_business_name}`);
      if (applicationData.primary_business_reg_number) addText(`Reg Number: ${applicationData.primary_business_reg_number}`);
    }
    yPosition -= 10;

    // Joint account details
    if (applicationData.account_type === 'joint' && applicationData.secondary_surname) {
      // Add new page if needed
      if (yPosition < 150) {
        const newPage = pdfDoc.addPage([595.28, 841.89]);
        yPosition = height - 50;
      }

      addText('SECONDARY CLIENT DETAILS', 50, true);
      addText(`Name: ${applicationData.secondary_surname}, ${applicationData.secondary_other_names}`);
      addText(`Date of Birth: ${applicationData.secondary_dob}`);
      addText(`Phone: ${applicationData.secondary_country_code} ${applicationData.secondary_phone}`);
      addText(`Email: ${applicationData.secondary_email}`);
      yPosition -= 10;
    }

    // Payment Details
    addText('PAYMENT DETAILS', 50, true);
    addText(`Method: ${applicationData.payment_method.toUpperCase()}`);
    if (applicationData.payment_method !== 'mobile') {
      addText(`Bank: ${applicationData.bank_name}`);
      addText(`Account: ${applicationData.account_number} | ${applicationData.account_name}`);
      if (applicationData.branch_code) addText(`Branch Code: ${applicationData.branch_code}`);
      if (applicationData.swift_code) addText(`SWIFT: ${applicationData.swift_code}`);
    } else {
      addText(`Mobile Money: ${applicationData.mobile_money_phone}`);
    }
    yPosition -= 10;

    // PEP Status
    addText('PEP STATUS', 50, true);
    addText(`Is PEP: ${applicationData.is_pep ? 'YES' : 'NO'}`);
    if (applicationData.is_pep && applicationData.pep_details) {
      addText(`Details: ${applicationData.pep_details}`);
    }
    yPosition -= 10;

    // Tax Status
    addText('TAX STATUS', 50, true);
    addText(`Tax Exempt: ${applicationData.is_tax_exempt ? 'YES' : 'NO'}`);
    yPosition -= 10;

    // Declaration
    addText('DECLARATION', 50, true);
    addText(`Signing Mandate: ${applicationData.signing_mandate}`);
    addText(`Signatories: ${applicationData.signer_names}`);
    addText(`Date: ${applicationData.signature_date}`);

    // Save the PDF
    const pdfBytes = await pdfDoc.save();
    await fs.writeFile(outputPath, pdfBytes);
    
    console.log(`Custom PDF generated successfully: ${outputPath}`);
    return outputPath;

  } catch (error) {
    console.error('Error generating custom PDF:', error);
    throw error;
  }
}

module.exports = {
  fillCDSCForm,
  generateCDSCFormPDF
};
