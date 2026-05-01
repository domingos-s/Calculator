const SECRET_EXPRESSION = "1+7+2+9";
const NOTES_STORAGE_KEY = "calculator-pwa-notes";
const LAST_NOTE_STORAGE_KEY = "calculator-pwa-last-note";

const calculatorView = document.getElementById("calculatorView");
const notesView = document.getElementById("notesView");
const displayEl = document.getElementById("display");
const historyEl = document.getElementById("history");
const installBtn = document.getElementById("installBtn");

const notesListEl = document.getElementById("notesList");
const noteTitleEl = document.getElementById("noteTitle");
const noteBodyEl = document.getElementById("noteBody");
const newNoteBtn = document.getElementById("newNoteBtn");
const saveNoteBtn = document.getElementById("saveNoteBtn");
const deleteNoteBtn = document.getElementById("deleteNoteBtn");
const backToCalcBtn = document.getElementById("backToCalcBtn");

let expression = "";
let lastResult = null;
let deferredPrompt = null;

let notes = loadNotes();
let activeNoteId = loadLastNoteId() || (notes[0]?.id ?? null);

if (!notes.length) {
  const starter = createEmptyNote();
  starter.title = "Welcome";
  starter.body = "Enter 1+7+2+9 and tap = to open notes.\n\nReplace callogo.png with your real app icon when ready.";
  notes = [starter];
  activeNoteId = starter.id;
  persistNotes();
}

renderCalculator();
renderNotes();

document.querySelectorAll(".key").forEach((key) => {
  key.addEventListener("click", () => handleKeyPress(key));
});

newNoteBtn.addEventListener("click", () => {
  const note = createEmptyNote();
  notes.unshift(note);
  activeNoteId = note.id;
  persistNotes();
  renderNotes();
  noteTitleEl.focus();
});

saveNoteBtn.addEventListener("click", () => {
  const note = getActiveNote();
  if (!note) return;
  note.title = noteTitleEl.value.trim() || "Untitled note";
  note.body = noteBodyEl.value;
  note.updatedAt = Date.now();
  notes.sort((a, b) => b.updatedAt - a.updatedAt);
  persistNotes();
  renderNotes();
});

deleteNoteBtn.addEventListener("click", () => {
  if (!activeNoteId) return;
  notes = notes.filter((note) => note.id !== activeNoteId);
  if (!notes.length) {
    const note = createEmptyNote();
    notes = [note];
  }
  activeNoteId = notes[0].id;
  persistNotes();
  renderNotes();
});

noteTitleEl.addEventListener("input", updateDraftTimestamp);
noteBodyEl.addEventListener("input", updateDraftTimestamp);

backToCalcBtn.addEventListener("click", () => showView("calculator"));

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredPrompt = event;
  installBtn.classList.remove("hidden");
});

installBtn.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installBtn.classList.add("hidden");
});

window.addEventListener("appinstalled", () => {
  installBtn.classList.add("hidden");
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(console.error);
  });
}

function handleKeyPress(key) {
  const { value, action, fn } = key.dataset;

  if (fn) {
    appendFinanceFunction(fn);
    return;
  }

  if (value) {
    appendValue(value);
    return;
  }

  switch (action) {
    case "clear":
      expression = "";
      lastResult = null;
      historyEl.textContent = "";
      renderCalculator();
      break;
    case "toggle-sign":
      toggleSign();
      break;
    case "percent":
      applyPercent();
      break;
    case "equals":
      evaluateExpression();
      break;
    case "backspace":
      backspace();
      break;
    default:
      break;
  }
}

function appendFinanceFunction(fnName) {
  if (lastResult !== null && expression === String(lastResult)) {
    expression = "";
    lastResult = null;
  }
  expression += fnName;
  renderCalculator();
}

function backspace() {
  if (!expression) return;
  expression = expression.slice(0, -1);
  if (!expression) {
    lastResult = null;
  }
  renderCalculator();
}

function appendValue(value) {
  if (lastResult !== null && /[0-9.]/.test(value) && expression === String(lastResult)) {
    expression = "";
    lastResult = null;
  }

  if (value === "." && currentNumberSegment().includes(".")) return;

  if (isOperator(value)) {
    if (!expression && value !== "-") return;
    if (isOperator(expression.slice(-1))) {
      expression = expression.slice(0, -1) + value;
      renderCalculator();
      return;
    }
  }

  expression += value;
  renderCalculator();
}

function toggleSign() {
  if (!expression) return;
  const segment = currentNumberSegment();
  if (!segment) return;

  const start = expression.length - segment.length;
  if (segment.startsWith("-")) {
    expression = expression.slice(0, start) + segment.slice(1);
  } else {
    expression = expression.slice(0, start) + "-" + segment;
  }
  renderCalculator();
}

function applyPercent() {
  const segment = currentNumberSegment();
  if (!segment) return;

  const numeric = Number(segment);
  if (Number.isNaN(numeric)) return;

  const start = expression.length - segment.length;
  expression = expression.slice(0, start) + String(numeric / 100);
  renderCalculator();
}

function currentNumberSegment() {
  const match = expression.match(/-?\d*\.?\d+$/);
  return match ? match[0] : "";
}

function evaluateExpression() {
  const normalized = expression.replace(/\s+/g, "");
  if (normalized === SECRET_EXPRESSION) {
    historyEl.textContent = `${expression} =`;
    expression = "";
    displayEl.textContent = "Unlocked";
    showView("notes");
    return;
  }

  if (!expression) return;

  try {
    const sanitized = expression.replace(/×/g, "*").replace(/÷/g, "/");
    if (!/^[0-9+\-*/.,() a-zA-Z]+$/.test(sanitized)) {
      throw new Error("Invalid characters");
    }

    const result = Function("pv", "fv", "pmt", `"use strict"; return (${sanitized})`)(pv, fv, pmt);
    if (result === undefined || Number.isNaN(result) || !Number.isFinite(result)) {
      throw new Error("Invalid result");
    }

    historyEl.textContent = `${expression} =`;
    expression = String(trimResult(result));
    lastResult = expression;
    renderCalculator();
  } catch (error) {
    historyEl.textContent = "Error";
    expression = "";
    displayEl.textContent = "Error";
    lastResult = null;
  }
}

function trimResult(value) {
  return Number.isInteger(value) ? value : Number.parseFloat(value.toFixed(8));
}

function renderCalculator() {
  displayEl.textContent = expression || "0";
}

function showView(viewName) {
  const showCalculator = viewName === "calculator";
  calculatorView.classList.toggle("active", showCalculator);
  notesView.classList.toggle("active", !showCalculator);
}

function createEmptyNote() {
  const timestamp = Date.now();
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : String(timestamp + Math.random()),
    title: "Untitled note",
    body: "",
    updatedAt: timestamp,
  };
}

function loadNotes() {
  try {
    return JSON.parse(localStorage.getItem(NOTES_STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function persistNotes() {
  localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
  localStorage.setItem(LAST_NOTE_STORAGE_KEY, activeNoteId || "");
}

function loadLastNoteId() {
  return localStorage.getItem(LAST_NOTE_STORAGE_KEY);
}

function getActiveNote() {
  return notes.find((note) => note.id === activeNoteId) || null;
}

function renderNotes() {
  notes.sort((a, b) => b.updatedAt - a.updatedAt);
  const activeNote = getActiveNote() || notes[0] || null;
  if (activeNote) {
    activeNoteId = activeNote.id;
  }

  notesListEl.innerHTML = "";
  notes.forEach((note) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `note-item${note.id === activeNoteId ? " active" : ""}`;
    button.innerHTML = `
      <span class="note-item-title">${escapeHtml(note.title || "Untitled note")}</span>
      <span class="note-item-preview">${escapeHtml((note.body || "No content yet").slice(0, 42))}</span>
    `;
    button.addEventListener("click", () => {
      activeNoteId = note.id;
      persistNotes();
      renderNotes();
    });
    notesListEl.appendChild(button);
  });

  const note = getActiveNote();
  noteTitleEl.value = note?.title || "";
  noteBodyEl.value = note?.body || "";
  deleteNoteBtn.disabled = notes.length <= 1 && !(noteTitleEl.value || noteBodyEl.value);
}

function updateDraftTimestamp() {
  const note = getActiveNote();
  if (!note) return;
  note.title = noteTitleEl.value || "Untitled note";
  note.body = noteBodyEl.value;
  note.updatedAt = Date.now();
  persistNotes();
  renderNotes();
}


function pv(rate, periods, payment, futureValue = 0) {
  const r = Number(rate);
  const n = Number(periods);
  const pmtValue = Number(payment);
  const fvValue = Number(futureValue);
  if ([r, n, pmtValue, fvValue].some((num) => Number.isNaN(num)) || n <= 0) throw new Error("Invalid PV input");
  if (r === 0) return -(fvValue + pmtValue * n);
  return -((fvValue + pmtValue * ((1 + r) ** n - 1) / r) / ((1 + r) ** n));
}

function fv(rate, periods, payment, presentValue = 0) {
  const r = Number(rate);
  const n = Number(periods);
  const pmtValue = Number(payment);
  const pvValue = Number(presentValue);
  if ([r, n, pmtValue, pvValue].some((num) => Number.isNaN(num)) || n <= 0) throw new Error("Invalid FV input");
  if (r === 0) return -(pvValue + pmtValue * n);
  return -(pvValue * ((1 + r) ** n) + pmtValue * (((1 + r) ** n - 1) / r));
}

function pmt(rate, periods, presentValue, futureValue = 0) {
  const r = Number(rate);
  const n = Number(periods);
  const pvValue = Number(presentValue);
  const fvValue = Number(futureValue);
  if ([r, n, pvValue, fvValue].some((num) => Number.isNaN(num)) || n <= 0) throw new Error("Invalid PMT input");
  if (r === 0) return -(pvValue + fvValue) / n;
  const growth = (1 + r) ** n;
  return -((pvValue * growth + fvValue) * r / (growth - 1));
}

function isOperator(char) {
  return ["+", "-", "*", "/"].includes(char);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
