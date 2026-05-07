# Project Overview

This repository appears to be a modern JavaScript/TypeScript project, structured using a build tool like Vite, and includes specific directories for source code, build artifacts, and configuration.

## Directory Structure Breakdown

*   **`src/`**:
    *   This is the primary location for all application source code. Development and new features should be implemented here.
*   **`dist/`**:
    *   This directory will contain the **production build** output of the application after running the build script (e.g., `npm run build`).
*   **`node_modules/`**:
    *   Contains all installed third-party dependencies required by the project. **(Do not edit manually)**.
*   **`vite.config.js`**:
    *   The configuration file for Vite, which manages the build process, hot module replacement, and development server setup.
*   **`package.json` / `package-lock.json` / `pnpm-lock.yaml`**:
    *   These files manage the project's metadata, execution scripts (e.g., `dev`, `build`, `test`), and declare the exact versions of required external libraries.
*   **`*.md` Files**:
    *   **`AGENTS.md`**: Likely contains documentation or guidelines related to the use of AI agents for development tasks within this project.
    *   **`README.md` (This file)**: Acts as the main entry point documentation.
*   **`.vscode/`**:
    *   Contains workspace-specific settings for Visual Studio Code users.
*   **`tmp/`**:
    *   A directory intended for temporary files generated during the build or runtime process.

## Summary of Technology Stack

Based on the file names (`vite.config.js`, `package.json`, `src/`), this project is most likely a **JavaScript/TypeScript** application built using **Vite**, suggesting a focus on modern front-end or full-stack development practices.

---
*Note: Always consult the `package.json` for the definitive list of build commands and scripts.*