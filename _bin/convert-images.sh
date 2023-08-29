#!/bin/sh

convert _raw/penguin-16x16.png -define png:compression-filter=4 -define png:compression-level=9 -define png:compression-strategy=4 src/static/images/favicon.png
convert -resize x16 -gravity center -crop 16x16+0+0 _raw/penguin-16x16.png -transparent white -colors 256 src/favicon.ico 
