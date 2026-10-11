# Pirate Battle — Relatório de desempenho

Data: 2026-10-11T09:40:59.834Z

## Ambiente

- Sistema: Windows_NT 10.0.26200 (x64)
- CPU: AMD Ryzen 7 5700X 8-Core Processor
- Processadores lógicos: 16
- Memória física do sistema: 15.92 GiB
- Chromium: 156.0.8078.4
- User agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
- Viewport: 1280x720; DPR 1

## Cinco ciclos de partida

- Heap inicial: 4.37 MiB
- Ciclo 1: heap após GC = 8.20 MiB
- Ciclo 2: heap após GC = 8.19 MiB
- Ciclo 3: heap após GC = 8.26 MiB
- Ciclo 4: heap após GC = 8.26 MiB
- Ciclo 5: heap após GC = 8.20 MiB
- Heap final: 8.20 MiB

## Sessão de gameplay

- Duração alvo: 180 s
- Tempo observado: 180.21 s
- A partida terminou antes do alvo: false
- FPS médio estimado: 124.2
- Intervalo médio entre frames: 8.05 ms
- P95 entre frames: 7 ms
- Frames acima de 16,67 ms: 115
- Pico de inimigos: 3
- Pico de projéteis: 9
- Pico de explosões: 1
- Pico total de entidades amostradas: 12
- Modo de benchmark: Invulnerabilidade ativada via ?perf=1 para permitir uma sessão sustentada; inimigos e projéteis continuam simulados.

## Limitações

- O heap JavaScript não equivale à memória total do navegador ou da GPU.
- A contagem de entidades é amostrada aproximadamente a cada seis frames.
- Execução em Chromium visível, resolução e condições da máquina influenciam os resultados.
- Os resultados descrevem esta execução; não são uma garantia de desempenho em outros dispositivos.
