# Gestão de Doações

Aplicação web para registrar doações de alimentos, roupas e itens de higiene, acompanhar o estoque, registrar baixas e consultar indicadores.

## Estrutura

- `frontend/`: página, estilos, interface e regras de apresentação.
- `frontend/vendor/chart.umd.js`: Chart.js usado nos gráficos.
- `backend/src/controllers/` e `backend/src/routes/`: entrada HTTP e definição das rotas da API.
- `backend/src/services/`: validação e regras de negócio.
- `backend/src/repositories/`: acesso ao Cloud Firestore.
- `backend/`: autenticação Firebase, aplicação Express e middleware global de erros.

O navegador usa Firebase Authentication para login e envia o token de sessão à API. O servidor valida o token e acessa o Firestore pelo Firebase Admin SDK; o navegador não acessa mais o banco diretamente. As variáveis `VITE_FIREBASE_*` são incorporadas ao frontend e, portanto, são configurações públicas. Nunca coloque senhas ou credenciais administrativas nelas. O servidor aceita somente os endereços definidos em `API_ALLOWED_EMAILS`; essa lista precisa refletir as contas autorizadas para acessar os dados compartilhados.

## Executar localmente

Copie `.env.example` para `.env` na raiz do repositório e preencha as configurações do Firebase. Informe o ID do mesmo projeto Firebase em `FIREBASE_ADMIN_PROJECT_ID`, os e-mails autorizados em `API_ALLOWED_EMAILS` (separados por vírgula) e configure credenciais do Admin SDK usando Application Default Credentials. Localmente, `GOOGLE_APPLICATION_CREDENTIALS` deve apontar para um arquivo de conta de serviço mantido fora do repositório; em produção, prefira a identidade de serviço do ambiente. Nunca versione nem exponha esse arquivo.

```bash
npm --prefix backend install
npm --prefix backend run dev
```

Em outro terminal, inicie o frontend:

```bash
cd MeusProjetos/meu-app-react
npm install
npm run dev
```

O Vite abre a aplicação em `http://localhost:5173/frontend/` e encaminha `/api` para o servidor na porta 3000. A autenticação requer internet, Firebase configurado e `localhost` autorizado no Firebase Authentication.

Para gerar e visualizar uma versão de produção:

```bash
npm run build
npm run preview
```

Execute também a API em produção e configure `API_ALLOWED_ORIGINS` com a origem do frontend. Se a API estiver em outro domínio, defina `VITE_API_BASE_URL` com a URL base da API antes do build.

## Configuração do Firebase

As configurações públicas do Firebase Web e o e-mail sugerido na tela de login ficam nas variáveis `VITE_FIREBASE_*`. A senha é fornecida pelo usuário na tela de login. O usuário precisa existir no Firebase Authentication com login por e-mail e senha habilitado. O servidor usa credenciais administrativas separadas e valida o e-mail do token contra `API_ALLOWED_EMAILS`.

O Admin SDK não aplica as regras de segurança do Firestore. Por isso, mantenha `API_ALLOWED_EMAILS` restrito às contas autorizadas, conceda à identidade do servidor somente as permissões necessárias no Firestore e proteja as credenciais administrativas. A API preserva as coleções compartilhadas `doacoes` e `bazar`; o frontend atualiza os dados por consulta inicial e sincronização periódica.

## Recursos

- Cadastro e edição de arrecadações.
- Arrecadação de remédios e controle de validade para alimentos, higiene e remédios.
- Controle compartilhado de roupas e objetos do bazar, com baixa e reversão sem inclusão nos indicadores de doações.
- Baixa, exclusão, filtros e exportação CSV.
- Configurações de perfil e sistema, login Firebase, backup JSON e restauração de dados.
- Indicadores e gráficos de estoque e validade.
- Importação de registros antigos do armazenamento local do navegador.

## API

- `GET /api/health`: verificação de disponibilidade.
- `GET /api/doacoes` e `PATCH /api/doacoes`: consulta e alterações incrementais nas arrecadações.
- `GET /api/bazar` e `PATCH /api/bazar`: consulta e alterações incrementais nos itens do bazar.

As rotas de dados exigem `Authorization: Bearer <Firebase ID token>`. Erros seguem o formato `{ "error": { "code": "...", "message": "..." } }`; erros inesperados são registrados no log do servidor e respondem com HTTP 500 sem expor detalhes internos.