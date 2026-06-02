# Jira Branch Assignee Prefix

Extensao simples para Chrome que prefixa o comando de branch do Jira com o primeiro nome do responsavel do card.

Exemplo:

```txt
git checkout -b DEV-3412-bug-omni...
```

vira:

```txt
git checkout -b matheus-DEV-3412-bug-omni...
```

## Instalar no Chrome

1. Abra `chrome://extensions`.
2. Ative `Modo do desenvolvedor`.
3. Clique em `Carregar sem compactacao`.
4. Selecione esta pasta: `jira-branch-assignee-prefix`.
5. Recarregue a pagina do Jira.

## Observacoes

- Funciona em `*.atlassian.net`.
- Usa o campo nativo `assignee` do Jira.
- Se o card estiver sem responsavel, a extensao nao altera o comando.
