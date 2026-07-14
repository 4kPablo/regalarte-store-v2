# Agent Guidelines for regalarte-store

This document provides essential context for AI agents working in this repository to ensure efficient and accurate operations.

## Project Overview
*   **Framework:** Astro with Tailwind CSS and TypeScript.
*   **Package Manager:** `pnpm` is used for all package management operations.

## Product Context
This project is an editable product catalog intended to become a reusable, sellable Pablolabs offering. It should be designed so the catalog can be replicated for multiple clients with low customization cost while preserving a polished, production-ready experience.

*   **Business owner:** Pablolabs, a web development agency.
*   **Primary goal:** Deliver a catalog template that can be adapted and sold to different businesses.
*   **Engineering priority:** Prefer reusable, configurable, and clearly separated catalog content and presentation over client-specific one-off implementations.
*   **Scope discipline:** Do not introduce tenant-specific assumptions, new packages, or irreversible architectural complexity without explicit instruction.

## Key Commands
*   **Install Dependencies:** `pnpm install`
*   **Start Development Server:** `pnpm run dev` (Runs on `localhost:4321`)
*   **Build for Production:** `pnpm run build`
*   **Preview Production Build:** `pnpm run preview`
*   **Run Astro CLI Commands:** `pnpm run astro <command>` (e.g., `pnpm run astro check` for type-checking)

## Architecture Notes
*   This is currently a **single-package project**. Although `pnpm-workspace.yaml` exists, it does not define any additional workspaces. Do not assume a monorepo structure or attempt to create new packages without explicit instruction.

## Verification
*   **Type-checking:** Use `pnpm run astro check`.
*   **Linting:** No explicit linting configuration (e.g., ESLint) was found in the repository. Assume default behavior or IDE-based linting.
