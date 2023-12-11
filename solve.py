#!/usr/bin/env python3

from pprint import pprint
from queue import SimpleQueue, PriorityQueue
from itertools import permutations
import json
import time
from argparse import ArgumentParser


class Destination:
    pass


class Field:
    VALUES = {"$": 5, "G": 20}

    def __init__(self, pos: (int, int), id):
        self.pos = pos
        self.id = id
        # auxiliary properties used by algorithms
        self._neighbors = {}
        self._parent = None
        self._move = None
        self._to_collect = []

    @staticmethod
    def make_ice(pos: (int, int)):
        return Field(pos, " ")

    @property
    def x(self) -> int:
        return self.pos[0]

    @property
    def y(self) -> int:
        return self.pos[1]

    @property
    def neighbors(self) -> dict[str, Destination]:
        return self._neighbors

    @neighbors.setter
    def neighbors(self, neighbors) -> dict:
        self._neighbors = neighbors

    def has_neighbors(self) -> bool:
        return bool(self.neighbors)

    @property
    def to_collect(self):
        return self._to_collect

    @to_collect.setter
    def to_collect(self, to_collect):
        self._to_collect = to_collect

    @property
    def parent(self):
        return self._parent

    @parent.setter
    def parent(self, field):
        self._parent = field

    @parent.deleter
    def parent(self):
        self._parent = None

    @property
    def move(self):
        return self._move

    @move.setter
    def move(self, direction):
        self._move = direction

    def is_accessible(self) -> bool:
        return self.id in [" ", "$", "P", "Y", ".", " "]

    def is_exit(self) -> bool:
        return self.id == "X"

    def is_start(self) -> bool:
        return self.id == "P"

    def is_hole(self) -> bool:
        return self.id == "O"

    def is_collectible(self):
        return self.id in ["$", "G"]

    def value(self) -> int:
        if self.is_collectible():
            return self.VALUES[self.id]
        return 0

    def can_reach_collectibles(self) -> bool:
        return any(adjacent.items for adjacent in self.neighbors.values())

    def has_parent(self):
        return self.parent is not None

    def __key(self) -> (int, int):
        return self.pos

    def __hash__(self):
        return hash(self.__key())

    def __lt__(self, other):
        if isinstance(other, Field):
            return self.__key() < other.__key()
        return NotImplemented

    def __eq__(self, other):
        if isinstance(other, Field):
            return self.__key() == other.__key()
        return NotImplemented

    def __str__(self):
        return f"""({self.x},{self.y} '{self.id}')"""

    def __repr__(self):
        return f"""Field({str(self)}) [ {', '.join([f"{neighbor}" for neighbor in self.neighbors.values()])} ]"""


class Destination:
    """Stores data about a node that can be travelled when moving into a certain direction."""

    def __init__(self, move, node: Field, weight: int, items: list[Field] = []):
        """the direction (L, R, U, D) in which to move to reach the destination"""
        self.move = move
        """the node to be travelled to"""
        self.node = node
        """the distance travelled to this destination"""
        self.weight = weight
        """items that will be collected when moving to this destination"""
        self._items = items

    @property
    def x(self) -> int:
        return self.node.x

    @property
    def y(self) -> int:
        return self.node.y

    @property
    def pos(self) -> tuple[int, int]:
        return self.node.pos

    @property
    def items(self) -> list[Field]:
        return self._items

    def remove_items(self, items: list[tuple[int, int]]):
        for pos in items:
            self._items = list(filter(lambda item: item.pos != pos, self._items))

    def can_reach_items(self) -> bool:
        return bool(self._items)

    def value(self) -> int:
        return sum(item.value() for item in self._items)

    def __repr__(self):
        return f"""Destination({self.move}→{self.x},{self.y}; weight={self.weight}; $=[{''.join([str(item) for item in self.items])}]"""


class ChillySolver:
    DIRECTIONS = {
        "L": (-1, 0),
        "R": (1, 0),
        "D": (0, 1),
        "U": (0, -1),
    }
    MAX_PATH_LENGTH = 2**63 - 1

    def __init__(self, level):
        self.start = None
        self.exit = None
        self.n_rows = len(level["data"])
        self.n_cols = len(level["data"][0])
        self.max_range = max(self.n_rows, self.n_cols)
        self.level_data = level["data"]
        connections = level.get("connections", None)
        if connections:
            self.holes = {
                (connection["src"]["x"], connection["src"]["y"]): (
                    connection["dst"]["x"],
                    connection["dst"]["y"],
                )
                for connection in connections
            }
        self.directions = self.DIRECTIONS

    @property
    def directions(self):
        return self._directions
    
    @directions.setter
    def directions(self, directions):
        self._directions = directions
        self.parse()
        self.build_graph()

    def move_player(self, origin: tuple, destination: tuple):
        self.board[destination] = self.board[origin]
        self.board[origin] = Field.ice(origin)

    def take_item(self, pos):
        if pos not in self.collectibles.keys():
            raise RuntimeError(f"No collectible found at {pos}")
        # self.board[pos] = Field(pos, " ")
        del self.collectibles[pos]
        # remove item from all destinations
        for node in self.nodes_in_graph():
            for adjacent in node.neighbors.values():
                adjacent.items = list(
                    filter(lambda item: item.pos != pos, adjacent.items)
                )

    def unexplore_all(self):
        for field in self.board.values():
            field.explored = False

    def field_at(self, pos: tuple) -> Field:
        assert isinstance(pos, tuple)
        return self.board[pos]

    def remove_all_parents(self) -> None:
        for field in self.board.values():
            del field.parent

    def parse(self):
        self.board = {}
        self.collectibles = {}  # key: tuple of position of origin, value: Field
        for y, row in enumerate(self.level_data):
            for x, char in enumerate(row):
                field = Field((x, y), char)
                self.board[(x, y)] = field
                if char == "P":
                    self.start = field
                elif char == "X":
                    self.exit = field
                elif char in ["$", "G"]:
                    self.collectibles[(x, y)] = field
                elif char == "O":
                    pass

        if self.start is None:
            raise RuntimeError("Missing start field")
        if self.exit is None:
            raise RuntimeError("Missing exit field")

    def nodes_in_graph(self) -> list[Field]:
        """Collect all nodes in graph.

        Return nodes as list."""

        def DFS_explore(current_node):
            if not current_node.neighbors or all(
                destination.node.explored
                for destination in current_node.neighbors.values()
            ):
                return
            for adjacent in current_node.neighbors.values():
                if not adjacent.node.explored and not adjacent.node.is_exit():
                    adjacent.node.explored = True
                    nodes.append(adjacent.node)
                    DFS_explore(adjacent.node)

        self.unexplore_all()
        nodes = [self.start]
        DFS_explore(self.start)
        return nodes

    def build_graph(self):
        to_visit = [self.start]
        explored = set(to_visit)
        self.edges = {}
        while to_visit:
            current = to_visit.pop(0)
            if current is self.exit:
                continue
            for move, (dx, dy) in self.directions.items():
                items = []
                for distance in range(1, self.max_range):
                    x2 = (current.x + dx * distance) % self.n_cols
                    y2 = (current.y + dy * distance) % self.n_rows
                    next_field = self.field_at((x2, y2))
                    if next_field.is_accessible():  # continue sliding
                        if next_field.is_collectible():
                            items.append(next_field)
                        continue

                    if next_field.is_hole():
                        field_unexplored = next_field not in explored
                        explored.add(next_field)
                        next_field = self.field_at(self.holes[next_field.pos])
                        if field_unexplored:
                            to_visit.append(next_field)
                        destination = Destination(move, next_field, distance, items)
                        current.neighbors[move] = destination
                        self.edges[current.pos] = destination
                        current.items = items
                        break

                    if not next_field.is_exit():
                        next_field = self.field_at(
                            ((x2 - dx) % self.n_cols, (y2 - dy) % self.n_rows)
                        )

                    if next_field.x != current.x or next_field.y != current.y:
                        destination = Destination(
                            move,
                            next_field,
                            distance if next_field.is_exit() else distance - 1,
                            items,
                        )
                        current.neighbors[move] = destination
                        self.edges[current.pos] = destination
                        if next_field not in explored:
                            explored.add(next_field)
                            to_visit.append(next_field)
                        current.items = items
                    break

                if distance == self.max_range:
                    raise RuntimeError(
                        f"Infinite loop detected while going {move} from {current.x},{current.y}"
                    )

    def backtrace_moves(self, node: Field, origin: Field) -> ([Field], int):
        """Reconstruct route by tracing back from the destination
        to the originating field.

        Return list of fields and length of path.
        """
        if not isinstance(node, Field):
            raise ValueError("destination must be of type Field")
        if not isinstance(origin, Field):
            raise ValueError("origin must be of type Field")
        path = [node]
        while node.has_parent():
            node = node.parent
            path.insert(0, node)
        distance = 0
        for i in range(1, len(path)):
            current = path[i - 1]
            successor = path[i]
            destination = next(
                filter(
                    lambda dst: dst.node.pos == successor.pos,
                    current.neighbors.values(),
                )
            )
            distance += destination.weight
        return path, distance

    def bfs(self, A: Field, B: Field) -> tuple[list[Field], int]:
        """Breadth-first search from A to B.

        Return moves of the route with the least numbers of turns.
        """
        if not isinstance(A, Field):
            raise ValueError("origin must be of type Field")
        if not isinstance(B, Field):
            raise ValueError("destination must be of type Field")
        q = SimpleQueue()
        q.put(A)
        explored = set([A])
        while not q.empty():
            current_node = q.get()
            for move, adjacent in current_node.neighbors.items():
                assert isinstance(adjacent.node, Field)
                if adjacent.node is B:
                    adjacent.node.parent = current_node
                    adjacent.node.move = move
                    return self.backtrace_moves(adjacent.node, A)
                if adjacent.node not in explored:
                    adjacent.node.parent = current_node
                    adjacent.node.move = move
                    explored.add(adjacent.node)
                    q.put(adjacent.node)
        return None, None

    def dijkstra(
        self, A: Field, B: Field
    ) -> tuple[dict[Field, Field], dict[Field, int]]:
        """Find shortest path from A to B by employing Dijkstra's algorithm.

        This implementation is mostly created from the pseudocode that can
        be read behind https://en.wikipedia.org/wiki/Dijkstra%27s_algorithm
        but with some simplications regarding the sets that store the nodes'
        distances and parents."""
        if not isinstance(A, Field):
            raise ValueError("origin must be of type Field")
        if not isinstance(B, Field):
            raise ValueError("destination must be of type Field")

        visited = set()
        weights = {A: 0}  # start has zero weight (cost)
        parents = {A: None}  # start has no parent field
        nodes_to_visit = PriorityQueue()
        nodes_to_visit.put((0, A))  # begin traversal at start
        while not nodes_to_visit.empty():
            _weight, node = nodes_to_visit.get()
            visited.add(node)
            if node == B:  # exit found
                break
            for move, adjacent in node.neighbors.items():
                neighbor = adjacent.node
                distance = adjacent.weight
                if neighbor in visited:
                    continue
                prev_weight = weights.get(neighbor, self.MAX_PATH_LENGTH)
                new_weight = weights[node] + distance
                if new_weight < prev_weight:
                    nodes_to_visit.put((new_weight, neighbor))
                    weights[neighbor] = new_weight
                    parents[neighbor] = node
                    neighbor.move = move

        return parents, weights[node]

    def dijkstra_to_nearest_item(
        self, A: Field
    ) -> tuple[dict[Field, Field], dict[Field, int], Field]:
        if not isinstance(A, Field):
            raise ValueError("origin must be of type Field")
        visited = set()
        weights = {A: 0}  # start has zero weight (cost)
        parents = {A: None}  # start has no parent field
        nodes_to_visit = PriorityQueue()
        nodes_to_visit.put((0, A))  # begin traversal at start
        while not nodes_to_visit.empty():
            _weight, node = nodes_to_visit.get()
            visited.add(node)
            if node.can_reach_collectibles():
                break
            for move, adjacent in node.neighbors.items():
                neighbor = adjacent.node
                if neighbor.is_exit():
                    continue
                distance = adjacent.weight
                if neighbor in visited:
                    continue
                prev_weight = weights.get(neighbor, self.MAX_PATH_LENGTH)
                new_weight = weights[node] + distance
                if new_weight < prev_weight:
                    nodes_to_visit.put((new_weight, neighbor))
                    weights[neighbor] = new_weight
                    parents[neighbor] = node
                    neighbor.move = move
        return parents, weights[node], node

    def least_moves(self) -> tuple[list[Field], int]:
        return self.bfs(self.start, self.exit)

    def shortest_path(self) -> tuple[list[Field], int]:
        parents, total_weight = self.dijkstra(self.start, self.exit)
        if self.exit not in parents:
            return None, None
        # backtrace path
        v = self.exit
        path = []
        while v is not None:
            path.insert(0, v)
            v = parents[v]
        return path, total_weight

    def remove_collected(self, pos_collected: list[tuple[int, int]]) -> None:
        for field in self.board.values():
            for _, adjacent in field.neighbors.items():
                adjacent.remove_items(pos_collected)

    def shortest_path_across_collectibles(self) -> list[str]:
        A = self.start
        B = self.exit
        collectibles_left = set(self.collectibles)

        full_path = []

        def bfs_to_collectible(
            start: Field, collectibles_left=collectibles_left
        ) -> tuple[list[Field], Field] | tuple[None, None]:
            """Perform BFS from current position to nearest collectible."""
            q = SimpleQueue()
            q.put(start)
            explored = set([start])
            while not q.empty():
                current_node = q.get()
                for move, adjacent in current_node.neighbors.items():
                    if adjacent.can_reach_items():
                        if adjacent.node is B:
                            continue
                        pos_collected = [item.pos for item in adjacent.items]
                        self.remove_collected(pos_collected)
                        collectibles_left -= set(pos_collected)
                        adjacent.node.parent = current_node
                        adjacent.node.move = move
                        path, _distance = self.backtrace_moves(adjacent.node, A)
                        path = "".join(field.move for field in path[1:])
                        self.remove_all_parents()
                        return path, adjacent.node
                    if adjacent.node not in explored:
                        adjacent.node.parent = current_node
                        adjacent.node.move = move
                        explored.add(adjacent.node)
                        q.put(adjacent.node)

            return None, None

        while collectibles_left:
            path, A = bfs_to_collectible(A)
            if path is None:
                break
            full_path += path

        if A is not B:
            path, _distance = self.bfs(A, B)
            full_path += [field.move for field in path[1:]]

        return full_path


def main():
    parser = ArgumentParser(
        prog="chilly-solver", description="Solve Chilly level with a bunch of shortest-path algorithms"
    )
    parser.add_argument("-n", "--level-num", type=int, default=25, help="level number")
    args = parser.parse_args()

    t0 = time.time_ns()
    levels = json.load(open("levels.json", "r"))
    print(f"Parsing JSON data took {round(1e-6*(time.time_ns() - t0), 2)} ms")

    t0 = time.time_ns()
    solver = ChillySolver(levels[args.level_num])
    print(f"Building graph took {round(1e-6*(time.time_ns() - t0), 2)} ms")

    print("\n## Shortest paths ignoring items:")

    t0 = time.time_ns()
    path, distance = solver.least_moves()
    print(f"\nBreadth-first search took {round(1e-6*(time.time_ns() - t0), 2)} ms")
    if path is not None:
        print(
            f"""→ least moves  : {"".join(field.move for field in path[1:])} (distance: {distance})"""
        )

    # t0 = time.time_ns()
    # path, distance = solver.shortest_path()
    # print(f"\nDijkstra search took {round(1e-6*(time.time_ns() - t0), 2)} ms")
    # if path is not None:
    #     print(
    #         f"""→ shortest path: {"".join([field.move for field in path[1:]])} (distance: {distance})"""
    #     )

    print("\n## Shortest paths across all items:")

    best_path = None
    worst_path = None
    t0 = time.time_ns()
    for directions in permutations(solver.DIRECTIONS.items()):
        solver.directions = dict(directions)
        path = solver.shortest_path_across_collectibles()
        if best_path is None or len(path) < len(best_path):
            best_path = path
        if worst_path is None or len(path) > len(worst_path):
            worst_path = path
        
    print(f"\nBreadth-first searches took {round(1e-6*(time.time_ns() - t0), 2)} ms")
    print(f"""→ shortest path (best) : {"".join(best_path)} (moves: {len(best_path)})""")
    print(f"""→ shortest path (worst): {"".join(worst_path)} (moves: {len(worst_path)})""")


if __name__ == "__main__":
    main()
