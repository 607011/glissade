**Für die deutsche README siehe [LIESMICH.md](LIESMICH.md).**

# Glissade

*A mini-game inspired by Pokémon Crystal Ice Path*

Push Chilly, the penguin, through his icy maze to guide him to the exit using the path with the fewest moves. The ground is so slippery that he can only stop at obstacles. If he falls down one hole, he reappears at the other. 

![Level 5](level5.png)

If you’re totally clueless about the perfect path press “Help” display directional arrows

## Editor

The game comes with an editor that you can use to edit existing levels or create new ones.

![Editor](editor.png)

By default, a »New game« will be 20 fields wide and 20 fields high. You can change the dimensions in the two input fields below the button.

| Field  | Meaning                                       |
| ------ | --------------------------------------------- |
| ![](_raw/marker.png) | Use it to sprinkle breadcrumbs as a reminder for yourself which path Chilly is supposed to take. The will display as regular Ice fields in the game. |
 | ![](_raw/ice.png) | Ice, ice, baby! It's so slippery that once the player pushes Chilly he will not stop before he hits a rock or falls down a hole. |
 | ![](_raw/rock.png) | The rock is hard as rock. It will abruptly stop the penguin’s motion. |
 | ![](_raw/coin.png) | Yeah! Make Chilly the richest of his kind. Each time he collects a coin the player’s score increases by 5. |
 | ![](_raw/hole.png) | It’s dark and cold, but not dangerous. Only two holes per level are currently allowed. If Chilly falls down one he instantly reappears at the other. |
| ![](_raw/exit.png) | The exit. The place where Chilly needs to be pushed to. |
| ![](_raw/penguin.png) | The grand Chilly himself. Of course only one instance of him is allowed per level. |
| ![](_raw/empty.png) | An empty field. Ignore it. |

The input fields below “Thresholds” hold the maximum number of moves allowed the earn three, two or one stars. The field “Points to earn” speaks for itself. The solver automatically fills these fields with sensible values, but you can change them before embedding the level into the game.

To embed the level into the game, press the “Copy JSON data to clipboard” button to copy the level data to the clipboard. Now you can insert the level data at the desired location in the `LEVELS` array in [index.js](src/index.js).


## Deployment

Once you’re happy with all of your levels you can publish the game to a web server of your choice. The simplest way to do this, is to execute the script [deploy.sh](_bin/deploy.sh).

