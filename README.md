<h1 align=center>⨯◯</h1>
<p align=center>
  <img width=340 height=475 src=https://github.com/user-attachments/assets/c4ce6a24-a3f7-4cc7-a99f-12b12e5a7807 />
</p>

<p align=center>A realtime web game built with websockets, Preact, and Astro.</p>


## 🔍 Browse Around...

- [/](./pages/index.astro) serves as the main menu, allowing to start a new game and to join an existing game with a shared code.
- [/connect](./pages/connect.ts) creates a websocket connection between the browser and the ["lobby"](./game/lobby.ts).
- [/world/:worldName](./pages/world/[worldName].astro) supports shareable links to automatically join a game.


## 📸 Screenshots

<p align=center>
  <img width=345 height=500 src=https://github.com/user-attachments/assets/65489140-b2ac-427b-8a95-80dc6dded4eb />
  <img width=345 height=500 src=https://github.com/user-attachments/assets/48f366ed-a404-4fc3-90c5-3a8753e75cd0 />
  <img width=345 height=500 src=https://github.com/user-attachments/assets/503a70e4-ae04-428a-8ec6-e2943c76375f />
  <img width=345 height=500 src=https://github.com/user-attachments/assets/1656002a-47e8-49a5-aea8-3a14a23c8e13 />
</p>

## 🕸️ Built on the Platform
- 🪄 [@starting-style](https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style) for animating microinteractions.
- 🖌️ [OKLCH](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/oklch) for visually consistent color palettes.
- 🗄️ [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) for saving player details and selected theme.
- 📡 [Service workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API) to prevent flash of "unthemed" content.

## 🏋️ Lightweight Libraries for the Heavylifting
- 🎨 [Emotion](https://emotion.sh/docs/introduction) for styling, [astro-emotion](https://www.npmjs.com/package/astro-emotion) to generate all classes at build time.
- 🔌 [astro-node-websocket](https://www.npmjs.com/package/astro-node-websocket) to add websocket support to Astro.
- 🧮 [@preact/signals](https://preactjs.com/guide/v10/signals) for state management.
- 🎊 [canvas-confetti](https://www.kirilv.com/canvas-confetti/) for victory celebrations.
- 🧮 [clsx](https://github.com/lukeed/clsx) for composing CSS classes.

## ✈️ Continuous Deployment

Using a GitHub Actions workflow and a bash script, changes are automatically deployed to the VPS running `sillystring.party`.
- The project is [configured](./astro.config.ts#L18) to build into a self-contained static bundle, not dependent on `node_modules`.
- [.github/workflows/deploy.yml](./.github/workflows/deploy.yml) builds the project, uploads the bundle as an [artifact](./.github/workflows/deploy.yml#L24), and [informs](./.github/workflows/deploy.yml#L33) the server of the artifact id.
- The [server script](./Caddyfile#L32) downloads the artifact and restarts the node server.

### 🔐 Secrets
- The GitHub Actions workflow knows a deploy token, which is required by the server when requesting a redeploy.
- The server knows a GitHub [access token](https://github.com/settings/personal-access-tokens), which is required by github.com when downloading artifacts.

## 🪓 Hacking

### 🚩 Getting Started

1. Clone the repository:
```bash
git clone https://github.com/lilnasy/tic-tac-toe
cd tic-tac-toe
```

2. Install dependencies:
```bash
pnpm install
```

To start the development server:
```bash
pnpm dev
```

The application will be available at `http://localhost:4321`


### 🏗️ Project Structure

- 🎮 [/game](./game): Game logic and state management.
- 📚 [/lib](./lib): Polyfills, state management helpers, IndexedDB persistence helpers, vite plugins.
- 🎞️ [/assets](./assets): Sound effects and favicons.
- 📃 [/pages](./pages): Astro file-based router.
- 🧩 [/components](./components): UI and interaction logic.
- 🛠️ [/patches](./patches): fixes to known issues in the libraries being used, and revert of preact's mangled code.

### 🏭 Building for Production

To create a production build:
```bash
pnpm build
```

Start the node server:
```bash
node --enable-source-maps dist/server/entry.mjs
```

Start caddy to create TLS certificates, manage cache, and serve the application:
```bash
caddy run --config ./Caddyfile
```

#### 🛫 Deploying as a service

Autorestart the server on failure, manage logs, and start the server on every boot by creating an OpenRC service.

Create the OpenRC service file in `/etc/init.d/tictactoe`:

```bash
#!/sbin/openrc-run
supervisor="supervise-daemon"
name="Tic Tac Toe"
description="Run a node server hosting the game."
command="node"
# adjust as necessary
command_args="--enable-source-maps /app/dist/server/entry.mjs"
command_background=true
pidfile="/run/tictactoe.pid"
output_log="/var/log/tictactoe.log"
error_log="/var/log/tictactoe.err"
```

Start the service:
```bash
service tictactoe start
```

Check uptime:
```bash
rc-status
```
