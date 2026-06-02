(() => {
  const COMMAND_RE = /git\s+checkout\s+-b\s+["']?[^\s"']+/i;
  const BRANCH_RE = /(git\s+checkout\s+-b\s+)(["']?)([^\s"']+)/i;
  const ISSUE_RE = /^[A-Z][A-Z0-9]+-\d+$/;
  const seenButtons = new WeakSet();
  const cache = new Map();
  let scheduled = false;

  const getIssueKey = () => {
    const url = new URL(location.href);
    const selected = url.searchParams.get("selectedIssue");
    if (selected && ISSUE_RE.test(selected)) return selected;

    const browse = location.pathname.match(/\/browse\/([A-Z][A-Z0-9]+-\d+)/);
    if (browse) return browse[1];

    const selectedInHash = location.hash.match(/\b([A-Z][A-Z0-9]+-\d+)\b/);
    return selectedInHash ? selectedInHash[1] : null;
  };

  const slugFirstName = (name) => {
    const first = String(name || "").trim().split(/\s+/)[0] || "";
    return first
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const getAssigneePrefix = async (issueKey) => {
    if (cache.has(issueKey)) return cache.get(issueKey);

    const promise = fetch(`/rest/api/3/issue/${encodeURIComponent(issueKey)}?fields=assignee`, {
      credentials: "include"
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => slugFirstName(data?.fields?.assignee?.displayName))
      .catch(() => "");

    cache.set(issueKey, promise);
    return promise;
  };

  const prefixCommand = (text, prefix) => {
    if (!prefix || !COMMAND_RE.test(text)) return text;

    return text.replace(BRANCH_RE, (_, lead, quote, branch) => {
      const nextBranch = branch.startsWith(`${prefix}-`) ? branch : `${prefix}-${branch}`;
      return `${lead}${quote}${nextBranch}`;
    });
  };

  const setInputValue = (element, value) => {
    const setter = Object.getOwnPropertyDescriptor(element.constructor.prototype, "value")?.set;
    if (setter) setter.call(element, value);
    else element.value = value;
  };

  const commandFromElement = (element) =>
    "value" in element ? element.value : element.textContent || "";

  const isCommandElement = (element) =>
    "value" in element || element.matches("pre, code") || element.children.length === 0;

  const addCopyButton = (element, prefix) => {
    const parent = element.parentElement;
    if (!parent || seenButtons.has(parent) || parent.querySelector("[data-jira-assignee-copy]")) return;

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Copiar +";
    button.dataset.jiraAssigneeCopy = "1";
    button.title = "Copia o comando com o primeiro nome do responsavel do card";
    button.style.cssText = [
      "margin-top:0",
      "margin-left:8px",
      "padding:0 10px",
      "height:32px",
      "min-width:72px",
      "border:1px solid #579dff",
      "border-radius:3px",
      "background:#1d7afc",
      "color:#fff",
      "display:inline-flex",
      "align-items:center",
      "justify-content:center",
      "align-self:center",
      "font:600 12px/1 sans-serif",
      "cursor:pointer"
    ].join(";");

    button.addEventListener("click", async () => {
      const command = prefixCommand(commandFromElement(element), prefix);
      await navigator.clipboard.writeText(command);
      button.textContent = "Copiado";
      setTimeout(() => {
        button.textContent = "Copiar +";
      }, 1200);
    });

    parent.appendChild(button);
    seenButtons.add(parent);
  };

  const applyPrefix = (prefix) => {
    const candidates = document.querySelectorAll("input, textarea, pre, code, span, div");

    for (const element of candidates) {
      const text = commandFromElement(element);
      if (!isCommandElement(element) || !text || text.length > 400 || !COMMAND_RE.test(text)) continue;

      const next = prefixCommand(text, prefix);
      if (next !== text) {
        if ("value" in element) setInputValue(element, next);
        else element.textContent = next;
      }

      addCopyButton(element, prefix);
    }
  };

  const run = async () => {
    scheduled = false;

    const issueKey = getIssueKey();
    if (!issueKey) return;

    const prefix = await getAssigneePrefix(issueKey);
    if (prefix) applyPrefix(prefix);
  };

  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    setTimeout(run, 300);
  };

  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true
  });

  window.addEventListener("popstate", schedule);
  window.addEventListener("hashchange", schedule);
  schedule();
})();
