#!/usr/bin/env node
// Agent capture hook for the 8x assignment.
// Wired in .claude/settings.json to SessionStart, UserPromptSubmit and Stop.
// Appends the verbatim prompt and the final response of each turn to
// .agent-logs/YYYY-MM-DD_HH-MM-SS_<session-id>.md. Never blocks Claude: all errors are swallowed
// and written to .claude/hooks/.state/errors.log.

const fs = require('fs');
const path = require('path');

const PROJECT = 'fathom-clone';
const AUTHOR = 'NiraliNavadiya';
const TOOL = 'claude-code';

const projectDir = process.env.CLAUDE_PROJECT_DIR || path.resolve(__dirname, '..', '..');
const logDir = path.join(projectDir, '.agent-logs');
const stateDir = path.join(__dirname, '.state');

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function statePath(sessionId) {
  return path.join(stateDir, `${sessionId}.json`);
}

function loadState(sessionId) {
  try {
    return JSON.parse(fs.readFileSync(statePath(sessionId), 'utf8'));
  } catch {
    return {};
  }
}

function saveState(sessionId, state) {
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(statePath(sessionId), JSON.stringify(state, null, 2));
}

function readTranscript(transcriptPath) {
  try {
    return fs
      .readFileSync(transcriptPath, 'utf8')
      .split('\n')
      .filter((l) => l.trim())
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function isRealModel(model) {
  return typeof model === 'string' && model && !model.startsWith('<');
}

// Model of the most recent assistant message in the transcript, if any.
function modelFromTranscript(entries) {
  for (let i = entries.length - 1; i >= 0; i--) {
    const model = entries[i].message && entries[i].message.model;
    if (entries[i].type === 'assistant' && isRealModel(model)) return model;
  }
  return null;
}

// A user entry that is a typed prompt, not a tool result fed back to the model.
function isPromptEntry(entry) {
  if (entry.type !== 'user' || entry.isMeta || !entry.message) return false;
  const content = entry.message.content;
  if (typeof content === 'string') return true;
  return Array.isArray(content) && !content.some((c) => c && c.type === 'tool_result');
}

// Text of the last assistant message after the last prompt. Assistant messages are split across
// several transcript entries (one per content block) that share message.id.
function finalResponseFromTranscript(entries) {
  let start = 0;
  for (let i = entries.length - 1; i >= 0; i--) {
    if (isPromptEntry(entries[i])) {
      start = i + 1;
      break;
    }
  }
  const turn = entries.slice(start).filter((e) => e.type === 'assistant' && e.message);
  const withText = turn.filter(
    (e) => Array.isArray(e.message.content) && e.message.content.some((c) => c.type === 'text' && c.text.trim())
  );
  if (!withText.length) return null;
  const lastId = withText[withText.length - 1].message.id;
  const text = withText
    .filter((e) => e.message.id === lastId)
    .flatMap((e) => e.message.content.filter((c) => c.type === 'text').map((c) => c.text))
    .join('\n\n');
  return { text, model: withText[withText.length - 1].message.model };
}

function fileStamp(iso) {
  // 2026-10-22T18:25:03.123Z -> 2026-10-22_18-25-03
  return iso.slice(0, 19).replace('T', '_').replace(/:/g, '-');
}

function frontmatter(sessionId, state) {
  return [
    '---',
    `session_id: ${sessionId}`,
    `date: ${state.firstPromptTime.slice(0, 10)}`,
    `author: ${AUTHOR}`,
    `model: ${state.models.join(', ')}`,
    `tool: ${TOOL}`,
    `project: ${PROJECT}`,
    `total_exchanges: ${state.num}`,
    `first_prompt_time: ${state.firstPromptTime}`,
    `last_prompt_time: ${state.lastPromptTime}`,
    '---',
    '',
  ].join('\n');
}

// Rewrites the frontmatter (exchange count, last prompt time, models) and appends one entry.
function appendEntry(sessionId, state, entry) {
  fs.mkdirSync(logDir, { recursive: true });
  const file = path.join(logDir, state.logFile);
  let body;
  try {
    const existing = fs.readFileSync(file, 'utf8');
    body = existing.slice(existing.indexOf('\n---\n') + 5);
  } catch {
    body =
      `\n# Session Log - ${state.firstPromptTime.slice(0, 10)}\n\n` +
      `Session: \`${sessionId.slice(0, 8)}\` | Project: \`${PROJECT}\` | Author: \`${AUTHOR}\`\n\n---\n`;
  }
  fs.writeFileSync(file, frontmatter(sessionId, state) + body + entry);
}

function entry(type, num, sessionId, timestamp, model, text) {
  return (
    `\n[LOG_ENTRY type=${type} num=${num} session=${sessionId.slice(0, 8)}]\n` +
    `timestamp: ${timestamp}\n` +
    `model: ${model}\n\n` +
    `${text}\n\n`
  );
}

function noteModel(state, model) {
  if (!isRealModel(model)) return;
  state.model = model;
  state.models = state.models || [];
  if (!state.models.includes(model)) state.models.push(model);
}

function onSessionStart(input) {
  const state = loadState(input.session_id);
  noteModel(state, input.model);
  saveState(input.session_id, state);
}

function onPrompt(input) {
  const sessionId = input.session_id;
  const now = new Date().toISOString();
  const state = loadState(sessionId);
  noteModel(state, modelFromTranscript(readTranscript(input.transcript_path)));
  state.models = state.models || [];
  state.num = (state.num || 0) + 1;
  state.firstPromptTime = state.firstPromptTime || now;
  state.lastPromptTime = now;
  state.logFile = state.logFile || `${fileStamp(now)}_${sessionId}.md`;
  state.pending = true;
  appendEntry(sessionId, state, entry('PROMPT', state.num, sessionId, now, state.model || 'unknown', input.prompt || ''));
  saveState(sessionId, state);
}

async function onStop(input) {
  const sessionId = input.session_id;
  const state = loadState(sessionId);
  if (!state.logFile) return; // no prompt captured in this session yet

  // The transcript can lag the Stop event slightly, so retry briefly before falling back.
  let found = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    found = finalResponseFromTranscript(readTranscript(input.transcript_path));
    if (found && (!input.last_assistant_message || found.text.trim() === input.last_assistant_message.trim())) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  const text = (input.last_assistant_message && input.last_assistant_message.trim()) ? input.last_assistant_message : found && found.text;
  if (!text) return;
  if (!state.pending && text === state.lastResponse) return; // same Stop delivered twice

  noteModel(state, found && found.model);
  state.pending = false;
  state.lastResponse = text;
  const now = new Date().toISOString();
  appendEntry(sessionId, state, entry('RESPONSE', state.num, sessionId, now, state.model || 'unknown', text));
  saveState(sessionId, state);
}

async function main() {
  const input = JSON.parse(readStdin() || '{}');
  if (!input.session_id) return;
  if (input.hook_event_name === 'SessionStart') onSessionStart(input);
  else if (input.hook_event_name === 'UserPromptSubmit') onPrompt(input);
  else if (input.hook_event_name === 'Stop') await onStop(input);
}

main()
  .catch((err) => {
    try {
      fs.mkdirSync(stateDir, { recursive: true });
      fs.appendFileSync(path.join(stateDir, 'errors.log'), `${new Date().toISOString()} ${err.stack || err}\n`);
    } catch {}
  })
  .finally(() => process.exit(0));
