# Notizen für die Implementierung

## Solver für Levels mit Münzen

Ansatz: **Travelling Salesman Problem (TSP)**

Jede erreichbare Kachel auf dem Spielfeld ist der Knoten in einem gerichteten, zyklischen Graphen.

Eine Münze $ lässt sich von 1 bis 4 Knoten dieses Graphen erreichen. Liegt sie auf der Kante zwischen zwei Knoten A und B, ergibt sich folgendes Bild:

              +---+
              | C |
              +---+
                |
                v
+---+         +---+     +---+
| A |-------->| $ |---->| B |
+---+         +---+     +---+

Die Kachel mit der Münze kann mit einem Knoten zusammenfallen:

              +---+
              | C |
              +---+
                |
                v
+---+         +---+
| A |-------->| $ |
+---+         +---+

Oder eine Mischung daraus:

              +---+
              | C |
              +---+
                |
                v
+---+         +---+
| A |-------->| $ |
+---+         +---+
                |
                |
                v
              +---+
              | D |
              +---+

