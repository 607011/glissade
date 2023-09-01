#!/bin/bash

if [ -e .env ]; then
    source .env
fi

DST=./package

mkdir -p ${DST}

rsync -rav --exclude=*.wav --exclude=.DS_Store --delete src/static ${DST}

for FILE in index.html editor.html tiles.css editor.js index.js chilly.js; do
    cp src/$FILE ${DST}/$FILE
done

cd ${DST}

7z a -y  -tzip ../rutschpartie.zip . -xr!.DS_Store -xr!.gitignore
cd ..

if [ -n "${REMOTE}" ]; then
    rsync -rav --delete ${DST}/* $REMOTE
fi
