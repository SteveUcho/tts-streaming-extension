export async function getHighlightText(): Promise<string> {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const [tab] = tabs;
    if (!tab?.id) return "";
    const result = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
            const selection = globalThis.getSelection();
            return selection?.toString().trim() || "";
        },
    });

    return result[0].result ?? "";
}