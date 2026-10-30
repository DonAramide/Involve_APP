"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultSettings = defaultSettings;
exports.validateSettings = validateSettings;
exports.assertApprovedSignature = assertApprovedSignature;
exports.httpsLogo = httpsLogo;
exports.printedStudent = printedStudent;
exports.printedStaff = printedStaff;
exports.printedAdmin = printedAdmin;
exports.rejectPredictableToken = rejectPredictableToken;
exports.isTemplateKey = isTemplateKey;
const school_card_token_1 = require("./school-card.token");
const school_card_errors_1 = require("./school-card.errors");
const school_card_types_1 = require("./school-card.types");
function defaultSettings(tenantId, updatedBy) {
    return {
        tenantId,
        studentTemplate: 'classic_school',
        staffTemplate: 'classic_school',
        adminTemplate: 'classic_school',
        paperSize: 'A4',
        cardWidthMm: 85.6,
        cardHeightMm: 53.98,
        printOrientation: 'portrait',
        logoPlacement: 'left',
        accentColor: '#1F4B99',
        showAddress: true,
        showClassOrDepartment: true,
        showStatus: true,
        showIssueDate: true,
        showExpiry: false,
        disclaimer: school_card_types_1.DEFAULT_DISCLAIMER,
        signatureImageUrl: null,
        signatoryName: null,
        signatoryDesignation: null,
        lostFoundPhone: null,
        lostFoundEmail: null,
        notifyStudentArrival: false,
        notifyStudentDeparture: false,
        notifyStaffArrival: false,
        notifyStaffDeparture: false,
        trackAdminEntry: false,
        duplicateScanWindowSeconds: 45,
        updatedBy,
    };
}
function validateSettings(row, approvedSignatureUrls) {
    for (const key of [row.studentTemplate, row.staffTemplate, row.adminTemplate]) {
        if (!school_card_types_1.TEMPLATE_KEYS.includes(key)) {
            throw new school_card_errors_1.SchoolCardError('Choose one of the six ID card templates.', 400, 'INVALID_TEMPLATE');
        }
    }
    if (!['A4', 'Letter', 'CR80'].includes(row.paperSize)) {
        throw new school_card_errors_1.SchoolCardError('Paper size must be A4, Letter, or CR80.', 400, 'INVALID_SETTINGS');
    }
    if (!(row.cardWidthMm >= 50 && row.cardWidthMm <= 120 && row.cardHeightMm >= 30 && row.cardHeightMm <= 90)) {
        throw new school_card_errors_1.SchoolCardError('Card size is outside the supported range.', 400, 'INVALID_SETTINGS');
    }
    if (!['portrait', 'landscape'].includes(row.printOrientation)) {
        throw new school_card_errors_1.SchoolCardError('Print orientation must be portrait or landscape.', 400, 'INVALID_SETTINGS');
    }
    if (!['left', 'center', 'right'].includes(row.logoPlacement)) {
        throw new school_card_errors_1.SchoolCardError('Logo placement must be left, center, or right.', 400, 'INVALID_SETTINGS');
    }
    if (!/^#[0-9A-Fa-f]{6}$/.test(row.accentColor)) {
        throw new school_card_errors_1.SchoolCardError('Accent color must be a six-digit hex color.', 400, 'INVALID_SETTINGS');
    }
    if (row.disclaimer.trim().length < 40) {
        throw new school_card_errors_1.SchoolCardError('The disclaimer must be at least 40 characters.', 400, 'INVALID_SETTINGS');
    }
    if (row.duplicateScanWindowSeconds < 5 || row.duplicateScanWindowSeconds > 300) {
        throw new school_card_errors_1.SchoolCardError('The duplicate scan window must be between 5 and 300 seconds.', 400, 'INVALID_SETTINGS');
    }
    const signatureParts = [row.signatureImageUrl, row.signatoryName, row.signatoryDesignation];
    const present = signatureParts.filter((part) => part != null && String(part).trim() !== '').length;
    if (present === 0) {
        row.signatureImageUrl = null;
        row.signatoryName = null;
        row.signatoryDesignation = null;
    }
    else if (present !== 3) {
        throw new school_card_errors_1.SchoolCardError('A signature needs an approved image, a name, and a designation.', 400, 'INVALID_SIGNATURE');
    }
    else {
        assertApprovedSignature(row.signatureImageUrl || '', approvedSignatureUrls);
        if (row.signatoryName.trim().length < 2 || row.signatoryDesignation.trim().length < 2) {
            throw new school_card_errors_1.SchoolCardError('A signature needs an approved image, a name, and a designation.', 400, 'INVALID_SIGNATURE');
        }
    }
    if (row.lostFoundEmail) {
        const email = row.lostFoundEmail;
        if (email.length > 254 || email !== email.trim() || !email.includes('@') || /\s/.test(email) || email.indexOf('@') < 2) {
            throw new school_card_errors_1.SchoolCardError('The lost-card email address is not valid.', 400, 'INVALID_SETTINGS');
        }
    }
}
function assertApprovedSignature(url, approved) {
    const value = url.trim();
    if (!value.startsWith('https://') || value.toLowerCase().startsWith('data:') || value.length < 8 || value.length > 2000) {
        throw new school_card_errors_1.SchoolCardError('The signature must be an approved uploaded image.', 400, 'INVALID_SIGNATURE');
    }
    if (!approved.has(value)) {
        throw new school_card_errors_1.SchoolCardError('The signature must be an approved uploaded image.', 400, 'INVALID_SIGNATURE');
    }
}
function httpsLogo(url) {
    if (!url)
        return null;
    const value = url.trim();
    if (!value.startsWith('https://') || value.toLowerCase().includes('data:'))
        return null;
    return value;
}
function printedStudent(student) {
    const printedName = `${student.firstName.trim()} ${student.lastName.trim()}`.trim();
    const printedCode = student.admissionNumber.trim();
    if (printedName.length < 2 || printedCode.length < 1) {
        throw new school_card_errors_1.SchoolCardError('This student needs a name and an admission number before a card can be issued.', 400, 'IDENTITY_INCOMPLETE');
    }
    return {
        printedName,
        printedCode,
        printedDetail: student.currentClass?.trim() ? student.currentClass.trim() : null,
    };
}
function printedStaff(staff) {
    const printedName = staff.name.trim();
    const printedCode = staff.staffCode?.trim() ? staff.staffCode.trim() : 'STAFF';
    if (printedCode === staff.id) {
        throw new school_card_errors_1.SchoolCardError('A staff card cannot print an internal identifier.', 400, 'IDENTITY_INCOMPLETE');
    }
    if (printedName.length < 2) {
        throw new school_card_errors_1.SchoolCardError('This staff member needs a name before a card can be issued.', 400, 'IDENTITY_INCOMPLETE');
    }
    return {
        printedName,
        printedCode,
        printedDetail: staff.role?.trim() ? staff.role.trim() : null,
    };
}
function printedAdmin(user) {
    const printedName = user.name?.trim() ? user.name.trim() : 'School administrator';
    const printedCode = 'ADMIN';
    if (printedCode === user.id || printedCode.toLowerCase() === user.email.toLowerCase()) {
        throw new school_card_errors_1.SchoolCardError('An administrator card cannot print an internal identifier.', 400, 'IDENTITY_INCOMPLETE');
    }
    return { printedName, printedCode, printedDetail: 'School administrator' };
}
function rejectPredictableToken(hash, values) {
    if (!/^[0-9a-f]{64}$/.test(hash)) {
        throw new school_card_errors_1.SchoolCardError('The barcode token is not valid.', 400, 'INVALID_TOKEN');
    }
    for (const value of values) {
        if (value != null && value.trim() !== '' && hash === (0, school_card_token_1.sha256Hex)(value.trim())) {
            throw new school_card_errors_1.SchoolCardError('The barcode must be a random secret.', 400, 'INVALID_TOKEN');
        }
    }
}
function isTemplateKey(value) {
    return school_card_types_1.TEMPLATE_KEYS.includes(value);
}
//# sourceMappingURL=school-card.rules.js.map