console.log("Colab C++ Step Runner Extension Loaded (v_keyboard_shortcut_observer_fallback)");

const BASE_FILENAME_ATTR = 'data-cpp-base-filename'; // Attribute to store unique filename base

// --- Keyboard Simulation Helpers ---

// Helper function to dispatch a single keyboard event
function dispatchKeyEvent(target, eventType, key, code, ctrlKey, metaKey, shiftKey) {
    target.dispatchEvent(new KeyboardEvent(eventType, {
        key: key,
        code: code,
        ctrlKey: ctrlKey,
        metaKey: metaKey, // Use metaKey for Command on Mac
        shiftKey: shiftKey,
        bubbles: true, // Allow event to bubble up
        cancelable: true // Allow event to be cancelled
    }));
    // console.log(`Dispatched ${eventType}: key=${key}, code=${code}, ctrl=${ctrlKey}, meta=${metaKey}`); // Verbose logging for debugging keys
}

// Helper function to determine if the OS is likely macOS
function isMac() {
    // navigator.platform is deprecated but still widely supported. Use userAgentData if available in future.
    return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
}

// Function to simulate the specific Colab "Insert code cell below" shortcut (Ctrl+M, B or Cmd+M, B)
async function simulateColabAddCellShortcut() {
    console.log("Attempting to simulate Ctrl+M, B shortcut...");
    const target = document.body; // Target the body, Colab likely listens globally
    const useMetaKey = isMac(); // Use Cmd on Mac, Ctrl elsewhere
    const useCtrlKey = !useMetaKey;
    const modifierKeyName = useMetaKey ? 'Meta' : 'Control';
    const modifierKeyCode = useMetaKey ? 'MetaLeft' : 'ControlLeft'; // Or MetaRight/ControlRight, Left is common

    try {
        // --- Simulate Ctrl+M (or Cmd+M) ---
        // Press Modifier
        dispatchKeyEvent(target, 'keydown', modifierKeyName, modifierKeyCode, useCtrlKey, useMetaKey, false);
        // Press M
        dispatchKeyEvent(target, 'keydown', 'm', 'KeyM', useCtrlKey, useMetaKey, false);
        // Release M
        dispatchKeyEvent(target, 'keyup', 'm', 'KeyM', useCtrlKey, useMetaKey, false);
        // Release Modifier - Colab likely expects sequence, not modifier held down.
        dispatchKeyEvent(target, 'keyup', modifierKeyName, modifierKeyCode, false, false, false); // Modifiers released

        // Short delay before the 'B' key, mimicking human typing pause
        await new Promise(resolve => setTimeout(resolve, 60)); // 60ms delay, adjust if needed

        // --- Simulate B ---
        // Press B (no modifiers needed for the 'B' itself after the Ctrl+M sequence)
        dispatchKeyEvent(target, 'keydown', 'b', 'KeyB', false, false, false);
        // Release B
        dispatchKeyEvent(target, 'keyup', 'b', 'KeyB', false, false, false);

        console.log("Simulated Ctrl+M, B sequence.");
        return true; // Indicate successful simulation attempt

    } catch (error) {
        console.error("Error during keyboard event simulation:", error);
        return false; // Indicate failure
    }
}


// --- Button Creation ---
function addControlButtons(toolbarElement, codeCellElement) {
    // Generate a unique base filename only once per cell when buttons are first added
    let baseFilename = codeCellElement.getAttribute(BASE_FILENAME_ATTR);
    if (!baseFilename) {
        const uniqueId = Date.now() + Math.floor(Math.random() * 1000); // Add randomness
        baseFilename = `_colab_cpp_cell_${uniqueId}`;
        codeCellElement.setAttribute(BASE_FILENAME_ATTR, baseFilename);
        // console.log(`Set base filename for cell ${codeCellElement.id || '(no id)'}: ${baseFilename}`);
    }

    const buttonDefs = [
        { text: '[W] WriteFile', title: 'Copy %%writefile command', handler: handleWriteFileClick, idClass: 'colab-cpp-w-button' },
        { text: '[C] Compile', title: 'Copy !g++ compile command', handler: handleCompileClick, idClass: 'colab-cpp-c-button' },
        { text: '[R] Run', title: 'Copy !./ execute command', handler: handleRunClick, idClass: 'colab-cpp-r-button' }
    ];

    buttonDefs.forEach(def => {
        // Check if this specific button already exists for this cell
        if (toolbarElement.querySelector(`.${def.idClass}`)) {
            return; // Skip if already added
        }

        const button = document.createElement('button');
        button.textContent = def.text;
        button.title = def.title;
        button.className = `colab-cpp-step-button ${def.idClass}`; // General class + specific class
        button.addEventListener('click', def.handler);

        // Append button to the end of the toolbar
        toolbarElement.appendChild(button);
        // console.log(`Added button "${def.text}" to toolbar:`, toolbarElement);
    });
}

// --- Button Click Handlers ---

async function handleWriteFileClick(event) {
    console.log("WriteFile button clicked.");
    const button = event.target;
    button.disabled = true; // Prevent double clicks during operation
    const { codeCellElement, baseFilename, cppCode } = getCellInfo(button); // Pass button to know which action needs code

    if (!codeCellElement || !baseFilename || cppCode === null) {
        console.error("WriteFile failed: Couldn't get necessary cell info.");
        button.disabled = false;
        return; // Error handled in getCellInfo
    }

    const cppFilename = `${baseFilename}.cpp`;
    // Escape backticks, backslashes, handle Windows newlines
    const escapedCode = cppCode.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\r\n/g, '\n');
    const command = `%%writefile ${cppFilename}\n${escapedCode}`;

    await addCellAndCopyToClipboard(command, "WriteFile command copied!");
    button.disabled = false; // Re-enable button
}

async function handleCompileClick(event) {
    console.log("Compile button clicked.");
    const button = event.target;
     button.disabled = true;
    const { codeCellElement, baseFilename } = getCellInfo(button); // Doesn't need cppCode

    if (!codeCellElement || !baseFilename) {
        console.error("Compile failed: Couldn't get necessary cell info.");
        button.disabled = false;
        return;
    }

    const cppFilename = `${baseFilename}.cpp`;
    const execFilename = `${baseFilename}_exec`;
    const command = `!g++ ${cppFilename} -o ${execFilename} -std=c++17 -Wall`; // Added -Wall for warnings

    await addCellAndCopyToClipboard(command, "Compile command copied!");
     button.disabled = false;
}

async function handleRunClick(event) {
    console.log("Run button clicked.");
    const button = event.target;
    button.disabled = true;
    const { codeCellElement, baseFilename } = getCellInfo(button); // Doesn't need cppCode

    if (!codeCellElement || !baseFilename) {
        console.error("Run failed: Couldn't get necessary cell info.");
        button.disabled = false;
        return;
    }

    const execFilename = `${baseFilename}_exec`;
    const command = `!./${execFilename}`;

    await addCellAndCopyToClipboard(command, "Run command copied!");
    button.disabled = false;
}

// --- Helper Functions ---

// Gets Code Cell, Base Filename, and (conditionally) C++ Code
function getCellInfo(buttonElement) {
    try {
        // Find parent code cell
        // **SELECTOR MAY NEED UPDATE** - Ensure this correctly finds the overall cell container
        const codeCellElement = buttonElement.closest('.cell.code');
        if (!codeCellElement) throw new Error("Could not find parent '.cell.code' element.");
        // console.log("Found parent cell element:", codeCellElement);

        // Retrieve base filename stored on the cell
        const baseFilename = codeCellElement.getAttribute(BASE_FILENAME_ATTR);
        if (!baseFilename) throw new Error(`Could not retrieve base filename attribute '${BASE_FILENAME_ATTR}' for this cell.`);
        // console.log("Retrieved base filename:", baseFilename);

        // Extract C++ code only if needed (for WriteFile button)
        let cppCode = null;
        if (buttonElement.classList.contains('colab-cpp-w-button')) {
            // console.log("WriteFile action: attempting to extract code...");
            // **SELECTOR MAY NEED UPDATE** - Find editor container within the cell
            const editorElement = codeCellElement.querySelector('.monaco-editor'); // Assuming Monaco
            if (!editorElement) throw new Error("Could not find code editor element using '.monaco-editor'.");
            // console.log("Found editor element:", editorElement);

            // **SELECTOR MAY NEED UPDATE** - Find the container holding the visible lines
            const linesContainer = editorElement.querySelector('.view-lines');
            if (linesContainer) {
                // console.log("Found lines container '.view-lines'.");
                // **SELECTOR MAY NEED UPDATE** - Find individual line elements
                const codeLines = linesContainer.querySelectorAll('.view-line');
                if (codeLines.length > 0) {
                    const linesText = [];
                    codeLines.forEach(line => linesText.push(line.textContent || ""));
                    cppCode = linesText.join('\n');
                    // console.log(`Extracted ${codeLines.length} lines via Monaco selectors.`);
                } else {
                    // console.warn("Found '.view-lines' but no '.view-line' inside. Trying textContent fallback.");
                    cppCode = linesContainer.textContent || ""; // Fallback
                }
            } else {
                // Broader fallback if '.view-lines' isn't found
                // console.warn("Could not find lines container '.view-lines'. Trying overall editor textContent fallback.");
                cppCode = editorElement.textContent || "";
            }
            cppCode = cppCode.trim(); // Clean whitespace

            if (!cppCode) {
                console.warn("Code cell appears empty after extraction attempt.");
                // Let it proceed, %%writefile works with empty content.
            } else {
                 // console.log("Successfully extracted code for WriteFile (first 100 chars):", cppCode.substring(0, 100) + (cppCode.length > 100 ? "..." : ""));
            }
        }

        return { codeCellElement, baseFilename, cppCode };

    } catch (error) {
        console.error("Error in getCellInfo:", error);
        alert(`Error preparing command:\n${error.message}\n\nCheck console for details.`);
        return { codeCellElement: null, baseFilename: null, cppCode: null }; // Return nulls on failure
    }
}

// Simulates adding a new cell via shortcut and copies command to clipboard
// Removed referenceCell parameter as shortcut is global
async function addCellAndCopyToClipboard(command, alertMessage) {
    console.log(`Executing addCellAndCopyToClipboard for command: ${command.split('\n')[0]}...`);
    try {
        // --- Simulate Keyboard Shortcut ---
        const shortcutSimulated = await simulateColabAddCellShortcut();

        if (!shortcutSimulated) {
            // Error handling is done within simulateColabAddCellShortcut if it fails
            throw new Error("Failed to simulate the Ctrl+M, B keyboard shortcut.");
        }

        // If shortcut simulation was attempted (doesn't guarantee Colab reacted)...
        console.log("Keyboard shortcut simulated. Assuming new cell is being added...");

        // Short delay to allow Colab UI to react and potentially create the cell
        await new Promise(resolve => setTimeout(resolve, 350)); // Adjust delay if needed

        // --- Copy command to clipboard ---
        try {
            await navigator.clipboard.writeText(command);
            console.log("Command copied to clipboard successfully.");
            // Alert the user *after* copy is successful
            alert(`${alertMessage}\n\nCommand copied! Paste (Ctrl+V / Cmd+V) into the new cell below and run it.`);
        } catch (clipError) {
             console.error("Failed to copy command to clipboard:", clipError);
             // Alert user about the copy failure, but provide command
             alert(`Failed to automatically copy to clipboard (check console for errors).\n\nPlease manually copy and paste this command into the new cell:\n\n${command}`);
        }

    } catch (error) {
        console.error("Error in addCellAndCopyToClipboard:", error);
        alert(`Operation failed:\n${error.message}\n\nCheck console for details.`);
    }
}


// --- Initialization and Observation ---
// Watches for new cells being added to the page and adds buttons to them.

let initialScanComplete_step = false;

function scanAndAddStepButtons() {
    if (initialScanComplete_step) return; // Run initial scan only once
    console.log("Running initial scan for Step Runner buttons...");
    let buttonsAddedCount = 0;
    // **SELECTOR MAY NEED UPDATE** - Select all elements that are code cells
    document.querySelectorAll('.cell.code').forEach(codeCell => {
        // **SELECTOR MAY NEED UPDATE** - Find the toolbar within this specific code cell
        const toolbar = codeCell.querySelector('.cell-toolbar'); // Adjust if toolbar class/location changed
        if (toolbar) {
             addControlButtons(toolbar, codeCell);
             buttonsAddedCount++;
        } else {
            // console.warn("Initial scan: Found code cell, but couldn't find its toolbar:", codeCell.id || codeCell);
        }
    });
    console.log(`Initial scan complete. Processed ${buttonsAddedCount} existing cells.`);
    initialScanComplete_step = true; // Mark scan as done
}

// Use MutationObserver to detect cells added dynamically AFTER initial load
const observer_step = new MutationObserver((mutationsList) => {
    let foundNewToolbar = false;
    for (const mutation of mutationsList) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    // Check if the added node IS a code cell or CONTAINS one
                    let cellsToCheck = [];
                    // **SELECTOR MAY NEED UPDATE** - Check if added node is a code cell
                    if (node.matches && node.matches('.cell.code')) {
                        cellsToCheck.push(node);
                    } else if (node.querySelectorAll) {
                        // Check if the added node CONTAINS code cells
                         // **SELECTOR MAY NEED UPDATE** - Check for code cells within added node
                         cellsToCheck.push(...node.querySelectorAll('.cell.code'));
                    }

                    cellsToCheck.forEach(codeCell => {
                         // **SELECTOR MAY NEED UPDATE** - Find toolbar in the newly added cell
                        const toolbar = codeCell.querySelector('.cell-toolbar');
                        if (toolbar && !toolbar.querySelector('.colab-cpp-step-button')) { // Check if buttons not already there
                            // console.log("MutationObserver found new code cell toolbar. Adding buttons...");
                            addControlButtons(toolbar, codeCell);
                            foundNewToolbar = true;
                        } else if (toolbar && toolbar.querySelector('.colab-cpp-step-button')) {
                            // Buttons already exist, maybe cell was just moved/rerendered. Ignore.
                        } else {
                             // console.warn("MutationObserver found new code cell, but couldn't find its toolbar:", codeCell.id || codeCell);
                        }
                    });
                }
            });
        }
    }
    // if (foundNewToolbar) console.log("MutationObserver added buttons dynamically.");
});

// --- Start Observing ---
// **SELECTOR MAY NEED UPDATE** - Try specific container selectors first
let targetNode_step = document.querySelector('colab-shaded-scroller#notebook-container, #main-content, colab-standard-layout'); // Try multiple potential container selectors

// **FALLBACK LOGIC**
if (!targetNode_step) {
    console.warn("Could not find specific target node for MutationObserver using selectors. Falling back to observing document.body. This might be slightly less performant.");
    targetNode_step = document.body;
}

// Ensure we have a valid target node before observing
if (targetNode_step) {
    observer_step.observe(targetNode_step, { childList: true, subtree: true });
    console.log("MutationObserver started for Step Runner on:", targetNode_step.tagName, targetNode_step.id ? `#${targetNode_step.id}` : '', targetNode_step.className ? `.${targetNode_step.className.split(' ').join('.')}` : ''); // Log more info about the target

    // Run the initial scan after a delay to allow Colab UI to render fully
    // Use requestIdleCallback or longer timeout if Colab loads very slowly
    setTimeout(scanAndAddStepButtons, 3500); // Delay in milliseconds

} else {
    // This error should now be very unlikely unless document.body is somehow null
    console.error("CRITICAL ERROR: Could not find target node OR document.body for MutationObserver. Extension will not function correctly for dynamic content.");
}