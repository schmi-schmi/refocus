# Refocus Todo App

A beautiful, interactive todo application with daily intentions tracking. Features a modern UI with a carousel of wellness activities and a functional todo system with client-side persistence (no backend) that automatically resets weekly.

## Features

### Todo System
- **Daily Tabs**: Switch between days of the week with tabs
- **Interactive Todos**: Add, edit, delete, and mark todos as complete
- **Smart Organization**: Completed todos move to the bottom and are grayed out
- **Soft Delete**: Deleted todos are hidden (not permanently erased)
- **Real-time Updates**: All changes are immediately reflected in the UI
- **Responsive Design**: Works on desktop and mobile devices

### UI Features
- **Modern Design**: Glassmorphism design with blur effects
- **Carousel**: Beautiful image carousel with wellness activities
- **Mind Dump**: Text area for free-form thoughts
- **Smooth Animations**: Hover effects and transitions throughout

## Setup (Frontend-only, no backend)

### Prerequisites
- None. Open the `index.html` file in a modern browser.

### Run locally
1. Double-click `index.html`, or
2. Serve the folder with any static file server (optional):
   ```bash
   python3 -m http.server 3000
   # then open http://localhost:3000
   ```

## Deployment

- You can host this as static files (e.g., GitHub Pages). No server required.

## Data Persistence

- Uses `localStorage` in the browser to persist todos per device/browser.
- Automatically resets at the start of each ISO week.

### Storage

The application uses browser `localStorage` to store todos with fields:
`id, text, day_of_week, completed, deleted, created_at, updated_at`.

## Usage

### Adding Todos
1. Select the day tab you want to add a todo to
2. Click the "+" button at the bottom of the todo list
3. Enter your todo text in the prompt
4. Press Enter or click OK

### Editing Todos
1. Click on the todo text to enter edit mode
2. Make your changes
3. Press Enter to save or Escape to cancel

### Completing Todos
1. Check the checkbox next to any todo
2. Completed todos will be grayed out and moved to the bottom

### Deleting Todos
1. Hover over a todo item to reveal the action buttons
2. Click the trash icon (🗑️) to delete
3. Confirm the deletion in the prompt

## File Structure

```
refocus/
├── index.html         # Main HTML file with todo component (frontend-only)
├── css/
│   └── styles.css     # All styling including todo styles
└── img/               # Carousel images
```

## Technologies Used

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Storage**: Browser localStorage (no setup required)
- **Styling**: Custom CSS with glassmorphism effects

## Development

The application is purely client-side:
- **Client**: Manages UI state, storage, and user interactions
- **Storage**: Persistent in localStorage with soft delete capability and weekly reset
