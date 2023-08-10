#ifndef __CHILLY_HPP__
#define __CHILLY_HPP__

#include <iostream>
#include <memory>
#include <string>
#include <unordered_map>
#include <vector>

#include <boost/json.hpp>

namespace chilly
{
    typedef enum : unsigned char
    {
        Empty = 0xa0,
        Ice = ' ',
        Marker = '.',
        Rock = '#',
        Exit = 'X',
        Player = 'P',
        Coin = '$',
        Gold = 'G',
        Hole = 'O',
    } tile_t;

    typedef enum : char
    {
        Up = 'U',
        Down = 'D',
        Left = 'L',
        Right = 'R',
        NoDirection = '+',
    } direction_t;

    std::ostream &operator<<(std::ostream &, direction_t);

    struct result_node
    {
        int x;
        int y;
        direction_t move;
    };

    using path = std::vector<result_node>;

    struct collectible_t
    {
        int x;
        int y;
        int value{0};
    };

    class node;

    struct neighbor_t
    {
        std::shared_ptr<node> nod;
        collectible_t collected;
    };

    struct direction
    {
        int x;
        int y;
        direction_t move;
    };

    class node
    {
        tile_t _id;
        int _x;
        int _y;
        bool _explored{false};
        std::shared_ptr<node> _parent;
        std::unordered_map<direction_t, neighbor_t> _neighbors;
        direction_t _move;
        collectible_t _collectible;

    public:
        static const int CoinValue = 5;
        static const int GoldValue = 20;

        node();
        node(tile_t id, int x, int y, bool explored = false);
        node(std::shared_ptr<node>);
        tile_t id() const;
        int x() const;
        int y() const;
        bool is_explored() const;
        void set_explored(bool);
        direction_t move() const;
        void set_move(direction_t);
        std::shared_ptr<node> parent() const;
        void set_parent(std::shared_ptr<node>);
        bool has_parent() const;
        bool is_hole() const;
        bool is_exit() const;
        bool is_collectible() const;
        int value() const;
        std::unordered_map<direction_t, neighbor_t> const &neighbors() const;
        inline void add_neighbor(direction_t direction, neighbor_t node);
    };

    struct level
    {
        std::string name;
        int points;
        std::vector<std::vector<tile_t>> data;
        std::vector<int> thresholds;

        void dump() const;

        friend level tag_invoke(boost::json::value_to_tag<level>, boost::json::value const &v)
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

        // friend void tag_invoke(json::value_from_tag, json::value &v, level const &lvl);
    };

    struct coord
    {
        int x;
        int y;

        std::size_t operator()(coord const &c) const
        {
            return (std::hash<int>{}(c.x) << 16) ^ std::hash<int>{}(c.y);
        }

        bool operator==(coord const &o) const
        {
            return x == o.x && y == o.y;
        }
    };

    class solver
    {
        static const std::vector<direction> Directions;

        static direction_t opposite(direction_t d);

        std::vector<std::vector<tile_t>> _level_data;
        int _level_width;
        int _level_height;
        std::shared_ptr<node> _root;
        std::vector<coord> _holes;
        std::unordered_map<coord, int, coord> _collectibles;
        std::unordered_map<coord, std::shared_ptr<node>, coord> _nodes;
        void parse_level_data();

    public:
        struct result
        {
            std::size_t iterations{0};
            std::shared_ptr<node> exit;
        };

        solver(std::vector<std::vector<tile_t>> const &level_data);
        inline int norm_x(int x) const;
        inline int norm_y(int y) const;
        std::vector<tile_t> const &row(int y) const;
        std::vector<tile_t> &row(int y);
        tile_t cell(int x, int y) const;
        tile_t &cell(int x, int y);
        void unexplore_all_nodes();
        std::unordered_map<direction_t, neighbor_t> const &neighbors(std::shared_ptr<node> origin);
        result shortestPath();
        std::vector<path> solve();
    };
}

#endif // __CHILLY_HPP__