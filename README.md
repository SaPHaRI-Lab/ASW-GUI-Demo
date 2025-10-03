# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

# ASW GUI - Affect-Sensing Wearable Designer

A modern React-based GUI application for a user study featuring interactive design of 2D models of affect-sensing wearables (ASW). This application allows users to drag-and-drop items onto a virtual jacket, customize colors, configure item behaviors, and create comprehensive wearable designs.

## Features

- **Interactive Color Selection**: Color wheel with gradient controls and RGB input
- **Drag-and-Drop Interface**: Right-click to create items on the jacket canvas
- **Item Management**: Configure movement patterns, speed, and custom names
- **Jacket Customization**: Change jacket colors and view (front/back)
- **State Persistence**: Automatic saving and loading of design state
- **Action Logging**: Track user interactions for study purposes
- **Responsive Design**: Works on various screen sizes

## Technology Stack

- **React 18** with TypeScript for component-based UI
- **Vite** for fast development and building
- **Zustand** for lightweight state management
- **Canvas API** for jacket and color wheel rendering
- **Modern CSS** with flexbox and grid layouts

## Project Structure

```
src/
├── components/          # React components
│   ├── ColorPicker.tsx
│   ├── JacketCanvas.tsx
│   ├── ItemControlPanel.tsx
│   └── JacketColorPicker.tsx
├── hooks/              # Custom React hooks
│   ├── useColorSelection.ts
│   └── useDragAndDrop.ts
├── store/              # State management
│   └── appStore.ts
├── types/              # TypeScript type definitions
│   └── index.ts
├── utils/              # Helper functions
│   └── colorUtils.ts
├── App.tsx             # Main application component
└── main.tsx           # Application entry point
```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository
2. Make sure you cd to asw-new. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`


### Instructions to see saved files

1. Open a new terminal. Make sure you cd to asw-new. Type:
    ```bash
    node server.js
    ```
2. To view the files in a dashboard format and delete or download files, go to http://localhost:3000/ASWGUIdash. To see the files, go to http://localhost:3000/files. 

## Usage

### Creating Items
- Right-click on the jacket to create new wearable items
- Items appear as colored shapes on the jacket surface

### Color Selection
- Use the color wheel to select colors for items
- Adjust the gradient slider to modify color intensity
- Enter RGB values manually for precise color control

### Item Configuration
- Click on any item to select it
- Configure movement patterns (static, rotating, pulsing, blinking)
- Adjust speed and add custom names
- Toggle flashing behavior
- Delete unwanted items

### Jacket Customization
- Use the jacket color picker to change the base jacket color
- Toggle between front and back views
- Adjust jacket color gradient

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Key Design Decisions

1. **Component Architecture**: Modular components for better maintainability
2. **State Management**: Zustand for simple, performant state management
3. **TypeScript**: Full type safety throughout the application
4. **Canvas Rendering**: Direct canvas manipulation for jacket visualization
5. **Auto-save**: Automatic state persistence to localStorage

## Customization

### Adding New Item Types
1. Update the `WearableItem` type in `src/types/index.ts`
2. Modify the rendering logic in `JacketCanvas.tsx`
3. Update the control panel in `ItemControlPanel.tsx`

### Changing Colors and Styling
- Modify `src/App.css` for visual styling
- Update color constants in `src/utils/colorUtils.ts`

### Replacing Placeholder Images
- Add your actual images to the `public/` folder
- Update the image paths in `App.tsx`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is for research and educational purposes.

## Research Context

This application is designed for user studies in the field of affect-sensing wearables. It provides researchers with:
- Detailed interaction logs
- User behavior tracking
- Design process insights
- Quantitative and qualitative data collection capabilities

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
