#!/bin/bash

if [ -e .env ]; then
    source .env
fi

mkdir -p deploy

if [ ! -e src/static/images/favicon.png ]; then
    convert _raw/penguin-16x16.png -define png:compression-filter=4 -define png:compression-level=9 -define png:compression-strategy=4 src/static/images/favicon.png
fi

if [ ! -e src/favicon.ico ]; then
    convert -resize x16 -gravity center -crop 16x16+0+0 _raw/penguin-16x16.png -transparent white -colors 256 src/favicon.ico 
fi

rsync -rav --exclude=*.wav --exclude=.DS_Store --delete src/static deploy

for HTMLFILE in index.html editor.html tiles.css
do
    html-minifier \
        --collapse-whitespace \
        --remove-comments \
        --remove-optional-tags \
        --remove-redundant-attributes \
        --remove-script-type-attributes \
        --remove-tag-whitespace \
        --minify-css true \
        --minify-js true \
        <src/$HTMLFILE >deploy/$HTMLFILE
done

for JSFILE in editor.js
do
    uglifyjs --compress --mangle < src/$JSFILE > deploy/$JSFILE
done

for JSFILE in index.js chilly.js
do
    # javascript-obfuscator src/$JSFILE \
    #     --split-strings true \
    #     --debug-protection true \
    #     --output deploy/$JSFILE
    javascript-obfuscator src/$JSFILE \
        --output deploy/$JSFILE
done

if [ -n "${REMOTE}" ]; then
    rsync -rav --delete deploy/* $REMOTE
fi
