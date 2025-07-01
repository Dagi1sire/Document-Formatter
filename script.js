document.addEventListener('DOMContentLoaded', function () {
    // Initialize Quill editor
    // Define available fonts - these must be loaded by the browser (e.g., via @font-face or system fonts)
    const Font = Quill.import('formats/font');
    Font.whitelist = ['arial', 'comic-sans', 'courier-new', 'georgia', 'helvetica', 'lucida-sans', 'tahoma', 'times-new-roman', 'verdana'];
    Quill.register(Font, true);

    const quill = new Quill('#editor', {
        theme: 'snow', // Use 'snow' theme for a clean interface with toolbar
        modules: {
            toolbar: [
                [{ 'font': Font.whitelist }],
                [{ 'size': ['small', false, 'large', 'huge'] }], // custom dropdown
                ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
                [{ 'color': [] }, { 'background': [] }],          // dropdown with defaults from theme
                [{ 'script': 'sub'}, { 'script': 'super' }],      // superscript/subscript
                [{ 'header': 1 }, { 'header': 2 }, { 'header': [3, 4, 5, 6, false] }], // Header levels
                [{ 'list': 'ordered'}, { 'list': 'bullet' }, { 'list': 'check' }],
                [{ 'indent': '-1'}, { 'indent': '+1' }],          // outdent/indent
                [{ 'direction': 'rtl' }],                         // text direction
                [{ 'align': [] }],
                ['link', 'image', 'video', 'formula'],          // image, video, formula are optional
                ['clean']                                         // remove formatting button
                // Columns are not a standard Quill feature and are very complex to implement reliably for PDF.
                // This would typically require custom HTML structure and CSS that Quill doesn't manage by default.
                // For this project, direct column support via Quill toolbar is omitted.
                // Users could manually create columns using HTML/CSS in the source if they are savvy.
            ]
        }
    });

    const contentToPdf = document.getElementById('content-to-pdf');
    const editorDiv = document.querySelector('#editor .ql-editor');

    // Keep #content-to-pdf in sync with the editor's content (simple innerHTML copy)
    // This is a basic sync. For complex content, direct manipulation or Quill's delta might be better.
    if (editorDiv) {
        quill.on('text-change', function(delta, oldDelta, source) {
            if (source === 'user') {
                // The content of the editor for PDF generation will be what's inside .ql-editor
                // We don't need to manually copy if html2canvas targets the .ql-editor or its parent correctly.
                // For now, we assume html2canvas will capture the #content-to-pdf div which contains the styled editor.
            }
        });
    } else {
        console.error("#editor .ql-editor not found for Quill content sync.");
    }


    // Set background button functionality
    const setBgButton = document.getElementById('set-bg-button');
    const bgImageUrlInput = document.getElementById('bg-image-url');

    if (setBgButton && bgImageUrlInput && contentToPdf) {
        setBgButton.addEventListener('click', function () {
            const imageUrl = bgImageUrlInput.value.trim();
            if (imageUrl) {
                contentToPdf.style.backgroundImage = `url('${imageUrl}')`;
                contentToPdf.style.backgroundSize = 'cover';
                contentToPdf.style.backgroundPosition = 'center';
            } else {
                alert('Please enter an image URL.');
            }
        });
    } else {
        console.error("Background setting elements not found.");
    }

    // Unsplash API Integration
    const unsplashApiKeyInput = document.getElementById('unsplash-api-key');
    const unsplashSearchQueryInput = document.getElementById('unsplash-search-query');
    const unsplashSearchButton = document.getElementById('unsplash-search-button');
    const unsplashResultsDiv = document.getElementById('unsplash-results');

    if (unsplashSearchButton && unsplashApiKeyInput && unsplashSearchQueryInput && unsplashResultsDiv) {
        unsplashSearchButton.addEventListener('click', function() {
            const apiKey = unsplashApiKeyInput.value.trim();
            const query = unsplashSearchQueryInput.value.trim();

            if (!apiKey) {
                alert('Please enter your Unsplash API Key.');
                return;
            }
            if (!query) {
                alert('Please enter a search query for Unsplash.');
                return;
            }

            fetchUnsplashImages(query, apiKey);
        });
    } else {
        console.error("Unsplash search elements not found.");
    }

    // Keyword Extraction and Assistance
    const commonStopWords = [
        "a", "an", "and", "are", "as", "at", "be", "but", "by", "for", "if", "in", "into", "is", "it",
        "no", "not", "of", "on", "or", "such", "that", "the", "their", "then", "there", "these",
        "they", "this", "to", "was", "will", "with", "i", "me", "my", "myself", "we", "our", "ours",
        "ourselves", "you", "your", "yours", "yourself", "yourselves", "he", "him", "his", "himself",
        "she", "her", "hers", "herself", "it", "its", "itself", "they", "them", "their", "theirs",
        "themselves", "what", "which", "who", "whom", "this", "that", "these", "those", "am", "is",
        "are", "was", "were", "be", "been", "being", "have", "has", "had", "having", "do", "does",
        "did", "doing", "a", "an", "the", "and", "but", "if", "or", "because", "as", "until", "while",
        "of", "at", "by", "for", "with", "about", "against", "between", "into", "through", "during",
        "before", "after", "above", "below", "to", "from", "up", "down", "in", "out", "on", "off",
        "over", "under", "again", "further", "then", "once", "here", "there", "when", "where", "why",
        "how", "all", "any", "both", "each", "few", "more", "most", "other", "some", "such", "no",
        "nor", "not", "only", "own", "same", "so", "than", "too", "very", "s", "t", "can", "will",
        "just", "don", "should", "now", "d", "ll", "m", "o", "re", "ve", "y", "ain", "aren", "couldn",
        "didn", "doesn", "hadn", "hasn", "haven", "isn", "ma", "mightn", "mustn", "needn", "shan",
        "shouldn", "wasn", "weren", "won", "wouldn"
    ];

    quill.on('text-change', function(delta, oldDelta, source) {
        if (source === 'user') {
            // Update contentToPdf if necessary (already handled by structure)
            // Trigger keyword extraction for Unsplash search query
            const text = quill.getText(0, 2000); // Get up to 2000 chars for keyword analysis
            const keywords = extractKeywords(text, 3); // Extract top 3 keywords
            if (keywords.length > 0 && unsplashSearchQueryInput) {
                unsplashSearchQueryInput.value = keywords.join(' ');
            }
        }
    });

    function extractKeywords(text, count = 3) {
        if (!text) return [];
        const words = text.toLowerCase().replace(/[^\w\s]/gi, '').split(/\s+/);
        const freqMap = {};
        words.forEach(word => {
            if (word.length > 2 && !commonStopWords.includes(word)) { // Basic filter
                freqMap[word] = (freqMap[word] || 0) + 1;
            }
        });
        return Object.entries(freqMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, count)
            .map(entry => entry[0]);
    }


    function fetchUnsplashImages(query, apiKey) {
        const count = 10; // Number of images to fetch
        const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${count}&client_id=${apiKey}`;

        setLoadingMessage(unsplashResultsDiv, 'Loading images from Unsplash...');
        disableSearchButton(true);

        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}. Check API key and Unsplash rate limits.`);
                }
                return response.json();
            })
            .then(data => {
                displayUnsplashImages(data.results);
            })
            .catch(error => {
                console.error('Error fetching from Unsplash:', error);
                setErrorMessage(unsplashResultsDiv, `Error fetching images: ${error.message}. Ensure API key is valid & has permissions.`);
            })
            .finally(() => {
                disableSearchButton(false);
            });
    }

    function displayUnsplashImages(images) {
        unsplashResultsDiv.innerHTML = ''; // Clear previous results or loading message

        if (!images || images.length === 0) {
            setMessage(unsplashResultsDiv, 'No images found for your query.');
            return;
        }

        images.forEach(image => {
            const imgContainer = document.createElement('div');
            imgContainer.className = 'unsplash-image-container';

            const imgElement = document.createElement('img');
            imgElement.src = image.urls.thumb;
            imgElement.alt = image.alt_description || 'Unsplash image';
            imgElement.title = `Photo by ${image.user.name} on Unsplash. Click to view larger.`;

            // Open full image in new tab for preview
            imgElement.addEventListener('click', () => {
                window.open(image.urls.full, '_blank');
            });

            const setBgBtn = document.createElement('button');
            setBgBtn.textContent = 'Set as BG';
            setBgBtn.addEventListener('click', () => {
                if (contentToPdf) {
                    contentToPdf.style.backgroundImage = `url('${image.urls.regular}')`;
                    contentToPdf.style.backgroundSize = 'cover';
                    contentToPdf.style.backgroundPosition = 'center';
                }
            });

            const insertImgBtn = document.createElement('button');
            insertImgBtn.textContent = 'Insert in Editor';
            insertImgBtn.addEventListener('click', () => {
                const range = quill.getSelection(true); // Get current selection or cursor position
                // Insert image at the current position. Quill handles image uploads/embedding.
                // For Unsplash, we use the direct URL.
                quill.insertEmbed(range.index, 'image', image.urls.small);
            });

            imgContainer.appendChild(imgElement);
            imgContainer.appendChild(setBgBtn);
            imgContainer.appendChild(insertImgBtn);
            unsplashResultsDiv.appendChild(imgContainer);
        });
    }


    // Generate PDF button functionality
    const generatePdfButton = document.getElementById('generate-pdf-button');
    if (generatePdfButton && contentToPdf) {
        generatePdfButton.addEventListener('click', function () {

            disableGeneratePdfButton(true);
            // Optionally, show a global loading message or spinner near the button
            console.log("Generate PDF button clicked. Processing...");

            const elementToCapture = contentToPdf;

            html2canvas(elementToCapture, {
                allowTaint: true,
                useCORS: true,
                logging: false, // Reduce console noise unless debugging
                scrollX: 0,
                scrollY: -window.scrollY,
                width: elementToCapture.scrollWidth,
                height: elementToCapture.scrollHeight,
                imageTimeout: 15000, // Timeout for loading images within html2canvas
                onclone: (documentClone) => {
                    // Remove Unsplash search results from clone to prevent them appearing in PDF
                    const resultsClone = documentClone.getElementById('unsplash-results');
                    if (resultsClone) resultsClone.innerHTML = '';
                    // Potentially hide other interactive elements not meant for the PDF
                }
            }).then(canvas => {
                console.log("html2canvas success.");
                const imgData = canvas.toDataURL('image/png', 0.95); // Use quality 0.95 for PNG

                const pdfWidthPt = 595.27;
                const pdfHeightPt = 841.89;

                const pdf = new jspdf.jsPDF({
                    orientation: 'portrait',
                    unit: 'pt',
                    format: 'a4',
                    compress: true // Enable compression
                });

                const canvasWidth = canvas.width;
                const canvasHeight = canvas.height;
                const canvasAspectRatio = canvasWidth / canvasHeight;
                const pdfAspectRatio = pdfWidthPt / pdfHeightPt;
                let imgWidthInPdf, imgHeightInPdf;

                if (canvasAspectRatio > pdfAspectRatio) {
                    imgWidthInPdf = pdfWidthPt;
                    imgHeightInPdf = pdfWidthPt / canvasAspectRatio;
                } else {
                    imgHeightInPdf = pdfHeightPt;
                    imgWidthInPdf = pdfHeightPt * canvasAspectRatio;
                }

                const xOffset = (pdfWidthPt - imgWidthInPdf) / 2;
                const yOffset = (pdfHeightPt - imgHeightInPdf) / 2;

                pdf.addImage(imgData, 'PNG', xOffset, yOffset, imgWidthInPdf, imgHeightInPdf, undefined, 'FAST'); // Use FAST compression
                pdf.save('formatted_document.pdf');
                console.log("PDF should be saved.");
            }).catch(error => {
                console.error('Error generating PDF:', error);
                alert(`Error generating PDF: ${error.message}. Check console. Ensure images are accessible (CORS). Large images or complex content can also cause issues.`);
            }).finally(() => {
                disableGeneratePdfButton(false);
            });
        });
    } else {
        console.error("PDF generation button or contentToPdf element not found.");
    }

    // --- Helper functions for UI feedback ---
    function setLoadingMessage(element, message) {
        element.innerHTML = `<p class="loading-message">${message}</p>`;
    }

    function setErrorMessage(element, message) {
        element.innerHTML = `<p class="error-message">${message}</p>`;
    }

    function setMessage(element, message) { // Generic message
        element.innerHTML = `<p>${message}</p>`;
    }

    function disableSearchButton(disabled) {
        if (unsplashSearchButton) {
            unsplashSearchButton.disabled = disabled;
            unsplashSearchButton.textContent = disabled ? 'Searching...' : 'Search Images';
        }
    }

    function disableGeneratePdfButton(disabled) {
        if (generatePdfButton) {
            generatePdfButton.disabled = disabled;
            generatePdfButton.textContent = disabled ? 'Generating...' : 'Generate PDF';
        }
    }

});
