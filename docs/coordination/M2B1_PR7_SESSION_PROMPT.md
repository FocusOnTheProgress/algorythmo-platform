# Sessão F — PR 7 — M2 Onda 2 batch 1 — Playwright assertions positivas (prompt inicial)

> **Cole tudo abaixo no Cmd-K depois de abrir uma sessão Claude Code com cwd em `C:/Users/gusta/dev/algorythmo-m2b1-cuts`.**
> O prompt é auto-contido: a sessão recebe todo o contexto e segue até abrir o PR.

---

Você é a **Sessão F** do projeto Algorythmo OS (fork do Chatwoot). Está em um worktree isolado `C:/Users/gusta/dev/algorythmo-m2b1-cuts` na branch `algorythmo/m2b1-cuts-playwright`, baseada em `algorythmo/main @ d9c2a320a`. A Sessão A (orquestradora) está no `Fork Chatwoot/` principal e fez o dispatch. Em paralelo, a Sessão E trabalha em outro worktree (M1-D pipeline metrics) sem tocar nos seus arquivos.

## Quem é o founder

Gustavo, CEO da Algorythmo. **Não revisa código.** Toda review passa por `adversarial-reviewer` agent antes do merge. Fale em produto/negócio com ele quando reportar, não em jargão técnico. Memórias: world-class em todas as camadas, sem mediano, sem atalhos.

## Contexto do produto (resumido)

- **Algorythmo OS** = fork do Chatwoot com superfícies excessivas escondidas atrás de "cut flags" pra PME não ver complexidade que não usa. Repo `FocusOnTheProgress/algorythmo-platform` privado.
- 13 cut flags (`campaigns`, `help_center`, `sla`, `audit_logs`, `custom_roles`, `security_settings`, `billing_settings`, `agent_bots`, `macros`, `dashboard_apps`, `advanced_assignment`, `reports_bot`, `conversation_workflow`) vivem em `accounts.algorythmo_feature_flags` (bitmask isolado). Default: TODAS ligadas (cortando a superfície).
- Sidebar + route guards já foram mergeados no PR #47.
- Suite Playwright em `spec/system/algorythmo/cuts/` valida HOJE apenas o caso negativo (flag-on → surface oculto). Falta validar:
  1. **flag-off → surface visível e funcional**.
  2. **flag-on → rota direta bloqueada com redirect ou 404 controlado**.
- **Sem isso, o gate vira fé**, não teste. M2 batch 1 fecha esse gap.

## Sua entrega: PR 7

### Arquivos a tocar (exclusivamente)

1. **`spec/system/algorythmo/cuts/_fixture.ts`** (edit) — adicionar 2 helpers:
   - `expectSurfaceVisible(page, flagName, opts: { sidebarLabel, routePath, pageHeadingRegex })` — assume usuário logado como admin não-super-admin (a fixture já tem helper de login? confirme; se não, adicione `loginAdmin(page)` parecido com `loginSuperAdmin`). Asserta:
     - Sidebar mostra o link com `aria-label` ou texto matching `sidebarLabel`.
     - Navegar pra `routePath` carrega 200 (URL final = `routePath`).
     - Heading da página casa com `pageHeadingRegex`.
   - `expectSurfaceBlocked(page, flagName, routePath)` — asserta:
     - Sidebar NÃO mostra o link (já é o caso atual; mantenha).
     - Navegar direto pra `routePath` redireciona pra `/app/accounts/:id/dashboard` OU mostra placeholder 404 controlado. Inspecione o que o route guard atual faz; espelhe.
     - Mensagem aria-live ou toast com texto matching `/n[ãa]o dispon[ií]vel|not available/i` aparece (se o route guard atual emitir; se não, **pare e pingue Sessão A** com proposta — possível ajuste no guard).
   - Mantenha `toggleFlag` e `withFlag` existentes intactos. Os novos helpers usam `withFlag` internamente pra restaurar estado.

2. **`spec/system/algorythmo/cuts/<flag>.spec.ts`** (edit — 13 arquivos, exceto `_fixture.ts` e `_a11y_smoke.spec.ts`):
   Cada spec ganha 2 describes ADICIONAIS (mantendo o que já existe):
   ```ts
   test.describe('flag-off: surface restored', () => {
     test(`<flagName> off → sidebar link visible + route loads`, async ({ page }) => {
       await withFlag(page, '<flagName>', false, async () => {
         await expectSurfaceVisible(page, '<flagName>', {
           sidebarLabel: /.../,
           routePath: '/app/accounts/1/...',
           pageHeadingRegex: /.../,
         });
       });
     });
   });

   test.describe('flag-on: hard block on direct nav', () => {
     test(`<flagName> on → direct nav redirects`, async ({ page }) => {
       await withFlag(page, '<flagName>', true, async () => {
         await expectSurfaceBlocked(page, '<flagName>', '/app/accounts/1/...');
       });
     });
   });
   ```
   Cada arquivo cobre **1 flag específica**. Para descobrir a route path correta de cada flag, leia `docs/plans/cuts.md` (mapa flag → rota) e cross-referenceie com `app/javascript/dashboard/routes/dashboard/dashboard.routes.js`.

3. **`engines/algorythmo/spec/algorythmo/cuts_smoke_spec.rb`** (novo) — smoke RSpec que falha cedo no CI Ruby:
   ```ruby
   RSpec.describe 'Algorythmo cut flags surface mapping' do
     CUT_FLAGS_TO_ROUTE = {
       'campaigns' => '/app/accounts/:account_id/campaigns',
       # ... preenche os 13
     }.freeze

     CUT_FLAGS_TO_I18N_KEY = {
       'campaigns' => 'SIDEBAR.CAMPAIGNS',
       # ...
     }.freeze

     it 'covers every flag in ALGORYTHMO_CUT_FLAGS' do
       expect(CUT_FLAGS_TO_ROUTE.keys.sort).to eq(
         (Algorythmo::FeatureGate::ALGORYTHMO_CUT_FLAGS - %w[show_captain crm]).sort
       )
     end

     it 'every flag has a matching i18n key present in en.json' do
       en_locale = JSON.parse(File.read(Rails.root.join('app/javascript/dashboard/i18n/locale/en/sidebarItems.json')))
       CUT_FLAGS_TO_I18N_KEY.each_value do |key|
         expect(en_locale.dig(*key.split('.'))).not_to be_nil, "missing i18n key #{key}"
       end
     end
   end
   ```
   - Excluímos `show_captain` e `crm` da lista de 13 — eles têm tratamento próprio (Captain corte/restore + CRM enable). Comente isso no spec.
   - Confirme o arquivo i18n real (pode ser `sidebar.json`, `_layout.json`, etc — busque com grep `"CAMPAIGNS"` em `app/javascript/dashboard/i18n/locale/en/`).

4. **`docs/algorythmo/cuts/README.md`** (novo) — mapa operacional:
   ```markdown
   # Algorythmo Cut Flags — operational map

   Os 13 cut flags vivem em `accounts.algorythmo_feature_flags` (bigint, isolado de `feature_flags`). Default: todas ligadas (superfície cortada).

   | Flag | Rota cortada | i18n sidebar | Comportamento quando ON | Comportamento quando OFF |
   |---|---|---|---|---|
   | `campaigns` | `/app/accounts/:id/campaigns` | `SIDEBAR.CAMPAIGNS` | sidebar oculto + redirect | sidebar visível + rota normal |
   | ... (13 linhas) |

   ## Como testar local
   1. ...
   2. ...

   ## Adicionar nova flag de cut
   1. Adicionar nome em `Algorythmo::FeatureGate::ALGORYTHMO_CUT_FLAGS`.
   2. Adicionar rota + i18n em `cuts_smoke_spec.rb`.
   3. Criar `spec/system/algorythmo/cuts/<flag>.spec.ts`.
   4. ...
   ```

### Arquivos a NÃO TOCAR

- `app/javascript/dashboard/routes/dashboard/crm/**` (domínio da Sessão E).
- `engines/algorythmo/app/services/algorythmo/analytics/**` (Sessão E).
- `engines/algorythmo/config/routes.rb` (Sessão E).
- `app/javascript/dashboard/i18n/locale/*/algorythmoCrm.json` (Sessão E).
- `docs/coordination/*.md` (Sessão A).
- `docs/coordination/CONTRACT_M1B.md` (Sessão A).

## Regras de execução

1. **Use `TaskCreate` no início** pra quebrar em ~6-8 tarefas (helpers, smoke spec, 13 spec edits agrupados, README, lint, PR).
2. **Mapa de toque** está em `docs/coordination/M1D_FASE5_DISPATCH.md` — leia §3 antes de começar pra confirmar boundaries.
3. **Anti-flake disciplinado:**
   - Toda navegação espera `domcontentloaded` ou estado UI (`waitForSelector`), nunca `setTimeout`/`sleep`.
   - Toggles de flag usam `withFlag` (já existe), nunca `toggleFlag` solto sem restaurar.
   - Specs idempotentes — rodar em qualquer ordem dá o mesmo resultado.
4. **Lint:** `./node_modules/.bin/eslint --fix spec/system/algorythmo/cuts/*.ts`.
5. **RuboCop:** `bundle exec rubocop engines/algorythmo/spec/algorythmo/cuts_smoke_spec.rb`.
6. **Rodar local antes de push:**
   ```bash
   bundle exec rspec engines/algorythmo/spec/algorythmo/cuts_smoke_spec.rb
   pnpm playwright test spec/system/algorythmo/cuts --reporter=line
   ```
   Se Playwright local falhar por dependência de dev server, anote os specs que rodaram e PR descreve. Adversarial avalia.
7. **Soft-fork zone:** `bash engines/algorythmo/bin/check-soft-fork-zone.sh`.
8. **NÃO mexer em `package.json` / `pnpm-lock.yaml`.**
9. **Commit message:**
   ```
   test(M2-B1/PR7): Playwright positive assertions for 13 cut flags

   Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
   ```
10. **Abrir PR contra `algorythmo/main`** com `gh pr create --repo FocusOnTheProgress/algorythmo-platform --base algorythmo/main`. Título: `test(M2-B1/PR7): Playwright positive assertions for cut flags`.
11. **Spawn `adversarial-reviewer`** quando PR estiver pronto. Endereçar HIGH. Pelo menos 1 rodada.
12. **NÃO mergear sozinho.** Ping Sessão A após adversarial passar.

## Definição de pronto

- [ ] `expectSurfaceVisible` + `expectSurfaceBlocked` adicionados em `_fixture.ts`, com docstring e idempotência via `withFlag`.
- [ ] 13 spec files ganham 2 describes novos (`flag-off: surface restored` + `flag-on: hard block`).
- [ ] `cuts_smoke_spec.rb` cobre mapeamento flag→rota→i18n e roda verde.
- [ ] `docs/algorythmo/cuts/README.md` lista as 13 flags com rota + i18n + comportamento on/off.
- [ ] Lint zero warning + RuboCop zero offense.
- [ ] PR aberto com descrição mostrando antes/depois (quantos cenários cuts cobrem hoje vs depois) + screenshots ou GIF curto de 1 spec rodando.
- [ ] Adversarial review passou.

## Onde achar coisas

- Fixture atual: `spec/system/algorythmo/cuts/_fixture.ts` (leia todo antes de estender).
- Specs existentes pra padrão: `spec/system/algorythmo/cuts/campaigns.spec.ts` etc.
- FeatureGate + lista de flags: `engines/algorythmo/app/services/algorythmo/feature_gate.rb`.
- Mapa flag → rota: `docs/plans/cuts.md` (deve existir do M2 original).
- Route guards: procure por `algorythmo_cut_` em `app/javascript/dashboard/router/`.
- Padrão de RSpec smoke: `engines/algorythmo/spec/algorythmo/feature_flags_spec.rb`.

## Casos de borda a considerar

- Algumas rotas têm sub-rotas (ex: `/audit_logs` raiz e `/audit_logs/:id/details`). Cubra só a raiz no `expectSurfaceBlocked`; a fundo das sub-rotas pode entrar em batch 2.
- Se uma flag não tem rota correspondente (só esconde botão dentro de uma página existente), documente no README e crie spec mínimo que valida visibility-only do botão.
- `agent_bots` e `macros` podem dividir rota com Settings — confirme o que está cortado exatamente vendo `dashboard.routes.js`.

Mãos à obra.
