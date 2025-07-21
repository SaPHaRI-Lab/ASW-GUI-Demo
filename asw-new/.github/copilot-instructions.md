# Copilot Instructions for ASW GUI Application

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview
This is a React + TypeScript application for a user study, Affect Sensing Wearables (ASW) featuring an interactive GUI to create a design for a jacket. The application uses modern web technologies and follows component-based architecture.

## Key Technologies
- **React 18** with TypeScript for component-based UI
- **Vite** for fast development and building
- **@dnd-kit** for drag-and-drop functionality
- **Konva/React-Konva** for canvas-based jacket visualization
- **Zustand** for lightweight state management
- **React-Color** for color picker components

## Architecture Guidelines
- Keep code minimal and maintainable
- Use functional components with hooks
- Implement proper TypeScript interfaces for all data structures
- Follow component composition patterns
- Separate business logic into custom hooks
- Use proper error boundaries and loading states

## Key Features to Maintain
1. **Color Selection System**: Interactive color wheel with RGB controls and gradient adjustments
2. **Drag-and-Drop Interface**: Items can be dragged onto jacket canvas
3. **Canvas Rendering**: Jacket visualization with real-time color updates
4. **Item Management**: Create, select, move, and configure wearable items
5. **State Persistence**: Save/load application state
6. **Action Logging**: Track user interactions for study purposes

## Component Structure
- `components/`: Reusable UI components
- `hooks/`: Custom React hooks for business logic
- `store/`: Zustand state management
- `types/`: TypeScript type definitions
- `utils/`: Helper functions and utilities

## Coding Conventions
- Use PascalCase for components
- Use camelCase for functions and variables
- Prefer composition over inheritance
- Write descriptive commit messages
- Add JSDoc comments for complex functions
- Use proper TypeScript types instead of `any`
