# Landing pages + painel de leads — Mississippi

Duas páginas públicas e um painel privado, num único projeto Vercel.

| Rota | O que é | Acesso |
|---|---|---|
| `/` | Landing page — empreiteiras | pública |
| `/auto-shops` | Landing page — oficinas | pública |
| `/painel` | Painel de leads | senha |
| `/api/lead` | Recebe o formulário (POST) | pública |
| `/api/leads` | Lê e atualiza leads (GET / PATCH) | header `x-painel-key` |

---

## ⚠️ Antes de qualquer coisa: plano Pro

O plano **Hobby da Vercel proíbe uso comercial**. Estas páginas vendem um serviço, então
se enquadram — e a Vercel derruba deployment em violação **sem aviso prévio**.

**Assine o Vercel Pro (US$ 20/mês) antes de apontar o domínio.** O mesmo time Pro cobre
também os sites dos clientes, então esses US$ 20 são o custo de hospedagem que já estava
no orçamento, não um extra.

**Não ative o "Password Protection" da Vercel** para proteger o painel: custa mais US$ 20/mês
por projeto e tranca o deployment inteiro — as duas landing pages parariam de abrir para
os prospects. O painel já tem autenticação própria.

---

## Deploy em 6 passos

### 1. Suba para um repositório Git
```bash
git init && git add . && git commit -m "landing pages + painel"
git branch -M main
git remote add origin <seu-repo>
git push -u origin main
```

### 2. Importe na Vercel
Vercel → **Add New → Project** → selecione o repositório.
Framework Preset: **Other**. Build Command: deixe vazio. Output Directory: deixe vazio.

### 3. Crie o banco (Neon)
No projeto: **Storage → Create Database → Neon (Postgres)** → free tier.
A Vercel injeta a variável `DATABASE_URL` sozinha. Não precisa copiar nada.

> A Vercel descontinuou o Postgres e o KV próprios em dez/2024. Hoje é Neon (SQL) ou
> Upstash (Redis) pelo Marketplace. Aqui usamos Neon.

A tabela `leads` é criada sozinha na primeira submissão. Não precisa rodar migration.

### 4. Configure as variáveis de ambiente
**Settings → Environment Variables**, nos três ambientes:

| Variável | Obrigatória | Para que serve |
|---|---|---|
| `DATABASE_URL` | sim | injetada pelo Neon no passo 3 |
| `PANEL_PASSWORD` | sim | senha do `/painel`. Use algo longo — é a única tranca |
| `RESEND_API_KEY` | não | avisa por e-mail a cada lead novo |
| `NOTIFY_EMAIL` | não | para onde vai o aviso |
| `NOTIFY_FROM` | não | remetente verificado no Resend |

Sem as três últimas o site funciona igual — só não manda e-mail, e os leads
aparecem no painel do mesmo jeito.

### 5. Aponte o domínio
**Settings → Domains**. Sem domínio próprio o link fica `*.vercel.app`, que
**não vende** — nenhum dono de empreiteira confia num link assim numa ligação fria.
Isso é parte da entrega, não detalhe.

### 6. Teste antes de mandar para alguém
1. Abra `/` e envie o formulário com dados de teste
2. Abra `/painel`, entre com a senha, confirme que o lead apareceu
3. Mude o status e escreva uma anotação — recarregue e veja se persistiu
4. Baixe o CSV

---

## O painel

Login por senha, sessão guardada só na aba (`sessionStorage`) — fechou o navegador,
pede de novo.

- Cinco contadores no topo: total, novos, reunião, fechados, últimos 7 dias
- Filtros por nicho e por "só novos"
- Status editável direto na linha: novo → ligado → reunião → fechado / perdido
- Anotação por lead, salva ao sair do campo
- Exportação CSV do que estiver filtrado
- Recarrega sozinho a cada 60 segundos

## Anti-spam

Campo honeypot escondido (`website`) nos dois formulários. Bot preenche, humano não vê —
submissão com ele preenchido é descartada silenciosamente, com resposta 200 para o bot
não perceber.

---

## Pendências antes de divulgar

- [ ] Trocar `Your company` pela marca — aparece no topo, no FAQ e no rodapé das duas páginas
- [ ] Trocar `your town` na resposta do FAQ "Who are you and where are you out of?"
- [ ] Assinar o Vercel Pro
- [ ] Apontar o domínio próprio
- [ ] Definir `PANEL_PASSWORD`

## Estrutura

```
/
├── index.html          landing — empreiteiras
├── auto-shops.html     landing — oficinas
├── painel.html         painel de leads
├── previews/           screenshots dos 10 sites do portfólio
├── api/
│   ├── lead.js         POST público — grava o lead
│   └── leads.js        GET/PATCH autenticado — lê e atualiza
├── package.json
└── vercel.json         cleanUrls, headers de segurança, cache das imagens
```
