#include <queue>

#include "chilly.hpp"

namespace chilly
{
    level tag_invoke(boost::json::value_to_tag<level>, boost::json::value const &v)
    {
        auto &o = v.as_object();
        std::vector<std::vector<tile_t>> lvl_data;
        for (auto const &value : o.at("data").as_array())
        {
            auto row_str = boost::json::value_to<std::string>(value);
            std::vector<tile_t> row;
            for (char c : row_str)
            {
                row.push_back(static_cast<tile_t>(c));
            }
            lvl_data.push_back(row);
        }
        std::vector<int> thres_data;
        for (auto const &value : o.at("thresholds").as_array())
        {
            thres_data.push_back(static_cast<int>(value.as_int64()));
        }
        std::string name = o.contains("name")
                               ? boost::json::value_to<std::string>(o.at("name"))
                               : "<no name>";
        return {
            name,
            static_cast<int>(o.at("basePoints").as_int64()),
            lvl_data,
            thres_data,
        };
    }

    std::ostream &operator<<(std::ostream &os, direction_t d)
    {
        switch (d)
        {
        case Up:
            os << 'U';
            break;
        case Down:
            os << 'D';
            break;
        case Left:
            os << 'L';
            break;
        case Right:
            os << 'R';
            break;
        case NoDirection:
            os << '+';
            break;
        }
        return os;
    }

    node::node() {}
    node::node(tile_t id, int x, int y, bool explored)
        : _id(id), _x(x), _y(y), _explored(explored)
    {
        /* ... */
    }
    node::node(std::shared_ptr<node> other)
        : _id(other->_id), _x(other->_x), _y(other->_y), _explored(other->_explored), _parent(other->_parent), _neighbors(other->_neighbors), _move(other->_move)
    {
        /* ... */
    }

    tile_t node::id() const
    {
        return _id;
    }

    int node::x() const
    {
        return _x;
    }

    int node::y() const
    {
        return _y;
    }

    bool node::is_explored() const
    {
        return _explored;
    }

    void node::set_explored(bool explored)
    {
        _explored = explored;
    }

    direction_t node::move() const
    {
        return _move;
    }

    void node::set_move(direction_t move)
    {
        _move = move;
    }

    std::shared_ptr<node> node::parent() const
    {
        return _parent;
    }

    void node::set_parent(std::shared_ptr<node> node)
    {
        _parent = node;
    }

    bool node::has_parent() const
    {
        return _parent != nullptr;
    }

    bool node::is_hole() const
    {
        return _id == Hole;
    }

    bool node::is_exit() const
    {
        return _id == Exit;
    }

    bool node::is_collectible() const
    {
        return _id == Coin || _id == Gold;
    }

    int node::value() const
    {
        switch (_id)
        {
        case Coin:
            return CoinValue;
        case Gold:
            return GoldValue;
        default:
            return 0;
        }
    }

    std::unordered_map<direction_t, neighbor_t> const &node::neighbors() const
    {
        return _neighbors;
    }

    inline void node::add_neighbor(direction_t direction, neighbor_t node)
    {
        _neighbors[direction] = node;
    }

    namespace json = boost::json;

    void level::dump() const
    {
        std::cout << "Name:       " << name << '\n'
                  << "Points:     " << points << '\n'
                  << "Thresholds: ";
        for (int threshold : thresholds)
        {
            std::cout << threshold << ' ';
        }
        std::cout << '\n'
                  << "Size:       " << data[0].size() << 'x' << data.size() << '\n';
        for (auto const &row : data)
        {
            for (auto tile : row)
            {
                std::cout << tile;
            }
            std::cout << "\n";
        }
    }

    const std::vector<direction> solver::Directions =
        {{
            {-1, 0, Left},
            {+1, 0, Right},
            {0, -1, Up},
            {0, +1, Down},
        }};

    direction_t solver::opposite(direction_t d)
    {
        switch (d)
        {
        case Down:
            return Up;
        case Up:
            return Down;
        case Left:
            return Right;
        case Right:
            return Left;
        case NoDirection:
            return NoDirection;
        }
    }

    void solver::parse_level_data()
    {
        for (int y = 0; y < _level_height; ++y)
        {
            for (int x = 0; x < _level_width; ++x)
            {
                switch (row(y).at(x))
                {
                case Player:
                    std::replace(std::begin(row(y)), std::end(row(y)), Player, Ice);
                    _root = std::make_shared<node>(Player, x, y, true);
                    _nodes[coord{x, y}] = _root;
                    break;
                case Hole:
                    _holes.emplace_back(coord{x, y});
                    break;
                case Coin:
                    _collectibles[coord{x, y}] = node::CoinValue;
                    break;
                case Gold:
                    _collectibles[coord{x, y}] = node::GoldValue;
                    break;
                default:
                    break;
                }
            }
        }
    }

    solver::solver(std::vector<std::vector<tile_t>> const &level_data)
        : _level_data(level_data)
    {
        assert(!_level_data.empty());
        assert(!_level_data.at(0).empty());
        _level_height = static_cast<int>(level_data.size());
        _level_width = static_cast<int>(level_data.at(0).size());
        parse_level_data();
    }

    inline int solver::norm_x(int x) const
    {
        return (x + _level_width) % _level_width;
    }

    inline int solver::norm_y(int y) const
    {
        return (y + _level_height) % _level_height;
    }

    std::vector<tile_t> const &solver::row(int y) const
    {
        return _level_data.at(norm_y(y));
    }

    std::vector<tile_t> &solver::row(int y)
    {
        return _level_data[norm_y(y)];
    }

    tile_t solver::cell(int x, int y) const
    {
        return row(y).at(norm_x(x));
    }

    tile_t &solver::cell(int x, int y)
    {
        return _level_data[norm_y(y)][norm_x(x)];
    }

    void solver::unexplore_all_nodes()
    {
        for (auto &node : _nodes)
        {
            if (node.second != _root)
            {
                node.second->set_explored(false);
            }
        }
    }

    std::unordered_map<direction_t, neighbor_t> const &solver::neighbors_of(std::shared_ptr<node> origin)
    {
        if (!origin->neighbors().empty())
            return origin->neighbors();

        for (auto const &d : solver::Directions)
        {
            int x = origin->x();
            int y = origin->y();
            int x_step = 0;
            int y_step = 0;
            static const std::vector<tile_t> Glidable = {Ice, Coin, Marker, Empty};
            std::vector<collectible_t> collected;
            while (std::find(std::begin(Glidable), std::end(Glidable), cell(x + d.x, y + d.y)) != std::end(Glidable))
            {
                x += d.x;
                y += d.y;
                switch (cell(x, y))
                {
                case Coin:
                    collected.emplace_back(collectible_t{x, y, node::CoinValue});
                    break;
                case Gold:
                    collected.emplace_back(collectible_t{x, y, node::GoldValue});
                    break;
                default:
                    break;
                }
                x_step += d.x;
                y_step += d.y;
                if (abs(x_step) > _level_width || abs(y_step) > _level_height) // prevent infinite looping
                    return origin->neighbors();
            }
            tile_t const stop_tile = cell(x + d.x, y + d.y);
            switch (stop_tile)
            {
            case Exit:
            {
                auto const &key = coord{norm_x(x + d.x), norm_y(y + d.y)};
                if (_nodes.find(key) == std::end(_nodes))
                {
                    _nodes[key] = std::make_shared<node>(Exit, norm_x(x + d.x), norm_y(y + d.y), false);
                }
                origin->add_neighbor(d.move, neighbor_t{_nodes[key], collected});
                break;
            }
            case Hole:
            {
                auto other_hole = std::find_if(std::begin(_holes), std::end(_holes), [x, y, &d](coord const &hole)
                                               { return hole.x != (x + d.x) || hole.y != (y + d.y); });
                auto const &key = coord{x + d.x, y + d.y};
                if (_nodes.find(key) == std::end(_nodes))
                {
                    _nodes[key] = std::make_shared<node>(Hole, other_hole->x, other_hole->y, false);
                }
                origin->add_neighbor(d.move, neighbor_t{_nodes[key], collected});
                break;
            }
            default:
            {
                if (norm_x(x) != origin->x() || norm_y(y) != origin->y())
                {
                    auto const &key = coord{norm_x(x), norm_y(y)};
                    if (_nodes.find(key) == std::end(_nodes))
                    {
                        _nodes[key] = std::make_shared<node>(stop_tile, norm_x(x), norm_y(y), false);
                    }
                    origin->add_neighbor(d.move, neighbor_t{_nodes[key], collected});
                }
                break;
            }
            }
        }

        return origin->neighbors();
    }

    solver::result solver::shortestPath()
    {
        if (_root == nullptr)
            return result{};
        unexplore_all_nodes();
        std::queue<neighbor_t> q;
        q.push(neighbor_t{_root, {}});
        std::size_t iterations = 0;
        while (!q.empty())
        {
            std::shared_ptr<node> current_node = q.front().node;
            q.pop();
            for (auto [move, neighbor] : neighbors_of(current_node))
            {
                ++iterations;
                if (neighbor.node->is_exit())
                {
                    neighbor.node->set_parent(current_node);
                    neighbor.node->set_move(move);
                    return result{iterations, neighbor.node};
                }
                if (!neighbor.node->is_explored())
                {
                    neighbor.node->set_parent(current_node);
                    neighbor.node->set_move(move);
                    neighbor.node->set_explored(true);
                    q.push(neighbor);
                }
            }
        }
        return result{};
    }

    std::vector<path> solver::solve()
    {
        if (_root == nullptr)
            return std::vector<path>{};
        unexplore_all_nodes();
        std::vector<path> solutions;
        path route{result_node{_root, NoDirection}};

        std::size_t iterations = 0;
        std::function<void(std::shared_ptr<node>)> DFS;

        DFS = [&solutions, &route, &DFS, &iterations, this](std::shared_ptr<node> current_node)
        {
            if (current_node->is_exit())
            {
                std::unordered_map<coord, int, coord> collected;
                result_node last_hop = route.at(0);
                for (int i = 1; i < route.size(); ++i)
                {
                    auto const &hop = route.at(i);
                    auto const &neighbor = last_hop.node->neighbors().at(hop.move);
                    for (auto c : neighbor.collected)
                    {
                        collected[coord{c.x, c.y}] = c.value;
                    }
                    last_hop = hop;
                }
                if (collected.size() == _collectibles.size())
                {
                    solutions.push_back(route);
                    std::cout << "\rSolutions found: " << solutions.size() << std::flush;
                }
                return;
            }
            for (auto [direction, neighbor] : neighbors_of(current_node))
            {
                ++iterations;
                // TODO???: disallow move in direction opposite to last direction
                //          unless a coin was collected with the last move
                if (!neighbor.node->is_explored())
                {
                    neighbor.node->set_explored(true);
                    route.emplace_back(result_node{neighbor.node, direction});
                    DFS(neighbor.node);
                    neighbor.node->set_explored(false);
                    route.pop_back();
                }
            }
        };

        DFS(_root);

        return solutions;
    }
};
