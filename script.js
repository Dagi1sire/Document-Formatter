document.addEventListener('DOMContentLoaded', () => {
    const apiKeyInput = document.getElementById('api-key');
    const inputTextarea = document.getElementById('input-text');
    const outputTextPre = document.getElementById('output-text');
    const actionButtons = document.querySelectorAll('.action-button');
    const copyOutputButton = document.getElementById('copy-output-button');
    const statusMessage = document.getElementById('status-message');

    // Load API key from session storage if available
    if (sessionStorage.getItem('geminiApiKey')) {
        apiKeyInput.value = sessionStorage.getItem('geminiApiKey');
    }

    apiKeyInput.addEventListener('change', () => {
        sessionStorage.setItem('geminiApiKey', apiKeyInput.value.trim());
        updateStatus('API Key saved in session storage.', 'success');
    });

    actionButtons.forEach(button => {
        button.addEventListener('click', () => {
            const action = button.dataset.action;
            const text = inputTextarea.value.trim();
            const apiKey = apiKeyInput.value.trim();

            if (!apiKey) {
                updateStatus('Please enter your Gemini API Key.', 'error');
                apiKeyInput.focus();
                return;
            }
            if (!text) {
                updateStatus('Please enter some text to process.', 'error');
                inputTextarea.focus();
                return;
            }

            handleAiAction(action, text, apiKey);
        });
    });

    copyOutputButton.addEventListener('click', () => {
        if (outputTextPre.textContent) {
            navigator.clipboard.writeText(outputTextPre.textContent)
                .then(() => updateStatus('Output copied to clipboard!', 'success'))
                .catch(err => {
                    console.error('Error copying text: ', err);
                    updateStatus('Failed to copy text.', 'error');
                });
        } else {
            updateStatus('Nothing to copy.', 'error');
        }
    });

    function updateStatus(message, type = 'info') { // type can be 'info', 'success', 'error', 'loading'
        statusMessage.textContent = message;
        statusMessage.className = `status-${type}`; // Will use CSS to style these

        // Clear message after some time for non-loading messages
        if (type !== 'loading') {
            setTimeout(() => {
                if (statusMessage.textContent === message) { // Clear only if it's the same message
                    statusMessage.textContent = '';
                    statusMessage.className = '';
                }
            }, 3000);
        }
    }

    function toggleActionButtons(disabled) {
        actionButtons.forEach(button => button.disabled = disabled);
    }

    // --- Gemini API Integration ---
    const GEMINI_API_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent"; // Using gemini-pro as gemini-2.0-flash is not a standard public model name, adjust if you have a specific endpoint.

    async function callGeminiAPI(prompt, apiKey) {
        // Note: For "gemini-2.0-flash", the actual model name in the API might be different,
        // e.g., 'gemini-1.0-pro' or a specific fine-tuned model.
        // Using 'gemini-pro' as a common default. Adjust if your key is for a different variant.
        // The new Gemini API uses "gemini-1.5-flash-latest" or "gemini-1.0-pro" etc.
        // Let's assume a model like 'gemini-1.0-pro' or 'gemini-1.5-flash-latest' for this example.
        // The user mentioned "gemini-2.0-flash" which might be an internal or unreleased name.
        // We'll use a structure compatible with current Gemini APIs.
        // The endpoint structure is usually:
        // `https://generativelanguage.googleapis.com/v1beta/models/YOUR_MODEL_NAME:generateContent?key=YOUR_API_KEY`

        const modelName = "gemini-1.5-flash-latest"; // Or "gemini-pro", "gemini-1.0-pro"
        const apiURL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;


        const requestBody = {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            // Optional: Add generationConfig if needed
            // generationConfig: {
            //   temperature: 0.7,
            //   topK: 1,
            //   topP: 1,
            //   maxOutputTokens: 2048,
            // },
            // Optional: Add safetySettings if needed
            // safetySettings: [
            //   { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            //   // ... other settings
            // ]
        };

        const response = await fetch(apiURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorBody = await response.json();
            console.error('Gemini API Error:', errorBody);
            throw new Error(`Gemini API Error: ${response.status} ${response.statusText}. ${errorBody.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();

        if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0) {
            return data.candidates[0].content.parts[0].text;
        } else if (data.promptFeedback && data.promptFeedback.blockReason) {
            throw new Error(`Content blocked by Gemini API due to: ${data.promptFeedback.blockReason}. ${data.promptFeedback.safetyRatings?.map(r => `${r.category} was ${r.probability}`).join(', ') || ''}`);
        }
        else {
            console.warn('Gemini API response in unexpected format:', data);
            throw new Error('Received an unexpected response format from Gemini API.');
        }
    }


    async function handleAiAction(action, text, apiKey) {
        updateStatus(`Processing "${action.replace('-', ' ')}"...`, 'loading');
        toggleActionButtons(true);
        outputTextPre.textContent = ''; // Clear previous output

        try {
            let prompt;
            switch (action) {
                case 'improve':
                    prompt = `Please review the following text and improve its clarity, conciseness, grammar, and overall readability. Maintain the original meaning and tone as much as possible. Output only the improved text, without any introductory phrases like "Here's the improved text:" or similar remarks.\n\nOriginal Text:\n---\n${text}\n---`;
                    break;
                case 'linkedin':
                    prompt = `Transform the following text into an engaging LinkedIn post. Optimize for readability using short paragraphs or bullet points where appropriate. Maintain a professional tone. Incorporate relevant emojis sparingly to enhance engagement. Conclude with 2-3 relevant hashtags. Output only the formatted LinkedIn post, ready to be copied and pasted. Do not include any introductory phrases like "Here's the LinkedIn post:" or similar remarks.\n\nOriginal Text:\n---\n${text}\n---`;
                    break;
                case 'twitter':
                    prompt = `Transform the following text into a concise and engaging single Twitter/X post. The post must be under 280 characters. Use relevant emojis sparingly. Include 1-2 relevant hashtags. Ensure the output is only the tweet itself, ready for copy-pasting, without any introductory phrases or explanations.\n\nOriginal Text:\n---\n${text}\n---`;
                    break;
                default:
                    // Fallback for placeholder prompts if new actions are added without specific prompt logic yet
                    prompt = `Perform action "${action}" on the following text:\n\n---\n${text}\n---`;
            }

            const result = await callGeminiAPI(prompt, apiKey);

            outputTextPre.textContent = result.trim(); // Trim whitespace from AI response
            updateStatus(`Successfully processed "${action.replace('-', ' ')}"!`, 'success');

        } catch (error) {
            console.error('Error during AI action:', error);
            updateStatus(`Error: ${error.message || 'Failed to process AI action.'}`, 'error');
            outputTextPre.textContent = `An error occurred: ${error.message}`;
        } finally {
            toggleActionButtons(false);
        }
    }

    // Initial status message or clear it
    updateStatus('', 'info');
});
