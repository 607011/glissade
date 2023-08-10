#ifndef __CHILLY_HPP__
#define __CHILLY_HPP__

#include <cstdlib>
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

    struct collectible_t
    {
        int x;
        int y;
        int value{0};
    };

    class node;

    struct neighbor_t
    {
        std::shared_ptr<node> node;
        std::vector<collectible_t> collected;
    };

    struct result_node
    {
        std::shared_ptr<node> node;
        direction_t move;
    };

    using path = std::vector<result_node>;

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

        friend level tag_invoke(boost::json::value_to_tag<level>, boost::json::value const &);
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
        std::unordered_map<direction_t, neighbor_t> const &neighbors_of(std::shared_ptr<node> origin);
        result shortestPath();
        std::vector<path> solve(std::size_t keep_n_best_routes);
    };
}

#endif // __CHILLY_HPP__