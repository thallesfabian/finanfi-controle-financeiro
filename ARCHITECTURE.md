# Arquitetura e plano evolutivo

## Camadas

As páginas server-side consultam o Prisma para leitura. As mutações entram por rotas em `app/api`, validam a sessão e a propriedade do registro antes de acessar o banco. `lib` concentra infraestrutura compartilhada e `components` concentra apresentação reutilizável.

## Segurança e isolamento

Senhas nunca são armazenadas em texto puro. O identificador do usuário vem da sessão assinada e não do formulário. Categorias e lançamentos são sempre filtrados por `userId`, evitando acesso cruzado entre contas.

## Evolução

- Fase 2 usa as tabelas `Bill` e `Goal` já migradas.
- Fase 3 usa `Vehicle`, `Journey`, `JourneyCost` e `Fueling`; métricas derivadas serão calculadas no servidor para manter uma fonte única de verdade.
- Fase 4 agrega jornadas e transações por período, acrescentando exportações e projeções sem duplicar os dados operacionais.

## Docker

O build possui estágios de dependências, compilação e runtime. O Compose fornece DNS interno (`postgres`), healthcheck, restart policy e volume persistente. A URL do Prisma aponta para o serviço, nunca para `localhost`.
