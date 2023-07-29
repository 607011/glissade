#!/bin/bash

source .env

mkdir -p deploy

convert _raw/penguin-16x16.png -define png:compression-filter=4 -define png:compression-level=9 -define png:compression-strategy=4 src/static/images/favicon.png

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

for JSFILE in index.js
do
    # javascript-obfuscator src/$JSFILE \
    #     --split-strings true \
    #     --debug-protection true \
    #     --output deploy/$JSFILE
    javascript-obfuscator src/$JSFILE \
        --output deploy/$JSFILE
done

rsync -rav --delete deploy/* $REMOTE
