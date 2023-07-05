#!/bin/bash

source .env

mkdir -p deploy

rsync -rav --delete src/static deploy

for HTMLFILE in index.html editor.html
do
    jsmin <src/$HTMLFILE >deploy/$HTMLFILE
done

for JSFILE in index.js editor.js
do
    uglifyjs --compress --mangle < src/$JSFILE > deploy/$JSFILE
done

rsync -rav --delete deploy/* $REMOTE
