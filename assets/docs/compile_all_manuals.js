const { chromium } = require('C:/dev/Involve_APP/invify-admin/node_modules/playwright');
const path = require('path');
const fs = require('fs');

async function compileAll() {
    console.log('Starting Invify Manuals A5 PDF Compilation...');
    const startTime = Date.now();

    const browser = await chromium.launch({
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        headless: true
    });

    const docsDir = path.resolve(__dirname);
    const tasks = [
        {
            html: path.join(docsDir, 'retail_mode_guide.html'),
            pdf: path.join(docsDir, 'INVIFY_MANUAL_RETAIL_MODE.pdf'),
            fallbackPdf: path.join(docsDir, 'INVIFY_MANUAL_RETAIL_MODE_FIXED.pdf'),
            title: 'Retail Mode Manual'
        },
        {
            html: path.join(docsDir, 'school_mode_guide.html'),
            pdf: path.join(docsDir, 'INVIFY_MANUAL_SCHOOL_MODE.pdf'),
            fallbackPdf: path.join(docsDir, 'INVIFY_MANUAL_SCHOOL_MODE_FIXED.pdf'),
            title: 'School Mode Manual'
        },
        {
            html: path.join(docsDir, 'service_mode_guide.html'),
            pdf: path.join(docsDir, 'INVIFY_MANUAL_SERVICE_MODE.pdf'),
            fallbackPdf: path.join(docsDir, 'INVIFY_MANUAL_SERVICE_MODE_FIXED.pdf'),
            title: 'Service Mode Manual'
        },
        {
            html: path.join(docsDir, 'full_master_user_manual.html'),
            pdf: path.join(docsDir, 'INVIFY_MASTER_MANUAL.pdf'),
            fallbackPdf: path.join(docsDir, 'INVIFY_MASTER_MANUAL_FIXED.pdf'),
            title: 'Master User Manual'
        }
    ];

    const page = await browser.newPage();
    let masterBuffer = null;

    for (const task of tasks) {
        const fileUrl = 'file:///' + task.html.replace(/\\/g, '/');
        console.log(`\nCompiling [${task.title}] from: ${fileUrl}`);
        const taskStart = Date.now();

        await page.goto(fileUrl, { waitUntil: 'networkidle' });
        await page.waitForTimeout(600);

        const pdfBuffer = await page.pdf({
            format: 'A5',
            printBackground: true,
            margin: {
                top: '8mm',
                bottom: '10mm',
                left: '8mm',
                right: '8mm'
            }
        });

        if (task.title === 'Master User Manual') {
            masterBuffer = pdfBuffer;
        }

        const sizeMb = (pdfBuffer.length / (1024 * 1024)).toFixed(2);

        // Try writing to primary target path
        let writtenToPrimary = false;
        try {
            fs.writeFileSync(task.pdf, pdfBuffer);
            console.log(`✓ Updated primary file: ${path.basename(task.pdf)} (${sizeMb} MB) in ${((Date.now() - taskStart) / 1000).toFixed(1)}s`);
            writtenToPrimary = true;
        } catch (err) {
            if (err.code === 'EBUSY') {
                console.warn(`! Primary file ${path.basename(task.pdf)} is currently locked/open in an external PDF viewer.`);
            } else {
                console.error(`! Unexpected write error for ${path.basename(task.pdf)}:`, err);
            }
        }

        // Always also write the clean _FIXED.pdf copy so the user can immediately open it even if Edge is locking the other file
        fs.writeFileSync(task.fallbackPdf, pdfBuffer);
        console.log(`✓ Generated clean fixed copy: ${path.basename(task.fallbackPdf)} (${sizeMb} MB)`);
    }

    // Overwrite the original INVIFY MANUAL.pdf with the new master manual
    if (masterBuffer) {
        const legacyPdf = path.join(docsDir, 'INVIFY MANUAL.pdf');
        try {
            fs.writeFileSync(legacyPdf, masterBuffer);
            console.log(`\n✓ Successfully updated legacy file "INVIFY MANUAL.pdf" (${(masterBuffer.length / (1024 * 1024)).toFixed(2)} MB).`);
        } catch (err) {
            console.warn(`! "INVIFY MANUAL.pdf" was locked: ${err.message}`);
        }
    }

    // Clean up temporary test files if they exist
    const testFiles = ['test_retail.pdf', 'test_school.pdf', 'test_service.pdf', 'test_master.pdf'];
    for (const tf of testFiles) {
        const fullPath = path.join(docsDir, tf);
        if (fs.existsSync(fullPath)) {
            try { fs.unlinkSync(fullPath); } catch (e) {}
        }
    }

    await browser.close();
    console.log(`\nAll operations complete in ${((Date.now() - startTime) / 1000).toFixed(1)}s!`);
}

compileAll().catch(err => {
    console.error('Compilation failed:', err);
    process.exit(1);
});
