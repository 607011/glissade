#!/usr/bin/env python3

import yaml
import io
import os
import base64
from math import sqrt
from PIL import Image

def main():
    with open('sprites.yaml', 'r') as file:
        config = yaml.safe_load(file)
    images = [{'name': img_file, 'data': Image.open(img_file)} for img_file in config['src']]
    num_images = len(images)
    width = int(sqrt(num_images))
    height = num_images // width + 1
    tile_w = config['tile']['width']
    tile_h = config['tile']['height']
    pixel_width = width * config['tile']['width']
    pixel_height = height * config['tile']['height']
    result_img = Image.new('RGBA', (pixel_width, pixel_height))
    css = ''
    x = 0
    y = 0
    for img in images:
        print(f'''{img['name']} {img["data"].size}''')
        img['data'] = img['data'].resize((tile_w, tile_h), resample=Image.Resampling.NEAREST)
        result_img.paste(img['data'], (x, y))
        css += f""".{os.path.splitext(os.path.basename(img['name']))[0]}{{background-position:-{x}px -{y}px}}\n"""
        x += tile_w
        if x >= pixel_width:
            x = 0
            y += tile_h
    if 'dst' in config:
        commonprefix = os.path.commonprefix([config['css'], config['dst']])
        sprite_url = os.path.relpath(config['dst'], commonprefix)
        result_img.save(config['dst'])
    else:
        png_data = io.BytesIO()
        result_img.save(png_data, 'PNG')
        result_img.save('sprites.png')
        sprite_url = f"""data:image/png;base64,{base64.b64encode(png_data.getvalue()).decode('utf-8')}"""
    css = f"""
.tile {{
    display: inline-block;
    width: {config['tile']['width']}px;
    height: {config['tile']['height']}px;
    position: relative;
    top: 0;
    left: 0;
    cursor: inherit;
    background-repeat: no-repeat;
    background-image: url({sprite_url});
    image-rendering: -moz-crisp-edges;
    image-rendering: -webkit-optimize-contrast;
    image-rendering: crisp-edges;
    -ms-interpolation-mode: nearest-neighbor;
    box-sizing: content-box; /* needed for editor */
}}
{css}"""
    with open(config['output'], 'w+') as css_out:
        css_out.write(css)

    

if __name__ == '__main__':
    main()
