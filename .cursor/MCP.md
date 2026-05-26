# MCP — MapTuu (Cursor)

Configuración en [`.cursor/mcp.json`](./mcp.json).

## Servidores de este proyecto (nombres en Cursor)

| ID en `mcp.json` | En Settings → MCP | Uso |
|------------------|-----------------|-----|
| **`atlassian-rovo`** | Lista como **`atlassian-rovo`** (no uses otro Atlassian duplicado) | Jira/Confluence **maptuu.atlassian.net** vía OAuth (Rovo) |
| **`github`** | Lista como **`github`** | PRs, issues, repos (complementa `/write-pr`) |

Si ves **dos** entradas Atlassian, deja solo **`atlassian-rovo`** del proyecto y elimina/desactiva **Atlassian-MCP-Server** (suele ser MCP global duplicado en `~/.cursor/mcp.json`).

---

## 1. Atlassian Rovo (`atlassian-rovo`)

1. **Settings → MCP** → servidor **`atlassian-rovo`**.
2. Activar toggle y pulsar **Connect**.
3. Login Atlassian → sitio **`maptuu.atlassian.net`**.
4. Debe quedar en verde con tools habilitadas (~39 tools).

No requiere variables en `.cursor/mcp.env.example` (OAuth).

---

## 2. GitHub (`github`)

### Token

En `~/.zshrc` (o Cursor MCP env):

```bash
export GITHUB_PERSONAL_ACCESS_TOKEN="ghp_..."
```

Plantilla: [`.cursor/mcp.env.example`](./mcp.env.example).  
PAT: GitHub → Settings → Developer settings → scope `repo`.

### Error `spawn npx ENOENT`

Cursor a veces **no ve `npx`** si se abrió desde el Dock (PATH sin Node/nvm).

Este repo usa **zsh login** para lanzar GitHub MCP:

```json
"command": "/bin/zsh",
"args": ["-ilc", "npx -y @modelcontextprotocol/server-github"]
```

Si sigue fallando:

1. Comprueba en terminal: `which npx` (debe existir).
2. Si usas **nvm/fnm**, asegúrate de tener Node en `~/.zshrc`.
3. Abre el proyecto desde terminal: `cursor .` (hereda PATH).
4. O instala Node LTS: [nodejs.org](https://nodejs.org) / `brew install node`.
5. Reinicia Cursor y activa de nuevo el toggle **github**.

---

## 3. Otros MCP (IRIS, Stitch…)

Solo en **`~/.cursor/mcp.json`** (usuario), no en este repositorio.

---

## Seguridad

- No commitear tokens en `mcp.json`.
- Revocar tokens expuestos en Atlassian/GitHub.
