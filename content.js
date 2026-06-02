(() => {
  const COMMAND_RE = /git\s+checkout\s+-b\s+["']?[^\s"']+/i;
  const BRANCH_RE = /(git\s+checkout\s+-b\s+)(["']?)([^\s"']+)/i;
  const ISSUE_RE = /^[A-Z][A-Z0-9]+-\d+$/;
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
