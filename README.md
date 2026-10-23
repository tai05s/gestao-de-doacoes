# Gestão de Doações

Aplicação web para registrar doações de alimentos, roupas e itens de higiene, acompanhar o estoque, registrar baixas e consultar indicadores.

## Estrutura

- `frontend/`: página, estilos, interface e regras de apresentação.
- `frontend/vendor/chart.umd.js`: Chart.js usado nos gráficos.
- `backend/`: configuração pública do Firebase e adaptador de autenticação, Firestore e sincronização.

O projeto usa Firebase Authentication e Cloud Firestore diretamente pelo SDK web. A pasta `backend/` organiza essa integração, mas não é um servidor próprio: credenciais administrativas ou regras de acesso não devem ser colocadas no código do navegador. O Firebase Web API key existente é uma configuração pública; a proteção dos dados depende das regras do Firestore e da configuração de Authentication.

## Executar localmente

Na pasta raiz do projeto, inicie um servidor estático:

```bash
python -m http.server 8000
```

Abra `http://localhost:8000/frontend/`. A autenticação também requer internet, o Firebase configurado e `localhost` autorizado no Firebase Authentication.

## Configuração do Firebase

Os dados públicos do projeto estão em `backend/firebase-config.js`. Para usar outro projeto, atualize os campos de configuração ali. O endereço de login está em `backend/firebase.js`; o usuário correspondente precisa existir no Firebase Authentication com login por e-mail e senha habilitado.

Configure as regras do Cloud Firestore para permitir acesso somente aos usuários autorizados. A aplicação salva os registros na coleção `doacoes` e os sincroniza em tempo real.

## Recursos

- Cadastro e edição de arrecadações.
- Baixa, exclusão, filtros e exportação CSV.
- Indicadores e gráficos de estoque e validade.
- Importação de registros antigos do armazenamento local do navegador.