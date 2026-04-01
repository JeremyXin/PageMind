# PageMind

> An AI-powered Chrome extension that turns any webpage into a smart conversation — summarize, translate, explain, and rewrite content without leaving the page.

---

## Why PageMind?

The web is full of information, but reading and processing it all takes time. You open a long article, a research paper, or a foreign-language page — and you just want the key points, a quick translation, or a plain-English explanation.

PageMind brings AI assistance directly into your browser. Select any text and act on it instantly, or open the side panel to have a real conversation about the page you're reading. No switching tabs, no copy-pasting into ChatGPT, no friction.

---

## Key Features

### 🗂️ AI-Powered Page Summarization
Instantly generate a structured summary of any webpage from the side panel. PageMind reads the page content and condenses it into clear, readable key points.

### 💬 Contextual AI Chat
Chat with an AI that already understands the page you're on. Ask follow-up questions, request clarifications, or dive deeper — the AI uses the page as context for every response, with streaming output for a fast, natural feel.

### 🔤 Floating Toolbar on Text Selection
Select any text on a webpage and a sleek floating toolbar appears instantly. Three actions, one click:
- **💡 Explain** — Get a clear explanation of the selected text
- **🌐 Translate** — Translate the text into your preferred language
- **✏️ Rewrite** — Rewrite the text in a different style or tone

### ⚡ Slash Commands
Type `/` in the chat input to access powerful shortcut commands:

| Command | Description |
|---------|-------------|
| `/summarize` | Summarize the current page |
| `/translate` | Translate page content |
| `/rewrite` | Rewrite selected content |
| `/shorter` | Shorten the content |
| `/longer` | Expand the content |
| `/eli5` | Explain like I'm 5 |
| `/pros-cons` | Pros & cons analysis |
| `/actions` | Extract action items |
| `/new` | Start a new chat session |
| `/clear` | Clear current chat |
| `/help` | Show all commands |

### 🗂️ Session History
All conversations are saved automatically. Switch between past sessions, search through history, and pick up where you left off — everything is stored locally in your browser.

### 🔍 Search Across Conversations
Search through all your past AI conversations by keyword. Find any previous summary, explanation, or translation in seconds.

### 🖱️ Right-Click Context Menu
Right-click on any selected text to access Explain, Translate, and Rewrite directly from the browser context menu.

---

## Demo

> *(Screenshots / GIF coming soon)*

### Floating Toolbar
When you select text on any webpage, a minimal floating toolbar appears above the selection. Click an action to instantly process the selected text.

### Side Panel Chat
Open the side panel to chat with the AI about the current page. The AI has full context of the page content and streams responses in real time.

---

## How to Use

### Installation (Developer Mode)

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/pagemind.git
   cd pagemind
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Build the extension**
   ```bash
   bun run build
   ```

4. **Load in Chrome**
   - Open Chrome and go to `chrome://extensions`
   - Enable **Developer mode** (top right toggle)
   - Click **Load unpacked**
   - Select the `.output/chrome-mv3` folder

5. **Configure your API key**
   - Click the PageMind extension icon in Chrome
   - Open **Settings** (gear icon in the side panel)
   - Enter your OpenAI API key
   - Save and start using PageMind

### Using the Floating Toolbar
1. Navigate to any webpage
2. Select any text (at least 3 characters)
3. A floating toolbar appears above the selection
4. Click **💡 Explain**, **🌐 Translate**, or **✏️ Rewrite**
5. The result opens in the side panel

### Using the Side Panel
1. Click the PageMind icon in the Chrome toolbar to open the side panel
2. Navigate to a webpage — PageMind will auto-summarize it
3. Ask questions about the page in the chat input
4. Use `/` to trigger slash commands for quick actions

### Using Slash Commands
1. Click in the chat input
2. Type `/` to open the command picker
3. Use arrow keys to navigate, Enter to select
4. Or keep typing to filter commands (e.g., `/sum` → `/summarize`)

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Extension framework | [WXT](https://wxt.dev/) |
| UI | React + TypeScript |
| Styling | Tailwind CSS (side panel) |
| AI | OpenAI API (streaming) |
| Storage | Chrome `storage.local` |
| Testing | Vitest |
| Build | Bun |

---

## Development

```bash
# Install dependencies
pnpm install

# Start dev server with hot reload
pnpm dev

# Build for production
bun run build

# Run tests
npx vitest run

# Type check
pnpm compile
```

---

## Requirements

- Chrome 114+ (Manifest V3 + Side Panel API)
- An OpenAI API key

---

## License

MIT © 2024

---

*Built with [WXT](https://wxt.dev/) + React + TypeScript*
