# The Guild

A fantasy guild management RPG where you run an adventurer's guild. Recruit characters, chat with them at the tavern, send parties out on quests, and watch your guild grow — all powered by a local LLM running on your own machine.

## What it does

- **Guild Tavern** — Your adventurers hang out in the tavern, barracks, and armory each day. Chat with them one-on-one or with groups, and they'll remember past conversations and quests.
- **Quests** — Post contracts on the notice board, assign a party, and send them off. Quests run in the background while you continue managing the guild. Characters are away for as many days as the quest has rooms (one day per room), and their results — XP, gold, items, and relationship changes — are revealed when they return.
- **Quest Log** — Review completed quests with a full LLM-written narrative and a raw combat log toggle. Pending quests show their expected return day.
- **Characters** — Each adventurer has D&D-style stats (27-point buy), a race, class, personality, and a relationship score with every other guild member that shifts based on quest outcomes and roleplay moments.
- **Armory & Shop** — Gear earned from quests lands in the armory. Buy supplies from the market.
- **Guild Events** — Random events fire between days, generating stories involving your characters.
- **LLM Integration** — Connects to any [KoboldAI](https://github.com/KoboldAI/KoboldAI-Client)-compatible server for quest narratives, character descriptions, and dialogue. The server can be running locally or on a rented GPU in the cloud.

## How character memory works

The core design challenge is giving characters persistent, relevant memory across sessions without overflowing the model's context window on every turn. The solution is a three-layer RAG-style retrieval system backed by SQLite, with keyword indexing, temporal parsing, and a token-budget-aware assembly step.

### Layer 1 — Base context (injected at conversation start)

On chat load, the last 3 conversation summaries for that character are fetched from the `chat_history` table and injected into the system prompt. Each entry is labelled with a human-readable relative game-day offset (`"yesterday"`, `"3 days ago"`) computed at render time from the current `game_day` value. Quest memories are deliberately excluded from this layer — they are too large to include unconditionally and are instead retrieved on demand by the layers below.

### Layer 2 — Keyword-indexed memory pool (per-message retrieval)

Every quest record and chat record is written to the DB with a pre-computed keyword array:

- **Quest keywords** — words (≥3 chars) extracted from the quest title, biome, party first names, and boss name, plus the difficulty and outcome strings.
- **Chat keywords** — capitalised words (regex `\b[A-Z][a-z]{2,}\b`) extracted from the raw message text, filtered against a hardcoded stopword list, capped at 10 per entry.

On each player turn, the full history pool is scored against the incoming message by counting keyword hits (`scoreMemoryRelevance`). Any record scoring ≥1 is promoted into an **active memory pool** held in a React ref for the duration of the conversation. Entries in the pool track a `lastMentionedAt` turn index that is refreshed whenever one of their keywords appears in any subsequent message.

At prompt assembly time, `buildActiveMemoryContext` sorts active memories by `lastMentionedAt` descending, then greedily packs them into the context string until the token budget is exhausted. Token budget is calculated as a fraction of the model's actual `max_context_length`, fetched live from the KoboldAI API at `/api/v1/config/max_context_length`. Token count is estimated at ~4 chars/token. A separate cap limits active quest memories to 1 at a time to prevent large narrative blobs from crowding out other memories.

### Layer 3 — Temporal context expansion (per-message, regex-driven)

A separate pass runs `detectTemporal` against each player message, scanning for time references using a set of regexes:

| Pattern | Resolution |
|---|---|
| `\btoday\b` | `currentDay` |
| `\byesterday\b` | `currentDay - 1` |
| `(\d+) days? ago` | `currentDay - N` |
| `last week` | window of last 7 days |
| `past (few\|couple) days?` / `recently` | window of last 3 days |
| `last (quest\|mission\|job\|...)` | most recent quest record |

When a match is found, `buildTemporalContext` queries `quest_history` and `chat_history` filtered to the resolved day range and injects the results as a separate context block for that turn only — it does not persist into the active memory pool.

### Relationship scores and combat feedback

Every character pair has a numeric relationship score stored in the `relationships` table. Scores shift by ±1 during roleplay scenes within quests (driven by scenario `relationshipDelta` values) and by ±5 on quest success/failure, capped at ±50 per quest outcome.

Before each quest room, the sum of all pairwise relationship scores is converted into an **advantage pool** (positive sum → re-rolls on failed checks) and a **jinx pool** (negative sum → forced re-rolls on successes). This creates a mechanical feedback loop: parties that get along fight better; parties with friction are less reliable.

Character opinions — short LLM-written summaries of how one character views another — are stored as a third memory type in the same keyword pool and surface in conversation when the relevant character is mentioned.

### Quest narrative pipeline

The quest simulation runs headlessly in a background async context (no React state). Each room generates a raw `eventSummary` string (mechanical: *"Combat: party vs X. Result: victory."*) captured before any LLM processing. In non-quick mode, each summary is individually narrated by the LLM in context of prior room narratives. At the end, the full ordered sequence of narrated events is passed to the LLM as a single prompt to be woven into one cohesive story.

Both the final narrative and the raw event log are stored separately in `quest_history.summary` and `quest_history.transcript`, allowing the quest log UI to toggle between the polished story and the mechanical record.

---

## Image generation

Character portraits are generated via a local [ComfyUI](https://github.com/comfyanonymous/ComfyUI) server. The app ships three workflows:

| Workflow | Model | Best for |
|---|---|---|
| `basic_image.json` | **zimage-turbo** (SDXL-based) | Fast generation, lower VRAM |
| `basic_flux.json` | **Flux2-Klein 9B** | High quality text-to-image |
| `image_edit/flux_with_char_input.json` | **Flux2-Klein 9B** | Consistent character portraits |

### Consistent characters without LoRAs

The `flux_with_char_input` workflow achieves **lora-free character consistency** using Flux2-Klein's image editing function. Rather than training a per-character LoRA, it takes an existing portrait of the character as input, encodes it as a reference latent via `ReferenceLatent`, and uses that as the conditioning anchor for the new generation. The model edits from the reference image rather than generating from scratch, so the character's face and key features remain stable across every new portrait — no fine-tuning required.

### Required ComfyUI custom nodes

Install missing nodes via the **ComfyUI Manager** (`Manager → Install Missing Custom Nodes` after loading a workflow):

**For `basic_image.json` (zimage-turbo):**
- [ComfyUI Impact Pack](https://github.com/ltdrdata/ComfyUI-Impact-Pack) — provides `FaceDetailer`, `SAMLoader`, and `UltralyticsDetectorProvider` for automatic face upscaling and refinement

**For `basic_flux.json` and `flux_with_char_input.json` (Flux2-Klein):**
- A Flux2 custom node pack providing `EmptyFlux2LatentImage`, `Flux2Scheduler`, and `ReferenceLatent` — search "Flux2" in the ComfyUI Manager node list

### Setup

1. Install and run [ComfyUI](https://github.com/comfyanonymous/ComfyUI)
2. Install the required custom nodes above via ComfyUI Manager
3. Download your chosen model and place it in ComfyUI's `models/unet/` folder
4. Point the app at your ComfyUI server URL in settings (default: `http://localhost:8188`)

Image generation is entirely optional — the app works without it.

---

## Requirements

- [Node.js](https://nodejs.org/) 18 or newer
- A KoboldAI-compatible LLM server — [KoboldCpp](https://github.com/LostRuins/koboldcpp) is recommended. This can be:
  - **Local** — run KoboldCpp directly on your machine if you have a capable GPU
  - **Cloud** — rent a GPU via a service like [RunPod](https://www.runpod.io/). The [official KoboldCpp RunPod template](https://console.runpod.io/hub/template/koboldcpp-official-template-text-image-voice?id=2peen7lpau) is a convenient starting point — deploy it, grab the public endpoint URL, and paste it into the app's settings.
  - Default endpoint: `http://localhost:5001` (change this in settings to point at a remote server)
  - Any model works; a 7B–13B instruction-tuned model gives good results

## Installation

### Desktop app (Windows — recommended)

The easiest way to run The Guild is as a standalone Windows desktop app via Electron.

**1. Clone the repo**

```bash
git clone https://github.com/bbillmaier/the_guild.git
cd the_guild
```

**2. Install dependencies**

```bash
npm install
```

**3. Build and launch**

```bash
npm run electron:build
```

The packaged app will appear in the `release/` folder. Run the installer or the `.exe` directly.

To launch in dev mode without packaging:

```bash
npm run electron:dev
```

---

### Mobile / browser (Expo)

You can also run the app on Android, iOS, or in a browser using Expo.

**1. Clone and install**

```bash
git clone https://github.com/bbillmaier/the_guild.git
cd the_guild
npm install
```

**2. Start the dev server**

```bash
npm start
```

Then press:
- `a` — open on Android (requires Android Studio / emulator)
- `i` — open on iOS (macOS + Xcode required)
- `w` — open in browser

> **Note:** The browser version uses localStorage for persistence. The native mobile version uses SQLite. Both connect to the same KoboldAI endpoint over your local network.

---

## Scripts

| Command | Description |
|---|---|
| `npm start` | Start the Expo dev server |
| `npm run web` | Run in browser only |
| `npm run electron:dev` | Build web output and launch Electron (no packaging) |
| `npm run electron:live` | Launch Electron pointing at Expo dev server (hot reload) |
| `npm run electron:build` | Package into a distributable Windows `.exe` |
| `npm run lint` | Run ESLint |

## Tech stack

- [Expo](https://expo.dev/) + [React Native](https://reactnative.dev/) + [Expo Router](https://expo.github.io/router/)
- [Electron](https://www.electronjs.org/) for desktop packaging
- SQLite via `expo-sqlite` (native) / `sql.js` (Electron) / `localStorage` (browser)
- [KoboldAI API](https://github.com/KoboldAI/KoboldAI-Client) for LLM text generation
- [ComfyUI](https://github.com/comfyanonymous/ComfyUI) for image generation (optional)
- TypeScript (strict mode)
