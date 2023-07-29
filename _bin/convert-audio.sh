#!/bin/bash

FFMPEG="ffmpeg -hide_banner -loglevel 29 -y"

for WAVFILE in src/static/sounds/*.wav
do
   ${FFMPEG} -i ${WAVFILE} -c:a libopus -b:a 112K -dash 1 src/static/sounds/`basename ${WAVFILE} .wav`.webm
   ${FFMPEG} -i ${WAVFILE} -c:a libvorbis -q:a 5 src/static/sounds/`basename ${WAVFILE} .wav`.ogg
   ${FFMPEG} -i ${WAVFILE} -c:a libmp3lame -q:a 5 src/static/sounds/`basename ${WAVFILE} .wav`.mp3
done
