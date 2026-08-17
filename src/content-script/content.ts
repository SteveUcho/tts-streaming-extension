import { DEFAULT_SETTINGS } from "@/constants";

const popupBtn = document.createElement('button');
popupBtn.textContent = 'Speak';
popupBtn.style.display = 'none';
popupBtn.style.position = 'absolute';
popupBtn.style.zIndex = '9999';
popupBtn.style.backgroundColor = 'white';
popupBtn.style.border = '1px solid black';
popupBtn.style.padding = '5px';
popupBtn.style.borderRadius = '5px';
popupBtn.style.color = 'black';
popupBtn.style.cursor = 'pointer';
popupBtn.style.fontSize = '12px';

document.body.appendChild(popupBtn);

async function handleMouseUp() {
    const settings = await chrome.storage.local.get(DEFAULT_SETTINGS as any);
    console.log('settings', settings);
    if (!settings.quickAction) {
        return;
    }
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();
    if (selection && selectedText) {
        popupBtn.style.display = 'block';
        // Get coordinates of the highlighted text block
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // Position the button right above the center of the highlight
        popupBtn.style.left = `${rect.left + window.scrollX + (rect.width / 2) - 25}px`;
        popupBtn.style.top = `${rect.top + window.scrollY - 28}px`; // 30px above the text
    } else {
        popupBtn.style.display = 'none';
    }
}

document.addEventListener('mouseup', handleMouseUp);

// Hide the button if the user clicks anywhere else
document.addEventListener('mousedown', (event) => {
    if (event.target !== popupBtn) {
        popupBtn.style.display = 'none';
    }
});

popupBtn.addEventListener('click', () => {
    const selectedText = window.getSelection()?.toString().trim();
    if (selectedText) {
        chrome.runtime.sendMessage({ type: 'startStreamingBackground', text: selectedText });
    }
    popupBtn.style.display = 'none';
});