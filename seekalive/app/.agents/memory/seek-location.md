---
name: Localização e fontes do Seek
description: Regras de confiança, catálogo oficial de cidades e limites geográficos na fase de front-end.
---

Usar um catálogo oficial do IBGE incluído na versão do aplicativo para seleção manual de município. Preservar sua fonte e a data de obtenção; atualizações devem vir da fonte oficial, nunca de cidades inventadas.

**Why:** A consulta pública do IBGE funcionou inicialmente e depois apresentou timeouts durante a validação. Incluir uma cópia compacta real evita depender dessa instabilidade a cada busca, mantém o front-end independente de banco de dados e permite reutilizar o catálogo já carregado sem conexão.

**How to apply:** Atualizar o catálogo de forma explícita ao atualizar a versão. Não implementar fallback silencioso para sugestões fictícias. O catálogo contém municípios brasileiros, não bairros nem coordenadas de centros urbanos.

Cidade de exploração, cidade cadastrada pelo negócio e posição física do dispositivo são dados diferentes. A escolha manual nunca deve ser substituída automaticamente por GPS. Coordenadas obtidas por ação explícita ficam somente em memória, sem persistência ou envio a terceiros.

**Why:** O usuário exige controle de localização e privacidade. O projeto está na fase de front-end; não há autorização para criar banco, geocodificação reversa ou consulta geoespacial.

**How to apply:** Não mostrar distâncias, raio funcional ou “perto de você” sem infraestrutura e dados suficientes. Preferir identificação estruturada do município no perfil comercial; texto legado é apenas declaração do perfil, não um endereço geocodificado.

Exemplos do Seek devem estar visíveis por padrão no desenvolvimento, identificados e restritos a esse ambiente. Incluir lugares, prestadores e eventos com imagens ilustrativas relevantes e perfis/detalhes navegáveis. Não tratar exemplos como catálogo real de produção.

**Why:** O usuário pediu explicitamente mocks de locais, eventos e serviços para conseguir visualizar a interface e corrigiu a experiência vazia, em que não conseguia ver o resultado. A restrição a dados fictícios em produção permanece.

**How to apply:** Preservar a ligação entre contas comerciais do Social e resultados do Seek também nos mocks. Manter um controle explícito para ocultar exemplos e uma ação para ver a prévia completa sem filtros. Em produção, uma listagem vazia é preferível a inventar dados, avaliações ou disponibilidade.
