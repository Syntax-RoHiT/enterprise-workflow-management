# Nexus - Enterprise Task & Workflow Management

![Nexus Banner](https://lovable.dev/opengraph-image-p98pqg.png)

Nexus is a powerful, modern SaaS application designed to combine the power of Jira, the flexibility of Notion, and the speed of Linear into a single, cohesive task and workflow platform. Built with performance and user experience in mind, Nexus provides rapid, local-first data management with a sleek, customizable interface.

---

## 🌟 Key Features

*   **Local-First Architecture**: Organization, team, and user management functions entirely within the browser via a robust Local Storage mock-DB, allowing for instant onboarding and zero-latency interactions without a backend server.
*   **Dynamic Theme Engine**: Features 6 distinct, professionally curated color palettes (`Midnight`, `Daylight`, `Ocean`, `Sunset`, `Forest`, `Cyberpunk`) that dynamically adjust CSS variables for a highly personalized user experience.
*   **Organization & Team Management**: Create organizations, generate secure 6-character passcodes, and join workspaces autonomously. Includes role-based access control (Admin, Member, Viewer).
*   **Command Palette**: Global, keyboard-driven `⌘K` command interface for rapid navigation, searching tasks, and triggering actions anywhere in the app.
*   **Enterprise-Grade UI**: Built utilizing modern design principles (Glassmorphism, micro-animations, accessible Radix UI primitives, and Tailwind CSS) to deliver a truly premium look and feel.
*   **Optimized Performance**: Codebase is fully optimized, with strict type safety, zero unnecessary comments, and lightning-fast Vite build processes.

## 🛠️ Tech Stack

*   **Frontend Framework**: React 18 (TypeScript)
*   **Build Tool**: Vite
*   **Styling**: Tailwind CSS + CSS Variables (Custom Theme Engine)
*   **Component Library**: shadcn/ui (Radix Primitives)
*   **State Management**: React Query (TanStack) & Context API
*   **Routing**: React Router DOM
*   **Icons**: Lucide React

## 🚀 Getting Started

To run this project locally, follow these steps:

### Prerequisites

Make sure you have [Node.js](https://nodejs.org/) (v18 or higher) and `npm` installed.

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/YOUR_USERNAME/enterprise-workflow-management.git
    cd enterprise-workflow-management
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Start the development server**
    ```bash
    npm run dev
    ```

4.  **Open your browser**
    Navigate to `http://localhost:5173/` to see the application running.

## 📸 Usage & Highlights

1.  **Create an Organization**: Click on the workspace switcher in the top left, select "Create Organization", and establish your team.
2.  **Manage Teams**: Navigate to the Team page to view your Organization's auto-generated Passcode. Share this passcode to allow others (or other browser sessions) to instantly join your workspace.
3.  **Customize UI**: Go to Settings to toggle between Light/Dark mode and choose from 6 dynamic, aesthetic color themes.
4.  **Keyboard Shortcuts**: Press `Ctrl+K` or `Cmd+K` from anywhere to launch the global Command Palette.

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.
