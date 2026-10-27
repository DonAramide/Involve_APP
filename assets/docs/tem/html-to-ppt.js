const { chromium } = require("playwright");
const pptxgen = require("pptxgenjs");
const path = require("path");
const fs = require("fs");

(async () => {
    const htmlFile = path.resolve(
        "gemini-code-1790271312635.html"
    );

    const outputFile = path.resolve(
        "Invify-FCMB-Presentation.pptx"
    );

    if (!fs.existsSync(htmlFile)) {
        console.error("HTML file not found:");
        console.error(htmlFile);
        process.exit(1);
    }

    console.log("Opening:");
    console.log(htmlFile);

    const browser = await chromium.launch({
        headless: true
    });

    const page = await browser.newPage({
        viewport: {
            width: 1600,
            height: 900
        },
        deviceScaleFactor: 1
    });

    await page.goto(
        "file:///" + htmlFile.replace(/\\/g, "/"),
        {
            waitUntil: "networkidle"
        }
    );

    // Allow local images to finish loading
    await page.waitForTimeout(1500);

    const slides = page.locator(".slide");
    const slideCount = await slides.count();

    console.log(`Found ${slideCount} slides.`);

    if (slideCount === 0) {
        console.error(
            'No elements with class ".slide" were found.'
        );
        await browser.close();
        process.exit(1);
    }

    const pptx = new pptxgen();

    pptx.layout = "LAYOUT_WIDE";
    pptx.author = "Invify";
    pptx.company = "Integrated Independent Products & Services";
    pptx.subject = "Invify × FCMB Smart mPOS Presentation";
    pptx.title = "Invify × FCMB Smart mPOS Presentation";

    for (let i = 0; i < slideCount; i++) {

        console.log(`Rendering slide ${i + 1}/${slideCount}...`);

        // Show only the current slide
        await page.evaluate((index) => {
            const allSlides =
                document.querySelectorAll(".slide");

            allSlides.forEach((slide, slideIndex) => {
                slide.style.display =
                    slideIndex === index ? "flex" : "none";

                slide.style.margin = "0";
                slide.style.boxShadow = "none";
                slide.style.borderRadius = "0";
            });

            // Hide speaker labels
            document
                .querySelectorAll(".slide-speaker")
                .forEach(el => {
                    el.style.display = "none";
                });

            document.body.style.margin = "0";
            document.body.style.padding = "0";
            document.body.style.gap = "0";
            document.body.style.background = "#ffffff";
        }, i);

        await page.waitForTimeout(100);

        const screenshotPath = path.join(
            __dirname,
            `slide-${String(i + 1).padStart(2, "0")}.png`
        );

        await slides.nth(i).screenshot({
            path: screenshotPath
        });

        const pptSlide = pptx.addSlide();

        pptSlide.background = {
            color: "FFFFFF"
        };

        pptSlide.addImage({
            path: screenshotPath,
            x: 0,
            y: 0,
            w: 13.333,
            h: 7.5
        });
    }

    console.log("Writing PowerPoint...");

    await pptx.writeFile({
        fileName: outputFile
    });

    await browser.close();

    console.log("");
    console.log("========================================");
    console.log("POWERPOINT CREATED SUCCESSFULLY");
    console.log("========================================");
    console.log(outputFile);
})();