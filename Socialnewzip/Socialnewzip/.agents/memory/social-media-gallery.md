---
name: Galeria de mídias Social
description: Regra de produto para incluir mídia publicada na galeria de cada conta e respeitar a audiência.
---

Fotos e vídeos publicados por uma conta devem aparecer automaticamente na galeria de Mídias dessa mesma conta, seja ela pessoal ou comercial. A galeria deve derivar das publicações da conta, sem criar um segundo cadastro separado de mídia.

O público da publicação continua valendo: publicações públicas aparecem para todos; publicações restritas seguem a audiência definida e privadas ficam visíveis apenas para o dono.

**Why:** o usuário definiu esse comportamento como regra para o aplicativo.

**How to apply:** ao criar ou alterar publicação e galeria, manter uma única origem para os arquivos e aplicar as permissões da publicação ao exibi-los.

Por enquanto, priorizar o trabalho de front-end e não iniciar banco de dados ou persistência no servidor; há outras partes visuais do produto a concluir antes do back-end.

**Why:** o usuário definiu que a fase atual deve focar no front-end antes de começar o back-end e o banco de dados.

**How to apply:** manter as interações no escopo atual do navegador e só planejar armazenamento no servidor quando o usuário decidir avançar para a fase de back-end.
