# Colab C++ Step Runner

A simple Chrome Extension to assist with compiling and running C++ code snippets within Google Colab notebooks by providing convenient command generation buttons.

## Problem Solved

Running C++ code in Google Colab typically requires manually typing a sequence of commands:
1.  `%%writefile <filename>.cpp` to save the code.
2.  `!g++ <filename>.cpp -o <executable>` to compile it.
3.  `!./<executable>` to run it.

This can be tedious, especially when learning C++, testing small snippets frequently, or working alongside tutorials/notes where you want quick feedback. This extension aims to streamline this process.

## Features

*   Adds three buttons to the toolbar of each **Code Cell** in Google Colab:
    *   **`[W] WriteFile`**: Extracts the code from the current cell, generates the appropriate `%%writefile` command with a unique filename, and copies this command to the clipboard.
    *   **`[C] Compile`**: Generates the `!g++ ...` command to compile the `.cpp` file associated with that cell (using the unique filename generated by `[W]`) and copies the command to the clipboard. Includes `-std=c++17` and `-Wall` flags.
    *   **`[R] Run`**: Generates the `./executable` command to run the compiled program associated with that cell and copies the command to the clipboard.
*   Provides alerts to confirm which command has been copied.
*   Uses unique temporary filenames for each cell to avoid conflicts.

## Installation (from source)

1.  Download or clone this repository to your local machine.
2.  Open Google Chrome and navigate to `chrome://extensions/`.
3.  Enable **Developer mode** using the toggle switch (usually in the top right corner).
4.  Click the **"Load unpacked"** button.
5.  Select the folder where you downloaded/cloned this repository (the folder containing `manifest.json`).
6.  The extension should now be installed and active.

## Usage Workflow

**Important:** This extension *copies* the necessary commands. It does **not** automatically create new cells or paste/run the commands for you due to technical limitations and security restrictions in web browsers and Colab.

1.  **Write C++ Code:** Type or paste your C++ code into a Colab code cell.
2.  **Click `[W] WriteFile`:** Click the `[W]` button on that cell's toolbar. An alert will confirm the `%%writefile` command is copied.
3.  **Add Cell & Paste:** Manually add a new code cell below (e.g., using Colab's UI or the `Ctrl+M, B` / `Cmd+M, B` shortcut). Paste (Ctrl+V / Cmd+V) the copied command into this new cell.
4.  **Run WriteFile:** Run the cell containing the `%%writefile` command (Shift+Enter).
5.  **Click `[C] Compile`:** Click the `[C]` button on the *original* cell containing your C++ code. An alert will confirm the `!g++` command is copied.
6.  **Add Cell & Paste:** Manually add another new code cell. Paste the copied compile command into it.
7.  **Run Compile:** Run the cell containing the `!g++` command. Check the output for any compilation errors.
8.  **Click `[R] Run`:** Click the `[R]` button on the *original* cell. An alert will confirm the `./executable` command is copied.
9.  **Add Cell & Paste:** Manually add another new code cell. Paste the copied run command into it.
10. **Run Execute:** Run the cell containing the `./executable` command to see your program's output or provide input if needed.

## Known Issues & Limitations

*   **!!! SELECTOR BRITTLENESS !!!:** Google Colab frequently updates its web interface. The CSS selectors used in `content_step.js` to find code cells, toolbars, and editor elements **will likely break** over time. If the buttons don't appear, or the `[W]` button fails to extract code (giving "Code cell appears empty" warnings when it's not), **you will need to manually inspect the Colab page elements** (Right-click -> Inspect) and **update the corresponding `document.querySelector(...)` or `element.querySelector(...)` lines** in `content_step.js`. Look for comments like `// **SELECTOR MAY NEED UPDATE**`.
*   **Manual Steps Required:** As noted above, cell creation and command pasting/running are **manual**. This extension only provides the commands.
*   **Code Extraction Errors:** If the selectors for the code editor (`.monaco-editor`, `.view-lines`, `.view-line`, etc.) are incorrect due to Colab updates, the `[W] WriteFile` command might contain empty or incorrect code. **Fixing these selectors is crucial.**
*   **Single File Only:** This extension is designed for simple, single-file C++ programs. It does not handle Makefiles, multiple source files, or complex library linking.
*   **Clipboard Permission:** The extension requires permission to write to your clipboard.
