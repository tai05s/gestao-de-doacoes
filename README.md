# Gestão de Doações

Aplicação web para registrar doações de alimentos, roupas e itens de higiene, acompanhar o estoque, registrar baixas e consultar indicadores.

## Estrutura

- `frontend/`: página, estilos, interface e regras de apresentação.
- `frontend/vendor/chart.umd.js`: Chart.js usado nos gráficos.
- `backend/`: configuração pública do Firebase e adaptador de autenticação, Firestore e sincronização.

O projeto usa Firebase Authentication e Cloud Firestore diretamente pelo SDK web. A pasta `backend/` organiza essa integração, mas não é um servidor próprio: credenciais administrativas ou regras de acesso não devem ser colocadas no código do navegador. O Firebase Web API key existente é uma configuração pública; a proteção dos dados depende das regras do Firestore e da configuração de Authentication.

## Executar localmente

Com Node.js instalado, abra um terminal na pasta `MeusProjetos/meu-app-react` e execute:

```bash
npm install
npm run dev
```

O Vite abre a aplicação em `http://localhost:5173/frontend/`. A aplicação continua usando os arquivos existentes em `frontend/` e `backend/`; a autenticação e a sincronização com Firebase requerem internet, Firebase configurado e `localhost` autorizado no Firebase Authentication.

Para gerar e visualizar uma versão de produção:

```bash
npm run build
npm run preview
```

## Configuração do Firebase

Os dados públicos do projeto estão em `backend/firebase-config.js`. Para usar outro projeto, atualize os campos de configuração ali. O endereço de login está em `backend/firebase.js`; o usuário correspondente precisa existir no Firebase Authentication com login por e-mail e senha habilitado.

Configure as regras do Cloud Firestore para permitir acesso somente aos usuários autorizados nas coleções `doacoes` e `bazar`. A aplicação mantém as arrecadações e o estoque do bazar separados e sincroniza ambos em tempo real.

## Recursos

- Cadastro e edição de arrecadações.
- Arrecadação de remédios e controle de validade para alimentos, higiene e remédios.
- Controle compartilhado de roupas e objetos do bazar, com baixa e reversão sem inclusão nos indicadores de doações.
- Baixa, exclusão, filtros e exportação CSV.
- Indicadores e gráficos de estoque e validade.
- Importação de registros antigos do armazenamento local do navegador.