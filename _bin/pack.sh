#!/bin/sh

cd src
7z a -y -tzip ../rutschpartie.zip . -xr!.DS_Store -xr!.gitignore -xr!rc4.js
cd ..
