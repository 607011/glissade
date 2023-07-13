#!/bin/bash

source .env

mkdir -p deploy

rsync -rav --delete src/static deploy

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
    javascript-obfuscator src/$JSFILE \
        --split-strings true \
        --debug-protection true \
        --output deploy/$JSFILE
done

rsync -rav --delete deploy/* $REMOTE
