import browser from 'webextension-polyfill';
import { ZenginApiError, getBranch, searchBanks, searchBranches } from '../api/client';
import type { Bank, Branch, BankSummary, BranchSummary } from '../api/types';
import { debounce } from '../shared/debounce';
import { toHalfWidthKana } from '../shared/kana';
import { isSeedSearchMessage } from '../shared/messages';
import { takePendingSearchTerm } from '../shared/pendingSearch';
import { normalizeSearchQuery } from '../shared/searchQuery';

const SEARCH_DEBOUNCE_MS = 400;

function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`要素が見つかりません: #${id}`);
  return el as T;
}

const bankForm = byId<HTMLFormElement>('bank-search-form');
const bankQueryInput = byId<HTMLInputElement>('bank-query');
const bankStatus = byId<HTMLElement>('bank-status');
const bankResults = byId<HTMLUListElement>('bank-results');

const branchSection = byId<HTMLElement>('branch-section');
const selectedBankEl = byId<HTMLElement>('selected-bank');
const branchForm = byId<HTMLFormElement>('branch-search-form');
const branchQueryInput = byId<HTMLInputElement>('branch-query');
const branchStatus = byId<HTMLElement>('branch-status');
const branchResults = byId<HTMLUListElement>('branch-results');

const detailSection = byId<HTMLElement>('detail-section');
const detailList = byId<HTMLDListElement>('detail-list');
const copyFeedback = byId<HTMLElement>('copy-feedback');

let selectedBank: Bank | null = null;
let bankSearchController: AbortController | null = null;
let branchSearchController: AbortController | null = null;

function setStatus(el: HTMLElement, message: string): void {
  el.textContent = message;
}

function clearChildren(el: HTMLElement): void {
  el.replaceChildren();
}

function describeError(err: unknown): string {
  if (err instanceof ZenginApiError) {
    if (err.status === 0) return '通信エラーが発生しました。ネットワーク接続を確認してください。';
    return `検索中にエラーが発生しました(${err.message})`;
  }
  return '予期しないエラーが発生しました。';
}

async function runBankSearch(rawQuery: string): Promise<void> {
  const query = rawQuery.trim();
  clearChildren(bankResults);
  if (!query) {
    setStatus(bankStatus, '');
    return;
  }

  bankSearchController?.abort();
  const controller = new AbortController();
  bankSearchController = controller;
  setStatus(bankStatus, '検索中…');

  try {
    const result = await searchBanks(normalizeSearchQuery(query), controller.signal);
    if (controller.signal.aborted) return;
    if (result.banks.length === 0) {
      setStatus(bankStatus, '該当する銀行が見つかりませんでした。');
      return;
    }
    setStatus(bankStatus, `${result.banks.length}件見つかりました。`);
    for (const bank of result.banks) {
      bankResults.appendChild(renderBankResult(bank));
    }
  } catch (err) {
    if (controller.signal.aborted) return;
    setStatus(bankStatus, describeError(err));
  }
}

function renderBankResult(bank: Bank): HTMLLIElement {
  const li = document.createElement('li');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'result-item';
  button.textContent = `${bank.name}(${bank.code})`;
  button.addEventListener('click', () => selectBank(bank));
  li.appendChild(button);
  return li;
}

function selectBank(bank: Bank): void {
  selectedBank = bank;
  branchSection.hidden = false;
  setStatus(selectedBankEl, `選択中の銀行: ${bank.name}(${bank.code})`);

  branchQueryInput.value = '';
  clearChildren(branchResults);
  setStatus(branchStatus, '');
  detailSection.hidden = true;
  clearChildren(detailList);

  branchQueryInput.focus();
}

async function runBranchSearch(rawQuery: string): Promise<void> {
  if (!selectedBank) return;
  const bank = selectedBank;
  const query = rawQuery.trim();
  clearChildren(branchResults);
  if (!query) {
    setStatus(branchStatus, '');
    return;
  }

  branchSearchController?.abort();
  const controller = new AbortController();
  branchSearchController = controller;
  setStatus(branchStatus, '検索中…');

  try {
    const result = await searchBranches(bank.code, normalizeSearchQuery(query), controller.signal);
    if (controller.signal.aborted) return;
    if (result.branches.length === 0) {
      setStatus(branchStatus, '該当する支店が見つかりませんでした。');
      return;
    }
    setStatus(branchStatus, `${result.branches.length}件見つかりました。`);
    for (const branch of result.branches) {
      branchResults.appendChild(renderBranchResult(branch));
    }
  } catch (err) {
    if (controller.signal.aborted) return;
    setStatus(branchStatus, describeError(err));
  }
}

function renderBranchResult(branch: BranchSummary): HTMLLIElement {
  const li = document.createElement('li');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'result-item';
  button.textContent = `${branch.name}(${branch.code})`;
  button.addEventListener('click', () => void selectBranch(branch));
  li.appendChild(button);
  return li;
}

async function selectBranch(branchSummary: BranchSummary): Promise<void> {
  if (!selectedBank) return;
  const bank = selectedBank;
  setStatus(branchStatus, '取得中…');
  try {
    const result = await getBranch(bank.code, branchSummary.code);
    renderDetail(result.bank, bank, result.branch);
    setStatus(branchStatus, '');
  } catch (err) {
    setStatus(branchStatus, describeError(err));
  }
}

function renderDetail(bankSummary: BankSummary, bank: Bank, branch: Branch): void {
  detailSection.hidden = false;
  clearChildren(detailList);

  addDetailRow('銀行名', bankSummary.name || bank.name);
  addDetailRow('銀行コード', bank.code);
  if (bank.kana) addDetailRow('銀行名(半角カナ)', toHalfWidthKana(bank.kana));

  addDetailRow('支店名', branch.name);
  addDetailRow('支店コード', branch.code);
  if (branch.kana) addDetailRow('支店名(半角カナ)', toHalfWidthKana(branch.kana));
}

function addDetailRow(label: string, value: string): void {
  const dt = document.createElement('dt');
  dt.textContent = label;

  const dd = document.createElement('dd');
  const valueSpan = document.createElement('span');
  valueSpan.className = 'detail-value';
  valueSpan.textContent = value;

  const copyButton = document.createElement('button');
  copyButton.type = 'button';
  copyButton.className = 'copy-button';
  copyButton.textContent = 'コピー';
  copyButton.addEventListener('click', () => void copyValue(label, value, copyButton));

  dd.append(valueSpan, copyButton);
  detailList.append(dt, dd);
}

async function copyValue(label: string, value: string, button: HTMLButtonElement): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
    announceCopy(`${label}をコピーしました。`);
    flashButton(button, 'コピーしました');
  } catch {
    announceCopy(`${label}のコピーに失敗しました。`);
  }
}

function announceCopy(message: string): void {
  copyFeedback.textContent = message;
}

function flashButton(button: HTMLButtonElement, tempText: string): void {
  const original = button.textContent;
  button.textContent = tempText;
  button.disabled = true;
  window.setTimeout(() => {
    button.textContent = original;
    button.disabled = false;
  }, 1500);
}

const debouncedBankSearch = debounce((q: string) => void runBankSearch(q), SEARCH_DEBOUNCE_MS);
const debouncedBranchSearch = debounce((q: string) => void runBranchSearch(q), SEARCH_DEBOUNCE_MS);

bankForm.addEventListener('submit', (event) => {
  event.preventDefault();
  debouncedBankSearch.cancel();
  void runBankSearch(bankQueryInput.value);
});
bankQueryInput.addEventListener('input', () => {
  debouncedBankSearch(bankQueryInput.value);
});

branchForm.addEventListener('submit', (event) => {
  event.preventDefault();
  debouncedBranchSearch.cancel();
  void runBranchSearch(branchQueryInput.value);
});
branchQueryInput.addEventListener('input', () => {
  debouncedBranchSearch(branchQueryInput.value);
});

function applySeedTerm(term: string): void {
  // 検索欄に反映するだけで、ここではAPIを呼び出さない。
  // 実際の検索はユーザーが検索を実行(Enter/検索ボタン)して初めて行われる。
  debouncedBankSearch.cancel();
  bankQueryInput.value = term;
  bankQueryInput.focus();
}

async function init(): Promise<void> {
  // 右クリック検索で引き継がれた文字列があれば検索欄に反映する(新規ウィンドウ作成時)。
  const pending = await takePendingSearchTerm(browser.storage.local);
  if (pending) {
    applySeedTerm(pending);
  } else {
    bankQueryInput.focus();
  }
}

// 検索ウィンドウを再利用(フォーカスするだけ)した場合、popup.htmlは再読み込みされず
// init()が再実行されないため、バックグラウンドからのメッセージで新しい検索語を受け取る。
browser.runtime.onMessage.addListener((message: unknown) => {
  if (isSeedSearchMessage(message)) {
    applySeedTerm(message.term);
  }
});

void init();
