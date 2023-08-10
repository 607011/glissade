#include <algorithm>
#include <cassert>
#include <cmath>
#include <cstdlib>
#include <functional>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <iterator>
#include <memory>
#include <string>
#include <utility>
#include <vector>

#include "chilly.hpp"

int main(int argc, char *argv[])
{
    if (argc < 3)
        return EXIT_FAILURE;

    std::ifstream ifs(argv[1]);
    std::string input(std::istreambuf_iterator<char>(ifs), {});
    std::vector<chilly::level> levels =
        boost::json::value_to<std::vector<chilly::level>>(boost::json::parse(input));

    int level_idx = std::atoi(argv[2]) - 1;
    auto level_data = levels.at(level_idx).data;
    levels.at(level_idx).dump();

    std::cout << '\n'
              << "Breadth-First Search running ... " << std::endl;
    chilly::solver solver(level_data);
    chilly::solver::result result = solver.shortestPath();
    std::cout << '\n';

    if (result.exit == nullptr)
    {
        std::cout << "BFS: no solution found.\n";
    }
    else
    {
        std::cout << "Iterations: " << result.iterations << '\n';
        std::shared_ptr<chilly::node> current_node = result.exit;
        std::cout << "Found exit at (" << current_node->x() << ", " << current_node->y() << ")\n";
        std::vector<chilly::node> path = {current_node};
        while (current_node->has_parent())
        {
            current_node = current_node->parent();
            path.insert(std::begin(path), current_node);
        }
        std::cout << "Shortest path has " << (path.size() - 1) << " moves: ";
        for (auto cell : path)
        {
            std::cout << cell.move();
        }
        std::cout << "\n-------------------------\n";
    }

    std::cout << "Depth-First Search running ... " << std::endl;
    chilly::solver solver2(level_data);
    auto routes = solver2.solve();
    std::cout << '\n';

    if (routes.empty())
    {
        std::cout << "DFS: no solution found.\n";
    }
    else
    {
        std::sort(std::begin(routes), std::end(routes), [](chilly::path const &a, chilly::path const &b) -> bool
                  { return a.size() < b.size(); });

        for (std::size_t i = 0; i < std::min(10UL, routes.size()); ++i)
        {
            auto path = routes.at(i);
            std::cout << (path.size() - 1) << ": ";
            for (int j = 1; j < path.size(); ++j)
            {
                std::cout << (path.at(j).move);
            }
            std::cout << '\n';
        }

        auto shortest_path = routes.front();

        std::cout << "\nShortest path has " << (shortest_path.size() - 1) << " moves: ";
        for (auto hop = shortest_path.begin() + 1; hop != shortest_path.end(); ++hop)
        {
            std::cout << hop->move;
        }
        std::cout << '\n';
    }
    std::cout << std::endl;
    return EXIT_SUCCESS;
}
