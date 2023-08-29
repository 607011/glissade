# Notizen für die Implementierung

## Solver für Levels mit Münzen

Jede Kachel, auf der der Pinguin stoppen kann, sowie alle Felder mit Münzen sind Knoten in einem gerichteten, zyklischen Graphen.

Eine Münze $ lässt sich von 1 bis 4 Knoten dieses Graphen erreichen. Liegt sie auf der Kante zwischen zwei Knoten A und B, ergibt sich folgendes Bild:

    +---+         +---+     +---+
    | A |-------->| $ |---->| B |
    +---+         +---+     +---+

Die Kachel mit der Münze kann mit einem Knoten zusammenfallen:

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
                    v
                  +---+
                  | D |
                  +---+

Wenn eine Münze auf dem Weg von A nach B eingesammelt wird, hat nur die letzte Kante auf dem Pfad ein Gewicht von 1, die vorangehende(n) von 0:

    +---+                    +---+           
    | A |                    | A |           
    +---+                    +---+          
      |   Kosten: 0            |   Kosten: 0
      v                        v            
    +---+                    +---+          
    | $ |                    | $ |          
    +---+                    +---+          
      |   Kosten: 1            |   Kosten: 0
      v                        v                      
    +---+                    +---+          
    | B |                    | $ |          
    +---+                    +---+          
                               |   Kosten: 1
                               v  
                             +---+
                             | B |
                             +---+





https://www.baeldung.com/cs/shortest-path-to-nodes-graph