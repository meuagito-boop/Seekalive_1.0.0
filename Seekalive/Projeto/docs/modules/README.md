# Módulos do produto

## Aplicativo

- `auth` — cadastro, verificação de e-mail, login e sessão.
- `onboarding` — interesses iniciais do usuário.
- `profiles` — perfil e privacidade.
- `social` — seguir, pedidos, círculo e bloqueios.
- `health` — verificação operacional da API.
- Social, Seek e Shop são módulos de produto do mesmo Aplicativo; Seek e Shop ainda não têm cobertura de API completa.

## Gestor e Painel

As pastas existem somente para reservar os limites dos futuros aplicativos. Não há fluxos implementados, endpoints ou tabelas exclusivos para eles.

## Camadas do backend atual

Os routers estão agrupados por módulo em `Aplicativo/back/src/modules`. A camada de apresentação ainda contém algumas consultas e regras diretamente; não considerar isso como separação completa em camadas. Ao adicionar recursos relevantes, extrair primeiro serviços de aplicação e repositórios do módulo afetado, com testes que preservem as regras de privacidade e bloqueio.
