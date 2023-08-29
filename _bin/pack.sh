#!/bin/bash

DST=./package

mkdir -p ${DST}

rsync -rav --exclude=*.wav --exclude=.DS_Store --delete src/static ${DST}

for FILE in index.html editor.html tiles.css editor.js index.js chilly.js; do
    cp src/$FILE ${DST}/$FILE
done

cd ${DST}

7z a -y  -tzip ../rutschpartie.zip . -xr!.DS_Store -xr!.gitignore
cd ..
